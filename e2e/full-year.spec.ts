import type { Page } from "@playwright/test";

import { formatGameDate } from "../src/game/calendar";
import { TOTAL_TICKS } from "../src/game/constants";
import {
  advance,
  buyItem,
  catalogueItem,
  eventDialog,
  expect,
  makeUntil,
  owned,
  savedRun,
  startYear,
  statusBar,
  test,
} from "./helpers";

/** Once the year ends, the card is the whole of the page. */
const endCard = (page: Page) => page.locator("main");

/** Plays out the rest of the year without buying anything, answering each event. */
const idleToChristmas = async (page: Page): Promise<void> => {
  for (let guard = 0; guard < 20; guard++) {
    if (await yearIsOver(page)) return;
    if (await eventDialog(page).isVisible()) {
      await eventDialog(page).getByRole("button").last().click();
      await expect(eventDialog(page)).toBeHidden();
    }
    await advance(page, TOTAL_TICKS);
  }
  throw new Error("the year never ended");
};

interface Snapshot {
  items: Record<string, { owned: number; enabled: boolean }>;
  fill: number;
  powerMet: boolean;
}

/** Everything the strategy looks at, read in one round trip. */
const snapshot = (page: Page): Promise<Snapshot> =>
  page.evaluate(() => {
    const items: Snapshot["items"] = {};
    document
      .querySelectorAll<HTMLButtonElement>(
        'section[aria-label="Catalogue"] li button',
      )
      .forEach((button) => {
        const label =
          button.querySelector(".font-display")?.textContent?.trim() ?? "";
        const count = button.textContent?.match(/×(\d+)/);
        items[label] = {
          owned: count ? Number(count[1]) : 0,
          enabled: !button.disabled,
        };
      });
    const fill =
      Number(document.body.innerText.match(/(\d+)% full/)?.[1] ?? 0) / 100;
    const power = [...document.querySelectorAll("section > div > div")].find(
      (el) => el.textContent?.startsWith("Reindeer power"),
    );
    return { items, fill, powerMet: !!power?.textContent?.includes("✓ met") };
  });

/**
 * The same order of preference the model's acceptance test plays, which wins
 * Kind comfortably: a few elves, a reindeer and a sleigh to unlock the
 * multipliers, room in the sleigh before it fills, the herd until it can pull
 * the target, and then everything that compounds.
 */
const wishlist = (state: Snapshot): string[] => {
  const order: string[] = [];
  const has = (label: string) => state.items[label]?.owned ?? 0;
  if (has("Elf") < 10) order.push("Elf");
  if (has("Reindeer") < 1) order.push("Reindeer");
  if (has("Sleigh upgrade") < 1) order.push("Sleigh upgrade");
  if (state.fill > 0.55) order.push("Sleigh mechanic", "Sleigh upgrade");
  if (!state.powerMet) order.push("Reindeer trainer", "Reindeer");
  order.push("Present duplicator", "Sleigh mechanic", "Elf");
  return order;
};

const yearIsOver = (page: Page) =>
  page.getByRole("button", { name: "Again" }).isVisible();

/**
 * Buys down the wishlist until nothing on it is affordable. The clock keeps
 * running while it shops, so the year can end — or an event open — between
 * reading the catalogue and clicking it; either simply ends the spree.
 */
const shopGreedily = async (page: Page): Promise<number> => {
  let bought = 0;
  for (let guard = 0; guard < 40; guard++) {
    if ((await eventDialog(page).isVisible()) || (await yearIsOver(page)))
      return bought;
    const state = await snapshot(page);
    const pick = wishlist(state).find((label) => state.items[label]?.enabled);
    if (!pick) return bought;
    const before = state.items[pick].owned;
    const clicked = await catalogueItem(page, pick)
      .click({ timeout: 2_000 })
      .then(() => true)
      .catch(() => false);
    if (!clicked) return bought;
    await expect
      .poll(async () =>
        (await yearIsOver(page)) ? Infinity : owned(page, pick),
      )
      .toBeGreaterThan(before);
    if (await yearIsOver(page)) return bought;
    bought += 1;
  }
  return bought;
};

