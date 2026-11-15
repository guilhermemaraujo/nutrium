import {
  ApiRequestError,
  type AvailabilityApi,
  type BookingApi,
  type RequestsApi,
  type SearchApi,
} from "./contracts";
import type {
  ApiError,
  AppointmentRequest,
  AppointmentRequestListResponse,
  AvailableSlotsResponse,
  NutritionistOptionsResponse,
  SearchResponse,
} from "./types";

async function readJson<T>(response: Response, fallback: string): Promise<T> {
  const body = (await response.json().catch(() => null)) as
    (T & Partial<ApiError>) | null;
  if (!response.ok)
    throw new ApiRequestError(body?.error ?? fallback, body?.fields);
  if (body === null) throw new ApiRequestError("Invalid server response.");
  return body;
}

export const httpApi: SearchApi & BookingApi & RequestsApi & AvailabilityApi = {
  async listAvailableSlots(nutritionistId, serviceId, date, signal) {
    const params = new URLSearchParams({ service_id: String(serviceId), date });
    const response = await fetch(
      `/api/nutritionists/${nutritionistId}/available_slots?${params}`,
      { headers: { Accept: "application/json" }, signal },
    );
    return readJson<AvailableSlotsResponse>(
      response,
      "Could not load available slots.",
    );
  },
  async listNutritionists(signal) {
    const response = await fetch("/api/nutritionists/options", {
      headers: { Accept: "application/json" },
      signal,
    });
    const body = await readJson<NutritionistOptionsResponse>(
      response,
      "Could not load nutritionists.",
    );
    return body.items;
  },
  async listAppointmentRequests(nutritionistId, signal) {
    const response = await fetch(
      `/api/nutritionists/${nutritionistId}/appointment_requests?status=pending`,
      { headers: { Accept: "application/json" }, signal },
    );
    return readJson<AppointmentRequestListResponse>(
      response,
      "Could not load requests.",
    );
  },
  async decideAppointmentRequest(nutritionistId, requestId, input) {
    const response = await fetch(
      `/api/nutritionists/${nutritionistId}/appointment_requests/${requestId}`,
      {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      },
    );
    return readJson<AppointmentRequest>(response, "Could not update request.");
  },
  async createAppointmentRequest(input) {
    const response = await fetch("/api/appointment_requests", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
    return readJson<AppointmentRequest>(response, "Request failed.");
  },
  async search(query, location, page, signal) {
    const params = new URLSearchParams({
      q: query,
      location,
      page: String(page),
    });
    const response = await fetch(`/api/nutritionists?${params}`, {
      headers: { Accept: "application/json" },
      signal,
    });
    return readJson<SearchResponse>(response, "Search failed.");
  },
};
