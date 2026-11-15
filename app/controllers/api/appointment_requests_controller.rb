module Api
  class AppointmentRequestsController < BaseController
    def create
      guest = params[:guest].is_a?(ActionController::Parameters) ? params[:guest] : {}
      request = AppointmentBooking.call(service_id: params[:service_id],
        guest_name: guest[:name], guest_email: guest[:email], date: params[:date], time: params[:time])
      render json: request_json(request), status: :created
    rescue AppointmentBooking::Invalid => error
      invalid(error.fields, error.message)
    rescue AppointmentBooking::Conflict => error
      render json: { error: error.message }, status: :conflict
    end
  end
end
