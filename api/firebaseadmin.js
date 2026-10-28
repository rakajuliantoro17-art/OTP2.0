const admin = require("firebase-admin");

function getCredential() {
    // Opsi 1: satu variabel JSON utuh
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        return admin.credential.cert(sa);
    }
    // Opsi 2: tiga variabel terpisah
    return admin.credential.cert({
        projectId:   process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey:  (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n")
    });
}

if (!admin.apps.length) {
    admin.initializeApp({
        credential:  getCredential(),
        databaseURL: process.env.FIREBASE_DATABASE_URL || "https://otp-2-70d6e-default-rtdb.firebaseio.com"
    });
}

module.exports = { admin, db: admin.database() };
