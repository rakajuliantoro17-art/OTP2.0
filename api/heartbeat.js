import { db } from "./firebaseadmin.js";

function resolveStatus(count) {
    if (count >= 30) return "locked";
    if (count >= 26) return "critical";
    if (count >= 11) return "warning";
    return "safe";
}

// Tambah di paling atas setiap handler, sebelum method check
if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
}

export default async function handler(req, res) {
    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST")   return res.status(405).json({ success: false, message: "Method Not Allowed" });

    const { uid, sessionId = "default", violation = 0, timestamp = Date.now() } = req.body || {};

    if (!uid) return res.status(400).json({ success: false, message: "uid wajib diisi" });

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

        return res.status(200).json({ success: true, violationCount: safeViolation, status: safeStatus, onlineDuration });

    } catch (err) {
        console.error("[/api/heartbeat]", err);
        return res.status(500).json({ success: false, message: err.message });
    }
}
