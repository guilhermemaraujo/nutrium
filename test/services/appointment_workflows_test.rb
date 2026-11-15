require "test_helper"
require "minitest/mock"
require "timeout"

class AppointmentWorkflowsTest < ActiveSupport::TestCase
  include ActiveJob::TestHelper

  # Threads must see committed setup rows on separate database connections.
  self.use_transactional_tests = false

  setup do
    @nutritionist = Nutritionist.create!(name: "Mary Jane", credential: "Dietitian",
      registration_number: "DEMO-WORKFLOW-#{SecureRandom.hex(5)}", time_zone: "Europe/Lisbon")
    @nutritionist.availability_windows.create!(weekday: 1, start_minute: 9 * 60, end_minute: 12 * 60)
    @first_service = @nutritionist.services.create!(name: "First", modality: :online,
      price_cents: 2500, duration_minutes: 60)
    @second_service = @nutritionist.services.create!(name: "Follow-up", modality: :online,
      price_cents: 1800, duration_minutes: 30)
    @first_guest = Guest.create!(name: "Alex", email: "alex-#{SecureRandom.hex(5)}@example.com")
    @second_guest = Guest.create!(name: "Sam", email: "sam-#{SecureRandom.hex(5)}@example.com")
    ActionMailer::Base.deliveries.clear
    clear_enqueued_jobs
  end

  teardown do
    clear_enqueued_jobs
    ActionMailer::Base.deliveries.clear
    AppointmentRequest.delete_all
    AvailabilityWindow.delete_all
    Service.delete_all
    Guest.delete_all
    Nutritionist.delete_all
  end

  test "two concurrent first submissions for one normalized email recover the guest creation race" do
    email = "new-#{SecureRandom.hex(5)}@example.com"
    results = concurrently(
      -> { AppointmentBooking.call(service_id: @first_service.id, guest_name: "First",
        guest_email: " #{email.upcase} ", date: "2099-06-22", time: "10:00") },
      -> { AppointmentBooking.call(service_id: @second_service.id, guest_name: "Second",
        guest_email: email, date: "2099-06-22", time: "11:00") }
    )

    assert results.all? { |result| result.is_a?(AppointmentRequest) }, results.inspect
    guest = Guest.find_by!(email: email)
    assert_equal 1, Guest.where(email: email).count
    assert_equal 2, guest.appointment_requests.count
    assert_equal 1, guest.appointment_requests.pending.count
    assert_equal 1, guest.appointment_requests.superseded.count
    assert_includes %w[First Second], guest.reload.name
  end

  test "concurrent overlapping decisions serialize and leave only one accepted request" do
    first = pending(@first_guest, @first_service, 9)
    second = pending(@second_guest, @second_service, 9, 30)
    results = concurrently(
      -> { AppointmentDecision.call(nutritionist: @nutritionist, request_id: first.id, decision: "accept") },
      -> { AppointmentDecision.call(nutritionist: @nutritionist, request_id: second.id, decision: "accept") }
    )

    assert_equal 1, results.count { |result| result.is_a?(AppointmentRequest) }, results.inspect
    assert_equal 1, results.count { |result| result.is_a?(AppointmentDecision::Conflict) }, results.inspect
    assert_equal 1, @nutritionist.appointment_requests.accepted.count
    assert_equal 1, @nutritionist.appointment_requests.rejected.count
  end

  test "booking rechecks availability after another guest's overlapping request is accepted" do
    first = pending(@first_guest, @first_service, 9)
    first_checked = Queue.new
    continue_booking = Queue.new
    original_new = AppointmentSlots.method(:new)
    slot_instances = 0
    slot_factory = lambda do |**arguments|
      slots = original_new.call(**arguments)
      slot_instances += 1
      if slot_instances == 1
        original_available = slots.method(:available?)
        slots.define_singleton_method(:available?) do |time|
          result = original_available.call(time)
          first_checked << result
          continue_booking.pop
          result
        end
      end
      slots
    end

    AppointmentSlots.stub(:new, slot_factory) do
      booking = Thread.new do
        ActiveRecord::Base.connection_pool.with_connection do
          AppointmentBooking.call(service_id: @second_service.id, guest_name: "Sam Updated",
            guest_email: @second_guest.email, date: "2099-06-22", time: "09:30")
        rescue StandardError => error
          error
        end
      end
      begin
        assert_equal true, Timeout.timeout(10) { first_checked.pop }
        AppointmentDecision.call(nutritionist: @nutritionist, request_id: first.id, decision: "accept")
        continue_booking << true
        result = Timeout.timeout(10) { booking.value }
        assert_instance_of AppointmentBooking::Conflict, result
      ensure
        continue_booking << true
        booking.kill if booking.alive?
      end
    end

    assert_equal "accepted", first.reload.status
    assert_equal 1, @nutritionist.appointment_requests.accepted.count
    assert_equal 0, @second_guest.appointment_requests.count
    assert_equal "Sam", @second_guest.reload.name
  end

  test "automatic rejection and other guest supersession do not deadlock" do
    first = pending(@first_guest, @first_service, 9)
    pending(@second_guest, @second_service, 9, 30)
    results = concurrently(
      -> { AppointmentDecision.call(nutritionist: @nutritionist, request_id: first.id, decision: "accept") },
      -> { AppointmentBooking.call(service_id: @second_service.id, guest_name: "Sam Updated",
        guest_email: @second_guest.email, date: "2099-06-22", time: "11:00") }
    )

    assert results.all? { |result| result.is_a?(AppointmentRequest) }, results.inspect
    assert_equal "accepted", first.reload.status
    assert_equal 1, @second_guest.appointment_requests.pending.count
    assert_equal "Sam Updated", @second_guest.reload.name
  end

  test "supersession crosses professionals and a failed replacement preserves the old request" do
    first = pending(@first_guest, @first_service, 9)
    other = Nutritionist.create!(name: "Other Professional", credential: "Nutritionist",
      registration_number: "DEMO-WORKFLOW-#{SecureRandom.hex(5)}", time_zone: "Europe/Lisbon")
    other.availability_windows.create!(weekday: 1, start_minute: 9 * 60, end_minute: 12 * 60)
    other_service = other.services.create!(name: "Other service", modality: :online,
      price_cents: 2000, duration_minutes: 30)

    assert_raises(AppointmentBooking::Invalid) do
      AppointmentBooking.call(service_id: other_service.id, guest_name: "Changed",
        guest_email: @first_guest.email, date: "2099-06-22", time: "12:00")
    end
    assert_equal "pending", first.reload.status
    assert_equal "Alex", @first_guest.reload.name

    replacement = AppointmentBooking.call(service_id: other_service.id, guest_name: "Changed",
      guest_email: @first_guest.email, date: "2099-06-22", time: "10:00")
    assert_equal "superseded", first.reload.status
    assert_equal "pending", replacement.status
    assert_equal other.id, replacement.nutritionist_id
    assert_equal "Changed", @first_guest.reload.name
  end

  test "accepting a pending request over an accepted appointment returns a conflict without mutation" do
    accepted = pending(@first_guest, @first_service, 9)
    accepted.update!(status: "accepted")
    overlapping = pending(@second_guest, @second_service, 9, 30)

    error = assert_raises(AppointmentDecision::Conflict) do
      AppointmentDecision.call(nutritionist: @nutritionist, request_id: overlapping.id, decision: "accept")
    end
    assert_match(/conflicts/, error.message)
    assert_equal "accepted", accepted.reload.status
    assert_equal "pending", overlapping.reload.status
  end

  test "booking and a decision for the same guest serialize without stale writes" do
    first = pending(@first_guest, @first_service, 9)
    results = concurrently(
      -> { AppointmentDecision.call(nutritionist: @nutritionist, request_id: first.id, decision: "reject") },
      -> { AppointmentBooking.call(service_id: @second_service.id, guest_name: "Alex Updated",
        guest_email: @first_guest.email, date: "2099-06-22", time: "11:00") }
    )

    assert_equal 1, results.count { |result| result.is_a?(AppointmentRequest) && result.pending? }
    assert results.all? { |result| result.is_a?(AppointmentRequest) || result.is_a?(AppointmentDecision::Conflict) }, results.inspect
    assert_equal 1, @first_guest.appointment_requests.pending.count
    assert_includes %w[rejected superseded], first.reload.status
  end

  test "committed decisions enqueue one email per transition, including automatic rejections" do
    first = pending(@first_guest, @first_service, 9)
    second = pending(@second_guest, @second_service, 9, 30)

    assert_enqueued_jobs 2, only: ActionMailer::MailDeliveryJob do
      AppointmentDecision.call(nutritionist: @nutritionist, request_id: first.id, decision: "accept")
    end
    assert_equal "rejected", second.reload.status
    assert_raises(AppointmentDecision::Conflict) do
      AppointmentDecision.call(nutritionist: @nutritionist, request_id: second.id, decision: "reject")
    end
    assert_equal 2, enqueued_jobs.count { |job| job[:job] == ActionMailer::MailDeliveryJob }

    perform_enqueued_jobs
    assert_equal [ @first_guest.email, @second_guest.email ].sort,
      ActionMailer::Base.deliveries.map { |mail| mail.to.first }.sort
    assert ActionMailer::Base.deliveries.any? { |mail| mail.subject.include?("accepted") }
    assert ActionMailer::Base.deliveries.any? { |mail| mail.subject.include?("rejected") }
    assert ActionMailer::Base.deliveries.all? { |mail| mail.body.decoded.include?("First") || mail.body.decoded.include?("Follow-up") }

    AppointmentBooking.call(service_id: @second_service.id, guest_name: "Sam",
      guest_email: @second_guest.email, date: "2099-06-22", time: "11:00")
    AppointmentBooking.call(service_id: @second_service.id, guest_name: "Sam",
      guest_email: @second_guest.email, date: "2099-06-22", time: "11:30")
    assert_empty enqueued_jobs
  end

  test "a rolled-back decision does not enqueue a notification" do
    request = pending(@first_guest, @first_service, 9)

    assert_enqueued_jobs 0, only: ActionMailer::MailDeliveryJob do
      AppointmentRequest.transaction do
        AppointmentDecision.call(nutritionist: @nutritionist, request_id: request.id, decision: "accept")
        raise ActiveRecord::Rollback
      end
    end

    assert_equal "pending", request.reload.status
    assert_empty ActionMailer::Base.deliveries
  end

  private

  def pending(guest, service, hour, minute = 0)
    start = Time.utc(2099, 6, 22, hour - 1, minute)
    AppointmentRequest.create!(guest: guest, service: service, starts_at: start,
      ends_at: start + service.duration_minutes.minutes)
  end

  def concurrently(*actions)
    ready = Queue.new
    start = Queue.new
    threads = actions.map do |action|
      Thread.new do
        ActiveRecord::Base.connection_pool.with_connection do
          ready << true
          start.pop
          action.call
        rescue StandardError => error
          error
        end
      end
    end
    Timeout.timeout(10) do
      actions.length.times { ready.pop }
      actions.length.times { start << true }
      threads.map(&:value)
    end
  ensure
    threads&.each { |thread| thread.kill if thread.alive? }
  end
end
