/* =====================================================
   SMANSASOO CBT LOCK 2.0
   VERCEL SERVERLESS FUNCTION
   POST /api/violation
===================================================== */

const { db } = require("./Firebaseadmin");

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
module.exports = async function handler(req, res) {

    // Preflight CORS
    if (req.method === "OPTIONS") {
        res.setHeaders(CORS);
        return res.status(200).end();
    }

    if (req.method !== "POST") {
        res.setHeaders(CORS);
        return res.status(405).json({ success: false, message: "Method Not Allowed" });
    }

    const {
        uid,
        nama          = "-",
        kelas         = "-",
        violationType = "unknown",
        timestamp     = Date.now()
    } = req.body || {};

    if (!uid) {
        res.setHeaders(CORS);
        return res.status(400).json({ success: false, message: "uid wajib diisi" });
    }

    if (!VALID_TYPES.has(violationType)) {
        res.setHeaders(CORS);
        return res.status(400).json({ success: false, message: "violationType tidak dikenali" });
    }

    if (Date.now() - timestamp > 30000) {
        res.setHeaders(CORS);
        return res.status(400).json({ success: false, message: "Request kadaluarsa" });
    }

    try {
        const studentRef = db.ref("students/" + uid);

        const snap     = await studentRef.once("value");
        const existing = snap.val() || {};

        // Violation count — server-side increment, tidak bisa turun
        const prevCount  = existing.violationCount || 0;
        const newCount   = prevCount + 1;
        const safeStatus = resolveStatus(newCount);

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

        // Auto submit jika baru pertama kali capai >= 30
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
                type:   "violation",
                msg:    (nama || uid) + " — " + violationType + " (ke-" + newCount + ")",
                status: safeStatus,
                uid,
                time:   Date.now()
            });
        }

        res.setHeaders(CORS);
        return res.status(200).json({
            success:        true,
            violationCount: newCount,
            status:         safeStatus,
            autoSubmit:     newCount >= 30
        });

    } catch (err) {
        console.error("[/api/violation]", err);
        res.setHeaders(CORS);
        return res.status(500).json({ success: false, message: err.message });
    }
};
