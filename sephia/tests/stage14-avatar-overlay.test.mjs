import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("Stage 14 host avatar overlay is included in package and CI", async () => {
  const pkg = JSON.parse(await read("package.json"));
  const workflow = await read("../.github/workflows/sephia-tests.yml");
  assert.match(pkg.version, /^0\.\d+\.0-stage\.\d+$/);
  assert.equal(pkg.scripts["verify:avatar"], "node --test ./tests/avatar-renderer.test.mjs ./tests/panitia-host-integration.test.mjs");
  assert.match(workflow, /npm run verify:avatar/);
  assert.match(workflow, /sephia-stage\d+-(?:host-avatar-overlay|notification-speech-pipeline)-/);
});

test("Panitia topbar mounts avatar separately from the SEPHIA control", async () => {
  const topbar = await read("../panitia/components/topbar.html");
  const bridge = await read("src/host/mount-panitia-sephia.js");
  assert.match(topbar, /id="sephiaAvatarMount"/);
  assert.match(topbar, /id="sephiaControlMount"/);
  assert.match(bridge, /getElementById\("sephiaAvatarMount"\)/);
  assert.match(bridge, /mountSephiaAvatar/);
  assert.match(bridge, /speechController/);
});

test("avatar is a same-origin optional overlay and never blocks the notification runtime", async () => {
  const avatar = await read("src/visual/mount-sephia-avatar.js");
  const bridge = await read("src/host/mount-panitia-sephia.js");
  assert.match(avatar, /LOCAL_ASSET_PATH/);
  assert.match(avatar, /snapshot\.active/);
  assert.match(avatar, /snapshot\.visualizerEnabled/);
  assert.match(avatar, /snapshot\.state === "speaking"/);
  assert.match(bridge, /try\s*\{\s*avatar = mountAvatar/);
  assert.match(bridge, /catch \(error\) \{\s*report\(error\);\s*\}/);
  assert.doesNotMatch(avatar, /https:\/\/|fetch\s*\(|XMLHttpRequest/);
});

test("Stage 14 report is explicit that the portrait fallback is not final artwork", async () => {
  const report = await read("docs/STAGE-14-AVATAR-HOST-OVERLAY.md");
  assert.match(report, /placeholder/i);
  assert.match(report, /final.*artwork|artwork.*final/i);
  assert.match(report, /Chrome.*pending|pending.*Chrome/i);
});
