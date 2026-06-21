/* =====================================================
SMANSASOO Security System 2.0
REALTIME ENGINE
Firebase Synchronization Layer
===================================================== */

/* =========================
GLOBAL STATE
========================= */

window.CBT_STATE = {

```
students: {},

stats: {},

alerts: [],

systemOTP: null,

unlockOTP: {}
```

};

/* =========================
EVENT BUS
========================= */

const EventBus = {

```
listeners: {},

on(event, callback) {

    if (!this.listeners[event]) {

        this.listeners[event] = [];

    }

    this.listeners[event].push(callback);

},

emit(event, data) {

    if (!this.listeners[event])
        return;

    this.listeners[event].forEach(

        cb => cb(data)

    );

}
```

};

/* =========================
FIREBASE HELPER
========================= */

function db() {

```
return window.db || null;
```

}

/* =========================
STUDENTS LISTENER
========================= */

function listenStudents() {

```
if (!db()) {

    console.warn(
        "Realtime Offline Mode"
    );

    return;

}

db()
.ref("students")
.on("value", snap => {

    const data =
        snap.val() || {};

    CBT_STATE.students =
        data;

    const studentsArray =
        Object.keys(data).map(

            key => ({

                id: key,

                ...data[key]

            })

        );

    EventBus.emit(
        "students:update",
        studentsArray
    );

    if (
        typeof renderStudentsTable ===
        "function"
    ) {

        renderStudentsTable(
            studentsArray
        );

    }

    if (
        typeof updateDashboardStats ===
        "function"
    ) {

        updateDashboardStats(
            studentsArray
        );

    }

    console.log(

        "Students Sync:",
        studentsArray.length

    );

});
```

}

/* =========================
ALERT LISTENER
========================= */

function listenAlerts() {

```
if (!db())
    return;

db()
.ref("alerts")
.limitToLast(10)
.on("child_added",

    snap => {

        const alert =
            snap.val();

        if (!alert)
            return;

        CBT_STATE.alerts.unshift(
            alert
        );

        EventBus.emit(
            "alert:new",
            alert
        );

        if (
            typeof addAlert ===
            "function"
        ) {

            addAlert(

                alert.msg ||
                alert.message

            );

        }

    }

);
```

}

/* =========================
SYSTEM OTP LISTENER
========================= */

function listenSystemOTP() {

```
if (!db())
    return;

db()
.ref("system/otp")
.on("value",

    snap => {

        const data =
            snap.val();

        if (!data)
            return;

        CBT_STATE.systemOTP =
            data;

        EventBus.emit(
            "otp:update",
            data
        );

        console.log(
            "System OTP Sync"
        );

    }

);
```

}

/* =========================
UNLOCK OTP LISTENER
========================= */

function listenUnlockOTP() {

```
if (!db())
    return;

db()
.ref("unlockOtp")
.on("value",

    snap => {

        CBT_STATE.unlockOTP =
            snap.val() || {};

        EventBus.emit(
            "unlock:update",
            CBT_STATE.unlockOTP
        );

    }

);
```

}

/* =========================
PUSH ALERT
========================= */

function pushRealtimeAlert(

```
type,
message
```

) {

```
const payload = {

    type:
        type || "info",

    msg:
        message,

    time:
        Date.now()

};

if (db()) {

    db()
    .ref("alerts")
    .push(payload);

}

if (
    typeof addAlert ===
    "function"
) {

    addAlert(message);

}
```

}

/* =========================
UPDATE STUDENT
========================= */

function updateStudent(

```
id,
payload
```

) {

```
if (!db())
    return;

db()
.ref(

    "students/" + id

)
.update(payload);
```

}

/* =========================
AUTO SUBMIT CHECK
========================= */

function checkViolationAutoSubmit(

```
studentId,
violation
```

) {

```
if (
    violation >= 30 &&
    typeof triggerAutoSubmit ===
    "function"
) {

    triggerAutoSubmit(
        studentId
    );

}
```

}

/* =========================
HEARTBEAT
========================= */

function heartbeat() {

```
if (!db())
    return;

db()
.ref("system/heartbeat")
.set({

    timestamp:
        Date.now(),

    status:
        "online",

    activeStudents:

        Object.keys(
            CBT_STATE.students
        ).length

});
```

}

/* =========================
CONNECTION MONITOR
========================= */

function monitorConnection() {

```
setInterval(() => {

    if (navigator.onLine) {

        if (window.UI) {

            UI.connection =
                "online";

        }

    }

    else {

        if (window.UI) {

            UI.connection =
                "offline";

        }

    }

}, 5000);
```

}

/* =========================
INIT REALTIME
========================= */

function initRealtime() {

```
console.log(

    "Realtime Engine Starting..."

);

listenStudents();

listenAlerts();

listenSystemOTP();

listenUnlockOTP();

monitorConnection();

heartbeat();

setInterval(

    heartbeat,

    5000

);

console.log(

    "Realtime Engine READY"

);
```

}

/* =========================
EXPORT
========================= */

window.EventBus =
EventBus;

window.initRealtime =
initRealtime;

window.updateStudent =
updateStudent;

window.pushRealtimeAlert =
pushRealtimeAlert;

window.checkViolationAutoSubmit =
checkViolationAutoSubmit;

/* =========================
AUTO START
========================= */

initRealtime();
