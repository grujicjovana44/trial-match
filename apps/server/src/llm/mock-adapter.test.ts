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

  it("prepoznaje srpski pol i dijabetes tipa 2 u profilu", () => {
    const result = new MockLlmAdapter().extract(
      "Žena, 22 godine, dijabetes tipa 2, HbA1c 8%, kreatinin 1 mg/dL, visina 160 cm, težina 90 kg, ne koristi insulin.",
    );

    expect(result.profile.sex).toBe("female");
    expect(result.profile.stated_diagnoses).toEqual(["dijabetes tip 2"]);
    expect(result.profile.age).toBe(22);
    expect(result.profile.insulin_last_3_months).toBe(false);
  });

  it.each([
    ["zena; dijabetes tip 2", "female"],
    ["ženskog pola; šećerna bolest tipa II", "female"],
    ["женски пол; дијабетес типа 2", "female"],
    ["Мушкарац; дијабетес тип II", "male"],
    ["female; type 2 diabetes", "female"],
  ])("prepoznaje varijantu unosa %s", (text, sex) => {
    const result = new MockLlmAdapter().extract(text);

    expect(result.profile.sex).toBe(sex);
    expect(result.profile.stated_diagnoses).toEqual(["dijabetes tip 2"]);
  });

  it("ne prepoznaje dijabetes tipa 2 unutar druge reči", () => {
    const result = new MockLlmAdapter().extract("predijabetes tipa 2");

    expect(result.profile.stated_diagnoses).toBeUndefined();
  });

  it("klasifikuje zabranjen zahtev pre alata", () => {
    expect(new MockLlmAdapter().extract("Koju dijagnozu imam?").intent).toBe(
      "diagnosis_request",
    );
  });
});
