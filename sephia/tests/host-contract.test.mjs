import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("server alert payload carries the authoritative numeric violation count", async () => {
  const source = await read("../../api/violation.js");
  assert.match(source, /violationCount:\s*newCount/);
  assert.match(source, /if \(isCritical \|\| newCount >= 26\)/);
  assert.match(source, /type:\s*"violation"/);
  assert.match(source, /if \(newCount >= 30/);
});

test("Panitia preserves Firebase event key and decorates only qualifying violation alerts", async () => {
  const source = await read("../../panitia/js/realtime.js");
  assert.match(source, /attachSephiaMetadata\(renderedItem, snap\.key, alert\)/);
  assert.match(source, /alert\?\.type !== "violation"/);
  assert.match(source, /Number\.isSafeInteger\(count\)/);
  assert.match(source, /count < 27 \|\| count > 30/);
  assert.match(source, /data-sephia-event-id/);
  assert.match(source, /data-sephia-event-type/);
  assert.match(source, /data-sephia-violation-count/);
  assert.match(source, /addAlert\(alert\.msg \|\| alert\.message\)/);
});

test("Panitia alert message is rendered as text, not interpreted as HTML", async () => {
  const source = await read("../../panitia/js/ui.js");
  assert.match(source, /messageElement\.textContent\s*=\s*String\(message\s*\?\?\s*""\)/);
  assert.doesNotMatch(source, /messageElement\.innerHTML/);
});
