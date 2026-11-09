import test from "node:test";
import assert from "node:assert/strict";

import {
  createNotificationReader,
  readQualifyingNotification,
} from "../src/notification-reader.js";

class FakeElement {
  constructor({ id = "", className = "", attrs = {}, textContent = "" } = {}) {
    this.id = id;
    this.className = className;
    this.attrs = attrs;
    this.textContent = textContent;
    this.parentElement = null;
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

globalThis.Element = FakeElement;

class FakeMutationObserver {
  constructor(callback) {
    this.callback = callback;
    FakeMutationObserver.instances.push(this);
  }
  observe() {}
  disconnect() {}
  emit(records) {
    this.callback(records);
  }
}
FakeMutationObserver.instances = [];

const validItem = ({ attrs = {}, textContent = "Notifikasi pelanggaran OTP" } = {}) =>
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

test("accepts only trusted numeric violation counts >= 27", () => {
  assert.equal(readQualifyingNotification(validItem()).violationCount, 27);
  assert.equal(readQualifyingNotification(validItem({
    attrs: { "data-sephia-violation-count": "26" },
  })), null);
  assert.equal(readQualifyingNotification(validItem({
    attrs: { "data-sephia-violation-count": "27x" },
  })), null);
  assert.equal(readQualifyingNotification(validItem({
    attrs: { "data-sephia-event-id": "" },
  })), null);
});

test("reads visible text and never depends on HTML markup", () => {
  const result = readQualifyingNotification(validItem());
  assert.equal(result.message, "Notifikasi pelanggaran OTP");
  assert.equal(Object.isFrozen(result), true);
});

test("observes only #alertList and emits each event ID once", () => {
  const root = new FakeElement({ id: "alertList" });
  const item = validItem();
  item.parentElement = root;

  const received = [];
  const reader = createNotificationReader({
    root,
    onNotification: (event) => received.push(event),
    MutationObserverImpl: FakeMutationObserver,
  });

  reader.start();
  assert.equal(reader.isActive, true);

  const observer = FakeMutationObserver.instances.at(-1);
  observer.emit([{ addedNodes: [item], target: root }]);
  observer.emit([{ addedNodes: [item], target: root }]);

  assert.equal(received.length, 1);
  assert.equal(received[0].eventId, "evt-001");

  reader.stop();
  assert.equal(reader.isActive, false);
});

test("rejects a root other than the designated alert list", () => {
  assert.throws(() => createNotificationReader({
    root: new FakeElement({ id: "document" }),
    onNotification() {},
    MutationObserverImpl: FakeMutationObserver,
  }), /exact "#alertList"/);
});
