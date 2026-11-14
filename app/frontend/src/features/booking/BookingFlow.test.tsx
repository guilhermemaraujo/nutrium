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
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { api, ApiRequestError, createMockApi } from "@/api/client";
import type { AppointmentRequest } from "@/api/types";
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

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("guest booking flow", () => {
  it("prefills the card service, allows a change, and submits a pending request", async () => {
    renderPage();
    const { user, dialog } = await openMary();
    const service = within(dialog).getByRole("combobox", { name: /Service/ });
    expect(service).toHaveProperty("value", "2");
    await user.selectOptions(service, "1");
    await user.type(
      within(dialog).getByRole("textbox", { name: "Your name" }),
      "Alex Guest",
    );
    await user.type(
      within(dialog).getByRole("textbox", { name: "Email" }),
      "alex@example.com",
    );
    await user.type(within(dialog).getByLabelText("Date"), "2099-06-20");
    await user.type(within(dialog).getByLabelText("Time"), "14:30");
    const create = vi.spyOn(api, "createAppointmentRequest");
    await user.click(
      within(dialog).getByRole("button", {
        name: "Submit appointment request",
      }),
    );
    expect(create).toHaveBeenCalledWith({
      service_id: 1,
      guest: { name: "Alex Guest", email: "alex@example.com" },
      date: "2099-06-20",
      time: "14:30",
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
    await user.type(within(dialog).getByLabelText(/^Date/), "2000-01-01");
    await user.type(within(dialog).getByLabelText(/^Time/), "09:00");
    await user.click(
      within(dialog).getByRole("button", {
        name: "Submit appointment request",
      }),
    );
    within(dialog).getByText("Choose a future date and time.");
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
    await user.type(within(dialog).getByLabelText("Date"), "2099-06-20");
    await user.type(within(dialog).getByLabelText("Time"), "14:30");
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
    reject(
      new ApiRequestError("Slot unavailable.", {
        time: ["Choose another time."],
      }),
    );
    expect((await within(dialog).findByRole("alert")).textContent).toContain(
      "Slot unavailable.",
    );
    within(dialog).getByText("Choose another time.");
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
