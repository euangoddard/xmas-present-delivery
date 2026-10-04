import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests drive the production build, served by `wrangler dev` exactly
 * as the Worker will serve it. The Vite dev server is the wrong target: it
 * injects styles late and adds Qwik's diagnostics overlay, so it reports
 * problems the real card does not have.
 *
 * The year is twelve real minutes long, so every spec installs Playwright's
 * fake clock and jumps it forward instead of waiting — see `e2e/helpers.ts`.
 *
 * The server gets a scoreboard of its own under `.e2e-state`, wiped and
 * migrated on every start, so a run neither reads nor writes the database that
 * `npm run dev` and `npm run preview` use.
 */
const PORT = 4818;
const STATE_DIR = ".e2e-state";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: [
      `rm -rf ${STATE_DIR}`,
      "npm run build",
      `wrangler d1 migrations apply xmas-present-delivery --local --persist-to ${STATE_DIR}`,
      `wrangler dev --port ${PORT} --persist-to ${STATE_DIR}`,
    ].join(" && "),
    // non-interactive: no migration prompt, no wrangler hotkeys
    env: { CI: "1" },
    url: `http://localhost:${PORT}/`,
    // Opt in only: anything else already listening there is not this app.
    reuseExistingServer: !!process.env.E2E_REUSE_SERVER,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
