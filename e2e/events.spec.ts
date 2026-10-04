import { CALENDAR_EVENTS } from "../src/game/events";
import {
  EVENT_TICKS,
  advance,
  advanceToEvent,
  currentTick,
  eventDialog,
  expect,
  expectTickAtLeast,
  materials,
  parseHuman,
  startYear,
  statusBar,
  test,
} from "./helpers";

/** The pill a choice leaves on the status bar while it lasts, if any. */
const pillFor = (eventId: string, choiceId: string): string | null =>
  CALENDAR_EVENTS.find((event) => event.id === eventId)?.choices.find(
    (choice) => choice.id === choiceId,
  )?.modifiers[0]?.label ?? null;

test.describe("the calendar", () => {
  // six held clocks and the rest of the year between them
  test.slow();

  test("paying for every event takes the year through to December", async ({
    page,
  }) => {
    await startYear(page);

    for (const event of EVENT_TICKS) {
      const dialog = await advanceToEvent(page, event);
      const spec = CALENDAR_EVENTS.find((entry) => entry.id === event.id)!;
      const choice = spec.choices[0];
      const button = dialog.getByRole("button", { name: choice.label });

      if (choice.costShare) {
        const before = await materials(page);
        const shown = parseHuman(
          ((await button.locator("span").last().textContent()) ?? "").replace(
            "−",
            "",
          ),
        );
        expect(shown).toBe(Math.floor(before * choice.costShare));
        await button.click();
        await expect(eventDialog(page)).toBeHidden();
        expect(
          Math.abs((await materials(page)) - (before - shown)),
        ).toBeLessThanOrEqual(1);
      } else {
        await expect(button).toContainText("free");
        await button.click();
        await expect(eventDialog(page)).toBeHidden();
      }

      const pill = pillFor(event.id, choice.id);
      if (pill) await expect(statusBar(page)).toContainText(pill);

      // the clock is running again once the event is answered
      await advance(page, 4);
      await expectTickAtLeast(page, event.tick + 4);
    }

    expect(await currentTick(page)).toBeGreaterThan(EVENT_TICKS.at(-1)!.tick);
  });

  test("declining every event leaves its cost on the status bar", async ({
    page,
  }) => {
    await startYear(page);

    for (const event of EVENT_TICKS) {
      const dialog = await advanceToEvent(page, event);
      const spec = CALENDAR_EVENTS.find((entry) => entry.id === event.id)!;
      const choice = spec.choices.at(-1)!;
      const before = await materials(page);

      await dialog.getByRole("button", { name: choice.label }).click();
      await expect(eventDialog(page)).toBeHidden();

      // declining costs nothing up front
      expect(await materials(page)).toBeGreaterThanOrEqual(before);
      const pill = pillFor(event.id, choice.id);
      if (pill) await expect(statusBar(page)).toContainText(pill);
    }
  });

  test("a timed effect wears off when its days are up", async ({ page }) => {
    await startYear(page);
    const dispute = EVENT_TICKS[0];
    const dialog = await advanceToEvent(page, dispute);
    await dialog.getByRole("button", { name: "Ask them to wait" }).click();
    await expect(statusBar(page)).toContainText("Elves aggrieved");

    // forty-five days, and the thaw is further off than that
    await advance(page, 45 * 2 + 2);
    await expectTickAtLeast(page, dispute.tick + 92);
    await expect(statusBar(page)).not.toContainText("Elves aggrieved");
  });
});
