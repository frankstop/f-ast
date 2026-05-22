# CommonAST

CommonAST is the stable syntax contract for `f-ast`.

Every parsed Java or C# file becomes:

```ts
type CommonAST = {
  version: "0.1";
  language: "java" | "csharp";
  filePath?: string;
  root: CommonASTNode;
  diagnostics: Diagnostic[];
};
```

Each node has the same shape across languages:

```ts
type CommonASTNode = {
  id: string;
  kind: string;
  name?: string;
  language: "java" | "csharp";
  span: SourceSpan;
  children: CommonASTNode[];
  metadata: Record<string, unknown>;
};
```

## V0.7 Node Kinds

- `compilationUnit`
- `import`
- `type`
- `field`
- `method`
- `call`

`metadata.sourceNodeType` preserves the original tree-sitter node type. `metadata.parser` on the root is `tree-sitter` in normal mode and `heuristic-normalizer` only when degraded fallback is used.

## Compatibility

The JSON schema lives at `schemas/common-ast.schema.json`. Until v1.0, schema version remains `0.1` while the project hardens behavior around this shape.
