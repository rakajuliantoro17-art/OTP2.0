import test from "node:test";
import assert from "node:assert/strict";
import { bindPageLifecycle } from "../src/runtime/bind-page-lifecycle.js";

class FakeWindow {
  listeners = new Map();
  addEventListener(type, fn) { this.listeners.set(type, fn); }
  removeEventListener(type, fn) {
    if (this.listeners.get(type) === fn) this.listeners.delete(type);
  }
  emit(type) { this.listeners.get(type)?.(); }
}

test("pagehide deactivates reader and visual state; no automatic reactivation", () => {
  const windowImpl = new FakeWindow();
  const calls = [];
  let active = true;
  const runtime = {
    deactivate() { calls.push("runtime.deactivate"); active = false; },
    get isActive() { return active; },
  };
  let visualActive = true;
  const visualState = {
    deactivate() { calls.push("visual.deactivate"); visualActive = false; },
    get snapshot() { return { active: visualActive }; },
  };
  const lifecycle = bindPageLifecycle({ windowImpl, runtime, visualState });

  windowImpl.emit("pagehide");
  assert.deepEqual(calls, ["runtime.deactivate", "visual.deactivate"]);
  assert.equal(runtime.isActive, false);
  assert.equal(visualState.snapshot.active, false);

  windowImpl.emit("pageshow");
  assert.equal(runtime.isActive, false);
  assert.equal(visualState.snapshot.active, false);
  lifecycle.dispose();
  assert.equal(windowImpl.listeners.size, 0);
});

test("beforeunload and repeated shutdown are safe and idempotent at the boundary", () => {
  const windowImpl = new FakeWindow();
  let runtimeStops = 0;
  let visualStops = 0;
  const runtime = { deactivate() { runtimeStops += 1; } };
  const visualState = { deactivate() { visualStops += 1; } };
  const lifecycle = bindPageLifecycle({ windowImpl, runtime, visualState });

  windowImpl.emit("beforeunload");
  lifecycle.shutdown();
  lifecycle.dispose();
  lifecycle.dispose();

  assert.equal(runtimeStops, 3);
  assert.equal(visualStops, 3);
  assert.equal(windowImpl.listeners.size, 0);
});

test("missing lifecycle dependencies fail closed", () => {
  assert.throws(() => bindPageLifecycle({ windowImpl: new FakeWindow() }), /runtime/);
});
