import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

if (!existsSync("dist/src/index.js")) {
  throw new Error("dist/src/index.js missing. Run npm run build first.");
}

const result = spawnSync(process.execPath, ["bin/f-ast.js", "examples/legacy-mixed", "--parser-mode", "heuristic"], {
  encoding: "utf8"
});

if (result.status !== 0) {
  throw new Error(`f-ast exited ${result.status}: ${result.stderr}`);
}

if (!result.stdout.startsWith("project files=2") || !result.stdout.includes("edge calls")) {
  throw new Error("Expected default compact agent output.");
}

const jsonResult = spawnSync(process.execPath, ["bin/f-ast.js", "examples/legacy-mixed", "--json", "--profile", "full"], {
  encoding: "utf8"
});

if (jsonResult.status !== 0) {
  throw new Error(`f-ast --json exited ${jsonResult.status}: ${jsonResult.stderr}`);
}

const bundle = JSON.parse(jsonResult.stdout);
if (!Array.isArray(bundle.asts) || bundle.asts.length !== 2) {
  throw new Error("Expected two ASTs from examples/legacy-mixed.");
}
if (!bundle.flowGraph?.edges?.length || !Array.isArray(bundle.typeHints)) {
  throw new Error("Expected flowGraph and typeHints in full JSON output.");
}

const diagnosticsResult = spawnSync(process.execPath, ["bin/f-ast.js", "examples/legacy-mixed", "--diagnostics", "--json"], {
  encoding: "utf8"
});

if (diagnosticsResult.status !== 0) {
  throw new Error(`f-ast --diagnostics exited ${diagnosticsResult.status}: ${diagnosticsResult.stderr}`);
}

const diagnostics = JSON.parse(diagnosticsResult.stdout);
if (!Array.isArray(diagnostics) || diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
  throw new Error("Expected diagnostics-only output with no errors.");
}

const compactResult = spawnSync(process.execPath, ["bin/f-ast.js", "examples/legacy-mixed", "--symbols"], {
  encoding: "utf8"
});

if (compactResult.status !== 0 || !compactResult.stdout.startsWith("symbols decls=")) {
  throw new Error("Expected compact symbol output with status 0.");
}

const pkg = JSON.parse(await readFile("package.json", "utf8"));
if (pkg.name !== "@frankstop/f-ast" || pkg.bin["f-ast"] !== "./bin/f-ast.js") {
  throw new Error("Package name/bin contract changed.");
}
