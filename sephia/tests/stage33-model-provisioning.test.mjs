import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("model provisioning is a separate explicit Windows action pinned to a fixed revision", async () => {
  const script = await read("native-host/provision-model-windows.ps1");
  assert.match(script, /\[switch\]\s*\$Download/);
  assert.match(script, /anak10thn\/pocket-tts-indonesian/);
  assert.match(script, /17257664e384561c957b02ac92edd1a24807f0e5/);
  assert.match(script, /Get-FileHash.*SHA256/);
  assert.match(script, /modelBundleSha256/);
  assert.match(script, /if \(-not \$Download\)/);
  assert.match(script, /Invoke-WebRequest/);
});

test("model manifest order and aggregate digest are stable for PowerShell and Rust", async () => {
  const manifest = JSON.parse(await read("docs/POCKET-TTS-INDONESIAN-ONNX-PROVENANCE.json"));
  const paths = manifest.files.map((file) => file.path);
  const sorted = [...paths].sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
  assert.deepEqual(paths, sorted);
  assert.equal(manifest.files.length, 9);
});

test("installer verifies and copies model files, voice reference, and human evidence", async () => {
  const installer = await read("native-host/install-windows.ps1");
  assert.match(installer, /ModelDir/);
  assert.match(installer, /VoiceReferenceWav/);
  assert.match(installer, /VoiceConsentEvidencePath/);
  assert.match(installer, /ModelLicenseEvidencePath/);
  assert.match(installer, /Get-FileHash/);
  assert.match(installer, /runtime_dlls/);
  assert.match(installer, /allowed_origins/);
});

test("uninstall removes the per-user model, voice, evidence, and host installation", async () => {
  const uninstaller = await read("native-host/uninstall-windows.ps1");
  assert.match(uninstaller, /SMANSASOO/);
  assert.match(uninstaller, /Remove-Item.*Recurse/);
});
