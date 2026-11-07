import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { validateTrials } from "./prepare-trials.js";

describe("validacija pripreme studija", () => {
  it("prihvata sintetički skup fixture-a", async () => {
    const raw: unknown = JSON.parse(
      await readFile(resolve("data/fixtures/trials.json"), "utf8"),
    );

    expect(validateTrials(raw)).toHaveLength(3);
  });

  it("odbija ponovljene identifikatore studija", async () => {
    const raw: unknown = JSON.parse(
      await readFile(resolve("data/fixtures/trials.json"), "utf8"),
    );
    const trials = raw as unknown[];

    expect(() => validateTrials([trials[0], trials[0]])).toThrow(
      "ponovljene identifikatore",
    );
  });

  it("odbija kriterijum povezan sa drugom studijom", async () => {
    const raw: unknown = JSON.parse(
      await readFile(resolve("data/fixtures/trials.json"), "utf8"),
    );
    const trials = raw as Array<{
      criteria: Array<Record<string, unknown>>;
    }>;
    const invalid = structuredClone(trials);
    invalid[0]!.criteria[0]!.trialId = "nepoznata-studija";

    expect(() => validateTrials(invalid)).toThrow("ima neusaglašen trialId");
  });

  it("odbija zapis koji ne odgovara runtime šemi", () => {
    expect(() => validateTrials([{ trialId: "nepotpun" }])).toThrow();
  });
});
