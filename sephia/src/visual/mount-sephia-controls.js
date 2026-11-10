const STYLE_ID = "sephia-controls-styles";

const CSS = `
.sephia-controls{font:inherit;color:var(--sephia-text,#e8f6ff);display:inline-flex;align-items:center;gap:.55rem;position:relative}
.sephia-trigger{display:inline-flex;align-items:center;gap:.55rem;border:1px solid rgba(104,220,255,.38);border-radius:999px;padding:.48rem .78rem;background:rgba(9,24,44,.82);color:inherit;cursor:pointer;box-shadow:0 0 18px rgba(36,190,255,.12)}
.sephia-trigger:focus-visible,.sephia-settings summary:focus-visible,.sephia-settings button:focus-visible{outline:2px solid #7deaff;outline-offset:3px}
.sephia-orb{width:.62rem;height:.62rem;border-radius:50%;background:#788895;box-shadow:0 0 0 3px rgba(120,136,149,.12)}
.sephia-controls[data-state="standby"] .sephia-orb{background:#55d9ff;box-shadow:0 0 12px #55d9ff}
.sephia-controls[data-state="speaking"] .sephia-orb{background:#b49aff;box-shadow:0 0 14px #b49aff}
.sephia-controls[data-state="error"] .sephia-orb{background:#ff626f;box-shadow:0 0 12px #ff626f}
.sephia-controls[data-state="limited"] .sephia-orb{background:#ffd166;box-shadow:0 0 12px #ffd166}
.sephia-label{font-size:.82rem;font-weight:600;letter-spacing:.02em}
.sephia-settings{position:relative}
.sephia-settings summary{list-style:none;cursor:pointer;border-radius:50%;width:2rem;height:2rem;display:grid;place-items:center;border:1px solid rgba(150,190,220,.22);background:rgba(12,25,44,.7)}
.sephia-settings summary::-webkit-details-marker{display:none}
.sephia-settings-panel{position:absolute;z-index:30;right:0;top:calc(100% + .5rem);width:min(17rem,80vw);padding:.85rem;border:1px solid rgba(120,205,245,.25);border-radius:1rem;background:rgba(8,18,34,.97);box-shadow:0 14px 40px rgba(0,0,0,.35)}
.sephia-settings-panel p{font-size:.8rem;line-height:1.45;margin:0 0 .7rem;color:#b8c9d8}
.sephia-settings-panel button{width:100%;text-align:left;border:1px solid rgba(120,205,245,.22);border-radius:.7rem;padding:.6rem;background:rgba(65,125,160,.12);color:inherit;cursor:pointer}
.sephia-visualizer{display:flex;align-items:center;justify-content:center;gap:4px;height:2.3rem;min-width:5.5rem;padding:.25rem .65rem;border:1px solid rgba(95,208,255,.2);border-radius:999px;background:radial-gradient(ellipse at center,rgba(40,165,220,.17),rgba(13,24,44,.55))}
.sephia-visualizer[hidden]{display:none}
.sephia-visualizer span{width:3px;height:7px;border-radius:9px;background:linear-gradient(#b7a1ff,#58dcff);opacity:.8;transform:scaleY(.45)}
.sephia-controls[data-state="speaking"] .sephia-visualizer span{animation:sephia-pulse .72s ease-in-out infinite alternate}
.sephia-controls[data-state="speaking"] .sephia-visualizer span:nth-child(2n){animation-delay:-.35s}
.sephia-controls[data-state="speaking"] .sephia-visualizer span:nth-child(3n){animation-delay:-.18s}
.sephia-controls[data-state="listening"] .sephia-visualizer span{animation:sephia-pulse 1.15s ease-in-out infinite alternate}
@keyframes sephia-pulse{from{transform:scaleY(.35);opacity:.55}to{transform:scaleY(2.1);opacity:1}}
@media(prefers-reduced-motion:reduce){.sephia-controls *{animation:none!important;transition:none!important}}
`;

