/* =====================================================
   SMANSASOO CBT LOCK 2.0
   DASHBOARD PENGAWAS - OTP UNLOCK ENGINE
===================================================== */

/* =========================
   STATE GLOBAL
========================= */

let CURRENT_OTP = null;

let OTP_HISTORY = [];

/* =========================
   INIT
========================= */

document.addEventListener("DOMContentLoaded", () => {

    generateOTP(); // auto pertama kali

    setInterval(generateOTP, 10000); 
    // refresh OTP tiap 10 detik (bisa diubah realtime Firebase nanti)

});

/* =========================
   OTP GENERATOR
========================= */

function generateOTP() {

    CURRENT_OTP = Math.floor(
        100000 + Math.random() * 900000
    );

    renderOTP(CURRENT_OTP);

    logEvent("OTP GENERATED → " + CURRENT_OTP);

}

/* =========================
   RENDER OTP KE UI
========================= */

function renderOTP(otp) {

    const el = document.getElementById("otpCode");

    if (!el) return;

    el.innerText = otp;

    // animasi kecil biar terasa live
    el.style.transform = "scale(1.1)";

    setTimeout(() => {
        el.style.transform = "scale(1)";
    }, 150);

}

/* =========================
   COPY OTP (UNTUK PENGAWAS)
========================= */

function copyOTP() {

    if (!CURRENT_OTP) return;

    navigator.clipboard.writeText(CURRENT_OTP);

    logEvent("OTP COPIED → " + CURRENT_OTP);

    showToast("OTP disalin: " + CURRENT_OTP);

}

/* =========================
   MANUAL REGENERATE
========================= */

function forceGenerateOTP() {

    generateOTP();

    logEvent("MANUAL OTP REFRESH");

}

/* =========================
   LOG SYSTEM
========================= */

function logEvent(text) {

    OTP_HISTORY.unshift({
        time: new Date().toLocaleTimeString(),
        message: text
    });

    OTP_HISTORY = OTP_HISTORY.slice(0, 10);

    renderLog();

}

/* =========================
   RENDER LOG
========================= */

function renderLog() {

    const container =
        document.getElementById("logList");

    if (!container) return;

    container.innerHTML = "";

    OTP_HISTORY.forEach(item => {

        const div = document.createElement("div");

        div.innerHTML =
            `<small>[${item.time}]</small> ${item.message}`;

        container.appendChild(div);

    });

}

/* =========================
   TOAST NOTIFICATION
   (simple, fallback tanpa app.js)
========================= */

function showToast(message) {

    let toast =
        document.getElementById("toast");

    if (!toast) {

        toast =
            document.createElement("div");

        toast.id = "toast";

        toast.style.position = "fixed";
        toast.style.bottom = "20px";
        toast.style.left = "50%";
        toast.style.transform = "translateX(-50%)";
        toast.style.padding = "10px 16px";
        toast.style.borderRadius = "12px";
        toast.style.background = "rgba(255,255,255,0.7)";
        toast.style.backdropFilter = "blur(15px)";
        toast.style.boxShadow = "0 10px 25px rgba(0,0,0,0.12)";
        toast.style.fontSize = "13px";
        toast.style.zIndex = "9999";

        document.body.appendChild(toast);

    }

    toast.innerText = message;

    toast.style.opacity = "1";

    clearTimeout(toast.timer);

    toast.timer = setTimeout(() => {

        toast.style.opacity = "0";

    }, 2500);

}

/* =========================
   RESET OTP SYSTEM
========================= */

function resetOTP() {

    CURRENT_OTP = null;

    renderOTP("------");

    logEvent("OTP RESET");

}

/* =========================
   EXPORT GLOBAL (FIREBASE READY)
========================= */

window.CBT_UNLOCK = {

    getOTP: () => CURRENT_OTP,

    generateOTP,

    resetOTP,

    copyOTP

};
