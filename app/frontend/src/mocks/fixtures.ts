import type { Nutritionist } from "@/api/types";

const mockNutritionists: Nutritionist[] = [
  {
    id: 1,
    name: "Mary Jane",
    credential: "Dietitian",
    registration_number: "2963N",
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
    registration_number: "DEMO-002",
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
  {
    id: 3,
    name: "Beatriz Silva",
    credential: "Nutritionist",
    registration_number: "DEMO-003",
    time_zone: "Europe/Lisbon",
    services: [
      {
        id: 5,
        nutritionist_id: 3,
        name: "Sports nutrition",
        price_cents: 3500,
        duration_minutes: 50,
        city: "Braga",
        address: "Rua de São Victor 24",
      },
    ],
  },
  {
    id: 4,
    name: "João Pereira",
    credential: "Dietitian",
    registration_number: "DEMO-004",
    time_zone: "Europe/Lisbon",
    services: [
      {
        id: 6,
        nutritionist_id: 4,
        name: "Family nutrition",
        price_cents: 3000,
        duration_minutes: 45,
        city: "Braga",
        address: "Avenida Central 51",
      },
    ],
  },
  {
    id: 5,
    name: "Sofia Martins",
    credential: "Nutritionist",
    registration_number: "DEMO-005",
    time_zone: "Europe/Lisbon",
    services: [
      {
        id: 7,
        nutritionist_id: 5,
        name: "Weight management",
        price_cents: 2900,
        duration_minutes: 40,
        city: "Braga",
        address: "Rua Nova de Santa Cruz 15",
      },
    ],
  },
];

export function createMockNutritionists(): Nutritionist[] {
  return structuredClone(mockNutritionists);
}
