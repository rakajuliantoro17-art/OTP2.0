import { createSephiaRuntime } from "../src/runtime/create-sephia-runtime.js";
import { bindPageLifecycle } from "../src/runtime/bind-page-lifecycle.js";
import { createNotificationSpeechController } from "../src/audio/announcement.js";
import { createVisualState } from "../src/visual/visual-state.js";
import { mountSephiaControls } from "../src/visual/mount-sephia-controls.js";
import { mountSephiaAvatar } from "../src/visual/mount-sephia-avatar.js";

const alertList = document.getElementById("alertList");
const status = document.getElementById("fixtureStatus");
const log = document.getElementById("eventLog");
let sequence = 0;
let lastItem = null;
let failNextSpeech = false;
let speechTimer = null;
let resolvePendingSpeech = null;

function writeLog(message) {
  const stamp = new Date().toLocaleTimeString("id-ID");
  log.textContent = (log.textContent === "Fixture dimuat. Belum ada event." ? "" : log.textContent + "\n") + stamp + " — " + message;
}

const visualState = createVisualState();
const speechController = createNotificationSpeechController({
  adapter: {
    speak() {
      if (failNextSpeech) {
        failNextSpeech = false;
        return Promise.reject(new Error("Simulasi TTS gagal"));
      }
      return new Promise((resolve) => {
        resolvePendingSpeech = resolve;
        speechTimer = setTimeout(() => {
          speechTimer = null;
          resolvePendingSpeech = null;
          resolve();
        }, 900);
      });
    },
    cancel() {
      if (speechTimer !== null) clearTimeout(speechTimer);
      speechTimer = null;
      resolvePendingSpeech?.();
      resolvePendingSpeech = null;
    },
  },
  onStateChange(next) {
    if (visualState.snapshot.active) visualState.setState(next);
    status.textContent = "Status fixture: " + next + ".";
  },
  onError(error) {
    writeLog("Audio mock error: " + error.message);
    if (visualState.snapshot.active) visualState.setState("error");
  },
});

const runtime = createSephiaRuntime({
  root: alertList,
  speechController,
  onNotification(event) {
    writeLog("Event diterima: " + event.eventId + " / count " + event.violationCount);
  },
  onNotificationError(error) {
    writeLog("Runtime error: " + error.message);
  },
});
const controls = mountSephiaControls({
  container: document.getElementById("sephiaControls"),
  runtime,
  visualState,
  onError(error) { writeLog("Control error: " + error.message); },
});
const avatar = mountSephiaAvatar({
  container: document.getElementById("avatarMount"),
  visualState,
  speechController,
});
const pageLifecycle = bindPageLifecycle({ runtime, visualState });

function addSyntheticAlert(count, eventId = "sim-" + (++sequence)) {
  const item = document.createElement("article");
  item.className = "alert-item";
  item.setAttribute("data-sephia-event-id", eventId);
  item.setAttribute("data-sephia-event-type", "violation");
  item.setAttribute("data-sephia-violation-count", String(count));
  const message = document.createElement("div");
  message.className = "alert-msg";
  message.textContent = "SIMULASI — notifikasi pelanggaran OTP (count " + count + ")";
  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = eventId + " · data sintetis";
  item.append(message, meta);
  alertList.prepend(item);
  lastItem = item;
  writeLog("Notifikasi sintetis ditambahkan: " + eventId + " / " + count);
}

document.querySelectorAll("[data-count]").forEach((button) => {
  button.addEventListener("click", () => addSyntheticAlert(Number(button.dataset.count)));
});
document.getElementById("duplicate").addEventListener("click", () => {
  if (!lastItem) return writeLog("Belum ada event untuk diduplikasi.");
  const copy = lastItem.cloneNode(true);
  alertList.prepend(copy);
  writeLog("Rerender duplikat: " + copy.getAttribute("data-sephia-event-id"));
});
document.getElementById("burst").addEventListener("click", () => {
  addSyntheticAlert(27);
  addSyntheticAlert(28);
  addSyntheticAlert(29);
  writeLog("Burst 3 event sintetis dikirim berurutan.");
});
document.getElementById("failAudio").addEventListener("click", () => {
  failNextSpeech = true;
  addSyntheticAlert(27);
  writeLog("Kegagalan adapter mock akan diterapkan pada event qualifying berikutnya.");
});
document.getElementById("clear").addEventListener("click", () => {
  alertList.replaceChildren();
  lastItem = null;
  writeLog("Daftar simulasi dibersihkan; tidak menghapus data OTP karena fixture tidak terhubung ke OTP.");
});

window.addEventListener("pagehide", () => {
  pageLifecycle.dispose();
  runtime.dispose();
  speechController.dispose();
  controls.dispose();
  avatar.dispose();
  visualState.dispose();
}, { once: true });

writeLog("Fixture aktif. Reader tetap OFF sampai tombol SEPHIA diaktifkan manual.");
