import { createServer as createViteServer } from "vite";
import { parseConfig } from "../dist/apps/server/src/config/index.js";
import { createApp } from "../dist/apps/server/src/api/app.js";

const host = "127.0.0.1";
const apiPort = 43173;
const webPort = 5175;

Object.assign(process.env, {
  NODE_ENV: "test",
  HOST: host,
  PORT: String(apiPort),
  WEB_ORIGIN: `http://${host}:${webPort}`,
  DEMO_MODE: "true",
  DATASET_PROFILE: "clinicaltrials-20",
  RAG_RERANKER: "disabled",
  WEB_PORT: String(webPort),
  TRIALMATCH_E2E_API_PORT: String(apiPort),
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
  console.log(`TrialMatch real-20 E2E API: http://${host}:${apiPort}`);
  console.log(`TrialMatch real-20 E2E UI: http://${host}:${webPort}`);
} catch (error) {
  await shutdown().catch(() => undefined);
  console.error(error);
  process.exitCode = 1;
}
