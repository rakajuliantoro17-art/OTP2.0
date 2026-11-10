import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("Stage 22 release audit is available and does not auto-deploy", async () => {
  const pkg = JSON.parse(await read("package.json"));
  const workflow = await read("../.github/workflows/sephia-tests.yml");
  const script = await read("scripts/release-readiness.mjs");
  const report = await read("docs/STAGE-22-RELEASE-READINESS.md");
  assert.equal(pkg.version, "0.22.0-stage.22");
  assert.equal(pkg.scripts["verify:release"], "node ./scripts/release-readiness.mjs");
  assert.match(workflow, /npm run verify:release/);
  assert.match(script, /Production Branch is main/);
  assert.match(script, /MANUAL/);
  assert.match(report, /production release is BLOCKED/i);
  assert.match(report, /explicit owner approval/);
});

test("release audit records the actual security and voice gates", async () => {
  const report = await read("docs/STAGE-22-RELEASE-READINESS.md");
  assert.match(report, /secure context/i);
  assert.match(report, /Indonesian feminine voice/);
  assert.match(report, /#alertList/);
  assert.match(report, /No Firebase\/API\/Moodle access/);
});
