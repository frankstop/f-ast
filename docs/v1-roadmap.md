# Project Roadmap

`f-ast` is an agent context tool that turns legacy Java and C# into compact
structural maps with explicit uncertainty.

## Completed foundation

- `0.8`: package smoke testing, release checks, and tarball validation.
- `0.9`: public API contract tests and documented limitations.
- `1.0`: Tree-sitter parsing, CommonAST, SymbolGraph, diagnostics, and protected CI.
- `1.1`: compact agent output, MCP queries, FlowGraph, and probable type hints.

## Current hardening

- CommonAST `0.2` hierarchy.
- Java and C# constructors.
- C# properties.
- Comment and literal masking for regex-derived analysis.
- Hostile demo inputs with deterministic expected outputs.
- Proof tests for malformed and degraded parsing.

## Next validation

- Run against larger external Java and C# corpora.
- Measure output size and retrieval usefulness on real legacy repositories.
- Add project-model loading only when it improves structural context.
- Decide whether npm registry publication is useful after the repository
  contract is stable.

## Release model

The source repository and generated tarball are locally installable. The package
is not published to the npm registry.

Changes reach protected `main` through pull requests with the required `test`
check.

## Non-goals

- Compiler-grade type semantics.
- Overload resolution.
- Complete cross-project symbol resolution.
- Full `.sln`, `.csproj`, Maven, or Gradle behavior.
