class AppointmentDecision
  class Conflict < StandardError; end

  def self.call(nutritionist:, request_id:, decision:)
    request = nutritionist.appointment_requests.find(request_id)
    guest = request.guest

    AppointmentRequest.transaction do
      # Booking follows this same guest -> nutritionist order. Other guests'
      # request rows are updated only after the nutritionist lock is held.
      guest.lock!
      nutritionist.lock!
      request = nutritionist.appointment_requests.lock.find(request_id)
      raise Conflict, "This request is no longer pending." unless request.pending?

      if decision == "accept"
        overlap = nutritionist.appointment_requests.accepted
          .where("starts_at < ? AND ends_at > ?", request.ends_at, request.starts_at)
        raise Conflict, "This slot conflicts with an accepted appointment." if overlap.exists?

        request.update!(status: "accepted")
        nutritionist.appointment_requests.pending.where.not(id: request.id)
          .where("starts_at < ? AND ends_at > ?", request.ends_at, request.starts_at)
          .order(:id).each { |other| other.update!(status: "rejected") }
      else
        request.update!(status: "rejected")
      end
      request
    end
  rescue ActiveRecord::StatementInvalid => error
    raise Conflict, "This slot conflicts with an accepted appointment." if error.cause.is_a?(PG::ExclusionViolation)

    raise
  end
end
