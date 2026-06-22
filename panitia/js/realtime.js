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
function listenStudents() {
    if (!getDB()) {
        console.warn("[REALTIME] Offline Mode — Firebase tidak tersedia");
        return;
    }

    getDB().ref("students").on("value", snap => {
        const data = snap.val() || {};
        CBT_STATE.students = data;

        const studentsArray = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
        }));

        EventBus.emit("students:update", studentsArray);

        if (typeof renderStudentsTable  === "function") renderStudentsTable(studentsArray);
        if (typeof updateDashboardStats === "function") updateDashboardStats(studentsArray);

        console.log("[REALTIME] Students Sync:", studentsArray.length);
    });
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
