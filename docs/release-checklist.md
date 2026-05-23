# Release Checklist

Use this before tagging or publishing.

## Local Gate

```bash
npm ci
npm run check:release
npm run release:dry-run
```

## GitHub Gate

- Work happens on a branch.
- Pull request CI `test` passes.
- `main` remains protected.
- Merge only through PR.

## Package Gate

- `npm pack --json` contains:
  - `bin/f-ast.js`
  - `dist/src/index.js`
  - `dist/src/index.d.ts`
  - `docs/`
  - `schemas/`
  - `README.md`
  - `LICENSE`
- Fresh temp install can:
  - import `@frankstop/f-ast`
  - run `f-ast`
  - parse Java/C# fixture input

## Current Version Gate

- Changelog has current version section.
- README status badge matches package version.
- Known limitations are documented.
- Compact output, MCP, type hints, and flow docs are present.
- No P1/P2 bugs open.
- Release tag points at green `main`.
- `npm publish` is manual until release automation exists.
