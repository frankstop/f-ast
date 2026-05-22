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
  version: "0.1";
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

export type DeclarationKind = "class" | "interface" | "enum" | "method" | "field" | "import";
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

export type AnalysisBundle = {
  asts: CommonAST[];
  symbolGraph: SymbolGraph;
  diagnostics: Diagnostic[];
};
