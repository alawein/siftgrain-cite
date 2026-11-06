import { mountBuilder } from "./ui/builder.js";
import { element } from "./ui/dom.js";
import { clearDraft, saveDraft } from "./ui/draft.js";
import { mountReview } from "./ui/review.js";
import { setStatus } from "./ui/status.js";
import { createStore } from "./ui/store.js";
import { mountTransfer } from "./ui/transfer.js";
import { setupViewer } from "./ui/viewer.js";

setupViewer();
const store = createStore();
const workbench = element("review-workbench");
store.subscribe(() => {
  workbench.hidden = store.get() === null;
  document.querySelector<HTMLAnchorElement>(".skip")!.href = workbench.hidden
    ? "#entry"
    : "#review-form";
});
const draftSave = element<HTMLInputElement>("draft-save");
draftSave.checked = false;
const review = mountReview(store, persistDraft);
mountTransfer(store, afterPacketApplied);
mountBuilder(store, afterPacketApplied);

function afterPacketApplied(note: string): void {
  review.refresh();
  element("builder").hidden = true;
  const builderToggle = element("builder-toggle");
  builderToggle.setAttribute("aria-expanded", "false");
  builderToggle.textContent = "New packet";
  setStatus(true, note);
  persistDraft();
  element("claim").focus();
}
function persistDraft(): void {
  if (draftSave.checked && !saveDraft(store.get())) {
    draftSave.checked = false;
    setStatus(false, "Device draft storage unavailable; work kept in memory. Export to keep it.");
  }
}

draftSave.addEventListener("change", () => {
  if (draftSave.checked) {
    if (!saveDraft(store.get())) {
      draftSave.checked = false;
      setStatus(false, "Device draft storage unavailable; work kept in memory.");
    } else setStatus(true, "Device draft saving enabled. Export to keep a portable copy.");
  } else setStatus(true, "Device draft saving off. Clear saved draft to remove the retained copy.");
});
element("draft-clear").addEventListener("click", () => {
  const cleared = clearDraft();
  if (!cleared) draftSave.checked = false;
  setStatus(
    cleared,
    cleared
      ? "Saved draft cleared; current work kept in memory."
      : "Device draft storage unavailable; current work kept in memory.",
  );
});
globalThis.addEventListener("beforeunload", (event) => {
  if (store.isDirty()) event.preventDefault();
});
