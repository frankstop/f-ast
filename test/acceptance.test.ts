import { describe, expect, it } from "vitest";
import { parsePath } from "../src/index.js";

describe("acceptance: mixed legacy repo analysis", () => {
  it("parses Java and C# examples into expected AST, symbol graph, and diagnostics", async () => {
    const bundle = await parsePath("examples/legacy-mixed");
    const declarationNames = bundle.symbolGraph.declarations.map((declaration) => declaration.name).sort();
    const referenceNames = bundle.symbolGraph.references.map((reference) => reference.name).sort();
    const resolvedReferenceNames = bundle.symbolGraph.references
      .filter((reference) => reference.resolvedDeclarationId)
      .map((reference) => reference.name)
      .sort();
    const unresolvedCallNames = bundle.symbolGraph.diagnostics
      .filter((diagnostic) => diagnostic.code.startsWith("symbol.unresolved"))
      .map((diagnostic) => diagnostic.message.match(/'([^']+)'/)?.[1])
      .filter(Boolean)
      .sort();
    const unresolvedCodes = bundle.symbolGraph.diagnostics.map((diagnostic) => diagnostic.code).sort();
    const callContainers = bundle.symbolGraph.references
      .filter((reference) => reference.name === "Audit" || reference.name === "audit")
      .map((reference) => reference.container)
      .sort();

    expect(bundle.asts.map((ast) => ast.language).sort()).toEqual(["csharp", "java"]);
    expect(bundle.asts.map((ast) => ast.root.metadata.parser)).toEqual(["tree-sitter", "tree-sitter"]);
    expect(bundle.asts).toHaveLength(2);
    expect(bundle.diagnostics.every((diagnostic) => diagnostic.severity !== "error")).toBe(true);

    expect(declarationNames).toEqual([
      "Audit",
      "CustomerService",
      "FindInvoice",
      "InvoiceService",
      "System",
      "System.Collections.Generic",
      "audit",
      "findCustomer",
      "java.util.List",
      "repository",
      "repository"
    ]);

    expect(referenceNames).toEqual([
      "Audit",
      "FindById",
      "WriteLine",
      "audit",
      "findById",
      "getName",
      "println"
    ]);

    expect(resolvedReferenceNames).toEqual(["Audit", "audit"]);

    expect(unresolvedCallNames).toEqual(["FindById", "WriteLine", "findById", "getName", "println"]);
    expect(unresolvedCodes).toEqual([
      "symbol.unresolved.external-api",
      "symbol.unresolved.external-api",
      "symbol.unresolved.member",
      "symbol.unresolved.member",
      "symbol.unresolved.member"
    ]);
    expect(callContainers).toEqual(["CustomerService.findCustomer", "InvoiceService.FindInvoice"]);
  });
});
