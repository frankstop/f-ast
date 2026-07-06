# FlowGraph

`FlowGraph` adds lightweight execution-shape edges over CommonAST and
SymbolGraph output.

It is syntax-derived only. It does not do compiler-grade data-flow analysis,
type resolution, overload resolution, or full control-flow graph construction.

```ts
type FlowEdgeKind =
  | "calls"
  | "reads"
  | "writes"
  | "mutates"
  | "returns"
  | "branches"
  | "loops"
  | "dependsOn";
```

## Edge Sources

- `calls`: call references from SymbolGraph.
- `reads`: qualifier reads such as `repository.findById()`.
- `writes`: assignment syntax.
- `mutates`: increment/compound assignment and common collection mutation calls.
- `returns`: `return` statements.
- `branches`: `if`, `switch`, `case`.
- `loops`: `for`, `foreach`, `while`, `do`.
- `dependsOn`: imports/usings and unresolved calls.

Regex-derived source edges run against a length-preserving view with comments
and literals masked, so fake control flow inside non-code text is ignored.

## Use

Compact output includes flow summaries so agents can see likely execution shape
without loading full AST JSON.

```bash
f-ast examples/legacy-mixed
f-ast examples/legacy-mixed --json --profile full
```

Use these edges as modernization clues, not as proof of runtime behavior.
