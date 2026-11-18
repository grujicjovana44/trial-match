import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./apps/web/e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  timeout: 45_000,
  globalTeardown: "./scripts/e2e-global-teardown.mjs",
  use: {
    baseURL: "http://127.0.0.1:5175",
    browserName: "chromium",
    launchOptions: { channel: "msedge", headless: true },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node scripts/e2e-webserver.mjs",
    url: "http://127.0.0.1:5175/",
    timeout: 30_000,
    reuseExistingServer: false,
    env: {
      NODE_ENV: "test",
      HOST: "127.0.0.1",
      PORT: "43173",
      WEB_ORIGIN: "http://127.0.0.1:5175",
      DEMO_MODE: "true",
      DATASET_PROFILE: "clinicaltrials-20",
      RAG_RERANKER: "disabled",
      WEB_PORT: "5175",
      TRIALMATCH_E2E_API_PORT: "43173",
    },
    stdout: "pipe",
    stderr: "pipe",
  },
});
