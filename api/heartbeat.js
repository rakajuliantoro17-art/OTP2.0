/* =====================================================
   SMANSASOO CBT LOCK 2.0
   VERCEL SERVERLESS FUNCTION
   POST /api/heartbeat

   Terima heartbeat dari moodle/cbtlock.js (tiap 5 detik)
   dan moodle/sync.js (tiap 8 detik)
   Update status online/offline siswa di Firebase
===================================================== */

const { db } = require("./Firebaseadmin");

/* =========================
   CORS HEADERS
========================= */
const CORS_HEADERS = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
};

/* =========================
   STATUS RESOLVER
   Konsisten dengan update.js dan ui.js
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

    if (body.timestamp && typeof body.timestamp !== "number") {
        errors.push("timestamp harus bertipe number (Unix ms)");
    }

    // Tolak heartbeat yang terlalu lama — mencegah replay
    if (body.timestamp) {
        const age = Date.now() - body.timestamp;
        if (age > 30000) errors.push("Heartbeat kadaluarsa (> 30 detik)");
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
        timestamp = Date.now()
    } = body;

    try {
        const ref      = db.ref("students/" + studentId);
        const snapshot = await ref.once("value");
        const existing = snapshot.val() || {};

        // Violation tidak boleh turun dari nilai yang sudah ada
        const safeViolation  = Math.max(existing.violation || 0, violation);
        const safeStatus     = resolveStatus(safeViolation);

        // Hitung durasi online siswa
        const onlineSince    = existing.onlineSince || timestamp;
        const onlineDuration = Math.floor((Date.now() - onlineSince) / 1000);

        const update = {
            studentId,
            sessionId,
            violation:     safeViolation,
            status:        safeStatus,
            online:        true,
            lastHeartbeat: timestamp,
            onlineSince,
            onlineDuration,
            updatedAt:     Date.now()
        };

        // Auto submit jika violation >= 30
        if (safeViolation >= 30 && !existing.autoSubmit) {
            update.autoSubmit  = true;
            update.submittedAt = Date.now();
        }

        await ref.update(update);

        res.setHeaders(CORS_HEADERS);
        return res.status(200).json({
            ok: true,
            studentId,
            violation:     safeViolation,
            status:        safeStatus,
            onlineDuration
        });

    } catch (err) {
        console.error("[/api/heartbeat] Firebase error:", err);
        res.setHeaders(CORS_HEADERS);
        return res.status(500).json({ error: "Internal server error", message: err.message });
    }
};
