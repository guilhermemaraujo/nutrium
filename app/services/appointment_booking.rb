require "uri/mailto"

class AppointmentBooking
  class Invalid < StandardError
    attr_reader :fields

    def initialize(fields)
      @fields = fields
      super("Please correct the highlighted fields.")
    end
  end

  class Conflict < StandardError; end

  def self.call(service_id:, guest_name:, guest_email:, date:, time:)
    name = guest_name.to_s.strip
    email = guest_email.to_s.strip.downcase
    service = Service.includes(:nutritionist).find_by(id: service_id)
    fields = {}
    fields[:service_id] = [ "Choose a valid service." ] unless service
    fields[:name] = [ "Enter your name." ] if name.blank?
    fields[:email] = [ "Enter a valid email address." ] unless URI::MailTo::EMAIL_REGEXP.match?(email)
    raise Invalid, fields if fields.any?

    begin
      slots = AppointmentSlots.new(service: service, date: date)
    rescue AppointmentSlots::InvalidDate
      raise Invalid, { date: [ "Choose a valid date." ] }
    end
    _, time_error = slots.resolve(time)
    if time_error
      message = {
        invalid_time: "Choose a valid time.",
        nonexistent_time: "This local time does not exist. Choose another time.",
        ambiguous_time: "This local time occurs twice. Choose another time."
      }.fetch(time_error)
      raise Invalid, { time: [ message ] }
    end
    raise Invalid, { time: [ "Choose an available future time." ] } unless slots.available?(time)

    AppointmentRequest.transaction do
      # Every API write acquires a guest lock before the nutritionist lock.
      # The insert skips a duplicate email even if another transaction creates
      # it between our lookup and insert; model uniqueness validation cannot
      # turn that race into an unexpected RecordInvalid response.
      guest = Guest.find_by(email: email)
      unless guest
        Guest.insert_all([ { email: email, name: name } ])
        guest = Guest.find_by!(email: email)
      end
      guest.lock!
      nutritionist = service.nutritionist
      nutritionist.lock!

      raise Conflict, "This slot is no longer available." unless AppointmentSlots.new(service: service, date: date).available?(time)

      start, = slots.resolve(time)
      guest.update!(name: name)
      guest.appointment_requests.pending.update_all(status: "superseded", updated_at: Time.current)
      AppointmentRequest.create!(guest: guest, service: service, nutritionist: nutritionist,
        starts_at: start, ends_at: start + service.duration_minutes.minutes)
    end
  rescue ActiveRecord::RecordNotUnique
    raise Conflict, "A concurrent request changed this booking. Please retry."
  rescue ActiveRecord::StatementInvalid => error
    raise Conflict, "This slot is no longer available." if error.cause.is_a?(PG::ExclusionViolation)

    raise
  end
end
