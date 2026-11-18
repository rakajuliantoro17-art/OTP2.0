import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("Stage 40 native speech contract integrity audit passes", () => {
  const result = spawnSync(process.execPath, ["./scripts/verify-stage40-contract.mjs"], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.stage, 40);
  assert.equal(report.status, "PASS");
  assert.ok(report.verified.includes("two-action allowlist parity across page, extension, Rust host, and inference"));
});

test("Stage 40 audit is wired into package and release artifact workflow", async () => {
  const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  const workflow = await readFile(new URL("../../.github/workflows/sephia-tests.yml", import.meta.url), "utf8");
  assert.equal(pkg.version, "0.40.0-stage.40");
  assert.equal(pkg.scripts["verify:stage40"], "node ./scripts/verify-stage40-contract.mjs");
  assert.match(workflow, /npm run verify:stage40/);
  assert.match(workflow, /STAGE-40-NATIVE-CONTRACT-INTEGRITY\.md/);
});
