require "test_helper"

class AvailabilityWindowTest < ActiveSupport::TestCase
  setup do
    @nutritionist = Nutritionist.create!(
      name: "Mary Jane", credential: "Dietitian", registration_number: "DEMO-REG-001", time_zone: "Europe/Lisbon"
    )
  end

  test "allows multiple disjoint and adjacent local windows on a weekday" do
    morning = @nutritionist.availability_windows.create!(weekday: 1, start_minute: 9 * 60, end_minute: 12 * 60)
    afternoon = @nutritionist.availability_windows.create!(weekday: 1, start_minute: 12 * 60, end_minute: 17 * 60)

    assert_includes @nutritionist.availability_windows, morning
    assert_includes @nutritionist.availability_windows, afternoon
  end

  test "rejects overlapping and invalid local windows" do
    @nutritionist.availability_windows.create!(weekday: 1, start_minute: 9 * 60, end_minute: 12 * 60)

    overlap = @nutritionist.availability_windows.build(weekday: 1, start_minute: 11 * 60, end_minute: 13 * 60)
    assert_not overlap.valid?

    assert_not @nutritionist.availability_windows.build(weekday: 0, start_minute: 9 * 60, end_minute: 10 * 60).valid?
    assert_not @nutritionist.availability_windows.build(weekday: 1, start_minute: 10 * 60, end_minute: 10 * 60).valid?
    assert_not @nutritionist.availability_windows.build(weekday: 1, start_minute: -1, end_minute: 60).valid?
    assert_not @nutritionist.availability_windows.build(weekday: 1, start_minute: 0, end_minute: 1441).valid?
  end

  test "same local time on another weekday is independent" do
    @nutritionist.availability_windows.create!(weekday: 1, start_minute: 9 * 60, end_minute: 12 * 60)
    assert @nutritionist.availability_windows.build(weekday: 2, start_minute: 9 * 60, end_minute: 12 * 60).valid?
  end
end
