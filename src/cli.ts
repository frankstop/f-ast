import fs from "node:fs/promises";
import { parsePath } from "./parser.js";

type CliOptions = {
  astOnly: boolean;
  symbolsOnly: boolean;
  noSymbols: boolean;
  diagnosticsOnly: boolean;
  pretty: boolean;
  format: "json";
  out?: string;
  parserMode?: "auto" | "tree-sitter" | "heuristic";
};

export async function runCli(argv: string[] = process.argv.slice(2)): Promise<number> {
  const parsed = parseArgs(argv);
  if (parsed.help) {
    console.log(helpText());
    return 0;
  }

  if (parsed.error) {
    console.error(parsed.error);
    console.error("Run `f-ast --help`.");
    return 2;
  }

  if (!parsed.targetPath) {
    console.error("Missing path. Run `f-ast --help`.");
    return 2;
  }

  const bundle = await parsePath(parsed.targetPath, parsed.options);
  const output = selectOutput(bundle, parsed.options);
  const json = `${JSON.stringify(output, null, parsed.options.pretty ? 2 : 0)}\n`;

  if (parsed.options.out) {
    await fs.writeFile(parsed.options.out, json, "utf8");
  } else {
    process.stdout.write(json);
  }

  return bundle.diagnostics.some((diagnostic) => diagnostic.severity === "error") ? 1 : 0;
}

function parseArgs(argv: string[]): { help: boolean; targetPath?: string; options: CliOptions; error?: string } {
  const options: CliOptions = {
    astOnly: false,
    symbolsOnly: false,
    noSymbols: false,
    diagnosticsOnly: false,
    pretty: true,
    format: "json",
    parserMode: "auto"
  };
  let targetPath: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg) continue;

    if (arg === "--help" || arg === "-h") {
      return { help: true, options };
    }
    if (arg === "--ast") {
      options.astOnly = true;
      continue;
    }
    if (arg === "--symbols") {
      options.symbolsOnly = true;
      continue;
    }
    if (arg === "--no-symbols") {
      options.noSymbols = true;
      continue;
    }
    if (arg === "--diagnostics") {
      options.diagnosticsOnly = true;
      continue;
    }
    if (arg === "--pretty") {
      options.pretty = true;
      continue;
    }
    if (arg === "--compact") {
      options.pretty = false;
      continue;
    }
    if (arg === "--format") {
      const format = argv[index + 1];
      if (format !== "json") {
        return { help: false, targetPath, options, error: `Unsupported format '${format ?? ""}'. Only json is supported.` };
      }
      options.format = format;
      index += 1;
      continue;
    }
    if (arg === "--out") {
      const out = argv[index + 1];
      if (!out) return { help: false, targetPath, options, error: "Missing value for --out." };
      options.out = out;
      index += 1;
      continue;
    }
    if (arg === "--parser-mode") {
      const mode = argv[index + 1];
      if (mode === "auto" || mode === "tree-sitter" || mode === "heuristic") {
        options.parserMode = mode;
      } else {
        return { help: false, targetPath, options, error: `Unsupported parser mode '${mode ?? ""}'.` };
      }
      index += 1;
      continue;
    }
    if (arg.startsWith("-")) {
      return { help: false, targetPath, options, error: `Unknown option '${arg}'.` };
    }
    if (!targetPath) {
      targetPath = arg;
    }
  }

  const outputModeCount = [options.astOnly, options.symbolsOnly, options.noSymbols, options.diagnosticsOnly].filter(Boolean).length;
  if (outputModeCount > 1) {
    return { help: false, targetPath, options, error: "Choose only one output mode: --ast, --symbols, --no-symbols, or --diagnostics." };
  }

  return { help: false, targetPath, options };
}

function selectOutput(bundle: Awaited<ReturnType<typeof parsePath>>, options: CliOptions): unknown {
  if (options.astOnly) return bundle.asts;
  if (options.symbolsOnly) return bundle.symbolGraph;
  if (options.noSymbols) return { asts: bundle.asts, diagnostics: bundle.diagnostics };
  if (options.diagnosticsOnly) return bundle.diagnostics;
  return bundle;
}

function helpText(): string {
  return `f-ast

Parse legacy Java/C# into CommonAST and best-effort SymbolGraph JSON.

Usage:
  f-ast <file-or-directory> [--ast | --symbols | --no-symbols | --diagnostics] [--out file]

Options:
  --ast                         Output CommonAST array only
  --symbols                     Output SymbolGraph only
  --no-symbols                  Output ASTs and diagnostics without SymbolGraph
  --diagnostics                 Output diagnostics only
  --out <file>                  Write JSON to file
  --format <format>             Output format: json
  --pretty                      Pretty-print JSON (default)
  --compact                     Compact JSON
  --parser-mode <mode>          auto, tree-sitter, or heuristic
  -h, --help                    Show help
`;
}
