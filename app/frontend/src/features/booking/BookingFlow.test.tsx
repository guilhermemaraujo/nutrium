import { MemoryRouter } from "react-router";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { api, ApiRequestError, createMockApi } from "@/api/client";
import type {
  AppointmentRequest,
  AvailableDatesResponse,
  AvailableSlotsResponse,
} from "@/api/types";
import { SearchPage } from "@/features/search";

const originalShowModal = HTMLDialogElement.prototype.showModal;
const originalClose = HTMLDialogElement.prototype.close;

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
    this.querySelector("select")?.focus();
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});

afterAll(() => {
  if (originalShowModal)
    HTMLDialogElement.prototype.showModal = originalShowModal;
  else Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
  if (originalClose) HTMLDialogElement.prototype.close = originalClose;
  else Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
});

function renderPage() {
  const mock = createMockApi(0);
  vi.spyOn(api, "search").mockImplementation(mock.search);
  vi.spyOn(api, "listAvailableDates").mockImplementation(
    mock.listAvailableDates,
  );
  vi.spyOn(api, "listAvailableSlots").mockImplementation(
    mock.listAvailableSlots,
  );
  vi.spyOn(api, "createAppointmentRequest").mockImplementation(
    mock.createAppointmentRequest,
  );
  render(
    <MemoryRouter>
      <SearchPage />
    </MemoryRouter>,
  );
}

async function openMary() {
  const user = userEvent.setup();
  const heading = await screen.findByRole("heading", { name: "Mary Jane" });
  const card = heading.closest("article")!;
  await user.selectOptions(
    within(card).getByRole("combobox", { name: "Service for Mary Jane" }),
    "2",
  );
  await user.click(
    within(card).getByRole("button", { name: "Schedule appointment" }),
  );
  return { user, dialog: screen.getByRole("dialog") };
}

async function chooseJune22(
  user: ReturnType<typeof userEvent.setup>,
  dialog: HTMLElement,
  time = "09:00",
) {
  await user.selectOptions(
    within(dialog).getByRole("combobox", { name: "Choose the Year" }),
    "2099",
  );
  await user.selectOptions(
    within(dialog).getByRole("combobox", { name: "Choose the Month" }),
    "5",
  );
  await clickJune22(user, dialog);
  await within(dialog).findByRole("option", { name: time });
  await user.selectOptions(
    within(dialog).getByRole("combobox", { name: "Available time" }),
    time,
  );
}

