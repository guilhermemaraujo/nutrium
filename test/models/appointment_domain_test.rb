require "test_helper"

class AppointmentDomainTest < ActiveSupport::TestCase
  setup do
    @nutritionist = Nutritionist.create!(
      name: "Mary Jane", credential: "Dietitian", registration_number: "DEMO-REG-001", time_zone: "Europe/Lisbon"
    )
    @service = @nutritionist.services.create!(
      name: "First appointment", modality: :in_person, price_cents: 2500,
      duration_minutes: 60, city: "Braga", address: "Rua do Souto 12"
    )
    @guest = Guest.create!(name: "Alex Morgan", email: "  ALEX@Example.com  ")
  end

  test "associations, normalized guest email, and service snapshots" do
    request = new_request
    assert request.save!

    assert_equal "alex@example.com", @guest.reload.email
    assert_includes @nutritionist.services, @service
    assert_includes @nutritionist.appointment_requests, request
    assert_includes @guest.appointment_requests, request
    assert_equal "Mary Jane", request.nutritionist.name
    assert_equal "First appointment", request.service_name
    assert_equal "in_person", request.service_modality
    assert_equal 2500, request.service_price_cents
    assert_equal "Braga", request.service_city
    assert_equal "Europe/Lisbon", request.time_zone

    @guest.update!(name: "Alex Changed")
    @service.update!(price_cents: 3000)
    @nutritionist.update!(time_zone: "Europe/London")
    assert_equal "Alex Changed", request.reload.guest.name
    assert_equal 2500, request.service_price_cents
    assert_equal "Europe/Lisbon", request.time_zone
  end

  test "validates guest identity and unique normalized email" do
    duplicate = Guest.new(name: "Another", email: " ALEX@example.COM ")
    assert_not duplicate.valid?
    assert_includes duplicate.errors.attribute_names, :email

    assert_not Guest.new(name: "", email: "bad-address").valid?
  end

  test "validates nutritionist, service, and request values" do
    @nutritionist.time_zone = "Not/A_Zone"
    assert_not @nutritionist.valid?
    @nutritionist.reload

    @service.modality = "unknown"
    assert_not @service.valid?
    @service.reload
    @service.duration_minutes = 0
    assert_not @service.valid?
    @service.reload

    request = new_request
    request.status = "unknown"
    assert_not request.valid?
    request.status = "pending"
    request.ends_at = request.starts_at
    assert_not request.valid?
  end

  test "online location is optional and service uniqueness includes modality" do
    online = @nutritionist.services.create!(
      name: "First appointment", modality: :online, price_cents: 2200,
      duration_minutes: 60, city: nil, address: nil
    )
    assert_nil online.city
    assert_nil online.address

    duplicate = @nutritionist.services.build(
      name: "First appointment", modality: :online, price_cents: 2200, duration_minutes: 60
    )
    assert_not duplicate.valid?
    assert_includes duplicate.errors.attribute_names, :name

    @service.address = "  "
    assert_not @service.valid?
    assert_includes @service.errors.attribute_names, :address
  end

  test "saved booking snapshots validate independently of current service" do
    request = new_request
    request.save!

    request.service_modality = "online"
    request.service_city = nil
    request.service_address = nil
    assert request.valid?

    request.service_modality = "in_person"
    assert_not request.valid?
    assert_includes request.errors.attribute_names, :service_city

    request.service_city = "Braga"
    request.service_address = "Rua do Souto 12"
    request.time_zone = "Invalid/Zone"
    assert_not request.valid?
    assert_includes request.errors.attribute_names, :time_zone

    request.time_zone = "Europe/Lisbon"
    request.service_price_cents = -1
    assert_not request.valid?
    assert_includes request.errors.attribute_names, :service_price_cents
  end

  test "rejects a request whose service belongs to another nutritionist" do
    other = Nutritionist.create!(
      name: "Ana Costa", credential: "Nutritionist", registration_number: "DEMO-REG-002", time_zone: "Europe/Lisbon"
    )
    request = new_request
    request.nutritionist = other

    assert_not request.valid?
    assert_includes request.errors.attribute_names, :service
  end

  private

  def new_request
    AppointmentRequest.new(
      guest: @guest, service: @service,
      starts_at: Time.utc(2099, 6, 20, 9), ends_at: Time.utc(2099, 6, 20, 10)
    )
  end
end
