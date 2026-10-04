import {
  test as base,
  expect,
  type Locator,
  type Page,
} from "@playwright/test";

import { formatGameDate } from "../src/game/calendar";
import { TOTAL_TICKS, targetFor, type Difficulty } from "../src/game/constants";
import { difficultyById } from "../src/game/engine";
import { humanize } from "../src/game/formulas";
import { CALENDAR_EVENTS, eventTick } from "../src/game/events";

/**
 * Speeding up the year.
 *
 * The clock in `/play/` is wall-clock time measured against an anchor, pumped
 * by a 200ms interval. Playwright's fake clock replaces `Date`, `setInterval`
 * and friends in the page, so `clock.fastForward(ms)` moves `Date.now()` on and
 * fires the interval once — and the pump then steps every tick that is due, the
 * same catch-up path a backgrounded tab takes. Twelve minutes of game become a
 * handful of jumps, with nothing in the app changed to allow it.
 */

/**
 * Every test gets a page on the fake clock, and fails if the page threw or
 * logged an error at any point — which is most of what "an issue in game play"
 * looks like from the outside.
 *
 * The clock runs freely rather than paused: Qwik's own event handling waits on
 * timers, so a paused clock leaves clicks unanswered. Time still only moves
 * fast when a test jumps it.
 */
export const test = base.extend<{ problems: string[] }>({
  problems: [
    async ({ page }, use) => {
      const problems: string[] = [];
      page.on("pageerror", (error) =>
        problems.push(`pageerror: ${error.message}`),
      );
      page.on("console", (message) => {
        if (message.type() === "error")
          problems.push(`console: ${message.text()}`);
      });
      await use(problems);
      expect(problems, "the page reported errors").toEqual([]);
    },
    { auto: true },
  ],
  page: async ({ page }, use) => {
    await page.clock.install();
    await use(page);
  },
});

export { expect };

/** Every on-screen date and half-day, back to the tick it stands for. */
const TICK_BY_LABEL = new Map<string, number>();
for (let tick = 0; tick <= TOTAL_TICKS; tick++) {
  TICK_BY_LABEL.set(
    `${formatGameDate(tick)} ${tick % 2 === 0 ? "am" : "pm"}`,
    tick,
  );
}

export const ticksForDay = (day: number): number => day * 2;

export const EVENT_TICKS = CALENDAR_EVENTS.map((event) => ({
  id: event.id,
  title: event.title,
  tick: eventTick(event),
}));

/** The running game's status bar — the date, the target and the sleigh. */
export const statusBar = (page: Page): Locator =>
  page.locator("header").filter({ hasText: "Nice list" });

export const workshop = (page: Page): Locator =>
  page.getByRole("region", { name: "Workshop" });

export const catalogue = (page: Page): Locator =>
  page.getByRole("region", { name: "Catalogue" });

export const eventDialog = (page: Page): Locator => page.getByRole("dialog");

export const makeButton = (page: Page): Locator =>
  workshop(page).getByRole("button", { name: /MAKE/ });

/** A catalogue row's button, by its exact label ("Reindeer" is not "Reindeer trainer"). */
export const catalogueItem = (page: Page, label: string): Locator =>
  catalogue(page)
    .getByRole("listitem")
    .filter({ has: page.getByText(label, { exact: true }) })
    .getByRole("button");

/** The tick the status bar is showing. */
export const currentTick = async (page: Page): Promise<number> => {
  const spans = statusBar(page).locator("> div").first().locator("span");
  const date = (await spans.nth(1).textContent())?.trim() ?? "";
  const half = (await spans.nth(2).textContent())?.trim().toLowerCase() ?? "";
  const tick = TICK_BY_LABEL.get(`${date} ${half}`);
  if (tick === undefined) throw new Error(`unreadable date: ${date} ${half}`);
  return tick;
};

/** Waits for the status bar to reach at least `tick`, and returns where it is. */
export const expectTickAtLeast = async (
  page: Page,
  tick: number,
): Promise<number> => {
  await expect.poll(() => currentTick(page)).toBeGreaterThanOrEqual(tick);
  return currentTick(page);
};

