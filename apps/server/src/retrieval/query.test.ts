import { describe, expect, it } from "vitest";
import { buildRetrievalQuery, SR_EN_LEXICON_VERSION } from "./query.js";

describe("query iz validiranog profila", () => {
  it("normalizuje srpsku dijagnozu u termin engleskog korpusa deterministički", () => {
    expect(
      buildRetrievalQuery({
        stated_diagnoses: ["Dijabetes tipa 2", "type 2 diabetes"],
      }),
    ).toBe("type 2 diabetes");
    expect(SR_EN_LEXICON_VERSION).toBe("sr-en-clinical-v1");
  });

  it("ne izmišlja upit kada nema dijagnoze", () => {
    expect(buildRetrievalQuery({ age: 62, sex: "male" })).toBe("");
  });

  it("odbija nevalidiran profil umesto da koristi slobodan tekst", () => {
    expect(() => buildRetrievalQuery("dijabetes tipa 2")).toThrow();
  });
});