function element(document, tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function mountSephiaControls({
  container,
  runtime,
  visualState,
  documentImpl = globalThis.document,
  onError = () => {},
  onActivated = () => {},
  onDeactivated = () => {},
}) {
  if (!container || typeof container.appendChild !== "function") throw new TypeError("A mount container is required.");
  if (!runtime || typeof runtime.activate !== "function" || typeof runtime.deactivate !== "function" ||
      typeof runtime.isActive !== "boolean") {
    throw new TypeError("A SEPHIA runtime with an isActive state is required.");
  }
  if (!visualState || typeof visualState.setVisualizerEnabled !== "function") {
    throw new TypeError("A visual state controller is required.");
  }
  if (!documentImpl?.createElement) throw new TypeError("A document implementation is required.");

  let disposed = false;
  if (!documentImpl.getElementById?.(STYLE_ID)) {
    const style = element(documentImpl, "style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    (documentImpl.head || container).appendChild(style);
  }
  const root = element(documentImpl, "div", "sephia-controls");
  root.dataset.state = "inactive";

  const trigger = element(documentImpl, "button", "sephia-trigger");
  trigger.type = "button";
  trigger.setAttribute("aria-pressed", "false");
  trigger.setAttribute("aria-label", "Aktifkan SEPHIA");
  const orb = element(documentImpl, "span", "sephia-orb");
  orb.setAttribute("aria-hidden", "true");
  const label = element(documentImpl, "span", "sephia-label", "SEPHIA");
  trigger.append(orb, label);

  const visualizer = element(documentImpl, "div", "sephia-visualizer");
  visualizer.setAttribute("role", "img");
  visualizer.setAttribute("aria-label", "Indikator aktivitas suara SEPHIA");
  for (let i = 0; i < 7; i += 1) {
    const bar = element(documentImpl, "span");
    bar.setAttribute("aria-hidden", "true");
    visualizer.appendChild(bar);
  }

  const settings = element(documentImpl, "details", "sephia-settings");
  const summary = element(documentImpl, "summary", "", "⋯");
  summary.setAttribute("aria-label", "Pengaturan SEPHIA");
  const panel = element(documentImpl, "div", "sephia-settings-panel");
  const explanation = element(documentImpl, "p", "", "Matikan efek visual tanpa menghentikan pembacaan notifikasi atau status SEPHIA.");
  const toggleVisualizer = element(documentImpl, "button", "", "Nonaktifkan visualizer");
  toggleVisualizer.type = "button";
  panel.append(explanation, toggleVisualizer);
  settings.append(summary, panel);
  root.append(trigger, visualizer, settings);
  container.appendChild(root);

  let visualizerEnabled = visualState.snapshot.visualizerEnabled;

  const render = (snapshot) => {
    if (disposed) return;
    visualizerEnabled = snapshot.visualizerEnabled;
    root.dataset.state = snapshot.state;
    root.dataset.active = String(snapshot.active);
    trigger.setAttribute("aria-pressed", String(snapshot.active));
    trigger.setAttribute("aria-label", snapshot.active ? "Nonaktifkan SEPHIA" : "Aktifkan SEPHIA");
    label.textContent = snapshot.active ? (snapshot.state === "speaking" ? "SEPHIA · Berbicara" : "SEPHIA · Aktif") : "SEPHIA";
    visualizer.hidden = !snapshot.visualizerEnabled;
    toggleVisualizer.textContent = snapshot.visualizerEnabled ? "Nonaktifkan visualizer" : "Aktifkan visualizer";
    toggleVisualizer.setAttribute("aria-pressed", String(snapshot.visualizerEnabled));
  };

  const unsubscribe = visualState.subscribe?.(render);
  render(visualState.snapshot);

  const onTrigger = () => {
    try {
      if (runtime.isActive) {
        try { runtime.deactivate(); }
        finally { visualState.deactivate(); }
        try { onDeactivated(); } catch (error) { try { onError(error); } catch {} }
      } else {
        runtime.activate();
        if (!runtime.isActive) throw new Error("SEPHIA runtime did not enter the active state.");
        if (visualState.activate() === false) {
          runtime.deactivate();
          throw new Error("SEPHIA visual state could not be activated.");
        }
        try {
          const activation = onActivated();
          if (activation && typeof activation.catch === "function") {
            activation.catch((error) => { try { onError(error); } catch {} });
          }
        } catch (error) { try { onError(error); } catch {} }
      }
    } catch (error) {
      if (!runtime.isActive) visualState.deactivate();
      try { onError(error); } catch {}
    }
  };
  const onToggleVisualizer = () => {
    visualizerEnabled = !visualizerEnabled;
    visualState.setVisualizerEnabled(visualizerEnabled);
    render(visualState.snapshot);
  };
  trigger.addEventListener("click", onTrigger);
  toggleVisualizer.addEventListener("click", onToggleVisualizer);

  return Object.freeze({
    element: root,
    refresh: () => render(visualState.snapshot),
    dispose() {
      if (disposed) return;
      disposed = true;
      trigger.removeEventListener("click", onTrigger);
      toggleVisualizer.removeEventListener("click", onToggleVisualizer);
      try { unsubscribe?.(); } catch {}
      root.remove();
    },
  });
}
