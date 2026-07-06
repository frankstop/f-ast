import { describe, expect, it } from "vitest";
import { parseCode, parsePath } from "../src/index.js";
import type { CommonASTNode } from "../src/types.js";

describe("parseCode", () => {
  it("normalizes Java declarations and calls into CommonAST", async () => {
    const ast = await parseCode(
      `package legacy;
       import java.util.List;
       public class OrderService {
         private OrderRepository repository;
         public Order load(String id) {
           return repository.findById(id);
         }
       }`,
      { language: "java", filePath: "OrderService.java", parserMode: "heuristic" }
    );

    expect(ast.language).toBe("java");
    expect(ast.root.kind).toBe("compilationUnit");
    const nodes = flatten(ast.root);
    expect(nodes.map((node) => [node.kind, node.name])).toContainEqual(["type", "OrderService"]);
    expect(nodes.map((node) => [node.kind, node.name])).toContainEqual(["method", "load"]);
    expect(nodes.map((node) => [node.kind, node.name])).toContainEqual(["call", "findById"]);
  });

  it("normalizes C# declarations and calls into CommonAST", async () => {
    const ast = await parseCode(
      `using System;
       namespace Legacy {
         public class PaymentService {
           public Payment Load(string id) {
             return repository.FindById(id);
           }
         }
       }`,
      { language: "csharp", filePath: "PaymentService.cs", parserMode: "heuristic" }
    );

    expect(ast.language).toBe("csharp");
    const nodes = flatten(ast.root);
    expect(nodes.map((node) => [node.kind, node.name])).toContainEqual(["type", "PaymentService"]);
    expect(nodes.map((node) => [node.kind, node.name])).toContainEqual(["method", "Load"]);
    expect(nodes.map((node) => [node.kind, node.name])).toContainEqual(["call", "FindById"]);
  });
});

function flatten(root: CommonASTNode): CommonASTNode[] {
  return [root, ...root.children.flatMap((child) => flatten(child))];
}

describe("parsePath", () => {
  it("returns a bundle with ASTs, symbols, links, and diagnostics", async () => {
    const bundle = await parsePath("examples/legacy-mixed", { parserMode: "heuristic" });

    expect(bundle.asts).toHaveLength(2);
    expect(bundle.symbolGraph.declarations.some((decl) => decl.name === "CustomerService")).toBe(true);
    expect(bundle.symbolGraph.declarations.some((decl) => decl.name === "InvoiceService")).toBe(true);
    expect(bundle.symbolGraph.references.length).toBeGreaterThan(0);
    expect(bundle.diagnostics.every((diagnostic) => diagnostic.severity !== "error")).toBe(true);
  });
});
