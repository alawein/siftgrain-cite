export async function sha256(text: string): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error("SHA-256 unavailable in this browser context");
  const bytes = new TextEncoder().encode(text);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
