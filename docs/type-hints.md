# Probable Type Hints

`ProbableTypeHint` records syntax-derived guesses that help agents reason about
legacy code without a full compiler project model.

Hints are not type truth. They are evidence-backed observations.

```ts
type ProbableTypeHint = {
  kind: "collection-ish" | "iterable-ish" | "object-shape";
  target: string;
  confidence: "low" | "medium";
  evidence: string;
  span?: SourceSpan;
};
```

## Current Inference

- `.Count`, `.Length`, `.size()` -> `collection-ish`
- `foreach` and Java enhanced `for` syntax -> `iterable-ish`
- member calls such as `repository.findById()` -> `object-shape`

## Rules

- Infer only from syntax usage.
- Include source span when available.
- Preserve unresolved diagnostics beside hints.
- Ignore evidence that appears only inside comments or literals.
- Never present hints as compiler-grade resolution.

Example: an unresolved `repository.findById()` can produce both an unresolved
symbol diagnostic and an `object-shape` hint for `repository`.
