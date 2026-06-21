/* =====================================================
SMANSASOO Security System 2.0
FIREBASE CONNECTION MANAGER
===================================================== */

/* =========================
FIREBASE CONFIG
===============
GANTI DENGAN CONFIG
DARI PROJECT FIREBASE ASLI
========================= */
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "YOUR_PROJECT",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "XXXXXXXX",
    appId: "XXXXXXXX"
};

/* =========================
GLOBAL FIREBASE STATE
========================= */
window.db = null;

window.FIREBASE = {
    initialized: false,
    connected: false,
    lastPing: null
};

/* =========================
INIT FIREBASE
========================= */
function initFirebase() {
    try {
        if (typeof firebase === "undefined") {
            console.warn("Firebase SDK tidak ditemukan");
            return false;
        }

        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }

        window.db = firebase.database();
        FIREBASE.initialized = true;

        console.log("Firebase Ready");
        monitorFirebase();

        return true;
    } catch(error) {
        console.error("Firebase Init Error", error);
        return false;
    }
}

/* =========================
CONNECTION MONITOR
========================= */
function monitorFirebase() {
    if (!window.db) return;

    const connectedRef = window.db.ref(".info/connected");

    connectedRef.on("value", snapshot => {
        if (snapshot.val() === true) {
            FIREBASE.connected = true;
            FIREBASE.lastPing = Date.now();
            console.log("Firebase Connected");

            if (window.UI) {
                UI.connection = "online";
            }

            if (typeof addAlert === "function") {
                addAlert("Firebase Connected", "info");
            }
            
            // Hook ke UI.js untuk mengubah status indikator
            if (typeof setFirebaseStatus === "function") {
                setFirebaseStatus(true);
            }
        } else {
            FIREBASE.connected = false;
            console.warn("Firebase Disconnected");

            if (window.UI) {
                UI.connection = "offline";
            }

            // Hook ke UI.js untuk mengubah status indikator
            if (typeof setFirebaseStatus === "function") {
                setFirebaseStatus(false);
            }
        }
    });
}

/* =========================
HEARTBEAT
========================= */
function firebaseHeartbeat() {
    if (!window.db || !FIREBASE.connected) return;

    window.db.ref("system/server").update({
        timestamp: Date.now(),
        source: "panitia",
        version: "2.0"
    });
}

/* =========================
WRITE HELPER
========================= */
function writeData(path, data) {
    if (!window.db) return;
    return window.db.ref(path).set(data);
}

/* =========================
UPDATE HELPER
========================= */
function updateData(path, data) {
    if (!window.db) return;
    return window.db.ref(path).update(data);
}

/* =========================
READ HELPER
========================= */
function readData(path, callback) {
    if (!window.db) return;
    
    window.db.ref(path).on("value", snapshot => {
        callback(snapshot.val());
    });
}

/* =========================
EXPORT GLOBAL
========================= */
window.writeData = writeData;
window.updateData = updateData;
window.readData = readData;
window.initFirebase = initFirebase;

/* =========================
AUTO START
========================= */
initFirebase();

// Detak Jantung Server (Heartbeat) tiap 10 detik
setInterval(firebaseHeartbeat, 10000);

// Fallback Pembaruan UI Status Server
setInterval(() => {
    const badge = document.getElementById("serverStatus");
    if (!badge) return;

    // Lebih akurat menggunakan FIREBASE.connected daripada sekadar melihat ada objek db
    if (FIREBASE.connected) {
        badge.innerText = "ONLINE";
        badge.className = "badge safe";
    } else {
        badge.innerText = "OFFLINE";
        badge.className = "badge danger";
    }
}, 1000);
