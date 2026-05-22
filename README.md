# AST

`@frankstop/f-ast` parses legacy Java 6-8 and C# 5-7 into a stable `CommonAST`
JSON shape, then builds a best-effort `SymbolGraph` for downstream analysis.

V1 is not a compiler. It preserves source structure, extracts declarations and
references, links obvious symbols, and reports unresolved or degraded parsing as
diagnostics instead of hiding them.

## Install

```bash
npm install @frankstop/f-ast
```

## CLI

```bash
f-ast examples/legacy-mixed --out analysis.json
f-ast examples/legacy-mixed --ast
f-ast examples/legacy-mixed --symbols
```

Default output is an analysis bundle:

```json
{
  "asts": [],
  "symbolGraph": {
    "declarations": [],
    "references": [],
    "links": []
  },
  "diagnostics": []
}
```

## Library

```ts
import { buildSymbolGraph, parseCode, parsePath } from "@frankstop/f-ast";

const ast = await parseCode("class CustomerService {}", {
  language: "java",
  filePath: "CustomerService.java"
});

const bundle = await parsePath("examples/legacy-mixed");
const graph = buildSymbolGraph(bundle.asts);
```

## CommonAST

Each node uses one canonical shape across Java and C#:

```ts
type CommonASTNode = {
  id: string;
  kind: string;
  name?: string;
  language: "java" | "csharp";
  span: SourceSpan;
  children: CommonASTNode[];
  metadata: Record<string, unknown>;
};
```

## SymbolGraph

The symbol graph records:

- declarations: classes, methods, fields, imports/usings
- references: identifier and call-site references
- links: best-effort declaration-to-reference matches
- diagnostics: unresolved references and parser degradation

Resolution is intentionally conservative. Ambiguous or unknown references stay
visible as diagnostics.

## Development

```bash
npm install
npm run check
```

## Scope

Included in v1:

- file and directory input
- Java 6-8 and C# 5-7 syntax-oriented parsing
- stable JSON output for AST and symbols
- partial output with diagnostics

Deferred:

- compiler-grade type semantics
- full `.sln`, `.csproj`, Maven, or Gradle build interpretation
- overload resolution
