import test from "node:test";
import assert from "node:assert/strict";
import { createSephiaRuntime } from "../src/runtime/create-sephia-runtime.js";

class FakeElement {
  constructor({ id = "", className = "", attributes = {}, text = "" } = {}) {
    this.nodeType = 1;
    this.id = id;
    this.className = className;
    this.attributes = new Map(Object.entries(attributes));
    this.textContent = text;
    this.children = [];
    this.parentNode = null;
  }
  matches(selector) {
    return selector === ".alert-item" && this.className.split(/\s+/).includes("alert-item");
  }
  closest(selector) {
    let node = this;
    while (node) {
      if (node.matches?.(selector)) return node;
      node = node.parentNode;
    }
    return null;
  }
  contains(node) {
    let current = node;
    while (current) {
      if (current === this) return true;
      current = current.parentNode;
    }
    return false;
  }
  getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
  appendChild(node) {
    node.parentNode = this;
    this.children.push(node);
    return node;
  }
  querySelectorAll(selector) {
    const found = [];
    const visit = (node) => {
      for (const child of node.children || []) {
        if (child.matches?.(selector)) found.push(child);
        visit(child);
      }
    };
    visit(this);
    return found;
  }
}

class FakeMutationObserver {
  static latest;
  constructor(callback) { this.callback = callback; this.disconnected = false; FakeMutationObserver.latest = this; }
  observe(root, options) { this.root = root; this.options = options; }
  disconnect() { this.disconnected = true; }
  emit(addedNode) {
    this.callback([{ addedNodes: [addedNode], target: this.root }]);
  }
}

function alert(id, count = 27, type = "violation", message = "Data simulasi tanpa identitas") {
  return new FakeElement({
    className: "alert-item",
    attributes: {
      "data-sephia-event-id": id,
      "data-sephia-event-type": type,
      "data-sephia-violation-count": String(count),
    },
    text: message,
  });
}

test("runtime starts silent, observes only new eligible notifications, and forwards one event once", () => {
  const root = new FakeElement({ id: "alertList" });
  const existing = alert("existing-27");
  root.appendChild(existing);
  const announced = [];
  const speech = {
    announce: async (event) => { announced.push(event); return true; },
    stop() {},
    dispose() {},
  };
  const runtime = createSephiaRuntime({
    root,
    MutationObserverImpl: FakeMutationObserver,
    speechController: speech,
  });

  assert.equal(runtime.isActive, false);
  assert.equal(announced.length, 0);
  runtime.activate();
  assert.equal(announced.length, 0, "existing DOM alerts must not be replayed");

  const next = alert("new-27");
  root.appendChild(next);
  FakeMutationObserver.latest.emit(next);
  assert.equal(announced.length, 1);
  assert.equal(announced[0].eventId, "new-27");
  assert.equal(announced[0].violationCount, 27);
  assert.equal(announced[0].message, "Data simulasi tanpa identitas");

  const duplicate = alert("new-27");
  root.appendChild(duplicate);
  FakeMutationObserver.latest.emit(duplicate);
  assert.equal(announced.length, 1);
  runtime.dispose();
});

test("runtime rejects out-of-scope types and counts without changing host alerts", () => {
  const root = new FakeElement({ id: "alertList" });
  const announced = [];
  const runtime = createSephiaRuntime({
    root,
    MutationObserverImpl: FakeMutationObserver,
    speechController: { announce: (event) => announced.push(event), stop() {}, dispose() {} },
  });
  runtime.activate();

  for (const item of [
    alert("too-low", 26),
    alert("too-high", 31),
    alert("wrong-type", 28, "critical"),
    alert("", 27),
  ]) {
    root.appendChild(item);
    FakeMutationObserver.latest.emit(item);
  }
  assert.deepEqual(announced, []);
  runtime.dispose();
});

test("deactivation cancels speech and reactivation does not replay the old DOM", () => {
  const root = new FakeElement({ id: "alertList" });
  const announced = [];
  let stopped = 0;
  const runtime = createSephiaRuntime({
    root,
    MutationObserverImpl: FakeMutationObserver,
    speechController: {
      announce: (event) => announced.push(event.eventId),
      stop: () => { stopped += 1; },
      dispose() {},
    },
  });

  runtime.activate();
  const first = alert("first");
  root.appendChild(first);
  FakeMutationObserver.latest.emit(first);
  runtime.deactivate();
  assert.equal(stopped, 1);

  runtime.activate();
  assert.deepEqual(announced, ["first"]);
  const second = alert("second");
  root.appendChild(second);
  FakeMutationObserver.latest.emit(second);
  assert.deepEqual(announced, ["first", "second"]);
  runtime.dispose();
});
