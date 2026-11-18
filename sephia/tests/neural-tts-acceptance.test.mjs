import test from "node:test";
import assert from "node:assert/strict";
import { runNeuralTtsAcceptance } from "../src/audio/neural-tts-acceptance.js";

function fixture({ cpuPercent = 35, memoryMb = 420, failAt = -1 } = {}) {
  let index = 0;
  let tick = 0;
  const released = [];
  const engine = {
    localOnly: true, available: true,
    async synthesize() {
      const current = index++;
      if (current === failAt) throw new Error("synthetic failure");
      tick += current === 0 ? 1200 : 500;
      return { audio: new Uint8Array([1, 2, 3]), byteLength: 3 };
    },
    cancel() {},
  };
  const player = {
    play(audio) {
      tick += 100;
      return { started: Promise.resolve(), finished: Promise.resolve(), cancel() {} };
    },
    release(audio) { released.push(audio); },
  };
  return {
    engine, player, released,
    now: () => tick,
    getMetrics: async () => ({ cpuPercent, memoryMb }),
  };
}

test("acceptance harness records latency and resource metrics without retaining audio", async () => {
  const f = fixture();
  const report = await runNeuralTtsAcceptance({
    ...f, voiceReviewPassed: true, networkReviewPassed: true, licenseReviewPassed: true,
  });
  assert.equal(report.technicalPass, true);
  assert.equal(report.overallAccepted, true);
  assert.equal(report.measurements.firstSynthesisMs, 1200);
  assert.equal(report.measurements.p95WarmSynthesisMs, 500);
  assert.equal(report.measurements.maxCpuPercent, 35);
  assert.equal(report.measurements.maxMemoryMb, 420);
  assert.equal(f.released.length, 3);
  assert.equal("audio" in report, false);
});

test("acceptance stays blocked when manual voice, network, or license evidence is absent", async () => {
  const report = await runNeuralTtsAcceptance(fixture());
  assert.equal(report.technicalPass, true);
  assert.equal(report.overallAccepted, false);
  assert.equal(report.evidence.voiceReviewPassed, false);
});

test("acceptance fails closed when a synthesis iteration fails", async () => {
  const report = await runNeuralTtsAcceptance(fixture({ failAt: 1 }));
  assert.equal(report.technicalPass, false);
  assert.equal(report.overallAccepted, false);
  assert.match(report.errors[0], /synthetic failure/);
});

test("late synthesis output is released after the bounded timeout", async () => {
  const released = [];
  const engine = {
    localOnly: true,
    available: true,
    async synthesize() {
      await new Promise((resolve) => setTimeout(resolve, 1100));
      return { audio: new Uint8Array([7, 8, 9]), byteLength: 3 };
    },
    cancel() {},
  };
  const player = {
    play() { throw new Error("playback must not start after synthesis timeout"); },
    release(audio) { released.push(audio); },
  };
  const report = await runNeuralTtsAcceptance({
    engine,
    player,
    limits: { timeoutMs: 1000 },
    getMetrics: async () => ({ cpuPercent: 10, memoryMb: 100 }),
  });
  assert.equal(report.technicalPass, false);
  assert.match(report.errors[0], /timed out/);
  await new Promise((resolve) => setTimeout(resolve, 150));
  assert.equal(released.length, 1);
  assert.deepEqual([...released[0]], [7, 8, 9]);
});
