module Api
  class NutritionistsController < BaseController
    PAGE_SIZE = 4

    def index
      page = Integer(params.fetch(:page, 1), exception: false)
      return invalid({ page: [ "Choose a positive page number." ] }) unless page&.positive?

      requested_location = params[:location].to_s.strip
      known_cities = Service.in_person.where.not(city: nil).distinct.pluck(:city)
      effective_location = known_cities.find { |city| city.casecmp?(requested_location) } || "Braga"
      eligible = "services.modality = 'online' OR lower(services.city) = ?"
      scope = Nutritionist.joins(:services).where(eligible, effective_location.downcase)
      query = params[:q].to_s.strip
      if query.present?
        term = "%#{ActiveRecord::Base.sanitize_sql_like(query)}%"
        scope = scope.where("nutritionists.name ILIKE :term OR services.name ILIKE :term", term: term)
      end
      scope = scope.distinct
      total = scope.count
      people = scope.order(:id).offset((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).preload(:services)

      render json: {
        items: people.map do |person|
          services = person.services.select do |service|
            service.online? || service.city&.casecmp?(effective_location)
          end
          { id: person.id, name: person.name, credential: person.credential,
            registration_number: person.registration_number, time_zone: person.time_zone,
            services: services.sort_by(&:id).map { |service| service_json(service) } }
        end,
        meta: { page: page, total_pages: [ (total.to_f / PAGE_SIZE).ceil, 1 ].max,
          effective_location: effective_location }
      }
    end

    def options
      render json: { items: Nutritionist.order(:name, :id).map do |person|
        { id: person.id, name: person.name, time_zone: person.time_zone }
      end }
    end

    def available_slots
      nutritionist = Nutritionist.find(params[:id])
      service = nutritionist.services.find_by(id: params[:service_id])
      return invalid({ service_id: [ "Choose a valid service." ] }) unless service

      slots = AppointmentSlots.new(service: service, date: params[:date])
      render json: { time_zone: slots.time_zone_name, date: slots.date.iso8601, items: slots.slots }
    rescue AppointmentSlots::InvalidDate
      invalid({ date: [ "Choose a valid date." ] })
    end
  end
end
