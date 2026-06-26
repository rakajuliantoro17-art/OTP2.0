/* =====================================================
   SMANSASOO CBT LOCK 2.0
   VERCEL SERVERLESS FUNCTION
   POST /api/status/update
===================================================== */

import { db } from "../firebaseadmin.js";

const CORS = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
};

function resolveStatus(count) {
    if (count >= 30) return "locked";
    if (count >= 26) return "critical";
    if (count >= 11) return "warning";
    return "safe";
}

export default async function handler(req, res) {

    if (req.method === "OPTIONS")
        return res.status(200).set(CORS).end();

    if (req.method !== "POST")
        return res.status(405).set(CORS)
            .json({ success: false, message: "Method Not Allowed" });

    const {
        uid,
        nama      = "-",
        kelas     = "-",
        sessionId = "default",
        violation = 0,
        progress  = "0/40",
        timestamp = Date.now()
    } = req.body || {};

    if (!uid)
        return res.status(400).set(CORS)
            .json({ success: false, message: "uid wajib diisi" });

    if (Date.now() - timestamp > 30000)
        return res.status(400).set(CORS)
            .json({ success: false, message: "Request kadaluarsa" });

    try {
        const ref      = db.ref("students/" + uid);
        const snap     = await ref.once("value");
        const existing = snap.val() || {};

        const safeViolation = Math.max(existing.violationCount || 0, violation);
        const safeStatus    = resolveStatus(safeViolation);

        const update = {
            uid, nama, kelas, sessionId,
            violationCount: safeViolation,
            status:         safeStatus,
            progress,
            lastSync:       timestamp,
            updatedAt:      Date.now()
        };

        if (safeViolation >= 30 && !existing.autoSubmit) {
            update.autoSubmit  = true;
            update.submittedAt = Date.now();
        }

        await ref.update(update);

        await db.ref("logs/" + uid).push({
            type:           "status_update",
            violationCount: safeViolation,
            status:         safeStatus,
            progress,
            sessionId,
            timestamp:      Date.now()
        });

        return res.status(200).set(CORS).json({
            success:        true,
            violationCount: safeViolation,
            status:         safeStatus
        });

    } catch (err) {
        console.error("[/api/status/update]", err);
        return res.status(500).set(CORS)
            .json({ success: false, message: err.message });
    }
}
