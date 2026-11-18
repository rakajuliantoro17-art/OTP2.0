import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("Stage 29 selects Native Messaging and rejects local HTTP inference services", async () => {
  const report = await read("docs/STAGE-29-LOCAL-CHROME-BRIDGE-SECURITY.md");
  assert.match(report, /Chrome extension plus a Chrome Native Messaging host/);
  assert.match(report, /Do not connect.*localhost or school-LAN HTTP/i);
  assert.match(report, /allowed_origins/);
  assert.match(report, /1 MiB/);
  assert.match(report, /Native Messaging is not itself a security boundary/i);
});

test("Native host contract accepts only a fixed generic announcement action", async () => {
  const report = await read("docs/STAGE-29-LOCAL-CHROME-BRIDGE-SECURITY.md");
  assert.match(report, /synthesize-approved-announcement/);
  assert.match(report, /does not accept caller-supplied speech text/i);
  assert.match(report, /no file, shell, network, OTP, or dashboard-control commands/i);
  assert.match(report, /no filesystem audio output, no cache, no model download/i);
});

test("production Panitia host is neural-only and remains fail-closed", async () => {
  const bridge = await read("src/host/mount-panitia-sephia.js");
  assert.match(bridge, /createUnavailableLocalNeuralTtsAdapter/);
  assert.doesNotMatch(bridge, /createLocalAudioAnnouncementAdapter|announcementAssetUrl/);
  assert.doesNotMatch(bridge, /createBrowserLocalIndonesianTts/);
});

test("Stage 29 explicitly blocks production until in-memory inference and workstation acceptance", async () => {
  const report = await read("docs/STAGE-29-LOCAL-CHROME-BRIDGE-SECURITY.md");
  assert.match(report, /in-memory API/);
  assert.match(report, /Windows packaging is reproducible/);
  assert.match(report, /actual Panitia PC/);
});

test("Native Messaging protocol schema is strict and has no arbitrary text or identity fields", async () => {
  const schema = JSON.parse(await read("native-messaging/protocol.schema.json"));
  const request = schema.oneOf.find((entry) => entry.properties?.action);
  const response = schema.oneOf.find((entry) => entry.properties?.audioBase64);
  assert.equal(request.additionalProperties, false);
  assert.deepEqual(request.required, ["version", "action"]);
  assert.equal(request.properties.action.const, "synthesize-approved-announcement");
  assert.equal(response.additionalProperties, false);
  assert.equal(response.properties.sampleRate.const, 24000);
  assert.equal(response.properties.channels.const, 1);
  assert.equal(response.properties.audioBase64.maxLength, 955734);
  assert.equal("text" in request.properties, false);
  assert.equal("studentName" in request.properties, false);
  assert.equal("className" in request.properties, false);
  assert.equal("eventId" in request.properties, false);
});
