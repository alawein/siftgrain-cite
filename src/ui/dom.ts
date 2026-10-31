export function element<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing control ${id}`);
  return node as T;
}
export function message(error: unknown): string {
  return String(error).replace(/^Error:\s*/, "");
}
