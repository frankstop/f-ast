# f-ast

[![CI](https://github.com/frankstop/f-ast/actions/workflows/ci.yml/badge.svg)](https://github.com/frankstop/f-ast/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](package.json)
[![Status](https://img.shields.io/badge/status-v1.1%20agent--context%20tool-blue.svg)](https://github.com/frankstop/f-ast)

Agent context tool that turns legacy Java and C# into compact structural maps
with explicit uncertainty.

`f-ast` currently targets Java 6–8 and C# 5–7.

The maps include hierarchical `CommonAST`, a best-effort `SymbolGraph`,
syntax-derived flow edges, probable type hints, and diagnostics.

Normal parsing uses Tree-sitter. A masked regex normalizer provides degraded
fallback output when the native parser is unavailable. The results are useful
clues for code exploration, not compiler or language-server truth.

## Why this exists

Large legacy codebases are hard to summarize for AI agents because raw source
files are noisy and context windows are limited.

`f-ast` creates compact structural maps that help an agent answer questions
like:

- What classes, constructors, properties, fields, and methods exist?
- Which declarations contain which calls?
- Which files appear related?
- Where are likely dependencies?
- What parts of the codebase look risky or uncertain?
- What should a human inspect before modernization?

It is designed as a code-understanding aid, not a replacement for a compiler or
language server.

## What it produces

- A hierarchical `CommonAST` shared by Java and C#.
- Constructors for both languages and C# properties as first-class declarations.
- A conservative symbol index with unresolved references left visible.
- Lightweight calls, reads, writes, mutations, returns, branches, loops, and dependency edges.
- Evidence-backed probable type hints.
- Diagnostics for syntax errors, parser fallback, unresolved calls, and partial heuristic structure.
- Compact output for agents, full JSON/YAML output, and local MCP query tools.

## Proof demo

[`examples/legacy-messy-sample`](examples/legacy-messy-sample) deliberately
contains:

- fake imports, declarations, and calls inside comments and strings
- Java annotations and C# properties
- constructors, overloads, and nested classes
- malformed Java and C# files that still produce partial output

The committed outputs show the full path from messy input to an imperfect but
useful map:

- [CommonAST output](examples/legacy-messy-sample/output/commonast.json)
- [SymbolGraph output](examples/legacy-messy-sample/output/symbolgraph.json)
- [Diagnostics output](examples/legacy-messy-sample/output/diagnostics.json)

Regenerate and verify them with:

```bash
npm run demo:snapshots
npm test
```

## Project status

Current repository version: `v1.1`.

- Public repository: `frankstop/f-ast`
- Package identifier in source: `@frankstop/f-ast`
- CLI binary name: `f-ast`
- CI gate: typecheck, tests, build, and smoke test
- Default parser: Tree-sitter
- Degraded fallback: masked heuristic normalizer
- Inputs: individual `.java`/`.cs` files or directories
- Outputs: compact text, JSON, YAML, or local MCP responses

The package is not published to the npm registry. Use the repository setup
below.

## Local setup

```bash
git clone https://github.com/frankstop/f-ast.git
cd f-ast
npm ci
npm run check
```

Run the local CLI after building:

```bash
npm run build
node bin/f-ast.js examples/legacy-mixed
node bin/f-ast.js examples/legacy-mixed --json --profile full --out analysis.json
node bin/f-ast.js examples/legacy-mixed --symbols
node bin/f-ast.js examples/legacy-mixed --diagnostics
node bin/f-ast.js mcp examples/legacy-mixed
```

Default output is compact:

```text
project files=2 decls=13 refs=7 links=2 flow=26 hints=5 diagnostics=5
file examples/legacy-mixed/java/CustomerService.java lang=java parser=tree-sitter
type CustomerService span=5:14-5:29
constructor CustomerService.CustomerService span=8:12-8:27
method CustomerService.findCustomer span=12:21-12:33
call CustomerService.findCustomer.findById span=13:40-13:48
diag symbol.unresolved.member warning file=... msg="Unresolved call reference 'findById' on 'repository'."
```

Output profiles:

- `agent`: compact structural map, default
- `full`: CommonAST, SymbolGraph, FlowGraph, type hints, and diagnostics
- `symbols`: symbols only
- `diagnostics`: diagnostics only

## Library usage

After installing the repository or generated tarball as a local dependency:

```ts
import { buildSymbolGraph, parseCode, parsePath } from "@frankstop/f-ast";

const ast = await parseCode("class CustomerService {}", {
  language: "java",
  filePath: "CustomerService.java"
});

const bundle = await parsePath("examples/legacy-mixed");
const graph = buildSymbolGraph(bundle.asts);
```

The public API is:

```ts
parseCode(input, options) -> Promise<CommonAST>
parsePath(path, options) -> Promise<AnalysisBundle>
buildSymbolGraph(asts, options) -> SymbolGraph
buildFlowGraph(asts, symbolGraph, sources?) -> FlowGraph
```

`CommonAST` version `0.2` uses one recursive node shape across languages:

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

`span` identifies the declaration or reference name. Declarations also expose
their full source range as `metadata.declarationSpan`. `metadata.container`
retains the qualified parent path used by compact output and symbol consumers.

## Boundaries

`f-ast` does not currently provide:

- compiler-grade type semantics
- overload resolution
- complete cross-project symbol resolution
- `.sln`, `.csproj`, Maven, or Gradle project-model loading
- guaranteed recovery for every malformed file
- automatic MCP cache refresh when files change

More detail:

- [CommonAST](docs/common-ast.md)
- [SymbolGraph](docs/symbol-graph.md)
- [Diagnostics](docs/diagnostics.md)
- [Compact Output](docs/compact-output.md)
- [MCP Server](docs/mcp-server.md)
- [Type Hints](docs/type-hints.md)
- [FlowGraph](docs/flow-graph.md)
- [Known Limitations](docs/known-limitations.md)
- [Release Checklist](docs/release-checklist.md)
- [CommonAST JSON Schema](schemas/common-ast.schema.json)

## Development

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run test:smoke
npm run pack:smoke
npm run demo:snapshots
```

`npm run check` runs the main local gate.

## License

MIT
