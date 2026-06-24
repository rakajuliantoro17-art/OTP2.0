/* =====================================================
   SMANSASOO CBT LOCK 2.0
   FIREBASE ADMIN SINGLETON
   Dipakai bersama oleh semua API endpoints
===================================================== */

const admin = require("firebase-admin");

/* =========================
   SINGLETON INIT
   Vercel bisa menjalankan fungsi
   yang sama berkali-kali di
   container berbeda — cek dulu
   sebelum initializeApp()
========================= */
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId:    process.env.FIREBASE_PROJECT_ID,
            clientEmail:  process.env.FIREBASE_CLIENT_EMAIL,
            // Private key dari env — replace \n literal ke newline asli
            privateKey:   process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")
        }),
        databaseURL: process.env.FIREBASE_DATABASE_URL
    });
}

const db = admin.database();

module.exports = { admin, db };
