/* =====================================================
   SMANSASOO CBT LOCK 2.0
   CORE ENGINE (RUNTIME BRAIN)
===================================================== */

/* =========================
   GLOBAL STATE
========================= */

const ENGINE = {

    state: {

        users: {},

        activeUsers: 0,

        warnings: 0,

        critical: 0,

        otpRequests: 0

    },

    running: false,

    lastSync: null

};

/* =========================
   INIT ENGINE
========================= */

function initEngine() {

    ENGINE.running = true;

    logEngine("ENGINE STARTED");

    startHeartbeat();

    startRealtimeSync();

}

/* =========================
   HEARTBEAT SYSTEM
========================= */

function startHeartbeat() {

    setInterval(() => {

        ENGINE.lastSync = Date.now();

        logEngine("HEARTBEAT OK");

        updateSystemStats();

    }, SMANSASOO.REALTIME.HEARTBEAT_INTERVAL);

}

/* =========================
   REALTIME SYNC LOOP
========================= */

function startRealtimeSync() {

    setInterval(() => {

        // nanti diganti Firebase listener
        mockRealtimeUpdate();

    }, SMANSASOO.REALTIME.SYNC_INTERVAL);

}

/* =========================
   MOCK DATA (TEMPORARY)
========================= */

function mockRealtimeUpdate() {

    // simulasi update user
    ENGINE.state.activeUsers = Math.floor(Math.random() * 1500);

    ENGINE.state.warnings = Math.floor(Math.random() * 50);

    ENGINE.state.critical = Math.floor(Math.random() * 20);

    ENGINE.state.otpRequests = Math.floor(Math.random() * 100);

    updateSystemStats();

}

/* =========================
   UPDATE UI STATS
========================= */

function updateSystemStats() {

    setText("statActive", ENGINE.state.activeUsers);

    setText("statWarning", ENGINE.state.warnings);

    setText("statCritical", ENGINE.state.critical);

    setText("statOtp", ENGINE.state.otpRequests);

}

/* =========================
   VIOLATION PROCESSOR
========================= */

function processViolation(userId, value) {

    const label = getViolationLabel(value);

    if (!ENGINE.state.users[userId]) {

        ENGINE.state.users[userId] = {
            violation: 0,
            status: "SAFE"
        };

    }

    ENGINE.state.users[userId].violation = value;

    ENGINE.state.users[userId].status = label;

    if (label === "WARNING") ENGINE.state.warnings++;

    if (label === "CRITICAL") ENGINE.state.critical++;

    if (label === "AUTO_SUBMIT") {

        triggerAutoSubmit(userId);

    }

    logEngine(
        `VIOLATION → ${userId} = ${value} (${label})`
    );

}

/* =========================
   OTP TRIGGER
========================= */

function triggerOTP(userId) {

    const otp = generateOTP();

    ENGINE.state.otpRequests++;

    logEngine(`OTP GENERATED FOR ${userId} → ${otp}`);

    return otp;

}

/* =========================
   AUTO SUBMIT ENGINE
========================= */

function triggerAutoSubmit(userId) {

    logEngine(`AUTO SUBMIT TRIGGERED → ${userId}`);

    // nanti connect ke Moodle API

}

/* =========================
   SYSTEM LOGGER
========================= */

function logEngine(text) {

    console.log(
        "[SMANSASOO ENGINE] " + text
    );

}

/* =========================
   SAFE DOM SETTER
========================= */

function setText(id, value) {

    const el = document.getElementById(id);

    if (!el) return;

    el.innerText = value;

}

/* =========================
   EVENT API (FUTURE FIREBASE)
========================= */

function emitEvent(type, payload) {

    logEngine(`EVENT → ${type}`);

    // placeholder Firebase push

}

/* =========================
   GLOBAL EXPORT
========================= */

window.ENGINE = ENGINE;

window.initEngine = initEngine;

window.processViolation = processViolation;

window.triggerOTP = triggerOTP;
