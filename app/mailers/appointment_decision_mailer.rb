class AppointmentDecisionMailer < ApplicationMailer
  default from: "appointments@nutrium.local"

  def decision(request_id)
    @request = AppointmentRequest.includes(:guest, :nutritionist).find(request_id)
    @local_start = @request.starts_at.in_time_zone(@request.time_zone)
    @decision = @request.accepted? ? "accepted" : "rejected"
    mail to: @request.guest.email, subject: "Appointment request #{@decision}"
  end
end
