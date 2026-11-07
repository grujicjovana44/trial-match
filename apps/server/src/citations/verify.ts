import type { CitationSchema } from "../../../../packages/shared/src/index.js";
import type { z } from "zod";

export type Citation = z.infer<typeof CitationSchema>;

export function verifyCitation(
  citation: Citation,
  available: Map<string, string>,
): boolean {
  const sourceText = available.get(citation.sourceId);
  return sourceText !== undefined && sourceText.includes(citation.quote);
}
