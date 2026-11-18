export const VISUAL_STATES = Object.freeze([
  "inactive",
  "standby",
  "speaking",
  "listening",
  "limited",
  "error",
]);

const VALID = new Set(VISUAL_STATES);

export function createVisualState({ onChange = () => {} } = {}) {
  let active = false;
  let visualizerEnabled = true;
  let state = "inactive";
  let disposed = false;
  const listeners = new Set();

  const publish = () => {
    const snapshot = Object.freeze({ active, visualizerEnabled, state });
    try { onChange(snapshot); } catch {}
    for (const listener of listeners) {
      try { listener(snapshot); } catch {}
    }
  };

  const setState = (next) => {
    if (disposed || !VALID.has(next)) return false;
    if (!active && next !== "inactive") return false;
    state = next;
    publish();
    return true;
  };

  return Object.freeze({
    activate() {
      if (disposed || active) return false;
      active = true;
      state = "standby";
      publish();
      return true;
    },
    deactivate() {
      if (disposed || !active) return false;
      active = false;
      state = "inactive";
      publish();
      return true;
    },
    setState,
    subscribe(listener) {
      if (disposed || typeof listener !== "function") return () => {};
      listeners.add(listener);
      try { listener(Object.freeze({ active, visualizerEnabled, state })); } catch {}
      return () => listeners.delete(listener);
    },
    setVisualizerEnabled(value) {
      if (disposed || typeof value !== "boolean") return false;
      if (visualizerEnabled === value) return false;
      visualizerEnabled = value;
      publish();
      return true;
    },
    get snapshot() {
      return Object.freeze({ active, visualizerEnabled, state });
    },
    dispose() {
      if (disposed) return;
      active = false;
      state = "inactive";
      disposed = true;
      publish();
      listeners.clear();
    },
  });
}
