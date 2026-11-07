import { parseConfig } from "./config/index.js";
import { createApp } from "./api/app.js";

const config = parseConfig();
const app = createApp({ config });

try {
  await app.listen({ host: config.HOST, port: config.PORT });
  app.log.info(
    `TrialMatch DEMO server je pokrenut na http://${config.HOST}:${config.PORT}`,
  );
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}
