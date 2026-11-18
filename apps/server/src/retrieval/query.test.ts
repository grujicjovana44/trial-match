import { describe, expect, it } from "vitest";
import {
  buildRetrievalQueries,
  buildRetrievalQuery,
  normalizeClinicalTerm,
  SR_EN_LEXICON_VERSION,
} from "./query.js";

describe("query iz validiranog profila", () => {
  it("normalizuje srpsku dijagnozu u termin engleskog korpusa deterministički", () => {
    const query = buildRetrievalQuery({
      stated_diagnoses: ["Dijabetes tipa 2", "type 2 diabetes"],
    });
    expect(query).toContain("type 2 diabetes");
    expect(query).toContain("dijabetes tip 2");
    expect(SR_EN_LEXICON_VERSION).toBe("sr-en-clinical-v3");
  });

  it("ne dodaje upit iz nedostupnih profilnih polja", () => {
    expect(buildRetrievalQuery({ age: 62, sex: "male" })).toBe("");
  });

  it("odbija nevalidiran profil umesto da koristi slobodan tekst", () => {
    expect(() => buildRetrievalQuery("dijabetes tipa 2")).toThrow();
  });

  it("transliteriše ćirilicu i normalizuje đ/dž pre rečnika", () => {
    const query = buildRetrievalQueries({
      stated_diagnoses: ["гојазност", "хипертензија", "бубрежна болест"],
    });
    expect(query.text).toContain("obesity");
    expect(query.text).toContain("hypertension");
    expect(query.text).toContain("kidney disease");
    expect(normalizeClinicalTerm("ђак и џеп")).toBe("djak i dzep");
  });

  it("gradi više upita od dijagnoza i poznatih izmerenih polja", () => {
    const query = buildRetrievalQueries(
      {
        age: 52,
        hba1c: { value: 8.2, unit: "%" },
        stated_diagnoses: ["type 2 diabetes", "kidney disease"],
      },
      [
        {
          name: "eGFR",
          value: 45,
          unit: "mL/min/1.73 m²",
          formulaName: "synthetic",
          sourceReference: "TEST",
        },
        {
          name: "BMI",
          value: 31,
          unit: "kg/m²",
          formulaName: "synthetic",
          sourceReference: "TEST",
        },
      ],
    );
    expect(query.text).toContain("hba1c");
    expect(query.text).toContain("egfr kidney function renal");
    expect(query.text).toContain("bmi body mass index");
    expect(query.text).toContain("kidney disease");
  });

  it("zadržava nepoznat izraz u upitu i označava ga kao nepreveden", () => {
    const query = buildRetrievalQueries({
      stated_diagnoses: ["sindrom plavog meseca"],
    });
    expect(query.text).toContain("sindrom plavog meseca");
    expect(query.untranslatedTerms).toEqual(["sindrom plavog meseca"]);
  });

  it("proširuje renal health na pojmove iz eGFR i albumin passage-a", () => {
    const query = buildRetrievalQueries({
      stated_diagnoses: ["type 2 diabetes", "renal health"],
    });
    expect(query.text).toContain("egfr");
    expect(query.text).toContain("albumin");
    expect(query.text).toContain("kidney function");
  });
});
