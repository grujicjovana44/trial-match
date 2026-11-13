import type {
  AdapterContext,
  AdapterRequest,
  AdapterResult,
  LlmAdapter,
} from "./adapter.js";
import { z } from "zod";
import {
  ExtractionSchema,
  type Extraction,
  type Profile,
} from "../../../../packages/shared/src/index.js";
import { parseLocalizedNumber } from "../derived/units.js";

const numberCapture = String.raw`(-?\d+(?:[.,]\d+)?)`;

export class InvalidProfileTextError extends Error {
  constructor() {
    super("Vrednost profila nije u prepoznatom formatu.");
    this.name = "InvalidProfileTextError";
  }
}

function extractMeasurement(
  text: string,
  expression: RegExp,
): { value: number; unit: string } | undefined {
  const match = expression.exec(text);
  if (!match?.[1] || !match[2]) return undefined;
  const value = parseLocalizedNumber(match[1]);
  return value === undefined ? undefined : { value, unit: match[2] };
}

export class MockLlmAdapter implements LlmAdapter {
  readonly providerId = "mock";
  async generate(
    request: AdapterRequest,
    _context: AdapterContext,
  ): Promise<AdapterResult> {
    void _context;
    const candidate =
      request.promptId === "extract_profile.v1"
        ? this.extract(z.object({ text: z.string() }).parse(request.input).text)
        : {
            text: "Preliminarna provera kriterijuma; konačnu odluku donosi lekar.",
            references: [],
          };
    return { candidate, usage: null, finish: "complete" };
  }
  readonly modelId = "mock";
  private calls = 0;

  extract(profileText: string): Extraction {
    this.calls += 1;
    const text = profileText.toLocaleLowerCase("sr");
    if (
      /\b(?:hba1c|kreatinin|creatinine|visina|težina|tezina)\s*(?:[:=]\s*)?(?:abc|invalid|neispravno)\b/u.test(
        text,
      )
    ) {
      throw new InvalidProfileTextError();
    }
    const forbiddenIntent =
      /\b(koju dijagnozu|dijagnostikuj|da li imam|koji lek|šta da uzimam|koju terapiju|koju dozu|da li sme da uđe|odluči da li)\b/u.test(
        text,
      );
    if (forbiddenIntent) {
      return ExtractionSchema.parse({
        intent: "diagnosis_request",
        profile: {},
      });
    }
    if (/\b(neželjena dejstva|nuspojave|interakcije lekova)\b/u.test(text)) {
      return ExtractionSchema.parse({
        intent: "source_question",
        profile: {},
        sourceQuestion: profileText,
      });
    }
    const profile: Profile = {};
    const ageMatch = new RegExp(
      String.raw`(?:^|\D)${numberCapture}\s*(?:god(?:ina|ine|ina)?|years?)\b`,
      "iu",
    ).exec(text);
    if (ageMatch?.[1]) {
      const age = parseLocalizedNumber(ageMatch[1]);
      if (age !== undefined && Number.isInteger(age)) profile.age = age;
    }
    if (/\b(žena|ženski|ženskog pola)\b/u.test(text)) profile.sex = "female";
    if (/\b(muškarac|muški|muškog pola)\b/u.test(text)) profile.sex = "male";

    const hba1c = extractMeasurement(
      text,
      new RegExp(
        String.raw`(?:hba1c|hemoglobin(?:a)?\s*a1c|glikozilirani hemoglobin)\D{0,16}${numberCapture}\s*(%|mmol/mol)`,
        "iu",
      ),
    );
    if (hba1c) profile.hba1c = hba1c;
    else if (/\b(šećer|glukoza)\s*\d/u.test(text)) {
      profile.ambiguities = [
        {
          field: "hba1c",
          reason: "Nije jasno da li je navedena vrednost HbA1c ili glukoza.",
        },
      ];
    }

    const creatinine = extractMeasurement(
      text,
      new RegExp(
        String.raw`(?:kreatinin|creatinine)\D{0,16}${numberCapture}\s*(mg/dl|µmol/l|umol/l)`,
        "iu",
      ),
    );
    if (creatinine) profile.creatinine = creatinine;
    const height = extractMeasurement(
      text,
      new RegExp(
        String.raw`(?:visina|height)\D{0,12}${numberCapture}\s*(cm|m)\b`,
        "iu",
      ),
    );
    if (height) profile.height = height;
    else {
      const meters = new RegExp(String.raw`${numberCapture}\s*m\b`, "iu").exec(
        text,
      );
      if (meters?.[1] && !text.includes("mg/dl")) {
        const value = parseLocalizedNumber(meters[1]);
        if (value !== undefined && value >= 1 && value <= 2.5)
          profile.height = { value, unit: "m" };
      }
    }
    const weight = extractMeasurement(
      text,
      new RegExp(
        String.raw`(?:težina|tezina|weight)\D{0,12}${numberCapture}\s*(kg|g)\b`,
        "iu",
      ),
    );
    if (weight) profile.weight = weight;
    else {
      const kilogram = new RegExp(
        String.raw`(?:^|\s)${numberCapture}\s*kg\b`,
        "iu",
      ).exec(text);
      if (kilogram?.[1]) {
        const value = parseLocalizedNumber(kilogram[1]);
        if (value !== undefined && profile.weight === undefined)
          profile.weight = { value, unit: "kg" };
      }
    }
    if (
      /\b(bez insulina|nikad insulin|nije koristio insulin|ne koristi insulin)\b/u.test(
        text,
      )
    ) {
      profile.insulin_last_3_months = false;
    } else if (
      /\b(koristio insulin|koristi insulin|na insulinu)\b/u.test(text)
    ) {
      profile.insulin_last_3_months = true;
    }
    if (
      /\b(dijabetes tip 2|šećerna bolest tip 2|type 2 diabetes)\b/u.test(text)
    ) {
      profile.stated_diagnoses = ["dijabetes tip 2"];
    }
    const parsed: Extraction = { intent: "eligibility_check", profile };
    return ExtractionSchema.parse(parsed);
  }

  recordExplanationCall(): void {
    this.calls += 1;
  }

  get callCount(): number {
    return this.calls;
  }
}
