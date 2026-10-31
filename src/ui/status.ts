import { element } from "./dom.js";

let busyCount = 0;
const busyControlIds = [
  "import",
  "example",
  "acceptance-example",
  "acceptance-worked",
  "export",
  "export-w3c",
  "draft-restore",
  "builder-toggle",
];

function showOnStatus(node: HTMLElement, ok: boolean, text: string): void {
  node.textContent = text;
  node.classList.toggle("error", !ok);
  node.setAttribute("role", ok ? "status" : "alert");
  if (!ok) node.focus();
}
export function setStatus(ok: boolean, text: string): void {
  showOnStatus(element("status"), ok, text);
}
export function setBuilderStatus(ok: boolean, text: string): void {
  showOnStatus(element("builder-status"), ok, text);
}
function setBusy(busy: boolean): void {
  element("status").setAttribute("aria-busy", String(busy));
  for (const id of busyControlIds) element(id).toggleAttribute("disabled", busy);
}
export function beginBusy(): void {
  busyCount++;
  setBusy(true);
}
export function endBusy(): void {
  busyCount = Math.max(0, busyCount - 1);
  if (busyCount === 0) setBusy(false);
}
export function isBusy(): boolean {
  return busyCount > 0;
}
