class AvailabilityWindow < ApplicationRecord
  belongs_to :nutritionist

  validates :weekday, inclusion: { in: 1..7 }
  validates :start_minute, numericality: { only_integer: true, greater_than_or_equal_to: 0, less_than: 1440 }
  validates :end_minute, numericality: { only_integer: true, greater_than: 0, less_than_or_equal_to: 1440 }
  validate :end_follows_start
  validate :does_not_overlap_existing_window

  private

  def end_follows_start
    return unless start_minute.is_a?(Integer) && end_minute.is_a?(Integer)

    errors.add(:end_minute, "must be after the start") unless end_minute > start_minute
  end

  def does_not_overlap_existing_window
    return unless nutritionist_id && weekday.is_a?(Integer)
    return unless start_minute.is_a?(Integer) && end_minute.is_a?(Integer) && end_minute > start_minute

    overlapping = self.class.where(nutritionist_id: nutritionist_id, weekday: weekday)
      .where("start_minute < ? AND end_minute > ?", end_minute, start_minute)
    overlapping = overlapping.where.not(id: id) if persisted?
    errors.add(:base, "Availability window overlaps another window") if overlapping.exists?
  end
end
