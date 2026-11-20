import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseConfig } from "../../src/config/index.js";
import type { LlmAdapter } from "../../src/llm/adapter.js";
import { retrieveTrials } from "../../src/retrieval/retrieve.js";
import { TrialMatchService } from "../../src/service/trialmatch.js";
import {
  DatasetManifestSchema,
  TrialSchema,
} from "../../../../packages/shared/src/index.js";

const config = parseConfig({
  NODE_ENV: "test",
  DEMO_MODE: "false",
  GEMINI_API_KEY: "test-key",
  DATASET_PROFILE: "fixtures",
  DATA_DIR: "data/fixtures",
});

function fakeAdapter(profile: Record<string, unknown>): LlmAdapter {
  return {
    providerId: "fake",
    modelId: "fake",
    generate: async (request) => ({
      candidate:
        request.promptId === "extract_profile.v1"
          ? { intent: "eligibility_check", profile }
          : null,
      usage: { inputTokens: 1, outputTokens: 1 },
      finish: "complete",
    }),
  };
}

async function makeService(profile: Record<string, unknown>) {
  const trials = TrialSchema.array().parse(
    JSON.parse(await readFile("data/fixtures/trials.json", "utf8")),
  );
  const manifest = DatasetManifestSchema.parse(
    JSON.parse(await readFile("data/manifest.json", "utf8")),
  );
  return new TrialMatchService({
    config,
    adapter: fakeAdapter(profile),
    trials,
    manifest,
    retriever: {
      retrieve: async (p, corpus, options) =>
        retrieveTrials(p, corpus, options),
    },
  });
}

const full = {
  age: 62,
  sex: "male",
  hba1c: { value: 8.1, unit: "%" },
  creatinine: { value: 1.3, unit: "mg/dL" },
  height: { value: 178, unit: "cm" },
  weight: { value: 92, unit: "kg" },
  insulin_last_3_months: false,
};
const base =
  "Muškarac, 62 godine, dijabetes tip 2, HbA1c 8,1%, kreatinin 1,3 mg/dL, visina 178 cm, težina 92 kg, bez insulina.";

describe("deterministički zaštitnici servisa", () => {
  it("EV-07: šećer se ne tretira kao HbA1c i matcher se ne poziva", async () => {
    const service = await makeService({
      age: 62,
      sex: "male",
      hba1c: { value: 8.1, unit: "%" },
      creatinine: { value: 1.3, unit: "mg/dL" },
    });
    const response = await service.start({
      profileText: "Muškarac, 62 godine, šećer 8,1, kreatinin 1,3.",
    });
    expect(response.status).toBe("needs_clarification");
    expect(response.question?.text).toBe(
      "Da li je navedena vrednost HbA1c (%) ili glukoza (mmol/L)?",
    );
    expect(response.meta.toolCalls).toBe(0);
    expect(response.profile?.hba1c).toBeUndefined();
    expect(
      service.sessions
        .get(response.runId)
        ?.events.some((e) => e.outcome === "hba1c_glucose_ambiguity"),
    ).toBe(true);
  });

  it("EV-03: ograničenje prikaza uklanja T-C bez promene statusa T-A", async () => {
    const restricted = await (
      await makeService(full)
    ).start({
      profileText: `${base} Prikaži samo studije koje ne koriste BMI.`,
    });
    const plain = await (await makeService(full)).start({ profileText: base });
    const shown = [...restricted.results, ...restricted.excludedTrials].map(
      (t) => t.trialId,
    );
    expect(shown).not.toContain("T-C");
    expect(shown).toContain("T-A");
    const statuses = (r: typeof plain, id: string) =>
      r.results
        .concat(r.excludedTrials)
        .find((t) => t.trialId === id)
        ?.criteria.map((c) => [c.id, c.status]);
    expect(statuses(restricted, "T-A")).toEqual(statuses(plain, "T-A"));
    expect(
      [...plain.results, ...plain.excludedTrials].map((t) => t.trialId),
    ).toContain("T-C");
  });
});
