import test from "node:test";
import assert from "node:assert/strict";
import { createVisualState } from "../src/visual/visual-state.js";
import { mountSephiaControls } from "../src/visual/mount-sephia-controls.js";

class FakeNode {
  constructor(tag) {
    this.tagName = tag;
    this.children = [];
    this.dataset = {};
    this.attributes = {};
    this.listeners = {};
    this.hidden = false;
    this.textContent = "";
    this.parentNode = null;
  }
  append(...nodes) { nodes.forEach((node) => this.appendChild(node)); }
  appendChild(node) {
    node.parentNode = this;
    this.children.push(node);
    return node;
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  addEventListener(name, callback) { this.listeners[name] = callback; }
  removeEventListener(name) { delete this.listeners[name]; }
  click() { this.listeners.click?.(); }
  remove() {
    if (this.parentNode) this.parentNode.children = this.parentNode.children.filter((node) => node !== this);
    this.parentNode = null;
  }
}
class FakeDocument {
  constructor() {
    this.head = new FakeNode("head");
    this.ids = new Map();
  }
  createElement(tag) {
    const node = new FakeNode(tag);
    Object.defineProperty(node, "id", {
      get: () => node._id || "",
      set: (value) => { node._id = value; this.ids.set(value, node); },
    });
    return node;
  }
  getElementById(id) { return this.ids.get(id) || null; }
}

test("controls activate/deactivate runtime manually and expose accessible pressed state", () => {
  const documentImpl = new FakeDocument();
  const container = new FakeNode("main");
  const visualState = createVisualState();
  const calls = [];
  const runtime = {
    isActive: false,
    activate() { calls.push("activate"); this.isActive = true; },
    deactivate() { calls.push("deactivate"); this.isActive = false; },
  };
  const controls = mountSephiaControls({ container, runtime, visualState, documentImpl });
  const trigger = controls.element.children[0];

  assert.equal(trigger.attributes["aria-pressed"], "false");
  trigger.click();
  assert.deepEqual(calls, ["activate"]);
  assert.equal(trigger.attributes["aria-pressed"], "true");
  trigger.click();
  assert.deepEqual(calls, ["activate", "deactivate"]);
  assert.equal(trigger.attributes["aria-pressed"], "false");

  controls.dispose();
  assert.equal(container.children.length, 0);
});

test("hidden settings control disables visualizer without deactivating runtime", () => {
  const documentImpl = new FakeDocument();
  const container = new FakeNode("main");
  const visualState = createVisualState();
  const runtime = { isActive: true, activate() {}, deactivate() { this.isActive = false; } };
  visualState.activate();
  const controls = mountSephiaControls({ container, runtime, visualState, documentImpl });
  const visualizer = controls.element.children[1];
  const settings = controls.element.children[2];
  const toggle = settings.children[1].children[1];

  assert.equal(visualizer.hidden, false);
  toggle.click();
  assert.equal(visualizer.hidden, true);
  assert.equal(runtime.isActive, true);
  assert.equal(visualState.snapshot.active, true);
  toggle.click();
  assert.equal(visualizer.hidden, false);

  controls.dispose();
});

test("visual state subscription updates the controls state", () => {
  const documentImpl = new FakeDocument();
  const container = new FakeNode("main");
  const visualState = createVisualState();
  const runtime = { isActive: false, activate() { this.isActive = true; }, deactivate() { this.isActive = false; } };
  const controls = mountSephiaControls({ container, runtime, visualState, documentImpl });
  visualState.activate();
  visualState.setState("speaking");
  assert.equal(controls.element.dataset.state, "speaking");
  assert.equal(controls.element.children[0].textContent, "");
  assert.equal(controls.element.children[0].children[1].textContent, "SEPHIA · Berbicara");
  controls.dispose();
});
