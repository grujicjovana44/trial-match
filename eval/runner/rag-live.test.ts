import { describe, expect, it } from "vitest";
import { validateRagLiveRun } from "./rag-live.js";

describe("RAG live evaluator guard", () => {
  it("ne dozvoljava poziv bez eksplicitne potvrde", async () => {
    await expect(validateRagLiveRun([])).rejects.toThrow(
      "Nedostaje --confirm-live.",
    );
  });

  it("odbija neodobren dataset pre čitanja ključa ili mrežnog poziva", async () => {
    await expect(
      validateRagLiveRun([
        "--confirm-live",
        "--dataset",
        "external.json",
        "--label",
        "test",
        "--max-model-calls",
        "1",
        "--max-input-bytes",
        "1000",
        "--max-output-tokens",
        "1000",
        "--approval",
        "approval.json",
      ]),
    ).rejects.toThrow(/samo odobreni sintetički skup/);
  });
});
