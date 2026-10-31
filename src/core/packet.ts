import validateSchema from "../generated/packet-validator.js";
import { validSpan, selectors, type TextQuoteSelector, type TextPositionSelector } from "./spans";
export type Hash = (text: string) => Promise<string>;
export type Verdict = "supported" | "partial" | "contradicted" | "unverifiable";
export interface Source {
  id: string;
  title: string;
  text: string;
  sha256: string;
  nfc_sha256: string;
}
export interface Claim {
  id: string;
  text: string;
  citation_ids: string[];
}
export interface LegacyReview {
  id: string;
  claim_id: string;
  source_id: string;
  source_sha256: string;
  start: number;
  end: number;
  verdict: Verdict;
  rationale: string;
  reviewer: string;
}
export interface Review extends LegacyReview {
  source_nfc_sha256: string | null;
  reviewer_identity_assurance: "self-reported";
  text_quote: TextQuoteSelector | null;
  text_position: TextPositionSelector | null;
}
export interface Packet {
  schema_version: 2;
  sources: Source[];
  claims: Claim[];
  reviews: Review[];
}
export function requireValue(ok: boolean, message: string): asserts ok {
  if (!ok) throw new Error(message);
}
function object(value: unknown, keys: string[], label: string): Record<string, unknown> {
  requireValue(
    typeof value === "object" && value !== null && !Array.isArray(value),
    `${label}: object required`,
  );
  const row = value as Record<string, unknown>;
  requireValue(
    JSON.stringify(Object.keys(row).sort()) === JSON.stringify([...keys].sort()),
    `${label}: exact fields required`,
  );
  return row;
}
function text(value: unknown, limit: number, label: string, allowEmpty = false): string {
  requireValue(
    typeof value === "string" && value.length <= limit && (allowEmpty || value.trim().length > 0),
    `${label}: invalid text`,
  );
  requireValue(
    !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value),
    `${label}: invalid Unicode`,
  );
  return value;
}
function digest(value: unknown, label: string): string {
  const result = text(value, 64, label);
  requireValue(/^[a-f0-9]{64}$/.test(result), `${label}: SHA-256 hex required`);
  return result;
}
function entries(value: unknown, limit: number, label: string): unknown[] {
  requireValue(Array.isArray(value) && value.length <= limit, `${label}: invalid count`);
  return value;
}
function unique(rows: { id: string }[], label: string): void {
  requireValue(new Set(rows.map((row) => row.id)).size === rows.length, `${label}: duplicate ID`);
}
const legacyKeys = [
  "id",
  "claim_id",
  "source_id",
  "source_sha256",
  "start",
  "end",
  "verdict",
  "rationale",
  "reviewer",
];
const newKeys = [
  ...legacyKeys,
  "source_nfc_sha256",
  "reviewer_identity_assurance",
  "text_quote",
  "text_position",
];
export function parseReview(value: unknown): LegacyReview | Review {
  const modern = typeof value === "object" && value !== null && Object.hasOwn(value, "text_quote");
  const row = object(value, modern ? newKeys : legacyKeys, "review");
  requireValue(
    typeof row.start === "number" && typeof row.end === "number",
    "offsets must be numbers",
  );
  requireValue(
    typeof row.verdict === "string" &&
      ["supported", "partial", "contradicted", "unverifiable"].includes(row.verdict),
    "invalid verdict",
  );
  const review: LegacyReview = {
    id: text(row.id, 200, "review ID"),
    claim_id: text(row.claim_id, 200, "claim reference"),
    source_id: text(row.source_id, 200, "source reference"),
    source_sha256: digest(row.source_sha256, "review hash"),
    start: row.start,
    end: row.end,
    verdict: row.verdict as Verdict,
    rationale: text(row.rationale, 4000, "rationale"),
    reviewer: text(row.reviewer, 200, "reviewer"),
  };
  if (!modern) return review;
  requireValue(
    row.reviewer_identity_assurance === "self-reported",
    "reviewer identity must be self-reported",
  );
  const source_nfc_sha256 =
    row.source_nfc_sha256 === null ? null : digest(row.source_nfc_sha256, "review NFC hash");
  requireValue(
    (row.text_quote === null) === (source_nfc_sha256 === null),
    "selector NFC identity must be available together",
  );
  let text_quote: TextQuoteSelector | null = null,
    text_position: TextPositionSelector | null = null;
  requireValue(
    (row.text_quote === null) === (row.text_position === null),
    "selectors must both be available or null",
  );
  if (row.text_quote !== null) {
    const quote = object(row.text_quote, ["type", "exact", "prefix", "suffix"], "quote selector");
    const position = object(row.text_position, ["type", "start", "end"], "position selector");
    requireValue(
      quote.type === "TextQuoteSelector" && position.type === "TextPositionSelector",
      "invalid selector type",
    );
    text_quote = {
      type: "TextQuoteSelector",
      exact: text(quote.exact, 100000, "exact", true),
      prefix: text(quote.prefix, 64, "prefix", true),
      suffix: text(quote.suffix, 64, "suffix", true),
    };
    requireValue(
      text_quote.exact.length > 0 &&
        Array.from(text_quote.prefix).length <= 32 &&
        Array.from(text_quote.suffix).length <= 32,
      "invalid quote context",
    );
    requireValue(
      Number.isSafeInteger(position.start) &&
        Number.isSafeInteger(position.end) &&
        (position.start as number) >= 0 &&
        (position.end as number) > (position.start as number) &&
        (position.end as number) <= 100000,
      "invalid code point positions",
    );
    text_position = {
      type: "TextPositionSelector",
      start: position.start as number,
      end: position.end as number,
    };
    requireValue(
      Array.from(text_quote.exact).length === text_position.end - text_position.start &&
        text_quote.exact.length === review.end - review.start &&
        text_position.start <= review.start &&
        text_position.end <= review.end,
      "selector length mismatch",
    );
  }
  return {
    ...review,
    source_nfc_sha256,
    reviewer_identity_assurance: "self-reported",
    text_quote,
    text_position,
  };
}
export function enrichReview(packet: Packet, review: LegacyReview | Review): Review {
  if ("text_quote" in review) return review;
  const source = packet.sources.find((row) => row.id === review.source_id);
  const current = source?.sha256 === review.source_sha256;
  return {
    ...review,
    source_nfc_sha256: current ? source.nfc_sha256 : null,
    reviewer_identity_assurance: "self-reported",
    ...(current
      ? selectors(source.text, review.start, review.end)
      : { text_quote: null, text_position: null }),
  };
}
export function assertReview(packet: Packet, review: Review): void {
  parseReview(review);
  const source = packet.sources.find((row) => row.id === review.source_id);
  const claim = packet.claims.find((row) => row.id === review.claim_id);
  requireValue(
    !!source && !!claim && claim.citation_ids.includes(source.id),
    "review: unknown or uncited reference",
  );
  requireValue(
    Number.isSafeInteger(review.start) &&
      Number.isSafeInteger(review.end) &&
      review.start >= 0 &&
      review.start < review.end &&
      review.end <= 100000,
    "review: invalid offsets",
  );
  if (review.source_sha256 === source.sha256) {
    requireValue(validSpan(source.text, review.start, review.end), "review: invalid current span");
    const expected = selectors(source.text, review.start, review.end);
    requireValue(
      review.source_nfc_sha256 === source.nfc_sha256 &&
        JSON.stringify(review.text_quote) === JSON.stringify(expected.text_quote) &&
        JSON.stringify(review.text_position) === JSON.stringify(expected.text_position),
      "review: current selectors or NFC hash mismatch",
    );
  }
}
export async function parsePacket(raw: string, hash: Hash): Promise<Packet> {
  requireValue(new TextEncoder().encode(raw).byteLength <= 5 * 1024 * 1024, "packet exceeds 5 MiB");
  requireValue(!raw.startsWith("\uFEFF"), "BOM forbidden");
  const root = object(
    JSON.parse(raw),
    ["schema_version", "sources", "claims", "reviews"],
    "packet",
  );
  requireValue(
    root.schema_version === 1 || root.schema_version === 2,
    "schema_version must be 1 or 2",
  );
  const structural = validateSchema(root);
  const duplicateCitation = validateSchema.errors?.some(
    (error) =>
      error.keyword === "uniqueItems" && /^\/claims\/\d+\/citation_ids/.test(error.instancePath),
  );
  requireValue(
    structural,
    duplicateCitation ? "duplicate citation" : "packet schema validation failed",
  );
  const modern = root.schema_version === 2;
  const sources: Source[] = [];
  for (const value of entries(root.sources, 100, "sources")) {
    const row = object(
      value,
      modern ? ["id", "title", "text", "sha256", "nfc_sha256"] : ["id", "title", "text", "sha256"],
      "source",
    );
    const sourceText = text(row.text, 100000, "source text", true);
    const nfc = await hash(sourceText.normalize("NFC"));
    const source = {
      id: text(row.id, 200, "source ID"),
      title: text(row.title, 1000, "title"),
      text: sourceText,
      sha256: digest(row.sha256, "source hash"),
      nfc_sha256: modern ? digest(row.nfc_sha256, "NFC hash") : nfc,
    };
    requireValue((await hash(source.text)) === source.sha256, `source ${source.id}: hash mismatch`);
    requireValue(nfc === source.nfc_sha256, `source ${source.id}: NFC hash mismatch`);
    sources.push(source);
  }
  unique(sources, "sources");
  const claims: Claim[] = entries(root.claims, 1000, "claims").map((value) => {
    const row = object(value, ["id", "text", "citation_ids"], "claim");
    const citation_ids = entries(row.citation_ids, 100, "citations").map((id) =>
      text(id, 200, "citation ID"),
    );
    requireValue(new Set(citation_ids).size === citation_ids.length, "duplicate citation");
    requireValue(
      citation_ids.every((id) => sources.some((source) => source.id === id)),
      "unknown citation",
    );
    return {
      id: text(row.id, 200, "claim ID"),
      text: text(row.text, 10000, "claim text"),
      citation_ids,
    };
  });
  unique(claims, "claims");
  const packet: Packet = { schema_version: 2, sources, claims, reviews: [] };
  let exportBytes = new TextEncoder().encode(JSON.stringify(packet)).byteLength;
  requireValue(exportBytes <= 5 * 1024 * 1024, "migrated packet exceeds 5 MiB");
  for (const value of entries(root.reviews, 10000, "reviews")) {
    object(value, modern ? newKeys : legacyKeys, "review");
    const review = enrichReview(packet, parseReview(value));
    exportBytes +=
      new TextEncoder().encode(JSON.stringify(review)).byteLength + (packet.reviews.length ? 1 : 0);
    requireValue(exportBytes <= 5 * 1024 * 1024, "migrated packet exceeds 5 MiB");
    packet.reviews.push(review);
  }
  unique(packet.reviews, "reviews");
  for (const review of packet.reviews) assertReview(packet, review);
  return packet;
}
