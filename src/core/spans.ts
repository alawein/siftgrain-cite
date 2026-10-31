export function validSpan(text: string, start: number, end: number): boolean {
  const boundary = (index: number): boolean => {
    if (index <= 0 || index >= text.length) return true;
    const before = text.charCodeAt(index - 1),
      after = text.charCodeAt(index);
    return !(before >= 0xd800 && before <= 0xdbff && after >= 0xdc00 && after <= 0xdfff);
  };
  return (
    Number.isSafeInteger(start) &&
    Number.isSafeInteger(end) &&
    start >= 0 &&
    start < end &&
    end <= text.length &&
    boundary(start) &&
    boundary(end)
  );
}

export function sourceOffset(text: string, displayedOffset: number): number {
  if (!Number.isSafeInteger(displayedOffset) || displayedOffset < 0)
    throw new Error("Invalid displayed offset");
  let original = 0;
  for (let displayed = 0; displayed < displayedOffset; displayed++) {
    if (original >= text.length) throw new Error("Displayed offset exceeds source");
    if (text[original] === "\r" && text[original + 1] === "\n") original++;
    original++;
  }
  return original;
}

export function toCodePointOffset(text: string, offset: number): number {
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > text.length)
    throw new Error("Invalid UTF-16 offset");
  if (
    offset > 0 &&
    offset < text.length &&
    /[\uD800-\uDBFF]/u.test(text[offset - 1]) &&
    /[\uDC00-\uDFFF]/u.test(text[offset])
  )
    throw new Error("Offset splits a surrogate pair");
  return Array.from(text.slice(0, offset)).length;
}

export function toUtf16Offset(text: string, offset: number): number {
  const points = Array.from(text);
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > points.length)
    throw new Error("Invalid code point offset");
  return points.slice(0, offset).join("").length;
}

export interface TextQuoteSelector {
  type: "TextQuoteSelector";
  exact: string;
  prefix: string;
  suffix: string;
}
export interface TextPositionSelector {
  type: "TextPositionSelector";
  start: number;
  end: number;
}
export function selectors(
  text: string,
  start: number,
  end: number,
): {
  text_quote: TextQuoteSelector;
  text_position: TextPositionSelector;
} {
  if (!validSpan(text, start, end)) throw new Error("Invalid selector span");
  return {
    text_quote: {
      type: "TextQuoteSelector",
      exact: text.slice(start, end),
      prefix: Array.from(text.slice(0, start)).slice(-32).join(""),
      suffix: Array.from(text.slice(end)).slice(0, 32).join(""),
    },
    text_position: {
      type: "TextPositionSelector",
      start: toCodePointOffset(text, start),
      end: toCodePointOffset(text, end),
    },
  };
}
