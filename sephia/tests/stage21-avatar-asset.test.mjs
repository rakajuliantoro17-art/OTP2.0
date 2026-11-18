import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("Panitia host points to the bundled original SEPHIA portrait", async () => {
  const host = await read("../panitia/index.html");
  const svg = await read("assets/avatar-sephia.svg");
  const renderer = await read("src/visual/mount-sephia-avatar.js");
  assert.match(host, /avatarAssetUrl:\s*"\/sephia\/assets\/avatar-sephia\.svg"/);
  assert.match(svg, /<svg[^>]+viewBox="0 0 512 512"/);
  assert.match(svg, /SEPHIA — Digital Human Portrait/);
  assert.match(renderer, /image\.loading = "eager"/);
  assert.match(renderer, /LOCAL_ASSET_PATH/);
});

test("portrait is self-contained and does not load remote fonts, images, or scripts", async () => {
  const svg = await read("assets/avatar-sephia.svg");
  assert.doesNotMatch(svg, /(?:href|src)\s*=\s*["']https?:\/\/|<image\b|<script\b|@import|font-family:/i);
});
