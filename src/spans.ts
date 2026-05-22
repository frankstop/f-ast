import type { SourcePosition, SourceSpan } from "./types.js";

export const zeroSpan: SourceSpan = {
  start: { row: 0, column: 0 },
  end: { row: 0, column: 0 },
  startIndex: 0,
  endIndex: 0
};

export function positionAt(source: string, index: number): SourcePosition {
  const safeIndex = Math.max(0, Math.min(index, source.length));
  let row = 0;
  let column = 0;

  for (let i = 0; i < safeIndex; i += 1) {
    if (source.charCodeAt(i) === 10) {
      row += 1;
      column = 0;
    } else {
      column += 1;
    }
  }

  return { row, column };
}

export function spanFromIndexes(source: string, startIndex: number, endIndex: number): SourceSpan {
  const start = Math.max(0, Math.min(startIndex, source.length));
  const end = Math.max(start, Math.min(endIndex, source.length));
  return {
    start: positionAt(source, start),
    end: positionAt(source, end),
    startIndex: start,
    endIndex: end
  };
}
