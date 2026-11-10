import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("Panitia topbar exposes exactly one explicit SEPHIA control mount", async () => {
  const topbar = await read("panitia/components/topbar.html");
  assert.equal((topbar.match(/id="sephiaControlMount"/g) || []).length, 1);
  assert.equal((topbar.match(/id="sephiaAvatarMount"/g) || []).length, 1);
});

test("Panitia loads SEPHIA only after alert component and catches optional-module failures", async () => {
  const html = await read("panitia/index.html");
  const alertLoad = html.indexOf('await loadComponent("alertMount", "./components/alert.html")');
  const bridgeImport = html.indexOf('await import("../sephia/src/host/mount-panitia-sephia.js")');
  const guardedCatch = html.indexOf('console.warn("[SEPHIA] Gagal dimuat; dashboard tetap berjalan.", error)');
  assert.ok(alertLoad >= 0);
  assert.ok(bridgeImport > alertLoad);
  assert.ok(guardedCatch > bridgeImport);
  assert.match(html, /document\.addEventListener\("DOMContentLoaded", initializeDashboard\)/);
  assert.ok(html.includes("window.SEPHIA = mountPanitiaSephia"));
});

test("host integration contains no authentication assumption or persistent identity storage", async () => {
  const bridge = await read("sephia/src/host/mount-panitia-sephia.js");
  assert.match(bridge, /getElementById\("alertList"\)/);
  assert.match(bridge, /getElementById\("sephiaControlMount"\)/);
  assert.match(bridge, /getElementById\("sephiaAvatarMount"\)/);
  assert.match(bridge, /mountSephiaAvatar/);
  assert.doesNotMatch(bridge, /localStorage|sessionStorage|firebase|fetch\(/i);
});
