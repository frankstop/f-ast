# f-ast v1.1.0 Release Notes

v1.1.0 shifts `f-ast` toward agent-native codebase context.

## Highlights

- Compact output is now default.
- JSON/YAML output is explicit with `--json`, `--yaml`, or `--format`.
- Profiles added: `agent`, `full`, `symbols`, `diagnostics`.
- `f-ast mcp <path>` starts local MCP server with project query tools.
- `ProbableTypeHint` adds evidence-backed syntax hints.
- `FlowGraph` adds syntax-derived execution-shape edges.

## Validation Target

```bash
npm run check
npm run release:dry-run
```

Release still uses protected PR flow. Publishing remains manual.
