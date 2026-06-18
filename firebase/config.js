/* =====================================================
   SMANSASOO CBT LOCK 2.0
   FIREBASE CONFIGURATION
   PRODUCTION FOUNDATION LAYER
===================================================== */

/* =========================
   FIREBASE IMPORT
   (compat mode for simplicity + Vercel safe)
========================= */

import { initializeApp } from "firebase/app";
import {
    getDatabase,
    ref,
    set,
    push,
    update,
    onValue,
    serverTimestamp
} from "firebase/database";

/* =========================
   FIREBASE CONFIG
   (ISI NANTI SAAT PRODUCTION DEPLOY)
========================= */

const firebaseConfig = {

    apiKey: "YOUR_API_KEY",

    authDomain: "YOUR_PROJECT.firebaseapp.com",

    databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",

    projectId: "YOUR_PROJECT_ID",

    storageBucket: "YOUR_PROJECT.appspot.com",

    messagingSenderId: "YOUR_SENDER_ID",

    appId: "YOUR_APP_ID"

};

/* =========================
   INIT FIREBASE APP
========================= */

const app = initializeApp(firebaseConfig);

const db = getDatabase(app);

/* =========================
   DATABASE HELPERS
========================= */

const FirebaseAPI = {

    /* ===== WRITE DATA ===== */

    setData: (path, data) => {

        return set(ref(db, path), {

            ...data,

            updatedAt: Date.now()

        });

    },

    /* ===== UPDATE DATA ===== */

    updateData: (path, data) => {

        return update(ref(db, path), {

            ...data,

            updatedAt: Date.now()

        });

    },

    /* ===== PUSH DATA (LOGS) ===== */

    pushData: (path, data) => {

        return push(ref(db, path), {

            ...data,

            createdAt: Date.now()

        });

    },

    /* ===== LISTENER REALTIME ===== */

    listen: (path, callback) => {

        return onValue(ref(db, path), snapshot => {

            callback(snapshot.val());

        });

    },

    /* ===== SERVER TIME ===== */

    serverTime: serverTimestamp

};

/* =========================
   CORE FIREBASE STRUCTURE
========================= */

const DB_PATHS = {

    STUDENTS: "students",

    STATUS: "status",

    OTP: "otp",

    LOGS: "logs",

    CONTROL: "control"

};

/* =========================
   OTP SYNC HELPERS
========================= */

function syncGlobalOTP(otp) {

    return FirebaseAPI.setData(`${DB_PATHS.OTP}/global`, {

        value: otp,

        type: "GLOBAL"

    });

}

function syncMasterOTP(otp) {

    return FirebaseAPI.setData(`${DB_PATHS.OTP}/master`, {

        value: otp,

        type: "MASTER"

    });

}

/* =========================
   STATUS SYNC HELPERS
========================= */

function syncStatus(summary) {

    return FirebaseAPI.updateData(DB_PATHS.STATUS, summary);

}

/* =========================
   EVENT LOGGING
========================= */

function logEvent(event) {

    return FirebaseAPI.pushData(DB_PATHS.LOGS, {

        event,

        time: Date.now()

    });

}

/* =========================
   EXPORT GLOBAL
========================= */

window.FirebaseAPI = FirebaseAPI;

window.DB_PATHS = DB_PATHS;

window.syncGlobalOTP = syncGlobalOTP;

window.syncMasterOTP = syncMasterOTP;

window.syncStatus = syncStatus;

window.logEvent = logEvent;