/** Starts a fresh year from the card, the way a visitor does. */
export const startYear = async (
  page: Page,
  difficulty: Difficulty["id"] = "kind",
): Promise<void> => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "save Christmas",
  );
  await page.locator(`input[name="difficulty"][value="${difficulty}"]`).check();
  // The choice is held in a signal set by a lazily loaded handler; wait for the
  // card to restate the target, or a quick click starts the previous choice.
  await expect(
    page.getByText(
      `You need ${humanize(targetFor(difficultyById(difficulty)))} presents`,
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Start on Boxing Day" }).click();
  await expect(page).toHaveURL(new RegExp(`/play/\\?d=${difficulty}$`));
  await expect(statusBar(page)).toContainText(formatGameDate(0));
};

/**
 * Moves the year on by `ticks` half-days of wall-clock time.
 *
 * The clock is held while an event is open, so a jump that crosses one stops
 * exactly on it — the pump never steps past a pending event — and the caller
 * decides what to do with the dialog. The real clock keeps running too, so the
 * year may land a tick or two further on than asked.
 */
export const advance = async (page: Page, ticks: number): Promise<void> => {
  await page.clock.fastForward(ticks * 1000);
};

/** Advances to the next calendar event and returns its dialog. */
export const advanceToEvent = async (
  page: Page,
  event: (typeof EVENT_TICKS)[number],
): Promise<Locator> => {
  const now = await currentTick(page);
  await advance(page, event.tick - now + 20);
  const dialog = eventDialog(page);
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading")).toHaveText(event.title);
  await expect.poll(() => currentTick(page)).toBe(event.tick);
  return dialog;
};

/** Number on a workshop readout, e.g. the materials figure. */
export const readout = async (page: Page, term: string): Promise<string> =>
  (
    await workshop(page)
      .locator("dt", { hasText: term })
      .locator("xpath=following-sibling::dd[1]")
      .textContent()
  )?.trim() ?? "";

/** Parses the figures humanize() prints: "4,410", "935 million", "1.31 billion". */
export const parseHuman = (text: string): number => {
  const scale: Record<string, number> = {
    thousand: 1e3,
    million: 1e6,
    billion: 1e9,
    trillion: 1e12,
  };
  const match = text.replace(/,/g, "").match(/([\d.]+)\s*([a-z]+)?/i);
  if (!match) throw new Error(`not a number: ${text}`);
  return Number(match[1]) * (match[2] ? (scale[match[2]] ?? 1) : 1);
};

export const materials = async (page: Page): Promise<number> =>
  parseHuman(await readout(page, "Materials"));

/** Reads the saved run straight out of browser storage. */
export const savedRun = (page: Page) =>
  page.evaluate(() => {
    const raw = localStorage.getItem("present-delivery:run");
    return raw ? JSON.parse(raw) : null;
  });

/** How many of a catalogue item are owned, from its "×N" badge. */
export const owned = async (page: Page, label: string): Promise<number> => {
  const text = (await catalogueItem(page, label).textContent()) ?? "";
  const match = text.match(/×(\d+)/);
  return match ? Number(match[1]) : 0;
};

/** Buys one of an item and waits for the catalogue to count it. */
export const buyItem = async (page: Page, label: string): Promise<void> => {
  const before = await owned(page, label);
  const item = catalogueItem(page, label);
  await expect(item).toBeEnabled();
  await item.click();
  await expect.poll(() => owned(page, label)).toBe(before + 1);
};

/** Clicks MAKE until materials reach `amount`, as an impatient player would. */
export const makeUntil = async (page: Page, amount: number): Promise<void> => {
  for (let guard = 0; guard < 200; guard++) {
    if ((await materials(page)) >= amount) return;
    await makeButton(page).click();
  }
  throw new Error(`MAKE never reached ${amount} materials`);
};

export const resourceTrack = (page: Page, label: string): Locator =>
  page
    .locator("section > div > div")
    .filter({ has: page.getByText(label, { exact: true }) });
