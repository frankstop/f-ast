import { createRequire } from "node:module";
import { makeNodeId } from "./ids.js";
import type { CommonAST, CommonASTNode, DeclarationKind, Diagnostic, Language, SourceSpan } from "./types.js";

const require = createRequire(import.meta.url);

type ParserCtor = new () => {
  setLanguage(grammar: unknown): void;
  parse(text: string): Tree;
};

type Tree = {
  rootNode: SyntaxNode;
};

type SyntaxNode = {
  type: string;
  text: string;
  startIndex: number;
  endIndex: number;
  startPosition: { row: number; column: number };
  endPosition: { row: number; column: number };
  namedChildren: SyntaxNode[];
  namedChildCount: number;
  namedChild(index: number): SyntaxNode | null;
  childForFieldName?(name: string): SyntaxNode | null;
  hasError?: boolean | (() => boolean);
};

type TreeSitterAstResult = {
  ast?: CommonAST;
  diagnostics: Diagnostic[];
};

type NodeSpec = {
  kind: string;
  declarationKind?: DeclarationKind;
  referenceKind?: string;
  name?: string;
  metadata?: Record<string, unknown>;
};

const JAVA_TYPES = new Set([
  "class_declaration",
  "interface_declaration",
  "enum_declaration",
  "constructor_declaration",
  "method_declaration",
  "field_declaration",
  "import_declaration",
  "method_invocation"
]);

const CSHARP_TYPES = new Set([
  "class_declaration",
  "interface_declaration",
  "enum_declaration",
  "struct_declaration",
  "constructor_declaration",
  "property_declaration",
  "method_declaration",
  "field_declaration",
  "using_directive",
  "invocation_expression"
]);

export function buildTreeSitterAst(source: string, language: Language, filePath?: string): TreeSitterAstResult {
  const diagnostics: Diagnostic[] = [];

  try {
    const ParserModule = require("tree-sitter") as { default?: unknown };
    const Parser = (ParserModule.default ?? ParserModule) as ParserCtor;
    const grammarName = language === "java" ? "tree-sitter-java" : "tree-sitter-c-sharp";
    const grammarModule = require(grammarName) as { default?: unknown };
    const grammar = grammarModule.default ?? grammarModule;
    const parser = new Parser();
    parser.setLanguage(grammar);
    const tree = parser.parse(source);
    const hasError =
      typeof tree.rootNode.hasError === "function" ? tree.rootNode.hasError() : Boolean(tree.rootNode.hasError);

    if (hasError) {
      diagnostics.push({
        code: "parser.syntax-error",
        message: "tree-sitter parsed source with syntax errors; CommonAST emitted as partial output.",
        severity: "warning",
        language,
        filePath
      });
    }

    const children = collectMappedNodes(tree.rootNode, language, filePath);
    const root: CommonASTNode = {
      id: makeNodeId(language, filePath, "root", 0),
      kind: "compilationUnit",
      language,
      span: spanFromNode(tree.rootNode),
      children,
      metadata: {
        parser: "tree-sitter",
        sourceNodeType: tree.rootNode.type
      }
    };

    return {
      ast: {
        version: "0.2",
        language,
        filePath,
        root,
        diagnostics
      },
      diagnostics
    };
  } catch (error) {
    diagnostics.push({
      code: "parser.tree-sitter-unavailable",
      message: `tree-sitter unavailable; heuristic normalizer used. ${error instanceof Error ? error.message : String(error)}`,
      severity: "warning",
      language,
      filePath
    });
    return { diagnostics };
  }
}

function collectMappedNodes(root: SyntaxNode, language: Language, filePath: string | undefined): CommonASTNode[] {
  let ordinal = 0;
  const interestingTypes = language === "java" ? JAVA_TYPES : CSHARP_TYPES;

  function visit(node: SyntaxNode, containerStack: string[] = []): CommonASTNode[] {
    const spec = interestingTypes.has(node.type)
      ? language === "java"
        ? mapJavaNode(node)
        : mapCSharpNode(node)
      : undefined;

    if (!spec?.name) {
      return node.namedChildren.flatMap((child) => visit(child, containerStack));
    }

    const container = containerStack.join(".");
    const declarationSpan = spec.declarationKind ? spanFromNode(node) : undefined;
    const mappedNode: CommonASTNode = {
      id: makeNodeId(language, filePath, spec.kind, ordinal),
      kind: spec.kind,
      name: spec.name,
      language,
      span: spanFromNameNode(node, spec.name),
      children: [],
      metadata: {
        sourceNodeType: node.type,
        text: node.text.trim(),
        container: container || undefined,
        declarationSpan,
        ...spec.metadata,
        declarationKind: spec.declarationKind,
        referenceKind: spec.referenceKind
      }
    };
    ordinal += 1;

    const isContainer = isContainerDeclaration(spec.declarationKind);
    const nextContainerStack = isContainer ? [...containerStack, spec.name] : containerStack;
    const descendants = node.namedChildren.flatMap((child) => visit(child, nextContainerStack));

    if (isContainer) {
      mappedNode.children = descendants.sort(compareNodes);
      return [mappedNode];
    }

    return [mappedNode, ...descendants];
  }

  return visit(root).sort(compareNodes);
}

