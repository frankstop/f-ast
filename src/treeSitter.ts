import { createRequire } from "node:module";
import type { Diagnostic, Language } from "./types.js";

const require = createRequire(import.meta.url);

type TreeSitterResult = {
  available: boolean;
  diagnostics: Diagnostic[];
};

export function validateWithTreeSitter(source: string, language: Language, filePath?: string): TreeSitterResult {
  try {
    const ParserModule = require("tree-sitter") as { default?: unknown };
    const ParserCtor = (ParserModule.default ?? ParserModule) as new () => {
      setLanguage(grammar: unknown): void;
      parse(text: string): { rootNode: { hasError?: boolean | (() => boolean) } };
    };
    const grammarName = language === "java" ? "tree-sitter-java" : "tree-sitter-c-sharp";
    const grammarModule = require(grammarName) as { default?: unknown };
    const grammar = grammarModule.default ?? grammarModule;
    const parser = new ParserCtor();
    parser.setLanguage(grammar);
    const tree = parser.parse(source);
    const hasError =
      typeof tree.rootNode.hasError === "function" ? tree.rootNode.hasError() : Boolean(tree.rootNode.hasError);

    return {
      available: true,
      diagnostics: hasError
        ? [
            {
              code: "parser.syntax-error",
              message: "tree-sitter parsed source with syntax errors; CommonAST emitted as partial output.",
              severity: "warning",
              language,
              filePath
            }
          ]
        : []
    };
  } catch (error) {
    return {
      available: false,
      diagnostics: [
        {
          code: "parser.tree-sitter-unavailable",
          message: `tree-sitter unavailable; heuristic normalizer used. ${error instanceof Error ? error.message : String(error)}`,
          severity: "warning",
          language,
          filePath
        }
      ]
    };
  }
}
