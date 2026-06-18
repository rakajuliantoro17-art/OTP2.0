/* =====================================================
   SMANSASOO CBT LOCK 2.0
   CORE CONSTANTS
   GLOBAL CONFIGURATION FILE
===================================================== */

const SMANSASOO = {

    /* =========================
       BRANDING
    ========================== */

    BRAND: {
        NAME: "SMANSASOO CBT LOCK 2.0",
        SCHOOL: "SMAN 1 SOOKO MOJOKERTO",
        TAGLINE: "Secure CBT Monitoring System"
    },

    /* =========================
       SYSTEM MODE
    ========================== */

    MODE: {
        PANITIA: "PANITIA",
        PENGAWAS: "PENGAWAS",
        CBT_CLIENT: "CBT_CLIENT",
        TEST: "TEST"
    },

    /* =========================
       VIOLATION LEVELS
    ========================== */

    VIOLATION: {

        SAFE: {
            MIN: 0,
            MAX: 10,
            LABEL: "SAFE",
            COLOR: "green"
        },

        WARNING: {
            MIN: 11,
            MAX: 25,
            LABEL: "WARNING",
            COLOR: "orange"
        },

        CRITICAL: {
            MIN: 26,
            MAX: 29,
            LABEL: "CRITICAL",
            COLOR: "red"
        },

        AUTOSUBMIT: {
            MIN: 30,
            MAX: 999,
            LABEL: "AUTO_SUBMIT",
            COLOR: "black"
        }

    },

    /* =========================
       OTP CONFIGURATION
    ========================== */

    OTP: {

        LENGTH: 6,

        GLOBAL_REFRESH_MS: 10000,

        EXPIRY_MS: 300000, // 5 menit

        MASTER_LEVEL_THRESHOLD: 26

    },

    /* =========================
       FIREBASE (PLACEHOLDER)
    ========================== */

    FIREBASE: {

        ENABLED: false,

        CONFIG: {

            apiKey: "",
            authDomain: "",
            databaseURL: "",
            projectId: "",
            storageBucket: "",
            messagingSenderId: "",
            appId: ""

        },

        NODES: {

            STUDENTS: "/students",
            VIOLATIONS: "/violations",
            OTP: "/otp",
            LOGS: "/logs"

        }

    },

    /* =========================
       REALTIME SETTINGS
    ========================== */

    REALTIME: {

        SYNC_INTERVAL: 2000,

        HEARTBEAT_INTERVAL: 5000,

        MAX_USERS: 5000

    },

    /* =========================
       UI SETTINGS
    ========================== */

    UI: {

        THEME: "GLASS_LIGHT",

        ANIMATION: true,

        TOAST_DURATION: 2500

    }

};

/* =====================================================
   HELPER FUNCTION
===================================================== */

function getViolationLabel(value) {

    const v = SMANSASOO.VIOLATION;

    if (value >= v.AUTOSUBMIT.MIN)
        return v.AUTOSUBMIT.LABEL;

    if (value >= v.CRITICAL.MIN)
        return v.CRITICAL.LABEL;

    if (value >= v.WARNING.MIN)
        return v.WARNING.LABEL;

    return v.SAFE.LABEL;

}

/* =====================================================
   EXPORT GLOBAL
===================================================== */

window.SMANSASOO = SMANSASOO;
