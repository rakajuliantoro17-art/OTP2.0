/* =====================================================
   SMANSASOO CBT LOCK 2.0
   VERCEL SERVERLESS FUNCTION
   POST /api/heartbeat
===================================================== */

import { db } from "./firebaseadmin.js";

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
        return res.status(200).setHeaders(CORS).end();

    if (req.method !== "POST")
        return res.status(405).setHeaders(CORS)
            .json({ success: false, message: "Method Not Allowed" });

    const {
        uid,
        sessionId = "default",
        violation = 0,
        timestamp = Date.now()
    } = req.body || {};

    if (!uid)
        return res.status(400).setHeaders(CORS)
            .json({ success: false, message: "uid wajib diisi" });

    if (Date.now() - timestamp > 30000)
        return res.status(400).setHeaders(CORS)
            .json({ success: false, message: "Request kadaluarsa" });

    try {
        const ref      = db.ref("students/" + uid);
        const snap     = await ref.once("value");
        const existing = snap.val() || {};

        const safeViolation  = Math.max(existing.violationCount || 0, violation);
        const safeStatus     = resolveStatus(safeViolation);
        const onlineSince    = existing.onlineSince || timestamp;
        const onlineDuration = Math.floor((Date.now() - onlineSince) / 1000);

        const update = {
            uid, sessionId,
            violationCount: safeViolation,
            status:         safeStatus,
            online:         true,
            lastHeartbeat:  timestamp,
            onlineSince,
            onlineDuration,
            updatedAt:      Date.now()
        };

        if (safeViolation >= 30 && !existing.autoSubmit) {
            update.autoSubmit  = true;
            update.submittedAt = Date.now();
        }

        await ref.update(update);

        return res.status(200).setHeaders(CORS).json({
            success:        true,
            violationCount: safeViolation,
            status:         safeStatus,
            onlineDuration
        });

    } catch (err) {
        console.error("[/api/heartbeat]", err);
        return res.status(500).setHeaders(CORS)
            .json({ success: false, message: err.message });
    }
}
