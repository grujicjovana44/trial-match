import { spawn, spawnSync } from "node:child_process";

const build = spawnSync("pnpm", ["build"], { stdio: "inherit", shell: false });
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);

const server = spawn(process.execPath, ["dist/apps/server/src/index.js"], {
  stdio: "inherit",
  env: process.env,
});
const web = spawn(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1"],
  { stdio: "inherit", env: process.env },
);
const children = [server, web];
let stopping = false;

function stopChildren(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode === null) child.kill("SIGTERM");
  }
  process.exitCode = exitCode;
}

for (const child of children) {
  child.on("error", (error) => {
    console.error("Proces nije mogao da se pokrene:", error.message);
    stopChildren(1);
  });
  child.on("exit", (code) => {
    if (!stopping) stopChildren(code ?? 1);
  });
}

process.on("SIGINT", () => stopChildren());
process.on("SIGTERM", () => stopChildren());
