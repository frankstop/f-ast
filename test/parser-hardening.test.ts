import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatBundle } from "../src/formatters.js";
import { maskNonCode } from "../src/masking.js";
import { parseCodeWithTreeSitter } from "../src/parser.js";
import { buildSymbolGraph, parseCode, parsePath } from "../src/index.js";
import type { CommonASTNode, Language, ParseCodeOptions } from "../src/types.js";

const MODES = ["tree-sitter", "heuristic"] as const;

describe("non-code masking", () => {
  it("preserves source length and every line break", () => {
    const source = `class Real {
  string a = "/* not a comment */";
  string b = @"line one
// still a string";
  // class Fake {}
}`;
    const masked = maskNonCode(source, "csharp");

    expect(masked).toHaveLength(source.length);
    expect([...masked].filter((character) => character === "\n")).toHaveLength(
      [...source].filter((character) => character === "\n").length
    );
    expect(masked).toContain("class Real");
    expect(masked).not.toContain("Fake");
    expect(masked).not.toContain("not a comment");
  });

  for (const mode of MODES) {
    it(`ignores Java declarations and calls in comments and strings in ${mode} mode`, async () => {
      const ast = await parseFixture("java/CommentsAndStrings.java", "java", mode);
      const nodes = flatten(ast.root);
      const names = nodes.map((node) => node.name);

      expect(names).toContain("CommentsAndStrings");
      expect(names).toContain("realCall");
      expect(names).not.toContain("Phantom");
      expect(names).not.toContain("BlockPhantom");
      expect(names).not.toContain("StringPhantom");
      expect(names).not.toContain("haunt");
      expect(names).not.toContain("escape");
    });

    it(`ignores C# declarations and calls in regular, verbatim, and interpolated strings in ${mode} mode`, async () => {
      const ast = await parseFixture("csharp/CommentsAndStrings.cs", "csharp", mode);
      const names = flatten(ast.root).map((node) => node.name);

      expect(names).toContain("CommentsAndStrings");
      expect(names).toContain("RealCall");
      expect(names).not.toContain("Phantom");
      expect(names).not.toContain("BlockPhantom");
      expect(names).not.toContain("StringPhantom");
      expect(names).not.toContain("VerbatimPhantom");
      expect(names).not.toContain("Haunt");
      expect(names).not.toContain("Pretend");
    });
  }

  it("prevents comments and strings from producing flow edges or type hints", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "f-ast-masking-"));
    await fs.writeFile(
      path.join(dir, "Noise.cs"),
      `public class Noise {
         private string fake = @"if (fake.Count > 0) {
           Fake.Run();
           return;
         }";
         public void Real() {}
       }`,
      "utf8"
    );

    const bundle = await parsePath(dir, { parserMode: "heuristic" });

    expect(bundle.typeHints.some((hint) => hint.target.includes("fake"))).toBe(false);
    expect(bundle.flowGraph.edges.some((edge) => edge.to?.includes("Fake"))).toBe(false);
    expect(bundle.flowGraph.edges.some((edge) => edge.kind === "branches" || edge.kind === "returns")).toBe(false);
  });
});

describe("constructors, properties, and hierarchy", () => {
  for (const mode of MODES) {
    it(`extracts Java and C# constructors without duplicate call references in ${mode} mode`, async () => {
      for (const [fixture, language, name] of [
        ["java/ConstructorExample.java", "java", "ConstructorExample"],
        ["csharp/ConstructorExample.cs", "csharp", "ConstructorExample"]
      ] as const) {
        const ast = await parseFixture(fixture, language, mode);
        const nodes = flatten(ast.root);
        const constructor = nodes.find((node) => node.kind === "constructor");
        const graph = buildSymbolGraph([ast]);

        expect(constructor?.name).toBe(name);
        expect(constructor?.metadata.declarationKind).toBe("constructor");
        expect(constructor?.metadata.declarationSpan).toBeTruthy();
        expect(graph.declarations.some((declaration) => declaration.kind === "constructor" && declaration.name === name)).toBe(
          true
        );
        expect(graph.references.some((reference) => reference.name === name)).toBe(false);
      }
    });

    it(`extracts C# properties and nests their calls in ${mode} mode`, async () => {
      const ast = await parseFixture("csharp/Properties.cs", "csharp", mode);
      const type = findNode(ast.root, "type", "Properties");
      const displayName = findNode(ast.root, "property", "DisplayName");

      expect(type?.children.some((node) => node.kind === "property" && node.name === "Name")).toBe(true);
      expect(type?.children.some((node) => node.kind === "property" && node.name === "Count")).toBe(true);
      expect(displayName?.children.some((node) => node.kind === "call" && node.name === "Format")).toBe(true);
    });

    it(`nests members and calls under the smallest Java container in ${mode} mode`, async () => {
      const ast = await parseFixture("java/NestedClass.java", "java", mode);
      const outer = findNode(ast.root, "type", "NestedClass");
      const inner = findNode(ast.root, "type", "Inner");
      const run = findNode(ast.root, "method", "run");

      expect(ast.version).toBe("0.2");
      expect(outer?.children.some((node) => node.kind === "method" && node.name === "increment")).toBe(true);
      expect(outer?.children).toContain(inner);
      expect(inner?.children).toContain(run);
      expect(run?.children.some((node) => node.kind === "call" && node.name === "execute")).toBe(true);
      expect(run?.metadata.container).toBe("NestedClass.Inner");
    });
  }

  it("filters call-like language keywords in heuristic mode", async () => {
    const ast = await parseCode(
      `public class KeywordExample {
         public KeywordExample() { this(); }
         public void Run() {
           if (ready()) { throw new Error(); }
           synchronized (this) { lock (gate) { nameof(value); } }
           super();
         }
       }`,
      { language: "java", parserMode: "heuristic" }
    );
    const calls = flatten(ast.root)
      .filter((node) => node.kind === "call")
      .map((node) => node.name);

    expect(calls).toContain("ready");
    expect(calls).not.toEqual(expect.arrayContaining(["if", "throw", "new", "this", "synchronized", "lock", "nameof", "super"]));
  });
});

