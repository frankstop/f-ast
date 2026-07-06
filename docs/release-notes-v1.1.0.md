# f-ast v1.1.0 Release Notes

`f-ast` is an agent context tool that turns legacy Java and C# into compact
structural maps with explicit uncertainty.

Version 1.1 made that context easier for agents to retrieve and consume.

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

Release still uses protected PR flow. No npm registry publication was
performed.
