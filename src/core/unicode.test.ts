import { expect, test } from "vitest";
import fc from "fast-check";
import { toCodePointOffset, toUtf16Offset, selectors, validSpan } from "./spans";
import { parsePacket } from "./packet";
import { appendReview } from "./reviews";
import { sha256 } from "./hash";

const unicode = fc
  .array(
    fc.oneof(
      fc.constantFrom("😀", "𠮷", "𝒜", "漢", "e\u0301", "\r\n", "العربية"),
      fc
        .integer({ min: 0, max: 0x10ffff })
        .filter((cp) => cp < 0xd800 || cp > 0xdfff)
        .map((cp) => String.fromCodePoint(cp)),
    ),
    { minLength: 1, maxLength: 80 },
  )
  .map((points) => points.join(""));
test("Unicode random span conversion preserves code point ranges and exact selected text", () => {
  fc.assert(
    fc.property(unicode, fc.nat(), fc.nat(), (text, a, b) => {
      const points = Array.from(text);
      const lo = Math.min(a % points.length, b % points.length);
      const hi = Math.max(a % points.length, b % points.length) + 1;
      const start = toUtf16Offset(text, lo),
        end = toUtf16Offset(text, hi);
      expect(validSpan(text, start, end)).toBe(true);
      expect(toCodePointOffset(text, start)).toBe(lo);
      expect(toCodePointOffset(text, end)).toBe(hi);
      expect(text.slice(start, end)).toBe(points.slice(lo, hi).join(""));
      expect(selectors(text, start, end).text_quote.exact).toBe(points.slice(lo, hi).join(""));
      for (let i = 0; i < text.length - 1; i++)
        if (
          text.charCodeAt(i) >= 0xd800 &&
          text.charCodeAt(i) <= 0xdbff &&
          text.charCodeAt(i + 1) >= 0xdc00 &&
          text.charCodeAt(i + 1) <= 0xdfff
        )
          expect(() => toCodePointOffset(text, i + 1)).toThrow("surrogate");
    }),
    { seed: 20261008, numRuns: 300 },
  );
});
test.each([[-1], [1.5], [NaN], [Infinity], [100]])(
  "converters reject invalid offsets %s",
  (offset) => {
    expect(() => toCodePointOffset("😀", offset)).toThrow();
    expect(() => toUtf16Offset("😀", offset)).toThrow();
  },
);
test("quote context is exactly bounded to 32 code points rather than code units", () => {
  expect(selectors("😀".repeat(40) + "X" + "𠮷".repeat(40), 80, 81).text_quote).toEqual({
    type: "TextQuoteSelector",
    exact: "X",
    prefix: "😀".repeat(32),
    suffix: "𠮷".repeat(32),
  });
});
test("W3C published quote and alphabet position examples retain literal selector values", () => {
  expect(selectors("this is an anotation that has some", 11, 20).text_quote).toEqual({
    type: "TextQuoteSelector",
    exact: "anotation",
    prefix: "this is an ",
    suffix: " that has some",
  });
  expect(selectors("abcdefghijklmnopqrstuvwxyz", 4, 7).text_position).toEqual({
    type: "TextPositionSelector",
    start: 4,
    end: 7,
  });
});
test("random Unicode hashes stable across export/reimport while NFC hash reflects equivalence", async () => {
  await fc.assert(
    fc.asyncProperty(unicode, async (text) => {
      const digest = await sha256(text);
      const packet = await parsePacket(
        JSON.stringify({
          schema_version: 1,
          sources: [{ id: "s", title: "T", text, sha256: digest }],
          claims: [{ id: "c", text: "C", citation_ids: ["s"] }],
          reviews: [],
        }),
        sha256,
      );
      const reviewed = appendReview(packet, {
        id: "r",
        claim_id: "c",
        source_id: "s",
        source_sha256: digest,
        start: 0,
        end: text.length,
        verdict: "partial",
        rationale: "R",
        reviewer: "P",
      });
      const restored = await parsePacket(JSON.stringify(reviewed), sha256);
      expect(restored).toEqual(reviewed);
      expect(restored.sources[0].sha256).toBe(digest);
      expect(restored.sources[0].nfc_sha256).toBe(
        await sha256(text.normalize("NFC").normalize("NFC")),
      );
    }),
    { seed: 20261008, numRuns: 100 },
  );
});
