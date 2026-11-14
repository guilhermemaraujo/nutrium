import { describe, expect, it } from "vitest";

import { createMockApi } from "./client";

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

  it("rejects a cancelled delayed request", async () => {
    const controller = new AbortController();
    const request = createMockApi().search("", "", 1, controller.signal);

    controller.abort();

    await expect(request).rejects.toHaveProperty("name", "AbortError");
  });

  it("creates a pending request with the selected service and Lisbon local slot", async () => {
    const request = await createMockApi(0).createAppointmentRequest({
      service_id: 2,
      guest: { name: "Alex Guest", email: "Alex@Example.com" },
      date: "2099-06-20",
      time: "14:30",
    });

    expect(request.status).toBe("pending");
    expect(request.service.id).toBe(2);
    expect(request.guest.email).toBe("alex@example.com");
    expect(request.starts_at).toBe("2099-06-20T13:30:00.000Z");
    expect(request.ends_at).toBe("2099-06-20T14:00:00.000Z");
  });
});
