import type { Language } from "./types.js";

export function makeNodeId(language: Language, filePath: string | undefined, kind: string, ordinal: number): string {
  const filePart = filePath ? filePath.replaceAll(/[^A-Za-z0-9_.-]+/g, "_") : "inline";
  return `${language}:${filePart}:${kind}:${ordinal}`;
}

export function makeSymbolId(prefix: string, nodeId: string, name: string): string {
  return `${prefix}:${nodeId}:${name}`;
}
