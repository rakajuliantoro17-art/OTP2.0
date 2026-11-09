import test from "node:test";
import assert from "node:assert/strict";
import { mountPanitiaSephia } from "../src/host/mount-panitia-sephia.js";

class FakeWindow {
  listeners = new Map();
  addEventListener(type, fn) { this.listeners.set(type, fn); }
  removeEventListener(type, fn) { if (this.listeners.get(type) === fn) this.listeners.delete(type); }
  emit(type) { this.listeners.get(type)?.(); }
}

function setup(overrides = {}) {
  const alertRoot = { id: "alertList" };
  const controlsMount = { id: "sephiaControlMount" };
  const documentImpl = {
    getElementById(id) {
      if (id === "alertList") return alertRoot;
      if (id === "sephiaControlMount") return controlsMount;
      throw new Error("Unexpected document lookup: " + id);
    },
  };
  const windowImpl = new FakeWindow();
  const calls = [];
  const runtime = {
    active: false,
    activate() { this.active = true; return true; },
    deactivate() { this.active = false; calls.push("runtime.deactivate"); },
    dispose() { this.active = false; calls.push("runtime.dispose"); },
    get isActive() { return this.active; },
  };
  const visualState = {
    active: false,
    snapshot: { active: false },
    dispose() { calls.push("state.dispose"); },
  };
  const controls = { dispose() { calls.push("controls.dispose"); } };
  const lifecycle = { dispose() { calls.push("lifecycle.dispose"); runtime.deactivate(); } };
  const result = mountPanitiaSephia({
    documentImpl, windowImpl,
    createState: () => visualState,
    createRuntime: (args) => {
      calls.push(["runtime.create", args.root.id]);
      return runtime;
    },
    mountControls: (args) => {
      calls.push(["controls.mount", args.container.id]);
      return controls;
    },
    bindLifecycle: (args) => {
      calls.push(["lifecycle.bind", Boolean(args.runtime), Boolean(args.visualState)]);
      return lifecycle;
    },
    ...overrides,
  });
  return { result, calls, runtime, windowImpl };
}

test("Panitia bridge mounts only explicit alert and header control targets, inactive by default", () => {
  const { result, calls, runtime } = setup();
  assert.equal(runtime.isActive, false);
  assert.deepEqual(calls.slice(0, 3), [
    ["runtime.create", "alertList"],
    ["controls.mount", "sephiaControlMount"],
    ["lifecycle.bind", true, true],
  ]);
  assert.equal(result.isDisposed, false);
});

test("pagehide disposes the Panitia bridge and stops runtime", () => {
  const { result, calls, runtime, windowImpl } = setup();
  windowImpl.emit("pagehide");
  assert.equal(result.isDisposed, true);
  assert.equal(runtime.isActive, false);
  assert.ok(calls.includes("runtime.dispose"));
  assert.ok(calls.includes("controls.dispose"));
  assert.ok(calls.includes("state.dispose"));
});

test("missing explicit alert mount fails closed without creating runtime", () => {
  let created = false;
  const windowImpl = new FakeWindow();
  const documentImpl = { getElementById: (id) => id === "sephiaControlMount" ? {} : null };
  assert.throws(() => mountPanitiaSephia({
    documentImpl, windowImpl,
    createRuntime() { created = true; },
  }), /#alertList/);
  assert.equal(created, false);
});

test("construction failure disposes already-created pieces and reports error", () => {
  const errors = [];
  const windowImpl = new FakeWindow();
  const documentImpl = {
    getElementById(id) {
      return id === "alertList" ? { id } : { id };
    },
  };
  let stateDisposed = false;
  assert.throws(() => mountPanitiaSephia({
    documentImpl, windowImpl, onError: (e) => errors.push(e.message),
    createState: () => ({ dispose() { stateDisposed = true; } }),
    createRuntime: () => { throw new Error("runtime construction failed"); },
  }), /runtime construction failed/);
  assert.equal(stateDisposed, true);
  assert.deepEqual(errors, ["runtime construction failed"]);
});


test("optional host notification callback forwards runtime events without becoming required", () => {
  const alertRoot = { id: "alertList" };
  const controlsMount = { id: "sephiaControlMount" };
  const documentImpl = { getElementById(id) { return id === "alertList" ? alertRoot : controlsMount; } };
  const windowImpl = new FakeWindow();
  let runtimeOptions;
  const received = [];
  const runtime = {
    isActive: false,
    activate() { this.isActive = true; },
    deactivate() { this.isActive = false; },
    dispose() { this.isActive = false; },
  };

  const bridge = mountPanitiaSephia({
    documentImpl,
    windowImpl,
    onNotification: (event) => received.push(event),
    createState: () => ({ snapshot: { active: false }, dispose() {} }),
    createRuntime: (options) => { runtimeOptions = options; return runtime; },
    mountControls: () => ({ dispose() {} }),
    bindLifecycle: () => ({ dispose() {} }),
  });

  const event = Object.freeze({
    eventId: "synthetic-27",
    eventType: "violation",
    violationCount: 27,
    message: "SIMULASI",
  });
  runtimeOptions.onNotification(event);
  assert.deepEqual(received, [event]);
  bridge.dispose();
});
