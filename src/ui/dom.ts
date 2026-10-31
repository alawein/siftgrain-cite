export function element<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing control ${id}`);
  return node as T;
}
export function message(error: unknown): string {
  return String(error).replace(/^Error:\s*/, "");
}
export function download(raw: string, name: string, type = "application/json"): void {
  const url = URL.createObjectURL(new Blob([raw], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
