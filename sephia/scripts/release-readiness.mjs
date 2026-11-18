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
const neuralAdapterExists = await exists("src/audio/local-neural-tts.js");
const neuralAdapterTestsExist = await exists("tests/local-neural-tts.test.mjs") && await exists("tests/neural-tts-controller.test.mjs");
const runtimePrototypeExists = await exists("src/audio/qualified-local-neural-engine.js") &&
  await exists("tests/qualified-local-neural-engine.test.mjs");
const acceptanceHarnessExists = await exists("src/audio/neural-tts-acceptance.js") &&
  await exists("tests/neural-tts-acceptance.test.mjs");
const workflow = await read("../.github/workflows/sephia-tests.yml");
const vercel = await read("../vercel.json");
const host = await read("../panitia/index.html");
const hostBridge = await read("src/host/mount-panitia-sephia.js");
const stage27 = await read("docs/STAGE-27-LOCAL-NEURAL-RUNTIME-PROTOTYPE.md");
const stage29Exists = await exists("docs/STAGE-29-LOCAL-CHROME-BRIDGE-SECURITY.md");
const stage29TestsExist = await exists("tests/stage29-native-bridge-security.test.mjs");
const stage30Exists = await exists("extension/manifest.json") &&
  await exists("extension/service-worker.js") && await exists("extension/content-script.js") &&
  await exists("extension/protocol.js") && await exists("tests/stage30-extension.test.mjs");
const stage31Exists = await exists("native-host/Cargo.toml") &&
  await exists("native-host/src/main.rs") && await exists("native-host/install-windows.ps1") &&
  await exists("tests/stage31-native-host.test.mjs");
const stage32Exists = await exists("native-host/src/inference.rs") &&
  await exists("docs/POCKET-TTS-INDONESIAN-ONNX-PROVENANCE.json") &&
  await exists("tests/stage32-inference.test.mjs");
const stage33Exists = await exists("native-host/provision-model-windows.ps1") &&
  await exists("tests/stage33-model-provisioning.test.mjs");
const stage34Exists = await exists("native-host/benchmark-native-host-windows.ps1") &&
  await exists("tests/stage34-native-benchmark.test.mjs");
const stage35Exists = await exists("native-host/smoke-test-native-host-windows.ps1") &&
  await exists("tests/stage35-native-host-smoke.test.mjs");
const stage36Exists = await exists("docs/STAGE-36-PRODUCTION-CANDIDATE-RUNBOOK.md");

add("CI on feature and main", /- main/.test(workflow) && /feature\/sephia-module/.test(workflow) ? "PASS" : "BLOCKED",
  "GitHub Actions workflow listens to the feature branch and main.");
add("Same-origin microphone policy", /microphone=\(self\)/.test(vercel) && /on-device-speech-recognition=\(self\)/.test(vercel) ? "PASS" : "BLOCKED",
  "Vercel response policy permits same-origin microphone and on-device recognition.");
add("Audio activation remains opt-in", !/announcementAssetUrl\s*:/.test(host) ? "PASS" : "BLOCKED",
  "Production host does not enable the WAV adapter before the approved asset is supplied.");
add("Bundled portrait", avatarExists ? "PASS" : "BLOCKED",
  avatarExists ? "Original SVG portrait is present." : "Portrait asset is missing.");
add("Local neural TTS adapter contract", neuralAdapterExists ? "PASS" : "BLOCKED",
  neuralAdapterExists ? "Dependency-injected local neural adapter is present; it does not bundle or fetch a model." : "Neural adapter contract is missing.");
add("Neural TTS contract tests", neuralAdapterTestsExist ? "PASS" : "BLOCKED",
  neuralAdapterTestsExist ? "Adapter and controller tests use deterministic in-memory mocks." : "Neural adapter/controller tests are incomplete.");
add("Stage 27 offline runtime qualification wrapper", runtimePrototypeExists ? "PASS" : "BLOCKED",
  runtimePrototypeExists ? "Pinned manifest, local-only runtime contract, consent gate, and output bounds are present." : "Runtime qualification wrapper or tests are missing.");
