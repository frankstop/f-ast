# SymbolGraph

SymbolGraph is a best-effort index over one or more CommonAST files.

```ts
type SymbolGraph = {
  declarations: SymbolDeclaration[];
  references: SymbolReference[];
  links: SymbolLink[];
  diagnostics: Diagnostic[];
};
```

## Declarations

V0.7 extracts:

- imports/usings
- classes, interfaces, enums
- fields
- methods

## References

V0.7 extracts actual call sites from tree-sitter invocation nodes. Declarations are not counted as call references.

## Links

Links are conservative exact-name matches. Local file matches win over project-wide matches.

Confidence values:

- `exact-local`
- `exact-project`

## Limits

V0.7 does not do compiler-grade type semantics, overload resolution, or build-system-aware project loading. External API calls and unresolved member calls remain visible as diagnostics.
