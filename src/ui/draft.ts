import type { Packet } from "../core/packet";
const key = "claim-review.draft.v1";
export function saveDraft(packet: Packet | null): boolean {
  try {
    if (packet) globalThis.localStorage.setItem(key, JSON.stringify(packet));
    else void globalThis.localStorage.length;
    return true;
  } catch {
    return false;
  }
}
export function readDraft(): { available: true; raw: string | null } | { available: false } {
  try {
    return { available: true, raw: globalThis.localStorage.getItem(key) };
  } catch {
    return { available: false };
  }
}
export function clearDraft(): boolean {
  try {
    globalThis.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
