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
    nama:              null,
    kelas:             null,
    violation:         0,
    heartbeatInterval: null,
    _lastViolation:    0,
    _debounceMs:       800
};

/* =========================
   CONFIG ENDPOINT
   Mengarah ke Bridge Server
   di PC Panitia (LAN lokal)
========================= */
const ENDPOINT = {
    violation: "http://10.9.9.52:3000/api/violation",
    heartbeat: "http://10.9.9.52:3000/api/heartbeat"
};

/* =========================
   INIT SESSION
   Dipanggil dari injeksi Moodle:
   initCBTLock(USER_ID, SESSION_ID, NAMA, KELAS)
========================= */
function initCBTLock(studentId, sessionId, nama, kelas) {
    CBTLOCK.studentId = studentId;
    CBTLOCK.sessionId = sessionId;
    CBTLOCK.nama      = nama  || "-";
    CBTLOCK.kelas     = kelas || "-";

    startMonitoring();
    startHeartbeat();

    console.log("[CBTLOCK] INIT", studentId, sessionId);
}

/* =========================
   DEBOUNCED VIOLATION REGISTER
========================= */
function registerViolation(type) {
    const now = Date.now();

    if (now - CBTLOCK._lastViolation < CBTLOCK._debounceMs) {
        console.warn("[CBTLOCK] Debounced:", type);
        return;
    }

    CBTLOCK._lastViolation = now;
    CBTLOCK.violation++;

    // Field disesuaikan dengan api/violation.js
    const payload = {
        uid:           CBTLOCK.studentId,
        nama:          CBTLOCK.nama,
        kelas:         CBTLOCK.kelas,
        violationType: type,
        timestamp:     now
    };

    sendViolation(payload);
    console.warn("[CBTLOCK VIOLATION]", payload);
    if (typeof trackEvent === "function") trackEvent(type, { violationCount: CBTLOCK.violation });
}

/* =========================
   VIOLATION DETECTORS
========================= */
document.addEventListener("visibilitychange", () => {
    if (document.hidden) registerViolation("tab_switch");
});

window.addEventListener("blur", () => {
    setTimeout(() => {
        if (!document.hidden) registerViolation("window_blur");
    }, 200);
});

document.addEventListener("contextmenu", e => {
    e.preventDefault();
    registerViolation("right_click");
});

document.addEventListener("copy", () => {
    registerViolation("copy_action");
});

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
   SEND VIOLATION KE BRIDGE SERVER
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
   Field disesuaikan dengan api/heartbeat.js
========================= */
function startHeartbeat() {
    CBTLOCK.heartbeatInterval = setInterval(async () => {
        const payload = {
            studentId: CBTLOCK.studentId,
            sessionId: CBTLOCK.sessionId,
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
    if (el.requestFullscreen)            el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
}

/* =========================
   MONITORING START
========================= */
function startMonitoring() {
    enforceFullscreen();

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
window.CBTLOCK     = CBTLOCK;
window.initCBTLock = initCBTLock;
window.stopCBTLock = stopCBTLock;
