import { readFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { z } from "zod";

const ResultSchema = z
  .object({
    case_id: z.string(),
    execution_mode: z.string(),
    status: z.enum(["passed", "failed", "skipped", "dry_run"]),
    details: z.string(),
  })
  .strict();

async function readResults(folder: string) {
  const root = resolve("eval/results");
  const resolved = resolve(folder);
  const pathFromRoot = relative(root, resolved);
  if (
    isAbsolute(pathFromRoot) ||
    pathFromRoot === ".." ||
    pathFromRoot.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`)
  ) {
    throw new Error("Rezultati moraju biti unutar eval/results/.");
  }
  const contents = await readFile(resolve(resolved, "results.jsonl"), "utf8");
  return contents
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line, index) => {
      let value: unknown;
      try {
        value = JSON.parse(line);
      } catch (error) {
        throw new Error(`Neispravan JSON u ${folder}, red ${index + 1}.`, {
          cause: error,
        });
      }
      return ResultSchema.parse(value);
    });
}

const [beforePath, afterPath] = process.argv.slice(2);
if (!beforePath || !afterPath)
  throw new Error(
    "Upotreba: pnpm eval:compare <eval/results/pre> <eval/results/posle>",
  );
const [before, after] = await Promise.all([
  readResults(beforePath),
  readResults(afterPath),
]);
const beforeById = new Map(before.map((item) => [item.case_id, item]));
const afterById = new Map(after.map((item) => [item.case_id, item]));
const allIds = [...new Set([...beforeById.keys(), ...afterById.keys()])].sort();
console.log("| Slučaj | Pre | Posle | Promena |");
console.log("|---|---|---|---|");
for (const id of allIds) {
  const oldResult = beforeById.get(id);
  const newResult = afterById.get(id);
  console.log(
    `| ${id} | ${oldResult?.status ?? "nema"} | ${newResult?.status ?? "nema"} | ${oldResult?.details ?? "—"} → ${newResult?.details ?? "—"} |`,
  );
}
