import { parsePacket, requireValue, type Packet, type Hash } from "./packet.js";
import { reviewState } from "./reviews.js";
const obj = (v: unknown): Record<string, unknown> => {
  requireValue(typeof v === "object" && v !== null && !Array.isArray(v), "trace object required");
  return v as Record<string, unknown>;
};
export async function importTrace(raw: string, hash: Hash): Promise<Packet> {
  requireValue(new TextEncoder().encode(raw).length <= 5 * 1024 * 1024, "trace exceeds 5 MiB");
  let input: unknown;
  try {
    input = JSON.parse(raw);
  } catch {
    input = raw
      .trim()
      .split(/\r?\n/)
      .map((line) => JSON.parse(line));
  }
  const rows = Array.isArray(input) ? input : (obj(input).runs ?? [input]);
  requireValue(
    Array.isArray(rows) && rows.length > 0 && rows.length <= 1000,
    "trace rows required",
  );
  const sources: { id: string; title: string; text: string; sha256: string }[] = [],
    claims: Packet["claims"] = [];
  for (const [index, value] of rows.entries()) {
    const row = obj(value),
      outputs = row.outputs === undefined ? row : obj(row.outputs),
      inputs = row.inputs === undefined ? row : obj(row.inputs);
    const one = (values: unknown[], label: string): unknown => {
      const supplied = values.filter((v) => v !== undefined);
      requireValue(supplied.length === 1, `trace ${label}: exactly one alias required`);
      return supplied[0];
    };
    const answer = one(
      [outputs.answer, outputs.output, outputs.response, outputs.result],
      "answer",
    );
    const documents = one(
      [
        inputs.documents,
        inputs.context,
        inputs.source_documents,
        ...(inputs === row ? [] : [row.documents, row.source_documents]),
        ...(outputs === row ? [] : [outputs.documents, outputs.source_documents]),
      ],
      "documents",
    );
    requireValue(
      typeof answer === "string" && Array.isArray(documents) && documents.length > 0,
      "trace answer and document array required",
    );
    requireValue(
      documents.length <= 100 && sources.length + documents.length <= 100,
      "trace source count exceeds 100",
    );
    const ids: string[] = [];
    for (const [j, d] of documents.entries()) {
      const sourceDocument = typeof d === "string" ? { page_content: d } : obj(d);
      const text = sourceDocument.page_content ?? sourceDocument.text;
      requireValue(
        typeof text === "string" && text.length <= 100000,
        "trace document text required or exceeds cap",
      );
      const metadata = sourceDocument.metadata === undefined ? {} : obj(sourceDocument.metadata);
      const title = metadata.title ?? sourceDocument.title ?? `Trace ${index + 1} source ${j + 1}`;
      requireValue(typeof title === "string", "trace title must be text");
      const id = `run-${index + 1}-source-${j + 1}`;
      ids.push(id);
      sources.push({ id, title, text, sha256: await hash(text) });
    }
    claims.push({ id: `run-${index + 1}`, text: answer, citation_ids: ids });
  }
  return parsePacket(JSON.stringify({ schema_version: 1, sources, claims, reviews: [] }), hash);
}
export function labelExport(p: Packet, format: "ais" | "alce") {
  return {
    schema_version: 1,
    format,
    scope: "claim-review label interchange; not a native benchmark score file",
    items: p.reviews.map((r) => ({
      review_id: r.id,
      claim_id: r.claim_id,
      source_id: r.source_id,
      source_sha256: r.source_sha256,
      reviewer: r.reviewer,
      identity_assurance: r.reviewer_identity_assurance,
      verdict: r.verdict,
      rationale: r.rationale,
      state: reviewState(p, r),
      interpretability: null,
      attribution:
        reviewState(p, r) === "valid"
          ? r.verdict === "supported"
            ? "attributable"
            : "not_attributable"
          : null,
      citation_precision_label:
        format === "alce" && reviewState(p, r) === "valid"
          ? r.verdict === "supported"
            ? 1
            : 0
          : null,
    })),
  };
}
export function csvExport(p: Packet): string {
  const cell = (v: unknown) => {
    let s = String(v ?? "");
    if (/^[\s]*[=+\-@]|^[\t\r\n]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  const keys = [
    "review_id",
    "claim_id",
    "source_id",
    "source_sha256",
    "reviewer",
    "identity_assurance",
    "verdict",
    "rationale",
    "state",
  ] as const;
  return [
    keys.join(","),
    ...labelExport(p, "alce").items.map((row) => keys.map((k) => cell(row[k])).join(",")),
  ].join("\r\n");
}
