# Known Limitations

These are intentional limits before v1.0.

## Parser Scope

- Java and C# parsing is syntax-first.
- Tree-sitter provides source structure, not compiler semantics.
- Heuristic parsing exists only as degraded fallback when native parser packages are unavailable.

## Symbol Resolution

- Symbol links use conservative exact-name matching.
- Local file matches win over project-wide matches.
- No compiler-grade type inference.
- No overload resolution.
- External API calls remain diagnostics.

## Project Loading

- `f-ast` accepts files and directories.
- It does not yet read `.sln`, `.csproj`, Maven, or Gradle project models.
- Build-system references and dependency graphs are outside v1.0 scope.

## Corpus Confidence

- The built-in acceptance corpus is intentionally small.
- Larger external corpus runs are supported through `AST_OSS_CORPUS`, but no external corpus is vendored.
