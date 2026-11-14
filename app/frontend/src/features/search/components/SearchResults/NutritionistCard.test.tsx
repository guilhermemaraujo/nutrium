import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { createMockNutritionists } from "@/mocks/fixtures";

import { NutritionistCard } from "./NutritionistCard";

afterEach(cleanup);

describe("nutritionist card", () => {
  it("shows professional details, location, and the selected service", () => {
    render(
      <NutritionistCard
        person={createMockNutritionists()[0]}
        onBook={vi.fn()}
      />,
    );

    const card = screen.getByRole("article");
    within(card).getByRole("heading", { name: "Mary Jane" });
    within(card).getByText("Dietitian · 2963N");
    within(card).getByText("Online Follow-up");
    within(card).getByText("Rua do Souto 12");
    within(card).getByText("Braga");

    const serviceSelect = within(card).getByRole("combobox", {
      name: "Service for Mary Jane",
    });
    expect(serviceSelect).toHaveProperty("value", "1");
    within(serviceSelect).getByRole("option", { name: "Follow-up" });
    within(card).getByText("€25.00 · 60 min");
    expect(
      within(card).getByRole("button", { name: "Schedule appointment" }),
    ).toHaveProperty("disabled", false);
    within(card).getByRole("button", { name: "Website" });
  });

  it("updates price, duration, and location when a service is selected", async () => {
    const user = userEvent.setup();
    const person = createMockNutritionists()[0];
    person.services[1].address = "Rua de Santa Cruz 9";
    const onBook = vi.fn();
    render(<NutritionistCard person={person} onBook={onBook} />);

    const card = screen.getByRole("article");
    const serviceSelect = within(card).getByRole("combobox", {
      name: "Service for Mary Jane",
    });
    await user.selectOptions(serviceSelect, "2");

    expect(serviceSelect).toHaveProperty("value", "2");
    within(card).getByText("€18.00 · 30 min");
    within(card).getByText("Rua de Santa Cruz 9");
    expect(within(card).queryByText("€25.00 · 60 min")).toBeNull();
    expect(within(card).queryByText("Rua do Souto 12")).toBeNull();
    await user.click(
      within(card).getByRole("button", { name: "Schedule appointment" }),
    );
    expect(onBook).toHaveBeenCalledWith(person, 2);
  });
});
