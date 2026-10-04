import { expect, startYear, statusBar, test } from "./helpers";

test.describe("the card", () => {
  test("introduces the year and offers three nice lists", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      /One year to\s*save Christmas/,
    );
    const lists = page.getByRole("group", {
      name: "How long is the nice list?",
    });
    await expect(lists.getByRole("radio")).toHaveCount(3);
    await expect(lists.getByRole("radio", { name: /^Kind/ })).toBeChecked();
    await expect(page.getByText("You need 935 million presents")).toBeVisible();
  });

  test("choosing a longer list restates the target before starting", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("radio", { name: /^Exacting/ }).check();
    await expect(
      page.getByText("You need 1.31 billion presents"),
    ).toBeVisible();
    await expect(page.getByText("workshop runs at 80% as well")).toBeVisible();
  });

  for (const [difficulty, target] of [
    ["kind", "935 million"],
    ["fair", "1.12 billion"],
    ["exacting", "1.31 billion"],
  ] as const) {
    test(`starting on ${difficulty} opens the year with that target`, async ({
      page,
    }) => {
      await startYear(page, difficulty);
      await expect(statusBar(page)).toContainText(`${target} children`);
      await expect(statusBar(page)).toContainText("0% full");
      await expect(
        page.getByRole("region", { name: "Workshop" }),
      ).toBeVisible();
      await expect(
        page.getByRole("region", { name: "Catalogue" }),
      ).toBeVisible();
    });
  }

  test("the year page with nothing to play sends the visitor back", async ({
    page,
  }) => {
    await page.goto("/play/");
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole("button", { name: "Start on Boxing Day" }),
    ).toBeVisible();
  });

  test("the scoreboard is a link away from the card", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Scoreboard" }).click();
    await expect(page).toHaveURL(/\/scoreboard\/kind\/$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
