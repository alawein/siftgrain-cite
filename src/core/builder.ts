import { parsePacket, requireValue, type Claim, type Packet, type Source } from "./packet";

export interface BuilderState {
  sources: { id: string; title: string; text: string }[];
  claims: Claim[];
}

export function draftSource(id = "", title = "", text = ""): Omit<Source, "sha256" | "nfc_sha256"> {
  return { id, title, text };
}
export function draftClaim(id = "", text = "", citation_ids: string[] = []): Claim {
  return { id, text, citation_ids: [...citation_ids] };
}

// Textarea reads normalize CRLF to LF; the preview and the built packet must agree.
export function clean(value: string): string {
  return value.replace(/\r\n/g, "\n");
}

// parsePacket is the sole authority over caps, fields, hashes and citations; the
// builder only adds the two UX rules the contract leaves open (useful minimum).
export async function buildPacket(
  state: BuilderState,
  hash: (text: string) => Promise<string>,
): Promise<Packet> {
  requireValue(
    state.sources.length > 0 && state.claims.length > 0,
    "builder: add at least one source and one claim",
  );
  const sources = [];
  for (const draft of state.sources) {
    const text = clean(draft.text);
    const source = { id: draft.id, title: draft.title, text, sha256: await hash(text) };
    sources.push(source);
  }
  const claims = state.claims.map((claim) => {
    requireValue(
      claim.citation_ids.length > 0,
      `builder: claim ${claim.id || "(unlabeled)"} needs a citation`,
    );
    return { id: claim.id, text: claim.text, citation_ids: [...claim.citation_ids] };
  });
  // parsePacket is the sole authority: exact fields, caps, hashes, citations.
  return parsePacket(JSON.stringify({ schema_version: 1, sources, claims, reviews: [] }), hash);
}
