// Server za opt-in živi UI prolaz (`pnpm test:e2e:live`). Pokreće API u LIVE
// režimu sa stvarnim Gemini modelom nad korpusom clinicaltrials-20 i Vite UI.
// Ključevi dolaze iz serverskog okruženja (.env se učitava kroz --env-file-if-exists)
// i nikada se ne prosleđuju interfejsu.
import { createServer as createViteServer } from "vite";
import { parseConfig } from "../dist/apps/server/src/config/index.js";
import { createApp } from "../dist/apps/server/src/api/app.js";

if (process.env.TRIALMATCH_LIVE_E2E !== "confirm") {
  console.error(
    "Živi UI prolaz poziva plaćeni model. Pokrenite ga sa TRIALMATCH_LIVE_E2E=confirm.",
  );
  process.exit(1);
}

const host = "127.0.0.1";
const apiPort = 43174;
const webPort = 5176;

Object.assign(process.env, {
  HOST: host,
  PORT: String(apiPort),
  WEB_ORIGIN: `http://${host}:${webPort}`,
  WEB_PORT: String(webPort),
  TRIALMATCH_E2E_API_PORT: String(apiPort),
  DEMO_MODE: "false",
  DATASET_PROFILE: "clinicaltrials-20",
});

const api = createApp({ config: parseConfig(process.env) });
let vite;
let shutdownPromise;

async function shutdown() {
  if (!shutdownPromise) {
    shutdownPromise = (async () => {
      await vite?.close();
      await api.close();
    })();
  }
  await shutdownPromise;
}

api.post("/__e2e_shutdown", async (_request, reply) => {
  reply.code(202).send({ status: "shutting_down" });
  setTimeout(() => {
    void shutdown().then(() => process.exit(0));
  }, 25);
});

process.stdin.resume();
process.stdin.once("end", () => {
  void shutdown().then(() => process.exit(0));
});
process.once("SIGINT", () => {
  void shutdown().then(() => process.exit(0));
});
process.once("SIGTERM", () => {
  void shutdown().then(() => process.exit(0));
});

try {
  await api.listen({ host, port: apiPort });
  vite = await createViteServer({
    configFile: "vite.config.ts",
    server: { host, port: webPort, strictPort: true },
  });
  await vite.listen();
  console.log(`TrialMatch LIVE E2E API: http://${host}:${apiPort}`);
  console.log(`TrialMatch LIVE E2E UI: http://${host}:${webPort}`);
} catch (error) {
  await shutdown().catch(() => undefined);
  console.error(
    error instanceof Error ? error.message : "Server nije pokrenut.",
  );
  process.exitCode = 1;
}
