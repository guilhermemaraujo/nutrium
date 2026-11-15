# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[7.2].define(version: 2026_11_14_000000) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "btree_gist"
  enable_extension "plpgsql"

  create_table "appointment_requests", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.bigint "guest_id", null: false
    t.bigint "service_id", null: false
    t.bigint "nutritionist_id", null: false
    t.timestamptz "starts_at", null: false
    t.timestamptz "ends_at", null: false
    t.string "status", default: "pending", null: false
    t.string "service_name", null: false
    t.string "service_modality", null: false
    t.integer "service_price_cents", null: false
    t.integer "service_duration_minutes", null: false
    t.string "service_city"
    t.string "service_address"
    t.string "time_zone", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["guest_id"], name: "index_appointment_requests_on_guest_id"
    t.index ["guest_id"], name: "index_appointment_requests_one_pending_per_guest", unique: true, where: "((status)::text = 'pending'::text)"
    t.index ["nutritionist_id", "status", "starts_at"], name: "index_appointment_requests_on_nutritionist_status_start"
    t.index ["nutritionist_id"], name: "index_appointment_requests_on_nutritionist_id"
    t.index ["service_id"], name: "index_appointment_requests_on_service_id"
    t.check_constraint "btrim(service_name::text) <> ''::text", name: "appointment_requests_service_name_nonblank"
    t.check_constraint "btrim(time_zone::text) <> ''::text", name: "appointment_requests_time_zone_nonblank"
    t.check_constraint "ends_at > starts_at", name: "appointment_requests_interval_positive"
    t.check_constraint "service_duration_minutes > 0", name: "appointment_requests_service_duration_positive"
    t.check_constraint "service_modality::text <> 'in_person'::text OR service_city IS NOT NULL AND btrim(service_city::text) <> ''::text AND service_address IS NOT NULL AND btrim(service_address::text) <> ''::text", name: "appointment_requests_in_person_location_required"
    t.check_constraint "service_modality::text = ANY (ARRAY['online'::character varying, 'in_person'::character varying]::text[])", name: "appointment_requests_service_modality_valid"
    t.check_constraint "service_price_cents >= 0", name: "appointment_requests_service_price_nonnegative"
    t.check_constraint "status::text = ANY (ARRAY['pending'::character varying, 'accepted'::character varying, 'rejected'::character varying, 'superseded'::character varying]::text[])", name: "appointment_requests_status_valid"
    t.exclusion_constraint "nutritionist_id WITH =, tstzrange(starts_at, ends_at, '[)'::text) WITH &&", where: "(status)::text = 'accepted'::text", using: :gist, name: "appointment_requests_accepted_slots_do_not_overlap"
  end

  create_table "availability_windows", force: :cascade do |t|
    t.bigint "nutritionist_id", null: false
    t.integer "weekday", null: false
    t.integer "start_minute", null: false
    t.integer "end_minute", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["nutritionist_id"], name: "index_availability_windows_on_nutritionist_id"
    t.check_constraint "start_minute >= 0 AND end_minute <= 1440 AND end_minute > start_minute", name: "availability_windows_bounds_valid"
    t.check_constraint "weekday >= 1 AND weekday <= 7", name: "availability_windows_weekday_valid"
    t.exclusion_constraint "nutritionist_id WITH =, weekday WITH =, int4range(start_minute, end_minute, '[)'::text) WITH &&", using: :gist, name: "availability_windows_do_not_overlap"
  end

  create_table "guests", force: :cascade do |t|
    t.string "name", null: false
    t.string "email", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_guests_on_email", unique: true
    t.check_constraint "email::text = lower(btrim(email::text)) AND email::text <> ''::text", name: "guests_email_normalized"
  end

  create_table "nutritionists", force: :cascade do |t|
    t.string "name", null: false
    t.string "credential", null: false
    t.string "registration_number", null: false
    t.string "time_zone", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["registration_number"], name: "index_nutritionists_on_registration_number", unique: true
  end

  create_table "services", force: :cascade do |t|
    t.bigint "nutritionist_id", null: false
    t.string "name", null: false
    t.string "modality", null: false
    t.integer "price_cents", null: false
    t.integer "duration_minutes", null: false
    t.string "city"
    t.string "address"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["id", "nutritionist_id"], name: "index_services_on_id_and_nutritionist_id", unique: true
    t.index ["nutritionist_id", "name", "modality"], name: "index_services_on_nutritionist_id_and_name_and_modality", unique: true
    t.index ["nutritionist_id"], name: "index_services_on_nutritionist_id"
    t.check_constraint "btrim(name::text) <> ''::text", name: "services_name_nonblank"
    t.check_constraint "duration_minutes > 0", name: "services_duration_positive"
    t.check_constraint "modality::text <> 'in_person'::text OR city IS NOT NULL AND btrim(city::text) <> ''::text AND address IS NOT NULL AND btrim(address::text) <> ''::text", name: "services_in_person_location_required"
    t.check_constraint "modality::text = ANY (ARRAY['online'::character varying, 'in_person'::character varying]::text[])", name: "services_modality_valid"
    t.check_constraint "price_cents >= 0", name: "services_price_nonnegative"
  end

  add_foreign_key "appointment_requests", "guests"
  add_foreign_key "appointment_requests", "nutritionists"
  add_foreign_key "appointment_requests", "services", column: ["service_id", "nutritionist_id"], primary_key: ["id", "nutritionist_id"], name: "fk_appointment_requests_service_nutritionist"
  add_foreign_key "availability_windows", "nutritionists"
  add_foreign_key "services", "nutritionists"
end
