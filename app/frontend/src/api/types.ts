export type RequestStatus = "pending" | "accepted" | "rejected" | "superseded";
export type ConsultationModality = "online" | "in_person";

export interface Service {
  id: number;
  nutritionist_id: number;
  name: string;
  modality: ConsultationModality;
  price_cents: number;
  duration_minutes: number;
  city: string | null;
  address: string | null;
}

export interface Nutritionist {
  id: number;
  name: string;
  credential: string;
  registration_number: string;
  time_zone: string;
  services: Service[];
}

export interface NutritionistOption {
  id: number;
  name: string;
  time_zone: string;
}

export interface NutritionistOptionsResponse {
  items: NutritionistOption[];
}

export interface SearchResponse {
  items: Nutritionist[];
  meta: { page: number; total_pages: number; effective_location: string };
}

export interface AvailableSlot {
  date: string; // YYYY-MM-DD in the nutritionist's time zone
  time: string; // HH:mm in the nutritionist's time zone
  starts_at: string; // ISO 8601 UTC
  ends_at: string; // ISO 8601 UTC
}

export interface AvailableSlotsResponse {
  time_zone: string; // IANA time zone
  date: string; // YYYY-MM-DD in that time zone
  items: AvailableSlot[];
}

export interface CreateAppointmentRequest {
  service_id: number;
  guest: { name: string; email: string };
  date: string; // YYYY-MM-DD in the nutritionist's time zone
  time: string; // HH:mm in the nutritionist's time zone
}

export interface AppointmentRequest {
  id: string; // UUID
  nutritionist_id: number;
  service: Service;
  guest: { name: string; email: string };
  starts_at: string; // ISO 8601 UTC
  ends_at: string; // ISO 8601 UTC
  status: RequestStatus;
}

export interface AppointmentRequestListResponse {
  items: AppointmentRequest[];
}

export interface DecideAppointmentRequest {
  decision: "accept" | "reject";
}

export interface ApiError {
  error: string;
  fields?: Record<string, string[]>;
}
