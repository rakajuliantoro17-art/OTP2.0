import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../../panitia/js/ui.js", import.meta.url), "utf8");
const m = src.match(/const CONNECTION_OFFLINE_MS[\s\S]*?\n}\n/);
const connectionCell = new Function(m[0] + "; return connectionCell;")();

test("connection cell: connected / disconnected / unknown", () => {
  const now = Date.now();
  assert.match(connectionCell({ lastSeen: now - 5000 }), /Terhubung/);
  assert.match(connectionCell({ lastSeen: now - 59000 }), /Terhubung/);
  assert.match(connectionCell({ lastSeen: now - 90000 }), /Putus 1 mnt/);
  assert.match(connectionCell({ lastSeen: now - 5 * 60000 }), /Putus 5 mnt/);
  assert.match(connectionCell({ lastSeen: now - 61000 }), /Putus 1 mnt/);
  assert.match(connectionCell({}), /—/);
  assert.match(connectionCell({ lastSeen: "x" }), /—/);
});

test("table header and rows have matching 7 columns", () => {
  const html = readFileSync(new URL("../../panitia/components/table.html", import.meta.url), "utf8");
  assert.equal((html.match(/<th>/g) || []).length, 7);
  assert.match(src, /connectionCell\(student\)/);
});
