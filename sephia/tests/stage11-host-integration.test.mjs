import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("Stage 11 host integration verifier is part of the package scripts", async () => {
  const pkg = JSON.parse(await read("package.json"));
  assert.equal(pkg.scripts["verify:host"], "node ./scripts/verify-host-integration.mjs");
  assert.match(pkg.version, /^0\.\\d+\.0-stage\\.\\d+$/);
});

test("Stage 11 CI verifies host contract after building distribution", async () => {
  const workflow = await read("../.github/workflows/sephia-tests.yml");
  assert.match(workflow, /npm run verify:host/);
  assert.ok(workflow.indexOf("npm run build") < workflow.indexOf("npm run verify:host"));
  assert.match(workflow, /sephia-stage\\d+-host-integration-/);
});

test("Stage 11 verifier checks host load order, source/dist parity, and package integrity", async () => {
  const verifier = await read("scripts/verify-host-integration.mjs");
  assert.match(verifier, /panitia\/index\.html/);
  assert.match(verifier, /sephiaControlMount/);
  assert.match(verifier, /alertList/);
  assert.match(verifier, /bridgeLoad > alertLoad/);
  assert.match(verifier, /builtBridge, sourceBridge/);
  assert.match(verifier, /createHash/);
  assert.match(verifier, /manifestPaths/);
  assert.match(verifier, /doesNotMatch\(sourceBridge/);
});

test("Stage 11 closeout explicitly separates CI build from browser acceptance and deployment", async () => {
  const report = await read("docs/STAGE-11-CLOSEOUT.md");
  assert.match(report, /Chrome.*pending|pending.*Chrome/i);
  assert.match(report, /Vercel.*paused|paused.*Vercel/i);
  assert.match(report, /no deployment|deployment.*not/i);
  assert.match(report, /src\/.*dist\//);
});
