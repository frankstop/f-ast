import { makeNodeId } from "./ids.js";
import { maskNonCode } from "./masking.js";
import { spanFromIndexes, zeroSpan } from "./spans.js";
import type { CommonAST, CommonASTNode, DeclarationKind, Diagnostic, Language, SourceSpan } from "./types.js";

type Candidate = {
  node: CommonASTNode;
  rangeStart: number;
  rangeEnd: number;
  bodyStart?: number;
  bodyEnd?: number;
};

type BodyRange = {
  start: number;
  end: number;
  balanced: boolean;
};

const JAVA_TYPE_REGEX =
  /\b(?:public|protected|private|abstract|final|static|\s)*\b(class|interface|enum)\s+([A-Za-z_]\w*)/g;
const CSHARP_TYPE_REGEX =
  /\b(?:public|protected|private|internal|abstract|sealed|static|partial|\s)*\b(class|interface|enum|struct)\s+([A-Za-z_]\w*)/g;
const JAVA_METHOD_REGEX =
  /\b(?:public|protected|private|static|final|abstract|synchronized|native|\s)+[\w<>\[\], ?]+\s+([A-Za-z_]\w*)\s*\([^;{}]*\)\s*(?:throws\s+[\w.,\s]+)?\s*\{/g;
const CSHARP_METHOD_REGEX =
  /\b(?:public|protected|private|internal|static|virtual|override|abstract|async|sealed|extern|\s)+[\w<>\[\], ?]+\s+([A-Za-z_]\w*)\s*\([^;{}]*\)\s*\{/g;
const JAVA_CONSTRUCTOR_REGEX =
  /\b(?:(?:public|protected|private)\s+)?([A-Z][A-Za-z_]\w*)\s*\([^;{}]*\)\s*(?:throws\s+[\w.,\s]+)?\s*\{/g;
const CSHARP_CONSTRUCTOR_REGEX =
  /\b(?:(?:public|protected|private|internal|static|extern)\s+)*([A-Z][A-Za-z_]\w*)\s*\([^;{}]*\)\s*(?::\s*(?:base|this)\s*\([^;{}]*\)\s*)?\{/g;
const JAVA_FIELD_REGEX =
  /\b(?:public|protected|private|static|final|volatile|transient|\s)+[\w<>\[\], ?]+\s+([A-Za-z_]\w*)\s*(?:=[^;]*)?;/g;
const CSHARP_FIELD_REGEX =
  /\b(?:public|protected|private|internal|static|readonly|const|volatile|\s)+[\w<>\[\], ?]+\s+([A-Za-z_]\w*)\s*(?:=[^;]*)?;/g;
const CSHARP_PROPERTY_REGEX =
  /\b(?:public|protected|private|internal|static|virtual|override|abstract|sealed|new|\s)+[\w<>\[\], ?]+\s+([A-Za-z_]\w*)\s*\{(?=[^{}]*\b(?:get|set)\b)/g;
const CALL_REGEX = /(?:\.|\b)([A-Za-z_]\w*)\s*\(/g;

const KEYWORDS = new Set([
  "if",
  "for",
  "while",
  "switch",
  "catch",
  "return",
  "throw",
  "new",
  "this",
  "super",
  "synchronized",
  "using",
  "lock",
  "typeof",
  "sizeof",
  "nameof",
  "class",
  "interface",
  "enum",
  "struct",
  "import"
]);

export function buildHeuristicAst(
  source: string,
  language: Language,
  filePath: string | undefined,
  diagnostics: Diagnostic[]
): CommonAST {
  const maskedSource = maskNonCode(source, language);
  const candidates: Candidate[] = [];
  const declarationNameIndexes = new Set<number>();
  let ordinal = 0;

  const addCandidate = (
    kind: string,
    name: string,
    nameIndex: number,
    rangeStart: number,
    rangeEnd: number,
    metadata: Record<string, unknown>,
    body?: BodyRange
  ): Candidate => {
    const declarationKind = metadata.declarationKind as DeclarationKind | undefined;
    const node: CommonASTNode = {
      id: makeNodeId(language, filePath, kind, ordinal),
      kind,
      name,
      language,
      span: spanFromIndexes(source, nameIndex, nameIndex + name.length),
      children: [],
      metadata: {
        ...metadata,
        declarationSpan: declarationKind ? spanFromIndexes(source, rangeStart, rangeEnd) : undefined
      }
    };
    ordinal += 1;

    const candidate: Candidate = {
      node,
      rangeStart,
      rangeEnd,
      bodyStart: body?.start,
      bodyEnd: body?.end
    };
    candidates.push(candidate);
    if (declarationKind) declarationNameIndexes.add(nameIndex);
    if (body && !body.balanced) {
      diagnostics.push({
        code: "parser.heuristic-unbalanced-braces",
        message: `Heuristic parser reached end of file before closing '${name}'.`,
        severity: "warning",
        language,
        filePath,
        span: node.span
      });
    }
    return candidate;
  };

  const importRegex = language === "java" ? /\bimport\s+([\w.*]+)\s*;/g : /\busing\s+([\w.]+)\s*;/g;
  for (const match of maskedSource.matchAll(importRegex)) {
    const name = match[1];
    if (!name) continue;
    const fullMatch = match[0] ?? "";
    const matchIndex = match.index ?? 0;
    const nameIndex = matchIndex + fullMatch.indexOf(name);
    addCandidate("import", name, nameIndex, matchIndex, matchIndex + fullMatch.length, {
      declarationKind: "import",
      text: source.slice(matchIndex, matchIndex + fullMatch.length).trim()
    });
  }

  const typeRegex = language === "java" ? JAVA_TYPE_REGEX : CSHARP_TYPE_REGEX;
  for (const match of maskedSource.matchAll(typeRegex)) {
    const sourceKind = match[1];
    const name = match[2];
    if (!sourceKind || !name) continue;
    const fullMatch = match[0] ?? "";
    const matchIndex = match.index ?? 0;
    const nameIndex = matchIndex + fullMatch.lastIndexOf(name);
    const body = findBodyRange(maskedSource, matchIndex + fullMatch.length);
    const declarationKind = typeDeclarationKind(sourceKind);
    addCandidate(
      "type",
      name,
      nameIndex,
      matchIndex,
      body?.end ?? matchIndex + fullMatch.length,
      {
        declarationKind,
        sourceNodeType: `${sourceKind}_declaration`,
        text: source.slice(matchIndex, body?.start ?? matchIndex + fullMatch.length).trim()
      },
      body
    );
  }

  const methodRegex = language === "java" ? JAVA_METHOD_REGEX : CSHARP_METHOD_REGEX;
  for (const match of maskedSource.matchAll(methodRegex)) {
    const name = match[1];
    if (!name || KEYWORDS.has(name)) continue;
    const fullMatch = match[0] ?? "";
    const matchIndex = match.index ?? 0;
    const nameIndex = matchIndex + fullMatch.lastIndexOf(name);
    const body = bodyRangeFromMatch(maskedSource, matchIndex, fullMatch);
    addCandidate(
      "method",
      name,
      nameIndex,
      matchIndex,
      body.end,
      {
        declarationKind: "method",
        text: source.slice(matchIndex, body.start).trim()
      },
      body
    );
  }

  const constructorRegex = language === "java" ? JAVA_CONSTRUCTOR_REGEX : CSHARP_CONSTRUCTOR_REGEX;
  for (const match of maskedSource.matchAll(constructorRegex)) {
    const name = match[1];
    if (!name) continue;
    const fullMatch = match[0] ?? "";
    const matchIndex = match.index ?? 0;
    const nameIndex = matchIndex + fullMatch.indexOf(name);
    const body = bodyRangeFromMatch(maskedSource, matchIndex, fullMatch);
    const containingType = smallestContainingType(candidates, matchIndex, body.end);
    if (!containingType || containingType.node.name !== name) continue;
    addCandidate(
      "constructor",
      name,
      nameIndex,
      matchIndex,
      body.end,
      {
        declarationKind: "constructor",
        text: source.slice(matchIndex, body.start).trim()
      },
      body
    );
  }

  const fieldRegex = language === "java" ? JAVA_FIELD_REGEX : CSHARP_FIELD_REGEX;
  for (const match of maskedSource.matchAll(fieldRegex)) {
    const name = match[1];
    if (!name || KEYWORDS.has(name)) continue;
    const fullMatch = match[0] ?? "";
    const matchIndex = match.index ?? 0;
    const nameIndex = matchIndex + fullMatch.lastIndexOf(name);
    addCandidate("field", name, nameIndex, matchIndex, matchIndex + fullMatch.length, {
      declarationKind: "field",
      text: source.slice(matchIndex, matchIndex + fullMatch.length).trim()
    });
  }

  if (language === "csharp") {
    for (const match of maskedSource.matchAll(CSHARP_PROPERTY_REGEX)) {
      const name = match[1];
      if (!name) continue;
      const fullMatch = match[0] ?? "";
      const matchIndex = match.index ?? 0;
      const nameIndex = matchIndex + fullMatch.lastIndexOf(name);
      const body = bodyRangeFromMatch(maskedSource, matchIndex, fullMatch);
      addCandidate(
        "property",
        name,
        nameIndex,
        matchIndex,
        body.end,
        {
          declarationKind: "property",
          text: source.slice(matchIndex, body.start).trim()
        },
        body
      );
    }
  }

  for (const match of maskedSource.matchAll(CALL_REGEX)) {
    const name = match[1];
    if (!name || KEYWORDS.has(name)) continue;
    const fullMatch = match[0] ?? "";
    const matchIndex = match.index ?? 0;
    const nameOffset = fullMatch.lastIndexOf(name);
    const nameIndex = matchIndex + nameOffset;
    if (declarationNameIndexes.has(nameIndex)) continue;

    addCandidate("call", name, nameIndex, matchIndex, matchIndex + fullMatch.length, {
      referenceKind: "call",
      qualifier: qualifierBefore(maskedSource, nameIndex),
      text: source.slice(matchIndex, matchIndex + fullMatch.length).trim()
    });
  }

  const rootChildren = buildHierarchy(candidates);
  assignContainers(rootChildren, []);

  const root: CommonASTNode = {
    id: makeNodeId(language, filePath, "root", 0),
    kind: "compilationUnit",
    language,
    span: source.length > 0 ? spanFromIndexes(source, 0, source.length) : zeroSpan,
    children: rootChildren,
    metadata: {
      parser: "heuristic-normalizer"
    }
  };

  return {
    version: "0.2",
    language,
    filePath,
    root,
    diagnostics
  };
}

function typeDeclarationKind(sourceKind: string): DeclarationKind {
  if (sourceKind === "interface") return "interface";
  if (sourceKind === "enum") return "enum";
  return "class";
}

function bodyRangeFromMatch(source: string, matchIndex: number, fullMatch: string): BodyRange {
  const openBrace = matchIndex + fullMatch.lastIndexOf("{");
  return matchBrace(source, openBrace);
}

function findBodyRange(source: string, searchFrom: number): BodyRange | undefined {
  for (let index = searchFrom; index < source.length; index += 1) {
    if (source[index] === ";") return undefined;
    if (source[index] === "{") return matchBrace(source, index);
  }
  return undefined;
}

function matchBrace(source: string, openBrace: number): BodyRange {
  let depth = 0;
  for (let index = openBrace; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return { start: openBrace, end: index + 1, balanced: true };
    }
  }
  return { start: openBrace, end: source.length, balanced: false };
}

function smallestContainingType(candidates: Candidate[], start: number, end: number): Candidate | undefined {
  return candidates
    .filter(
      (candidate) =>
        candidate.node.kind === "type" &&
        candidate.bodyStart !== undefined &&
        candidate.bodyEnd !== undefined &&
        candidate.bodyStart < start &&
        candidate.bodyEnd >= end
    )
    .sort(rangeSize)[0];
}

function buildHierarchy(candidates: Candidate[]): CommonASTNode[] {
  const roots: Candidate[] = [];
  const ordered = [...candidates].sort((left, right) => {
    const startDifference = left.rangeStart - right.rangeStart;
    if (startDifference !== 0) return startDifference;
    return right.rangeEnd - left.rangeEnd;
  });

  for (const candidate of ordered) {
    const parent = ordered
      .filter((possibleParent) => canContain(possibleParent, candidate))
      .sort(rangeSize)[0];
    if (parent) parent.node.children.push(candidate.node);
    else roots.push(candidate);
  }

  sortChildren(roots.map((candidate) => candidate.node));
  return roots.map((candidate) => candidate.node);
}

function canContain(parent: Candidate, child: Candidate): boolean {
  if (parent === child || parent.bodyStart === undefined || parent.bodyEnd === undefined) return false;
  if (parent.bodyStart >= child.rangeStart || parent.bodyEnd < child.rangeEnd) return false;

  const parentKind = parent.node.metadata.declarationKind as DeclarationKind | undefined;
  const childKind = child.node.metadata.declarationKind as DeclarationKind | undefined;
  if (child.node.kind === "type") return isTypeKind(parentKind);
  if (child.node.kind === "call") {
    return isTypeKind(parentKind) || parentKind === "method" || parentKind === "constructor" || parentKind === "property";
  }
  if (childKind) return isTypeKind(parentKind);
  return false;
}

function isTypeKind(kind: DeclarationKind | undefined): boolean {
  return kind === "class" || kind === "interface" || kind === "enum";
}

function rangeSize(left: Candidate, right: Candidate): number {
  return left.rangeEnd - left.rangeStart - (right.rangeEnd - right.rangeStart);
}

function sortChildren(nodes: CommonASTNode[]): void {
  nodes.sort((left, right) => left.span.startIndex - right.span.startIndex);
  for (const node of nodes) sortChildren(node.children);
}

function assignContainers(nodes: CommonASTNode[], stack: string[]): void {
  for (const node of nodes) {
    node.metadata.container = stack.length > 0 ? stack.join(".") : undefined;
    const declarationKind = node.metadata.declarationKind as DeclarationKind | undefined;
    const nextStack =
      node.name &&
      (isTypeKind(declarationKind) ||
        declarationKind === "method" ||
        declarationKind === "constructor" ||
        declarationKind === "property")
        ? [...stack, node.name]
        : stack;
    assignContainers(node.children, nextStack);
  }
}

function qualifierBefore(source: string, nameIndex: number): string | undefined {
  let index = nameIndex - 1;
  while (index >= 0 && /\s/.test(source[index] ?? "")) index -= 1;
  if (source[index] !== ".") return undefined;
  index -= 1;
  const end = index + 1;
  while (index >= 0 && /[A-Za-z0-9_.]/.test(source[index] ?? "")) index -= 1;
  const qualifier = source.slice(index + 1, end);
  return qualifier || undefined;
}
