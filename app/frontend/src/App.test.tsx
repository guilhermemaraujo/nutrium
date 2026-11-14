import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { App } from "./App";

afterEach(cleanup);

describe("guest search routes", () => {
  it("routes unknown paths to the not-found page and navigates home", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/missing"]}>
        <App />
      </MemoryRouter>,
    );
    screen.getByRole("heading", { name: "Page not found" });
    await user.click(screen.getByRole("link", { name: "Back to search" }));
    screen.getByRole("heading", { name: "Find your nutritionist" });
  });

  it("opens the requests dashboard from primary navigation", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    await user.click(
      screen.getByRole("link", {
        name: "Are you a nutrition professional? Get to know our software",
      }),
    );
    screen.getByRole("heading", { name: "Pending requests" });
  });

  it("shows only the logo link on the requests page and returns to search", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/requests"]}>
        <App />
      </MemoryRouter>,
    );
    expect(
      screen.queryByRole("link", {
        name: "Are you a nutrition professional? Get to know our software",
      }),
    ).toBeNull();
    expect(screen.queryByRole("link", { name: "Back to search" })).toBeNull();
    await user.click(screen.getByRole("link", { name: "Nutrium" }));
    screen.getByRole("heading", { name: "Find your nutritionist" });
  });
});
