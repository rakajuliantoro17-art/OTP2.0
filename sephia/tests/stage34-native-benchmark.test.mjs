import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("native host benchmark measures cold start and bounded warm synthesis", async () => {
  const script = await read("native-host/benchmark-native-host-windows.ps1");
  assert.match(script, /coldStartupMs/);
  assert.match(script, /warmSynthesisMs/);
  assert.match(script, /p95WarmSynthesisMs/);
  assert.match(script, /maxCpuPercentOfTotalMachine/);
  assert.match(script, /peakWorkingSetMb/);
  assert.match(script, /MaxAudioBytes/);
  assert.match(script, /ReadAsync/);
  assert.match(script, /MaxStartupMs/);
});

test("benchmark keeps audio in memory and does not claim browser playback or voice approval", async () => {
  const script = await read("native-host/benchmark-native-host-windows.ps1");
  assert.match(script, /FromBase64String/);
  assert.match(script, /Array\]::Clear/);
  assert.match(script, /playbackStartMeasured = \$false/);
  assert.match(script, /voiceQualityReviewRequired = \$true/);
  assert.doesNotMatch(script, /WriteAllBytes|Set-Content.*audio|FileStream.*Create/i);
});

test("benchmark exercises the exact fixed Native Messaging action only", async () => {
  const script = await read("native-host/benchmark-native-host-windows.ps1");
  assert.match(script, /action = "synthesize-approved-announcement"/);
  assert.doesNotMatch(script, /studentName|className|violationCount|eventId|text:/i);
});
