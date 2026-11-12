import type {
  AppointmentRequest,
  Nutritionist,
  SearchResponse,
} from "@/api/types";

export const mockNutritionists: Nutritionist[] = [
  {
    id: 1,
    name: "Mary Jane",
    credential: "Dietitian",
    time_zone: "Europe/Lisbon",
    services: [
      {
        id: 1,
        nutritionist_id: 1,
        name: "First appointment",
        price_cents: 2500,
        duration_minutes: 60,
        city: "Braga",
        address: "Rua do Souto 12",
      },
      {
        id: 2,
        nutritionist_id: 1,
        name: "Follow-up",
        price_cents: 1800,
        duration_minutes: 30,
        city: "Braga",
        address: "Rua do Souto 12",
      },
    ],
  },
  {
    id: 2,
    name: "Ana Costa",
    credential: "Nutritionist",
    time_zone: "Europe/Lisbon",
    services: [
      {
        id: 3,
        nutritionist_id: 2,
        name: "Nutrition consultation",
        price_cents: 3200,
        duration_minutes: 45,
        city: "Braga",
        address: "Avenida da Liberdade 8",
      },
      {
        id: 4,
        nutritionist_id: 2,
        name: "Online consultation",
        price_cents: 2800,
        duration_minutes: 45,
        city: "Porto",
        address: "Online",
      },
    ],
  },
];

export const mockSearchResponse: SearchResponse = {
  items: mockNutritionists,
  meta: { page: 1, total_pages: 1, effective_location: "Braga" },
};

export const mockAppointmentRequests: AppointmentRequest[] = [
  {
    id: 1,
    nutritionist_id: 1,
    service: mockNutritionists[0].services[0],
    guest: { name: "Francisco Neves", email: "francisco@example.com" },
    starts_at: "2027-01-21T09:30:00Z",
    ends_at: "2027-01-21T10:30:00Z",
    status: "pending",
  },
];
