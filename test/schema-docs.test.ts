import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("schema and docs", () => {
  it("ships parseable CommonAST JSON schema and referenced docs", () => {
    const schema = JSON.parse(fs.readFileSync("schemas/common-ast.schema.json", "utf8")) as {
      title?: string;
      properties?: { version?: { const?: string }; [key: string]: unknown };
    };
    const readme = fs.readFileSync("README.md", "utf8");

    expect(schema.title).toBe("CommonAST");
    expect(schema.properties?.version?.const).toBe("0.2");
    expect(schema.properties).toHaveProperty("root");
    expect(readme).toContain("docs/common-ast.md");
    expect(readme).toContain("docs/symbol-graph.md");
    expect(readme).toContain("docs/diagnostics.md");
    expect(readme).toContain("schemas/common-ast.schema.json");
  });
});
