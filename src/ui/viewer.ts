export function setupViewer(): void {
  const root = document.documentElement;
  const stopMotion = () => document.getAnimations().forEach((animation) => animation.cancel());
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  reduced.addEventListener("change", () => {
    if (reduced.matches) stopMotion();
  });
  const theme = document.getElementById("theme") as HTMLSelectElement;
  const pause = document.getElementById("motion-pause") as HTMLButtonElement;
  theme.value = root.dataset.theme ?? "dark";
  const apply = () => {
    root.dataset.theme = theme.value;
    try {
      localStorage.setItem("siftgrain-viewer", JSON.stringify({ theme: theme.value }));
    } catch {
      /* Preferences are optional. */
    }
  };
  theme.addEventListener("change", apply);
  pause.addEventListener("click", () => {
    const paused = pause.getAttribute("aria-pressed") !== "true";
    pause.setAttribute("aria-pressed", String(paused));
    root.dataset.paused = String(paused);
    if (paused) stopMotion();
  });
  document.addEventListener("visibilitychange", () => {
    root.dataset.hidden = String(document.hidden);
    if (document.hidden) stopMotion();
  });
}
