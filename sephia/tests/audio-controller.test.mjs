import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_ANNOUNCEMENT, createNotificationSpeechController } from "../src/audio/announcement.js";

const valid = (eventId) => ({ eventId, eventType: "violation", violationCount: 27, message: "visible alert" });

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

test("audio controller uses the approved generic announcement and rejects out-of-scope events", async () => {
  const spoken = [];
  const adapter = { speak: async (text) => spoken.push(text), cancel() {} };
  const controller = createNotificationSpeechController({ adapter });

  assert.equal(await controller.announce({ ...valid("bad"), violationCount: 26 }), false);
  assert.equal(await controller.announce({ ...valid("wrong-type"), eventType: "critical" }), false);
  assert.equal(spoken.length, 0);
  assert.equal(await controller.announce(valid("ok")), true);
  assert.deepEqual(spoken, [DEFAULT_ANNOUNCEMENT]);
  controller.dispose();
});

test("newest notification cancels the previous utterance without overlap", async () => {
  const first = deferred();
  const spoken = [];
  let cancelCount = 0;
  const adapter = {
    speak(text) {
      spoken.push(text);
      return spoken.length === 1 ? first.promise : Promise.resolve();
    },
    cancel() { cancelCount += 1; },
  };
  const controller = createNotificationSpeechController({ adapter });

  const firstRun = controller.announce(valid("event-1"));
  const secondResult = await controller.announce(valid("event-2"));
  first.resolve();
  assert.equal(await firstRun, false);
  assert.equal(secondResult, true);
  assert.equal(cancelCount, 2);
  assert.equal(controller.isSpeaking, false);
  controller.dispose();
});

test("speech failure is contained and reported without escaping", async () => {
  const errors = [];
  const states = [];
  const controller = createNotificationSpeechController({
    adapter: { speak: async () => { throw new Error("TTS unavailable"); }, cancel() {} },
    onError: (error) => errors.push(error.message),
    onStateChange: (state) => states.push(state),
  });

  assert.equal(await controller.announce(valid("event-3")), false);
  assert.deepEqual(errors, ["TTS unavailable"]);
  assert.deepEqual(states, ["speaking", "standby"]);
  controller.dispose();
});

test("stop cancels current speech and disposal prevents future announcements", async () => {
  const pending = deferred();
  let cancelCount = 0;
  const controller = createNotificationSpeechController({
    adapter: { speak: () => pending.promise, cancel: () => { cancelCount += 1; } },
  });

  const run = controller.announce(valid("event-4"));
  controller.stop();
  pending.resolve();
  assert.equal(await run, false);
  controller.dispose();
  assert.equal(controller.isDisposed, true);
  assert.equal(await controller.announce(valid("event-5")), false);
  assert.ok(cancelCount >= 2);
});
