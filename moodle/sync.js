/* =====================================================
   SMANSASOO CBT LOCK 2.0
   MOODLE REALTIME SYNC LAYER
   CONNECTOR: CBT CLIENT → FIREBASE → DASHBOARD
===================================================== */

const CBT_SYNC = {
    studentId: null,
    sessionId: null,
    lastSync:  null,
    interval:  null,
    connected: false
};

/* =========================
   ENDPOINT
   URL absolut ke Vercel —
   GANTI dengan domain Vercel asli
========================= */
const SYNC_ENDPOINT = {
    status:    "https://otp-2-0.vercel.app/api/status/update",
    heartbeat: "https://otp-2-0.vercel.app/api/heartbeat"
};

/* =========================
   INIT SYNC
   Dipanggil dari injeksi Moodle
========================= */
function initCBTSync(studentId, sessionId) {
    CBT_SYNC.studentId = studentId;
    CBT_SYNC.sessionId = sessionId;

    listenOTPState();
    startRealtimeSync();

    // Heartbeat ringan — terpisah dari cbtlock.js
    // cbtlock: violation heartbeat tiap 5 detik
    // sync.js:  status sync tiap 4 detik (lebih sering, lebih ringan)
    // Tidak ada duplikasi karena payload berbeda

    console.log("[CBT SYNC] INIT OK", studentId);
}

/* =========================
   STATUS RESOLVER
========================= */
function getLocalStatus() {
    const v = window.CBTLOCK?.violation || 0;
    if (v >= 30) return "locked";
    if (v >= 26) return "critical";
    if (v >= 11) return "warning";
    return "safe";
}

function getLocalViolation() {
    return window.CBTLOCK?.violation || 0;
}

/* =========================
   PROGRESS TRACKER
   Baca dari Moodle DOM
========================= */
function getProgress() {
    // Coba baca dari Moodle quiz navigator
    const answered = window.MOODLE_PROGRESS
        || document.querySelectorAll(".qnbutton.answersaved, .qnbutton.complete").length
        || 0;

    const total = window.MOODLE_TOTAL
        || document.querySelectorAll(".qnbutton").length
        || 40;

    return answered + "/" + total;
}

/* =========================
   BUILD SYNC PAYLOAD
========================= */
function buildSyncPayload() {
    return {
        studentId: CBT_SYNC.studentId,
        sessionId: CBT_SYNC.sessionId,
        status:    getLocalStatus(),
        violation: getLocalViolation(),
        progress:  getProgress(),
        timestamp: Date.now()
    };
}

/* =========================
   SEND SYNC
   Primary: Firebase window.db
   Fallback: Vercel API
========================= */
async function sendSync(data) {
    try {
        // PRIMARY: Firebase langsung
        if (window.db && typeof window.db.ref === "function") {
            await window.db.ref("students/" + data.studentId).update({
                status:    data.status,
                violation: data.violation,
                progress:  data.progress,
                lastSync:  data.timestamp,
                sessionId: data.sessionId
            });
            CBT_SYNC.connected = true;
            CBT_SYNC.lastSync  = Date.now();
            return;
        }

        // FALLBACK: Vercel API
        const res = await fetch(SYNC_ENDPOINT.status, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify(data)
        });

        CBT_SYNC.connected = res.ok;
        CBT_SYNC.lastSync  = Date.now();

    } catch (err) {
        CBT_SYNC.connected = false;
        console.warn("[CBT SYNC] Send fail:", err);
    }
}

/* =========================
   REALTIME SYNC LOOP
========================= */
function startRealtimeSync() {
    CBT_SYNC.interval = setInterval(() => {
        sendSync(buildSyncPayload());
    }, 4000);
}

/* =========================
   OTP STATE LISTENER
   Baca System OTP & Master OTP
   dari Firebase — READ ONLY
========================= */
function listenOTPState() {
    if (!window.db || typeof window.db.ref !== "function") return;

    // System OTP — TOTP, tidak perlu listen
    // Master OTP — dikirim panitia, perlu listen
    window.db.ref("system/masterOtp").on("value", snap => {
        const data = snap.val();
        if (data && data.status === "active" && data.code) {
            window.MASTER_OTP = data.code;
            console.log("[CBT SYNC] Master OTP update:", data.code);
        }
    });
}

/* =========================
   FORCE RESYNC
========================= */
function forceResync() {
    sendSync(buildSyncPayload());
    console.log("[CBT SYNC] Force resync triggered");
}

/* =========================
   STOP SYNC
========================= */
function stopCBTSync() {
    clearInterval(CBT_SYNC.interval);
    console.log("[CBT SYNC] STOPPED");
}

/* =========================
   AUTO INIT HOOK
   Baca CBT_STUDENT_ID yang
   diinjeksikan Moodle
========================= */
window.addEventListener("load", () => {
    if (window.CBT_STUDENT_ID) {
        initCBTSync(
            window.CBT_STUDENT_ID,
            window.CBT_SESSION_ID || "default"
        );
    }
});

/* =========================
   EXPORT GLOBAL
========================= */
window.CBT_SYNC    = CBT_SYNC;
window.initCBTSync = initCBTSync;
window.stopCBTSync = stopCBTSync;
window.forceResync = forceResync;
