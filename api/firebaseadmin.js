/* =====================================================
   SMANSASOO CBT LOCK 2.0
   FIREBASE ADMIN SINGLETON (ESM)
===================================================== */

import { initializeApp, getApps } from "firebase-admin/app";
import { getDatabase }            from "firebase-admin/database";

if (!getApps().length) {
    initializeApp({
        credential:  JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT),
        databaseURL: process.env.FIREBASE_DATABASE_URL
    });
}

export const db = getDatabase();
