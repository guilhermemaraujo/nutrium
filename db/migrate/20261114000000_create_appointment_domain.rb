class CreateAppointmentDomain < ActiveRecord::Migration[7.2]
  def change
    enable_extension "btree_gist"

    create_table :nutritionists do |t|
      t.string :name, null: false
      t.string :credential, null: false
      t.string :registration_number, null: false
      t.string :time_zone, null: false

      t.timestamps
    end
    add_index :nutritionists, :registration_number, unique: true

    create_table :services do |t|
      t.references :nutritionist, null: false, foreign_key: true
      t.string :name, null: false
      t.string :modality, null: false
      t.integer :price_cents, null: false
      t.integer :duration_minutes, null: false
      t.string :city
      t.string :address

      t.timestamps
    end
    add_index :services, [ :nutritionist_id, :name, :modality ], unique: true
    add_index :services, [ :id, :nutritionist_id ], unique: true, name: "index_services_on_id_and_nutritionist_id"
    add_check_constraint :services, "btrim(name) <> ''", name: "services_name_nonblank"
    add_check_constraint :services, "modality IN ('online', 'in_person')", name: "services_modality_valid"
    add_check_constraint :services, "price_cents >= 0", name: "services_price_nonnegative"
    add_check_constraint :services, "duration_minutes > 0", name: "services_duration_positive"
    add_check_constraint :services,
      "modality <> 'in_person' OR (city IS NOT NULL AND btrim(city) <> '' AND address IS NOT NULL AND btrim(address) <> '')",
      name: "services_in_person_location_required"

    create_table :availability_windows do |t|
      t.references :nutritionist, null: false, foreign_key: true
      t.integer :weekday, null: false # ISO weekday: Monday = 1, Sunday = 7
      t.integer :start_minute, null: false # Minutes after local midnight
      t.integer :end_minute, null: false

      t.timestamps
    end
    add_check_constraint :availability_windows, "weekday BETWEEN 1 AND 7", name: "availability_windows_weekday_valid"
    add_check_constraint :availability_windows,
      "start_minute >= 0 AND end_minute <= 1440 AND end_minute > start_minute",
      name: "availability_windows_bounds_valid"
    add_exclusion_constraint :availability_windows,
      "nutritionist_id WITH =, weekday WITH =, int4range(start_minute, end_minute, '[)') WITH &&",
      using: :gist,
      name: "availability_windows_do_not_overlap"

    create_table :guests do |t|
      t.string :name, null: false
      t.string :email, null: false

      t.timestamps
    end
    add_index :guests, :email, unique: true
    add_check_constraint :guests, "email = lower(btrim(email)) AND email <> ''", name: "guests_email_normalized"

    create_table :appointment_requests, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
      t.references :guest, null: false, foreign_key: true
      t.references :service, null: false
      t.references :nutritionist, null: false, foreign_key: true
      t.timestamptz :starts_at, null: false
      t.timestamptz :ends_at, null: false
      t.string :status, null: false, default: "pending"

      t.string :service_name, null: false
      t.string :service_modality, null: false
      t.integer :service_price_cents, null: false
      t.integer :service_duration_minutes, null: false
      t.string :service_city
      t.string :service_address
      t.string :time_zone, null: false

      t.timestamps
    end

    add_foreign_key :appointment_requests, :services,
      column: [ :service_id, :nutritionist_id ],
      primary_key: [ :id, :nutritionist_id ],
      name: "fk_appointment_requests_service_nutritionist"
    add_index :appointment_requests, :guest_id, unique: true,
      where: "status = 'pending'", name: "index_appointment_requests_one_pending_per_guest"
    add_index :appointment_requests, [ :nutritionist_id, :status, :starts_at ],
      name: "index_appointment_requests_on_nutritionist_status_start"
    add_check_constraint :appointment_requests,
      "status IN ('pending', 'accepted', 'rejected', 'superseded')",
      name: "appointment_requests_status_valid"
    add_check_constraint :appointment_requests, "ends_at > starts_at", name: "appointment_requests_interval_positive"
    add_check_constraint :appointment_requests, "service_modality IN ('online', 'in_person')",
      name: "appointment_requests_service_modality_valid"
    add_check_constraint :appointment_requests, "btrim(service_name) <> ''",
      name: "appointment_requests_service_name_nonblank"
    add_check_constraint :appointment_requests, "service_price_cents >= 0",
      name: "appointment_requests_service_price_nonnegative"
    add_check_constraint :appointment_requests, "service_duration_minutes > 0",
      name: "appointment_requests_service_duration_positive"
    add_check_constraint :appointment_requests,
      "service_modality <> 'in_person' OR (service_city IS NOT NULL AND btrim(service_city) <> '' AND service_address IS NOT NULL AND btrim(service_address) <> '')",
      name: "appointment_requests_in_person_location_required"
    add_check_constraint :appointment_requests, "btrim(time_zone) <> ''",
      name: "appointment_requests_time_zone_nonblank"
    add_exclusion_constraint :appointment_requests,
      "nutritionist_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&",
      using: :gist,
      where: "status = 'accepted'",
      name: "appointment_requests_accepted_slots_do_not_overlap"
  end
end
