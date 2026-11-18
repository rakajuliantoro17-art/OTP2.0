import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = join(root, "src");
const files = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) await walk(absolute);
    else if (entry.isFile() && entry.name.endsWith(".js")) files.push(absolute);
  }
}
await walk(sourceRoot);
assert.ok(files.length > 0, "SEPHIA source modules must exist.");

const forbidden = [
  ["network fetch", /\bfetch\s*\(/i],
  ["XHR", /\bXMLHttpRequest\b/],
  ["WebSocket", /\bWebSocket\b/],
  ["EventSource", /\bEventSource\b/],
  ["persistent browser storage", /\b(?:localStorage|sessionStorage|indexedDB)\b/],
  ["dynamic code evaluation", /\beval\s*\(|\bnew\s+Function\b/],
  ["beacon transmission", /\bsendBeacon\s*\(/],
  ["microphone access", /getUserMedia|navigator\s*\.\s*mediaDevices/i],
];
for (const file of files) {
  const source = await readFile(file, "utf8");
  const name = relative(sourceRoot, file);
  for (const [label, pattern] of forbidden) {
    assert.doesNotMatch(source, pattern, name + " must not use " + label);
  }
  const imports = source.matchAll(/(?:from\s*|import\s*)["'](\.{1,2}\/[^"']+)["']/g);
  for (const match of imports) {
    const target = resolve(dirname(file), match[1]);
    const rel = relative(sourceRoot, target);
    assert.ok(rel !== ".." && !rel.startsWith(".." + sep), name + " import escapes source boundary");
    await readFile(target);
  }
}

const bridge = await readFile(join(sourceRoot, "host", "mount-panitia-sephia.js"), "utf8");
assert.match(bridge, /getElementById\("alertList"\)/);
assert.match(bridge, /getElementById\("sephiaControlMount"\)/);
assert.doesNotMatch(bridge, /localStorage|sessionStorage|firebase|fetch\s*\(/i);

console.log("SEPHIA static security and import-boundary checks passed:", files.length, "modules.");
