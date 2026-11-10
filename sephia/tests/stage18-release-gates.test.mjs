import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("Stage 18 package and CI include the local audio acceptance gate", async () => {
  const pkg = JSON.parse(await read("package.json"));
  const workflow = await read("../.github/workflows/sephia-tests.yml");
  const readme = await read("README.md");
  assert.equal(pkg.version, "0.19.0-stage.19");
  assert.match(pkg.scripts["verify:audio"], /local-audio-announcement\.test\.mjs/);
  assert.match(pkg.scripts["verify:audio"], /stage19-audio-host-wiring\.test\.mjs/);
  assert.match(workflow, /- main/);
  assert.match(workflow, /npm run verify:audio/);
  assert.match(workflow, /sephia-stage19-local-voice-diagnostics-/);
  assert.match(readme, /Stage 18/);
});

test("production voice and avatar assets are not falsely represented as complete", async () => {
  const bridge = await read("src/host/mount-panitia-sephia.js");
  const avatar = await read("docs/STAGE-14-AVATAR-HOST-OVERLAY.md");
  const stage18 = await read("docs/STAGE-18-LOCAL-AUDIO-ADAPTER.md");
  assert.match(bridge, /createBrowserLocalIndonesianTts/);
  assert.match(avatar, /CSS-generated geometric placeholder/);
  assert.match(stage18, /A valid audio file does not yet exist/);
  assert.match(stage18, /not yet wired as production voice|not selected by default yet/);
});
