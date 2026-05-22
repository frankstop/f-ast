import { describe, expect, it } from "vitest";
import { buildSymbolGraph, parseCode } from "../src/index.js";

describe("buildSymbolGraph", () => {
  it("links obvious local method references and reports unresolved calls", async () => {
    const ast = await parseCode(
      `public class Demo {
         public void Run() {
           Save();
           Missing();
         }

         private void Save() {}
       }`,
      { language: "csharp", filePath: "Demo.cs", parserMode: "heuristic" }
    );

    const graph = buildSymbolGraph([ast]);
    const saveRef = graph.references.find((reference) => reference.name === "Save");
    const saveDecl = graph.declarations.find((declaration) => declaration.name === "Save");

    expect(saveRef?.resolvedDeclarationId).toBe(saveDecl?.id);
    expect(graph.diagnostics.some((diagnostic) => diagnostic.message.includes("Missing"))).toBe(true);
  });
});
