import type {
  ApiError,
  AppointmentRequest,
  CreateAppointmentRequest,
  Nutritionist,
  SearchResponse,
} from "@/api/types";
import { createMockNutritionists } from "@/mocks/fixtures";

export interface SearchApi {
  search(
    query: string,
    location: string,
    page: number,
    signal?: AbortSignal,
  ): Promise<SearchResponse>;
}

export interface BookingApi {
  createAppointmentRequest(
    input: CreateAppointmentRequest,
  ): Promise<AppointmentRequest>;
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly fields: ApiError["fields"] = {},
  ) {
    super(message);
  }
}

function wait(signal?: AbortSignal, delayMs = 160): Promise<void> {
  if (signal?.aborted) return Promise.reject(signal.reason);
  if (delayMs === 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, delayMs);
    function abort() {
      clearTimeout(timeout);
      reject(signal?.reason);
    }
    signal?.addEventListener("abort", abort, { once: true });
  });
}
const normalize = (value: string) => value.trim().toLocaleLowerCase();

function localSlotToUtc(date: string, time: string, timeZone: string): Date {
  const wallTime = Date.parse(`${date}T${time}:00Z`);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const offsetAt = (instant: number) => {
    const parts = formatter.formatToParts(new Date(instant));
    const part = (type: string) =>
      Number(parts.find((item) => item.type === type)?.value);
    return (
      Date.UTC(
        part("year"),
        part("month") - 1,
        part("day"),
        part("hour"),
        part("minute"),
      ) - instant
    );
  };
  const first = wallTime - offsetAt(wallTime);
  return new Date(wallTime - offsetAt(first));
}
export function createMockApi(delayMs = 160): SearchApi & BookingApi {
  const nutritionists = createMockNutritionists();
  const requests: AppointmentRequest[] = [];
  const locations = [
    ...new Set(
      nutritionists.flatMap((person) =>
        person.services.map((service) => service.city),
      ),
    ),
  ];

  return {
    async createAppointmentRequest(input) {
      await wait(undefined, delayMs);
      const service = nutritionists
        .flatMap((person) => person.services)
        .find((item) => item.id === input.service_id);
      const person = nutritionists.find(
        (item) => item.id === service?.nutritionist_id,
      );
      const fields: NonNullable<ApiError["fields"]> = {};
      if (!service || !person) fields.service_id = ["Choose a valid service."];
      if (!input.guest.name.trim()) fields.name = ["Enter your name."];
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.guest.email.trim()))
        fields.email = ["Enter a valid email address."];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date))
        fields.date = ["Choose a date."];
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time))
        fields.time = ["Choose a time."];
      if (person && input.date && input.time) {
        const now = new Intl.DateTimeFormat("en-CA", {
          timeZone: person.time_zone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        }).formatToParts(new Date());
        const part = (type: string) =>
          now.find((item) => item.type === type)?.value ?? "";
        const localNow = `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
        if (`${input.date}T${input.time}` <= localNow)
          fields.date = ["Choose a future date and time."];
      }
      if (Object.keys(fields).length)
        throw new ApiRequestError(
          "Please correct the highlighted fields.",
          fields,
        );

      const email = input.guest.email.trim().toLocaleLowerCase();
      for (const request of requests) {
        if (request.guest.email === email && request.status === "pending")
          request.status = "superseded";
      }
      const startsAt = localSlotToUtc(
        input.date,
        input.time,
        person!.time_zone,
      );
      const request: AppointmentRequest = {
        id: requests.length + 1,
        nutritionist_id: person!.id,
        service: structuredClone(service!),
        guest: { name: input.guest.name.trim(), email },
        starts_at: startsAt.toISOString(),
        ends_at: new Date(
          startsAt.getTime() + service!.duration_minutes * 60_000,
        ).toISOString(),
        status: "pending",
      };
      requests.push(request);
      return structuredClone(request);
    },
    async search(query, location, page, signal) {
      await wait(signal, delayMs);
      const effectiveLocation =
        locations.find((city) => normalize(city) === normalize(location)) ??
        "Braga";
      const term = normalize(query);
      const matches: Nutritionist[] = nutritionists
        .map((person) => ({
          ...person,
          services: person.services.filter(
            (service) =>
              normalize(service.city) === normalize(effectiveLocation),
          ),
        }))
        .filter(
          (person) =>
            person.services.length &&
            (!term ||
              normalize(person.name).includes(term) ||
              person.services.some((service) =>
                normalize(service.name).includes(term),
              )),
        );
      const pageSize = 4;
      return {
        items: matches.slice((page - 1) * pageSize, page * pageSize),
        meta: {
          page,
          total_pages: Math.max(1, Math.ceil(matches.length / pageSize)),
          effective_location: effectiveLocation,
        },
      };
    },
  };
}

export const httpApi: SearchApi & BookingApi = {
  async createAppointmentRequest(input) {
    const response = await fetch("/api/appointment_requests", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
    const body = await response.json();
    if (!response.ok)
      throw new ApiRequestError(body.error ?? "Request failed.", body.fields);
    return body as AppointmentRequest;
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
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "Search failed.");
    return body as SearchResponse;
  },
};

export const api: SearchApi & BookingApi =
  import.meta.env.VITE_API_MODE === "http" ? httpApi : createMockApi();
