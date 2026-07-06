import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parsePath } from "../src/index.js";

describe("legacy messy sample snapshots", () => {
  it("matches the committed CommonAST, SymbolGraph, and diagnostics outputs", async () => {
    const demoPath = path.join("examples", "legacy-messy-sample");
    const outputPath = path.join(demoPath, "output");
    const bundle = await parsePath(demoPath);
    const [commonAst, symbolGraph, diagnostics] = await Promise.all([
      readJson(path.join(outputPath, "commonast.json")),
      readJson(path.join(outputPath, "symbolgraph.json")),
      readJson(path.join(outputPath, "diagnostics.json"))
    ]);

    expect(bundle.asts).toEqual(commonAst);
    expect(bundle.symbolGraph).toEqual(symbolGraph);
    expect(bundle.diagnostics).toEqual(diagnostics);
    const symbolNames = [
      ...bundle.symbolGraph.declarations.map((declaration) => declaration.name),
      ...bundle.symbolGraph.references.map((reference) => reference.name)
    ];
    expect(symbolNames).not.toEqual(
      expect.arrayContaining(["FakeService", "FakeCall", "StringClass", "CommentedOut", "Dangerous"])
    );
    expect(bundle.diagnostics.filter((diagnostic) => diagnostic.code === "parser.syntax-error")).toHaveLength(2);
  });
});

async function readJson(filePath: string): Promise<unknown> {
  return JSON.parse(await fs.readFile(filePath, "utf8")) as unknown;
}
