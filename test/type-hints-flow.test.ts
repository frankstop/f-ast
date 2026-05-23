import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parsePath } from "../src/index.js";

describe("probable type hints and flow graph", () => {
  it("emits syntax-derived hints while preserving unresolved diagnostics", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "f-ast-flow-"));
    const filePath = path.join(dir, "OrderService.cs");
    await fs.writeFile(
      filePath,
      `using System.Collections.Generic;

       public class OrderService {
         private List<Order> orders;

         public Order Find(Order order, MissingApi missing) {
           orders.Add(order);
           var total = orders.Count;
           foreach (var item in orders) {
             item.Touch();
           }
           if (total > 0) {
             missing.Calculate();
           }
           for (var i = 0; i < orders.Count; i++) {
             total += i;
           }
           return order;
         }
       }`,
      "utf8"
    );

    const bundle = await parsePath(dir);
    const hintKinds = bundle.typeHints.map((hint) => hint.kind).sort();
    const edgeKinds = new Set(bundle.flowGraph.edges.map((edge) => edge.kind));

    expect(hintKinds).toContain("collection-ish");
    expect(hintKinds).toContain("iterable-ish");
    expect(hintKinds).toContain("object-shape");
    expect(bundle.typeHints.some((hint) => hint.target === "orders" && hint.evidence.includes("Count"))).toBe(true);
    expect(bundle.typeHints.every((hint) => hint.confidence === "low" || hint.confidence === "medium")).toBe(true);

    expect(edgeKinds.has("calls")).toBe(true);
    expect(edgeKinds.has("reads")).toBe(true);
    expect(edgeKinds.has("writes")).toBe(true);
    expect(edgeKinds.has("mutates")).toBe(true);
    expect(edgeKinds.has("returns")).toBe(true);
    expect(edgeKinds.has("branches")).toBe(true);
    expect(edgeKinds.has("loops")).toBe(true);
    expect(edgeKinds.has("dependsOn")).toBe(true);

    expect(bundle.diagnostics.some((diagnostic) => diagnostic.code.startsWith("symbol.unresolved"))).toBe(true);
  });
});
