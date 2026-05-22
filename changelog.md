# Changelog

All notable project changes are recorded here cumulatively and sectioned by version.

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
