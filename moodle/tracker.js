/* =====================================================
   SMANSASOO CBT LOCK 2.0
   MOODLE BEHAVIOR TRACKER LAYER
   ANALYTICS + EVENT AGGREGATOR
===================================================== */

const CBT_TRACKER = {
    studentId: null,
    sessionId: null,

    events: [],
    suspiciousScore: 0,

    lastActionTime: Date.now(),
    idleThreshold: 30000, // 30 detik

    flushInterval: null
};

/* =========================
   INIT TRACKER
========================= */

function initCBTTracker(studentId, sessionId) {

    CBT_TRACKER.studentId = studentId;
    CBT_TRACKER.sessionId = sessionId;

    startTracking();
    startEventFlush();

    console.log("[CBT TRACKER] INIT OK", studentId);
}

/* =========================
   EVENT COLLECTOR
========================= */

function trackEvent(type, meta = {}) {

    const event = {
        type,
        meta,
        timestamp: Date.now()
    };

    CBT_TRACKER.events.push(event);
    CBT_TRACKER.lastActionTime = Date.now();

    evaluateRisk(type);

    console.log("[TRACK EVENT]", event);
}

/* =========================
   RISK ENGINE (LIGHTWEIGHT)
========================= */

function evaluateRisk(type) {

    switch (type) {

        case "tab_switch":
            CBT_TRACKER.suspiciousScore += 5;
            break;

        case "window_blur":
            CBT_TRACKER.suspiciousScore += 4;
            break;

        case "right_click":
            CBT_TRACKER.suspiciousScore += 2;
            break;

        case "copy":
            CBT_TRACKER.suspiciousScore += 3;
            break;

        case "idle":
            CBT_TRACKER.suspiciousScore += 6;
            break;

        default:
            CBT_TRACKER.suspiciousScore += 1;
    }

    if (CBT_TRACKER.suspiciousScore > 30) {
        triggerCriticalState();
    }
}

/* =========================
   IDLE DETECTOR
========================= */

function startTracking() {

    setInterval(() => {

        const now = Date.now();

        if (now - CBT_TRACKER.lastActionTime > CBT_TRACKER.idleThreshold) {

            trackEvent("idle");

            CBT_TRACKER.lastActionTime = now;
        }

    }, 5000);
}

/* =========================
   FLUSH EVENTS TO SYNC LAYER
========================= */

function startEventFlush() {

    CBT_TRACKER.flushInterval = setInterval(() => {

        if (CBT_TRACKER.events.length === 0) return;

        const payload = {
            studentId: CBT_TRACKER.studentId,
            sessionId: CBT_TRACKER.sessionId,
            events: [...CBT_TRACKER.events],
            suspiciousScore: CBT_TRACKER.suspiciousScore,
            timestamp: Date.now()
        };

        sendToSync(payload);

        CBT_TRACKER.events = [];

    }, 7000); // flush tiap 7 detik
}

/* =========================
   SEND TO SYNC LAYER
========================= */

async function sendToSync(data) {

    try {

        // prefer Firebase API jika tersedia
        if (window.FirebaseAPI) {

            await window.FirebaseAPI.pushData(
                `logs/${data.studentId}`,
                data
            );

            return;
        }

        // fallback ke sync.js handler
        if (window.forceResync) {
            window.forceResync();
        }

    } catch (err) {
        console.warn("[TRACKER SYNC FAIL]", err);
    }
}

/* =========================
   CRITICAL STATE HANDLER
========================= */

function triggerCriticalState() {

    console.warn("[CBT TRACKER] CRITICAL STATE DETECTED");

    if (window.CBTLOCK) {
        window.CBTLOCK.violation += 5;
    }

    if (window.addAlert) {
        window.addAlert("⚠ HIGH SUSPICIOUS ACTIVITY DETECTED");
    }
}

/* =========================
   MANUAL HOOKS (FROM CBT LOCK)
========================= */

document.addEventListener("visibilitychange", () => {
    if (document.hidden) trackEvent("tab_switch");
});

window.addEventListener("blur", () => {
    trackEvent("window_blur");
});

document.addEventListener("copy", () => {
    trackEvent("copy");
});

document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    trackEvent("right_click");
});

/* =========================
   EXTERNAL ACCESS
========================= */

window.CBT_TRACKER = CBT_TRACKER;

window.initCBTTracker = initCBTTracker;
window.trackEvent = trackEvent;
