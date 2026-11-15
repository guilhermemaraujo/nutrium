require "test_helper"
require "stringio"

class AppointmentRequestDatabaseTest < ActiveSupport::TestCase
  # Concurrent writers need committed rows visible on separate connections.
  self.use_transactional_tests = false

  setup do
    @nutritionist = Nutritionist.create!(
      name: "Mary Jane", credential: "Dietitian", registration_number: "DEMO-REG-001", time_zone: "Europe/Lisbon"
    )
    @first_service = @nutritionist.services.create!(
      name: "First appointment", modality: :in_person, price_cents: 2500,
      duration_minutes: 60, city: "Braga", address: "Rua do Souto 12"
    )
    @follow_up = @nutritionist.services.create!(
      name: "Follow-up", modality: :online, price_cents: 1800,
      duration_minutes: 30, city: nil, address: nil
    )
    @first_guest = Guest.create!(name: "Alex", email: "alex@example.com")
    @second_guest = Guest.create!(name: "Sam", email: "sam@example.com")
  end

  teardown do
    AppointmentRequest.delete_all
    AvailabilityWindow.delete_all
    Service.delete_all
    Guest.delete_all
    Nutritionist.delete_all
  end

  test "database requires normalized unique guest emails" do
    assert_raises(ActiveRecord::RecordNotUnique) do
      Guest.insert_all!([ { name: "Duplicate", email: "alex@example.com" } ])
    end
    assert_raises(ActiveRecord::StatementInvalid) do
      Guest.insert_all!([ { name: "Unnormalized", email: " ALEX@example.com " } ])
    end
  end

  test "database requires in-person location and permits same name across modalities" do
    Service.insert_all!([ {
      nutritionist_id: @nutritionist.id, name: "First appointment", modality: "online",
      price_cents: 2200, duration_minutes: 60, city: nil, address: nil
    } ])

    assert_raises(ActiveRecord::RecordNotUnique) do
      Service.insert_all!([ {
        nutritionist_id: @nutritionist.id, name: "First appointment", modality: "online",
        price_cents: 2200, duration_minutes: 60, city: nil, address: nil
      } ])
    end
    assert_raises(ActiveRecord::StatementInvalid) do
      Service.insert_all!([ {
        nutritionist_id: @nutritionist.id, name: "No address", modality: "in_person",
        price_cents: 2200, duration_minutes: 60, city: "Braga", address: "  "
      } ])
    end
  end

  test "database allows only one pending request for a guest" do
    insert_request(request_attributes(guest: @first_guest, service: @first_service, starts_at: slot(9)))

    assert_raises(ActiveRecord::RecordNotUnique) do
      insert_request(request_attributes(guest: @first_guest, service: @follow_up, starts_at: slot(11)))
    end

    AppointmentRequest.update_all(status: "superseded")
    insert_request(request_attributes(guest: @first_guest, service: @follow_up, starts_at: slot(11)))
    assert_equal 1, AppointmentRequest.pending.count
  end

  test "database rejects overlapping accepted requests across services but allows adjacency" do
    insert_request(request_attributes(guest: @first_guest, service: @first_service, starts_at: slot(9), status: "accepted"))

    assert_raises(ActiveRecord::StatementInvalid) do
      insert_request(request_attributes(guest: @second_guest, service: @follow_up, starts_at: slot(9, 30), status: "accepted"))
    end

    insert_request(request_attributes(guest: @second_guest, service: @follow_up, starts_at: slot(10), status: "accepted"))
    assert_equal 2, AppointmentRequest.accepted.count
  end

  test "database permits the same accepted slot for different nutritionists" do
    other = Nutritionist.create!(
      name: "Ana Costa", credential: "Nutritionist", registration_number: "DEMO-REG-002", time_zone: "Europe/Lisbon"
    )
    other_service = other.services.create!(
      name: "Nutrition consultation", modality: :in_person, price_cents: 3000,
      duration_minutes: 45, city: "Braga", address: "Avenida Central 8"
    )

    insert_request(request_attributes(guest: @first_guest, service: @first_service, starts_at: slot(9), status: "accepted"))
    insert_request(request_attributes(guest: @second_guest, service: other_service, starts_at: slot(9), status: "accepted"))
    assert_equal 2, AppointmentRequest.accepted.count
  end

  test "database enforces service ownership, status, and positive intervals" do
    other = Nutritionist.create!(
      name: "Ana Costa", credential: "Nutritionist", registration_number: "DEMO-REG-002", time_zone: "Europe/Lisbon"
    )
    attributes = request_attributes(guest: @first_guest, service: @first_service, starts_at: slot(9))

    assert_raises(ActiveRecord::InvalidForeignKey) do
      insert_request(attributes.merge(nutritionist_id: other.id))
    end
    assert_raises(ActiveRecord::StatementInvalid) do
      insert_request(attributes.merge(status: "invalid"))
    end
    assert_raises(ActiveRecord::StatementInvalid) do
      insert_request(attributes.merge(ends_at: attributes[:starts_at]))
    end
  end

  test "database validates service snapshots without consulting the current service" do
    online = request_attributes(guest: @first_guest, service: @follow_up, starts_at: slot(9))
    insert_request(online)
    assert_nil AppointmentRequest.find_by!(guest: @first_guest).service_city

    in_person = request_attributes(guest: @second_guest, service: @first_service, starts_at: slot(11))
    assert_raises(ActiveRecord::StatementInvalid) { insert_request(in_person.merge(service_city: nil)) }
    assert_raises(ActiveRecord::StatementInvalid) { insert_request(in_person.merge(service_address: " ")) }
    assert_raises(ActiveRecord::StatementInvalid) { insert_request(in_person.merge(service_name: " ")) }
    assert_raises(ActiveRecord::StatementInvalid) { insert_request(in_person.merge(service_modality: "invalid")) }
    assert_raises(ActiveRecord::StatementInvalid) { insert_request(in_person.merge(service_price_cents: -1)) }
    assert_raises(ActiveRecord::StatementInvalid) { insert_request(in_person.merge(service_duration_minutes: 0)) }
    assert_raises(ActiveRecord::StatementInvalid) { insert_request(in_person.merge(time_zone: " ")) }
  end

  test "database rejects overlapping weekly windows and invalid local bounds" do
    AvailabilityWindow.insert_all!([ {
      nutritionist_id: @nutritionist.id, weekday: 1, start_minute: 9 * 60, end_minute: 12 * 60
    } ])

    assert_raises(ActiveRecord::StatementInvalid) do
      AvailabilityWindow.insert_all!([ {
        nutritionist_id: @nutritionist.id, weekday: 1, start_minute: 11 * 60, end_minute: 13 * 60
      } ])
    end
    AvailabilityWindow.insert_all!([ {
      nutritionist_id: @nutritionist.id, weekday: 1, start_minute: 12 * 60, end_minute: 17 * 60
    } ])
    AvailabilityWindow.insert_all!([ {
      nutritionist_id: @nutritionist.id, weekday: 2, start_minute: 9 * 60, end_minute: 12 * 60
    } ])
    assert_raises(ActiveRecord::StatementInvalid) do
      AvailabilityWindow.insert_all!([ {
        nutritionist_id: @nutritionist.id, weekday: 8, start_minute: 9 * 60, end_minute: 12 * 60
      } ])
    end
    assert_raises(ActiveRecord::StatementInvalid) do
      AvailabilityWindow.insert_all!([ {
        nutritionist_id: @nutritionist.id, weekday: 3, start_minute: 12 * 60, end_minute: 12 * 60
      } ])
    end
  end

  test "Ruby schema dump retains PostgreSQL-specific booking safeguards" do
    output = StringIO.new
    ActiveRecord::SchemaDumper.dump(ActiveRecord::Base.connection_pool, output)
    schema = output.string

    assert_includes schema, 'enable_extension "btree_gist"'
    assert_includes schema, "index_services_on_id_and_nutritionist_id"
    assert_includes schema, "fk_appointment_requests_service_nutritionist"
    assert_includes schema, "index_appointment_requests_one_pending_per_guest"
    assert_includes schema, "appointment_requests_accepted_slots_do_not_overlap"
    assert_includes schema, "appointment_requests_interval_positive"
    assert_includes schema, "services_in_person_location_required"
    assert_includes schema, "appointment_requests_in_person_location_required"
    assert_includes schema, "availability_windows_bounds_valid"
    assert_includes schema, "availability_windows_do_not_overlap"
    assert_match(/t\.timestamptz "starts_at"/, schema)
    assert_match(/t\.timestamptz "ends_at"/, schema)
  end

  test "concurrent pending inserts cannot create two requests for one guest" do
    rows = [
      request_attributes(guest: @first_guest, service: @first_service, starts_at: slot(9)),
      request_attributes(guest: @first_guest, service: @follow_up, starts_at: slot(11))
    ]

    results = concurrent_inserts(rows)
    assert_equal 1, results.count(:inserted)
    assert_equal 1, results.count { |result| result.is_a?(ActiveRecord::RecordNotUnique) }
    assert_equal 1, AppointmentRequest.pending.where(guest: @first_guest).count
  end

  test "concurrent accepts cannot create overlapping appointments" do
    rows = [
      request_attributes(guest: @first_guest, service: @first_service, starts_at: slot(9), status: "accepted"),
      request_attributes(guest: @second_guest, service: @follow_up, starts_at: slot(9, 30), status: "accepted")
    ]

    results = concurrent_inserts(rows)
    assert_equal 1, results.count(:inserted)
    assert_equal 1, results.count { |result| result.is_a?(ActiveRecord::StatementInvalid) }
    assert_equal 1, AppointmentRequest.accepted.where(nutritionist: @nutritionist).count
  end

  test "concurrent weekly windows cannot overlap" do
    rows = [
      { nutritionist_id: @nutritionist.id, weekday: 1, start_minute: 9 * 60, end_minute: 12 * 60 },
      { nutritionist_id: @nutritionist.id, weekday: 1, start_minute: 11 * 60, end_minute: 13 * 60 }
    ]

    results = concurrent_inserts(rows, model: AvailabilityWindow)
    assert_equal 1, results.count(:inserted)
    assert_equal 1, results.count { |result| result.is_a?(ActiveRecord::StatementInvalid) }
    assert_equal 1, AvailabilityWindow.where(nutritionist: @nutritionist).count
  end

  test "seeds are repeatable and do not reset operational requests" do
    @nutritionist.update!(credential: "Senior Dietitian")
    @first_service.update!(price_cents: 2600)
    load Rails.root.join("db/seeds.rb").to_s
    counts = [ Nutritionist.count, Service.count, Guest.count, AppointmentRequest.count, AvailabilityWindow.count ]
    request = AppointmentRequest.find_by!(guest: @first_guest)
    request.update!(status: "rejected")
    morning = @nutritionist.availability_windows.find_by!(weekday: 1, start_minute: 9 * 60)
    morning.update!(end_minute: 12 * 60)

    load Rails.root.join("db/seeds.rb").to_s
    assert_equal counts, [ Nutritionist.count, Service.count, Guest.count, AppointmentRequest.count, AvailabilityWindow.count ]
    assert_equal "Senior Dietitian", @nutritionist.reload.credential
    assert_equal 2600, @first_service.reload.price_cents
    assert_equal "Alex", @first_guest.reload.name
    assert_equal "rejected", request.reload.status
    assert_equal 12 * 60, morning.reload.end_minute
    assert_equal 2, Service.where(nutritionist: Nutritionist.find_by!(registration_number: "DEMO-REG-002"), name: "Nutrition consultation").count
    assert_equal 6, AppointmentRequest.count
  end

  test "seeded requests fit weekday local availability and retain a pending overlap" do
    load Rails.root.join("db/seeds.rb").to_s

    AppointmentRequest.find_each do |request|
      local_start = request.starts_at.in_time_zone(request.time_zone)
      local_end = request.ends_at.in_time_zone(request.time_zone)
      start_minute = local_start.hour * 60 + local_start.min
      end_minute = local_end.hour * 60 + local_end.min
      assert_includes 1..5, local_start.to_date.cwday
      assert_equal 0, local_start.min % 30
      assert request.nutritionist.availability_windows.where(weekday: local_start.to_date.cwday)
        .where("start_minute <= ? AND end_minute >= ?", start_minute, end_minute).exists?
    end

    mary = Nutritionist.find_by!(registration_number: "DEMO-REG-001")
    alex = AppointmentRequest.find_by!(guest: @first_guest)
    sam = AppointmentRequest.find_by!(guest: @second_guest)
    assert_equal mary, alex.nutritionist
    assert_equal mary, sam.nutritionist
    assert alex.starts_at < sam.ends_at && sam.starts_at < alex.ends_at
  end

  private

  def slot(hour, minute = 0)
    Time.utc(2099, 6, 20, hour, minute)
  end

  def request_attributes(guest:, service:, starts_at:, status: "pending")
    {
      guest_id: guest.id,
      service_id: service.id,
      nutritionist_id: service.nutritionist_id,
      starts_at: starts_at,
      ends_at: starts_at + service.duration_minutes.minutes,
      status: status,
      service_name: service.name,
      service_modality: service.modality,
      service_price_cents: service.price_cents,
      service_duration_minutes: service.duration_minutes,
      service_city: service.city,
      service_address: service.address,
      time_zone: service.nutritionist.time_zone
    }
  end

  def insert_request(attributes)
    AppointmentRequest.insert_all!([ attributes ])
  end

  def concurrent_inserts(rows, model: AppointmentRequest)
    ready = Queue.new
    start = Queue.new
    threads = rows.map do |attributes|
      Thread.new do
        ActiveRecord::Base.connection_pool.with_connection do
          ready << true
          start.pop
          model.insert_all!([ attributes ])
          :inserted
        rescue ActiveRecord::StatementInvalid => error
          error
        end
      end
    end

    rows.length.times { ready.pop }
    rows.length.times { start << true }
    threads.map(&:value)
  end
end
