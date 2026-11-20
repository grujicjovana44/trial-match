import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseConfig } from "../config/index.js";
import type { AdapterResult, LlmAdapter } from "./adapter.js";
import { ModelRequestError } from "./generate-structured.js";
import { BusinessValidationError, ModelSession } from "./session.js";

const config = parseConfig({ DEMO_MODE: "true", NODE_ENV: "test" });
const schema = z.object({
  profile: z.object({ hba1c: z.object({ unit: z.string() }) }),
});
const good = { profile: { hba1c: { unit: "%" } } };

function fake(results: Array<Partial<AdapterResult>>): LlmAdapter {
  let i = 0;
  return {
    modelId: "fake",
    providerId: "fake",
    generate: async () => ({
      candidate: null,
      usage: { inputTokens: 1, outputTokens: 1 },
      finish: "complete",
      ...results[i++]!,
    }),
  };
}

describe("validacija u ModelSession tragu", () => {
  it("beleži schema_invalid sa putanjom bez vrednosti, pa ok", async () => {
    const session = new ModelSession(Date.now(), config);
    const bad = { profile: { hba1c: { unit: 5 } } };
    await session.generate(
      fake([{ candidate: bad }, { candidate: good }]),
      "extract_profile.v1",
      {},
      schema,
    );
    expect(session.events[0]).toMatchObject({
      validation: "schema_invalid",
      invalidPaths: ["profile.hba1c.unit"],
    });
    expect(session.events[1]?.validation).toBe("ok");
  });

  it("beleži no_candidate kada model ne vrati kandidata", async () => {
    const session = new ModelSession(Date.now(), config);
    await session.generate(
      fake([{ finish: "truncated" }, { candidate: good }]),
      "extract_profile.v1",
      {},
      schema,
    );
    expect(session.events[0]?.validation).toBe("no_candidate");
  });

  it("beleži business_invalid sa šifrom i poljem", async () => {
    const session = new ModelSession(Date.now(), config);
    await expect(
      session.generate(
        fake([{ candidate: good }, { candidate: good }]),
        "extract_profile.v1",
        {},
        schema,
        () => {
          throw new BusinessValidationError("value_not_in_input", "hba1c");
        },
      ),
    ).rejects.toThrow();
    expect(session.events[0]).toMatchObject({
      validation: "business_invalid",
      validationCode: "value_not_in_input",
      validationField: "hba1c",
    });
  });

  it("nepoznata greška validatora postaje business_rule", async () => {
    const session = new ModelSession(Date.now(), config);
    await expect(
      session.generate(
        fake([{ candidate: good }, { candidate: good }]),
        "extract_profile.v1",
        {},
        schema,
        () => {
          throw new Error("tajna 62");
        },
      ),
    ).rejects.toThrow();
    expect(session.events[0]?.validationCode).toBe("business_rule");
  });
});

describe("errorKind u tragu", () => {
  it("beleži http_429 pa uspeh", async () => {
    const session = new ModelSession(Date.now(), config);
    let calls = 0;
    const adapter: LlmAdapter = {
      modelId: "fake",
      providerId: "fake",
      generate: async () => {
        if (++calls === 1) throw new ModelRequestError(429);
        return {
          candidate: good,
          usage: { inputTokens: 1, outputTokens: 1 },
          finish: "complete",
        };
      },
    };
    await session.generate(adapter, "extract_profile.v1", {}, schema);
    expect(session.events[0]).toMatchObject({
      outcome: "failed",
      errorKind: "http_429",
    });
    expect(session.events[1]?.errorKind).toBeUndefined();
  });
});
