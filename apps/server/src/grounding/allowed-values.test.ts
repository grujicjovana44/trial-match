import { describe, expect, it } from "vitest";
import { hasOnlyGroundedNumbers } from "./numeric.js";
import { collectAllowedNumbers } from "./allowed-values.js";

const base = {
  profile: {
    age: 62,
    hba1c: { value: 65, unit: "mmol/mol" },
    creatinine: { value: 115, unit: "µmol/L" },
  },
  derived: [],
  results: [],
  trials: [],
  sourceTexts: ["HbA1c između 7,0% i 10,0%."],
};

describe("dozvoljeni brojevi objašnjenja", () => {
  it("uključuje profil, normalizovane vrednosti i brojeve iz izvora", () => {
    const allowed = collectAllowedNumbers(base);
    expect(allowed).toEqual(expect.arrayContaining([62, 65, 115, 7, 10]));
    expect(
      hasOnlyGroundedNumbers("Pacijent ima 62 godine, HbA1c 9,9.", allowed),
    ).toBe(false);
    expect(
      hasOnlyGroundedNumbers("Pacijent ima 62 godine; prag 10,0%.", allowed),
    ).toBe(true);
  });
  it("uzima brojeve samo iz prosleđenih (navedenih) izvora", () => {
    const allowed = collectAllowedNumbers({
      ...base,
      sourceTexts: ["Uzrast od 18 do 75 godina."],
    });
    expect(allowed).toEqual(expect.arrayContaining([18, 75]));
    expect(allowed).not.toContain(10);
    expect(collectAllowedNumbers({ ...base, sourceTexts: [] })).not.toContain(
      18,
    );
  });
  it("odbija izmišljen broj", () => {
    expect(
      hasOnlyGroundedNumbers("HbA1c 12,3%", collectAllowedNumbers(base)),
    ).toBe(false);
  });
});
