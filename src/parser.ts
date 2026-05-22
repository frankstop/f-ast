import fs from "node:fs/promises";
import path from "node:path";
import { buildHeuristicAst } from "./heuristic.js";
import { detectLanguage, isSupportedSourcePath, languageDiagnostic } from "./language.js";
import { buildSymbolGraph } from "./symbols.js";
import { validateWithTreeSitter } from "./treeSitter.js";
import type { AnalysisBundle, CommonAST, Diagnostic, ParseCodeOptions, ParsePathOptions } from "./types.js";

export async function parseCode(input: string, options: ParseCodeOptions = {}): Promise<CommonAST> {
  const language = options.language ?? detectLanguage(options.filePath, input);
  if (!language) {
    return buildHeuristicAst(input, "java", options.filePath, [languageDiagnostic(options.filePath)]);
  }

  const diagnostics: Diagnostic[] = [];
  if (options.parserMode !== "heuristic") {
    const treeSitter = validateWithTreeSitter(input, language, options.filePath);
    diagnostics.push(...treeSitter.diagnostics);
    if (options.parserMode === "tree-sitter" && !treeSitter.available) {
      diagnostics.push({
        code: "parser.mode-unavailable",
        message: "Requested tree-sitter mode, but parser dependency was unavailable; emitted heuristic partial output.",
        severity: "error",
        language,
        filePath: options.filePath
      });
    }
  }

  return buildHeuristicAst(input, language, options.filePath, diagnostics);
}

export async function parsePath(targetPath: string, options: ParsePathOptions = {}): Promise<AnalysisBundle> {
  const diagnostics: Diagnostic[] = [];
  const asts: CommonAST[] = [];
  const files = await collectSourceFiles(targetPath, diagnostics);

  for (const filePath of files) {
    try {
      const source = await fs.readFile(filePath, "utf8");
      const ast = await parseCode(source, {
        language: detectLanguage(filePath, source),
        filePath,
        parserMode: options.parserMode
      });
      asts.push(ast);
      diagnostics.push(...ast.diagnostics);
    } catch (error) {
      diagnostics.push({
        code: "io.read-failed",
        message: `Could not read ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
        severity: "error",
        filePath
      });
    }
  }

  const symbolGraph = buildSymbolGraph(asts);
  diagnostics.push(...symbolGraph.diagnostics);
  return { asts, symbolGraph, diagnostics };
}

async function collectSourceFiles(targetPath: string, diagnostics: Diagnostic[]): Promise<string[]> {
  try {
    const stat = await fs.stat(targetPath);
    if (stat.isFile()) {
      if (isSupportedSourcePath(targetPath)) return [targetPath];
      diagnostics.push({
        code: "input.unsupported-file",
        message: `Unsupported file extension for ${targetPath}. Expected .java or .cs.`,
        severity: "error",
        filePath: targetPath
      });
      return [];
    }

    if (!stat.isDirectory()) {
      diagnostics.push({
        code: "input.unsupported-path",
        message: `${targetPath} is neither a file nor a directory.`,
        severity: "error",
        filePath: targetPath
      });
      return [];
    }

    return walk(targetPath);
  } catch (error) {
    diagnostics.push({
      code: "io.stat-failed",
      message: `Could not inspect ${targetPath}: ${error instanceof Error ? error.message : String(error)}`,
      severity: "error",
      filePath: targetPath
    });
    return [];
  }
}

async function walk(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git") continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
    } else if (entry.isFile() && isSupportedSourcePath(fullPath)) {
      files.push(fullPath);
    }
  }

  return files.sort();
}
