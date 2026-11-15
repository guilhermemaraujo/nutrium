module Api
  class BaseController < ActionController::API
    rescue_from ActiveRecord::RecordNotFound, with: :not_found

    private

    def not_found
      render json: { error: "Resource not found." }, status: :not_found
    end

    def invalid(fields, message = "Please correct the highlighted fields.")
      render json: { error: message, fields: fields }, status: :unprocessable_entity
    end

    def service_json(service)
      { id: service.id, nutritionist_id: service.nutritionist_id, name: service.name,
        modality: service.modality, price_cents: service.price_cents,
        duration_minutes: service.duration_minutes, city: service.city, address: service.address }
    end

    def request_json(request)
      { id: request.id, nutritionist_id: request.nutritionist_id,
        service: { id: request.service_id, nutritionist_id: request.nutritionist_id,
          name: request.service_name, modality: request.service_modality,
          price_cents: request.service_price_cents, duration_minutes: request.service_duration_minutes,
          city: request.service_city, address: request.service_address },
        guest: { name: request.guest.name, email: request.guest.email },
        starts_at: request.starts_at.utc.iso8601, ends_at: request.ends_at.utc.iso8601,
        status: request.status }
    end
  end
end
