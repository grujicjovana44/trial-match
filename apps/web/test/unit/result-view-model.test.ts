import { describe, expect, it } from "vitest";
import {
  criterionStatusIcon,
  criterionStatusLabel,
  criterionStatusNote,
  criterionStatusShort,
  derivedChips,
  formatNumber,
  formatObservedValue,
  formatSnapshotDate,
  modeBadge,
  missingProfileFields,
  profileAmbiguities,
  profileChips,
  resultHeading,
  statusLabel,
  summarizeCriteria,
  trialAnchorId,
  trialRegistryUrl,
  verdictLabel,
} from "../../src/result-view-model.js";
import {
  clarificationResponse,
  metaOf,
  noMatchResponse,
  notInSourcesResponse,
} from "../helpers/responses.js";

describe("sažetak kriterijuma po studiji", () => {
  it("broji statuse i izostavlja nulte kategorije iz oznake", () => {
    const summary = summarizeCriteria([
      { status: "met" },
      { status: "met" },
      { status: "met" },
      { status: "unknown" },
    ]);
    expect(summary).toMatchObject({ total: 4, met: 3, notMet: 0, unknown: 1 });
    expect(summary.label).toBe("3 od 4 ispunjeno, 1 nepoznato");
  });

  it("prikazuje neispunjene kriterijume kada postoje", () => {
    expect(
      summarizeCriteria([{ status: "met" }, { status: "not_met" }]).label,
    ).toBe("1 od 2 ispunjeno, 1 nije ispunjeno");
  });
});

describe("prikaz statusa i nedostajućih polja", () => {
  it("daje tekstualne oznake nezavisno od boje", () => {
    expect(statusLabel("ok")).toBe("Preliminarna provera završena");
    expect(criterionStatusLabel("unknown")).toContain("Nepoznato");
    expect(criterionStatusLabel("not_met")).toContain("Nije ispunjen");
  });

  it("prikazuje odsutna polja kao nepoznata, bez podrazumevanih vrednosti", () => {
    const missing = missingProfileFields({ age: 62 });
    expect(missing).toContain("HbA1c");
    expect(missing).toContain("upotreba insulina");
    expect(missing).not.toContain("starost");
  });
});

describe("oznake i formatiranje rezultata", () => {
  it("prikazuje oznake ishoda i statusa kriterijuma iz zajedničkog teksta", () => {
    expect(verdictLabel("candidate")).toBe("Kandidat za dalju proveru");
    expect(verdictLabel("pending")).toBe("Čeka dopunu podataka");
    expect(verdictLabel("excluded")).toBe("Ne ispunjava kriterijume");
    expect(criterionStatusShort("met")).toBe("Ispunjen");
    expect(criterionStatusNote("unknown")).toBe(
      "potrebna je dopuna ili ručna provera",
    );
    expect(criterionStatusIcon("unknown")).toBe("?");
  });

  it("bira naslove ishoda iz copy, uključujući dopunu bez razlike u tekstu", () => {
    expect(resultHeading(noMatchResponse())).toBe(
      "Nijedna studija iz skupa ne odgovara profilu",
    );
    expect(resultHeading(notInSourcesResponse())).toBe(
      "Tražena informacija nije u dostupnim izvorima",
    );
    expect(resultHeading(clarificationResponse())).toBe("Potrebna je dopuna");
  });

  it("formatira brojeve, nedostajuće vrednosti i primitivne vrednosti", () => {
    expect(formatNumber(8.1)).toBe("8,1");
    expect(formatNumber(62)).toBe("62");
    expect(formatNumber(61.666)).toBe("61,67");
    expect(formatObservedValue(null)).toEqual({
      text: "nije uneto",
      missing: true,
    });
    expect(formatObservedValue(true)).toEqual({ text: "da", missing: false });
    expect(formatObservedValue(false)).toEqual({ text: "ne", missing: false });
    expect(formatObservedValue("male")).toEqual({
      text: "muški",
      missing: false,
    });
    expect(formatObservedValue("female")).toEqual({
      text: "ženski",
      missing: false,
    });
    expect(formatObservedValue("metformin")).toEqual({
      text: "metformin",
      missing: false,
    });
  });
});

describe("oznake profila i porekla", () => {
  it("formatira prepoznata polja redom i čuva poreklo", () => {
    const chips = profileChips({
      age: 62,
      sex: "male",
      hba1c: { value: 8.1, unit: "%" },
      creatinine: { value: 1.3, unit: "mg/dL" },
      insulin_last_3_months: false,
      provenance: {
        insulin_last_3_months: { origin: "answer", round: 1 },
      },
    });
    expect(chips.map((chip) => chip.value)).toEqual([
      "62",
      "M",
      "8,1%",
      "1,3 mg/dL",
      "ne",
    ]);
    expect(chips.map((chip) => chip.label)).toEqual([
      "starost",
      "pol",
      "HbA1c",
      "kreatinin",
      "upotreba insulina",
    ]);
    expect(chips.at(-1)?.origin).toBe("answer");
    expect(missingProfileFields({ age: 62 })).toContain("pol");
    expect(missingProfileFields({ age: 62 })).not.toContain("pol za eGFR");
  });

  it("formats derived values and profile ambiguities", () => {
    expect(
      derivedChips([
        {
          name: "eGFR",
          value: 62.11,
          unit: "mL/min/1.73 m²",
          formulaName: "CKD-EPI 2021",
          sourceReference: "docs/project-brief.md",
        },
      ]),
    ).toEqual([
      {
        key: "eGFR",
        text: "eGFR ≈ 62,11 mL/min/1.73 m²",
        formula: "CKD-EPI 2021",
        source: "docs/project-brief.md",
      },
    ]);
    expect(
      profileAmbiguities({
        ambiguities: [{ field: "hba1c", reason: "Dve vrednosti su navedene." }],
      }),
    ).toEqual([{ label: "HbA1c", reason: "Dve vrednosti su navedene." }]);
  });
});

describe("registar, režim i datum snimka", () => {
  it("pravi vezu samo za tačan NCT identifikator i stabilna sidra", () => {
    expect(trialRegistryUrl("NCT01234567")).toBe(
      "https://clinicaltrials.gov/study/NCT01234567",
    );
    for (const invalid of ["T-A", "NCT123", "nct01234567", "NCT01234567/x"]) {
      expect(trialRegistryUrl(invalid)).toBeNull();
    }
    expect(trialAnchorId(0)).toBe("trial-1");
  });

  it("creates the correct mode badge and strictly formats dates", () => {
    expect(modeBadge(null)).toBeNull();
    expect(modeBadge(metaOf())).toEqual({ kind: "demo" });
    expect(modeBadge(metaOf({ demoMode: false, modelId: "m-1" }))).toEqual({
      kind: "live",
      modelId: "m-1",
    });
    expect(modeBadge(metaOf({ demoMode: false, modelId: "" }))).toEqual({
      kind: "live",
      modelId: null,
    });
    expect(formatSnapshotDate("2026-11-07")).toBe("7. novembar 2026.");
    expect(formatSnapshotDate("juče")).toBeNull();
    expect(formatSnapshotDate("2026-02-29")).toBeNull();
  });
});
