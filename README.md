# f-ast

[![CI](https://github.com/frankstop/f-ast/actions/workflows/ci.yml/badge.svg)](https://github.com/frankstop/f-ast/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](package.json)
[![Status](https://img.shields.io/badge/status-v1.1%20agent--upgrade-blue.svg)](https://github.com/frankstop/f-ast)

`@frankstop/f-ast` parses legacy Java 6-8 and C# 5-7 into compact agent maps,
`CommonAST`, best-effort `SymbolGraph`, syntax-derived `FlowGraph`, and
probable type hints.

V1 is syntax-first, not compiler-grade. It preserves source structure, extracts
declarations and references, links obvious symbols, surfaces lightweight flow
edges, and reports unresolved or degraded parsing as diagnostics.

## Use Case

Legacy codebases are difficult for AI agents to reason about at scale when the
only input is raw source text. Important structure is there, but it is buried in
files, folders, naming conventions, imports, declarations, call sites, and
language-specific syntax.

`f-ast` turns legacy Java and C# source into a machine-readable map. Instead of
forcing an agent to hold raw source or token-heavy AST JSON, it can provide a
compact structural view first: files, declarations, references, unresolved
edges, likely flow, and probable object shapes.

The strongest use case is making legacy systems more AI-agent-friendly before
modernization work starts. Use `f-ast` to inventory code, inspect dependencies,
find likely entry points, identify unresolved edges, and feed downstream tools a
map they can query instead of a pile of text they must rediscover.

## Project Status

Current state: `v1.1` agent upgrade candidate.

- Public repo: `frankstop/f-ast`
- Package name: `@frankstop/f-ast`
- CLI binary: `f-ast`
- CI: typecheck, tests, build, smoke test
- Local parser support: Java and C# files/directories
- Symbol support: best-effort declarations, references, links, unresolved diagnostics
- Agent output: compact default, JSON/YAML explicit
- MCP server: local query tools for dynamic context retrieval
- Flow support: syntax-derived calls, reads, writes, mutates, returns, branches, loops, dependencies
- Type hints: syntax-derived probable hints, never compiler truth
- Contract docs: CommonAST, SymbolGraph, diagnostics, JSON schema

Not included yet:

- npm publish automation
- compiler-grade type semantics
- `.sln`, `.csproj`, Maven, or Gradle project-model loading
- overload resolution or full cross-project symbol resolution
- file watching for MCP server cache refresh

## Features

- Parse single files or directories.
- Normalize Java and C# into one `CommonAST` node shape.
- Emit compact agent maps by default.
- Emit JSON or YAML with explicit flags.
- Serve project context through a local MCP server.
- Build a conservative `SymbolGraph` with unresolved references visible.
- Add syntax-derived `FlowGraph` edges.
- Add probable type hints with confidence and evidence.
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
f-ast examples/legacy-mixed
f-ast examples/legacy-mixed --json --profile full --out analysis.json
f-ast examples/legacy-mixed --yaml --profile agent
f-ast examples/legacy-mixed --symbols
f-ast examples/legacy-mixed --diagnostics
f-ast mcp examples/legacy-mixed
```

Default output is compact:

```text
project files=2 decls=11 refs=7 links=2 flow=26 hints=5 diagnostics=5
file examples/legacy-mixed/java/CustomerService.java lang=java parser=tree-sitter
decl class CustomerService file=examples/legacy-mixed/java/CustomerService.java span=5:14-5:29
ref call CustomerService.findCustomer.findById qualifier=repository resolved=no file=...
edge calls CustomerService.findCustomer -> repository.findById file=...
diag symbol.unresolved.member warning file=... msg="Unresolved call reference 'findById' on 'repository'."
```

Profiles:

- `agent`: compact structural map, default
- `full`: full CommonAST + SymbolGraph + FlowGraph + type hints + diagnostics
- `symbols`: symbols only
- `diagnostics`: diagnostics only

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
buildFlowGraph(asts, symbolGraph, sources?) -> FlowGraph
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

The flow graph records syntax-derived edges only:

- calls, reads, writes, mutates, returns, branches, loops, dependsOn

Probable type hints are evidence-backed syntax observations:

- collection-ish from `.Count`, `.Length`, `.size()`
- iterable-ish from `foreach` / enhanced `for`
- object-shape from member calls

Hints are useful for agents, but they are not compiler truth.

More detail:

- [CommonAST](docs/common-ast.md)
- [SymbolGraph](docs/symbol-graph.md)
- [Diagnostics](docs/diagnostics.md)
- [Compact Output](docs/compact-output.md)
- [MCP Server](docs/mcp-server.md)
- [Type Hints](docs/type-hints.md)
- [FlowGraph](docs/flow-graph.md)
- [Release Checklist](docs/release-checklist.md)
- [V1 Roadmap](docs/v1-roadmap.md)
- [Known Limitations](docs/known-limitations.md)
- [v1.1.0 Release Notes](docs/release-notes-v1.1.0.md)
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
