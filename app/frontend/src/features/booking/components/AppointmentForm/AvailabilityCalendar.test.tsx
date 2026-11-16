import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AvailabilityCalendar } from "./AvailabilityCalendar";

afterEach(cleanup);

describe("availability calendar", () => {
  it("disables past and unavailable dates while allowing keyboard selection", async () => {
    const user = userEvent.setup();
    const onDateSelect = vi.fn();
    render(
      <AvailabilityCalendar
        timeZone="Europe/Lisbon"
        month="2099-06"
        minDate="2099-06-22"
        selectedDate=""
        availability={{
          status: "success",
          dates: ["2099-06-22", "2099-06-24"],
          retry: vi.fn(),
        }}
        onMonthChange={vi.fn()}
        onDateSelect={onDateSelect}
      />,
    );
    expect(
      screen.getByRole("button", { name: /June 21.*2099/ }),
    ).toHaveProperty("disabled", true);
    expect(
      screen.getByRole("button", { name: /June 23.*2099/ }),
    ).toHaveProperty("disabled", true);
    const available = screen.getByRole("button", { name: /June 22.*2099/ });
    expect(available).toHaveProperty("disabled", false);
    available.focus();
    await user.keyboard("{Enter}");
    expect(onDateSelect).toHaveBeenCalledWith("2099-06-22");
  });

  it("keeps dates disabled while loading or when the month is empty", () => {
    const props = {
      timeZone: "Europe/Lisbon",
      month: "2099-06",
      minDate: "2099-06-01",
      selectedDate: "",
      onMonthChange: vi.fn(),
      onDateSelect: vi.fn(),
    };
    const { rerender } = render(
      <AvailabilityCalendar
        {...props}
        availability={{ status: "loading", dates: [], retry: vi.fn() }}
      />,
    );
    expect(
      screen.getByRole("button", { name: /June 22.*2099/ }),
    ).toHaveProperty("disabled", true);
    screen.getByText("Loading available dates…");
    expect(
      screen
        .getByRole("button", { name: /June 22.*2099/ })
        .closest("[aria-busy]")
        ?.getAttribute("aria-busy"),
    ).toBe("true");
    rerender(
      <AvailabilityCalendar
        {...props}
        availability={{ status: "success", dates: [], retry: vi.fn() }}
      />,
    );
    screen.getByText("No available dates this month. Try another month.");
    expect(props.onDateSelect).not.toHaveBeenCalled();
  });
});
