import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { buildSymbolGraph, parseCode, parsePath } from "../src/index.js";

describe("public API contract", () => {
  it("exports stable v1-target API functions", () => {
    expect(typeof parseCode).toBe("function");
    expect(typeof parsePath).toBe("function");
    expect(typeof buildSymbolGraph).toBe("function");
  });

  it("keeps package entrypoints and release files stable", () => {
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf8")) as {
      main: string;
      types: string;
      bin: Record<string, string>;
      files: string[];
      scripts: Record<string, string>;
    };

    expect(pkg.main).toBe("./dist/src/index.js");
    expect(pkg.types).toBe("./dist/src/index.d.ts");
    expect(pkg.bin["f-ast"]).toBe("./bin/f-ast.js");
    expect(pkg.files).toEqual(["bin", "docs", "dist", "schemas", "README.md", "LICENSE"]);
    expect(pkg.scripts).toHaveProperty("prepack");
    expect(pkg.scripts).toHaveProperty("check:release");
  });
});
