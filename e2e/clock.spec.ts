import { formatGameDate } from "../src/game/calendar";
import {
  EVENT_TICKS,
  advance,
  advanceToEvent,
  currentTick,
  eventDialog,
  expect,
  expectTickAtLeast,
  materials,
  savedRun,
  startYear,
  statusBar,
  test,
} from "./helpers";

test.describe("the clock", () => {
  test("one second is half a day", async ({ page }) => {
    await startYear(page);
    const before = await currentTick(page);

    await advance(page, 20);

    const after = await expectTickAtLeast(page, before + 20);
    expect(after - before).toBeLessThanOrEqual(23);
    await expect(statusBar(page)).toContainText(formatGameDate(after));
  });

  test("the workshop earns without anyone clicking", async ({ page }) => {
    await startYear(page);
    expect(await materials(page)).toBe(0);

    await advance(page, 10);
    await expectTickAtLeast(page, 10);

    // three presents a tick, Father Christmas on his own
    await expect.poll(() => materials(page)).toBeGreaterThanOrEqual(30);
  });

  test("a backgrounded tab catches up rather than losing days", async ({
    page,
  }) => {
    await startYear(page);
    // Moving the wall clock on without firing a single timer is what a
    // throttled tab looks like; coming back into view is what should catch up.
    const now = await page.evaluate(() => Date.now());
    await page.clock.setSystemTime(now + 60_000);
    await page.evaluate(() =>
      document.dispatchEvent(new Event("visibilitychange")),
    );
    await expectTickAtLeast(page, 60);
  });

  test("an event holds the clock until it is answered", async ({ page }) => {
    await startYear(page);
    const first = EVENT_TICKS[0];
    const dialog = await advanceToEvent(page, first);
    await expect(dialog).toContainText("the clock is held");

    // a long wait with the dialog open moves nothing on
    await advance(page, 50);
    expect(await currentTick(page)).toBe(first.tick);

    await dialog.getByRole("button", { name: /Ask them to wait/ }).click();
    await expect(eventDialog(page)).toBeHidden();

    await advance(page, 10);
    await expectTickAtLeast(page, first.tick + 10);
  });
});

test.describe("saving the year", () => {
  test("a refresh picks the year up where it was", async ({ page }) => {
    await startYear(page);
    await advance(page, 30);
    const before = await expectTickAtLeast(page, 30);
    await expect
      .poll(async () => (await savedRun(page))?.tick ?? 0)
      .toBeGreaterThanOrEqual(20);

    await page.reload();

    await expect(page).toHaveURL(/\/play\//);
    const after = await expectTickAtLeast(page, 20);
    // resumed, not restarted — and no time away is credited for the reload
    expect(after).toBeGreaterThanOrEqual(before - 10);
    expect(after).toBeLessThan(before + 10);
  });

  test("the card offers to resume a year in progress", async ({ page }) => {
    await startYear(page);
    await advance(page, 24);
    await expectTickAtLeast(page, 24);
    await expect
      .poll(async () => (await savedRun(page))?.tick ?? 0)
      .toBeGreaterThanOrEqual(20);

    await page.getByRole("link", { name: /Present delivery/ }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.getByRole("button", { name: "Resume your run" }).click();

    await expect(page).toHaveURL(/\/play\/$/);
    await expectTickAtLeast(page, 20);
  });

  test("starting again from the card discards the saved year", async ({
    page,
  }) => {
    await startYear(page);
    await advance(page, 30);
    await expectTickAtLeast(page, 30);

    await page.goto("/");
    await page.getByRole("button", { name: "Start on Boxing Day" }).click();
    await expect(statusBar(page)).toContainText(formatGameDate(0));
  });
});
