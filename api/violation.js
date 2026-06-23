// api/violation.js

import { initializeApp, getApps } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";

if (!getApps().length) {
    initializeApp({
        credential: JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT),
        databaseURL: process.env.FIREBASE_DATABASE_URL
    });
}

const db = getDatabase();

export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({
            success:false,
            message:"Method Not Allowed"
        });
    }

    try {

        const {
            uid,
            nama,
            kelas,
            violationType,
            timestamp
        } = req.body;

        if (!uid) {
            return res.status(400).json({
                success:false,
                message:"UID wajib"
            });
        }

        const data = {
            uid,
            nama: nama || "-",
            kelas: kelas || "-",
            violationType: violationType || "unknown",
            timestamp: timestamp || Date.now()
        };

        await db.ref(`violations/${uid}/${Date.now()}`)
            .set(data);

        await db.ref(`students/${uid}/status`)
            .set("danger");

        await db.ref(`students/${uid}/violationCount`)
            .transaction(v => (v || 0) + 1);

        return res.status(200).json({
            success:true
        });

    } catch(err){

        console.error(err);

        return res.status(500).json({
            success:false,
            message:err.message
        });

    }

}
