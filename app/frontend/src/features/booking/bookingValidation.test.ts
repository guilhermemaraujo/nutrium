import { describe, expect, it } from "vitest";

import { createMockNutritionists } from "@/mocks/fixtures";

import { validateBooking } from "./bookingValidation";

describe("validateBooking", () => {
  function setup() {
    const person = createMockNutritionists()[0];
    return {
      person,
      booking: {
        service_id: person.services[0].id,
        name: "Guest",
        email: "guest@example.com",
        date: "2099-06-01",
        time: "10:30",
      },
    };
  }

  it("shows an actionable error for a daylight saving gap or overlap", () => {
    const { person, booking } = setup();
    expect(
      validateBooking({ ...booking, date: "2027-03-28", time: "01:30" }, person)
        .time,
    ).toMatch(/does not exist/);
    expect(
      validateBooking({ ...booking, date: "2027-10-31", time: "01:30" }, person)
        .time,
    ).toMatch(/occurs twice/);
  });

  it("rejects an impossible calendar date while allowing a valid future slot", () => {
    const { person, booking } = setup();
    expect(
      validateBooking({ ...booking, date: "2027-02-30" }, person).date,
    ).toBe("Choose a valid date.");
    expect(validateBooking(booking, person)).toEqual({});
  });
});
