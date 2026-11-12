/* =====================================================
   SMANSASOO Security System 2.0
   REALTIME ENGINE
   Firebase Synchronization Layer
===================================================== */

/* =========================
   GLOBAL STATE
========================= */
window.CBT_STATE = {
    students: {},
    stats:    {},
    alerts:   [],
    systemOTP: null,
    masterOtp: null,
    unlockOTP: {}
};

/* =========================
   EVENT BUS
========================= */
const EventBus = {
    listeners: {},

    on(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    },

    emit(event, data) {
        if (!this.listeners[event]) return;
        this.listeners[event].forEach(cb => cb(data));
    }
};

/* =========================
   FIREBASE HELPER
   Renamed db() → getDB() agar
   tidak bentrok dengan window.db
========================= */
function getDB() {
    return window.db || null;
}

/* =========================
   STUDENTS LISTENER
========================= */
/* Normalisasi: data API/Firebase memakai nama/violationCount/status(warning|critical|locked),
   sedangkan UI panitia memakai name/violation/status(safe|warn|danger). */
function normalizeStudent(id, s) {
    const violation = Number(s.violation ?? s.violationCount ?? 0);
    const map = { warning: "warn", critical: "danger", locked: "danger", submitted: "danger" };
    return {
        ...s,
        id,
        name:      s.name || s.nama || s.username || id,
        violation,
        status:    map[s.status] || s.status || (violation >= 26 ? "danger" : violation >= 11 ? "warn" : "safe"),
        progress:  s.progress || "0/40"
    };
}

function applyStudents(data, _try = 0) {
    CBT_STATE.students = data;

    // Komponen HTML dimuat async: tunggu sampai tabel ada agar data pertama tidak hilang
    if (!document.getElementById("studentsTableBody") && _try < 40) {
        setTimeout(() => applyStudents(CBT_STATE.students, _try + 1), 250);
        return;
    }

    const studentsArray = Object.keys(data).map(key => normalizeStudent(key, data[key]));

    EventBus.emit("students:update", studentsArray);

    if (typeof renderStudentsTable  === "function") renderStudentsTable(studentsArray);
    if (typeof updateDashboardStats === "function") updateDashboardStats(studentsArray);

    console.log("[REALTIME] Students Sync:", studentsArray.length);
}

function listenStudents() {
    // Mode lokal: halaman dibuka dari server monitor di laptop panitia
    if (window.CBT_LOCAL) {
        const es = new EventSource("/events");
        es.onmessage = e => {
            const obj = {};
            JSON.parse(e.data).forEach(st => { obj[st.uid] = st; });
            applyStudents(obj);
        };
        es.onopen  = () => { if (typeof setFirebaseStatus === "function") setFirebaseStatus(true); };
        es.onerror = () => {
            console.warn("[REALTIME] Server lokal terputus, mencoba lagi...");
            if (typeof setFirebaseStatus === "function") setFirebaseStatus(false);
        };
        console.log("[REALTIME] Mode LOKAL (server monitor)");
        return;
    }

    if (!getDB()) {
        console.warn("[REALTIME] Offline Mode — Firebase tidak tersedia");
        return;
    }

    getDB().ref("students").on("value", snap => applyStudents(snap.val() || {}));
}

/* =========================
   ALERT LISTENER
========================= */
function listenAlerts() {
    if (!getDB()) return;

    getDB().ref("alerts").limitToLast(10).on("child_added", snap => {
        const alert = snap.val();
        if (!alert) return;

        CBT_STATE.alerts.unshift(alert);
        EventBus.emit("alert:new", alert);

        if (typeof addAlert === "function") addAlert(alert.msg || alert.message);
    });
}

