import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { helpText, mcpHelpText } from "../src/cli.js";

const POSITIONING =
  "Agent context tool that turns legacy Java and C# into compact structural maps with explicit uncertainty.";

describe("project messaging", () => {
  it("uses one product description across package metadata, README, and CLI help", () => {
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf8")) as { description?: string };
    const readme = fs.readFileSync("README.md", "utf8").replaceAll("\n", " ");

    expect(pkg.description).toBe(POSITIONING);
    expect(readme).toContain(POSITIONING);
    expect(helpText()).toContain(POSITIONING);
    expect(mcpHelpText()).toContain("targeted structural context to AI agents");
  });

  it("does not advertise an unpublished registry install in current documentation", () => {
    for (const file of ["README.md", "docs/release-notes-v1.0.0.md", "docs/release-notes-v1.1.0.md"]) {
      expect(fs.readFileSync(file, "utf8")).not.toContain("npm install @frankstop/f-ast");
    }
  });
});
