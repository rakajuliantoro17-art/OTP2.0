import { mountPanitiaSephia } from "../dist/host/mount-panitia-sephia.js";

const status = document.getElementById("fixtureStatus");
const log = document.getElementById("eventLog");
const alertList = document.getElementById("alertList");
let sequence = 0;
let lastItem = null;
let bridge = null;

function writeLog(message) {
  const stamp = new Date().toLocaleTimeString("id-ID");
  log.textContent = (log.textContent === "Belum ada event." ? "" : log.textContent + "\n") + stamp + " — " + message;
}

try {
  bridge = mountPanitiaSephia({
    onNotification(event) {
      // The event is synthetic in this fixture. Never log student identity.
      writeLog("Callback host menerima event sintetis: " + event.eventId + " / count " + event.violationCount);
      status.textContent = "Host bridge aktif; event qualifying diterima. TTS tetap nonaktif.";
    },
    onError(error) {
      writeLog("SEPHIA error: " + String(error?.message || error));
      status.textContent = "SEPHIA mengalami kegagalan terisolasi. Host fixture tetap berjalan.";
    },
  });
  status.textContent = "Host bridge terpasang. Status awal wajib OFF.";
  writeLog("Bridge dipasang melalui entrypoint dist/host; belum diaktifkan.");
} catch (error) {
  status.textContent = "Host bridge gagal dipasang.";
  writeLog("Mount gagal: " + String(error?.message || error));
}

function addSyntheticAlert(count, eventId = "host-sim-" + (++sequence)) {
  const item = document.createElement("article");
  item.className = "alert-item";
  item.setAttribute("data-sephia-event-id", eventId);
  item.setAttribute("data-sephia-event-type", "violation");
  item.setAttribute("data-sephia-violation-count", String(count));

  const message = document.createElement("div");
  message.className = "alert-msg";
  message.textContent = "SIMULASI — notifikasi pelanggaran OTP (count " + count + ")";
  item.appendChild(message);
  alertList.prepend(item);
  lastItem = item;
  writeLog("Notifikasi host sintetis ditambahkan: " + eventId + " / count " + count);
}

document.querySelectorAll("[data-count]").forEach((button) => {
  button.addEventListener("click", () => addSyntheticAlert(Number(button.dataset.count)));
});

document.getElementById("duplicate").addEventListener("click", () => {
  if (!lastItem) return writeLog("Belum ada event untuk diduplikasi.");
  alertList.prepend(lastItem.cloneNode(true));
  writeLog("Event sintetis dengan ID yang sama dirender ulang.");
});

document.getElementById("clear").addEventListener("click", () => {
  alertList.replaceChildren();
  lastItem = null;
  writeLog("Daftar notifikasi sintetis dibersihkan.");
});

window.addEventListener("pagehide", () => {
  try { bridge?.dispose(); } catch {}
}, { once: true });
