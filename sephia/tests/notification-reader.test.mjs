import test from "node:test";
import assert from "node:assert/strict";

import { normalizeNotification } from "../src/core/notification-contract.js";
import { createDomAlertObserver } from "../src/adapters/dom-alert-observer.js";
import { createSephiaRuntime } from "../src/runtime/create-sephia-runtime.js";

class FakeElement {
  constructor({ id = "", className = "", attrs = {}, textContent = "" } = {}) {
    this.nodeType = 1;
    this.id = id;
    this.className = className;
    this.attrs = attrs;
    this.textContent = textContent;
    this.parentElement = null;
    this.descendants = [];
  }
  matches(selector) {
    return selector === ".alert-item" && this.className.split(" ").includes("alert-item");
  }
  closest(selector) {
    let node = this;
    while (node) {
      if (node.matches(selector)) return node;
      node = node.parentElement;
    }
    return null;
  }
  querySelectorAll(selector) {
    return this.descendants.filter((node) => node.matches(selector));
  }
  getAttribute(name) {
    return this.attrs[name] ?? null;
  }
  contains(node) {
    while (node) {
      if (node === this) return true;
      node = node.parentElement;
    }
    return false;
  }
}

class FakeMutationObserver {
  static instances = [];
  constructor(callback) {
    this.callback = callback;
    this.disconnected = false;
    FakeMutationObserver.instances.push(this);
  }
  observe(root, options) {
    this.root = root;
    this.options = options;
  }
  disconnect() {
    this.disconnected = true;
  }
  emit(records) {
    this.callback(records);
  }
}

const alertItem = (attrs = {}, textContent = "Pemberitahuan OTP") =>
  new FakeElement({
    className: "alert-item",
    attrs: {
      "data-sephia-event-id": "evt-001",
      "data-sephia-event-type": "critical",
      "data-sephia-violation-count": "27",
      ...attrs,
    },
    textContent,
  });

test("contract accepts count >= 27 and rejects malformed or incomplete events", () => {
  assert.equal(normalizeNotification({
    eventId: "evt", violationCount: "27", message: "Alert",
  }).violationCount, 27);

  for (const value of ["", "26", "27x", "27.5", "-27", " 27", "999999999999999999999"]) {
    assert.equal(normalizeNotification({
      eventId: "evt", violationCount: value, message: "Alert",
    }), null);
  }

  assert.equal(normalizeNotification({
    eventId: "", violationCount: "30", message: "Alert",
  }), null);
  assert.equal(normalizeNotification({
    eventId: "evt", violationCount: "30", message: " ",
  }), null);
});

test("observer rejects any root except #alertList", () => {
  assert.throws(() => createDomAlertObserver({
    root: new FakeElement({ id: "other" }),
    onNotification() {},
    MutationObserverImpl: FakeMutationObserver,
  }), /exact "#alertList"/);
});

test("observer is passive, scoped, and deduplicates event IDs", () => {
  const root = new FakeElement({ id: "alertList" });
  const item = alertItem();
  item.parentElement = root;
  const received = [];

  const reader = createDomAlertObserver({
    root,
    onNotification: (event) => received.push(event),
    MutationObserverImpl: FakeMutationObserver,
  });

  reader.start();
  const observer = FakeMutationObserver.instances.at(-1);

  assert.deepEqual(observer.options.attributeFilter, [
    "data-sephia-event-id",
    "data-sephia-event-type",
    "data-sephia-violation-count",
  ]);

  observer.emit([{ addedNodes: [item], target: root }]);
  observer.emit([{ addedNodes: [item], target: root }]);

  assert.equal(received.length, 1);
  assert.equal(received[0].eventId, "evt-001");
  assert.equal(received[0].violationCount, 27);

  reader.stop();
  assert.equal(observer.disconnected, true);
  assert.equal(reader.isActive, false);
});

test("observer catches metadata added after the notification shell", () => {
  const root = new FakeElement({ id: "alertList" });
  const item = alertItem({
    "data-sephia-event-id": "",
    "data-sephia-violation-count": "",
  });
  item.parentElement = root;
  const received = [];

  const reader = createDomAlertObserver({
    root,
    onNotification: (event) => received.push(event),
    MutationObserverImpl: FakeMutationObserver,
  });

  reader.start();
  const observer = FakeMutationObserver.instances.at(-1);
  observer.emit([{ addedNodes: [item], target: root }]);
  assert.equal(received.length, 0);

  item.attrs["data-sephia-event-id"] = "evt-late";
  item.attrs["data-sephia-violation-count"] = "28";
  observer.emit([{ addedNodes: [], target: item }]);

  assert.equal(received.length, 1);
  assert.equal(received[0].eventId, "evt-late");
  reader.stop();
});

test("runtime starts only on explicit activation and clears session dedupe on stop", () => {
  const root = new FakeElement({ id: "alertList" });
  const item = alertItem();
  item.parentElement = root;
  const received = [];

  const runtime = createSephiaRuntime({
    root,
    onNotification: (event) => received.push(event),
    MutationObserverImpl: FakeMutationObserver,
  });

  assert.equal(runtime.isActive, false);
  runtime.activate();
  assert.equal(runtime.isActive, true);

  let observer = FakeMutationObserver.instances.at(-1);
  observer.emit([{ addedNodes: [item], target: root }]);
  assert.equal(received.length, 1);

  runtime.deactivate();
  assert.equal(runtime.isActive, false);

  runtime.activate();
  observer = FakeMutationObserver.instances.at(-1);
  observer.emit([{ addedNodes: [item], target: root }]);
  assert.equal(received.length, 2);
  runtime.dispose();
});
