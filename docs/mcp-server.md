# MCP Server

`f-ast mcp <path>` serves targeted structural context to AI agents through a
local Model Context Protocol server over stdio.

It analyzes the target once per process and serves cached project slices
through tools.

```bash
f-ast mcp examples/legacy-mixed
```

## Tools

- `project_summary`: counts files, symbols, links, flow edges, hints, diagnostics.
- `list_files`: parsed file list with language/parser metadata.
- `get_symbols`: declarations and references, filterable by `kind`, `name`, or `symbol`.
- `resolve_references`: references and links for a symbol name.
- `get_ast_slice`: CommonAST nodes by `filePath`, `symbol`, `name`, `kind`, or `nodeId`.
- `get_diagnostics`: parser/symbol diagnostics.
- `search_symbols`: substring search over declarations/references.

## Scope

MCP mode avoids dumping full AST JSON into prompts. Agents can ask for the slice
they need, such as references for `FindInvoice` or diagnostics for a file.

The server is local and stateless across launches. It does not watch files yet;
restart it after source changes.
