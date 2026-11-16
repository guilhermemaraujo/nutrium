require "time"

class AppointmentSlots
  class InvalidDate < StandardError; end

  def initialize(service:, date:, now: Time.current, windows: nil, accepted_requests: nil)
    @service = service
    @date = parse_date(date)
    @now = now
    @time_zone = TZInfo::Timezone.get(service.nutritionist.time_zone)
    @windows = windows
    @accepted_requests = accepted_requests
  end

  attr_reader :date

  def time_zone_name
    @service.nutritionist.time_zone
  end

  def resolve(time)
    match = /\A([01]\d|2[0-3]):([0-5]\d)\z/.match(time.to_s)
    return [ nil, :invalid_time ] unless match

    hour, minute = match.captures.map(&:to_i)
    wall = Time.utc(date.year, date.month, date.day, hour, minute)
    periods = @time_zone.periods_for_local(wall)
    return [ nil, :nonexistent_time ] if periods.empty?
    return [ nil, :ambiguous_time ] if periods.length > 1

    [ Time.at(wall.to_i - periods.first.utc_total_offset).utc, nil ]
  end

  def available?(time)
    start, error = resolve(time)
    return false if error

    slots.any? { |slot| slot[:starts_at] == start.iso8601 }
  end

  def slots
    windows = @windows ? @windows.select { |window| window.weekday == date.cwday } :
      @service.nutritionist.availability_windows.where(weekday: date.cwday)
    candidates = windows.flat_map do |window|
      first_minute = ((window.start_minute + 29) / 30) * 30
      (first_minute...window.end_minute).step(30).filter_map do |minute|
        start, error = resolve(format("%02d:%02d", minute / 60, minute % 60))
        next if error || start <= @now

        finish = start + @service.duration_minutes.minutes
        local_finish = finish.in_time_zone(time_zone_name)
        finish_minute = local_finish.hour * 60 + local_finish.min
        finish_minute = 1440 if local_finish.to_date == date.next_day && finish_minute.zero?
        next unless finish_minute <= window.end_minute &&
          (local_finish.to_date == date || finish_minute == 1440)

        { date: date.iso8601, time: format("%02d:%02d", minute / 60, minute % 60),
          starts_at: start.iso8601, ends_at: finish.iso8601 }
      end
    end

    return [] if candidates.empty?

    first_start = candidates.map { |slot| slot[:starts_at] }.min
    last_end = candidates.map { |slot| slot[:ends_at] }.max
    accepted = @accepted_requests || @service.nutritionist.appointment_requests.accepted
      .where("starts_at < ? AND ends_at > ?", last_end, first_start).to_a

    candidates.reject do |slot|
      accepted.any? { |request| request.starts_at < Time.iso8601(slot[:ends_at]) && request.ends_at > Time.iso8601(slot[:starts_at]) }
    end.sort_by { |slot| slot[:starts_at] }
  end

  private

  def parse_date(value)
    raise InvalidDate unless /\A\d{4}-\d{2}-\d{2}\z/.match?(value.to_s)

    Date.iso8601(value)
  rescue Date::Error
    raise InvalidDate
  end
end