function mapJavaNode(node: SyntaxNode): NodeSpec | undefined {
  if (node.type === "import_declaration") {
    return { kind: "import", declarationKind: "import", name: firstNamedText(node) };
  }
  if (node.type === "class_declaration" || node.type === "interface_declaration" || node.type === "enum_declaration") {
    return {
      kind: "type",
      declarationKind: node.type === "interface_declaration" ? "interface" : node.type === "enum_declaration" ? "enum" : "class",
      name: fieldText(node, "name") ?? firstIdentifierText(node)
    };
  }
  if (node.type === "method_declaration") {
    return { kind: "method", declarationKind: "method", name: fieldText(node, "name") ?? firstIdentifierText(node) };
  }
  if (node.type === "constructor_declaration") {
    return {
      kind: "constructor",
      declarationKind: "constructor",
      name: fieldText(node, "name") ?? firstIdentifierText(node)
    };
  }
  if (node.type === "field_declaration") {
    return { kind: "field", declarationKind: "field", name: declaratorName(node) };
  }
  if (node.type === "method_invocation") {
    return {
      kind: "call",
      referenceKind: "call",
      name: fieldText(node, "name") ?? lastIdentifierText(node),
      metadata: {
        qualifier: fieldText(node, "object")
      }
    };
  }
  return undefined;
}

function mapCSharpNode(node: SyntaxNode): NodeSpec | undefined {
  if (node.type === "using_directive") {
    return { kind: "import", declarationKind: "import", name: firstNamedText(node) };
  }
  if (
    node.type === "class_declaration" ||
    node.type === "interface_declaration" ||
    node.type === "enum_declaration" ||
    node.type === "struct_declaration"
  ) {
    return {
      kind: "type",
      declarationKind:
        node.type === "interface_declaration" ? "interface" : node.type === "enum_declaration" ? "enum" : "class",
      name: fieldText(node, "name") ?? firstIdentifierText(node)
    };
  }
  if (node.type === "method_declaration") {
    return { kind: "method", declarationKind: "method", name: fieldText(node, "name") ?? lastDirectIdentifierText(node) };
  }
  if (node.type === "constructor_declaration") {
    return {
      kind: "constructor",
      declarationKind: "constructor",
      name: fieldText(node, "name") ?? firstIdentifierText(node)
    };
  }
  if (node.type === "property_declaration") {
    return {
      kind: "property",
      declarationKind: "property",
      name: fieldText(node, "name") ?? lastDirectIdentifierText(node)
    };
  }
  if (node.type === "field_declaration") {
    return { kind: "field", declarationKind: "field", name: declaratorName(node) };
  }
  if (node.type === "invocation_expression") {
    const fn = node.childForFieldName?.("function") ?? node.namedChild(0);
    return {
      kind: "call",
      referenceKind: "call",
      name: lastIdentifierText(fn ?? node),
      metadata: {
        qualifier: qualifierText(fn ?? node)
      }
    };
  }
  return undefined;
}

function fieldText(node: SyntaxNode, fieldName: string): string | undefined {
  const child = node.childForFieldName?.(fieldName);
  return child?.text;
}

function firstNamedText(node: SyntaxNode): string | undefined {
  return node.namedChild(0)?.text;
}

function firstIdentifierText(node: SyntaxNode): string | undefined {
  return node.namedChildren.find((child) => child.type === "identifier")?.text;
}

function lastDirectIdentifierText(node: SyntaxNode): string | undefined {
  return [...node.namedChildren].reverse().find((child) => child.type === "identifier")?.text;
}

function lastIdentifierText(node: SyntaxNode): string | undefined {
  let found: string | undefined;
  function visit(current: SyntaxNode): void {
    if (current.type === "identifier") found = current.text;
    for (const child of current.namedChildren) visit(child);
  }
  visit(node);
  return found;
}

function declaratorName(node: SyntaxNode): string | undefined {
  let found: string | undefined;
  function visit(current: SyntaxNode): void {
    if (current.type === "variable_declarator") {
      const name = current.childForFieldName?.("name")?.text ?? firstIdentifierText(current) ?? current.text;
      found = name;
      return;
    }
    if (current.type === "variable_declaration") {
      const name = lastIdentifierText(current);
      if (name) found = name;
    }
    for (const child of current.namedChildren) {
      if (!found) visit(child);
    }
  }
  visit(node);
  return found;
}

function qualifierText(node: SyntaxNode): string | undefined {
  const text = node.text;
  const lastDot = text.lastIndexOf(".");
  if (lastDot <= 0) return undefined;
  return text.slice(0, lastDot);
}

function isContainerDeclaration(declarationKind: DeclarationKind | undefined): boolean {
  return (
    declarationKind === "class" ||
    declarationKind === "interface" ||
    declarationKind === "enum" ||
    declarationKind === "method" ||
    declarationKind === "constructor" ||
    declarationKind === "property"
  );
}

function compareNodes(left: CommonASTNode, right: CommonASTNode): number {
  return left.span.startIndex - right.span.startIndex;
}

function spanFromNode(node: SyntaxNode): SourceSpan {
  return {
    start: node.startPosition,
    end: node.endPosition,
    startIndex: node.startIndex,
    endIndex: node.endIndex
  };
}

function spanFromNameNode(node: SyntaxNode, name: string): SourceSpan {
  const nameField = node.childForFieldName?.("name");
  if (nameField?.text === name) return spanFromNode(nameField);

  let found: SyntaxNode | undefined;
  function visit(current: SyntaxNode): void {
    if (found) return;
    if (current.text === name || (current.type === "identifier" && current.text === name)) {
      found = current;
      return;
    }
    for (const child of current.namedChildren) visit(child);
  }
  visit(node);
  return found ? spanFromNode(found) : spanFromNode(node);
}
