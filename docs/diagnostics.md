# Diagnostics

Diagnostics make degraded or unresolved analysis visible.

```ts
type Diagnostic = {
  code: string;
  message: string;
  severity: "info" | "warning" | "error";
  filePath?: string;
  language?: "java" | "csharp";
  span?: SourceSpan;
};
```

## Exit Codes

- `0`: success, including warnings
- `1`: fatal analysis errors
- `2`: invalid CLI usage or config

## Current Codes

- `parser.syntax-error`: tree-sitter parsed source with syntax errors
- `parser.tree-sitter-unavailable`: native parser unavailable, heuristic fallback used
- `parser.mode-unavailable`: tree-sitter mode requested but unavailable
- `language.unknown`: file language could not be inferred
- `input.unsupported-file`: unsupported file extension
- `input.unsupported-path`: unsupported input path type
- `io.stat-failed`: input path could not be inspected
- `io.read-failed`: source file could not be read
- `symbol.unresolved.local`: unqualified call could not be resolved locally
- `symbol.unresolved.member`: member call could not be resolved
- `symbol.unresolved.external-api`: likely platform/library API outside current corpus
