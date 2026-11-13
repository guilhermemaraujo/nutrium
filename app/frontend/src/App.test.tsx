import { describe, expect, it } from "vitest";

import { render, screen } from "@testing-library/react";

import { App } from "./App";

describe("foundation app", () => {
  it("renders the React entry point", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { name: "Appointment requests" }),
    ).toBeTruthy();
  });
});
