/* =====================================================
   SMANSASOO CBT LOCK 2.0
   VERCEL SERVERLESS FUNCTION
   POST /api/violation
===================================================== */

import { db } from "./firebaseadmin.js";

const CORS = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
};

const VALID_TYPES = new Set([
    "tab_switch", "window_blur", "right_click",
    "copy_action", "keyboard_shortcut",
    "fullscreen_exit", "suspicious_pattern", "unknown"
]);

function resolveStatus(count) {
    if (count >= 30) return "locked";
    if (count >= 26) return "critical";
    if (count >= 11) return "warning";
    return "safe";
}

export default async function handler(req, res) {

    if (req.method === "OPTIONS") {
        return res.status(200).setHeaders(CORS).end();
    }

    if (req.method !== "POST") {
        return res.status(405).setHeaders(CORS)
            .json({ success: false, message: "Method Not Allowed" });
    }

    const {
        uid,
        nama          = "-",
        kelas         = "-",
        violationType = "unknown",
        timestamp     = Date.now()
    } = req.body || {};

    if (!uid)
        return res.status(400).setHeaders(CORS)
            .json({ success: false, message: "uid wajib diisi" });

    if (!VALID_TYPES.has(violationType))
        return res.status(400).setHeaders(CORS)
            .json({ success: false, message: "violationType tidak dikenali" });

    if (Date.now() - timestamp > 30000)
        return res.status(400).setHeaders(CORS)
            .json({ success: false, message: "Request kadaluarsa" });

    try {
        const ref      = db.ref("students/" + uid);
        const snap     = await ref.once("value");
        const existing = snap.val() || {};

        const newCount   = (existing.violationCount || 0) + 1;
        const safeStatus = resolveStatus(newCount);

        await ref.update({
            uid, nama, kelas,
            status:          safeStatus,
            violationCount:  newCount,
            lastViolation:   violationType,
            lastViolationAt: timestamp,
            updatedAt:       Date.now()
        });

        await db.ref("violations/" + uid + "/" + Date.now()).set({
            uid, nama, kelas, violationType,
            violationCount: newCount,
            status:         safeStatus,
            timestamp,
            serverTime:     Date.now()
        });

        if (newCount >= 30 && !existing.autoSubmit) {
            await ref.update({ autoSubmit: true, submittedAt: Date.now() });
        }

        const isCritical = ["tab_switch", "fullscreen_exit", "suspicious_pattern"]
            .includes(violationType);
        if (isCritical || newCount >= 26) {
            await db.ref("alerts").push({
                type:   "violation",
                msg:    (nama || uid) + " — " + violationType + " (ke-" + newCount + ")",
                status: safeStatus,
                uid,
                time:   Date.now()
            });
        }

        return res.status(200).setHeaders(CORS).json({
            success:        true,
            violationCount: newCount,
            status:         safeStatus,
            autoSubmit:     newCount >= 30
        });

    } catch (err) {
        console.error("[/api/violation]", err);
        return res.status(500).setHeaders(CORS)
            .json({ success: false, message: err.message });
    }
}
