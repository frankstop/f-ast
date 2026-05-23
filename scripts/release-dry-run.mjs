import fs from "node:fs";

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const readme = fs.readFileSync("README.md", "utf8");
const changelog = fs.readFileSync("changelog.md", "utf8");
const releaseNotes = `docs/release-notes-v${pkg.version}.md`;

const requiredFiles = [
  "docs/common-ast.md",
  "docs/symbol-graph.md",
  "docs/diagnostics.md",
  "docs/compact-output.md",
  "docs/mcp-server.md",
  "docs/type-hints.md",
  "docs/flow-graph.md",
  "docs/release-checklist.md",
  "docs/v1-roadmap.md",
  "docs/known-limitations.md",
  releaseNotes,
  "schemas/common-ast.schema.json",
  "dist/src/index.js",
  "dist/src/index.d.ts"
];

if (!/^\d+\.\d+\.\d+$/.test(pkg.version)) {
  throw new Error(`Expected semver package version, got ${pkg.version}.`);
}

const statusMinor = `status-v${pkg.version.split(".").slice(0, 2).join(".")}`;
if (!readme.includes(statusMinor)) {
  throw new Error(`README status badge does not mention ${statusMinor}.`);
}

if (!changelog.includes(`## ${pkg.version}`)) {
  throw new Error(`changelog.md missing ${pkg.version} section.`);
}

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) throw new Error(`Required release file missing: ${file}`);
}

console.log(
  JSON.stringify(
    {
      version: pkg.version,
      releaseNotes,
      filesChecked: requiredFiles.length,
      publish: "not performed"
    },
    null,
    2
  )
);
