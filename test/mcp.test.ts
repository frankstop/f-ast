import { describe, expect, it } from "vitest";
import { createMcpProject } from "../src/mcp.js";

describe("MCP server project tools", () => {
  it("serves cached project slices for legacy mixed example", async () => {
    const project = await createMcpProject("examples/legacy-mixed");

    expect(project.callTool("project_summary")).toMatchObject({
      files: 2,
      declarations: 11,
      references: 7
    });

    const files = project.callTool("list_files") as Array<{ language: string }>;
    expect(files.map((file) => file.language).sort()).toEqual(["csharp", "java"]);

    const symbols = project.callTool("search_symbols", { query: "invoice" }) as {
      declarations: Array<{ name: string }>;
      references: Array<{ name: string }>;
    };
    expect(symbols.declarations.some((symbol) => symbol.name === "InvoiceService")).toBe(true);

    const references = project.callTool("resolve_references", { symbol: "Audit" }) as {
      references: Array<{ name: string }>;
      links: unknown[];
    };
    expect(references.references).toHaveLength(1);
    expect(references.links).toHaveLength(1);

    const astSlice = project.callTool("get_ast_slice", { symbol: "CustomerService" }) as Array<{ kind: string }>;
    expect(astSlice.some((node) => node.kind === "type")).toBe(true);

    const diagnostics = project.callTool("get_diagnostics") as Array<{ code: string }>;
    expect(diagnostics.some((diagnostic) => diagnostic.code === "symbol.unresolved.member")).toBe(true);
  });

  it("handles MCP JSON-RPC tool calls", async () => {
    const project = await createMcpProject("examples/legacy-mixed");
    const response = project.handleMessage({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "project_summary", arguments: {} }
    });

    expect(response).toMatchObject({ jsonrpc: "2.0", id: 1 });
    const content = response?.result as { content: Array<{ text: string }> };
    expect(JSON.parse(content.content[0]?.text ?? "{}")).toMatchObject({ files: 2 });
  });
});
