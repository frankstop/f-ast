import type { AnalysisBundle, CommonAST, CommonASTNode, Diagnostic, SourceSpan } from "./types.js";

export type OutputProfile = "agent" | "full" | "symbols" | "diagnostics";
export type OutputFormat = "compact" | "json" | "yaml";

export function selectProfile(bundle: AnalysisBundle, profile: OutputProfile): unknown {
  if (profile === "full") return bundle;
  if (profile === "symbols") return bundle.symbolGraph;
  if (profile === "diagnostics") return bundle.diagnostics;

  return {
    files: bundle.asts.map((ast) => ({
      filePath: ast.filePath,
      language: ast.language,
      parser: ast.root.metadata.parser,
      declarations: bundle.symbolGraph.declarations.filter((declaration) => declaration.filePath === ast.filePath).length,
      references: bundle.symbolGraph.references.filter((reference) => reference.filePath === ast.filePath).length,
      flowEdges: bundle.flowGraph.edges.filter((edge) => edge.filePath === ast.filePath).length,
      typeHints: bundle.typeHints.filter((hint) => hint.filePath === ast.filePath).length
    })),
    symbols: {
      declarations: bundle.symbolGraph.declarations.map((declaration) => ({
        kind: declaration.kind,
        name: declaration.name,
        container: declaration.container,
        filePath: declaration.filePath,
        span: declaration.span
      })),
      references: bundle.symbolGraph.references.map((reference) => ({
        kind: reference.kind,
        name: reference.name,
        container: reference.container,
        qualifier: reference.metadata.qualifier,
        resolvedDeclarationId: reference.resolvedDeclarationId,
        filePath: reference.filePath,
        span: reference.span
      }))
    },
    flow: {
      edges: bundle.flowGraph.edges.map((edge) => ({
        kind: edge.kind,
        from: edge.from,
        to: edge.to,
        filePath: edge.filePath,
        span: edge.span,
        evidence: edge.evidence
      }))
    },
    typeHints: bundle.typeHints.map((hint) => ({
      kind: hint.kind,
      target: hint.target,
      confidence: hint.confidence,
      evidence: hint.evidence,
      filePath: hint.filePath,
      span: hint.span
    })),
    diagnostics: bundle.diagnostics
  };
}

export function formatBundle(bundle: AnalysisBundle, format: OutputFormat, profile: OutputProfile, pretty: boolean): string {
  if (format === "compact") return formatCompact(bundle, profile);
  const selected = selectProfile(bundle, profile);
  if (format === "json") return `${JSON.stringify(selected, null, pretty ? 2 : 0)}\n`;
  return `${toYaml(selected)}\n`;
}

export function formatCompact(bundle: AnalysisBundle, profile: OutputProfile = "agent"): string {
  if (profile === "diagnostics") return formatDiagnostics(bundle.diagnostics);
  if (profile === "symbols") return formatSymbols(bundle);

  const lines: string[] = [
    `project files=${bundle.asts.length} decls=${bundle.symbolGraph.declarations.length} refs=${bundle.symbolGraph.references.length} links=${bundle.symbolGraph.links.length} flow=${bundle.flowGraph.edges.length} hints=${bundle.typeHints.length} diagnostics=${bundle.diagnostics.length}`
  ];

  for (const ast of bundle.asts) {
    lines.push(`file ${ast.filePath ?? "inline"} lang=${ast.language} parser=${String(ast.root.metadata.parser ?? "unknown")}`);
    for (const node of ast.root.children) {
      if (!isStructuralNode(node)) continue;
      lines.push(`${node.kind} ${qualifiedName(node)} span=${spanText(node.span)}`);
    }
  }

  lines.push(...formatSymbolLines(bundle));

  const flowLimit = profile === "full" ? bundle.flowGraph.edges.length : Math.min(bundle.flowGraph.edges.length, 80);
  for (const edge of bundle.flowGraph.edges.slice(0, flowLimit)) {
    lines.push(`edge ${edge.kind} ${edge.from ?? "?"} -> ${edge.to ?? "?"} file=${edge.filePath ?? "inline"} span=${edge.span ? spanText(edge.span) : "?"}`);
  }
  if (flowLimit < bundle.flowGraph.edges.length) lines.push(`edge ... remaining=${bundle.flowGraph.edges.length - flowLimit}`);

  for (const hint of bundle.typeHints) {
    lines.push(`hint ${hint.kind} target=${hint.target} confidence=${hint.confidence} evidence=${quote(hint.evidence)}`);
  }

  lines.push(...diagnosticLines(bundle.diagnostics));
  return `${lines.join("\n")}\n`;
}

