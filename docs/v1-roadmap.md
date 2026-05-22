# V1 Roadmap

## 0.8 Package Hardening

- Add package tarball smoke test.
- Verify fresh install import + CLI execution.
- Add release checklist.
- Keep `npm run check` as full local gate.

## 0.9 Release Candidate

- Freeze public API names for v1:
  - `parseCode`
  - `parsePath`
  - `buildSymbolGraph`
  - `CommonAST`
  - `SymbolGraph`
- Freeze CLI output modes.
- Review docs against behavior.
- Run acceptance test against at least one external Java/C# corpus.
- Record known limitations in README and changelog.

Local status:

- API names are covered by tests.
- Package entrypoints and release file list are covered by tests.
- Known limitations are documented.
- External corpus remains optional via `AST_OSS_CORPUS`; no corpus is vendored.

## 1.0 Stable Release

- Publish npm package.
- Tag `v1.0.0`.
- Create GitHub release.
- Keep `main` protected.
- Require green CI for release commit.

Local status:

- v1.0 release notes exist.
- Dry-run release guard exists.
- Publishing/tagging remains manual and should happen only after PR CI is green on protected `main`.

## Non-Goals Before 1.0

- Compiler-grade type semantics.
- Overload resolution.
- Full `.sln`, `.csproj`, Maven, or Gradle project loading.
