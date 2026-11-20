import { describe, expect, it } from "vitest";
import { stripAnswerLabel } from "./answer-label.js";

describe("uklanjanje oznake polja iz odgovora", () => {
  it("uklanja oznaku kreatinina", () => {
    expect(stripAnswerLabel("creatinine", "kreatinin 1,3 mg/dL")).toBe(
      "1,3 mg/dL",
    );
    expect(stripAnswerLabel("creatinine", "Kreatinin: 1,3 mg/dL")).toBe(
      "1,3 mg/dL",
    );
  });

  it("uklanja oznake HbA1c, visine i težine", () => {
    expect(stripAnswerLabel("hba1c", "HbA1c 8,1%")).toBe("8,1%");
    expect(stripAnswerLabel("hba1c", "HbA1c: 8,1 %")).toBe("8,1 %");
    expect(stripAnswerLabel("hba1c", "Hb A1c = 8,1%")).toBe("8,1%");
    expect(stripAnswerLabel("hba1c", "glikozilirani hemoglobin 8,1%")).toBe(
      "8,1%",
    );
    expect(stripAnswerLabel("height", "visina 178 cm")).toBe("178 cm");
    expect(stripAnswerLabel("weight", "težina 92 kg")).toBe("92 kg");
    expect(stripAnswerLabel("weight", "Tezina: 92 kg")).toBe("92 kg");
  });

  it("uklanja samo oznaku traženog polja", () => {
    expect(stripAnswerLabel("weight", "visina 178 cm")).toBe("visina 178 cm");
    expect(stripAnswerLabel("creatinine", "8,1%")).toBe("8,1%");
  });
});
