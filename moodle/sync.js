/* =====================================================
   SMANSASOO CBT LOCK 2.0
   MOODLE REALTIME SYNC LAYER
   CONNECTOR: CBT CLIENT → FIREBASE → DASHBOARD
===================================================== */

const CBT_SYNC = {
    studentId: null,
    sessionId: null,
    lastSync: null,
    interval: null,
    connected: false
};

/* =========================
   FIREBASE ENDPOINT (OPTIONAL FALLBACK)
========================= */

const SYNC_ENDPOINT = {
    status: "/api/status/update",
    heartbeat: "/api/heartbeat",
    otp: "/api/otp/state"
};

/* =========================
   INIT SYNC
========================= */

function initCBTSync(studentId, sessionId) {

    CBT_SYNC.studentId = studentId;
    CBT_SYNC.sessionId = sessionId;

    startRealtimeSync();
    startLightHeartbeat();

    console.log("[CBT SYNC] INIT OK", studentId);
}

/* =========================
   REALTIME SYNC LOOP
========================= */

function startRealtimeSync() {

    CBT_SYNC.interval = setInterval(() => {

        const payload = buildSyncPayload();

        sendSync(payload);

    }, 4000); // 4 detik sync ringan
}

/* =========================
   BUILD SYNC PAYLOAD
========================= */

function buildSyncPayload() {

    return {
        studentId: CBT_SYNC.studentId,
        sessionId: CBT_SYNC.sessionId,

        status: getLocalStatus(),
        violation: getLocalViolation(),
        progress: getProgress(),

        timestamp: Date.now()
    };
}

/* =========================
   LOCAL STATUS FETCHER
========================= */

function getLocalStatus() {

    // fallback logic jika engine belum inject Firebase
    if (window.CBTLOCK && window.CBTLOCK.violation !== undefined) {

        const v = window.CBTLOCK.violation;

        if (v <= 10) return "safe";
        if (v <= 25) return "warning";
        if (v <= 29) return "critical";
        return "locked";
    }

    return "safe";
}

/* =========================
   LOCAL VIOLATION FETCHER
========================= */

function getLocalViolation() {
    return window.CBTLOCK?.violation || 0;
}

/* =========================
   PROGRESS TRACKER
========================= */

function getProgress() {

    // placeholder untuk Moodle quiz integration
    // nanti bisa dihubungkan ke quiz attempt API

    const total = 40;
    const answered = window.MOODLE_PROGRESS || 0;

    return `${answered}/${total}`;
}

/* =========================
   SEND SYNC DATA
========================= */

async function sendSync(data) {

    try {

        // PRIMARY: Firebase direct (kalau tersedia)
        if (window.FirebaseAPI) {

            await window.FirebaseAPI.updateData(
                `students/${data.studentId}`,
                data
            );

            CBT_SYNC.connected = true;
            CBT_SYNC.lastSync = Date.now();

            return;
        }

        // FALLBACK: Vercel API
        await fetch(SYNC_ENDPOINT.status, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        CBT_SYNC.connected = true;
        CBT_SYNC.lastSync = Date.now();

    } catch (err) {

        CBT_SYNC.connected = false;

        console.warn("[CBT SYNC FAIL]", err);
    }
}

/* =========================
   LIGHT HEARTBEAT
========================= */

function startLightHeartbeat() {

    setInterval(() => {

        const heartbeat = {
            studentId: CBT_SYNC.studentId,
            sessionId: CBT_SYNC.sessionId,
            status: getLocalStatus(),
            timestamp: Date.now()
        };

        sendHeartbeat(heartbeat);

    }, 8000); // lebih ringan dari violation engine
}

/* =========================
   HEARTBEAT SENDER
========================= */

async function sendHeartbeat(data) {

    try {

        if (window.FirebaseAPI) {
            await window.FirebaseAPI.updateData(
                `students/${data.studentId}/heartbeat`,
                data
            );
            return;
        }

        await fetch(SYNC_ENDPOINT.heartbeat, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

    } catch (err) {
        console.warn("[CBT SYNC HEARTBEAT FAIL]", err);
    }
}

/* =========================
   OTP STATE SYNC (READ ONLY)
========================= */

function listenOTPState() {

    if (!window.FirebaseAPI) return;

    window.FirebaseAPI.listen("otp/global", (data) => {

        console.log("[OTP GLOBAL UPDATE]", data);

        window.CURRENT_OTP = data?.value;

    });

    window.FirebaseAPI.listen("otp/master", (data) => {

        console.log("[MASTER OTP UPDATE]", data);

        window.MASTER_OTP = data?.value;

    });
}

/* =========================
   FORCE RESYNC
========================= */

function forceResync() {

    console.log("[CBT SYNC] FORCE RESYNC TRIGGERED");

    const payload = buildSyncPayload();

    sendSync(payload);
}

/* =========================
   STOP SYNC
========================= */

function stopCBTSync() {

    clearInterval(CBT_SYNC.interval);

    console.log("[CBT SYNC] STOPPED");
}

/* =========================
   AUTO INIT HOOK (OPTIONAL)
========================= */

window.addEventListener("load", () => {

    // auto hook jika CBT sudah inject ID
    if (window.CBT_STUDENT_ID) {

        initCBTSync(
            window.CBT_STUDENT_ID,
            window.CBT_SESSION_ID || "default"
        );
    }

    listenOTPState();
});

/* =========================
   EXPORT GLOBAL
========================= */

window.CBT_SYNC = CBT_SYNC;

window.initCBTSync = initCBTSync;
window.stopCBTSync = stopCBTSync;
window.forceResync = forceResync;
