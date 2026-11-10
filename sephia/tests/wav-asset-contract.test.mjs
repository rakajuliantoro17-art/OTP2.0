import test from "node:test";
import assert from "node:assert/strict";
import { inspectSephiaWav } from "../scripts/wav-asset-contract.mjs";

function makeWav({
  sampleRate = 24000,
  channels = 1,
  bitsPerSample = 16,
  audioFormat = 1,
  durationSeconds = 3,
  sampleValue = 1200,
} = {}) {
  const blockAlign = channels * bitsPerSample / 8;
  const dataLength = sampleRate * durationSeconds * blockAlign;
  const buffer = Buffer.alloc(44 + dataLength);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(audioFormat, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * blockAlign, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataLength, 40);
  if (bitsPerSample === 16) {
    for (let offset = 44; offset < buffer.length; offset += 2) buffer.writeInt16LE(sampleValue, offset);
  }
  return buffer;
}

test("accepts mono 16-bit PCM WAV at an approved sample rate", () => {
  const result = inspectSephiaWav(makeWav());
  assert.equal(result.codec, "PCM");
  assert.equal(result.channels, 1);
  assert.equal(result.sampleRate, 24000);
  assert.equal(result.bitsPerSample, 16);
  assert.equal(result.durationSeconds, 3);
  assert.equal(result.clippedRatio, 0);
});

test("rejects stereo, compressed, unsupported sample-rate, and non-16-bit assets", () => {
  assert.throws(() => inspectSephiaWav(makeWav({ channels: 2 })), /mono/);
  assert.throws(() => inspectSephiaWav(makeWav({ audioFormat: 3 })), /uncompressed PCM/);
  assert.throws(() => inspectSephiaWav(makeWav({ sampleRate: 48000 })), /sample rate/);
  assert.throws(() => inspectSephiaWav(makeWav({ bitsPerSample: 8 })), /16-bit PCM/);
});

test("rejects excessive duration, silent signal, and clipped audio", () => {
  assert.throws(() => inspectSephiaWav(makeWav({ durationSeconds: 9 })), /duration/);
  assert.throws(() => inspectSephiaWav(makeWav({ sampleValue: 0 })), /too low/);
  assert.throws(() => inspectSephiaWav(makeWav({ sampleValue: 32767 })), /clipped/);
});

test("rejects malformed RIFF headers and inconsistent lengths", () => {
  const invalid = makeWav();
  invalid.write("NOPE", 0);
  assert.throws(() => inspectSephiaWav(invalid), /RIFF\/WAVE/);
  const mismatch = makeWav();
  mismatch.writeUInt32LE(10, 4);
  assert.throws(() => inspectSephiaWav(mismatch), /RIFF length/);
});
