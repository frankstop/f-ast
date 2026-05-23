import { spanFromIndexes } from "./sourceSpans.js";
import type { CommonAST, ProbableTypeHint, ProbableTypeHintKind, SymbolGraph } from "./types.js";

type SourceMap = Map<string, string>;

export function inferProbableTypeHints(
  asts: CommonAST[],
  symbolGraph: SymbolGraph,
  sources: SourceMap = new Map()
): ProbableTypeHint[] {
  const hints: ProbableTypeHint[] = [];
  let ordinal = 0;

  for (const ast of asts) {
    const source = ast.filePath ? sources.get(ast.filePath) : undefined;
    if (!source) continue;

    for (const match of source.matchAll(/\b([A-Za-z_][\w.]*)\.(Count|Length)\b|\b([A-Za-z_][\w.]*)\.size\s*\(/g)) {
      const target = match[1] ?? match[3];
      if (!target) continue;
      hints.push(
        hint(
          ordinal++,
          "collection-ish",
          target,
          ast,
          "medium",
          match[0] ?? target,
          spanFromIndexes(source, match.index ?? 0, (match.index ?? 0) + (match[0]?.length ?? target.length)),
          { reason: "collection-member-access" }
        )
      );
    }

    for (const match of source.matchAll(/\bforeach\s*\([^)]*\bin\s+([A-Za-z_][\w.]*)\)|\bfor\s*\([^;()]+:\s*([A-Za-z_][\w.]*)\s*\)/g)) {
      const target = match[1] ?? match[2];
      if (!target) continue;
      hints.push(
        hint(
          ordinal++,
          "iterable-ish",
          target,
          ast,
          "medium",
          match[0] ?? target,
          spanFromIndexes(source, match.index ?? 0, (match.index ?? 0) + (match[0]?.length ?? target.length)),
          { reason: "iteration-syntax" }
        )
      );
    }
  }

  const seenShapeHints = new Set<string>();
  for (const reference of symbolGraph.references) {
    if (reference.kind !== "call") continue;
    const qualifier = typeof reference.metadata.qualifier === "string" ? reference.metadata.qualifier : undefined;
    if (!qualifier) continue;
    const key = `${reference.filePath ?? ""}:${qualifier}:${reference.name}`;
    if (seenShapeHints.has(key)) continue;
    seenShapeHints.add(key);

    hints.push(
      hint(
        ordinal++,
        "object-shape",
        qualifier,
        { language: reference.language, filePath: reference.filePath },
        reference.resolvedDeclarationId ? "low" : "medium",
        `${qualifier}.${reference.name}()`,
        reference.span,
        {
          reason: "member-call-shape",
          member: reference.name,
          resolvedDeclarationId: reference.resolvedDeclarationId
        }
      )
    );
  }

  return hints;
}

function hint(
  ordinal: number,
  kind: ProbableTypeHintKind,
  target: string,
  ast: Pick<CommonAST, "language" | "filePath">,
  confidence: ProbableTypeHint["confidence"],
  evidence: string,
  span: ProbableTypeHint["span"],
  metadata: Record<string, unknown>
): ProbableTypeHint {
  const filePart = ast.filePath ? ast.filePath.replaceAll(/[^A-Za-z0-9_.-]+/g, "_") : "inline";
  return {
    id: `hint:${filePart}:${kind}:${ordinal}`,
    kind,
    target,
    language: ast.language,
    filePath: ast.filePath,
    confidence,
    evidence,
    span,
    metadata
  };
}
