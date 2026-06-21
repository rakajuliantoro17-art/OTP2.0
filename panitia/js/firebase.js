/* =====================================================
   SMANSASOO CBT CONTROL TOWER
   FIREBASE CONNECTION MANAGER (LAYER 4)
===================================================== */

/**
 * TUGAS FILE INI:
 * 1. Menginisialisasi Firebase App secara aman.
 * 2. Mengekspor instance 'window.db' agar bisa dipakai oleh realtime.js & otp.js
 * 3. Memantau status koneksi (Online/Offline) ke server.
 */

/* =========================
   FIREBASE CONFIGURATION
========================= */
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT.firebaseio.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "XXXX",
    appId: "XXXX"
};

/* =========================
   GLOBAL INSTANCE
========================= */
window.db = null; // Akan dipakai oleh seluruh sistem (realtime.js, otp.js)

/* =========================
   SAFE INIT FIREBASE
========================= */
function initFirebase() {
    try {
        // Cek apakah script SDK Firebase dari index.html berhasil dimuat
        if (typeof firebase === "undefined") {
            console.warn("🔥 Firebase SDK tidak terdeteksi. Sistem berjalan di mode LOKAL/DUMMY.");
            return false;
        }

        // Cegah inisialisasi ganda
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }

        // Simpan instance database ke window agar bisa diakses global
        window.db = firebase.database();
        console.log("🔥 Firebase Init: SUCCESS ✔");

        // Jalankan pemantau koneksi otomatis
        monitorConnection();

        return true;

    } catch (e) {
        console.error("🔥 Firebase Init ERROR:", e);
        return false;
    }
}

/* =========================
   CONNECTION MONITORING
========================= */
function monitorConnection() {
    if (!window.db) return;

    // '.info/connected' adalah fitur bawaan Firebase untuk mengecek status koneksi jaringan
    const connectedRef = window.db.ref(".info/connected");
    
    connectedRef.on("value", (snap) => {
        if (snap.val() === true) {
            console.log("🔥 Firebase: TERHUBUNG KE SERVER");
            if (typeof window.addAlert === "function") {
                window.addAlert("Sistem terhubung ke Firebase Server ✔");
            }
        } else {
            console.warn("🔥 Firebase: KONEKSI TERPUTUS");
        }
    });
}

/* =========================
   AUTO START
========================= */
initFirebase();
