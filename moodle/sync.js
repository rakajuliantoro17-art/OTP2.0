/* =====================================================
   SMANSASOO CBT LOCK 2.0
   MOODLE REALTIME SYNC LAYER
   CONNECTOR: CBT CLIENT → BRIDGE SERVER → FIREBASE
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
   Mengarah ke Bridge Server
   di PC Panitia (LAN lokal)
   Siswa offline — tidak bisa
   akses Firebase/Vercel langsung
========================= */
const SYNC_ENDPOINT = {
    status:    "http://10.9.9.52:3000/api/status/update",
    heartbeat: "http://10.9.9.52:3000/api/heartbeat"
};

/* =========================
   INIT SYNC
   Dipanggil dari injeksi Moodle
========================= */
function initCBTSync(studentId, sessionId) {
    CBT_SYNC.studentId = studentId;
    CBT_SYNC.sessionId = sessionId;

    startRealtimeSync();

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
   Kirim ke Bridge Server (LAN)
   Bridge yang forward ke Firebase
========================= */
async function sendSync(data) {
    try {
        const res = await fetch(SYNC_ENDPOINT.status, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify(data)
        });

        CBT_SYNC.connected = res.ok;
        CBT_SYNC.lastSync  = Date.now();

        if (!res.ok) {
            console.warn("[CBT SYNC] Server response:", res.status);
        }

    } catch (err) {
        // Bridge server tidak bisa diakses — simpan ke queue
        CBT_SYNC.connected = false;
        console.warn("[CBT SYNC] Send fail (bridge offline?):", err.message);

        const queue = JSON.parse(localStorage.getItem("cbt_sync_queue") || "[]");
        queue.push(data);
        // Simpan max 30 item terakhir
        localStorage.setItem("cbt_sync_queue", JSON.stringify(queue.slice(-30)));
    }
}

/* =========================
   FLUSH QUEUE
   Kirim ulang data yang gagal
   saat bridge kembali online
========================= */
async function flushQueue() {
    const queue = JSON.parse(localStorage.getItem("cbt_sync_queue") || "[]");
    if (!queue.length) return;

    console.log("[CBT SYNC] Flushing queue:", queue.length, "items");
    const failed = [];

    for (const item of queue) {
        try {
            const res = await fetch(SYNC_ENDPOINT.status, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify(item)
            });
            if (!res.ok) failed.push(item);
        } catch {
            failed.push(item);
        }
    }

    if (failed.length) {
        localStorage.setItem("cbt_sync_queue", JSON.stringify(failed));
    } else {
        localStorage.removeItem("cbt_sync_queue");
        console.log("[CBT SYNC] Queue flushed OK");
    }
}

/* =========================
   REALTIME SYNC LOOP
   Tiap 4 detik kirim status
   + coba flush queue lama
========================= */
function startRealtimeSync() {
    CBT_SYNC.interval = setInterval(async () => {
        await sendSync(buildSyncPayload());

        // Coba flush queue jika ada & koneksi OK
        if (CBT_SYNC.connected) {
            flushQueue();
        }
    }, 4000);
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
