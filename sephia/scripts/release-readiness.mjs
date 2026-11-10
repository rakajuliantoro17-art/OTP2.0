import { access, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const read = (path) => readFile(join(root, path), "utf8");
const exists = async (path) => {
  try { await access(join(root, path)); return true; } catch { return false; }
};
const checks = [];
const add = (name, status, detail) => checks.push({ name, status, detail });

const avatarExists = await exists("assets/avatar-sephia.svg");
const voiceExists = await exists("assets/sephia-announcement.wav");
const workflow = await read("../.github/workflows/sephia-tests.yml");
const vercel = await read("../vercel.json");
const host = await read("../panitia/index.html");

add("CI on feature and main", /- main/.test(workflow) && /feature\/sephia-module/.test(workflow) ? "PASS" : "BLOCKED",
  "GitHub Actions workflow listens to the feature branch and main.");
add("Same-origin microphone policy", /microphone=\(self\)/.test(vercel) && /on-device-speech-recognition=\(self\)/.test(vercel) ? "PASS" : "BLOCKED",
  "Vercel response policy permits same-origin microphone and on-device recognition.");
add("Bundled portrait", avatarExists ? "PASS" : "BLOCKED",
  avatarExists ? "Original SVG portrait is present." : "Portrait asset is missing.");
add("Approved voice WAV", voiceExists ? "REVIEW_REQUIRED" : "BLOCKED",
  voiceExists ? "WAV exists; run technical and human voice acceptance." : "Final voice asset has not been supplied.");
add("Panitia workstation acceptance", "MANUAL",
  "Chrome, HTTPS secure context, microphone permission, wake word, speakers, and visual fit must be tested on the target PC.");
add("Vercel Git integration", "MANUAL",
  "Verify the resumed Vercel project is linked to this repository and Production Branch is main.");
add("Production release authorization", "MANUAL",
  "Requires approved pull request, successful CI, Vercel preview review, and explicit owner approval.");

const productionReady = checks.every((item) => item.status === "PASS");
console.log(JSON.stringify({
  report: "SEPHIA Stage 22 Release Readiness",
  productionReady,
  note: "A successful CI build is not a production deployment or an authorization to merge.",
  checks,
}, null, 2));
