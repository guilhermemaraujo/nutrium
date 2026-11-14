import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { api, createMockApi } from "@/api/client";
import type {
  AppointmentRequest,
  AppointmentRequestListResponse,
  NutritionistOption,
} from "@/api/types";

import { RequestsPage } from "./RequestsPage";

function setupApi() {
  const mock = createMockApi(0);
  vi.spyOn(api, "listNutritionists").mockImplementation(mock.listNutritionists);
  vi.spyOn(api, "listAppointmentRequests").mockImplementation(
    mock.listAppointmentRequests,
  );
  vi.spyOn(api, "decideAppointmentRequest").mockImplementation(
    mock.decideAppointmentRequest,
  );
  return mock;
}

function renderPage() {
  render(
    <MemoryRouter>
      <RequestsPage />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("nutritionist requests dashboard", () => {
  it("loads the selector and shows each nutritionist's pending requests with local slot details", async () => {
    const user = userEvent.setup();
    let resolvePeople!: (people: NutritionistOption[]) => void;
    const mock = setupApi();
    vi.mocked(api.listNutritionists).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePeople = resolve;
        }),
    );
    renderPage();
    expect(screen.getByRole("status").textContent).toContain(
      "Loading nutritionists",
    );
    await act(async () => {
      resolvePeople(await mock.listNutritionists());
    });
    const selector = await screen.findByRole("combobox", {
      name: "View requests for",
    });
    expect(selector).toHaveProperty("value", "1");
    const alex = await screen.findByRole("heading", { name: "Alex Morgan" });
    const card = alex.closest("article")!;
    within(card).getByText("First appointment");
    within(card).getByText("In-person appointment");
    within(card).getByText("20 June 2099");
    within(card).getByText("10:00");
    await user.selectOptions(selector, "2");
    await screen.findByRole("heading", { name: "Casey Lee" });
    const jordan = await screen.findByRole("heading", { name: "Jordan Reed" });
    within(jordan.closest("article")!).getByText("Online appointment");
    within(jordan.closest("article")!).getByText("Online consultation");
    expect(screen.queryByRole("heading", { name: "Alex Morgan" })).toBeNull();
  });

  it("accepts a request, removes overlapping pending requests, and shows feedback", async () => {
    const user = userEvent.setup();
    const mock = setupApi();
    renderPage();
    const alex = await screen.findByRole("heading", { name: "Alex Morgan" });
    const alexId = (await mock.listAppointmentRequests(1)).items[0].id;
    await user.click(
      within(alex.closest("article")!).getByRole("button", { name: "Accept" }),
    );
    await screen.findByText("Alex Morgan's request accepted.");
    await screen.findByRole("heading", { name: "Robin Park" });
    screen.getByRole("heading", { name: "Drew Miller" });
    expect(screen.queryByRole("heading", { name: "Sam Taylor" })).toBeNull();
    expect(api.decideAppointmentRequest).toHaveBeenCalledWith(1, alexId, {
      decision: "accept",
    });
  });

  it("rejects one request and keeps other pending requests", async () => {
    const user = userEvent.setup();
    setupApi();
    renderPage();
    const alex = await screen.findByRole("heading", { name: "Alex Morgan" });
    await user.click(
      within(alex.closest("article")!).getByRole("button", { name: "Reject" }),
    );
    await screen.findByText("Alex Morgan's request rejected.");
    await screen.findByRole("heading", { name: "Robin Park" });
    expect(screen.queryByRole("heading", { name: "Alex Morgan" })).toBeNull();
    screen.getByRole("heading", { name: "Sam Taylor" });
  });

  it("shows a decision error, keeps the card, and permits retry", async () => {
    const user = userEvent.setup();
    setupApi();
    renderPage();
    const alex = await screen.findByRole("heading", { name: "Alex Morgan" });
    const card = alex.closest("article")!;
    vi.mocked(api.decideAppointmentRequest).mockRejectedValueOnce(
      new Error("Request changed. Refresh and try again."),
    );
    await user.click(within(card).getByRole("button", { name: "Accept" }));
    expect((await within(card).findByRole("alert")).textContent).toContain(
      "Request changed",
    );
    await user.click(within(card).getByRole("button", { name: "Accept" }));
    await screen.findByRole("heading", { name: "Robin Park" });
    expect(screen.queryByRole("heading", { name: "Sam Taylor" })).toBeNull();
    screen.getByRole("heading", { name: "Drew Miller" });
  });

  it("paginates pending cards and resets to the first page on selection", async () => {
    const user = userEvent.setup();
    setupApi();
    renderPage();
    await screen.findByRole("heading", { name: "Alex Morgan" });
    const next = screen.getByRole("button", { name: "Next requests" });
    expect(
      screen.getByRole("button", { name: "Previous requests" }),
    ).toHaveProperty("disabled", true);
    await user.click(next);
    await screen.findByRole("heading", { name: "Robin Park" });
    expect(screen.queryByRole("heading", { name: "Alex Morgan" })).toBeNull();
    expect(next).toHaveProperty("disabled", true);
    await user.selectOptions(
      screen.getByRole("combobox", { name: "View requests for" }),
      "2",
    );
    await screen.findByRole("heading", { name: "Casey Lee" });
    expect(
      screen.queryByRole("navigation", { name: "Request pages" }),
    ).toBeNull();
  });

  it("keeps the current page when a decision leaves that page available", async () => {
    const user = userEvent.setup();
    const mock = setupApi();
    await mock.createAppointmentRequest({
      service_id: 1,
      guest: { name: "New Guest", email: "new@example.com" },
      date: "2099-07-01",
      time: "10:00",
    });
    renderPage();
    await screen.findByRole("heading", { name: "Alex Morgan" });
    await user.click(screen.getByRole("button", { name: "Next requests" }));
    const robin = await screen.findByRole("heading", { name: "Robin Park" });
    await user.click(
      within(robin.closest("article")!).getByRole("button", { name: "Reject" }),
    );
    await screen.findByText("Robin Park's request rejected.");
    screen.getByRole("heading", { name: "New Guest" });
    expect(screen.queryByRole("heading", { name: "Alex Morgan" })).toBeNull();
    expect(screen.getByText("2 of 2")).toBeTruthy();
  });

  it("returns to the available page when a decision empties the last page", async () => {
    const user = userEvent.setup();
    const mock = setupApi();
    renderPage();
    await screen.findByRole("heading", { name: "Alex Morgan" });
    await user.click(screen.getByRole("button", { name: "Next requests" }));
    const robin = await screen.findByRole("heading", { name: "Robin Park" });
    await user.click(
      within(robin.closest("article")!).getByRole("button", { name: "Reject" }),
    );
    await screen.findByRole("heading", { name: "Alex Morgan" });
    expect(
      screen.queryByRole("navigation", { name: "Request pages" }),
    ).toBeNull();

    await mock.createAppointmentRequest({
      service_id: 1,
      guest: { name: "New Guest One", email: "new-one@example.com" },
      date: "2099-07-01",
      time: "10:00",
    });
    await mock.createAppointmentRequest({
      service_id: 1,
      guest: { name: "New Guest Two", email: "new-two@example.com" },
      date: "2099-07-01",
      time: "11:00",
    });
    const alex = screen.getByRole("heading", { name: "Alex Morgan" });
    await user.click(
      within(alex.closest("article")!).getByRole("button", { name: "Reject" }),
    );
    await screen.findByRole("heading", { name: "New Guest One" });
    screen.getByRole("heading", { name: "Sam Taylor" });
    expect(
      screen.getByRole("button", { name: "Previous requests" }),
    ).toHaveProperty("disabled", true);
    expect(
      screen.getByRole("button", { name: "Next requests" }),
    ).toHaveProperty("disabled", false);
  });

  it("shows a request loading error and retries the selected nutritionist", async () => {
    const user = userEvent.setup();
    setupApi();
    vi.mocked(api.listAppointmentRequests).mockRejectedValueOnce(
      new Error("offline"),
    );
    renderPage();
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Could not load pending requests",
    );
    await user.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByRole("heading", { name: "Alex Morgan" });
  });

  it("shows an empty state when no requests are pending", async () => {
    setupApi();
    vi.mocked(api.listAppointmentRequests).mockResolvedValue({
      items: [],
    } satisfies AppointmentRequestListResponse);
    renderPage();
    await screen.findByText("No pending requests");
  });

  it("shows a nutritionist loading error and retries", async () => {
    const user = userEvent.setup();
    setupApi();
    vi.mocked(api.listNutritionists).mockRejectedValueOnce(
      new Error("offline"),
    );
    renderPage();
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Could not load nutritionists",
    );
    await user.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByRole("combobox", { name: "View requests for" });
  });

  it("shows an empty professional state without a lingering loading indicator", async () => {
    setupApi();
    vi.mocked(api.listNutritionists).mockResolvedValueOnce([]);
    renderPage();
    await screen.findByText("No nutritionists are available.");
    expect(screen.queryByRole("status")).toBeNull();
    expect(
      screen.queryByRole("combobox", { name: "View requests for" }),
    ).toBeNull();
  });

  it("ignores a late request list response after switching professionals", async () => {
    const user = userEvent.setup();
    const mock = setupApi();
    let resolveMary!: (result: AppointmentRequestListResponse) => void;
    vi.mocked(api.listAppointmentRequests).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveMary = resolve;
        }),
    );
    renderPage();
    const selector = await screen.findByRole("combobox", {
      name: "View requests for",
    });
    await user.selectOptions(selector, "2");
    await screen.findByRole("heading", { name: "Casey Lee" });
    await act(async () => {
      resolveMary(await mock.listAppointmentRequests(1));
    });
    screen.getByRole("heading", { name: "Casey Lee" });
    expect(screen.queryByRole("heading", { name: "Alex Morgan" })).toBeNull();
  });

  it("disables switching and further decisions while a decision is pending", async () => {
    const user = userEvent.setup();
    const mock = setupApi();
    const alexId = (await mock.listAppointmentRequests(1)).items[0].id;
    let resolveDecision!: (result: AppointmentRequest) => void;
    vi.mocked(api.decideAppointmentRequest).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveDecision = resolve;
        }),
    );
    renderPage();
    const alex = await screen.findByRole("heading", { name: "Alex Morgan" });
    await user.click(
      within(alex.closest("article")!).getByRole("button", { name: "Accept" }),
    );
    const selector = screen.getByRole("combobox", {
      name: "View requests for",
    });
    expect(selector).toHaveProperty("disabled", true);
    screen.getByText("Finish updating this request before switching.");
    const sam = screen.getByRole("heading", { name: "Sam Taylor" });
    const secondDecision = within(sam.closest("article")!).getByRole("button", {
      name: "Reject",
    });
    expect(secondDecision).toHaveProperty("disabled", true);
    await user.click(secondDecision);
    expect(api.decideAppointmentRequest).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveDecision(
        await mock.decideAppointmentRequest(1, alexId, { decision: "accept" }),
      );
    });
    await screen.findByRole("heading", { name: "Robin Park" });
    expect(selector).toHaveProperty("disabled", false);
  });

  it("keeps decision success separate from a failed list refresh", async () => {
    const user = userEvent.setup();
    setupApi();
    renderPage();
    const alex = await screen.findByRole("heading", { name: "Alex Morgan" });
    vi.mocked(api.listAppointmentRequests).mockRejectedValueOnce(
      new Error("offline"),
    );
    await user.click(
      within(alex.closest("article")!).getByRole("button", { name: "Accept" }),
    );
    await screen.findByText("Alex Morgan's request accepted.");
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Decision saved, but pending requests could not be refreshed.",
    );
    expect(screen.queryByRole("heading", { name: "Alex Morgan" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByRole("heading", { name: "Robin Park" });
    screen.getByText("Alex Morgan's request accepted.");
  });

  it("hides stale pending cards while refreshing after a saved decision", async () => {
    const user = userEvent.setup();
    const mock = setupApi();
    renderPage();
    const alex = await screen.findByRole("heading", { name: "Alex Morgan" });
    let resolveRefresh!: (result: AppointmentRequestListResponse) => void;
    vi.mocked(api.listAppointmentRequests).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRefresh = resolve;
        }),
    );
    await user.click(
      within(alex.closest("article")!).getByRole("button", { name: "Accept" }),
    );
    await screen.findByText("Loading pending requests…");
    expect(screen.queryByRole("heading", { name: "Alex Morgan" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Sam Taylor" })).toBeNull();
    await act(async () => {
      resolveRefresh(await mock.listAppointmentRequests(1));
    });
    await screen.findByRole("heading", { name: "Robin Park" });
  });
});
