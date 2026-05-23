import readline from "node:readline";
import { parsePath } from "./parser.js";
import type { AnalysisBundle, CommonASTNode, ParsePathOptions } from "./types.js";

type JsonRpcRequest = {
  jsonrpc?: "2.0";
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
};

type McpTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export type McpProject = {
  bundle: AnalysisBundle;
  callTool(name: string, args?: Record<string, unknown>): unknown;
  handleMessage(message: JsonRpcRequest): Record<string, unknown> | undefined;
};

const tools: McpTool[] = [
  tool("project_summary", "Return file, symbol, flow, hint, and diagnostic counts."),
  tool("list_files", "List parsed Java/C# source files."),
  tool("get_symbols", "Return declarations and references, optionally filtered by kind/name."),
  tool("resolve_references", "Return references and links for a symbol name.", { symbol: { type: "string" } }),
  tool("get_ast_slice", "Return AST nodes filtered by file, symbol, kind, or node id."),
  tool("get_diagnostics", "Return parser and symbol diagnostics."),
  tool("search_symbols", "Search declarations/references by substring.", { query: { type: "string" } })
];

export async function createMcpProject(targetPath: string, options: ParsePathOptions = {}): Promise<McpProject> {
  const bundle = await parsePath(targetPath, options);

  return {
    bundle,
    callTool(name, args = {}) {
      return callTool(bundle, name, args);
    },
    handleMessage(message) {
      return handleJsonRpc(bundle, message);
    }
  };
}

export async function startMcpServer(targetPath: string, options: ParsePathOptions = {}): Promise<void> {
  const project = await createMcpProject(targetPath, options);
  const rl = readline.createInterface({ input: process.stdin, crlfDelay: Number.POSITIVE_INFINITY });

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const response = project.handleMessage(JSON.parse(line) as JsonRpcRequest);
      if (response) process.stdout.write(`${JSON.stringify(response)}\n`);
    } catch (error) {
      process.stdout.write(
        `${JSON.stringify({
          jsonrpc: "2.0",
          id: null,
          error: { code: -32700, message: error instanceof Error ? error.message : String(error) }
        })}\n`
      );
    }
  }
}

function handleJsonRpc(bundle: AnalysisBundle, message: JsonRpcRequest): Record<string, unknown> | undefined {
  const id = message.id ?? null;
  if (!message.id && message.method?.startsWith("notifications/")) return undefined;

  if (message.method === "initialize") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "f-ast", version: "1.1.0" }
      }
    };
  }

  if (message.method === "tools/list") {
    return { jsonrpc: "2.0", id, result: { tools } };
  }

  if (message.method === "tools/call") {
    const params = message.params ?? {};
    const name = typeof params.name === "string" ? params.name : "";
    const args = (params.arguments && typeof params.arguments === "object" ? params.arguments : {}) as Record<string, unknown>;
    const result = callTool(bundle, name, args);
    return {
      jsonrpc: "2.0",
      id,
      result: {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
      }
    };
  }

  return { jsonrpc: "2.0", id, error: { code: -32601, message: `Unsupported MCP method '${message.method ?? ""}'.` } };
}

function callTool(bundle: AnalysisBundle, name: string, args: Record<string, unknown>): unknown {
  if (name === "project_summary") {
    return {
      files: bundle.asts.length,
      declarations: bundle.symbolGraph.declarations.length,
      references: bundle.symbolGraph.references.length,
      links: bundle.symbolGraph.links.length,
      flowEdges: bundle.flowGraph.edges.length,
      typeHints: bundle.typeHints.length,
      diagnostics: bundle.diagnostics.length
    };
  }

  if (name === "list_files") {
    return bundle.asts.map((ast) => ({
      filePath: ast.filePath,
      language: ast.language,
      parser: ast.root.metadata.parser,
      declarations: bundle.symbolGraph.declarations.filter((declaration) => declaration.filePath === ast.filePath).length,
      references: bundle.symbolGraph.references.filter((reference) => reference.filePath === ast.filePath).length
    }));
  }

  if (name === "get_symbols") {
    const kind = typeof args.kind === "string" ? args.kind : undefined;
    const symbol = typeof args.name === "string" ? args.name : typeof args.symbol === "string" ? args.symbol : undefined;
    return {
      declarations: bundle.symbolGraph.declarations.filter(
        (declaration) => (!kind || declaration.kind === kind) && (!symbol || declaration.name === symbol)
      ),
      references: bundle.symbolGraph.references.filter(
        (reference) => (!kind || reference.kind === kind) && (!symbol || reference.name === symbol)
      )
    };
  }

  if (name === "resolve_references") {
    const symbol = String(args.symbol ?? args.name ?? "");
    const references = bundle.symbolGraph.references.filter((reference) => reference.name === symbol || reference.metadata.qualifier === symbol);
    const referenceIds = new Set(references.map((reference) => reference.id));
    return {
      symbol,
      references,
      links: bundle.symbolGraph.links.filter((link) => referenceIds.has(link.referenceId))
    };
  }

  if (name === "get_ast_slice") {
    const filePath = typeof args.filePath === "string" ? args.filePath : undefined;
    const symbol = typeof args.symbol === "string" ? args.symbol : typeof args.name === "string" ? args.name : undefined;
    const kind = typeof args.kind === "string" ? args.kind : undefined;
    const nodeId = typeof args.nodeId === "string" ? args.nodeId : undefined;
    return bundle.asts.flatMap((ast) => {
      if (filePath && ast.filePath !== filePath && !ast.filePath?.endsWith(filePath)) return [];
      return flattenNodes(ast.root).filter(
        (node) => (!nodeId || node.id === nodeId) && (!symbol || node.name === symbol) && (!kind || node.kind === kind)
      );
    });
  }

  if (name === "get_diagnostics") return bundle.diagnostics;

  if (name === "search_symbols") {
    const query = String(args.query ?? "").toLowerCase();
    return {
      declarations: bundle.symbolGraph.declarations.filter((declaration) => declaration.name.toLowerCase().includes(query)),
      references: bundle.symbolGraph.references.filter((reference) => reference.name.toLowerCase().includes(query))
    };
  }

  throw new Error(`Unknown MCP tool '${name}'.`);
}

function flattenNodes(root: CommonASTNode): CommonASTNode[] {
  return [root, ...root.children.flatMap((child) => flattenNodes(child))];
}

function tool(name: string, description: string, properties: Record<string, unknown> = {}): McpTool {
  return {
    name,
    description,
    inputSchema: {
      type: "object",
      properties,
      additionalProperties: true
    }
  };
}
