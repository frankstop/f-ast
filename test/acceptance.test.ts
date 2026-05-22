import { describe, expect, it } from "vitest";
import { parsePath } from "../src/index.js";

describe("acceptance: mixed legacy repo analysis", () => {
  it("parses Java and C# examples into expected AST, symbol graph, and diagnostics", async () => {
    const bundle = await parsePath("examples/legacy-mixed", { parserMode: "heuristic" });
    const declarationNames = bundle.symbolGraph.declarations.map((declaration) => declaration.name).sort();
    const referenceNames = bundle.symbolGraph.references.map((reference) => reference.name).sort();
    const resolvedReferenceNames = bundle.symbolGraph.references
      .filter((reference) => reference.resolvedDeclarationId)
      .map((reference) => reference.name)
      .sort();
    const unresolvedCallNames = bundle.symbolGraph.diagnostics
      .filter((diagnostic) => diagnostic.code === "symbol.unresolved")
      .map((diagnostic) => diagnostic.message.match(/'([^']+)'/)?.[1])
      .filter(Boolean)
      .sort();

    expect(bundle.asts.map((ast) => ast.language).sort()).toEqual(["csharp", "java"]);
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
      "Audit",
      "CustomerService",
      "FindById",
      "FindInvoice",
      "InvoiceService",
      "WriteLine",
      "audit",
      "audit",
      "findById",
      "findCustomer",
      "getName",
      "println"
    ]);

    expect(resolvedReferenceNames).toEqual([
      "Audit",
      "Audit",
      "CustomerService",
      "FindInvoice",
      "InvoiceService",
      "audit",
      "audit",
      "findCustomer"
    ]);

    expect(unresolvedCallNames).toEqual(["FindById", "WriteLine", "findById", "getName", "println"]);
  });
});
