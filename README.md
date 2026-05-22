# f-ast

[![CI](https://github.com/frankstop/f-ast/actions/workflows/ci.yml/badge.svg)](https://github.com/frankstop/f-ast/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](package.json)
[![Status](https://img.shields.io/badge/status-v1.0%20local--candidate-blue.svg)](https://github.com/frankstop/f-ast)

`@frankstop/f-ast` parses legacy Java 6-8 and C# 5-7 into a stable
`CommonAST` JSON shape, then builds a best-effort `SymbolGraph` for downstream
static analysis.

V1 is syntax-first, not compiler-grade. It preserves source structure, extracts
declarations and references, links obvious symbols, and reports unresolved or
degraded parsing as diagnostics.

## Use Case

Legacy codebases are difficult for AI agents to reason about at scale when the
only input is raw source text. Important structure is there, but it is buried in
files, folders, naming conventions, imports, declarations, call sites, and
language-specific syntax.

`f-ast` turns legacy Java and C# source into a machine-readable map. It converts
code into CommonAST nodes, builds a SymbolGraph, keeps source spans, and reports
unresolved references as explicit diagnostics. That gives AI agents and analysis
tools a structured view of what exists, where it lives, and how pieces appear to
connect.

The strongest use case is making legacy systems more AI-agent-friendly before
modernization work starts: inventory the code, inspect dependencies, find likely
entry points, identify unresolved edges, and give downstream tools structured
context instead of asking them to infer everything from raw text.

## Project Status

Current state: `v1.0` local release candidate.

- Public repo: `frankstop/f-ast`
- Package name: `@frankstop/f-ast`
- CLI binary: `f-ast`
- CI: typecheck, tests, build, smoke test
- Local parser support: Java and C# files/directories
- Symbol support: best-effort declarations, references, links, unresolved diagnostics
- Contract docs: CommonAST, SymbolGraph, diagnostics, JSON schema

Not included yet:

- npm publish automation
- compiler-grade type semantics
- `.sln`, `.csproj`, Maven, or Gradle project-model loading
- overload resolution or full cross-project symbol resolution

## Features

- Parse single files or directories.
- Normalize Java and C# into one `CommonAST` node shape.
- Emit AST-only, symbol-only, or combined analysis bundles.
- Build a conservative `SymbolGraph` with unresolved references visible.
- Continue on partial parser failures and return diagnostics instead of hiding them.

## Install

```bash
npm install @frankstop/f-ast
```

For local development:

```bash
git clone https://github.com/frankstop/f-ast.git
cd f-ast
npm ci
npm run check
```

## CLI Usage

```bash
f-ast examples/legacy-mixed --out analysis.json
f-ast examples/legacy-mixed --ast
f-ast examples/legacy-mixed --symbols
f-ast examples/legacy-mixed --diagnostics
```

Default output is an analysis bundle:

```json
{
  "asts": [],
  "symbolGraph": {
    "declarations": [],
    "references": [],
    "links": [],
    "diagnostics": []
  },
  "diagnostics": []
}
```

## Library Usage

```ts
import { buildSymbolGraph, parseCode, parsePath } from "@frankstop/f-ast";

const ast = await parseCode("class CustomerService {}", {
  language: "java",
  filePath: "CustomerService.java"
});

const bundle = await parsePath("examples/legacy-mixed");
const graph = buildSymbolGraph(bundle.asts);
```

## API

```ts
parseCode(input, options) -> Promise<CommonAST>
parsePath(path, options) -> Promise<AnalysisBundle>
buildSymbolGraph(asts, options) -> SymbolGraph
```

`CommonAST` uses one canonical node shape across Java and C#:

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

The symbol graph records:

- declarations: classes, methods, fields, imports/usings
- references: identifier and call-site references
- links: best-effort declaration-to-reference matches
- diagnostics: unresolved references and parser degradation

More detail:

- [CommonAST](docs/common-ast.md)
- [SymbolGraph](docs/symbol-graph.md)
- [Diagnostics](docs/diagnostics.md)
- [Release Checklist](docs/release-checklist.md)
- [V1 Roadmap](docs/v1-roadmap.md)
- [Known Limitations](docs/known-limitations.md)
- [v1.0.0 Release Notes](docs/release-notes-v1.0.0.md)
- [CommonAST JSON Schema](schemas/common-ast.schema.json)

## Development

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run test:smoke
npm run pack:smoke
npm run release:dry-run
```

`npm run check` runs the full local gate.

## License

MIT
