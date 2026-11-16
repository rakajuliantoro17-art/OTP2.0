import test from "node:test";
import assert from "node:assert/strict";
import { createVisualState } from "../src/visual/visual-state.js";
import { mountSephiaAvatar } from "../src/visual/mount-sephia-avatar.js";

class FakeNode {
  constructor(tag) {
    this.tagName = tag;
    this.children = [];
    this.attributes = {};
    this.listeners = {};
    this.dataset = {};
    this.hidden = false;
    this.textContent = "";
    this.parentNode = null;
  }
  append(...nodes) { nodes.forEach((node) => this.appendChild(node)); }
  appendChild(node) { node.parentNode = this; this.children.push(node); return node; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  addEventListener(name, callback) { this.listeners[name] = callback; }
  removeEventListener(name) { delete this.listeners[name]; }
  remove() {
    if (this.parentNode) this.parentNode.children = this.parentNode.children.filter((n) => n !== this);
    this.parentNode = null;
  }
}
class FakeDocument {
  constructor() { this.head = new FakeNode("head"); this.ids = new Map(); }
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

test("avatar remains hidden until active speaking/listening interaction", () => {
  const documentImpl = new FakeDocument();
  const container = new FakeNode("main");
  const state = createVisualState();
  const avatar = mountSephiaAvatar({ container, visualState: state, documentImpl });

  assert.equal(avatar.element.hidden, true);
  state.activate();
  assert.equal(avatar.element.hidden, true);
  state.setState("listening");
  assert.equal(avatar.element.hidden, false);
  state.setState("standby");
  assert.equal(avatar.element.hidden, true);
  avatar.dispose();
  assert.equal(container.children.length, 0);
});

test("mouth activity requires speaking state and an actually speaking controller", () => {
  const documentImpl = new FakeDocument();
  const container = new FakeNode("main");
  const state = createVisualState();
  const speechController = { isSpeaking: false };
  const avatar = mountSephiaAvatar({ container, visualState: state, speechController, documentImpl });

  state.activate();
  state.setState("speaking");
  assert.equal(avatar.element.dataset.speaking, "false");
  speechController.isSpeaking = true;
  avatar.refresh();
  assert.equal(avatar.element.dataset.speaking, "true");
  speechController.isSpeaking = false;
  avatar.refresh();
  assert.equal(avatar.element.dataset.speaking, "false");
  avatar.dispose();
});

test("avatar rejects remote artwork URLs", () => {
  const documentImpl = new FakeDocument();
  const container = new FakeNode("main");
  const state = createVisualState();
  assert.throws(
    () => mountSephiaAvatar({
      container, visualState: state, documentImpl,
      avatarAssetUrl: "https://example.com/avatar.webp",
    }),
    /same-origin relative asset path/,
  );
});

test("visualizer disable hides avatar without changing runtime activation", () => {
  const documentImpl = new FakeDocument();
  const container = new FakeNode("main");
  const state = createVisualState();
  state.activate();
  state.setState("speaking");
  const avatar = mountSephiaAvatar({ container, visualState: state, documentImpl });
  assert.equal(avatar.element.hidden, false);
  state.setVisualizerEnabled(false);
  assert.equal(avatar.element.hidden, true);
  assert.equal(state.snapshot.active, true);
  avatar.dispose();
});
