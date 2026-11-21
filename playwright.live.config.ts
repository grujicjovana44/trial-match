import { defineConfig } from "@playwright/test";

// Opt-in živi UI prolaz: stvarni Gemini model, plaćeni pozivi. Nije deo
// `pnpm test`, `pnpm test:e2e:phase2` ni CI-ja.
if (process.env.TRIALMATCH_LIVE_E2E !== "confirm")
  throw new Error(
    "Živi UI prolaz poziva plaćeni model. Pokrenite ga sa TRIALMATCH_LIVE_E2E=confirm.",
  );

export default defineConfig({
  testDir: "./apps/web/e2e-live",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  timeout: 240_000,
  globalTeardown: "./scripts/e2e-live-global-teardown.mjs",
  use: {
    baseURL: "http://127.0.0.1:5176",
    browserName: "chromium",
    viewport: { width: 1280, height: 900 },
    launchOptions: {
      channel: process.env.E2E_BROWSER_CHANNEL ?? "msedge",
      headless: true,
    },
    trace: "off",
  },
  webServer: {
    command: "node --env-file-if-exists=.env scripts/e2e-live-webserver.mjs",
    url: "http://127.0.0.1:5176/",
    timeout: 60_000,
    reuseExistingServer: false,
    env: { TRIALMATCH_LIVE_E2E: "confirm" },
    stdout: "pipe",
    stderr: "pipe",
  },
});
