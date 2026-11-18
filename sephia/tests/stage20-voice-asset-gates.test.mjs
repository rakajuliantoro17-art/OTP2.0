import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("Stage 20 WAV asset validation is wired into package and CI", async () => {
  const pkg = JSON.parse(await read("package.json"));
  const workflow = await read("../.github/workflows/sephia-tests.yml");
  const readme = await read("README.md");
  assert.equal(pkg.version, "0.22.0-stage.22");
  assert.equal(pkg.scripts["verify:voice-asset"], "node ./scripts/verify-voice-asset.mjs");
  assert.match(workflow, /npm run verify:voice-asset/);
  assert.match(workflow, /sephia-stage22-local-voice-diagnostics-/);
  assert.match(readme, /Stage 20/);
});

test("voice asset is not claimed as complete without a real file and human review", async () => {
  const assetGuide = await read("assets/README.md");
  const productionDoc = await read("docs/STAGE-20-VOICE-ASSET-PRODUCTION.md");
  const validator = await read("scripts/verify-voice-asset.mjs");
  assert.match(assetGuide, /intentionally absent/);
  assert.match(productionDoc, /No real voice asset is included/);
  assert.match(validator, /BLOCKED/);
  assert.match(productionDoc, /at least two independent listeners/i);
});
