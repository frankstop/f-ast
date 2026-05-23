import type { SourceSpan } from "./types.js";

export function spanFromIndexes(source: string, startIndex: number, endIndex: number): SourceSpan {
  return {
    start: positionFromIndex(source, startIndex),
    end: positionFromIndex(source, endIndex),
    startIndex,
    endIndex
  };
}

function positionFromIndex(source: string, index: number): { row: number; column: number } {
  let row = 0;
  let column = 0;
  const bounded = Math.max(0, Math.min(index, source.length));

  for (let cursor = 0; cursor < bounded; cursor += 1) {
    if (source[cursor] === "\n") {
      row += 1;
      column = 0;
    } else {
      column += 1;
    }
  }

  return { row, column };
}
