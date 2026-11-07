import { describe, expect, it } from "vitest";
import {
  criterionStatusLabel,
  missingProfileFields,
  statusLabel,
} from "../../src/result-view-model.js";

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
