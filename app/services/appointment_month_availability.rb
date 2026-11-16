class AppointmentMonthAvailability
  class InvalidMonth < StandardError; end

  def initialize(service:, month:, now: Time.current)
    raise InvalidMonth unless /\A(?!0000)\d{4}-(0[1-9]|1[0-2])\z/.match?(month.to_s)

    @first_day = Date.iso8601("#{month}-01")
    @service = service
    @now = now
  rescue Date::Error
    raise InvalidMonth
  end

  def month
    @first_day.strftime("%Y-%m")
  end

  def time_zone_name
    @service.nutritionist.time_zone
  end

  def dates
    nutritionist = @service.nutritionist
    windows = nutritionist.availability_windows.to_a
    return [] if windows.empty?

    next_month = @first_day.next_month
    lower_bound = Time.utc(@first_day.year, @first_day.month, 1) - 2.days
    upper_bound = Time.utc(next_month.year, next_month.month, 1) + 2.days
    accepted = nutritionist.appointment_requests.accepted
      .where("starts_at < ? AND ends_at > ?", upper_bound, lower_bound).to_a

    (@first_day...next_month).filter_map do |date|
      slots = AppointmentSlots.new(service: @service, date: date.iso8601, now: @now,
        windows: windows, accepted_requests: accepted)
      date.iso8601 if slots.slots.any?
    end
  end
end
