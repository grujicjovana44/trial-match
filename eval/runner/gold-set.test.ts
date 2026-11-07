import { describe, expect, it } from "vitest";
import { calculateGoldMetrics, parseGoldSet } from "./gold-set.js";

describe("zlatni skup i metrike", () => {
  it("učitava validne JSONL redove", () => {
    expect(
      parseGoldSet(
        '{"case_id":"G-01","input":"profil","expected":{"age":62}}\n',
      ),
    ).toHaveLength(1);
  });

  it("odbija neispravan JSON red", () => {
    expect(() => parseGoldSet("{neispravno}\n")).toThrow(
      "JSON greška u zlatnom skupu, red 1",
    );
  });

  it("odbija duplirane ID-jeve i prazan skup", () => {
    const row = '{"case_id":"G-01","input":"profil","expected":{}}';
    expect(() => parseGoldSet(`${row}\n${row}`)).toThrow("duplirane ID-jeve");
    expect(() => parseGoldSet("\n")).toThrow("prazan");
  });

  it("izračunava preciznost i odziv i ignoriše metapodatke", () => {
    const cases = parseGoldSet(
      '{"case_id":"G-01","input":"profil","expected":{"age":62}}',
    );
    const metrics = calculateGoldMetrics(cases, () => ({
      age: 62,
      provenance: { age: { origin: "initial_input", round: 0 } },
    }));

    expect(metrics).toMatchObject({
      true_positive: 1,
      false_positive: 0,
      false_negative: 0,
      precision: 1,
      recall: 1,
    });
  });
});
