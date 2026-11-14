import { describe, expect, it } from "vitest";

import { resolveLocalSlot } from "./localSlot";

describe("resolveLocalSlot", () => {
  it("converts valid Lisbon local slots to UTC across daylight saving changes", () => {
    const winter = resolveLocalSlot("2027-02-01", "10:30", "Europe/Lisbon");
    const summer = resolveLocalSlot("2027-06-01", "10:30", "Europe/Lisbon");
    expect(winter.kind).toBe("valid");
    expect(summer.kind).toBe("valid");
    if (winter.kind === "valid")
      expect(winter.startsAt.toISOString()).toBe("2027-02-01T10:30:00.000Z");
    if (summer.kind === "valid")
      expect(summer.startsAt.toISOString()).toBe("2027-06-01T09:30:00.000Z");
  });

  it("distinguishes invalid dates, gaps, and repeated local times", () => {
    expect(resolveLocalSlot("2027-02-30", "10:00", "Europe/Lisbon")).toEqual({
      kind: "invalid_date",
    });
    expect(resolveLocalSlot("2027-03-28", "01:30", "Europe/Lisbon")).toEqual({
      kind: "nonexistent_time",
    });
    expect(resolveLocalSlot("2027-10-31", "01:30", "Europe/Lisbon")).toEqual({
      kind: "ambiguous_time",
    });
    expect(resolveLocalSlot("2027-06-01", "24:00", "Europe/Lisbon")).toEqual({
      kind: "invalid_time",
    });
  });
});
