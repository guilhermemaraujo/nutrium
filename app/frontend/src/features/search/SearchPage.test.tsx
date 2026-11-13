import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { api, createMockApi } from "@/api/client";
import { type SearchResponse } from "@/api/types";

import { SearchPage } from "./SearchPage";

function renderSearch(firstResponse?: Promise<SearchResponse>) {
  const mockApi = createMockApi(0);
  const search = vi.spyOn(api, "search").mockImplementation(mockApi.search);
  if (firstResponse) search.mockImplementationOnce(() => firstResponse);

  render(
    <MemoryRouter>
      <SearchPage />
    </MemoryRouter>,
  );

  return { mockApi, search };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("guest search", () => {
  it("shows loading then results in Braga when no location is entered", async () => {
    let resolveSearch!: (response: SearchResponse) => void;
    const pending = new Promise<SearchResponse>((resolve) => {
      resolveSearch = resolve;
    });
    const { mockApi } = renderSearch(pending);

    expect(screen.getByRole("status").textContent).toContain(
      "Loading nutritionists",
    );
    expect(screen.queryByRole("heading", { name: "Mary Jane" })).toBeNull();

    await act(async () => {
      resolveSearch(await mockApi.search("", "", 1));
    });

    screen.getByRole("heading", { name: "Mary Jane" });
    screen.getByText("Showing services in Braga");
    expect(screen.getAllByRole("article")).toHaveLength(4);
  });

  it("filters by nutritionist name", async () => {
    const user = userEvent.setup();
    const { mockApi, search } = renderSearch();
    await screen.findByRole("heading", { name: "Mary Jane" });
    let resolveSearch!: (response: SearchResponse) => void;
    search.mockImplementationOnce(
      () =>
        new Promise<SearchResponse>((resolve) => {
          resolveSearch = resolve;
        }),
    );

    await user.type(
      screen.getByRole("textbox", { name: "Name or service" }),
      "Mary",
    );
    await user.keyboard("{Enter}");

    expect(screen.getByRole("status").textContent).toContain(
      "Loading nutritionists",
    );
    expect(screen.queryByRole("heading", { name: "Mary Jane" })).toBeNull();
    await act(async () => {
      resolveSearch(await mockApi.search("Mary", "", 1));
    });

    await screen.findByText("Page 1 of 1");
    screen.getByRole("heading", { name: "Mary Jane" });
    expect(screen.queryByRole("heading", { name: "Ana Costa" })).toBeNull();
  });

  it("finds a service in a known city", async () => {
    const user = userEvent.setup();
    renderSearch();
    await screen.findByRole("heading", { name: "Mary Jane" });

    await user.type(
      screen.getByRole("textbox", { name: "Name or service" }),
      "Online consultation",
    );
    await user.type(screen.getByRole("textbox", { name: "Location" }), "Porto");
    await user.click(screen.getByRole("button", { name: "Search" }));

    await screen.findByText("Showing services in Porto");
    screen.getByRole("heading", { name: "Ana Costa" });
    expect(screen.queryByRole("heading", { name: "Mary Jane" })).toBeNull();
  });

  it("falls back to Braga for an unknown city", async () => {
    const user = userEvent.setup();
    renderSearch();
    await screen.findByRole("heading", { name: "Mary Jane" });

    await user.type(
      screen.getByRole("textbox", { name: "Name or service" }),
      "sports",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Location" }),
      "Nowhere",
    );
    await user.click(screen.getByRole("button", { name: "Search" }));

    await screen.findByText(/Location “Nowhere” was not found/);
    screen.getByText("Showing services in Braga");
    screen.getByRole("heading", { name: "Beatriz Silva" });
    expect(screen.queryByRole("heading", { name: "Mary Jane" })).toBeNull();
  });

  it("shows an empty state for a search with no matches", async () => {
    const user = userEvent.setup();
    renderSearch();
    await screen.findByRole("heading", { name: "Mary Jane" });

    await user.type(
      screen.getByRole("textbox", { name: "Name or service" }),
      "unknown",
    );
    await user.click(screen.getByRole("button", { name: "Search" }));

    await screen.findByText("No nutritionists found");
    expect(screen.queryAllByRole("article")).toHaveLength(0);
  });

  it("moves between result pages", async () => {
    const user = userEvent.setup();
    renderSearch();
    await screen.findByRole("heading", { name: "Mary Jane" });

    const previous = () => screen.getByRole("button", { name: "Previous" });
    const next = () => screen.getByRole("button", { name: "Next" });
    expect(previous()).toHaveProperty("disabled", true);

    await user.click(next());
    await screen.findByRole("heading", { name: "Sofia Martins" });
    expect(next()).toHaveProperty("disabled", true);
    expect(previous()).toHaveProperty("disabled", false);

    await user.click(previous());
    await screen.findByRole("heading", { name: "Mary Jane" });
  });

  it("resets to page one for a new search", async () => {
    const user = userEvent.setup();
    renderSearch();
    await screen.findByText("Page 1 of 2");

    await user.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("Page 2 of 2");

    await user.click(screen.getByRole("textbox", { name: "Name or service" }));
    await user.paste("Mary");
    await user.click(screen.getByRole("button", { name: "Search" }));

    await screen.findByText("Page 1 of 1");
    screen.getByRole("heading", { name: "Mary Jane" });
    expect(
      screen.queryByRole("navigation", { name: "Search pages" }),
    ).toBeNull();
  });

  it("retries the same submitted search after an error", async () => {
    const user = userEvent.setup();
    const { search } = renderSearch();
    await screen.findByRole("heading", { name: "Mary Jane" });

    await user.type(
      screen.getByRole("textbox", { name: "Name or service" }),
      "Online consultation",
    );
    await user.type(screen.getByRole("textbox", { name: "Location" }), "Porto");
    search.mockRejectedValueOnce(new Error("offline"));
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Search failed",
    );
    const location = screen.getByRole("textbox", { name: "Location" });
    await user.clear(location);
    await user.type(location, "Braga");
    await user.click(screen.getByRole("button", { name: "Retry" }));

    await screen.findByText("Showing services in Porto");
    screen.getByRole("heading", { name: "Ana Costa" });
    expect(
      search.mock.calls.slice(-2).map(([query, location, page]) => ({
        query,
        location,
        page,
      })),
    ).toEqual([
      { query: "Online consultation", location: "Porto", page: 1 },
      { query: "Online consultation", location: "Porto", page: 1 },
    ]);
  });
});
