import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { redactTrace } from "../../apps/server/src/trace/redact.js";
import { writeRunResults } from "./results.js";

let temporaryRoot: string | undefined;

afterEach(async () => {
  if (temporaryRoot) await rm(temporaryRoot, { recursive: true, force: true });
  temporaryRoot = undefined;
});

async function createRoot(): Promise<string> {
  temporaryRoot = await mkdtemp(resolve(tmpdir(), "trialmatch-results-"));
  return temporaryRoot;
}

const outcome = {
  case_id: "EV-11",
  execution_mode: "offline" as const,
  status: "passed" as const,
  details: "Ulaz je bezbedno odbijen.",
};
const summary = {
  label: "offline-test",
  commit: "abc123",
  data_version: "synthetic-trials-v1",
  schema_version: "1.0.0",
  model_id: "mock/offline",
  real_model: { executed: 0, skipped: 7, dry_run: 3 },
  offline_and_fault: { passed: 1, failed: 0 },
  results_file: "results.jsonl" as const,
};
const trace = redactTrace({
  case_id: "EV-11",
  run_id: "run-1",
  status: "passed",
  execution_mode: "offline",
  model_id: "mock/offline",
  data_version: "synthetic-trials-v1",
  schema_version: "1.0.0",
  prompt_version: "demo.v1",
  commit: "abc123",
  profile: { age: 62 },
});

describe("bezbedno čuvanje evaluacionih rezultata", () => {
  it("čuva rezultate po ID-ju i verzionisane metapodatke", async () => {
    const root = await createRoot();
    const output = resolve(root, "offline-test");
    await writeRunResults(output, [outcome], summary, [trace]);

    expect(await readFile(resolve(output, "results.jsonl"), "utf8")).toContain(
      '"case_id":"EV-11"',
    );
    expect(
      JSON.parse(await readFile(resolve(output, "summary.json"), "utf8")),
    ).toMatchObject({ data_version: "synthetic-trials-v1", commit: "abc123" });
    const savedTrace = await readFile(
      resolve(output, "traces/EV-11.json"),
      "utf8",
    );
    expect(savedTrace).not.toContain('"profile"');
  });

  it("odbija upis preko baseline-a ili postojećeg direktorijuma", async () => {
    const root = await createRoot();
    const baseline = resolve(root, "baseline");
    await expect(
      writeRunResults(baseline, [outcome], summary, [trace]),
    ).rejects.toThrow("nepromenljiv");

    const existing = resolve(root, "existing");
    await mkdir(existing);
    await expect(
      writeRunResults(existing, [outcome], summary, [trace]),
    ).rejects.toThrow();
  });

  it("odbija rezultat bez odgovarajućeg traga", async () => {
    const root = await createRoot();
    await expect(
      writeRunResults(resolve(root, "offline-test"), [outcome], summary, []),
    ).rejects.toThrow("jedinstvene ID-jeve");
  });

  it("odbija duplirane ID-jeve slučajeva", async () => {
    const root = await createRoot();
    await expect(
      writeRunResults(
        resolve(root, "offline-test"),
        [outcome, outcome],
        summary,
        [trace, trace],
      ),
    ).rejects.toThrow("jedinstvene ID-jeve");
  });
});
