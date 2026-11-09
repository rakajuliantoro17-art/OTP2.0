import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const readRepoFile = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("OTP server alert payload includes authoritative numeric violation count", async () => {
  const source = await readRepoFile("../../api/violation.js");
  assert.match(source, /violationCount:\s*newCount/);
});

test("Panitia listener preserves Firebase key and restricts SEPHIA metadata to counts 27–30", async () => {
  const source = await readRepoFile("../../panitia/js/realtime.js");
  assert.match(source, /attachSephiaMetadata\(renderedItem,\s*snap\.key,\s*alert\)/);
  assert.match(source, /Number\.isSafeInteger\(count\)/);
  assert.match(source, /count < 27 \|\| count > 30/);
  assert.match(source, /data-sephia-event-id/);
  assert.match(source, /data-sephia-violation-count/);
});

test("Panitia alert renderer treats alert message as text, not HTML", async () => {
  const source = await readRepoFile("../../panitia/js/ui.js");
  const start = source.indexOf("function addAlert(");
  const end = source.indexOf("/* =========================\n   FIREBASE STATUS INDICATOR", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const renderer = source.slice(start, end);
  assert.match(renderer, /messageElement\.textContent\s*=\s*String\(message\s*\?\?\s*""\)/);
  assert.doesNotMatch(renderer, /\.innerHTML\s*=/);
});
