# f-ast v1.0.0 Release Notes

`f-ast` is an agent context tool that turns legacy Java and C# into compact
structural maps with explicit uncertainty.

Version 1.0 established the Tree-sitter parsing core, CommonAST JSON, and a
best-effort SymbolGraph used by that context layer.

## Highlights

- Tree-sitter-backed parsing for Java and C#.
- CommonAST output with stable node shape, spans, metadata, and diagnostics.
- Best-effort SymbolGraph with declarations, call references, exact-name links, containers, and categorized unresolved diagnostics.
- CLI output modes for ASTs, symbols, diagnostics, pretty JSON, compact JSON, and file output.
- JSON schema and docs for CommonAST, SymbolGraph, diagnostics, release process, roadmap, and limitations.
- Protected main branch with CI gate.

## Local setup

```bash
git clone https://github.com/frankstop/f-ast.git
cd f-ast
npm ci
```

The package is not published to the npm registry.

## Verify

```bash
npm run check:release
```

## Known Limits

- No compiler-grade type semantics.
- No overload resolution.
- No `.sln`, `.csproj`, Maven, or Gradle project model loading.
- External API calls remain diagnostics unless their declarations are present in the parsed corpus.
