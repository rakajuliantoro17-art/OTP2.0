/* =====================================================
   SMANSASOO CBT LOCK 2.0
   MOODLE CBT CLIENT INTEGRATION
   LAYER: CLIENT MONITORING AGENT
===================================================== */

const CBTLOCK = {
    version:           "3.1",
    mode:              "active",
    studentId:         null,
    sessionId:         null,
    violation:         0,
    heartbeatInterval: null,
    _lastViolation:    0,    // untuk debounce
    _debounceMs:       800   // jeda minimum antar violation
};

/* =========================
   CONFIG ENDPOINT
   URL absolut ke Vercel —
   GANTI dengan domain Vercel asli
========================= */
const ENDPOINT = {
    violation: "https://otp-2-0.vercel.app/api/violation",
    heartbeat: "https://otp-2-0.vercel.app/api/heartbeat"
};

/* =========================
   INIT SESSION
   Dipanggil dari injeksi Moodle:
   initCBTLock(USER_ID, SESSION_ID)
========================= */
function initCBTLock(studentId, sessionId) {
    CBTLOCK.studentId = studentId;
    CBTLOCK.sessionId = sessionId;

    startMonitoring();
    startHeartbeat();

    console.log("[CBTLOCK] INIT", studentId, sessionId);
}

/* =========================
   DEBOUNCED VIOLATION REGISTER
   Mencegah satu aksi (ALT+TAB)
   menghasilkan violation ganda
========================= */
function registerViolation(type) {
    const now = Date.now();

    // Skip jika terlalu cepat dari violation sebelumnya
    if (now - CBTLOCK._lastViolation < CBTLOCK._debounceMs) {
        console.warn("[CBTLOCK] Debounced:", type);
        return;
    }

    CBTLOCK._lastViolation = now;
    CBTLOCK.violation++;

    const payload = {
        studentId:      CBTLOCK.studentId,
        sessionId:      CBTLOCK.sessionId,
        type:           type,
        violationCount: CBTLOCK.violation,
        timestamp:      now
    };

    sendViolation(payload);
    console.warn("[CBTLOCK VIOLATION]", payload);
}

/* =========================
   VIOLATION DETECTORS
========================= */

// Tab switch — visibilitychange adalah yang utama
document.addEventListener("visibilitychange", () => {
    if (document.hidden) registerViolation("tab_switch");
});

// Blur hanya untuk deteksi ALT+TAB tanpa tab baru
// Debounce di registerViolation mencegah double-count
window.addEventListener("blur", () => {
    // Delay 200ms — jika visibilitychange juga trigger,
    // debounce akan block yang kedua
    setTimeout(() => {
        if (!document.hidden) registerViolation("window_blur");
    }, 200);
});

// Klik kanan
document.addEventListener("contextmenu", e => {
    e.preventDefault();
    registerViolation("right_click");
});

// Copy
document.addEventListener("copy", () => {
    registerViolation("copy_action");
});

// Keyboard shortcut berbahaya
document.addEventListener("keydown", e => {
    const blocked = (
        (e.ctrlKey && ["c","v","u","s","a","p"].includes(e.key.toLowerCase())) ||
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && e.key === "I")
    );
    if (blocked) {
        e.preventDefault();
        registerViolation("keyboard_shortcut");
    }
});

/* =========================
   SEND VIOLATION KE VERCEL API
========================= */
async function sendViolation(data) {
    try {
        await fetch(ENDPOINT.violation, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify(data)
        });
    } catch (err) {
        console.error("[CBTLOCK] Send violation fail:", err);
        // Simpan ke localStorage sebagai fallback
        const queue = JSON.parse(localStorage.getItem("cbt_queue") || "[]");
        queue.push(data);
        localStorage.setItem("cbt_queue", JSON.stringify(queue.slice(-20)));
    }
}

/* =========================
   FLUSH OFFLINE QUEUE
   Kirim ulang violation yang
   gagal saat koneksi kembali
========================= */
window.addEventListener("online", async () => {
    const queue = JSON.parse(localStorage.getItem("cbt_queue") || "[]");
    if (!queue.length) return;

    console.log("[CBTLOCK] Flushing offline queue:", queue.length);
    for (const item of queue) {
        await sendViolation(item);
    }
    localStorage.removeItem("cbt_queue");
});

/* =========================
   HEARTBEAT SYSTEM
========================= */
function startHeartbeat() {
    CBTLOCK.heartbeatInterval = setInterval(async () => {
        const payload = {
            studentId: CBTLOCK.studentId,
            sessionId: CBTLOCK.sessionId,
            status:    "active",
            violation: CBTLOCK.violation,
            timestamp: Date.now()
        };

        try {
            await fetch(ENDPOINT.heartbeat, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify(payload)
            });
        } catch (err) {
            console.warn("[CBTLOCK] Heartbeat fail:", err);
        }
    }, 5000);
}

/* =========================
   FULLSCREEN ENFORCER
========================= */
function enforceFullscreen() {
    const el = document.documentElement;
    if (el.requestFullscreen)       el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
}

/* =========================
   MONITORING START
========================= */
function startMonitoring() {
    enforceFullscreen();

    // Deteksi fullscreen exit sebagai violation
    document.addEventListener("fullscreenchange", () => {
        if (!document.fullscreenElement) {
            registerViolation("fullscreen_exit");
        }
    });
}

/* =========================
   EMERGENCY STOP
========================= */
function stopCBTLock() {
    clearInterval(CBTLOCK.heartbeatInterval);
    console.log("[CBTLOCK] STOPPED");
}

/* =========================
   EXPORT GLOBAL
========================= */
window.CBTLOCK       = CBTLOCK;
window.initCBTLock   = initCBTLock;
window.stopCBTLock   = stopCBTLock;
