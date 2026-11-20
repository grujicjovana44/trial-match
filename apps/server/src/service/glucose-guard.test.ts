import { describe, expect, it } from "vitest";
import { applyGlucoseGuard, hasGlucoseWithoutHba1c } from "./glucose-guard.js";

describe("zaštita HbA1c / glukoza", () => {
  it("aktivira se za EV-07 i ćirilični unos", () => {
    expect(
      hasGlucoseWithoutHba1c("Muškarac, 62 godine, šećer 8,1, kreatinin 1,3."),
    ).toBe(true);
    expect(hasGlucoseWithoutHba1c("Мушкарац, шећер 8,1, креатинин 1,3.")).toBe(
      true,
    );
    expect(hasGlucoseWithoutHba1c("glukoza 8,1 mmol/L")).toBe(true);
    expect(hasGlucoseWithoutHba1c("blood sugar 8.1")).toBe(true);
    expect(hasGlucoseWithoutHba1c("nivo šećera 8,1")).toBe(true);
    expect(hasGlucoseWithoutHba1c("nivo secera 8,1")).toBe(true);
    expect(hasGlucoseWithoutHba1c("нивo шећеру 8,1")).toBe(true);
  });
  it("ne aktivira se za EV-01, EV-02 i eksplicitan HbA1c", () => {
    expect(
      hasGlucoseWithoutHba1c(
        "Muškarac, 62 godine, HbA1c 8,1%, kreatinin 1,3 mg/dL, visina 178 cm, težina 92 kg, bez insulina.",
      ),
    ).toBe(false);
    expect(
      hasGlucoseWithoutHba1c(
        "Pacijent od 62 godine, šećerna bolest tip 2, glikozilirani hemoglobin 65 mmol/mol, kreatinin 115 µmol/L.",
      ),
    ).toBe(false);
    expect(hasGlucoseWithoutHba1c("šećer 8,1, HbA1c 7%")).toBe(false);
    expect(hasGlucoseWithoutHba1c("šećerne bolesti tip 2")).toBe(false);
    expect(hasGlucoseWithoutHba1c("šećerna bolest, HbA1c 8%")).toBe(false);
    expect(hasGlucoseWithoutHba1c("šećerna bolest 8,1")).toBe(false);
    expect(hasGlucoseWithoutHba1c("šećernom bolešću, 8,1")).toBe(false);
    expect(hasGlucoseWithoutHba1c("šećernu bolest 8,1")).toBe(false);
  });
  it("uklanja hba1c i dodaje dvosmislenost bez dupliranja", () => {
    const extraction = {
      intent: "eligibility_check" as const,
      profile: { age: 62, hba1c: { value: 8.1, unit: "%" } },
    };
    const { extraction: out, triggered } = applyGlucoseGuard(
      "šećer 8,1",
      extraction,
    );
    expect(triggered).toBe(true);
    expect(out.profile.hba1c).toBeUndefined();
    expect(out.profile.age).toBe(62);
    expect(out.profile.ambiguities).toEqual([
      {
        field: "hba1c",
        reason: "Vrednost šećera može biti HbA1c ili glukoza.",
      },
    ]);
  });
});
