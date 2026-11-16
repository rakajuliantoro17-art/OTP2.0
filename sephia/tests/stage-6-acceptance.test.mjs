import test from "node:test";
import assert from "node:assert/strict";

import { createSephiaRuntime } from "../src/runtime/create-sephia-runtime.js";
import { createNotificationSpeechController, DEFAULT_ANNOUNCEMENT } from "../src/audio/announcement.js";

class FakeElement {
  constructor({ id = "", attrs = {}, textContent = "" } = {}) {
    this.nodeType = 1;
    this.id = id;
    this.className = "alert-item";
    this.attrs = attrs;
    this.textContent = textContent;
    this.parentElement = null;
  }
  matches(selector) { return selector === ".alert-item" && this.className === "alert-item"; }
  closest(selector) { return this.matches(selector) ? this : this.parentElement?.closest(selector) ?? null; }
  querySelectorAll() { return []; }
  getAttribute(name) { return this.attrs[name] ?? null; }
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
  constructor(callback) { this.callback = callback; this.disconnected = false; FakeMutationObserver.instances.push(this); }
  observe(root, options) { this.root = root; this.options = options; }
  disconnect() { this.disconnected = true; }
  emit(node) { this.callback([{ addedNodes: [node], target: this.root }]); }
}

function makeItem(root, eventId, count, type = "violation") {
  const item = new FakeElement({
    attrs: {
      "data-sephia-event-id": eventId,
      "data-sephia-event-type": type,
      "data-sephia-violation-count": String(count),
    },
    textContent: "SIMULASI — notifikasi OTP uji",
  });
  item.parentElement = root;
  return item;
}

function makeHarness({ speakImpl, onError = () => {} } = {}) {
  const root = new FakeElement({ id: "alertList" });
  const spoken = [];
  const states = [];
  const adapter = {
    speak(text) {
      spoken.push(text);
      return speakImpl ? speakImpl(text) : Promise.resolve();
    },
    cancel() { states.push("cancel"); },
  };
  const speech = createNotificationSpeechController({
    adapter,
    onStateChange: (state) => states.push(state),
    onError,
  });
  const received = [];
  const runtime = createSephiaRuntime({
    root,
    MutationObserverImpl: FakeMutationObserver,
    speechController: speech,
    onNotification: (event) => received.push(event.eventId),
    onNotificationError: onError,
  });
  return { root, spoken, states, received, speech, runtime };
}

test("Stage 6 burst accepts only synthetic violation counts 27–30 and deduplicates stable IDs", async () => {
  const h = makeHarness();
  h.runtime.activate();
  const observer = FakeMutationObserver.instances.at(-1);

  for (const [id, count] of [["sim-26", 26], ["sim-27", 27], ["sim-28", 28], ["sim-29", 29], ["sim-30", 30], ["sim-31", 31]]) {
    const item = makeItem(h.root, id, count);
    observer.emit(item);
    if (count === 27) observer.emit(item);
  }
  await Promise.resolve();

  assert.deepEqual(h.received, ["sim-27", "sim-28", "sim-29", "sim-30"]);
  assert.equal(h.spoken.length, 4);
  assert.ok(h.spoken.every((phrase) => phrase === DEFAULT_ANNOUNCEMENT));
  h.runtime.dispose();
});

test("Stage 6 manual OFF/ON starts without historical backlog and clears session deduplication", async () => {
  const h = makeHarness();
  const oldItem = makeItem(h.root, "before-activation", 27);
  h.runtime.activate();
  let observer = FakeMutationObserver.instances.at(-1);
  observer.emit(oldItem);
  h.runtime.deactivate();

  const whileOff = makeItem(h.root, "while-off", 28);
  // No observer is running while SEPHIA is OFF.
  h.runtime.activate();
  observer = FakeMutationObserver.instances.at(-1);
  assert.equal(h.received.includes("while-off"), false);
  observer.emit(oldItem);
  observer.emit(whileOff);
  await Promise.resolve();

  assert.deepEqual(h.received, ["before-activation", "before-activation", "while-off"]);
  h.runtime.dispose();
});

test("Stage 6 TTS failure is contained and does not block host notification callback", async () => {
  const errors = [];
  const h = makeHarness({
    speakImpl: async () => { throw new Error("synthetic TTS failure"); },
    onError: (error) => errors.push(error.message),
  });
  h.runtime.activate();
  FakeMutationObserver.instances.at(-1).emit(makeItem(h.root, "audio-failure", 27));
  await Promise.resolve();
  await Promise.resolve();

  assert.deepEqual(h.received, ["audio-failure"]);
  assert.deepEqual(errors, ["synthetic TTS failure"]);
  assert.equal(h.runtime.isActive, true);
  h.runtime.dispose();
});

test("Stage 6 stop cancels pending speech and keeps OTP-facing host callbacks isolated", async () => {
  let resolveSpeech;
  const h = makeHarness({
    speakImpl: () => new Promise((resolve) => { resolveSpeech = resolve; }),
  });
  h.runtime.activate();
  FakeMutationObserver.instances.at(-1).emit(makeItem(h.root, "pending-audio", 27));
  await Promise.resolve();

  h.runtime.deactivate();
  resolveSpeech?.();
  await Promise.resolve();

  assert.equal(h.runtime.isActive, false);
  assert.equal(h.speech.isSpeaking, false);
  assert.deepEqual(h.received, ["pending-audio"]);
  h.runtime.dispose();
});

test("Stage 6 browser fixture is valid JavaScript and remains offline/synthetic-only", async () => {
  const { readFile } = await import("node:fs/promises");
  const { spawnSync } = await import("node:child_process");
  const { fileURLToPath } = await import("node:url");
  const scriptPath = fileURLToPath(new URL("../staging/fixture.js", import.meta.url));
  const htmlPath = fileURLToPath(new URL("../staging/index.html", import.meta.url));
  const syntax = spawnSync(process.execPath, ["--check", scriptPath], { encoding: "utf8" });
  assert.equal(syntax.status, 0, syntax.stderr || "fixture JavaScript syntax check failed");

  const script = await readFile(scriptPath, "utf8");
  const html = await readFile(htmlPath, "utf8");
  assert.match(html, /id="alertList"/);
  assert.match(html, /type="module" src="\.\/fixture\.js"/);
  assert.match(html, /synthetic|simulasi/i);
  assert.doesNotMatch(script, /fetch\s*\(|XMLHttpRequest|WebSocket|EventSource|firebase|localStorage|sessionStorage|getUserMedia/);
  assert.doesNotMatch(html, /https?:\/\//);
});
