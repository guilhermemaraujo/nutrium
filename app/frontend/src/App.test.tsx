import { MemoryRouter } from "react-router";
import { afterEach, describe, it } from "vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { App } from "./App";

afterEach(cleanup);

describe("guest search routes", () => {
  it("routes unknown paths to the not-found page and navigates home", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/requests"]}>
        <App />
      </MemoryRouter>,
    );
    screen.getByRole("heading", { name: "Page not found" });
    await user.click(screen.getByRole("link", { name: "Back to search" }));
    screen.getByRole("heading", { name: "Find your nutritionist" });
  });
});
