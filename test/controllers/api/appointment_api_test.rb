require "test_helper"

class AppointmentApiTest < ActionDispatch::IntegrationTest
  setup do
    @nutritionist = Nutritionist.create!(name: "Mary Jane", credential: "Dietitian",
      registration_number: "DEMO-API-#{SecureRandom.hex(5)}", time_zone: "Europe/Lisbon")
    @nutritionist.availability_windows.create!(weekday: 1, start_minute: 9 * 60, end_minute: 11 * 60)
    @online = @nutritionist.services.create!(name: "Consultation", modality: :online,
      price_cents: 2500, duration_minutes: 45, city: nil, address: nil)
    @in_person = @nutritionist.services.create!(name: "Consultation", modality: :in_person,
      price_cents: 2700, duration_minutes: 45, city: "Braga", address: "Rua do Souto 12")
  end

  test "search and options preserve the frontend contract and online city independence" do
    other = Nutritionist.create!(name: "Porto Professional", credential: "Nutritionist",
      registration_number: "DEMO-API-#{SecureRandom.hex(5)}", time_zone: "Europe/Lisbon")
    other.services.create!(name: "Other service", modality: :in_person,
      price_cents: 2000, duration_minutes: 30, city: "Porto", address: "Rua do Porto 1")
    get "/api/nutritionists", params: { q: "consultation", location: "Porto", page: 1 }
    assert_response :success
    body = response.parsed_body
    assert_equal "Porto", body.dig("meta", "effective_location")
    assert_equal [ @online.id ], body.fetch("items").first.fetch("services").map { |service| service.fetch("id") }
    assert_nil body.dig("items", 0, "services", 0, "city")

    get "/api/nutritionists", params: { q: "Mary", location: "unknown", page: 1 }
    assert_response :success
    assert_equal "Braga", response.parsed_body.dig("meta", "effective_location")
    assert_equal [ @online.id, @in_person.id ], response.parsed_body.dig("items", 0, "services").map { |service| service.fetch("id") }

    follow_up = @nutritionist.services.create!(name: "Follow-up", modality: :in_person,
      price_cents: 2000, duration_minutes: 30, city: "Braga", address: "Rua do Souto 12")
    get "/api/nutritionists", params: { q: "Follow-up", location: "Braga", page: 1 }
    assert_response :success
    assert_equal [ @online.id, @in_person.id, follow_up.id ],
      response.parsed_body.dig("items", 0, "services").map { |service| service.fetch("id") }

    get "/api/nutritionists/options"
    assert_response :success
    assert_includes response.parsed_body.fetch("items").map { |person| person.fetch("id") }, @nutritionist.id
  end

  test "available slots return local time and UTC instants on a duration-independent half-hour grid" do
    get "/api/nutritionists/#{@nutritionist.id}/available_slots",
      params: { service_id: @online.id, date: "2099-06-22" }
    assert_response :success
    body = response.parsed_body
    assert_equal "Europe/Lisbon", body.fetch("time_zone")
    assert_equal "2099-06-22", body.fetch("date")
    assert_equal %w[09:00 09:30 10:00], body.fetch("items").map { |slot| slot.fetch("time") }
    assert_equal "2099-06-22T08:00:00Z", body.dig("items", 0, "starts_at")
    assert_equal "2099-06-22T08:45:00Z", body.dig("items", 0, "ends_at")
    assert_equal "2099-06-22", body.dig("items", 0, "date")
  end

  test "monthly available dates match daily slots and reject invalid query modes" do
    get "/api/nutritionists/#{@nutritionist.id}/available_slots",
      params: { service_id: @online.id, month: "2099-06" }
    assert_response :success
    body = response.parsed_body
    assert_equal "Europe/Lisbon", body.fetch("time_zone")
    assert_equal "2099-06", body.fetch("month")
    assert_includes body.fetch("dates"), "2099-06-22"
    refute_includes body.fetch("dates"), "2099-06-23"

    get "/api/nutritionists/#{@nutritionist.id}/available_slots",
      params: { service_id: @online.id, date: "2099-06-22", month: "2099-06" }
    assert_response :unprocessable_entity
    assert response.parsed_body.fetch("fields").key?("month")

    get "/api/nutritionists/#{@nutritionist.id}/available_slots",
      params: { service_id: @online.id, month: "2099-13" }
    assert_response :unprocessable_entity
    assert response.parsed_body.fetch("fields").key?("month")

    get "/api/nutritionists/#{@nutritionist.id}/available_slots",
      params: { service_id: @online.id }
    assert_response :unprocessable_entity
    assert response.parsed_body.fetch("fields").key?("date")
  end

  test "booking, pending list, and decision use UUIDs and historical service snapshots" do
    post "/api/appointment_requests", params: {
      service_id: @online.id, guest: { name: "Alex Morgan", email: " ALEX@example.com " },
      date: "2099-06-22", time: "09:00"
    }, as: :json
    assert_response :created
    body = response.parsed_body
    assert_match(/\A[0-9a-f-]{36}\z/, body.fetch("id"))
    assert_equal "alex@example.com", body.dig("guest", "email")
    assert_equal "2099-06-22T08:00:00Z", body.fetch("starts_at")
    assert_nil body.dig("service", "city")

    @online.update!(name: "Renamed service", price_cents: 3000)
    get "/api/nutritionists/#{@nutritionist.id}/appointment_requests", params: { status: "pending" }
    assert_response :success
    assert_equal "Consultation", response.parsed_body.dig("items", 0, "service", "name")
    assert_equal 2500, response.parsed_body.dig("items", 0, "service", "price_cents")

    patch "/api/nutritionists/#{@nutritionist.id}/appointment_requests/#{body.fetch('id')}",
      params: { decision: "accept" }, as: :json
    assert_response :success
    assert_equal "accepted", response.parsed_body.fetch("status")
    patch "/api/nutritionists/#{@nutritionist.id}/appointment_requests/#{body.fetch('id')}",
      params: { decision: "reject" }, as: :json
    assert_response :conflict
  end

  test "invalid booking and slot inputs return field errors without superseding an existing request" do
    guest = Guest.create!(name: "Alex", email: "alex@example.com")
    old_request = AppointmentRequest.create!(guest: guest, service: @online,
      starts_at: Time.utc(2099, 6, 22, 8), ends_at: Time.utc(2099, 6, 22, 8, 45))

    post "/api/appointment_requests", params: {
      service_id: @online.id, guest: { name: "Changed", email: "ALEX@example.com" },
      date: "2027-03-28", time: "01:30"
    }, as: :json
    assert_response :unprocessable_entity
    assert response.parsed_body.fetch("fields").key?("time")
    assert_equal "pending", old_request.reload.status
    assert_equal "Alex", guest.reload.name

    get "/api/nutritionists/#{@nutritionist.id}/available_slots",
      params: { service_id: @online.id, date: "2099-02-30" }
    assert_response :unprocessable_entity
    assert response.parsed_body.fetch("fields").key?("date")
  end
end
