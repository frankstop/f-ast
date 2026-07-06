# CommonAST

CommonAST is the stable syntax contract for `f-ast`.

Every parsed Java or C# file becomes:

```ts
type CommonAST = {
  version: "0.2";
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

## Node Kinds

- `compilationUnit`
- `import`
- `type`
- `field`
- `property`
- `constructor`
- `method`
- `call`

`children` is structural in version `0.2`: types contain nested types and members,
while methods, constructors, and properties contain their mapped calls.

`span` identifies the declaration or reference name. Declarations also include
their full source range in `metadata.declarationSpan`.

`metadata.sourceNodeType` preserves the original tree-sitter node type.
`metadata.container` preserves the qualified parent path. `metadata.parser` on
the root is `tree-sitter` in normal mode and `heuristic-normalizer` only when
degraded fallback is used.

## Compatibility

The JSON schema lives at `schemas/common-ast.schema.json`. Version `0.2` marks
the change from a flat mapped-node list to meaningful parent-child hierarchy.
