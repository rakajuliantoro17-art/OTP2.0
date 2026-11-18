(() => {
  if (globalThis.__SEPHIA_NATIVE_BRIDGE_INSTALLED__) return;
  globalThis.__SEPHIA_NATIVE_BRIDGE_INSTALLED__ = true;

  const REQUEST_EVENT = "sephia:native-tts-request";
  const CANCEL_EVENT = "sephia:native-tts-cancel";
  const STATE_EVENT = "sephia:native-tts-state";
  const RESULT_EVENT = "sephia:native-tts-result";
  const MAX_AUDIO_BYTES = 700 * 1024;

  let activeRequestId = null;
  let audioContext = null;
  let activeSource = null;

  const emit = (name, detail) => {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  };

  function stopAudio() {
    if (activeSource) {
      try { activeSource.stop(); } catch {}
      try { activeSource.disconnect(); } catch {}
      activeSource = null;
    }
  }

  function playPcm(response) {
    if (response?.version !== 1 || response.ok !== true ||
        response.format !== "pcm_s16le" || response.sampleRate !== 24000 ||
        response.channels !== 1 || typeof response.audioBase64 !== "string" ||
        response.audioBase64.length > 955736) {
      throw new Error("Respons audio native tidak valid.");
    }
    const binary = atob(response.audioBase64);
    if (!binary.length || binary.length > MAX_AUDIO_BYTES || binary.length % 2 !== 0) {
      throw new Error("Ukuran buffer audio tidak valid.");
    }
    const pcm = new Int16Array(binary.length / 2);
    for (let i = 0; i < pcm.length; i += 1) {
      pcm[i] = (binary.charCodeAt(i * 2) & 255) | ((binary.charCodeAt(i * 2 + 1) & 255) << 8);
    }
    if (!audioContext) {
      const AudioContextImpl = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextImpl) throw new Error("Web Audio API tidak tersedia.");
      audioContext = new AudioContextImpl();
    }
    const buffer = audioContext.createBuffer(1, pcm.length, 24000);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < pcm.length; i += 1) channel[i] = pcm[i] / 32768;
    return audioContext.resume().then(() => new Promise((resolve, reject) => {
      const source = audioContext.createBufferSource();
      activeSource = source;
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.onended = () => {
        if (activeSource === source) activeSource = null;
        try { source.disconnect(); } catch {}
        resolve();
      };
      try { source.start(0); } catch (error) { reject(error); }
    }));
  }

  window.addEventListener(REQUEST_EVENT, (event) => {
    const detail = event.detail;
    if (detail?.version !== 1 ||
        detail.action !== "synthesize-approved-announcement" ||
        typeof detail.requestId !== "string" ||
        !/^sephia-[0-9]{1,12}$/.test(detail.requestId) ||
        activeRequestId) return;

    activeRequestId = detail.requestId;
    chrome.runtime.sendMessage({
      type: "SEPHIA_SPEAK",
      action: "synthesize-approved-announcement",
      requestId: detail.requestId,
    }).then((ack) => {
      if (!ack?.ok && activeRequestId === detail.requestId) {
        activeRequestId = null;
        emit(RESULT_EVENT, { requestId: detail.requestId, ok: false, code: "ENGINE_UNAVAILABLE" });
      }
    }).catch(() => {
      if (activeRequestId === detail.requestId) {
        activeRequestId = null;
        emit(RESULT_EVENT, { requestId: detail.requestId, ok: false, code: "ENGINE_UNAVAILABLE" });
      }
    });
  });

  window.addEventListener(CANCEL_EVENT, (event) => {
    const requestId = event.detail?.requestId;
    if (!activeRequestId || requestId !== activeRequestId) return;
    stopAudio();
    void chrome.runtime.sendMessage({ type: "SEPHIA_CANCEL", requestId });
    activeRequestId = null;
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "SEPHIA_NATIVE_STATE") {
      if (message.state === "connected" || message.state === "disconnected") {
        if (message.state === "disconnected") stopAudio();
        emit(STATE_EVENT, { state: message.state });
      }
      return;
    }
    if (message?.type !== "SEPHIA_NATIVE_RESULT" ||
        message.requestId !== activeRequestId) return;

    const requestId = activeRequestId;
    const response = message.response;
    if (response?.ok !== true) {
      activeRequestId = null;
      emit(RESULT_EVENT, { requestId, ok: false, code: response?.code || "SYNTHESIS_FAILED" });
      return;
    }
    playPcm(response).then(() => {
      if (activeRequestId !== requestId) return;
      activeRequestId = null;
      emit(RESULT_EVENT, { requestId, ok: true });
    }).catch(() => {
      if (activeRequestId !== requestId) return;
      activeRequestId = null;
      emit(RESULT_EVENT, { requestId, ok: false, code: "SYNTHESIS_FAILED" });
    });
  });

  window.addEventListener("pagehide", () => {
    stopAudio();
    if (activeRequestId) {
      void chrome.runtime.sendMessage({ type: "SEPHIA_CANCEL", requestId: activeRequestId });
      activeRequestId = null;
    }
    emit(STATE_EVENT, { state: "disconnected" });
  }, { once: true });
})();
