class AppointmentRequest < ApplicationRecord
  belongs_to :guest
  belongs_to :service
  belongs_to :nutritionist

  enum :status, {
    pending: "pending",
    accepted: "accepted",
    rejected: "rejected",
    superseded: "superseded"
  }, validate: true

  before_validation :capture_booking_details, on: :create
  after_update_commit :enqueue_decision_email, if: :decision_status_changed?

  validates :starts_at, :ends_at, presence: true
  validates :service_name, :time_zone, presence: true
  validates :service_city, :service_address, presence: true, if: :in_person_service_snapshot?
  validates :service_modality, inclusion: { in: Service.modalities.values }
  validates :service_price_cents, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :service_duration_minutes, numericality: { only_integer: true, greater_than: 0 }
  validate :end_follows_start
  validate :service_belongs_to_nutritionist
  validate :time_zone_is_iana

  private

  def decision_status_changed?
    saved_change_to_status? && (accepted? || rejected?)
  end

  def enqueue_decision_email
    AppointmentDecisionMailer.decision(id).deliver_later
  end

  def capture_booking_details
    self.nutritionist ||= service&.nutritionist
    return unless service && nutritionist

    self.service_name = service.name
    self.service_modality = service.modality
    self.service_price_cents = service.price_cents
    self.service_duration_minutes = service.duration_minutes
    self.service_city = service.city
    self.service_address = service.address
    self.time_zone = nutritionist.time_zone
  end

  def end_follows_start
    return unless starts_at && ends_at

    errors.add(:ends_at, "must be after the start") unless ends_at > starts_at
  end

  def service_belongs_to_nutritionist
    return unless service && nutritionist

    errors.add(:service, "must belong to the nutritionist") unless service.nutritionist_id == nutritionist.id
  end

  def in_person_service_snapshot?
    service_modality == "in_person"
  end

  def time_zone_is_iana
    return if time_zone.blank?

    TZInfo::Timezone.get(time_zone)
  rescue TZInfo::InvalidTimezoneIdentifier
    errors.add(:time_zone, "must be a valid IANA time zone")
  end
end
