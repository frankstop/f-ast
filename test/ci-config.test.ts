import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("CI dependency setup", () => {
  it("does not enable setup-node npm cache without a committed lockfile", () => {
    const workflow = fs.readFileSync(".github/workflows/ci.yml", "utf8");
    const hasLockfile = fs.existsSync("package-lock.json");

    if (!hasLockfile) {
      expect(workflow).not.toMatch(/cache:\s*npm/);
    } else {
      expect(workflow).toMatch(/cache:\s*npm/);
      expect(workflow).toMatch(/npm ci/);
    }
  });

  it("keeps tree-sitter grammar packages on one compatible peer range", () => {
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf8")) as {
      dependencies: Record<string, string>;
    };

    expect(pkg.dependencies["tree-sitter"]).toBe("^0.21.1");
    expect(pkg.dependencies["tree-sitter-java"]).toBe("^0.23.5");
    expect(pkg.dependencies["tree-sitter-c-sharp"]).toBe("0.21.3");
  });
});
