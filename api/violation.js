/* =====================================================
   SMANSASOO CBT LOCK 2.0
   VERCEL SERVERLESS FUNCTION
   POST /api/violation
===================================================== */

require { initializeApp, getApps } from "firebase-admin/app";
require { getDatabase }            from "firebase-admin/database";

/* =========================
   FIREBASE ADMIN SINGLETON
========================= */
if (!getApps().length) {
    initializeApp({
        credential:  JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT),
        databaseURL: process.env.FIREBASE_DATABASE_URL
    });
}

const db = getDatabase();

/* =========================
   CORS HEADERS
========================= */
const CORS = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
};

/* =========================
   VIOLATION TYPES VALID
========================= */
const VALID_TYPES = new Set([
    "tab_switch", "window_blur", "right_click",
    "copy_action", "keyboard_shortcut",
    "fullscreen_exit", "suspicious_pattern", "unknown"
]);

/* =========================
   STATUS RESOLVER
========================= */
function resolveStatus(count) {
    if (count >= 30) return "locked";
    if (count >= 26) return "critical";
    if (count >= 11) return "warning";
    return "safe";
}

/* =========================
   MAIN HANDLER
========================= */
export default async function handler(req, res) {

    // Preflight CORS
    if (req.method === "OPTIONS") {
        return res.status(200).set(CORS).end();
    }

    if (req.method !== "POST") {
        return res.status(405).set(CORS)
            .json({ success: false, message: "Method Not Allowed" });
    }

    // Tolak request kadaluarsa > 30 detik
    const {
        uid,
        nama          = "-",
        kelas         = "-",
        violationType = "unknown",
        timestamp     = Date.now()
    } = req.body;

    if (!uid) {
        return res.status(400).set(CORS)
            .json({ success: false, message: "uid wajib diisi" });
    }

    if (!VALID_TYPES.has(violationType)) {
        return res.status(400).set(CORS)
            .json({ success: false, message: "violationType tidak dikenali" });
    }

    if (Date.now() - timestamp > 30000) {
        return res.status(400).set(CORS)
            .json({ success: false, message: "Request kadaluarsa" });
    }

    try {
        const studentRef = db.ref("students/" + uid);

        // Baca data siswa saat ini
        const snap     = await studentRef.once("value");
        const existing = snap.val() || {};

        // Violation count — server increment, tidak bisa turun
        const prevCount  = existing.violationCount || 0;
        const newCount   = prevCount + 1;
        const safeStatus = resolveStatus(newCount);

        // Update data siswa
        await studentRef.update({
            uid,
            nama,
            kelas,
            status:          safeStatus,
            violationCount:  newCount,
            lastViolation:   violationType,
            lastViolationAt: timestamp,
            updatedAt:       Date.now()
        });

        // Log detail violation — dipakai drawer panitia
        await db.ref("violations/" + uid + "/" + Date.now()).set({
            uid,
            nama,
            kelas,
            violationType,
            violationCount: newCount,
            status:         safeStatus,
            timestamp,
            serverTime:     Date.now()
        });

        // Auto submit jika baru capai >= 30
        if (newCount >= 30 && !existing.autoSubmit) {
            await studentRef.update({
                autoSubmit:  true,
                submittedAt: Date.now()
            });
        }

        // Push alert ke dashboard — hanya untuk event kritis
        const isCritical = ["tab_switch", "fullscreen_exit", "suspicious_pattern"].includes(violationType);
        if (isCritical || newCount >= 26) {
            await db.ref("alerts").push({
                type:      "violation",
                msg:       (nama || uid) + " — " + violationType + " (ke-" + newCount + ")",
                status:    safeStatus,
                uid,
                time:      Date.now()
            });
        }

        return res.status(200).set(CORS).json({
            success:        true,
            violationCount: newCount,
            status:         safeStatus,
            autoSubmit:     newCount >= 30
        });

    } catch (err) {
        console.error("[/api/violation]", err);
        return res.status(500).set(CORS)
            .json({ success: false, message: err.message });
    }
}
