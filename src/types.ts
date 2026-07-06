export type Language = "java" | "csharp";

export type DiagnosticSeverity = "info" | "warning" | "error";

export type SourcePosition = {
  row: number;
  column: number;
};

export type SourceSpan = {
  start: SourcePosition;
  end: SourcePosition;
  startIndex: number;
  endIndex: number;
};

export type Diagnostic = {
  code: string;
  message: string;
  severity: DiagnosticSeverity;
  filePath?: string;
  language?: Language;
  span?: SourceSpan;
};

export type CommonASTNode = {
  id: string;
  kind: string;
  name?: string;
  language: Language;
  span: SourceSpan;
  children: CommonASTNode[];
  metadata: Record<string, unknown>;
};

export type CommonAST = {
  version: "0.2";
  language: Language;
  filePath?: string;
  root: CommonASTNode;
  diagnostics: Diagnostic[];
};

export type ParseCodeOptions = {
  language?: Language;
  filePath?: string;
  parserMode?: "auto" | "tree-sitter" | "heuristic";
};

export type ParsePathOptions = {
  parserMode?: "auto" | "tree-sitter" | "heuristic";
  include?: string[];
};

export type DeclarationKind =
  | "class"
  | "interface"
  | "enum"
  | "method"
  | "constructor"
  | "property"
  | "field"
  | "import";
export type ReferenceKind = "identifier" | "call" | "import";

export type SymbolDeclaration = {
  id: string;
  kind: DeclarationKind;
  name: string;
  language: Language;
  filePath?: string;
  nodeId: string;
  span: SourceSpan;
  container?: string;
  metadata: Record<string, unknown>;
};

export type SymbolReference = {
  id: string;
  kind: ReferenceKind;
  name: string;
  language: Language;
  filePath?: string;
  nodeId: string;
  span: SourceSpan;
  container?: string;
  resolvedDeclarationId?: string;
  metadata: Record<string, unknown>;
};

export type SymbolLink = {
  declarationId: string;
  referenceId: string;
  confidence: "exact-local" | "exact-project";
};

export type SymbolGraph = {
  declarations: SymbolDeclaration[];
  references: SymbolReference[];
  links: SymbolLink[];
  diagnostics: Diagnostic[];
};

export type BuildSymbolGraphOptions = {
  unresolvedDiagnostics?: boolean;
};

export type ProbableTypeHintKind = "collection-ish" | "iterable-ish" | "object-shape";

export type ProbableTypeHint = {
  id: string;
  kind: ProbableTypeHintKind;
  target: string;
  language: Language;
  filePath?: string;
  confidence: "low" | "medium";
  evidence: string;
  span?: SourceSpan;
  metadata: Record<string, unknown>;
};

export type FlowEdgeKind =
  | "calls"
  | "reads"
  | "writes"
  | "mutates"
  | "returns"
  | "branches"
  | "loops"
  | "dependsOn";

export type FlowEdge = {
  id: string;
  kind: FlowEdgeKind;
  from?: string;
  to?: string;
  language: Language;
  filePath?: string;
  nodeId?: string;
  span?: SourceSpan;
  evidence: string;
  metadata: Record<string, unknown>;
};

export type FlowGraph = {
  edges: FlowEdge[];
  diagnostics: Diagnostic[];
};

export type AnalysisBundle = {
  asts: CommonAST[];
  symbolGraph: SymbolGraph;
  flowGraph: FlowGraph;
  typeHints: ProbableTypeHint[];
  diagnostics: Diagnostic[];
};
