class Service < ApplicationRecord
  belongs_to :nutritionist
  has_many :appointment_requests, dependent: :restrict_with_error

  enum :modality, { online: "online", in_person: "in_person" }, validate: true

  validates :name, presence: true, uniqueness: { scope: [ :nutritionist_id, :modality ] }
  validates :city, :address, presence: true, if: :in_person?
  validates :price_cents, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :duration_minutes, numericality: { only_integer: true, greater_than: 0 }
end
