import { NATIVE_HOST_NAME, validateNativeResponse } from "./protocol.js";

let pairedTab = null;
let nativePort = null;
let pending = null;
let lastRequestAt = 0;
let intentionalDisconnect = false;

function sendTab(tabId, message) {
  return chrome.tabs.sendMessage(tabId, message).catch(() => undefined);
}

function disconnectNative() {
  if (!nativePort) return;
  intentionalDisconnect = true;
  try { nativePort.disconnect(); } catch {}
  nativePort = null;
  intentionalDisconnect = false;
}

function openNativePort() {
  if (nativePort) return true;
  try {
    const port = chrome.runtime.connectNative(NATIVE_HOST_NAME);
    nativePort = port;
    port.onMessage.addListener((response) => {
      const request = pending;
      if (!request) return;
      pending = null;
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
      const wasIntentional = intentionalDisconnect;
      nativePort = null;
      if (pending) {
        const request = pending;
        pending = null;
        void sendTab(request.tabId, {
          type: "SEPHIA_NATIVE_RESULT",
          requestId: request.requestId,
          response: { version: 1, ok: false, code: "ENGINE_UNAVAILABLE" },
        });
      }
      if (!wasIntentional && pairedTab) {
        void sendTab(pairedTab.tabId, {
          type: "SEPHIA_NATIVE_STATE",
          state: "disconnected",
        });
      }
    });
    return true;
  } catch {
    nativePort = null;
    return false;
  }
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
    disconnectNative();
  }
  pairedTab = { tabId: tab.id, origin: url.origin };
  if (!openNativePort()) {
    pairedTab = null;
    return { ok: false, error: "Native Messaging host SEPHIA belum terpasang." };
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
        message.action !== "synthesize-approved-announcement" ||
        typeof message.requestId !== "string" ||
        !/^sephia-[0-9]{1,12}$/.test(message.requestId)) {
      sendResponse({ ok: false, error: "Permintaan speech tidak valid." });
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
    if (!openNativePort()) {
      sendResponse({ ok: false, error: "Native host tidak tersedia." });
      return false;
    }
    lastRequestAt = Date.now();
    pending = { tabId: pairedTab.tabId, requestId: message.requestId };
    try {
      nativePort.postMessage({ version: 1, action: "synthesize-approved-announcement" });
      sendResponse({ ok: true, accepted: true });
    } catch {
      pending = null;
      sendResponse({ ok: false, error: "Gagal mengirim ke native host." });
    }
    return false;
  }

  if (message?.type === "SEPHIA_CANCEL") {
    if (validSender(sender) && pending && pending.requestId === message.requestId) {
      pending = null;
      disconnectNative();
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
