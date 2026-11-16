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
    within(card).getByText("Dietitian · DEMO-REG-001");
    within(card).getByText("In-person appointment");
    within(card).getByText("Rua do Souto 12");
    within(card).getByText("Braga");
    within(card).getByText(/FOLLOW-UP/);

    const serviceSelect = within(card).getByRole("combobox", {
      name: "Service for Mary Jane",
    });
    expect(serviceSelect).toHaveProperty("value", "1");
    within(serviceSelect).getByRole("option", {
      name: "Follow-up · In person",
    });
    within(card).getByText("€25.00 · 60 min");
    expect(
      within(card).getByRole("button", { name: "Schedule appointment" }),
    ).toHaveProperty("disabled", false);
    expect(
      within(card).getByRole("button", { name: "Website" }),
    ).toHaveProperty("disabled", true);
  });

  it("updates price, duration, and location when a service is selected", async () => {
    const user = userEvent.setup();
    const person = createMockNutritionists()[0];
    person.services.find((service) => service.id === 2)!.address =
      "Rua de Santa Cruz 9";
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

  it("updates the consultation modality with the selected service", async () => {
    const user = userEvent.setup();
    render(
      <NutritionistCard
        person={createMockNutritionists()[1]}
        onBook={vi.fn()}
      />,
    );
    const card = screen.getByRole("article");
    within(card).getByText("In-person appointment");
    await user.selectOptions(
      within(card).getByRole("combobox", { name: "Service for Ana Costa" }),
      "4",
    );
    within(card).getByText("Online appointment");
    expect(within(card).queryByText("In-person appointment")).toBeNull();
  });

  it("shows an informational follow-up badge only for listed follow-up services", () => {
    const people = createMockNutritionists();
    const { rerender } = render(
      <NutritionistCard person={people[1]} onBook={vi.fn()} />,
    );
    expect(screen.queryByText(/FOLLOW-UP/)).toBeNull();
    expect(screen.queryByText("NUTRITIONIST")).toBeNull();

    rerender(<NutritionistCard person={people[2]} onBook={vi.fn()} />);
    expect(screen.getByText(/FOLLOW-UP/).tagName).toBe("SPAN");
    expect(screen.queryByRole("button", { name: /FOLLOW-UP/ })).toBeNull();
  });
});
