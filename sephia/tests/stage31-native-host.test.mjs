import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("Stage 31 Rust native host is a strict fail-closed protocol implementation", async () => {
  const cargo = await read("native-host/Cargo.toml");
  const source = await read("native-host/src/main.rs");
  assert.match(cargo, /serde_json/);
  assert.match(source, /deny_unknown_fields/);
  assert.match(source, /MAX_REQUEST_BYTES: usize = 4096/);
  assert.match(source, /MAX_RESPONSE_BYTES: usize = 1024 \* 1024/);
  assert.match(source, /synthesize-approved-announcement/);
  assert.match(source, /SEPHIA_EXTENSION_ORIGIN/);
  assert.match(source, /ENGINE_UNAVAILABLE/);
  assert.doesNotMatch(source, /TcpListener|UdpSocket|reqwest|hyper::|std::process::Command/);
  assert.doesNotMatch(source, /studentName|className|violationCount|firebase|moodle/i);
});

test("Windows installer allowlists one exact extension ID and registers only the native host", async () => {
  const installer = await read("native-host/install-windows.ps1");
  const uninstaller = await read("native-host/uninstall-windows.ps1");
  assert.match(installer, /ValidatePattern\('\^\[a-p\]\{32\}\$'\)/);
  assert.match(installer, /chrome-extension:\/\/\$ExtensionId\//);
  assert.match(installer, /allowed_origins = @\(\$origin\)/);
  assert.match(installer, /NativeMessagingHosts/);
  assert.match(installer, /UTF8Encoding\(\$false\)/);
  assert.match(uninstaller, /NativeMessagingHosts/);
  assert.match(uninstaller, /SEPHIA_EXTENSION_ORIGIN/);
});

test("native host documentation does not claim synthesis is ready", async () => {
  const report = await read("native-host/README.md");
  assert.match(report, /protocol stub/i);
  assert.match(report, /ENGINE_UNAVAILABLE/);
  assert.match(report, /in-memory Laras runtime/i);
});
