require "test_helper"

class AppointmentSlotsTest < ActiveSupport::TestCase
  setup do
    @nutritionist = Nutritionist.create!(name: "Lisbon Professional", credential: "Nutritionist",
      registration_number: "DEMO-SLOTS-#{SecureRandom.hex(5)}", time_zone: "Europe/Lisbon")
    @service = @nutritionist.services.create!(name: "Consultation", modality: :online,
      price_cents: 3000, duration_minutes: 45)
  end

  test "split windows and service duration constrain half-hour starts" do
    @nutritionist.availability_windows.create!(weekday: 1, start_minute: 9 * 60, end_minute: 10 * 60 + 30)
    @nutritionist.availability_windows.create!(weekday: 1, start_minute: 11 * 60, end_minute: 12 * 60)

    slots = AppointmentSlots.new(service: @service, date: "2099-06-22").slots
    assert_equal %w[09:00 09:30 11:00], slots.map { |slot| slot.fetch(:time) }
    assert_equal "2099-06-22T08:45:00Z", slots.first.fetch(:ends_at)
  end

  test "accepted appointments block overlapping slots across services while pending requests do not" do
    @nutritionist.availability_windows.create!(weekday: 1, start_minute: 9 * 60, end_minute: 12 * 60)
    other_service = @nutritionist.services.create!(name: "Follow-up", modality: :online,
      price_cents: 2000, duration_minutes: 45)
    accepted_guest = Guest.create!(name: "Accepted", email: "accepted-#{SecureRandom.hex(5)}@example.com")
    pending_guest = Guest.create!(name: "Pending", email: "pending-#{SecureRandom.hex(5)}@example.com")
    AppointmentRequest.create!(guest: accepted_guest, service: other_service,
      starts_at: Time.utc(2099, 6, 22, 8), ends_at: Time.utc(2099, 6, 22, 8, 45), status: "accepted")
    AppointmentRequest.create!(guest: pending_guest, service: other_service,
      starts_at: Time.utc(2099, 6, 22, 9), ends_at: Time.utc(2099, 6, 22, 9, 45))

    times = AppointmentSlots.new(service: @service, date: "2099-06-22").slots.map { |slot| slot.fetch(:time) }
    assert_equal %w[10:00 10:30 11:00], times
  end

  test "daylight-saving gaps and repeats are excluded, and UTC offsets are correct" do
    @nutritionist.availability_windows.create!(weekday: 7, start_minute: 0, end_minute: 4 * 60)
    @service.update!(duration_minutes: 30)

    spring = AppointmentSlots.new(service: @service, date: "2027-03-28", now: Time.utc(2026))
    assert_equal :nonexistent_time, spring.resolve("01:30").last
    assert_equal "2027-03-28T00:30:00Z", spring.slots.find { |slot| slot[:time] == "00:30" }[:starts_at]
    assert_equal "2027-03-28T01:00:00Z", spring.slots.find { |slot| slot[:time] == "02:00" }[:starts_at]
    refute_includes spring.slots.map { |slot| slot[:time] }, "01:30"

    fall = AppointmentSlots.new(service: @service, date: "2027-10-31", now: Time.utc(2026))
    assert_equal :ambiguous_time, fall.resolve("01:30").last
    refute_includes fall.slots.map { |slot| slot[:time] }, "01:30"
    assert_equal "2027-10-31T02:00:00Z", fall.slots.find { |slot| slot[:time] == "02:00" }[:starts_at]
  end

  test "past slots are excluded and an appointment may end at local midnight" do
    @nutritionist.availability_windows.create!(weekday: 1, start_minute: 23 * 60, end_minute: 1440)
    @service.update!(duration_minutes: 30)
    slots = AppointmentSlots.new(service: @service, date: "2099-06-22").slots
    assert_equal %w[23:00 23:30], slots.map { |slot| slot[:time] }
    assert_empty AppointmentSlots.new(service: @service, date: "2020-06-22").slots
  end

  test "monthly dates reuse daily duration and accepted-overlap rules" do
    @nutritionist.availability_windows.create!(weekday: 1, start_minute: 9 * 60, end_minute: 10 * 60)
    @nutritionist.availability_windows.create!(weekday: 2, start_minute: 9 * 60, end_minute: 9 * 60 + 30)
    guest = Guest.create!(name: "Accepted", email: "monthly-#{SecureRandom.hex(5)}@example.com")
    other_service = @nutritionist.services.create!(name: "Short", modality: :online,
      price_cents: 1800, duration_minutes: 30)

    month = AppointmentMonthAvailability.new(service: @service, month: "2099-06")
    assert_includes month.dates, "2099-06-22"
    refute_includes month.dates, "2099-06-23"

    AppointmentRequest.create!(guest: guest, service: other_service,
      starts_at: Time.utc(2099, 6, 22, 8), ends_at: Time.utc(2099, 6, 22, 8, 30), status: "accepted")
    refute_includes month.dates, "2099-06-22"
    assert_equal %w[09:30], AppointmentSlots.new(service: other_service, date: "2099-06-22").slots.map { |slot| slot[:time] }
    assert_includes AppointmentMonthAvailability.new(service: other_service, month: "2099-06").dates, "2099-06-23"
  end

  test "monthly dates honor future starts and daylight-saving gaps" do
    @nutritionist.availability_windows.create!(weekday: 7, start_minute: 0, end_minute: 2 * 60)
    @service.update!(duration_minutes: 30)
    month = AppointmentMonthAvailability.new(service: @service, month: "2027-03", now: Time.utc(2026))
    assert_includes month.dates, "2027-03-28"
    assert_equal %w[00:00 00:30], AppointmentSlots.new(service: @service,
      date: "2027-03-28", now: Time.utc(2026)).slots.map { |slot| slot[:time] }
    assert_empty AppointmentMonthAvailability.new(service: @service, month: "2020-03").dates
  end

  test "monthly lookup reads windows and accepted intervals once" do
    @nutritionist.availability_windows.create!(weekday: 1, start_minute: 9 * 60, end_minute: 12 * 60)
    statements = []
    subscriber = ActiveSupport::Notifications.subscribe("sql.active_record") do |*, payload|
      statements << payload[:sql] if payload[:sql]&.match?(/FROM "(availability_windows|appointment_requests)"/)
    end
    AppointmentMonthAvailability.new(service: @service, month: "2099-06").dates
    assert_equal 1, statements.count { |sql| sql.include?('FROM "availability_windows"') }
    assert_equal 1, statements.count { |sql| sql.include?('FROM "appointment_requests"') }
  ensure
    ActiveSupport::Notifications.unsubscribe(subscriber) if subscriber
  end
end
