import type { CommonAST, CommonASTNode, Diagnostic, Language } from "./types.js";
import { makeNodeId } from "./ids.js";
import { spanFromIndexes, zeroSpan } from "./spans.js";

type MatchSpec = {
  kind: string;
  declarationKind?: string;
  referenceKind?: string;
  regex: RegExp;
  nameGroup: number;
};

const JAVA_SPECS: MatchSpec[] = [
  { kind: "import", declarationKind: "import", regex: /\bimport\s+([\w.*]+)\s*;/g, nameGroup: 1 },
  { kind: "type", declarationKind: "class", regex: /\b(?:public|protected|private|abstract|final|static|\s)*\b(class|interface|enum)\s+([A-Za-z_]\w*)/g, nameGroup: 2 },
  { kind: "method", declarationKind: "method", regex: /\b(?:public|protected|private|static|final|abstract|synchronized|native|\s)+[\w<>\[\], ?]+\s+([A-Za-z_]\w*)\s*\([^;{}]*\)\s*(?:throws\s+[\w.,\s]+)?\{/g, nameGroup: 1 },
  { kind: "field", declarationKind: "field", regex: /\b(?:public|protected|private|static|final|volatile|transient|\s)+[\w<>\[\], ?]+\s+([A-Za-z_]\w*)\s*(?:=[^;]*)?;/g, nameGroup: 1 },
  { kind: "call", referenceKind: "call", regex: /(?:\.|\b)([A-Za-z_]\w*)\s*\(/g, nameGroup: 1 }
];

const CSHARP_SPECS: MatchSpec[] = [
  { kind: "import", declarationKind: "import", regex: /\busing\s+([\w.]+)\s*;/g, nameGroup: 1 },
  { kind: "type", declarationKind: "class", regex: /\b(?:public|protected|private|internal|abstract|sealed|static|partial|\s)*\b(class|interface|enum|struct)\s+([A-Za-z_]\w*)/g, nameGroup: 2 },
  { kind: "method", declarationKind: "method", regex: /\b(?:public|protected|private|internal|static|virtual|override|abstract|async|sealed|extern|\s)+[\w<>\[\], ?]+\s+([A-Za-z_]\w*)\s*\([^;{}]*\)\s*\{/g, nameGroup: 1 },
  { kind: "field", declarationKind: "field", regex: /\b(?:public|protected|private|internal|static|readonly|const|volatile|\s)+[\w<>\[\], ?]+\s+([A-Za-z_]\w*)\s*(?:=[^;]*)?;/g, nameGroup: 1 },
  { kind: "call", referenceKind: "call", regex: /(?:\.|\b)([A-Za-z_]\w*)\s*\(/g, nameGroup: 1 }
];

const KEYWORDS = new Set([
  "if",
  "for",
  "while",
  "switch",
  "catch",
  "return",
  "new",
  "class",
  "interface",
  "enum",
  "struct",
  "typeof",
  "sizeof",
  "using",
  "import"
]);

export function buildHeuristicAst(
  source: string,
  language: Language,
  filePath: string | undefined,
  diagnostics: Diagnostic[]
): CommonAST {
  const nodes: CommonASTNode[] = [];
  let ordinal = 0;
  const specs = language === "java" ? JAVA_SPECS : CSHARP_SPECS;

  for (const spec of specs) {
    for (const match of source.matchAll(spec.regex)) {
      const name = match[spec.nameGroup];
      if (!name || KEYWORDS.has(name)) continue;

      const fullMatch = match[0] ?? "";
      const matchIndex = match.index ?? 0;
      const nameIndex = matchIndex + fullMatch.indexOf(name);
      const node: CommonASTNode = {
        id: makeNodeId(language, filePath, spec.kind, ordinal),
        kind: spec.kind,
        name,
        language,
        span: spanFromIndexes(source, nameIndex, nameIndex + name.length),
        children: [],
        metadata: {
          declarationKind: spec.declarationKind,
          referenceKind: spec.referenceKind,
          text: fullMatch.trim()
        }
      };
      ordinal += 1;
      nodes.push(node);
    }
  }

  nodes.sort((left, right) => left.span.startIndex - right.span.startIndex);

  const root: CommonASTNode = {
    id: makeNodeId(language, filePath, "root", 0),
    kind: "compilationUnit",
    language,
    span: source.length > 0 ? spanFromIndexes(source, 0, source.length) : zeroSpan,
    children: nodes,
    metadata: {
      parser: "heuristic-normalizer"
    }
  };

  return {
    version: "0.1",
    language,
    filePath,
    root,
    diagnostics
  };
}
