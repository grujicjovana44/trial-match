import { describe, expect, it } from "vitest";
import { parseBuildOptions } from "./index-build.js";

describe("index:build options", () => {
  it("preserves the default corpus and index path", () => {
    expect(parseBuildOptions([])).toEqual({
      corpusRoots: ["data/trials", "data/fixtures"],
      indexPath: "data/index/rag.sqlite",
      indexPathExplicit: false,
      estimateOnly: false,
      confirmLarge: false,
    });
  });

  it("accepts multiple corpus roots and an explicit index path", () => {
    expect(
      parseBuildOptions([
        "--corpus-root",
        "data/fixtures",
        "--corpus-root=data/rule_sets/approved",
        "--index-path",
        "data/index/rag-v2-eval.sqlite",
        "--estimate-only",
      ]),
    ).toEqual({
      corpusRoots: ["data/fixtures", "data/rule_sets/approved"],
      indexPath: "data/index/rag-v2-eval.sqlite",
      indexPathExplicit: true,
      estimateOnly: true,
      confirmLarge: false,
    });
  });

  it("requires a separate explicit index path for a selected corpus", () => {
    expect(() =>
      parseBuildOptions(["--corpus-root", "data/rule_sets/approved"]),
    ).toThrow(/zahteva eksplicitnu --index-path/);
  });

  it("rejects missing values and unknown options", () => {
    expect(() => parseBuildOptions(["--index-path"])).toThrow(
      /--index-path zahteva/,
    );
    expect(() => parseBuildOptions(["--unknown"])).toThrow(
      /Nepoznata opcija index:build/,
    );
  });
});
