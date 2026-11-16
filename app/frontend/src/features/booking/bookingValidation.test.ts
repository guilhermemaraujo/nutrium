import { describe, expect, it } from "vitest";

import { createMockNutritionists } from "@/mocks/fixtures";

import {
  futureSlots,
  nutritionistLocalDate,
  validateBooking,
} from "./bookingValidation";

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

  it("uses the professional's local date across a UTC midnight boundary", () => {
    const now = new Date("2027-07-01T00:30:00Z");
    expect(nutritionistLocalDate("Europe/Lisbon", now)).toBe("2027-07-01");
    expect(nutritionistLocalDate("America/New_York", now)).toBe("2027-06-30");
    const { person, booking } = setup();
    expect(
      validateBooking({ ...booking, date: "2027-06-30", time: "" }, person, now)
        .date,
    ).toBe("Choose a future local date.");
  });

  it("removes expired UTC instants from selectable slots", () => {
    const slots = [
      {
        date: "2027-07-01",
        time: "09:00",
        starts_at: "2027-07-01T08:00:00Z",
        ends_at: "2027-07-01T09:00:00Z",
      },
      {
        date: "2027-07-01",
        time: "09:30",
        starts_at: "2027-07-01T08:30:00Z",
        ends_at: "2027-07-01T09:30:00Z",
      },
    ];
    expect(futureSlots(slots, Date.parse("2027-07-01T08:00:00Z"))).toEqual([
      slots[1],
    ]);
  });
});
