import fs from "node:fs/promises";
import { formatBundle, toYaml, type OutputFormat, type OutputProfile } from "./formatters.js";
import { startMcpServer } from "./mcp.js";
import { parsePath } from "./parser.js";

type CliOptions = {
  astOnly: boolean;
  noSymbols: boolean;
  pretty: boolean;
  format: OutputFormat;
  profile: OutputProfile;
  out?: string;
  parserMode?: "auto" | "tree-sitter" | "heuristic";
};

export async function runCli(argv: string[] = process.argv.slice(2)): Promise<number> {
  if (argv[0] === "mcp") {
    return runMcp(argv.slice(1));
  }

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
  const output = formatCliOutput(bundle, parsed.options);

  if (parsed.options.out) {
    await fs.writeFile(parsed.options.out, output, "utf8");
  } else {
    process.stdout.write(output);
  }

  return bundle.diagnostics.some((diagnostic) => diagnostic.severity === "error") ? 1 : 0;
}

async function runMcp(argv: string[]): Promise<number> {
  const parsed = parseArgs(argv);
  if (parsed.help) {
    console.log(mcpHelpText());
    return 0;
  }
  if (parsed.error) {
    console.error(parsed.error);
    console.error("Run `f-ast mcp --help`.");
    return 2;
  }
  if (!parsed.targetPath) {
    console.error("Missing path. Run `f-ast mcp --help`.");
    return 2;
  }
  await startMcpServer(parsed.targetPath, { parserMode: parsed.options.parserMode });
  return 0;
}

function parseArgs(argv: string[]): { help: boolean; targetPath?: string; options: CliOptions; error?: string } {
  const options: CliOptions = {
    astOnly: false,
    noSymbols: false,
    pretty: true,
    format: "compact",
    profile: "agent",
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
      options.profile = "symbols";
      continue;
    }
    if (arg === "--no-symbols") {
      options.noSymbols = true;
      continue;
    }
    if (arg === "--diagnostics") {
      options.profile = "diagnostics";
      continue;
    }
    if (arg === "--json") {
      options.format = "json";
      continue;
    }
    if (arg === "--yaml") {
      options.format = "yaml";
      continue;
    }
    if (arg === "--pretty") {
      options.pretty = true;
      continue;
    }
    if (arg === "--compact") {
      options.format = "compact";
      options.pretty = false;
      continue;
    }
    if (arg === "--format") {
      const format = argv[index + 1];
      if (format !== "compact" && format !== "json" && format !== "yaml") {
        return { help: false, targetPath, options, error: `Unsupported format '${format ?? ""}'. Expected compact, json, or yaml.` };
      }
      options.format = format;
      index += 1;
      continue;
    }
    if (arg === "--profile") {
      const profile = argv[index + 1];
      if (profile !== "agent" && profile !== "full" && profile !== "symbols" && profile !== "diagnostics") {
        return {
          help: false,
          targetPath,
          options,
          error: `Unsupported profile '${profile ?? ""}'. Expected agent, full, symbols, or diagnostics.`
        };
      }
      options.profile = profile;
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

  const outputModeCount = [options.astOnly, options.noSymbols, options.profile === "symbols", options.profile === "diagnostics"].filter(Boolean).length;
  if (outputModeCount > 1) {
    return { help: false, targetPath, options, error: "Choose only one output mode/profile: --ast, --symbols, --no-symbols, --diagnostics, or --profile." };
  }

  return { help: false, targetPath, options };
}

function formatCliOutput(bundle: Awaited<ReturnType<typeof parsePath>>, options: CliOptions): string {
  if (!options.astOnly && !options.noSymbols) {
    return formatBundle(bundle, options.format, options.profile, options.pretty);
  }

  const selected = options.astOnly
    ? bundle.asts
    : { asts: bundle.asts, flowGraph: bundle.flowGraph, typeHints: bundle.typeHints, diagnostics: bundle.diagnostics };

  if (options.format === "json") return `${JSON.stringify(selected, null, options.pretty ? 2 : 0)}\n`;
  if (options.format === "yaml") return `${toYaml(selected)}\n`;
  return formatBundle(bundle, "compact", "full", options.pretty);
}

function helpText(): string {
  return `f-ast

Parse legacy Java/C# into compact agent maps, CommonAST, SymbolGraph, FlowGraph, and probable type hints.

Usage:
  f-ast <file-or-directory> [--profile agent|full|symbols|diagnostics] [--json | --yaml | --format compact|json|yaml]
  f-ast mcp <file-or-directory>

Options:
  --ast                         Output CommonAST array only
  --symbols                     Output SymbolGraph only
  --no-symbols                  Output ASTs and diagnostics without SymbolGraph
  --diagnostics                 Output diagnostics only
  --profile <profile>           agent (default), full, symbols, or diagnostics
  --json                        Output JSON
  --yaml                        Output YAML
  --format <format>             compact (default), json, or yaml
  --out <file>                  Write output to file
  --pretty                      Pretty-print JSON/YAML-compatible data (default)
  --compact                     Output compact agent map
  --parser-mode <mode>          auto, tree-sitter, or heuristic
  -h, --help                    Show help
`;
}

function mcpHelpText(): string {
  return `f-ast mcp

Start local MCP server over stdio for dynamic codebase queries.

Usage:
  f-ast mcp <file-or-directory> [--parser-mode auto|tree-sitter|heuristic]
`;
}