/* =========================
   SYSTEM OTP LISTENER
========================= */
/* Indikator "data terakhir": jembatan CBT menulis system/bridge tiap 10 dtk */
let BRIDGE_TS = 0;
function listenBridge() {
    if (window.CBT_LOCAL) { BRIDGE_TS = Date.now(); }                 // lokal: data langsung dari server ini
    else if (getDB()) getDB().ref("system/bridge/timestamp").on("value", snap => { BRIDGE_TS = Number(snap.val()) || 0; });
    setInterval(() => {
        const el = document.getElementById("bridgeAge"); if (!el) return;
        if (window.CBT_LOCAL) { el.textContent = "LANGSUNG"; el.className = "badge safe"; return; }
        if (!BRIDGE_TS) { el.textContent = "BELUM ADA"; el.className = "badge danger"; return; }
        const sec = Math.max(0, Math.round((Date.now() - BRIDGE_TS) / 1000));
        el.textContent = sec < 60 ? sec + " dtk lalu" : Math.round(sec / 60) + " mnt lalu";
        el.className = "badge " + (sec < 30 ? "safe" : sec < 90 ? "warn" : "danger");
    }, 1000);
}

function listenSystemOTP() {
    if (!getDB()) return;

    getDB().ref("system/otp").on("value", snap => {
        const data = snap.val();
        if (!data) return;

        CBT_STATE.systemOTP = data;
        EventBus.emit("otp:update", data);
        console.log("[REALTIME] System OTP Sync");
    });
}

/* =========================
   MASTER OTP LISTENER
   Untuk siswa violation >= 26
========================= */
function listenMasterOTP() {
    if (!getDB()) return;

    getDB().ref("system/masterOtp").on("value", snap => {
        const data = snap.val();
        if (!data) return;

        CBT_STATE.masterOtp = data;
        EventBus.emit("masterOtp:update", data);
        console.log("[REALTIME] Master OTP Sync:", data.code);
    });
}

/* =========================
   UNLOCK OTP LISTENER
========================= */
function listenUnlockOTP() {
    if (!getDB()) return;

    getDB().ref("unlockOtp").on("value", snap => {
        CBT_STATE.unlockOTP = snap.val() || {};
        EventBus.emit("unlock:update", CBT_STATE.unlockOTP);
    });
}

/* =========================
   PUSH ALERT
========================= */
function pushRealtimeAlert(type, message) {
    const payload = {
        type: type || "info",
        msg:  message,
        time: Date.now()
    };

    if (getDB()) getDB().ref("alerts").push(payload);
    if (typeof addAlert === "function") addAlert(message);
}

/* =========================
   UPDATE STUDENT
========================= */
function updateStudent(id, payload) {
    if (!getDB()) return;
    getDB().ref("students/" + id).update(payload);
}

/* =========================
   AUTO SUBMIT CHECK
========================= */
function checkViolationAutoSubmit(studentId, violation) {
    if (violation >= 30 && typeof triggerAutoSubmit === "function") {
        triggerAutoSubmit(studentId);
    }
}

/* =========================
   HEARTBEAT
========================= */
function heartbeat() {
    if (!getDB()) return;

    getDB().ref("system/heartbeat").set({
        timestamp:      Date.now(),
        status:         "online",
        activeStudents: Object.keys(CBT_STATE.students).length
    });
}

/* =========================
   CONNECTION MONITOR
========================= */
function monitorConnection() {
    setInterval(() => {
        if (window.UI) {
            UI.connection = navigator.onLine ? "online" : "offline";
        }
    }, 5000);
}

/* =========================
   INIT REALTIME
========================= */
function initRealtime() {
    console.log("[REALTIME] Engine Starting...");

    listenStudents();
    listenAlerts();
    listenBridge();
    listenSystemOTP();
    listenMasterOTP();
    listenUnlockOTP();
    monitorConnection();
    heartbeat();

    // Hook sidebar & topbar — diregistrasi di sini agar urutan
    // eksekusi terjamin setelah semua listener aktif
    EventBus.on("students:update", data => {
        if (typeof syncSidebarStats === "function") syncSidebarStats(data);
        if (typeof syncTopbarStats  === "function") syncTopbarStats(data);
    });

    setInterval(heartbeat, 5000);

    console.log("[REALTIME] Engine READY");
}

/* =========================
   EXPORT GLOBAL
========================= */
window.EventBus                  = EventBus;
window.initRealtime              = initRealtime;
window.updateStudent             = updateStudent;
window.pushRealtimeAlert         = pushRealtimeAlert;
window.checkViolationAutoSubmit  = checkViolationAutoSubmit;

/* =========================
   AUTO START
========================= */
initRealtime();
