module Api
  class NutritionistAppointmentRequestsController < BaseController
    def index
      return invalid({ status: [ "Only pending requests can be listed." ] }) if params[:status].present? && params[:status] != "pending"

      nutritionist = Nutritionist.find(params[:nutritionist_id])
      requests = nutritionist.appointment_requests.pending.includes(:guest).order(:starts_at, :id)
      render json: { items: requests.map { |request| request_json(request) } }
    end

    def update
      return invalid({ decision: [ "Choose accept or reject." ] }) unless %w[accept reject].include?(params[:decision])
      return not_found unless /\A[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\z/i.match?(params[:id].to_s)

      nutritionist = Nutritionist.find(params[:nutritionist_id])
      request = AppointmentDecision.call(nutritionist: nutritionist, request_id: params[:id], decision: params[:decision])
      render json: request_json(request)
    rescue AppointmentDecision::Conflict => error
      render json: { error: error.message }, status: :conflict
    end
  end
end