function formatSymbols(bundle: AnalysisBundle): string {
  return `${[`symbols decls=${bundle.symbolGraph.declarations.length} refs=${bundle.symbolGraph.references.length} links=${bundle.symbolGraph.links.length}`, ...formatSymbolLines(bundle)].join("\n")}\n`;
}

function formatDiagnostics(diagnostics: Diagnostic[]): string {
  const lines = [`diagnostics count=${diagnostics.length}`, ...diagnosticLines(diagnostics)];
  return `${lines.join("\n")}\n`;
}

function formatSymbolLines(bundle: AnalysisBundle): string[] {
  const lines: string[] = [];
  for (const declaration of bundle.symbolGraph.declarations) {
    lines.push(`decl ${declaration.kind} ${qualifiedName(declaration)} file=${declaration.filePath ?? "inline"} span=${spanText(declaration.span)}`);
  }
  for (const reference of bundle.symbolGraph.references) {
    const qualifier = typeof reference.metadata.qualifier === "string" ? ` qualifier=${reference.metadata.qualifier}` : "";
    lines.push(
      `ref ${reference.kind} ${qualifiedName(reference)}${qualifier} resolved=${reference.resolvedDeclarationId ? "yes" : "no"} file=${reference.filePath ?? "inline"} span=${spanText(reference.span)}`
    );
  }
  return lines;
}

function diagnosticLines(diagnostics: Diagnostic[]): string[] {
  return diagnostics.map(
    (diagnostic) =>
      `diag ${diagnostic.code} ${diagnostic.severity} file=${diagnostic.filePath ?? "project"}${diagnostic.span ? ` span=${spanText(diagnostic.span)}` : ""} msg=${quote(diagnostic.message)}`
  );
}

function isStructuralNode(node: CommonASTNode): boolean {
  return node.kind === "type" || node.kind === "method" || node.kind === "field" || node.kind === "import" || node.kind === "call";
}

function qualifiedName(node: { name?: string; container?: string; metadata?: Record<string, unknown> }): string {
  const container = node.container ?? (typeof node.metadata?.container === "string" ? node.metadata.container : undefined);
  if (container && node.name) return `${container}.${node.name}`;
  return node.name ?? "?";
}

function spanText(span: SourceSpan): string {
  return `${span.start.row + 1}:${span.start.column + 1}-${span.end.row + 1}:${span.end.column + 1}`;
}

function quote(value: string): string {
  return JSON.stringify(value.length > 120 ? `${value.slice(0, 117)}...` : value);
}

export function toYaml(value: unknown, indent = 0): string {
  const pad = " ".repeat(indent);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return value
      .map((item) => {
        if (isScalar(item)) return `${pad}- ${yamlScalar(item)}`;
        const rendered = toYaml(item, indent + 2);
        return `${pad}-${rendered.startsWith("\n") ? rendered : `\n${rendered}`}`;
      })
      .join("\n");
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, entryValue]) => entryValue !== undefined);
    if (entries.length === 0) return "{}";
    return entries
      .map(([key, entryValue]) => {
        if (isScalar(entryValue)) return `${pad}${key}: ${yamlScalar(entryValue)}`;
        return `${pad}${key}:\n${toYaml(entryValue, indent + 2)}`;
      })
      .join("\n");
  }

  return `${pad}${yamlScalar(value)}`;
}

function isScalar(value: unknown): boolean {
  return value == null || typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

function yamlScalar(value: unknown): string {
  if (value == null) return "null";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(String(value));
}
