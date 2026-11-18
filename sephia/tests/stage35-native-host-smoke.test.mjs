import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("Windows process smoke test verifies strict origin and fail-closed engine handshake", async () => {
  const script = await read("native-host/smoke-test-native-host-windows.ps1");
  assert.match(script, /abcdefghijklmnopabcdefghijklmnop/);
  assert.match(script, /ponmlkjihgfedcbaponmlkjihgfedcba/);
  assert.match(script, /ENGINE_UNAVAILABLE/);
  assert.match(script, /ExitCode -eq 0/);
  assert.match(script, /WaitForExit/);
});

test("native host smoke test uses temporary config and removes it after execution", async () => {
  const script = await read("native-host/smoke-test-native-host-windows.ps1");
  assert.match(script, /GetTempPath/);
  assert.match(script, /sephia-host-config\.json/);
  assert.match(script, /Remove-Item.*Recurse/);
  assert.doesNotMatch(script, /File\.WriteAllBytes|WriteAllBytes|audio\.wav|studentName/i);
});

test("smoke test validates PowerShell process protocol without changing OTP or Firebase", async () => {
  const script = await read("native-host/smoke-test-native-host-windows.ps1");
  assert.match(script, /StandardOutput\.BaseStream/);
  assert.match(script, /ArgumentList\.Add/);
  assert.doesNotMatch(script, /firebase|moodle|generateOTP|validateOTP|resetOTP/i);
});