describe("degraded and malformed input", () => {
  it("keeps explicit heuristic mode quiet", async () => {
    const ast = await parseCode("public class Empty {}", { language: "java", parserMode: "heuristic" });
    expect(ast.diagnostics.some((diagnostic) => diagnostic.code.startsWith("parser."))).toBe(false);
  });

  it("preserves an unexpected Tree-sitter fallback warning", async () => {
    const options: ParseCodeOptions = { language: "java", parserMode: "auto", filePath: "Fallback.java" };
    const ast = await parseCodeWithTreeSitter("public class Fallback {}", options, () => ({
      diagnostics: [
        {
          code: "parser.tree-sitter-unavailable",
          message: "tree-sitter unavailable; heuristic normalizer used.",
          severity: "warning",
          language: "java",
          filePath: "Fallback.java"
        }
      ]
    }));

    expect(ast.root.metadata.parser).toBe("heuristic-normalizer");
    expect(ast.diagnostics).toContainEqual(expect.objectContaining({ code: "parser.tree-sitter-unavailable", severity: "warning" }));
  });

  for (const mode of MODES) {
    it(`handles empty Java and C# files in ${mode} mode`, async () => {
      for (const language of ["java", "csharp"] as const) {
        const ast = await parseCode("", { language, parserMode: mode });
        expect(ast.root.children).toEqual([]);
        expect(ast.root.span.startIndex).toBe(0);
        expect(ast.root.span.endIndex).toBe(0);
      }
    });
  }

  it("returns partial Tree-sitter output and diagnostics for malformed input", async () => {
    const ast = await parseCode("public class Broken { public void Run() { return; } ??? }", {
      language: "csharp",
      parserMode: "tree-sitter"
    });

    expect(flatten(ast.root).some((node) => node.name === "Broken")).toBe(true);
    expect(ast.diagnostics).toContainEqual(expect.objectContaining({ code: "parser.syntax-error", severity: "warning" }));
  });

  it("returns partial heuristic output and brace diagnostics for malformed input", async () => {
    const ast = await parseCode("public class Broken { public void run() { work();", {
      language: "java",
      parserMode: "heuristic"
    });

    expect(flatten(ast.root).some((node) => node.name === "work")).toBe(true);
    expect(ast.diagnostics).toContainEqual(
      expect.objectContaining({ code: "parser.heuristic-unbalanced-braces", severity: "warning" })
    );
  });

  it("keeps compact output complete after AST nesting", async () => {
    const bundle = await parsePath("examples/legacy-mixed");
    const compact = formatBundle(bundle, "compact", "full", true);

    expect(compact).toContain("constructor CustomerService.CustomerService");
    expect(compact).toContain("method CustomerService.findCustomer");
    expect(compact).toContain("call CustomerService.findCustomer.findById");
  });
});

async function parseFixture(
  fixture: string,
  language: Language,
  parserMode: NonNullable<ParseCodeOptions["parserMode"]>
) {
  const filePath = path.join("test", "fixtures", fixture);
  const source = await fs.readFile(filePath, "utf8");
  return parseCode(source, { language, filePath, parserMode });
}

function flatten(root: CommonASTNode): CommonASTNode[] {
  return [root, ...root.children.flatMap((child) => flatten(child))];
}

function findNode(root: CommonASTNode, kind: string, name: string): CommonASTNode | undefined {
  return flatten(root).find((node) => node.kind === kind && node.name === name);
}
