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

const bundle = JSON.parse(result.stdout);
if (!Array.isArray(bundle.asts) || bundle.asts.length !== 2) {
  throw new Error("Expected two ASTs from examples/legacy-mixed.");
}

const diagnosticsResult = spawnSync(process.execPath, ["bin/f-ast.js", "examples/legacy-mixed", "--diagnostics"], {
  encoding: "utf8"
});

if (diagnosticsResult.status !== 0) {
  throw new Error(`f-ast --diagnostics exited ${diagnosticsResult.status}: ${diagnosticsResult.stderr}`);
}

const diagnostics = JSON.parse(diagnosticsResult.stdout);
if (!Array.isArray(diagnostics) || diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
  throw new Error("Expected diagnostics-only output with no errors.");
}

const compactResult = spawnSync(process.execPath, ["bin/f-ast.js", "examples/legacy-mixed", "--symbols", "--compact"], {
  encoding: "utf8"
});

if (compactResult.status !== 0 || compactResult.stdout.includes("\n  ")) {
  throw new Error("Expected compact symbol output with status 0.");
}

const pkg = JSON.parse(await readFile("package.json", "utf8"));
if (pkg.name !== "@frankstop/f-ast" || pkg.bin["f-ast"] !== "./bin/f-ast.js") {
  throw new Error("Package name/bin contract changed.");
}
