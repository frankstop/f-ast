# Changelog

All notable project changes are recorded here cumulatively and sectioned by version.

## Unreleased

### Added

- Hierarchical CommonAST output for Tree-sitter and heuristic parsing.
- Java and C# constructor declarations.
- C# property declarations.
- Length-preserving comment and literal masking for heuristic, flow, and type-hint regexes.
- Hostile legacy demo corpus with reproducible CommonAST, SymbolGraph, and diagnostic snapshots.
- Focused regression fixtures for comments, strings, nesting, constructors, properties, malformed input, and empty files.

### Changed

- CommonAST contract and schema version are now `0.2`.
- Compact formatting recursively includes nested nodes.
- The README now presents `f-ast` as an agent context tool and documents repository-only setup.
- Package metadata, CLI help, component docs, and release notes now use the same
  agent-context positioning.

## 1.1.0

### Added

- Compact agent output is now the default CLI output.
- Explicit output flags:
  - `--json`
  - `--yaml`
  - `--format compact|json|yaml`
- Output profiles:
  - `agent`
  - `full`
  - `symbols`
  - `diagnostics`
- Local MCP server command:
  - `f-ast mcp <path>`
- MCP tools:
  - `project_summary`
  - `list_files`
  - `get_symbols`
  - `resolve_references`
  - `get_ast_slice`
  - `get_diagnostics`
  - `search_symbols`
- `ProbableTypeHint` with confidence, evidence, and span.
- `FlowGraph` and `FlowEdge` for syntax-derived:
  - `calls`
  - `reads`
  - `writes`
  - `mutates`
  - `returns`
  - `branches`
  - `loops`
  - `dependsOn`
- Docs:
  - `docs/compact-output.md`
  - `docs/mcp-server.md`
  - `docs/type-hints.md`
  - `docs/flow-graph.md`
  - `docs/release-notes-v1.1.0.md`

### Changed

- `parsePath()` bundles now include `flowGraph` and `typeHints`.
- README now centers compact default, MCP context retrieval, flow scope, and type-hint caveats.
- Release dry-run now checks docs/status against package version dynamically.
- Version is now `1.1.0`.

### Validation

- Target local gate:
  - `npm run check`
  - `npm run release:dry-run`

## 1.0.0

### Added

- v1.0.0 release notes: `docs/release-notes-v1.0.0.md`
- Local release dry run:
  - `npm run release:dry-run`
  - `scripts/release-dry-run.mjs`

### Changed

- README status now tracks `v1.0` local candidate.
- Version is now `1.0.0`.

### Validation

- Target local gate:
  - `npm run release:dry-run`

## 0.9.0

### Added

- Public API contract tests for v1-target exports:
  - `parseCode`
  - `parsePath`
  - `buildSymbolGraph`
- Package entrypoint and release-file contract tests.
- Known limitations doc: `docs/known-limitations.md`

### Changed

- README status now tracks `v0.9` local-validated release candidate.
- Version is now `0.9.0`.

### Validation

- Target local gate:
  - `npm run check:release`

## 0.8.0

### Added

- Local package hardening flow:
  - `npm run pack:smoke`
  - `npm run check:release`
  - `scripts/pack-smoke.mjs`
- Release checklist: `docs/release-checklist.md`
- V1 roadmap: `docs/v1-roadmap.md`
- `prepack` build hook so package tarballs include fresh `dist/` output.
- Version is now `0.8.0`.

### Validation

- Target local gate:
  - `npm run check`
  - `npm run pack:smoke`

## 0.7.0

### Changed

- Default parser now uses tree-sitter mapping, not regex-first extraction.
- Heuristic parser remains fallback/degraded mode.
- `SymbolGraph` no longer counts declarations as call references.
- Symbol references now include containers, such as `CustomerService.findCustomer`.
- Unresolved diagnostics are now categorized:
  - `symbol.unresolved.local`
  - `symbol.unresolved.member`
  - `symbol.unresolved.external-api`
- CLI gained output and formatting options:
  - `--diagnostics`
  - `--no-symbols`
  - `--format json`
  - `--pretty`
  - `--compact`
- CLI usage errors are stricter.
- Version is now `0.7.0`.

### Added

- CommonAST docs: `docs/common-ast.md`
- SymbolGraph docs: `docs/symbol-graph.md`
- Diagnostics docs: `docs/diagnostics.md`
- CommonAST JSON schema: `schemas/common-ast.schema.json`

### Validation

- Local `npm run check`: green.
- PR CI: green.
- Merge-to-main CI: green.
- Main protected flow worked.
