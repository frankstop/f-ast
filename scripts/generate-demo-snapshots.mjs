import fs from "node:fs/promises";
import path from "node:path";
import { parsePath } from "../dist/src/index.js";

const demoPath = path.join("examples", "legacy-messy-sample");
const outputPath = path.join(demoPath, "output");
const bundle = await parsePath(demoPath);

await fs.mkdir(outputPath, { recursive: true });
await Promise.all([
  writeJson(path.join(outputPath, "commonast.json"), bundle.asts),
  writeJson(path.join(outputPath, "symbolgraph.json"), bundle.symbolGraph),
  writeJson(path.join(outputPath, "diagnostics.json"), bundle.diagnostics)
]);

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
