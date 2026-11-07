import { describe, expect, it } from "vitest";
import { MockLlmAdapter } from "./mock-adapter.js";

describe("DEMO adapter", () => {
  it("izdvaja samo eksplicitno pomenute profilne vrednosti", () => {
    const adapter = new MockLlmAdapter();
    const result = adapter.extract(
      "Muškarac, 62 godine, HbA1c 8,1%, kreatinin 1,3 mg/dL",
    );
    expect(result.profile.age).toBe(62);
    expect(result.profile.sex).toBe("male");
    expect(result.profile.insulin_last_3_months).toBeUndefined();
  });

  it("klasifikuje zabranjen zahtev pre alata", () => {
    expect(new MockLlmAdapter().extract("Koju dijagnozu imam?").intent).toBe(
      "diagnosis_request",
    );
  });
});
