class Nutritionist < ApplicationRecord
  has_many :services, dependent: :restrict_with_error
  has_many :availability_windows, dependent: :restrict_with_error
  has_many :appointment_requests, dependent: :restrict_with_error

  validates :name, :credential, :registration_number, :time_zone, presence: true
  validates :registration_number, uniqueness: true
  validate :time_zone_is_iana

  private

  def time_zone_is_iana
    return if time_zone.blank?

    TZInfo::Timezone.get(time_zone)
  rescue TZInfo::InvalidTimezoneIdentifier
    errors.add(:time_zone, "must be a valid IANA time zone")
  end
end
