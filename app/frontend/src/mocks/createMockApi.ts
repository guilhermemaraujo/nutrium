import {
  ApiRequestError,
  type AvailabilityApi,
  type BookingApi,
  type RequestsApi,
  type SearchApi,
} from "@/api/contracts";
import type {
  ApiError,
  AppointmentRequest,
  AvailableSlot,
  Nutritionist,
} from "@/api/types";
import { resolveLocalSlot } from "@/lib/localSlot";

import { createMockNutritionists } from "./fixtures";

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

export function createMockApi(
  delayMs = 160,
): SearchApi & BookingApi & RequestsApi & AvailabilityApi {
  const nutritionists = createMockNutritionists();
  const seededRequestId = (index: number) =>
    `00000000-0000-4000-8000-${index.toString(16).padStart(12, "0")}`;
  const seededRequest = (
    id: AppointmentRequest["id"],
    serviceId: number,
    guest: AppointmentRequest["guest"],
    startsAt: string,
  ): AppointmentRequest => {
    const service = nutritionists
      .flatMap((person) => person.services)
      .find((item) => item.id === serviceId)!;
    return {
      id,
      nutritionist_id: service.nutritionist_id,
      service: structuredClone(service),
      guest,
      starts_at: startsAt,
      ends_at: new Date(
        Date.parse(startsAt) + service.duration_minutes * 60_000,
      ).toISOString(),
      status: "pending",
    };
  };
  const requests: AppointmentRequest[] = [
    seededRequest(
      seededRequestId(1),
      1,
      { name: "Alex Morgan", email: "alex@example.com" },
      "2099-06-20T09:00:00.000Z",
    ),
    seededRequest(
      seededRequestId(2),
      2,
      { name: "Sam Taylor", email: "sam@example.com" },
      "2099-06-20T09:30:00.000Z",
    ),
    seededRequest(
      seededRequestId(3),
      3,
      { name: "Casey Lee", email: "casey@example.com" },
      "2099-06-21T13:00:00.000Z",
    ),
    seededRequest(
      seededRequestId(4),
      1,
      { name: "Drew Miller", email: "drew@example.com" },
      "2099-06-22T09:00:00.000Z",
    ),
    seededRequest(
      seededRequestId(5),
      2,
      { name: "Robin Park", email: "robin@example.com" },
      "2099-06-23T14:00:00.000Z",
    ),
    seededRequest(
      seededRequestId(6),
      4,
      { name: "Jordan Reed", email: "jordan@example.com" },
      "2099-06-24T10:00:00.000Z",
    ),
  ];
  const locations = [
    ...new Set(
      nutritionists.flatMap((person) =>
        person.services
          .map((service) => service.city)
          .filter((city): city is string => city !== null),
      ),
    ),
  ];

  return {
    async listAvailableSlots(nutritionistId, serviceId, date, signal) {
      await wait(signal, delayMs);
      const person = nutritionists.find((item) => item.id === nutritionistId);
      if (!person) throw new ApiRequestError("Nutritionist not found.");
      const service = person.services.find((item) => item.id === serviceId);
      if (!service)
        throw new ApiRequestError("Please correct the highlighted fields.", {
          service_id: ["Choose a valid service."],
        });
      if (resolveLocalSlot(date, "12:00", person.time_zone).kind !== "valid")
        throw new ApiRequestError("Please correct the highlighted fields.", {
          date: ["Choose a valid date."],
        });

      const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
      const items: AvailableSlot[] = [];
      if (weekday !== 0 && weekday !== 6) {
        for (const [windowStart, windowEnd] of [
          [9 * 60, 12 * 60 + 30],
          [13 * 60 + 30, 17 * 60 + 30],
        ]) {
          for (
            let minute = windowStart;
            minute + service.duration_minutes <= windowEnd;
            minute += 30
          ) {
            const time = `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
            const resolved = resolveLocalSlot(date, time, person.time_zone);
            if (
              resolved.kind !== "valid" ||
              resolved.startsAt.getTime() <= Date.now()
            )
              continue;
            const startsAt = resolved.startsAt.getTime();
            const endsAt = startsAt + service.duration_minutes * 60_000;
            if (
              requests.some(
                (request) =>
                  request.nutritionist_id === nutritionistId &&
                  request.status === "accepted" &&
                  Date.parse(request.starts_at) < endsAt &&
                  startsAt < Date.parse(request.ends_at),
              )
            )
              continue;
            items.push({
              date,
              time,
              starts_at: new Date(startsAt).toISOString(),
              ends_at: new Date(endsAt).toISOString(),
            });
          }
        }
      }
      return structuredClone({ time_zone: person.time_zone, date, items });
    },
    async listNutritionists(signal) {
      await wait(signal, delayMs);
      return nutritionists.map(({ id, name, time_zone }) => ({
        id,
        name,
        time_zone,
      }));
    },
    async listAppointmentRequests(nutritionistId, signal) {
      await wait(signal, delayMs);
      if (!nutritionists.some((person) => person.id === nutritionistId))
        throw new ApiRequestError("Nutritionist not found.");
      return {
        items: structuredClone(
          requests.filter(
            (request) =>
              request.nutritionist_id === nutritionistId &&
              request.status === "pending",
          ),
        ),
      };
    },
    async decideAppointmentRequest(nutritionistId, requestId, input) {
      await wait(undefined, delayMs);
      const request = requests.find(
        (item) =>
          item.id === requestId && item.nutritionist_id === nutritionistId,
      );
      if (!request || request.status !== "pending")
        throw new ApiRequestError("This request is no longer pending.");
      if (input.decision === "accept") {
        const conflictsWithAccepted = requests.some(
          (other) =>
            other.id !== request.id &&
            other.nutritionist_id === nutritionistId &&
            other.status === "accepted" &&
            other.starts_at < request.ends_at &&
            request.starts_at < other.ends_at,
        );
        if (conflictsWithAccepted)
          throw new ApiRequestError(
            "This slot conflicts with an accepted appointment.",
          );
        request.status = "accepted";
        for (const other of requests) {
          if (
            other.id !== request.id &&
            other.nutritionist_id === nutritionistId &&
            other.status === "pending" &&
            other.starts_at < request.ends_at &&
            request.starts_at < other.ends_at
          )
            other.status = "rejected";
        }
      } else request.status = "rejected";
      return structuredClone(request);
    },
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
      if (!input.date) fields.date = ["Choose a date."];
      if (!input.time) fields.time = ["Choose a time."];
      let startsAt: Date | null = null;
      if (person && input.date && input.time) {
        const slot = resolveLocalSlot(input.date, input.time, person.time_zone);
        if (slot.kind === "invalid_date")
          fields.date = ["Choose a valid date."];
        if (slot.kind === "invalid_time")
          fields.time = ["Choose a valid time."];
        if (slot.kind === "nonexistent_time")
          fields.time = [
            "This local time does not exist. Choose another time.",
          ];
        if (slot.kind === "ambiguous_time")
          fields.time = ["This local time occurs twice. Choose another time."];
        if (slot.kind === "valid") {
          startsAt = slot.startsAt;
          if (startsAt.getTime() <= Date.now())
            fields.date = ["Choose a future date and time."];
        }
      }
      if (!startsAt && !Object.keys(fields).length)
        fields.time = ["Choose a valid time."];
      if (Object.keys(fields).length || !startsAt || !service || !person)
        throw new ApiRequestError(
          "Please correct the highlighted fields.",
          fields,
        );

      const email = input.guest.email.trim().toLocaleLowerCase();
      for (const request of requests) {
        if (request.guest.email === email && request.status === "pending")
          request.status = "superseded";
      }
      const request: AppointmentRequest = {
        id: crypto.randomUUID(),
        nutritionist_id: person.id,
        service: structuredClone(service),
        guest: { name: input.guest.name.trim(), email },
        starts_at: startsAt.toISOString(),
        ends_at: new Date(
          startsAt.getTime() + service.duration_minutes * 60_000,
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
              service.modality === "online" ||
              normalize(service.city ?? "") === normalize(effectiveLocation),
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
        items: structuredClone(
          matches.slice((page - 1) * pageSize, page * pageSize),
        ),
        meta: {
          page,
          total_pages: Math.max(1, Math.ceil(matches.length / pageSize)),
          effective_location: effectiveLocation,
        },
      };
    },
  };
}
