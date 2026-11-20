import test from "node:test";
import assert from "node:assert/strict";
import { parseVoiceCommand, buildCommandReply, summarizeStudents, NO_DATA_REPLY } from "../src/core/voice-commands.js";
import { createNotificationSpeechController } from "../src/audio/announcement.js";
import { createLocalWakeWordRecognizer } from "../src/audio/local-wake-word.js";

test("parses Indonesian command keywords", () => {
  const cases = { "status": "status", "berapa siswa yang terkunci": "locked", "ada yang kritis": "critical", "peringatan": "warning",
    "ulangi": "repeat", "diam": "quiet", "terima kasih": "quiet", "bantuan": "help", "apa saja perintahnya": "help" };
  for (const [t, c] of Object.entries(cases)) assert.equal(parseVoiceCommand(t), c, t);
  assert.equal(parseVoiceCommand("cuaca hari ini cerah"), null);
  assert.equal(parseVoiceCommand(""), null);
});

test("summarizes by violation thresholds and builds count-only replies", () => {
  const s = summarizeStudents([{ violation: 0 }, { violation: 12 }, { violation: 27 }, { violation: 30 }, { violation: 5, status: "locked" }]);
  assert.deepEqual(s, { total: 5, safe: 1, warning: 1, critical: 1, locked: 2 });
  assert.match(buildCommandReply("status", s), /5 siswa.*2 terkunci.*1 kritis.*1 peringatan.*1 aman/);
  assert.equal(buildCommandReply("locked", { ...s, locked: 0 }), "Tidak ada siswa terkunci.");
  assert.equal(buildCommandReply("status", null), NO_DATA_REPLY);
  assert.equal(buildCommandReply("status", { total: 0 }), "Belum ada siswa yang terpantau.");
  assert.doesNotMatch(buildCommandReply("status", s), /Ahmad|nama/i);
});

test("speakStatus speaks only safe text", async () => {
  const spoken = [];
  const c = createNotificationSpeechController({ adapter: { available: true, speak: async (t) => { spoken.push(t); }, cancel() {} } });
  assert.equal(await c.speakStatus("Ada 5 siswa terpantau."), true);
  assert.equal(await c.speakStatus("<script>alert(1)</script>"), false);
  assert.equal(await c.speakStatus("x".repeat(300)), false);
  assert.deepEqual(spoken, ["Ada 5 siswa terpantau."]);
});

test("command window routes final results to onCommand and only while open", () => {
  let inst;
  class R { constructor() { inst = this; } start() {} abort() {} }
  const heard = [];
  const win = { isSecureContext: true, SpeechRecognition: R };
  const rec = createLocalWakeWordRecognizer({ windowImpl: win, requireLocal: false, onCommand: (t) => heard.push(t) });
  const feed = (text, isFinal = true) => inst.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: text, confidence: 1 }], { isFinal })] });
  return rec.start().then(() => {
    feed("status");
    assert.deepEqual(heard, []);          // window closed
    rec.openCommandWindow(5000);
    feed("status", false);
    assert.deepEqual(heard, []);          // interim ignored
    feed("status");
    assert.deepEqual(heard, ["status"]);
    rec.closeCommandWindow();
    feed("terkunci");
    assert.deepEqual(heard, ["status"]);
    rec.dispose();
  });
});
