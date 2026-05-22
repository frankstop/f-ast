import fs from "node:fs/promises";
import { parsePath } from "./parser.js";

type CliOptions = {
  astOnly: boolean;
  symbolsOnly: boolean;
  out?: string;
  parserMode?: "auto" | "tree-sitter" | "heuristic";
};

export async function runCli(argv: string[] = process.argv.slice(2)): Promise<number> {
  const parsed = parseArgs(argv);
  if (parsed.help) {
    console.log(helpText());
    return 0;
  }

  if (!parsed.targetPath) {
    console.error("Missing path. Run `f-ast --help`.");
    return 2;
  }

  const bundle = await parsePath(parsed.targetPath, parsed.options);
  const output = parsed.options.astOnly
    ? bundle.asts
    : parsed.options.symbolsOnly
      ? bundle.symbolGraph
      : bundle;
  const json = `${JSON.stringify(output, null, 2)}\n`;

  if (parsed.options.out) {
    await fs.writeFile(parsed.options.out, json, "utf8");
  } else {
    process.stdout.write(json);
  }

  return bundle.diagnostics.some((diagnostic) => diagnostic.severity === "error") ? 1 : 0;
}

function parseArgs(argv: string[]): { help: boolean; targetPath?: string; options: CliOptions } {
  const options: CliOptions = {
    astOnly: false,
    symbolsOnly: false,
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
    if (arg === "--out") {
      options.out = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--parser-mode") {
      const mode = argv[index + 1];
      if (mode === "auto" || mode === "tree-sitter" || mode === "heuristic") {
        options.parserMode = mode;
      }
      index += 1;
      continue;
    }
    if (!targetPath) {
      targetPath = arg;
    }
  }

  if (options.astOnly && options.symbolsOnly) {
    options.symbolsOnly = false;
  }

  return { help: false, targetPath, options };
}

function helpText(): string {
  return `f-ast

Parse legacy Java/C# into CommonAST and best-effort SymbolGraph JSON.

Usage:
  f-ast <file-or-directory> [--ast | --symbols] [--out file]

Options:
  --ast                         Output CommonAST array only
  --symbols                     Output SymbolGraph only
  --out <file>                  Write JSON to file
  --parser-mode <mode>          auto, tree-sitter, or heuristic
  -h, --help                    Show help
`;
}
