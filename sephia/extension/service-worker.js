import { NATIVE_HOST_NAME, validateNativeResponse } from "./protocol.js";

let pairedTab = null;
let nativePort = null;
let hostReady = false;
let hostReadyPromise = null;
let pending = null;
let lastRequestAt = 0;
const intentionallyClosedPorts = new WeakSet();

function sendTab(tabId, message) {
  return chrome.tabs.sendMessage(tabId, message).catch(() => undefined);
}

function disconnectNative() {
  const port = nativePort;
  if (!port) return;
  nativePort = null;
  hostReady = false;
  hostReadyPromise = null;
  pending = null;
  intentionallyClosedPorts.add(port);
  try { port.disconnect(); } catch {}
}

function openNativePort() {
  if (nativePort && hostReady) return Promise.resolve(true);
  if (hostReadyPromise) return hostReadyPromise;

  let port;
  try {
    port = chrome.runtime.connectNative(NATIVE_HOST_NAME);
  } catch {
    return Promise.resolve(false);
  }

  nativePort = port;
  hostReady = false;
  let settled = false;
  let resolveReady;
  const readyPromise = new Promise((resolve) => { resolveReady = resolve; });
  hostReadyPromise = readyPromise;

  const handshakeTimer = setTimeout(() => {
    if (settled) return;
    settled = true;
    resolveReady(false);
    disconnectNative();
  }, 120000);

  port.onMessage.addListener((response) => {
    if (!hostReady) {
      if (response?.version === 1 && response?.ok === true && response?.status === "ready" &&
          Object.keys(response).sort().join(",") === "ok,status,version") {
        hostReady = true;
        settled = true;
        clearTimeout(handshakeTimer);
        resolveReady(true);
        return;
      }
      if (response?.version === 1 && response?.ok === false && validateNativeResponse(response)) {
        settled = true;
        clearTimeout(handshakeTimer);
        resolveReady(false);
        disconnectNative();
      }
      return;
    }

    const request = pending;
    if (!request) return;
    pending = null;
    if (request.cancelled) return;

    if (!validateNativeResponse(response)) {
      void sendTab(request.tabId, {
        type: "SEPHIA_NATIVE_RESULT",
        requestId: request.requestId,
        response: { version: 1, ok: false, code: "INVALID_REQUEST" },
      });
      return;
    }
    void sendTab(request.tabId, {
      type: "SEPHIA_NATIVE_RESULT",
      requestId: request.requestId,
      response,
    });
  });

  port.onDisconnect.addListener(() => {
    const wasIntentional = intentionallyClosedPorts.has(port);
    if (nativePort === port) nativePort = null;
    hostReady = false;
    if (!settled) {
      settled = true;
      clearTimeout(handshakeTimer);
      resolveReady(false);
    }
    if (hostReadyPromise === readyPromise) hostReadyPromise = null;
    if (pending) {
      const request = pending;
      pending = null;
      if (!request.cancelled) {
        void sendTab(request.tabId, {
          type: "SEPHIA_NATIVE_RESULT",
          requestId: request.requestId,
          response: { version: 1, ok: false, code: "ENGINE_UNAVAILABLE" },
        });
      }
    }
    if (!wasIntentional && pairedTab) {
      void sendTab(pairedTab.tabId, {
        type: "SEPHIA_NATIVE_STATE",
        state: "disconnected",
      });
    }
  });

  return readyPromise;
}

async function pairActiveTab(message) {
  const tab = await chrome.tabs.get(message.tabId);
  if (!tab?.url || !tab.title) return { ok: false, error: "Tab Panitia tidak valid." };
  const url = new URL(tab.url);
  if (url.origin !== message.origin ||
      url.protocol !== "https:" ||
      !url.pathname.toLowerCase().includes("/panitia") ||
      !tab.title.includes("SMANSASOO CBT LOCK 2.0") ||
      !tab.title.includes("Panitia")) {
    return { ok: false, error: "Asal tab tidak cocok dengan halaman Panitia OTP 2.0." };
  }
  if (pairedTab && pairedTab.tabId !== tab.id) {
    await sendTab(pairedTab.tabId, { type: "SEPHIA_NATIVE_STATE", state: "disconnected" });
    disconnectNative();
  }
  pairedTab = { tabId: tab.id, origin: url.origin };
  const ready = await openNativePort();
  if (!ready) {
    pairedTab = null;
    return { ok: false, error: "Mesin neural lokal belum siap atau belum terpasang." };
  }
  await sendTab(tab.id, { type: "SEPHIA_NATIVE_STATE", state: "connected" });
  return { ok: true };
}

function validSender(sender) {
  if (!pairedTab || sender.tab?.id !== pairedTab.tabId || !sender.url) return false;
  try { return new URL(sender.url).origin === pairedTab.origin; } catch { return false; }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "SEPHIA_PAIR_ACTIVE_TAB") {
    pairActiveTab(message).then(sendResponse).catch((error) => {
      sendResponse({ ok: false, error: String(error?.message || error) });
    });
    return true;
  }

  if (message?.type === "SEPHIA_SPEAK") {
    if (!validSender(sender) ||
        !hostReady ||
        !nativePort ||
        !["synthesize-approved-announcement", "synthesize-approved-wake-acknowledgement"].includes(message.action) ||
        typeof message.requestId !== "string" ||
        !/^sephia-[0-9]{1,12}$/.test(message.requestId)) {
      sendResponse({ ok: false, error: "Permintaan speech tidak valid atau mesin lokal belum siap." });
      return false;
    }
    if (pending) {
      sendResponse({ ok: false, error: "Speech sedang berlangsung." });
      return false;
    }
    if (Date.now() - lastRequestAt < 2000) {
      sendResponse({ ok: false, error: "Permintaan speech terlalu cepat." });
      return false;
    }
    lastRequestAt = Date.now();
    pending = { tabId: pairedTab.tabId, requestId: message.requestId, cancelled: false };
    try {
      nativePort.postMessage({ version: 1, action: message.action });
      sendResponse({ ok: true, accepted: true });
    } catch {
      pending = null;
      sendResponse({ ok: false, error: "Gagal mengirim ke native host." });
    }
    return false;
  }

  if (message?.type === "SEPHIA_CANCEL") {
    if (validSender(sender) && pending && pending.requestId === message.requestId) {
      // The host currently runs one synchronous inference call. Suppress its
      // eventual response while keeping the loaded model resident for reuse.
      pending.cancelled = true;
    }
    sendResponse({ ok: true });
    return false;
  }

  return false;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (pairedTab?.tabId !== tabId) return;
  pairedTab = null;
  pending = null;
  disconnectNative();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (pairedTab?.tabId !== tabId || changeInfo.status !== "loading") return;
  pairedTab = null;
  pending = null;
  disconnectNative();
});
