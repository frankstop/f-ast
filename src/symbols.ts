import { makeSymbolId } from "./ids.js";
import type {
  CommonAST,
  CommonASTNode,
  DeclarationKind,
  Diagnostic,
  ReferenceKind,
  SymbolDeclaration,
  BuildSymbolGraphOptions,
  SymbolGraph,
  SymbolLink,
  SymbolReference
} from "./types.js";

export function buildSymbolGraph(asts: CommonAST[], options: BuildSymbolGraphOptions = {}): SymbolGraph {
  const declarations: SymbolDeclaration[] = [];
  const references: SymbolReference[] = [];
  const diagnostics: Diagnostic[] = [];

  for (const ast of asts) {
    const containerStack: string[] = [];
    visit(ast.root, ast, declarations, references, containerStack);
  }

  const declarationIndex = indexDeclarations(declarations);
  const links: SymbolLink[] = [];

  for (const reference of references) {
    const candidates = declarationIndex.get(reference.name) ?? [];
    const local = candidates.find((candidate) => candidate.filePath === reference.filePath);
    const resolved = local ?? candidates[0];

    if (resolved) {
      reference.resolvedDeclarationId = resolved.id;
      links.push({
        declarationId: resolved.id,
        referenceId: reference.id,
        confidence: local ? "exact-local" : "exact-project"
      });
    } else if (reference.kind === "call" && options.unresolvedDiagnostics !== false) {
      const qualifier = typeof reference.metadata.qualifier === "string" ? reference.metadata.qualifier : undefined;
      diagnostics.push({
        code: unresolvedCode(reference.name, qualifier),
        message: `Unresolved call reference '${reference.name}'${qualifier ? ` on '${qualifier}'` : ""}.`,
        severity: "warning",
        language: reference.language,
        filePath: reference.filePath,
        span: reference.span
      });
    }
  }

  return { declarations, references, links, diagnostics };
}

function visit(
  node: CommonASTNode,
  ast: CommonAST,
  declarations: SymbolDeclaration[],
  references: SymbolReference[],
  containerStack: string[]
): void {
  const declarationKind = node.metadata.declarationKind as DeclarationKind | undefined;
  const referenceKind = node.metadata.referenceKind as ReferenceKind | undefined;
  const container = typeof node.metadata.container === "string" ? node.metadata.container : containerStack.at(-1);

  if (node.name && declarationKind) {
    declarations.push({
      id: makeSymbolId("decl", node.id, node.name),
      kind: declarationKind,
      name: node.name,
      language: node.language,
      filePath: ast.filePath,
      nodeId: node.id,
      span: node.span,
      container,
      metadata: node.metadata
    });
  }

  if (node.name && referenceKind) {
    references.push({
      id: makeSymbolId("ref", node.id, node.name),
      kind: referenceKind,
      name: node.name,
      language: node.language,
      filePath: ast.filePath,
      nodeId: node.id,
      span: node.span,
      container,
      metadata: node.metadata
    });
  }

  const nextStack =
    node.name &&
    (declarationKind === "class" ||
      declarationKind === "interface" ||
      declarationKind === "enum" ||
      declarationKind === "method" ||
      declarationKind === "constructor" ||
      declarationKind === "property")
      ? [...containerStack, node.name]
      : containerStack;

  for (const child of node.children) {
    visit(child, ast, declarations, references, nextStack);
  }
}

function indexDeclarations(declarations: SymbolDeclaration[]): Map<string, SymbolDeclaration[]> {
  const index = new Map<string, SymbolDeclaration[]>();
  for (const declaration of declarations) {
    const existing = index.get(declaration.name) ?? [];
    existing.push(declaration);
    index.set(declaration.name, existing);
  }
  return index;
}

function unresolvedCode(name: string, qualifier: string | undefined): string {
  if (!qualifier) return "symbol.unresolved.local";
  if (qualifier === "System" || qualifier === "Console" || qualifier.startsWith("System.") || qualifier.startsWith("Console.")) {
    return "symbol.unresolved.external-api";
  }
  return "symbol.unresolved.member";
}
