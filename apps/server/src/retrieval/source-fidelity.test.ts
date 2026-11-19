import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { CriterionSchema } from "../../../../packages/shared/src/index.js";

const csvPath =
  "data/review_candidates/studies_20_2026-11-16/review/content_review_confirmed_2026-11-18.csv";
const draftPath =
  "data/review_candidates/studies_20_2026-11-16/review/studies_18_matcher_draft_2026-11-18.json";

type CsvRow = {
  trialId: string;
  criterionId: string;
  originalText: string;
  sourceTextHashSha256: string;
};

function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index]!;
    if (quoted) {
      if (character === '"' && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n" || character === "\r") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      if (character === "\r" && input[index + 1] === "\n") index += 1;
    } else {
      field += character;
    }
  }

  if (quoted) throw new Error("CSV sadrži nezatvoreno navodjenje.");
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

async function loadCsvRows(): Promise<CsvRow[]> {
  const text = (await readFile(csvPath, "utf8")).replace(/^\uFEFF/u, "");
  const [header, ...records] = parseCsv(text);
  if (!header) throw new Error("CSV nema header.");
  const positions = new Map(header.map((name, index) => [name, index]));
  const required = [
    "trialId",
    "criterionId",
    "originalText",
    "sourceTextHashSha256",
  ];
  for (const column of required)
    if (!positions.has(column)) throw new Error(`CSV nema kolonu ${column}.`);

  return records.map((record) => ({
    trialId: record[positions.get("trialId")!]!,
    criterionId: record[positions.get("criterionId")!]!,
    originalText: record[positions.get("originalText")!]!,
    sourceTextHashSha256: record[positions.get("sourceTextHashSha256")!]!,
  }));
}

describe("vernost matcher drafta potvrđenom izvornom CSV-u", () => {
  it("čuva svih 300 originalnih tekstova, ID-jeva i izvornih hash-eva", async () => {
    // CSV je fixture za vernost izvornom tekstu, ne gold skup za mapiranje polja.
    const csvRows = await loadCsvRows();
    const rawDraft: unknown = JSON.parse(await readFile(draftPath, "utf8"));
    const draftSchema = z.array(
      z
        .object({
          trialId: z.string(),
          criteria: z.array(CriterionSchema),
        })
        .strict(),
    );
    const draft = draftSchema.parse(rawDraft);
    const criteria = draft.flatMap((trial) => trial.criteria);
    const byId = new Map(criteria.map((item) => [item.id, item]));

    expect(csvRows).toHaveLength(300);
    expect(new Set(csvRows.map((row) => row.trialId)).size).toBe(18);
    expect(new Set(csvRows.map((row) => row.criterionId)).size).toBe(300);
    expect(criteria).toHaveLength(300);

    for (const row of csvRows) {
      const criterion = byId.get(row.criterionId);
      expect(criterion, row.criterionId).toBeDefined();
      expect(criterion?.trialId).toBe(row.trialId);
      expect(criterion?.sourceQuote).toBe(row.originalText);
      expect(
        createHash("sha256").update(row.originalText, "utf8").digest("hex"),
      ).toBe(row.sourceTextHashSha256);
    }
  });
});
