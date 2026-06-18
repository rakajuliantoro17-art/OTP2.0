/* =====================================================
   SMANSASOO CBT LOCK 2.0
   CORE STATUS ENGINE
   REALTIME STUDENT BEHAVIOR TRACKING
===================================================== */

/* =========================
   STATUS CACHE
========================= */

const STATUS_ENGINE = {

    students: {},

    summary: {

        SAFE: 0,

        WARNING: 0,

        CRITICAL: 0,

        AUTO_SUBMIT: 0

    }

};

/* =========================
   INIT STATUS ENGINE
========================= */

function initStatusEngine() {

    logStatus("STATUS ENGINE INITIALIZED");

    startStatusHeartbeat();

}

/* =========================
   HEARTBEAT UPDATE
========================= */

function startStatusHeartbeat() {

    setInterval(() => {

        refreshSummary();

    }, 3000);

}

/* =========================
   UPDATE STUDENT STATUS
========================= */

function updateStudentStatus(studentId, violationCount) {

    const label = getViolationLabel(violationCount);

    if (!STATUS_ENGINE.students[studentId]) {

        STATUS_ENGINE.students[studentId] = {

            violation: 0,

            status: "SAFE"

        };

    }

    STATUS_ENGINE.students[studentId].violation = violationCount;

    STATUS_ENGINE.students[studentId].status = label;

    updateSummaryFromStudent(label);

    triggerSystemReaction(studentId, violationCount, label);

    logStatus(
        `UPDATE → ${studentId} = ${violationCount} (${label})`
    );

}

/* =========================
   SUMMARY REFRESH
========================= */

function refreshSummary() {

    STATUS_ENGINE.summary = {

        SAFE: 0,

        WARNING: 0,

        CRITICAL: 0,

        AUTO_SUBMIT: 0

    };

    for (let id in STATUS_ENGINE.students) {

        const status = STATUS_ENGINE.students[id].status;

        if (STATUS_ENGINE.summary[status] !== undefined) {

            STATUS_ENGINE.summary[status]++;

        }

    }

    updateDashboardStats();

}

/* =========================
   SINGLE UPDATE SUMMARY
========================= */

function updateSummaryFromStudent(label) {

    if (STATUS_ENGINE.summary[label] !== undefined) {

        STATUS_ENGINE.summary[label]++;

    }

    updateDashboardStats();

}

/* =========================
   SYSTEM REACTION ENGINE
========================= */

function triggerSystemReaction(studentId, violation, status) {

    // WARNING
    if (status === "WARNING") {

        emitEvent("STATUS_WARNING", {

            studentId,

            violation

        });

    }

    // CRITICAL
    if (status === "CRITICAL") {

        emitEvent("STATUS_CRITICAL", {

            studentId,

            violation

        });

        triggerOTP(studentId);

    }

    // AUTO SUBMIT
    if (status === "AUTO_SUBMIT") {

        emitEvent("STATUS_AUTOSUBMIT", {

            studentId

        });

        triggerAutoSubmit(studentId);

    }

}

/* =========================
   DASHBOARD UPDATE
========================= */

function updateDashboardStats() {

    setText("statSafe", STATUS_ENGINE.summary.SAFE);

    setText("statWarning", STATUS_ENGINE.summary.WARNING);

    setText("statCritical", STATUS_ENGINE.summary.CRITICAL);

    setText("statAuto", STATUS_ENGINE.summary.AUTO_SUBMIT);

}

/* =========================
   BULK SYNC (FUTURE FIREBASE)
========================= */

function syncStatusFromServer(data) {

    STATUS_ENGINE.students = data;

    refreshSummary();

    logStatus("STATUS SYNC COMPLETED");

}

/* =========================
   RESET SYSTEM
========================= */

function resetStatusEngine() {

    STATUS_ENGINE.students = {};

    refreshSummary();

    logStatus("STATUS ENGINE RESET");

}

/* =========================
   LOGGER
========================= */

function logStatus(text) {

    console.log("[SMANSASOO STATUS] " + text);

}

/* =========================
   EXPORT GLOBAL
========================= */

window.STATUS_ENGINE = STATUS_ENGINE;

window.initStatusEngine = initStatusEngine;

window.updateStudentStatus = updateStudentStatus;

window.syncStatusFromServer = syncStatusFromServer;

window.resetStatusEngine = resetStatusEngine;