test.describe("a whole year", () => {
  test("left alone, the sleigh leaves on Christmas Eve short of the list", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await startYear(page, "fair");
    await idleToChristmas(page);

    const card = endCard(page);
    await expect(card).toContainText("Christmas Day, 2026");
    await expect(card.getByRole("heading", { level: 1 })).toHaveText(
      "The sleigh left at midnight",
    );
    await expect(card).toContainText(
      "It never left the ground: there were no reindeer to pull it.",
    );
    await expect(card).toContainText("Next year, find a reindeer early");
    await expect(card).not.toContainText("one child in");
    await expect(card.getByText(/✗ short of 1.12 billion/)).toHaveCount(3);
    expect(await savedRun(page)).toBeNull();

    await card.getByRole("button", { name: "Copy the card" }).click();
    await expect(card.getByRole("button", { name: "Copied" })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(
      /^The sleigh never left the ground on Christmas Eve/,
    );

    await card.getByRole("textbox").fill("Idle Elf");
    await card.getByRole("button", { name: "See where I came" }).click();
    await expect(card).toContainText(/on the Fair board/);
    // the board is shared, so look for this run's own highlighted row
    const mine = card.locator('li[aria-current="true"]');
    await expect(mine).toContainText("Idle Elf");
    await expect(mine).toContainText("presents aboard");

    await card.getByRole("button", { name: "Again" }).click();
    await expect(statusBar(page)).toContainText(formatGameDate(0));
    await expect(statusBar(page)).toContainText("1.12 billion children");
  });

  test("one reindeer gets the sleigh off the ground, and the card says how far it got", async ({
    page,
  }) => {
    await startYear(page, "kind");
    await makeUntil(page, 20);
    await buyItem(page, "Elf");
    // stop short of February's pay dispute, which would hold the clock
    await advance(page, 40);
    await buyItem(page, "Reindeer");
    await idleToChristmas(page);

    // the sack holds five thousand, a reindeer pulls ten thousand: the sack is
    // what binds, and 935 million over 5,000 is one child in 187,000
    const card = endCard(page);
    await expect(card).toContainText(
      "It went out with 5,000 presents aboard — enough for one child in 187,000.",
    );
    await expect(card).toContainText("Next year, build the sleigh");
  });

  test("a year played well saves Christmas, and goes on the board", async ({
    page,
  }) => {
    test.setTimeout(5 * 60_000);
    await startYear(page, "kind");

    let purchases = 0;
    for (let round = 0; round < 400; round++) {
      if (await yearIsOver(page)) break;
      if (await eventDialog(page).isVisible()) {
        // the paid option, which is what a player watching their rates takes
        await eventDialog(page).getByRole("button").first().click();
        await expect(eventDialog(page)).toBeHidden();
      }
      purchases += await shopGreedily(page);
      await advance(page, 4);
    }

    const card = endCard(page);
    await expect(card.getByRole("heading", { level: 1 })).toHaveText(
      "The sleigh is loaded",
    );
    await expect(card).toContainText("Christmas is saved");
    await expect(card.getByText("✓ target met")).toHaveCount(3);
    await expect(card).toContainText("That is your best on Kind.");
    await expect(card).toContainText("Nothing to beat but it, now.");
    expect(purchases).toBeGreaterThan(50);

    const finish = (await card.locator("strong").nth(1).textContent())!.trim();
    await test
      .info()
      .attach("finished", { body: `${finish} after ${purchases} purchases` });

    await card.getByRole("textbox").fill("Winning Elf");
    await card.getByRole("button", { name: "See where I came" }).click();
    await expect(card).toContainText(/on the Kind board/);
    await expect(card.locator('li[aria-current="true"]')).toContainText(
      "Winning Elf",
    );
    await expect(card.locator('li[aria-current="true"]')).toContainText(
      `Saved Christmas by ${finish}`,
    );

    await card.getByRole("link", { name: /Open the Kind board/ }).click();
    await expect(page).toHaveURL(/\/scoreboard\/kind\/\?me=\d+$/);
    await expect(page.locator('li[aria-current="true"]')).toContainText(
      "Winning Elf",
    );

    // the best finish follows the visitor back to the card
    await page.goto("/");
    await expect(page.getByText(`Your best on Kind: ${finish}`)).toBeVisible();
  });
});
