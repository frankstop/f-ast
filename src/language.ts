import path from "node:path";
import type { Diagnostic, Language } from "./types.js";

export function detectLanguage(filePath?: string, source?: string): Language | undefined {
  const ext = filePath ? path.extname(filePath).toLowerCase() : "";
  if (ext === ".java") return "java";
  if (ext === ".cs") return "csharp";

  if (source) {
    if (/\busing\s+System\b/.test(source) || /\bnamespace\s+[\w.]+\s*\{/.test(source)) {
      return "csharp";
    }
    if (/\bpackage\s+[\w.]+;/.test(source) || /\bimport\s+[\w.*]+;/.test(source)) {
      return "java";
    }
  }

  return undefined;
}

export function languageDiagnostic(filePath?: string): Diagnostic {
  return {
    code: "language.unknown",
    message: `Could not infer language${filePath ? ` for ${filePath}` : ""}. Use .java/.cs or pass language option.`,
    severity: "error",
    filePath
  };
}

export function isSupportedSourcePath(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ext === ".java" || ext === ".cs";
}
