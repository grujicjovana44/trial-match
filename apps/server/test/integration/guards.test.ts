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

type FakeExplanation = {
  text: string;
  references: Array<{ criterionId: string; sourceId: string; quote: string }>;
};

function fakeAdapter(
  profile: Record<string, unknown>,
  explanation?: (input: unknown) => FakeExplanation,
): LlmAdapter {
  return {
    providerId: "fake",
    modelId: "fake",
    generate: async (request) => ({
      candidate:
        request.promptId === "extract_profile.v1"
          ? { intent: "eligibility_check", profile }
          : explanation
            ? explanation(request.input)
            : null,
      usage: { inputTokens: 1, outputTokens: 1 },
      finish: "complete",
    }),
  };
}

async function makeService(
  profile: Record<string, unknown>,
  explanation?: (input: unknown) => FakeExplanation,
) {
  const trials = TrialSchema.array().parse(
    JSON.parse(await readFile("data/fixtures/trials.json", "utf8")),
  );
  const manifest = DatasetManifestSchema.parse(
    JSON.parse(await readFile("data/manifest.json", "utf8")),
  );
  return new TrialMatchService({
    config,
    adapter: fakeAdapter(profile, explanation),
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

describe("odgovori na pitanje HbA1c / glukoza", () => {
  const ambiguous = {
    age: 62,
    sex: "male",
    hba1c: { value: 8.1, unit: "%" },
    creatinine: { value: 1.3, unit: "mg/dL" },
    height: { value: 178, unit: "cm" },
    weight: { value: 92, unit: "kg" },
    insulin_last_3_months: false,
  };
  const text =
    "Muškarac, 62 godine, šećer 8,1, kreatinin 1,3 mg/dL, visina 178 cm, težina 92 kg.";

  async function startAmbiguous() {
    const service = await makeService(ambiguous);
    const started = await service.start({ profileText: text });
    expect(started.question?.field).toBe("hba1c");
    return { service, runId: started.runId };
  }

  it.each(["HbA1c 8,1%", "8,1%", "HbA1c: 8,1 %"])(
    "odgovor %j postavlja HbA1c 8,1 % i ne ponavlja pitanje",
    async (answer) => {
      const { service, runId } = await startAmbiguous();
      const response = await service.answer(runId, { answer });
      expect(response.profile?.hba1c).toEqual({ value: 8.1, unit: "%" });
      expect(
        response.profile?.ambiguities?.some((a) => a.field === "hba1c") ??
          false,
      ).toBe(false);
      expect(response.question?.field).not.toBe("hba1c");
    },
  );

  it.each(["šećer", "glukoza"])(
    "odgovor %j se prepoznaje kao glukoza (bez HbA1c vrednosti)",
    async (answer) => {
      const { service, runId } = await startAmbiguous();
      const response = await service.answer(runId, { answer });
      expect(response.profile?.hba1c).toBeUndefined();
      expect(
        response.profile?.ambiguities?.some((a) => a.field === "hba1c") ??
          false,
      ).toBe(false);
    },
  );
});

describe("objašnjenje modela", () => {
  const firstReference = (input: unknown) => {
    const { results } = input as {
      results: Array<{
        criteria: Array<{
          id: string;
          sourceId: string;
          citation: { quote: string };
        }>;
      }>;
    };
    const criterion = results.flatMap((t) => t.criteria)[0]!;
    return {
      criterionId: criterion.id,
      sourceId: criterion.sourceId,
      quote: criterion.citation.quote,
    };
  };
  const groundingOutcome = (
    service: Awaited<ReturnType<typeof makeService>>,
    runId: string,
  ) =>
    service.sessions
      .get(runId)
      ?.events.filter((e) => e.step === "grounding")
      .map((e) => e.outcome);

  it("prikazuje tekst modela kada su citati i brojevi proveravljivi", async () => {
    const service = await makeService(full, (input) => ({
      text: "Pacijent ima 62 godine; kriterijumi su proverani prema izvorima.",
      references: [firstReference(input)],
    }));
    const response = await service.start({ profileText: base });
    expect(response.explanation).toBe(
      "Pacijent ima 62 godine; kriterijumi su proverani prema izvorima.",
    );
    expect(response.explanationSource).toBe("model");
    expect(groundingOutcome(service, response.runId)).toContain(
      "model_explanation_shown",
    );
  });

  it("vraća šablon kada objašnjenje sadrži izmišljen broj", async () => {
    const service = await makeService(full, (input) => ({
      text: "HbA1c 12,3% je iznad praga.",
      references: [firstReference(input)],
    }));
    const response = await service.start({ profileText: base });
    expect(response.explanationSource).toBe("template");
    expect(response.explanation).toMatch(/^Ovo je preliminarna provera/u);
    expect(groundingOutcome(service, response.runId)).toContain(
      "fallback:numbers",
    );
  });

  it("vraća šablon kada je citat neispravan", async () => {
    const service = await makeService(full, (input) => ({
      text: "Kriterijumi su proverani.",
      references: [{ ...firstReference(input), quote: "izmišljen citat" }],
    }));
    const response = await service.start({ profileText: base });
    expect(response.explanationSource).toBe("template");
    expect(groundingOutcome(service, response.runId)).toContain(
      "fallback:citations",
    );
  });

  it("mock adapter zadržava šablon", async () => {
    const service = new TrialMatchService({
      config: parseConfig({ NODE_ENV: "test", DEMO_MODE: "true" }),
    });
    const response = await service.start({ profileText: base });
    expect(response.explanation).toMatch(/^Ovo je preliminarna provera/u);
    expect(response.explanationSource).toBe("template");
  });

  it("EV-03: izvori sakrivene studije ne stižu do modela", async () => {
    let captured: { sources: Record<string, string> } | undefined;
    const service = await makeService(full, (input) => {
      captured = input as { sources: Record<string, string> };
      return { text: "Kriterijumi su proverani.", references: [] };
    });
    const response = await service.start({
      profileText: `${base} Prikaži samo studije koje ne koriste BMI.`,
    });
    expect(captured).toBeDefined();
    expect(Object.keys(captured!.sources).length).toBeGreaterThan(0);
    expect(
      Object.keys(captured!.sources).some((id) => id.startsWith("T-C#")),
    ).toBe(false);
    const grounding = service.sessions
      .get(response.runId)
      ?.events.find((e) => e.step === "grounding");
    expect(grounding?.sourceIds?.some((id) => id.startsWith("T-C#"))).toBe(
      false,
    );
  });
});
