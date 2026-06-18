/* =====================================================
   SMANSASOO CBT LOCK 2.0
   MOODLE CBT CLIENT INTEGRATION
   LAYER: CLIENT MONITORING AGENT
===================================================== */

const CBTLOCK = {
    version: "3.1",
    mode: "active",
    studentId: null,
    sessionId: null,
    violation: 0,
    heartbeatInterval: null
};

/* =========================
   CONFIG ENDPOINT
   (Vercel API / Firebase Gateway)
========================= */

const ENDPOINT = {
    violation: "/api/violation",
    heartbeat: "/api/heartbeat"
};

/* =========================
   INIT SESSION
========================= */

function initCBTLock(studentId, sessionId) {
    CBTLOCK.studentId = studentId;
    CBTLOCK.sessionId = sessionId;

    startMonitoring();
    startHeartbeat();

    console.log("[CBTLOCK] INIT SUCCESS", studentId);
}

/* =========================
   VIOLATION DETECTION
========================= */

/* TAB SWITCH DETECTION */
document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        registerViolation("tab_switch");
    }
});

/* WINDOW BLUR (ALT TAB) */
window.addEventListener("blur", () => {
    registerViolation("window_blur");
});

/* RIGHT CLICK BLOCK + DETECT */
document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    registerViolation("right_click");
});

/* COPY PASTE DETECTION */
document.addEventListener("copy", () => {
    registerViolation("copy_action");
});

/* =========================
   VIOLATION ENGINE
========================= */

function registerViolation(type) {

    CBTLOCK.violation++;

    const payload = {
        studentId: CBTLOCK.studentId,
        sessionId: CBTLOCK.sessionId,
        type: type,
        violationCount: CBTLOCK.violation,
        timestamp: Date.now()
    };

    sendViolation(payload);

    console.warn("[CBTLOCK VIOLATION]", payload);
}

/* =========================
   SEND TO BACKEND
========================= */

async function sendViolation(data) {
    try {
        await fetch(ENDPOINT.violation, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });
    } catch (err) {
        console.error("[CBTLOCK] SEND FAIL", err);
    }
}

/* =========================
   HEARTBEAT SYSTEM
========================= */

function startHeartbeat() {

    CBTLOCK.heartbeatInterval = setInterval(() => {

        const payload = {
            studentId: CBTLOCK.studentId,
            sessionId: CBTLOCK.sessionId,
            status: "active",
            violation: CBTLOCK.violation,
            timestamp: Date.now()
        };

        sendHeartbeat(payload);

    }, 5000); // 5 detik heartbeat
}

/* =========================
   HEARTBEAT SENDER
========================= */

async function sendHeartbeat(data) {
    try {
        await fetch(ENDPOINT.heartbeat, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });
    } catch (err) {
        console.warn("[CBTLOCK HEARTBEAT FAIL]", err);
    }
}

/* =========================
   FULLSCREEN ENFORCER
========================= */

function enforceFullscreen() {
    const el = document.documentElement;

    if (el.requestFullscreen) {
        el.requestFullscreen();
    }
}

/* =========================
   AUTO START MONITORING
========================= */

function startMonitoring() {

    enforceFullscreen();

    setInterval(() => {

        // tambahan monitoring ringan (future AI layer)
        if (document.hidden) {
            registerViolation("hidden_state");
        }

    }, 3000);
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

window.CBTLOCK = CBTLOCK;
window.initCBTLock = initCBTLock;
window.stopCBTLock = stopCBTLock;
