import type { Language } from "./types.js";

/**
 * Replaces comments and literals with spaces while preserving source length and
 * line breaks. This keeps all regex-derived source spans aligned to the
 * original input.
 */
export function maskNonCode(source: string, language: Language): string {
  const masked = source.split("");
  let index = 0;

  while (index < source.length) {
    if (source.startsWith("//", index)) {
      index = maskLineComment(source, masked, index);
      continue;
    }

    if (source.startsWith("/*", index)) {
      index = maskBlockComment(source, masked, index);
      continue;
    }

    if (language === "csharp") {
      const verbatimPrefixLength =
        source.startsWith("$@\"", index) || source.startsWith("@$\"", index)
          ? 2
          : source.startsWith("@\"", index)
            ? 1
            : 0;
      if (verbatimPrefixLength > 0) {
        index = maskVerbatimString(source, masked, index, verbatimPrefixLength);
        continue;
      }

      if (source.startsWith("$\"", index)) {
        index = maskEscapedLiteral(source, masked, index, 1, "\"");
        continue;
      }
    }

    if (source[index] === "\"" || source[index] === "'") {
      index = maskEscapedLiteral(source, masked, index, 0, source[index] ?? "\"");
      continue;
    }

    index += 1;
  }

  return masked.join("");
}

function maskLineComment(source: string, masked: string[], start: number): number {
  let index = start;
  while (index < source.length && source[index] !== "\n" && source[index] !== "\r") {
    masked[index] = " ";
    index += 1;
  }
  return index;
}

function maskBlockComment(source: string, masked: string[], start: number): number {
  let index = start;
  while (index < source.length) {
    maskCharacter(source, masked, index);
    if (source[index] === "*" && source[index + 1] === "/") {
      maskCharacter(source, masked, index + 1);
      return index + 2;
    }
    index += 1;
  }
  return index;
}

function maskEscapedLiteral(
  source: string,
  masked: string[],
  start: number,
  prefixLength: number,
  quote: string
): number {
  let index = start;
  const quoteIndex = start + prefixLength;

  while (index <= quoteIndex && index < source.length) {
    maskCharacter(source, masked, index);
    index += 1;
  }

  while (index < source.length) {
    maskCharacter(source, masked, index);
    if (source[index] === "\\") {
      if (index + 1 < source.length) maskCharacter(source, masked, index + 1);
      index += 2;
      continue;
    }
    if (source[index] === quote) return index + 1;
    index += 1;
  }

  return index;
}

function maskVerbatimString(source: string, masked: string[], start: number, prefixLength: number): number {
  let index = start;
  const quoteIndex = start + prefixLength;

  while (index <= quoteIndex && index < source.length) {
    maskCharacter(source, masked, index);
    index += 1;
  }

  while (index < source.length) {
    maskCharacter(source, masked, index);
    if (source[index] === "\"" && source[index + 1] === "\"") {
      maskCharacter(source, masked, index + 1);
      index += 2;
      continue;
    }
    if (source[index] === "\"") return index + 1;
    index += 1;
  }

  return index;
}

function maskCharacter(source: string, masked: string[], index: number): void {
  if (source[index] !== "\n" && source[index] !== "\r") masked[index] = " ";
}
