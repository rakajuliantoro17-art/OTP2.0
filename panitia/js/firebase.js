/* =====================================================
   SMANSASOO Security System 2.0
   FIREBASE CONNECTION MANAGER
===================================================== */

const firebaseConfig = {
    apiKey:            "AIzaSyDQBar_tJy19A2ONu8DkxbZzh0Oa11ygfE",
    authDomain:        "otp-2-70d6e.firebaseapp.com",
    databaseURL:       "https://otp-2-70d6e-default-rtdb.firebaseio.com",
    projectId:         "otp-2-70d6e",
    storageBucket:     "otp-2-70d6e.firebasestorage.app",
    messagingSenderId: "430860703289",
    appId:             "1:430860703289:web:1faa0883b89b443b325fe8",
    measurementId:     "G-2G2QGK2RPD"
};

window.db    = null;
window.FIREBASE = { initialized: false, connected: false, lastPing: null };

function initFirebase() {
    try {
        if (typeof firebase === "undefined") {
            console.warn("[FB] SDK tidak ditemukan");
            return false;
        }

        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }

        // Long polling — lebih stabil dari WebSocket di beberapa jaringan
        window.db = firebase.database();

        FIREBASE.initialized = true;
        console.log("[FB] Ready");
        monitorFirebase();
        return true;

    } catch(err) {
        console.error("[FB] Init Error:", err);
        return false;
    }
}

function monitorFirebase() {
    if (!window.db) return;

    window.db.ref(".info/connected").on("value", snap => {
        if (snap.val() === true) {
            FIREBASE.connected = true;
            FIREBASE.lastPing  = Date.now();
            console.log("[FB] Connected ✅");
            if (typeof setFirebaseStatus === "function") setFirebaseStatus(true);
            if (typeof addAlert === "function") addAlert("Firebase terhubung", "info");
        } else {
            FIREBASE.connected = false;
            console.warn("[FB] Disconnected");
            if (typeof setFirebaseStatus === "function") setFirebaseStatus(false);
        }
    });
}

function firebaseHeartbeat() {
    if (!window.db || !FIREBASE.connected) return;
    window.db.ref("system/server").update({
        timestamp: Date.now(),
        source:    "panitia",
        version:   "2.0"
    });
}

function writeData(path, data)     { if (!window.db) return; return window.db.ref(path).set(data); }
function updateData(path, data)    { if (!window.db) return; return window.db.ref(path).update(data); }
function readData(path, callback)  { if (!window.db) return; window.db.ref(path).on("value", snap => callback(snap.val())); }

window.writeData   = writeData;
window.updateData  = updateData;
window.readData    = readData;
window.initFirebase = initFirebase;

initFirebase();
setInterval(firebaseHeartbeat, 10000);
