import { describe, expect, it } from "vitest";
import { formatBundle, selectProfile, toYaml } from "../src/formatters.js";
import { parsePath } from "../src/index.js";

describe("agent output profiles", () => {
  it("defaults to compact structural map for agent use", async () => {
    const bundle = await parsePath("examples/legacy-mixed");
    const compact = formatBundle(bundle, "compact", "agent", true);

    expect(compact).toContain("project files=2");
    expect(compact).toContain("decl class CustomerService");
    expect(compact).toContain("ref call CustomerService.findCustomer.findById");
    expect(compact).toContain("edge calls");
    expect(compact).toContain("diag symbol.unresolved.member warning");
  });

  it("keeps JSON and YAML profiles semantically aligned", async () => {
    const bundle = await parsePath("examples/legacy-mixed");
    const agentProfile = selectProfile(bundle, "agent") as {
      files: unknown[];
      symbols: { declarations: unknown[]; references: unknown[] };
      flow: { edges: unknown[] };
      typeHints: unknown[];
      diagnostics: unknown[];
    };
    const json = JSON.stringify(agentProfile);
    const yaml = toYaml(agentProfile);

    expect(JSON.parse(json).files).toHaveLength(agentProfile.files.length);
    expect(yaml).toContain(`declarations:`);
    expect(yaml).toContain(`references:`);
    expect(agentProfile.symbols.declarations).toHaveLength(bundle.symbolGraph.declarations.length);
    expect(agentProfile.flow.edges).toHaveLength(bundle.flowGraph.edges.length);
  });
});
