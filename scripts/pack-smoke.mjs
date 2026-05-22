import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";

const root = process.cwd();
const tempRoot = await mkdtemp(join(tmpdir(), "f-ast-pack-"));
const npmCache = join(tempRoot, "npm-cache");
let tarballPath;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    encoding: "utf8",
    env: {
      ...process.env,
      npm_config_cache: npmCache
    },
    stdio: options.stdio ?? "pipe"
  });

  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed with ${result.status}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
    );
  }

  return result;
}

try {
  run("npm", ["run", "build"]);
  const pack = run("npm", ["pack", "--json"]);
  const [packed] = JSON.parse(pack.stdout);
  if (!packed?.filename) throw new Error("npm pack did not return a tarball filename.");

  tarballPath = join(root, packed.filename);
  const packedFiles = new Set(packed.files.map((file) => file.path));
  for (const expected of ["bin/f-ast.js", "dist/src/index.js", "dist/src/index.d.ts", "README.md", "LICENSE"]) {
    if (!packedFiles.has(expected)) throw new Error(`Packed tarball missing ${expected}.`);
  }

  await writeFile(
    join(tempRoot, "package.json"),
    JSON.stringify({ type: "module", dependencies: { "@frankstop/f-ast": tarballPath } }, null, 2)
  );

  run("npm", ["install"], { cwd: tempRoot });

  const importCheck = run(
    process.execPath,
    [
      "-e",
      "import('@frankstop/f-ast').then(async m => { const ast = await m.parseCode('class Smoke {}', { language: 'java' }); if (ast.root.kind !== 'compilationUnit') process.exit(1); })"
    ],
    { cwd: tempRoot }
  );
  if (importCheck.status !== 0) throw new Error("Import smoke failed.");

  const sampleDir = join(tempRoot, "sample");
  await writeFile(join(tempRoot, "Smoke.java"), "class Smoke { void run() { save(); } void save() {} }");
  if (!existsSync(sampleDir)) {
    // Keep the current smoke single-file until project loading expands.
  }

  const cli = run(join(tempRoot, "node_modules", ".bin", "f-ast"), ["Smoke.java", "--symbols", "--compact"], {
    cwd: tempRoot
  });
  const graph = JSON.parse(cli.stdout);
  if (!Array.isArray(graph.declarations) || !Array.isArray(graph.references)) {
    throw new Error("CLI smoke did not return SymbolGraph shape.");
  }

  console.log(
    JSON.stringify(
      {
        tarball: packed.filename,
        files: packed.files.length,
        unpackedSize: packed.unpackedSize,
        declarations: graph.declarations.length,
        references: graph.references.length
      },
      null,
      2
    )
  );
} finally {
  await rm(tempRoot, { recursive: true, force: true });
  if (tarballPath) await rm(tarballPath, { force: true });
}