add("Stage 28 acceptance benchmark", acceptanceHarnessExists ? "PASS" : "BLOCKED",
  acceptanceHarnessExists ? "In-memory latency/resource harness and deterministic tests are present." : "Acceptance harness or tests are missing.");
add("Neural-only production host", !/createLocalAudioAnnouncementAdapter|announcementAssetUrl/.test(hostBridge) ? "PASS" : "BLOCKED",
  "Production Panitia bridge cannot select the legacy WAV adapter.");
add("Page-side Chrome Native Messaging adapter", /createChromeNativeMessagingTtsAdapter/.test(hostBridge) &&
  await exists("src/audio/chrome-native-messaging-tts.js") ? "PASS" : "BLOCKED",
  "Panitia host has a fail-closed page adapter for the separately installed Chrome extension.");
add("Stage 27 model attribution", /CC-BY-4.0/.test(stage27) && /anak10thn/.test(stage27) ? "PASS" : "BLOCKED",
  "Pocket TTS Indonesian attribution is recorded separately from Laras source-code licensing.");
add("Stage 29 security decision and tests", stage29Exists && stage29TestsExist ? "PASS" : "BLOCKED",
  "Native Messaging topology decision and security regression tests are present.");
add("Stage 30 Chrome extension bridge", stage30Exists ? "PASS" : "BLOCKED",
  stage30Exists ? "Manual active-tab pairing, fixed-action transport, response validation, in-memory playback, and disconnect handling are present." : "Chrome extension bridge files or tests are incomplete.");
add("Stage 31 Rust Native Messaging protocol host", stage31Exists ? "PASS" : "BLOCKED",
  stage31Exists ? "Framing, exact origin check, strict request schema, rate limit, and Windows registration scripts are present." : "Native host protocol files or tests are incomplete.");
add("Stage 32 in-memory Laras inference implementation", stage32Exists ? "PASS" : "BLOCKED",
  stage32Exists ? "Pinned Laras Engine API, per-file model hashes, voice/runtime hash checks, and in-memory PCM response are implemented behind the inference feature." : "In-memory inference implementation or model provenance tests are incomplete.");
add("Stage 33 pinned model provisioning workflow", stage33Exists ? "PASS" : "BLOCKED",
  stage33Exists ? "Explicit model download switch, fixed revision, per-file SHA-256 verification, and Windows install/cleanup scripts are present." : "Model provisioning scripts or tests are incomplete.");
add("Stage 34 target PC benchmark harness", stage34Exists ? "PASS" : "BLOCKED",
  stage34Exists ? "Cold startup, warm synthesis, CPU, memory, and in-memory PCM benchmark script is present." : "Target PC benchmark script or tests are incomplete.");
add("Stage 35 Windows Native Messaging process smoke test", stage35Exists ? "PASS" : "BLOCKED",
  stage35Exists ? "Windows process test verifies fail-closed readiness and exact extension-origin rejection." : "Native host process smoke test or regression checks are incomplete.");
add("Stage 36 production candidate runbook", stage36Exists ? "PASS" : "BLOCKED",
  stage36Exists ? "Installation, target-PC acceptance, rollback, and release gates are documented." : "Production candidate runbook is missing.");
add("Provisioned local model and consented voice", "BLOCKED",
  "No real ONNX model bundle or consented adult feminine Indonesian voice reference has been installed and accepted on the Panitia PC.");
add("Approved neural model and feminine voice", "BLOCKED",
  "No real engine, model weights, or licensed adult feminine reference voice has passed acoustic and legal acceptance.");
add("Panitia workstation acceptance", "MANUAL",
  "Chrome, HTTPS secure context, microphone permission, wake word, speakers, CPU/RAM, and visual fit must be tested on the target PC.");
add("Vercel Git integration", "MANUAL",
  "Verify the resumed Vercel project is linked to this repository and Production Branch is main.");
add("Production release authorization", "MANUAL",
  "Requires approved pull request, successful CI, Vercel preview review, and explicit owner approval.");

const productionReady = checks.every((item) => item.status === "PASS");
console.log(JSON.stringify({
  report: "SEPHIA Release Readiness",
  productionReady,
  note: "A successful CI build is not a production deployment or an authorization to merge.",
  checks,
}, null, 2));
