import { element } from "./dom.js";

const status = element("status");
const builderStatus = element("builder-status");
let busyCount = 0;
const busyControls = [
  element<HTMLInputElement>("import"),
  element<HTMLButtonElement>("example"),
  element<HTMLButtonElement>("acceptance-example"),
  element<HTMLButtonElement>("acceptance-worked"),
  element<HTMLButtonElement>("export"),
  element<HTMLButtonElement>("export-w3c"),
  element<HTMLButtonElement>("draft-restore"),
  element<HTMLButtonElement>("builder-toggle"),
];

function showOnStatus(node: HTMLElement, ok: boolean, text: string): void {
  node.textContent = text;
  node.classList.toggle("error", !ok);
  node.setAttribute("role", ok ? "status" : "alert");
  if (!ok) node.focus();
}
export function setStatus(ok: boolean, text: string): void {
  showOnStatus(status, ok, text);
}
export function setBuilderStatus(ok: boolean, text: string): void {
  showOnStatus(builderStatus, ok, text);
}
function setBusy(busy: boolean): void {
  status.setAttribute("aria-busy", String(busy));
  for (const control of busyControls) control.toggleAttribute("disabled", busy);
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
