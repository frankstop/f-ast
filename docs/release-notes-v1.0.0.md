# f-ast v1.0.0 Release Notes

`f-ast` is a syntax-first parser toolkit for legacy Java 6-8 and C# 5-7. It emits stable CommonAST JSON and a best-effort SymbolGraph for downstream static analysis.

## Highlights

- Tree-sitter-backed parsing for Java and C#.
- CommonAST output with stable node shape, spans, metadata, and diagnostics.
- Best-effort SymbolGraph with declarations, call references, exact-name links, containers, and categorized unresolved diagnostics.
- CLI output modes for ASTs, symbols, diagnostics, pretty JSON, compact JSON, and file output.
- JSON schema and docs for CommonAST, SymbolGraph, diagnostics, release process, roadmap, and limitations.
- Protected main branch with CI gate.

## Install

```bash
npm install @frankstop/f-ast
```

## Verify

```bash
npm run check:release
```

## Known Limits

- No compiler-grade type semantics.
- No overload resolution.
- No `.sln`, `.csproj`, Maven, or Gradle project model loading.
- External API calls remain diagnostics unless their declarations are present in the parsed corpus.
