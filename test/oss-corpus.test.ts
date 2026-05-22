import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parsePath } from "../src/index.js";

describe("OSS corpus smoke", () => {
  it("parses configured external Java/C# corpus without fatal errors", async () => {
    const corpusPath = process.env.AST_OSS_CORPUS;
    if (!corpusPath) {
      const bundle = await parsePath("examples/legacy-mixed", { parserMode: "heuristic" });
      expect(bundle.asts.length).toBeGreaterThan(0);
      return;
    }

    await fs.access(path.resolve(corpusPath));
    const bundle = await parsePath(corpusPath);
    expect(bundle.diagnostics.filter((diagnostic) => diagnostic.severity === "error")).toEqual([]);
  });
});
