/* =====================================================
   SMANSASOO CBT LOCK 2.0
   DASHBOARD PENGAWAS - OTP UNLOCK ENGINE (TOTP VERSION)
===================================================== */

/* =========================
   STATE GLOBAL & KONSTANTA
========================= */
const SECRET = "SOOKO_HEBAT_2026";
const OTP_INTERVAL = 60; // Siklus 60 Detik

let CURRENT_OTP = null;
let OTP_HISTORY = [];

/* =========================
   INIT (ENGINE START)
========================= */
document.addEventListener("DOMContentLoaded", () => {
    // Jalankan siklus pertama
    syncOTP();
    
    // Cek perubahan waktu setiap detik, bukan me-refresh paksa
    setInterval(syncOTP, 1000);
});

/* =========================
   CORE: HASHING ENGINE
========================= */
function hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = (h << 5) - h + str.charCodeAt(i);
        h |= 0;
    }
    return Math.abs(h);
}

/* =========================
   OTP GENERATOR (TIME-BASED)
========================= */
function generateTOTP() {
    let t = Math.floor(Date.now() / 1000 / OTP_INTERVAL);
    let h = hash(t + SECRET);
    let rawOTP = (h % 1000000).toString().padStart(6, "0");
    
    // Format "123 456" untuk keterbacaan
    return rawOTP.substring(0, 3) + " " + rawOTP.substring(3, 6);
}

/* =========================
   SYNC LINTAS WAKTU
========================= */
function syncOTP() {
    const newOTP = generateTOTP();
    
    // Hanya render dan log jika kode BENAR-BENAR berubah (siklus baru)
    if (CURRENT_OTP !== newOTP) {
        CURRENT_OTP = newOTP;
        renderOTP(CURRENT_OTP);
        logEvent("CYCLE SYNC → OTP: " + CURRENT_OTP);
    }
}

/* =========================
   RENDER OTP KE UI
========================= */
function renderOTP(otp) {
    const el = document.getElementById("otpCode");
    if (!el) return;

    el.innerText = otp;

    // Animasi detak halus saat kode baru lahir
    el.style.transition = "transform 0.15s cubic-bezier(0.25, 0.8, 0.25, 1)";
    el.style.transform = "scale(1.08)";
    
    setTimeout(() => {
        el.style.transform = "scale(1)";
    }, 150);
}

/* =========================
   COPY OTP (UNTUK PENGAWAS)
========================= */
function copyOTP() {
    if (!CURRENT_OTP) return;

    // Menghapus spasi sebelum di-copy ke clipboard jika formatnya "123 456"
    const cleanOTP = CURRENT_OTP.replace(/\s/g, '');
    
    navigator.clipboard.writeText(cleanOTP).then(() => {
        logEvent("OTP COPIED → " + cleanOTP);
        showToast("Kode disalin: " + cleanOTP);
    }).catch(err => {
        showToast("Gagal menyalin kode!");
        console.error("Clipboard Error:", err);
    });
}

/* =========================
   MANUAL REGENERATE / SYNC
========================= */
function forceGenerateOTP() {
    syncOTP();
    logEvent("MANUAL SYNC TRIGGERED");
    showToast("Sinkronisasi waktu berhasil");
}

/* =========================
   LOG SYSTEM
========================= */
function logEvent(text) {
    OTP_HISTORY.unshift({
        time: new Date().toLocaleTimeString('id-ID'),
        message: text
    });

    // Batasi history maksimal 10 log terakhir agar tidak memberatkan DOM
    OTP_HISTORY = OTP_HISTORY.slice(0, 10);
    renderLog();
}

/* =========================
   RENDER LOG
========================= */
function renderLog() {
    const container = document.getElementById("logList");
    if (!container) return;

    container.innerHTML = "";

    OTP_HISTORY.forEach((item, index) => {
        const div = document.createElement("div");
        // Efek transisi masuk untuk log baru
        div.style.animation = "slideDown 0.3s ease-out";
        div.style.padding = "6px 0";
        div.style.borderBottom = index === OTP_HISTORY.length - 1 ? "none" : "1px solid rgba(0,0,0,0.05)";
        
        div.innerHTML = `<span style="opacity:0.6; font-size:10px; margin-right:8px;">[${item.time}]</span> <b>${item.message}</b>`;
        container.appendChild(div);
    });
}

/* =========================
   TOAST NOTIFICATION (iOS Glass Style)
========================= */
function showToast(message) {
    let toast = document.getElementById("toast");

    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast";
        
        // Glassmorphism styling
        toast.style.position = "fixed";
        toast.style.bottom = "30px";
        toast.style.left = "50%";
        toast.style.transform = "translateX(-50%) translateY(20px)";
        toast.style.padding = "12px 24px";
        toast.style.borderRadius = "100px";
        toast.style.background = "rgba(0, 0, 0, 0.75)";
        toast.style.backdropFilter = "blur(16px)";
        toast.style.webkitBackdropFilter = "blur(16px)";
        toast.style.boxShadow = "0 8px 24px rgba(0,0,0,0.2)";
        toast.style.color = "#ffffff";
        toast.style.fontSize = "13px";
        toast.style.fontWeight = "600";
        toast.style.letterSpacing = "0.5px";
        toast.style.zIndex = "9999";
        toast.style.opacity = "0";
        toast.style.pointerEvents = "none";
        toast.style.transition = "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)";

        document.body.appendChild(toast);
    }

    toast.innerText = message;
    
    // Animate In
    toast.style.opacity = "1";
    toast.style.transform = "translateX(-50%) translateY(0)";

    clearTimeout(toast.timer);
    
    // Animate Out
    toast.timer = setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(-50%) translateY(20px)";
    }, 3000);
}

/* =========================
   RESET OTP SYSTEM
========================= */
function resetOTP() {
    CURRENT_OTP = null;
    renderOTP("--- ---");
    logEvent("SISTEM DIBEKUKAN (FROZEN)");
    showToast("Sistem OTP Dihentikan Sementara");
}

/* =========================
   EXPORT GLOBAL (FIREBASE READY)
========================= */
window.CBT_UNLOCK = {
    getOTP: () => CURRENT_OTP,
    forceSync: forceGenerateOTP,
    resetOTP: resetOTP,
    copyOTP: copyOTP
};
