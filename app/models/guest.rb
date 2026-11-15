require "uri/mailto"

class Guest < ApplicationRecord
  has_many :appointment_requests, dependent: :restrict_with_error

  before_validation :normalize_email

  validates :name, presence: true
  validates :email, presence: true, uniqueness: true, format: { with: URI::MailTo::EMAIL_REGEXP }

  private

  def normalize_email
    self.email = email.to_s.strip.downcase
  end
end
