/* =====================================================
   SMANSASOO CBT LOCK 2.0
   VERCEL SERVERLESS FUNCTION
   POST /api/status/update
   
   Terima sync payload dari moodle/sync.js
   Tulis data lengkap siswa ke Firebase Realtime DB
===================================================== */

const { db } = require("../Firebaseadmin");

/* =========================
   CORS HEADERS
   Moodle dan Vercel beda domain —
   wajib ada CORS agar fetch tidak diblock
========================= */
const CORS_HEADERS = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
};

/* =========================
   STATUS RESOLVER
   Konsisten dengan sync.js dan ui.js
========================= */
function resolveStatus(violation) {
    if (violation >= 30) return "locked";
    if (violation >= 26) return "critical";
    if (violation >= 11) return "warning";
    return "safe";
}

/* =========================
   PAYLOAD VALIDATOR
========================= */
function validate(body) {
    const errors = [];

    if (!body.studentId || typeof body.studentId !== "string") {
        errors.push("studentId wajib diisi dan bertipe string");
    }

    if (body.violation !== undefined && typeof body.violation !== "number") {
        errors.push("violation harus bertipe number");
    }

    if (body.timestamp && typeof body.timestamp !== "number") {
        errors.push("timestamp harus bertipe number (Unix ms)");
    }

    // Tolak request yang terlalu lama (> 30 detik) — mencegah replay attack
    if (body.timestamp) {
        const age = Date.now() - body.timestamp;
        if (age > 30000) errors.push("Request kadaluarsa (> 30 detik)");
    }

    return errors;
}

/* =========================
   MAIN HANDLER
========================= */
module.exports = async function handler(req, res) {

    // Preflight CORS
    if (req.method === "OPTIONS") {
        res.setHeaders(CORS_HEADERS);
        return res.status(200).end();
    }

    // Method guard
    if (req.method !== "POST") {
        res.setHeaders(CORS_HEADERS);
        return res.status(405).json({ error: "Method not allowed" });
    }

    const body = req.body || {};

    // Validasi payload
    const errors = validate(body);
    if (errors.length) {
        res.setHeaders(CORS_HEADERS);
        return res.status(400).json({ error: "Payload tidak valid", details: errors });
    }

    const {
        studentId,
        sessionId = "default",
        violation = 0,
        progress  = "0/40",
        timestamp = Date.now()
    } = body;

    try {
        const ref      = db.ref("students/" + studentId);
        const snapshot = await ref.once("value");
        const existing = snapshot.val() || {};

        // Hanya update jika violation tidak turun (mencegah manipulasi client)
        const safeViolation = Math.max(existing.violation || 0, violation);
        const safeStatus    = resolveStatus(safeViolation);

        const update = {
            studentId,
            sessionId,
            violation: safeViolation,
            status:    safeStatus,
            progress,
            lastSync:  timestamp,
            updatedAt: Date.now()
        };

        // Tambah flag autoSubmit jika violation >= 30
        if (safeViolation >= 30 && !existing.autoSubmit) {
            update.autoSubmit  = true;
            update.submittedAt = Date.now();
        }

        await ref.update(update);

        // Log ke Firebase untuk audit trail
        await db.ref("logs/" + studentId).push({
            type:      "status_update",
            violation: safeViolation,
            status:    safeStatus,
            progress,
            sessionId,
            timestamp: Date.now()
        });

        res.setHeaders(CORS_HEADERS);
        return res.status(200).json({
            ok:        true,
            studentId,
            violation: safeViolation,
            status:    safeStatus
        });

    } catch (err) {
        console.error("[/api/status/update] Firebase error:", err);
        res.setHeaders(CORS_HEADERS);
        return res.status(500).json({ error: "Internal server error", message: err.message });
    }
};