async function clickJune22(
  user: ReturnType<typeof userEvent.setup>,
  dialog: HTMLElement,
) {
  const day = await within(dialog).findByRole("button", {
    name: /June 22.*2099/,
  });
  await waitFor(() => expect(day).toHaveProperty("disabled", false));
  await user.click(day);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("guest booking flow", () => {
  it("prefills the card service, allows a change, and submits a pending request", async () => {
    renderPage();
    const { user, dialog } = await openMary();
    const service = within(dialog).getByRole("combobox", { name: /Service/ });
    const time = within(dialog).getByRole("combobox", {
      name: "Available time",
    });
    expect(service).toHaveProperty("value", "2");
    expect(time).toHaveProperty("disabled", true);
    expect(time.className).toContain("opacity-50");
    within(dialog).getByRole("option", { name: "Choose a date first" });
    await user.selectOptions(service, "1");
    await user.type(
      within(dialog).getByRole("textbox", { name: "Your name" }),
      "Alex Guest",
    );
    await user.type(
      within(dialog).getByRole("textbox", { name: "Email" }),
      "alex@example.com",
    );
    await chooseJune22(user, dialog);
    expect(time).toHaveProperty("disabled", false);
    expect(time.className).not.toContain("opacity-50");
    expect(time.className).not.toContain("opacity-60");
    const create = vi.spyOn(api, "createAppointmentRequest");
    await user.click(
      within(dialog).getByRole("button", {
        name: "Submit appointment request",
      }),
    );
    expect(create).toHaveBeenCalledWith({
      service_id: 1,
      guest: { name: "Alex Guest", email: "alex@example.com" },
      date: "2099-06-22",
      time: "09:00",
    });
    expect((await within(dialog).findByRole("status")).textContent).toContain(
      "pending",
    );
    expect(
      within(dialog).getByText(/not a confirmed appointment/),
    ).toBeTruthy();
  });

  it("requires guest details and a future local slot before submitting", async () => {
    renderPage();
    const { user, dialog } = await openMary();
    const create = vi.spyOn(api, "createAppointmentRequest");
    await user.click(
      within(dialog).getByRole("button", {
        name: "Submit appointment request",
      }),
    );
    within(dialog).getByText("Enter your name.");
    within(dialog).getByText("Enter a valid email address.");
    within(dialog).getByText("Choose a date.");
    within(dialog).getByText("Choose a time.");
    expect(create).not.toHaveBeenCalled();
    expect(api.listAvailableSlots).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("shows loading and server field errors, then supports retry", async () => {
    renderPage();
    const { user, dialog } = await openMary();
    await user.type(
      within(dialog).getByRole("textbox", { name: "Your name" }),
      "Alex",
    );
    await user.type(
      within(dialog).getByRole("textbox", { name: "Email" }),
      "alex@example.com",
    );
    await chooseJune22(user, dialog);
    let reject!: (error: Error) => void;
    const create = vi
      .spyOn(api, "createAppointmentRequest")
      .mockImplementationOnce(
        () =>
          new Promise<AppointmentRequest>((_, rejectPromise) => {
            reject = rejectPromise;
          }),
      );
    await user.click(
      within(dialog).getByRole("button", {
        name: "Submit appointment request",
      }),
    );
    expect(
      within(dialog).getByRole("button", { name: "Submitting request…" }),
    ).toHaveProperty("disabled", true);
    await user.click(
      within(dialog).getByRole("button", { name: "Submitting request…" }),
    );
    expect(create).toHaveBeenCalledTimes(1);
    await act(async () =>
      reject(
        new ApiRequestError("Slot unavailable.", {
          time: ["Choose another time."],
        }),
      ),
    );
    expect((await within(dialog).findByRole("alert")).textContent).toContain(
      "Slot unavailable.",
    );
    within(dialog).getByText("Choose another time.");
    await within(dialog).findByRole("option", { name: "09:00" });
    await user.selectOptions(
      within(dialog).getByRole("combobox", { name: "Available time" }),
      "09:00",
    );
    await user.click(
      within(dialog).getByRole("button", {
        name: "Submit appointment request",
      }),
    );
    expect(create).toHaveBeenCalledTimes(2);
    expect((await within(dialog).findByRole("status")).textContent).toContain(
      "pending",
    );
  });

  it("retries month and daily errors, then clears the selection when the service changes", async () => {
    renderPage();
    const { user, dialog } = await openMary();
    await waitFor(() =>
      expect(within(dialog).queryByText("Loading available dates…")).toBeNull(),
    );
    vi.spyOn(api, "listAvailableDates").mockRejectedValueOnce(
      new Error("offline"),
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Go to the Next Month" }),
    );
    await within(dialog).findByText("Could not load available dates.");
    await user.click(
      within(dialog).getByRole("button", { name: "Retry dates" }),
    );
    await waitFor(() =>
      expect(
        within(dialog).queryByText("Could not load available dates."),
      ).toBeNull(),
    );
    await user.selectOptions(
      within(dialog).getByRole("combobox", { name: "Choose the Year" }),
      "2099",
    );
    await user.selectOptions(
      within(dialog).getByRole("combobox", { name: "Choose the Month" }),
      "5",
    );
    vi.spyOn(api, "listAvailableSlots").mockRejectedValueOnce(
      new Error("offline"),
    );
    await clickJune22(user, dialog);
    await within(dialog).findByText("Could not load available times.");
    await user.click(
      within(dialog).getByRole("button", { name: "Retry times" }),
    );
    await within(dialog).findByRole("option", { name: "09:00" });
    await user.selectOptions(
      within(dialog).getByRole("combobox", { name: "Available time" }),
      "09:00",
    );
    await user.selectOptions(
      within(dialog).getByRole("combobox", { name: /Service/ }),
      "1",
    );
    expect(
      within(dialog).getByRole("combobox", { name: "Available time" }),
    ).toHaveProperty("value", "");
  });

  it("ignores a late daily response after navigating away", async () => {
    renderPage();
    const { user, dialog } = await openMary();
    let resolve!: (response: AvailableSlotsResponse) => void;
    await user.selectOptions(
      within(dialog).getByRole("combobox", { name: "Choose the Year" }),
      "2099",
    );
    await user.selectOptions(
      within(dialog).getByRole("combobox", { name: "Choose the Month" }),
      "5",
    );
    vi.spyOn(api, "listAvailableSlots").mockImplementationOnce(
      () =>
        new Promise<AvailableSlotsResponse>((finish) => {
          resolve = finish;
        }),
    );
    await clickJune22(user, dialog);
    within(dialog).getByText("Loading available times…");
    expect(
      within(dialog).getByRole("combobox", { name: "Available time" }),
    ).toHaveProperty("disabled", true);
    await user.click(
      within(dialog).getByRole("button", { name: "Go to the Next Month" }),
    );
    await act(async () =>
      resolve({
        time_zone: "Europe/Lisbon",
        date: "2099-06-22",
        items: [
          {
            date: "2099-06-22",
            time: "08:00",
            starts_at: "2099-06-22T07:00:00Z",
            ends_at: "2099-06-22T07:30:00Z",
          },
        ],
      }),
    );
    expect(within(dialog).queryByRole("option", { name: "08:00" })).toBeNull();
  });

  it("ignores a late month response after navigating to another month", async () => {
    renderPage();
    const { user, dialog } = await openMary();
    await user.selectOptions(
      within(dialog).getByRole("combobox", { name: "Choose the Year" }),
      "2099",
    );
    await user.selectOptions(
      within(dialog).getByRole("combobox", { name: "Choose the Month" }),
      "5",
    );
    await waitFor(() =>
      expect(
        within(dialog).getByRole("button", { name: /June 22.*2099/ }),
      ).toHaveProperty("disabled", false),
    );
    let resolve!: (response: {
      time_zone: string;
      month: string;
      dates: string[];
    }) => void;
    vi.spyOn(api, "listAvailableDates").mockImplementationOnce(
      () =>
        new Promise((finish) => {
          resolve = finish;
        }),
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Go to the Next Month" }),
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Go to the Next Month" }),
    );
    await waitFor(() =>
      expect(within(dialog).queryByText("Loading available dates…")).toBeNull(),
    );
    await act(async () =>
      resolve({
        time_zone: "Europe/Lisbon",
        month: "2099-07",
        dates: ["2099-08-01"],
      }),
    );
    expect(
      within(dialog).getByRole("combobox", { name: "Choose the Month" }),
    ).toHaveProperty("value", "7");
    expect(
      within(dialog).getByRole("button", { name: /August 1st, 2099$/ }),
    ).toHaveProperty("disabled", true);
  });

  it("drops a selected slot when refreshed monthly availability removes its date", async () => {
    renderPage();
    const { user, dialog } = await openMary();
    await chooseJune22(user, dialog);
    vi.spyOn(api, "listAvailableDates").mockResolvedValueOnce({
      time_zone: "Europe/Lisbon",
      month: "2099-06",
      dates: [],
    });

    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await within(dialog).findByText(
      "No available dates this month. Try another month.",
    );
    expect(
      within(dialog).getByRole("button", { name: /June 22.*2099/ }),
    ).toHaveProperty("disabled", true);
    expect(
      within(dialog).getByRole("combobox", { name: "Available time" }),
    ).toHaveProperty("value", "");
    await user.click(
      within(dialog).getByRole("button", {
        name: "Submit appointment request",
      }),
    );
    expect(api.createAppointmentRequest).not.toHaveBeenCalled();
  });

  it("preserves a selected slot only after one monthly and one daily visibility refresh", async () => {
    renderPage();
    const { user, dialog } = await openMary();
    await chooseJune22(user, dialog);
    const monthRequests = vi.spyOn(api, "listAvailableDates");
    const slotRequests = vi.spyOn(api, "listAvailableSlots");
    const previousMonthCalls = monthRequests.mock.calls.length;
    const previousSlotCalls = slotRequests.mock.calls.length;
    let resolveMonth!: (response: AvailableDatesResponse) => void;
    monthRequests.mockImplementationOnce(
      () =>
        new Promise((finish) => {
          resolveMonth = finish;
        }),
    );

    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(monthRequests).toHaveBeenCalledTimes(previousMonthCalls + 1);
    expect(slotRequests).toHaveBeenCalledTimes(previousSlotCalls);
    expect(
      within(dialog).getByRole("button", { name: /June 22.*2099/ }),
    ).toHaveProperty("disabled", true);
    const time = within(dialog).getByRole("combobox", {
      name: "Available time",
    });
    expect(time).toHaveProperty("disabled", true);
    expect(time).toHaveProperty("value", "");

    await act(async () =>
      resolveMonth({
        time_zone: "Europe/Lisbon",
        month: "2099-06",
        dates: ["2099-06-22"],
      }),
    );
    await waitFor(() => expect(time).toHaveProperty("value", "09:00"));
    expect(slotRequests).toHaveBeenCalledTimes(previousSlotCalls + 1);
  });

  it("drops a selected time when refreshed daily availability removes its slot", async () => {
    renderPage();
    const { user, dialog } = await openMary();
    await chooseJune22(user, dialog);
    vi.spyOn(api, "listAvailableDates").mockResolvedValueOnce({
      time_zone: "Europe/Lisbon",
      month: "2099-06",
      dates: ["2099-06-22"],
    });
    vi.spyOn(api, "listAvailableSlots").mockResolvedValueOnce({
      time_zone: "Europe/Lisbon",
      date: "2099-06-22",
      items: [
        {
          date: "2099-06-22",
          time: "10:00",
          starts_at: "2099-06-22T09:00:00Z",
          ends_at: "2099-06-22T10:00:00Z",
        },
      ],
    });

    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await waitFor(() =>
      expect(
        within(dialog).getByRole("combobox", { name: "Available time" }),
      ).toHaveProperty("disabled", false),
    );
    within(dialog).getByRole("option", { name: "10:00" });
    expect(
      within(dialog).getByRole("combobox", { name: "Available time" }),
    ).toHaveProperty("value", "");
    expect(within(dialog).queryByRole("option", { name: "09:00" })).toBeNull();
    await user.click(
      within(dialog).getByRole("button", {
        name: "Submit appointment request",
      }),
    );
    expect(api.createAppointmentRequest).not.toHaveBeenCalled();
  });

  it("focuses the first field and restores the scheduling button after native dialog cancellation", async () => {
    renderPage();
    const { dialog } = await openMary();
    expect(document.activeElement).toBe(
      within(dialog).getByRole("combobox", { name: /Service/ }),
    );
    fireEvent(
      dialog,
      new Event("cancel", { bubbles: false, cancelable: true }),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toHaveProperty(
      "textContent",
      "Schedule appointment",
    );
  });
});
