import { expect, test } from "@playwright/test";

test("online search, booking, professional acceptance, and Mailpit delivery", async ({
  page,
  request,
}, testInfo) => {
  const guestEmail = `browser-${testInfo.project.name}-${Date.now()}@example.test`;
  const guestName = `Browser Guest ${guestEmail}`;

  await page.goto("/");
  await page.getByRole("textbox", { name: "Name or service" }).fill("Mary");
  await page.getByRole("textbox", { name: "Location" }).fill("Porto");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByText("Showing services in Porto")).toBeVisible();
  const mary = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: "Mary Jane" }) });
  await expect(mary.getByText("Online appointment")).toBeVisible();
  await expect(mary.getByText("Rua do Souto 12")).toHaveCount(0);
  await mary.getByRole("button", { name: "Schedule appointment" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("combobox", { name: "Service" })).toContainText(
    "Online",
  );
  await dialog.getByRole("textbox", { name: "Your name" }).fill(guestName);
  await dialog.getByRole("textbox", { name: "Email" }).fill(guestEmail);
  const time = dialog.getByRole("combobox", { name: "Available time" });
  let foundDate = false;
  for (let monthOffset = 0; monthOffset < 12 && !foundDate; monthOffset++) {
    await expect(dialog.getByText("Loading available dates…")).toHaveCount(0);
    const availableDays = dialog.locator(".rdp-day_button:not([disabled])");
    const dayCount = await availableDays.count();
    for (let day = 0; day < dayCount; day++) {
      await availableDays.nth(day).click();
      await expect
        .poll(
          async () =>
            (await time.isEnabled()) ||
            (await dialog
              .getByText(
                "No available times on this date. Choose another date.",
              )
              .isVisible()),
        )
        .toBe(true);
      if (await time.isEnabled()) {
        foundDate = true;
        break;
      }
    }
    if (!foundDate)
      await dialog
        .getByRole("button", { name: "Go to the Next Month" })
        .click();
  }
  expect(foundDate).toBe(true);
  const firstTime = await time.locator("option").nth(1).getAttribute("value");
  expect(firstTime).toBeTruthy();
  await time.selectOption(firstTime!);
  await dialog
    .getByRole("button", { name: "Submit appointment request" })
    .click();
  await expect(
    dialog.getByText("Your appointment request was submitted."),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Done" }).click();

  await page
    .getByRole("link", {
      name: "Are you a nutrition professional? Get to know our software",
    })
    .click();
  const selector = page.getByRole("combobox", { name: "View requests for" });
  const maryId = await selector
    .getByRole("option", { name: "Mary Jane" })
    .getAttribute("value");
  expect(maryId).toBeTruthy();
  if ((await selector.inputValue()) !== maryId) {
    const pendingResponse = page.waitForResponse((response) =>
      response
        .url()
        .includes(
          `/api/nutritionists/${maryId}/appointment_requests?status=pending`,
        ),
    );
    await selector.selectOption(maryId!);
    await pendingResponse;
  }
  const guestCard = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: guestName }) });
  const requestRegion = page.getByRole("region", {
    name: "Pending requests for Mary Jane",
  });
  await expect(requestRegion).toBeVisible();
  await expect(
    requestRegion.getByText("Loading pending requests…"),
  ).toHaveCount(0);
  const pagination = page.getByRole("navigation", { name: "Request pages" });
  const pageLabel = pagination.locator("span");
  const pageCount = (await pagination.count())
    ? Number((await pageLabel.textContent())?.match(/^\d+ of (\d+)$/)?.[1])
    : 1;
  expect(Number.isSafeInteger(pageCount) && pageCount > 0).toBe(true);
  for (let currentPage = 1; currentPage <= pageCount; currentPage++) {
    if (await guestCard.count()) break;
    if (currentPage === pageCount) break;
    await pagination.getByRole("button", { name: "Next requests" }).click();
    await expect(pageLabel).toHaveText(`${currentPage + 1} of ${pageCount}`);
    await expect(
      requestRegion.getByText("Loading pending requests…"),
    ).toHaveCount(0);
  }
  await expect(guestCard.getByText("Online appointment")).toBeVisible();
  await guestCard.getByRole("button", { name: "Accept" }).click();
  await expect(
    page.getByText(`${guestName}'s request accepted.`),
  ).toBeVisible();

  let deliveredMessageId: string | undefined;
  await expect
    .poll(
      async () => {
        const response = await request.get(
          "http://127.0.0.1:8025/api/v1/messages",
        );
        if (!response.ok()) return false;
        const body = (await response.json()) as {
          messages?: Array<{
            ID?: string;
            To?: Array<{ Address?: string }>;
            Subject?: string;
          }>;
        };
        deliveredMessageId = body.messages?.find(
          (message) =>
            message.To?.some((recipient) => recipient.Address === guestEmail) &&
            message.Subject === "Appointment request accepted",
        )?.ID;
        return Boolean(deliveredMessageId);
      },
      { timeout: 60_000 },
    )
    .toBe(true);
  const delivered = await request.get(
    `http://127.0.0.1:8025/view/${deliveredMessageId}.txt`,
  );
  expect(delivered.ok()).toBe(true);
  const message = await delivered.text();
  expect(message).toContain(`Hello ${guestName}`);
  expect(message).toContain("Service: First appointment (online)");
  expect(message).toContain("Europe/Lisbon");
});
