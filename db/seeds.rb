require "time"

people = [
  [ :mary_jane, "DEMO-REG-001", "Mary Jane", "Dietitian" ],
  [ :ana_costa, "DEMO-REG-002", "Ana Costa", "Nutritionist" ],
  [ :beatriz_silva, "DEMO-REG-003", "Beatriz Silva", "Sports Nutritionist" ],
  [ :joao_pereira, "DEMO-REG-004", "João Pereira", "Dietitian" ],
  [ :sofia_martins, "DEMO-REG-005", "Sofia Martins", "Nutritionist" ]
]

nutritionists = people.to_h do |key, registration_number, name, credential|
  person = Nutritionist.find_or_create_by!(registration_number: registration_number) do |record|
    record.name = name
    record.credential = credential
    record.time_zone = "Europe/Lisbon"
  end
  [ key, person ]
end

service_rows = [
  [ :mary_first_in_person, :mary_jane, "First appointment", "in_person", 2500, 60, "Braga", "Rua do Souto 12" ],
  [ :mary_first_online, :mary_jane, "First appointment", "online", 2300, 60, nil, nil ],
  [ :mary_follow_up_in_person, :mary_jane, "Follow-up", "in_person", 1800, 30, "Braga", "Rua do Souto 12" ],
  [ :ana_nutrition_in_person, :ana_costa, "Nutrition consultation", "in_person", 3200, 45, "Braga", "Avenida da Liberdade 8" ],
  [ :ana_nutrition_online, :ana_costa, "Nutrition consultation", "online", 2800, 45, nil, nil ],
  [ :beatriz_sports_in_person, :beatriz_silva, "Sports nutrition", "in_person", 3500, 50, "Braga", "Rua de São Victor 24" ],
  [ :beatriz_sports_follow_up_in_person, :beatriz_silva, "Sports follow-up", "in_person", 3000, 30, "Porto", "Rua de Cedofeita 18" ],
  [ :joao_family_in_person, :joao_pereira, "Family nutrition", "in_person", 3000, 45, "Braga", "Avenida Central 51" ],
  [ :sofia_weight_in_person, :sofia_martins, "Weight management", "in_person", 2900, 40, "Braga", "Rua Nova de Santa Cruz 15" ]
]

services = service_rows.to_h do |key, nutritionist_key, name, modality, price_cents, duration_minutes, city, address|
  service = Service.find_or_create_by!(nutritionist: nutritionists.fetch(nutritionist_key), name: name, modality: modality) do |record|
    record.price_cents = price_cents
    record.duration_minutes = duration_minutes
    record.city = city
    record.address = address
  end
  [ key, service ]
end

# Leave any existing schedule untouched; populate only professionals without one.
nutritionists.each_value do |nutritionist|
  next if nutritionist.availability_windows.exists?

  (1..5).each do |weekday|
    nutritionist.availability_windows.create!(weekday: weekday, start_minute: 9 * 60, end_minute: 12 * 60 + 30)
    nutritionist.availability_windows.create!(weekday: weekday, start_minute: 13 * 60 + 30, end_minute: 17 * 60 + 30)
  end
end

request_rows = [
  [ "Alex Morgan", "alex@example.com", :mary_first_in_person, "2099-06-22T09:00:00Z" ],
  [ "Sam Taylor", "sam@example.com", :mary_follow_up_in_person, "2099-06-22T09:30:00Z" ],
  [ "Casey Lee", "casey@example.com", :ana_nutrition_in_person, "2099-06-23T14:00:00Z" ],
  [ "Drew Miller", "drew@example.com", :mary_first_in_person, "2099-06-24T09:00:00Z" ],
  [ "Robin Park", "robin@example.com", :mary_follow_up_in_person, "2099-06-25T14:00:00Z" ],
  [ "Jordan Reed", "jordan@example.com", :ana_nutrition_online, "2099-06-26T10:00:00Z" ]
]

request_rows.each do |name, email, service_key, starts_at_text|
  guest = Guest.find_or_create_by!(email: email) { |record| record.name = name }
  next if guest.appointment_requests.exists?

  service = services.fetch(service_key)
  starts_at = Time.iso8601(starts_at_text)
  AppointmentRequest.create!(
    guest: guest,
    service: service,
    starts_at: starts_at,
    ends_at: starts_at + service.duration_minutes.minutes
  )
end
