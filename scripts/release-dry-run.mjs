import fs from "node:fs";

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const readme = fs.readFileSync("README.md", "utf8");
const changelog = fs.readFileSync("changelog.md", "utf8");

const requiredFiles = [
  "docs/common-ast.md",
  "docs/symbol-graph.md",
  "docs/diagnostics.md",
  "docs/release-checklist.md",
  "docs/v1-roadmap.md",
  "docs/known-limitations.md",
  "docs/release-notes-v1.0.0.md",
  "schemas/common-ast.schema.json",
  "dist/src/index.js",
  "dist/src/index.d.ts"
];

if (pkg.version !== "1.0.0") {
  throw new Error(`Expected package version 1.0.0, got ${pkg.version}.`);
}

if (!readme.includes("status-v1.0")) {
  throw new Error("README status badge does not mention v1.0.");
}

if (!changelog.includes("## 1.0.0")) {
  throw new Error("changelog.md missing 1.0.0 section.");
}

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) throw new Error(`Required release file missing: ${file}`);
}

console.log(
  JSON.stringify(
    {
      version: pkg.version,
      releaseNotes: "docs/release-notes-v1.0.0.md",
      filesChecked: requiredFiles.length,
      publish: "not performed"
    },
    null,
    2
  )
);
