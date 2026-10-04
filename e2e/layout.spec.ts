import { expect, statusBar, test } from "./helpers";

/**
 * Nothing on screen should move once the page has painted. The year page is
 * server-rendered as a placeholder and swapped for the game once the client
 * knows which year to show; a placeholder one line tall used to drag the footer
 * up under it and then shove it down again.
 */
const PAGES = [
  { path: "/", ready: "Start on Boxing Day" },
  { path: "/play/?d=kind", ready: null },
] as const;

for (const width of [1280, 390]) {
  test.describe(`at ${width}px`, () => {
    test.use({ viewport: { width, height: 800 } });

    for (const { path, ready } of PAGES) {
      test(`${path} loads without shifting`, async ({ page }) => {
        await page.addInitScript(() => {
          const record = window as unknown as { shift: number };
          record.shift = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries() as unknown as {
              value: number;
              hadRecentInput: boolean;
            }[]) {
              if (!entry.hadRecentInput) record.shift += entry.value;
            }
          }).observe({ type: "layout-shift", buffered: true });
        });

        await page.goto(path);
        if (ready) {
          await expect(page.getByRole("button", { name: ready })).toBeVisible();
        } else {
          await expect(statusBar(page)).toBeVisible();
        }
        await page.evaluate(() => document.fonts.ready);
        // let any late swap or settle animation land before reading
        await page.waitForTimeout(500);

        const shift = await page.evaluate(
          () => (window as unknown as { shift: number }).shift,
        );
        expect(shift).toBeLessThan(0.001);
      });
    }
  });
}
