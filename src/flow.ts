import { spanFromIndexes } from "./sourceSpans.js";
import type { CommonAST, FlowEdge, FlowEdgeKind, FlowGraph, SourceSpan, SymbolGraph } from "./types.js";

type SourceMap = Map<string, string>;

export function buildFlowGraph(asts: CommonAST[], symbolGraph: SymbolGraph, sources: SourceMap = new Map()): FlowGraph {
  const edges: FlowEdge[] = [];
  let ordinal = 0;

  for (const reference of symbolGraph.references) {
    if (reference.kind !== "call") continue;
    const qualifier = typeof reference.metadata.qualifier === "string" ? reference.metadata.qualifier : undefined;
    const from = reference.container ?? reference.filePath ?? "unknown";
    const to = qualifier ? `${qualifier}.${reference.name}` : reference.name;

    edges.push(
      edge(ordinal++, "calls", reference.language, reference.filePath, from, to, reference.span, reference.nodeId, to, {
        referenceId: reference.id,
        resolvedDeclarationId: reference.resolvedDeclarationId
      })
    );

    if (qualifier) {
      edges.push(
        edge(ordinal++, "reads", reference.language, reference.filePath, from, qualifier, reference.span, reference.nodeId, qualifier, {
          referenceId: reference.id
        })
      );
    }

    if (!reference.resolvedDeclarationId) {
      edges.push(
        edge(ordinal++, "dependsOn", reference.language, reference.filePath, from, to, reference.span, reference.nodeId, to, {
          referenceId: reference.id,
          reason: "unresolved-call"
        })
      );
    }
  }

  for (const declaration of symbolGraph.declarations) {
    if (declaration.kind !== "import") continue;
    edges.push(
      edge(
        ordinal++,
        "dependsOn",
        declaration.language,
        declaration.filePath,
        declaration.filePath ?? "project",
        declaration.name,
        declaration.span,
        declaration.nodeId,
        declaration.name,
        { declarationId: declaration.id, reason: "import" }
      )
    );
  }

  for (const ast of asts) {
    const source = ast.filePath ? sources.get(ast.filePath) : undefined;
    if (!source) continue;
    ordinal = addSourceEdges(edges, ordinal, ast, source);
  }

  return { edges, diagnostics: [] };
}

function addSourceEdges(edges: FlowEdge[], ordinal: number, ast: CommonAST, source: string): number {
  const file = ast.filePath ?? "inline";
  const language = ast.language;

  const sourceRules: Array<{ kind: FlowEdgeKind; pattern: RegExp; target: (match: RegExpExecArray) => string }> = [
    { kind: "writes", pattern: /(^|[^=!<>])\b([A-Za-z_][\w.]*)\s*=(?!=)/gm, target: (match) => match[2] ?? match[0].trim() },
    {
      kind: "mutates",
      pattern: /\b([A-Za-z_][\w.]*)\s*(\+\+|--|\+=|-=|\*=|\/=)|\b([A-Za-z_][\w.]*)\.(add|Add|remove|Remove|clear|Clear|put|Put|set|Set)\s*\(/g,
      target: (match) => match[1] ?? match[3] ?? match[0].trim()
    },
    { kind: "returns", pattern: /\breturn\b/g, target: () => "return" },
    { kind: "branches", pattern: /\b(if|switch|case)\b/g, target: (match) => match[1] ?? "branch" },
    { kind: "loops", pattern: /\b(for|foreach|while|do)\b/g, target: (match) => match[1] ?? "loop" }
  ];

  for (const rule of sourceRules) {
    for (const match of source.matchAll(rule.pattern)) {
      const raw = match[0] ?? "";
      const leading = rule.kind === "writes" ? raw.search(/\b[A-Za-z_]/) : 0;
      const start = (match.index ?? 0) + Math.max(leading, 0);
      const end = start + raw.trimStart().length;
      const to = rule.target(match);
      edges.push(edge(ordinal++, rule.kind, language, ast.filePath, file, to, spanFromIndexes(source, start, end), undefined, raw.trim()));
    }
  }

  return ordinal;
}

function edge(
  ordinal: number,
  kind: FlowEdgeKind,
  language: CommonAST["language"],
  filePath: string | undefined,
  from: string | undefined,
  to: string | undefined,
  span: SourceSpan | undefined,
  nodeId: string | undefined,
  evidence: string,
  metadata: Record<string, unknown> = {}
): FlowEdge {
  const filePart = filePath ? filePath.replaceAll(/[^A-Za-z0-9_.-]+/g, "_") : "inline";
  return {
    id: `flow:${filePart}:${kind}:${ordinal}`,
    kind,
    from,
    to,
    language,
    filePath,
    nodeId,
    span,
    evidence,
    metadata
  };
}
