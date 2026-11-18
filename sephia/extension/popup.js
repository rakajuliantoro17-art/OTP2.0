const button = document.getElementById("connect");
const status = document.getElementById("status");

button.addEventListener("click", async () => {
  button.disabled = true;
  status.textContent = "Memeriksa tab aktif…";
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url || !tab.title) throw new Error("Tab aktif tidak tersedia.");
    const url = new URL(tab.url);
    if (url.protocol !== "https:" ||
        !url.pathname.toLowerCase().includes("/panitia") ||
        !tab.title.includes("SMANSASOO CBT LOCK 2.0") ||
        !tab.title.includes("Panitia")) {
      throw new Error("Buka halaman Panitia OTP 2.0 melalui HTTPS terlebih dahulu.");
    }

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content-script.js"],
    });
    const result = await chrome.runtime.sendMessage({
      type: "SEPHIA_PAIR_ACTIVE_TAB",
      tabId: tab.id,
      origin: url.origin,
    });
    if (!result?.ok) throw new Error(result?.error || "Native host belum tersedia.");
    status.textContent = "Tab dipasangkan. SEPHIA tetap OFF sampai diaktifkan dari dashboard.";
  } catch (error) {
    status.textContent = String(error?.message || error);
  } finally {
    button.disabled = false;
  }
});
