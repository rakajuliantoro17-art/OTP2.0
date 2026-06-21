/* =====================================================
   SMANSASOO CBT CONTROL TOWER
   REALTIME EVENT ENGINE (LAYER 4–7 READY)
===================================================== */

/**
 * CORE FUNCTION:
 * - Sinkron siswa realtime (Konversi Object ke Array untuk UI)
 * - Sinkron stats realtime
 * - Sinkron alert realtime
 * - Bridge ke UI (Auto Render Tabel & Stats)
 * - Local fallback mode (tanpa Firebase tetap jalan)
 */

/* =========================
   GLOBAL STATE
========================= */

window.CBT_STATE = {
    students: {},
    stats: {},
    alerts: []
};

/* =========================
   EVENT BUS SYSTEM
========================= */

const EventBus = {
    listeners: {},
    
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    },
    
    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => cb(data));
        }
    }
};

/* =========================
   INIT FIREBASE SAFE
========================= */

function db() {
    // Memastikan memanggil instance Firebase database jika tersedia dari firebase.js
    return window.db || null; 
}

/* =========================
   REALTIME STUDENTS STREAM
========================= */

function listenStudents() {
    if (!db()) {
        console.warn("Realtime: Firebase offline. UI akan menggunakan data Dummy.");
        return;
    }

    db().ref("students").on("value", (snap) => {
        const data = snap.val() || {};
        CBT_STATE.students = data;

        // 1. Konversi Object Firebase menjadi Array agar bisa dibaca oleh renderStudentsTable()
        const studentsArray = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
        }));

        // 2. Pancarkan Event
        EventBus.emit("students:update", studentsArray);

        // 3. AUTO UI BRIDGE (Update UI langsung jika fungsi tersedia)
        if (typeof window.renderStudentsTable === "function") {
            window.renderStudentsTable(studentsArray);
        }
        if (typeof window.updateDashboardStats === "function") {
            window.updateDashboardStats(studentsArray);
        }

        console.log("Realtime: Students synced (" + studentsArray.length + " users)");
    });
}

/* =========================
   REALTIME STATS STREAM
========================= */

function listenStats() {
    if (!db()) return;

    db().ref("stats").on("value", (snap) => {
        const data = snap.val() || {};
        CBT_STATE.stats = data;
        EventBus.emit("stats:update", data);
    });
}

/* =========================
   REALTIME ALERT STREAM
========================= */

function listenAlerts() {
    if (!db()) return;

    // Hanya mendengarkan data baru yang masuk (child_added)
    db().ref("alerts").limitToLast(1).on("child_added", (snap) => {
        const data = snap.val();
        if(!data) return;

        CBT_STATE.alerts.unshift(data);
        EventBus.emit("alert:new", data);

        // AUTO UI BRIDGE (Munculkan ke panel kanan bawah)
        if (typeof window.addAlert === "function") {
            window.addAlert(data.msg || data.message);
        }
    });
}

/* =========================
   PUSH ALERT (KE FIREBASE & LOKAL)
========================= */

function pushRealtimeAlert(type, message) {
    const payload = {
        type: type || "info",
        msg: message,
        time: Date.now()
    };

    CBT_STATE.alerts.unshift(payload);
    EventBus.emit("alert:new", payload);

    if (db()) {
        db().ref("alerts").push(payload);
    } else {
        // Fallback jika offline: Langsung tembak ke UI
        if (typeof window.addAlert === "function") {
            window.addAlert(`[LOKAL] ${message}`);
        }
    }
}

/* =========================
   UPDATE STUDENT (VIOLATION / STATUS)
========================= */

function updateStudent(id, payload) {
    if (!db()) {
        console.warn("Realtime: offline update student skipped");
        return;
    }
    db().ref("students/" + id).update(payload);
}

/* =========================
   SYSTEM HEARTBEAT
========================= */

function heartbeat() {
    if (!db()) return;

    db().ref("system/heartbeat").set({
        time: Date.now(),
        status: "live",
        activeStudents: Object.keys(CBT_STATE.students || {}).length
    });
}

/* =========================
   AUTO INIT SYSTEM
========================= */

function initRealtime() {
    console.log("CBT Realtime Engine starting...");

    listenStudents();
    listenStats();
    listenAlerts();

    setInterval(heartbeat, 5000);

    console.log("CBT Realtime Engine READY ✔");
}

/* =========================
   EVENT HOOK EXPORT
========================= */

window.EventBus = EventBus;
window.pushRealtimeAlert = pushRealtimeAlert;
window.updateStudent = updateStudent;
window.initRealtime = initRealtime;

/* AUTO START */
initRealtime();
