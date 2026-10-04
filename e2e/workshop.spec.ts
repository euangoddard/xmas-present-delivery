import {
  EVENT_TICKS,
  advance,
  buyItem,
  catalogue,
  catalogueItem,
  currentTick,
  expect,
  expectTickAtLeast,
  makeButton,
  makeUntil,
  materials,
  resourceTrack,
  startYear,
  statusBar,
  test,
  workshop,
} from "./helpers";

const PAY_DISPUTE = EVENT_TICKS[0].tick;

test.describe("the workshop", () => {
  test("MAKE makes five presents and pays for five materials", async ({
    page,
  }) => {
    await startYear(page);
    await expect(makeButton(page)).toContainText("+5");

    const before = await materials(page);
    await makeButton(page).click();
    await expect.poll(() => materials(page)).toBeGreaterThanOrEqual(before + 5);
    await expect(resourceTrack(page, "Presents")).not.toContainText(/^0$/);
  });

  test("the first elf is bought with the first twenty materials", async ({
    page,
  }) => {
    await startYear(page);
    await expect(catalogueItem(page, "Elf")).toBeDisabled();
    await expect(catalogueItem(page, "Elf")).toContainText("short");

    await makeUntil(page, 20);
    await expect(catalogueItem(page, "Elf")).toContainText("buy");
    await buyItem(page, "Elf");

    await expect(workshop(page)).toContainText("1 elves");
    await expect(catalogueItem(page, "Elf")).toContainText("×1");
    // the second elf costs 15% more
    await expect(catalogueItem(page, "Elf")).toContainText("23");
  });

  test("elves make the year's presents while nobody clicks", async ({
    page,
  }) => {
    await startYear(page);
    await makeUntil(page, 20);
    await buyItem(page, "Elf");
    const tick = await currentTick(page);
    const before = await materials(page);

    await advance(page, 10);
    await expectTickAtLeast(page, tick + 10);

    // fifty-three a tick: the elf and Father Christmas between them
    await expect
      .poll(() => materials(page))
      .toBeGreaterThanOrEqual(before + 10 * 53);
    await expect(workshop(page).getByText("Made per day")).toBeVisible();
  });

  test("the catalogue unfolds as the workshop grows, and never shrinks", async ({
    page,
  }) => {
    await startYear(page);
    const rows = catalogue(page).getByRole("listitem");
    const initial = await rows.count();
    expect(initial).toBeLessThan(7);
    await expect(catalogue(page)).toContainText(
      `${7 - initial} more items appear`,
    );

    await makeUntil(page, 40);
    await buyItem(page, "Elf");
    await buyItem(page, "Elf");
    await advance(page, 60);
    await expectTickAtLeast(page, 60);

    await expect.poll(() => rows.count()).toBeGreaterThan(initial);
    await expect(catalogueItem(page, "Reindeer")).toBeVisible();
    const grown = await rows.count();

    // spending everything on elves does not hide what has been seen
    while (await catalogueItem(page, "Elf").isEnabled()) {
      await buyItem(page, "Elf");
    }
    expect(await rows.count()).toBeGreaterThanOrEqual(grown);
  });

  test("a trainer is locked until there is a reindeer to train", async ({
    page,
  }) => {
    await startYear(page);
    await makeUntil(page, 20);
    await buyItem(page, "Elf");
    await advance(page, 4);
    await expectTickAtLeast(page, 4);
    await buyItem(page, "Elf");
    await buyItem(page, "Elf");

    // stop short of February's pay dispute, which would hold the clock
    const tick = await currentTick(page);
    await advance(page, PAY_DISPUTE - tick - 6);
    await expectTickAtLeast(page, PAY_DISPUTE - 8);

    const trainer = catalogueItem(page, "Reindeer trainer");
    await expect(trainer).toBeVisible();
    await expect(trainer).toContainText("Needs at least one reindeer");
    await expect(trainer).toBeDisabled();

    await expect(catalogueItem(page, "Reindeer")).toContainText(
      "Dasher is next",
    );
    await buyItem(page, "Reindeer");

    await expect(workshop(page)).toContainText("Dasher");
    await expect(catalogueItem(page, "Reindeer")).toContainText(
      "Dancer is next",
    );
    await expect(resourceTrack(page, "Reindeer power")).toContainText("10,000");
    await expect(trainer).not.toContainText("Needs at least one reindeer");
  });

  test("a full sleigh is called out, and a sleigh upgrade clears it", async ({
    page,
  }) => {
    await startYear(page);
    await makeUntil(page, 20);
    await buyItem(page, "Elf");
    await advance(page, 6);
    await expectTickAtLeast(page, 6);
    while (await catalogueItem(page, "Elf").isEnabled()) {
      await buyItem(page, "Elf");
    }

    // Father Christmas's sack holds five thousand; the elves fill it well
    // before February
    const tick = await currentTick(page);
    await advance(page, PAY_DISPUTE - tick - 6);
    await expect(workshop(page)).toContainText("The sleigh is full");
    await expect(workshop(page)).toContainText("Left behind");
    await expect(statusBar(page)).toContainText("100% full");

    while (
      (await catalogueItem(page, "Sleigh upgrade").isEnabled()) &&
      (await workshop(page).getByText("The sleigh is full").isVisible())
    ) {
      await buyItem(page, "Sleigh upgrade");
    }
    await expect(workshop(page)).not.toContainText("The sleigh is full");
    await expect(resourceTrack(page, "Sleigh capacity")).toContainText(
      /80,000|155,000/,
    );
  });

  test("the projection says plainly when the year cannot be won", async ({
    page,
  }) => {
    await startYear(page);
    await expect(workshop(page)).toContainText("Not at this rate");
    await expect(workshop(page)).toContainText(
      "Nothing you own will reach the target before Christmas.",
    );
  });
});

test.describe("the pinned tracker", () => {
  // On a wide screen the whole year fits without scrolling; the pinned bar
  // earns its place on a phone, where the catalogue stacks under the tracker.
  test.use({ viewport: { width: 390, height: 700 }, isMobile: true });

  test("appears once the full tracker scrolls away, and goes with it", async ({
    page,
  }) => {
    await startYear(page);
    const mini = page.locator("div.fixed.top-0[aria-hidden='true']");
    await expect(mini).toHaveClass(/-translate-y-full/);

    await catalogue(page).scrollIntoViewIfNeeded();
    await expect(mini).toHaveClass(/(^|\s)translate-y-0(\s|$)/);
    await expect(mini).toContainText("26 Dec");

    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(mini).toHaveClass(/-translate-y-full/);
  });
});
