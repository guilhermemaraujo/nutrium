import { afterEach, describe, expect, it, vi } from "vitest";

import { createMockApi, httpApi } from "./client";

afterEach(() => vi.unstubAllGlobals());

describe("mock search API", () => {
  it("gives each instance independent nutritionist data", async () => {
    const first = createMockApi(0);
    const second = createMockApi(0);

    const firstResult = await first.search("Mary", "Braga", 1);
    firstResult.items[0].name = "Changed";
    firstResult.items[0].services[0].name = "Changed";

    const secondResult = await second.search("Mary", "Braga", 1);
    expect(secondResult.items[0].name).toBe("Mary Jane");
    expect(secondResult.items[0].services[0].name).toBe("First appointment");
  });

  it("isolates search results from later reads in the same mock instance", async () => {
    const mock = createMockApi(0);
    const firstResult = await mock.search("Mary", "Braga", 1);
    firstResult.items[0].services[0].name = "Changed";
    firstResult.items[0].services[0].price_cents = 1;

    const secondResult = await mock.search("Mary", "Braga", 1);
    expect(secondResult.items[0].services[0]).toMatchObject({
      name: "First appointment",
      price_cents: 2500,
    });
  });

  it("rejects a cancelled delayed request", async () => {
    const controller = new AbortController();
    const request = createMockApi().search("", "", 1, controller.signal);

    controller.abort();

    await expect(request).rejects.toHaveProperty("name", "AbortError");
  });

  it("creates a pending request with the selected service and Lisbon local slot", async () => {
    const mock = createMockApi(0);
    const request = await mock.createAppointmentRequest({
      service_id: 2,
      guest: { name: "Alex Guest", email: "Alex@Example.com" },
      date: "2099-06-20",
      time: "14:30",
    });

    expect(request.status).toBe("pending");
    expect(request.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(request.service.id).toBe(2);
    expect(request.service.modality).toBe("in_person");
    expect(request.guest.email).toBe("alex@example.com");
    expect(request.starts_at).toBe("2099-06-20T13:30:00.000Z");
    expect(request.ends_at).toBe("2099-06-20T14:00:00.000Z");
    const another = await mock.createAppointmentRequest({
      service_id: 2,
      guest: { name: "Another Guest", email: "another@example.com" },
      date: "2099-06-21",
      time: "14:30",
    });
    expect(another.id).not.toBe(request.id);
    expect(another.id).not.toBe(
      (await mock.listAppointmentRequests(1)).items[0].id,
    );
  });
});

describe("mock requests API", () => {
  it("returns independent pending data and rejects overlapping requests on acceptance", async () => {
    const mock = createMockApi(0);
    const first = await mock.listAppointmentRequests(1);
    const firstId = first.items[0].id;
    const overlappingId = first.items[1].id;
    expect(firstId).toBe("00000000-0000-4000-8000-000000000001");
    first.items[0].guest.name = "Changed";
    expect((await mock.listAppointmentRequests(1)).items[0].guest.name).toBe(
      "Alex Morgan",
    );

    const accepted = await mock.decideAppointmentRequest(1, firstId, {
      decision: "accept",
    });
    expect(accepted.status).toBe("accepted");
    expect(
      (await mock.listAppointmentRequests(1)).items.map(
        (request) => request.guest.name,
      ),
    ).toEqual(["Drew Miller", "Robin Park"]);
    await expect(
      mock.decideAppointmentRequest(1, overlappingId, { decision: "accept" }),
    ).rejects.toThrow("no longer pending");
    expect((await mock.listAppointmentRequests(2)).items).toHaveLength(2);
  });

  it("preserves an accepted booking when a later pending request conflicts", async () => {
    const mock = createMockApi(0);
    const acceptedId = (await mock.listAppointmentRequests(1)).items[0].id;
    await mock.decideAppointmentRequest(1, acceptedId, { decision: "accept" });
    const conflicting = await mock.createAppointmentRequest({
      service_id: 2,
      guest: { name: "Late Guest", email: "late@example.com" },
      date: "2099-06-20",
      time: "10:30",
    });

    await expect(
      mock.decideAppointmentRequest(1, conflicting.id, { decision: "accept" }),
    ).rejects.toThrow("conflicts with an accepted appointment");
    expect(
      (await mock.listAppointmentRequests(1)).items.some(
        (request) => request.id === conflicting.id,
      ),
    ).toBe(true);
    await expect(
      mock.decideAppointmentRequest(1, acceptedId, { decision: "reject" }),
    ).rejects.toThrow("no longer pending");

    const adjacent = await mock.createAppointmentRequest({
      service_id: 2,
      guest: { name: "Adjacent Guest", email: "adjacent@example.com" },
      date: "2099-06-20",
      time: "11:00",
    });
    await expect(
      mock.decideAppointmentRequest(1, adjacent.id, { decision: "accept" }),
    ).resolves.toMatchObject({ status: "accepted" });
  });

  it("rejects impossible and ambiguous local slots before superseding a request", async () => {
    const mock = createMockApi(0);
    const guest = { name: "Alex Morgan", email: "alex@example.com" };
    for (const [date, time, field] of [
      ["2099-02-30", "10:00", "date"],
      ["2027-03-28", "01:30", "time"],
      ["2027-10-31", "01:30", "time"],
    ] as const) {
      await expect(
        mock.createAppointmentRequest({ service_id: 1, guest, date, time }),
      ).rejects.toMatchObject({ fields: { [field]: [expect.any(String)] } });
    }
    expect(
      (await mock.listAppointmentRequests(1)).items.some(
        (request) => request.guest.email === guest.email,
      ),
    ).toBe(true);
  });
});

describe("mock availability API", () => {
  it("returns local half-hour starts and UTC instants without blocking pending requests", async () => {
    const mock = createMockApi(0);
    const result = await mock.listAvailableSlots(1, 1, "2099-06-22");

    expect(result).toMatchObject({
      time_zone: "Europe/Lisbon",
      date: "2099-06-22",
    });
    expect(result.items[0]).toEqual({
      date: "2099-06-22",
      time: "09:00",
      starts_at: "2099-06-22T08:00:00.000Z",
      ends_at: "2099-06-22T09:00:00.000Z",
    });
    expect(result.items.map((slot) => slot.time)).toContain("10:00");
    expect(
      result.items.every(
        (slot) => slot.time.endsWith(":00") || slot.time.endsWith(":30"),
      ),
    ).toBe(true);

    result.items[0].time = "changed";
    expect(
      (await mock.listAvailableSlots(1, 1, "2099-06-22")).items[0].time,
    ).toBe("09:00");

    const fortyFiveMinuteSlots = await mock.listAvailableSlots(
      2,
      3,
      "2099-06-22",
    );
    expect(
      fortyFiveMinuteSlots.items.slice(0, 2).map((slot) => slot.time),
    ).toEqual(["09:00", "09:30"]);
  });

  it("excludes accepted overlaps across services while keeping adjacent slots", async () => {
    const mock = createMockApi(0);
    const mondayRequest = (await mock.listAppointmentRequests(1)).items.find(
      (request) => request.starts_at.startsWith("2099-06-22"),
    )!;
    await mock.decideAppointmentRequest(1, mondayRequest.id, {
      decision: "accept",
    });

    const times = (await mock.listAvailableSlots(1, 2, "2099-06-22")).items.map(
      (slot) => slot.time,
    );
    expect(times).toContain("09:30");
    expect(times).not.toContain("10:00");
    expect(times).not.toContain("10:30");
    expect(times).toContain("11:00");
  });

  it("rejects invalid service or date and returns no weekend slots", async () => {
    const mock = createMockApi(0);
    await expect(
      mock.listAvailableSlots(1, 999, "2099-06-22"),
    ).rejects.toMatchObject({
      fields: { service_id: ["Choose a valid service."] },
    });
    await expect(
      mock.listAvailableSlots(1, 1, "2099-02-30"),
    ).rejects.toMatchObject({
      fields: { date: ["Choose a valid date."] },
    });
    await expect(
      mock.listAvailableSlots(1, 1, "2099-06-20"),
    ).resolves.toMatchObject({
      items: [],
    });
  });
});

describe("HTTP requests API", () => {
  it("requests available slots with the service, local date, and abort signal", async () => {
    const slots = {
      time_zone: "Europe/Lisbon",
      date: "2099-06-22",
      items: [
        {
          date: "2099-06-22",
          time: "09:00",
          starts_at: "2099-06-22T08:00:00Z",
          ends_at: "2099-06-22T08:45:00Z",
        },
      ],
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => slots,
    });
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();

    await expect(
      httpApi.listAvailableSlots(1, 3, "2099-06-22", controller.signal),
    ).resolves.toEqual(slots);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/nutritionists/1/available_slots?service_id=3&date=2099-06-22",
      { headers: { Accept: "application/json" }, signal: controller.signal },
    );
  });

  it("loads unfiltered professional options from a dedicated endpoint", async () => {
    const options = [
      { id: 1, name: "Mary Jane", time_zone: "Europe/Lisbon" },
      { id: 9, name: "Porto Professional", time_zone: "Europe/Lisbon" },
    ];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: options }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();

    await expect(httpApi.listNutritionists(controller.signal)).resolves.toEqual(
      options,
    );
    expect(fetchMock).toHaveBeenCalledWith("/api/nutritionists/options", {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
  });

  it("uses a request UUID in the decision URL", async () => {
    const request = (await createMockApi(0).listAppointmentRequests(1))
      .items[0];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ...request, status: "accepted" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await httpApi.decideAppointmentRequest(1, request.id, {
      decision: "accept",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/nutritionists/1/appointment_requests/${request.id}`,
      {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ decision: "accept" }),
      },
    );
  });

  it("preserves server field errors and handles a non-JSON error response", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({
            error: "Invalid booking",
            fields: { time: ["Choose another time."] },
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => {
            throw new SyntaxError("Not JSON");
          },
        }),
    );
    await expect(
      httpApi.createAppointmentRequest({
        service_id: 1,
        guest: { name: "Guest", email: "guest@example.com" },
        date: "2099-06-20",
        time: "10:00",
      }),
    ).rejects.toMatchObject({
      message: "Invalid booking",
      fields: { time: ["Choose another time."] },
    });
    await expect(httpApi.listNutritionists()).rejects.toThrow(
      "Could not load nutritionists.",
    );
  });
});
