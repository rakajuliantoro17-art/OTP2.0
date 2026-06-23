/* =====================================================
   SMANSASOO Security System 2.0
   OTP ENGINE
   TOTP (Time-Based) + Master OTP + Auto Submit
===================================================== */

/* =========================
   KONSTANTA TOTP
   Harus identik dengan pengawas/js/unlock.js
========================= */
const TOTP_SECRET   = "SOOKO_HEBAT_2026";
const OTP_INTERVAL  = 60; // detik

/* =========================
   OTP STATE
========================= */
window.OTP_STATE = {
    systemOTP:   "000000",
    unlockOTP:   null,
    expires:     60,
    generatedAt: Date.now(),
    lastTarget:  null
};

window.OTP_STATS = {
    normal: 0,
    master: 0
};

/* =========================
   TOTP HASH ENGINE
   Sama persis dengan unlock.js
========================= */
function _totpHash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = (h << 5) - h + str.charCodeAt(i);
        h |= 0;
    }
    return Math.abs(h);
}

/* =========================
   SYSTEM OTP — TOTP
   Generate dari waktu + secret
   Otomatis sinkron di semua device
   tanpa perlu push ke Firebase
========================= */
function generateSystemOTP() {
    const t      = Math.floor(Date.now() / 1000 / OTP_INTERVAL);
    const h      = _totpHash(t + TOTP_SECRET);
    const code   = (h % 1000000).toString().padStart(6, "0");

    OTP_STATE.systemOTP   = code;
    OTP_STATE.generatedAt = Date.now();
    OTP_STATE.expires     = OTP_INTERVAL - (Math.floor(Date.now() / 1000) % OTP_INTERVAL);

    console.log("[OTP] System OTP:", code, "— sisa", OTP_STATE.expires, "detik");

    // Tidak perlu push ke Firebase — pengawas generate angka yang sama
    // via TOTP dengan secret dan interval yang identik

    return code;
}

/* =========================
   OTP COUNTDOWN
========================= */
function startOTPCountdown() {
    setInterval(() => {
        const now    = Math.floor(Date.now() / 1000);
        OTP_STATE.expires = OTP_INTERVAL - (now % OTP_INTERVAL);
    }, 1000);
}

/* =========================
   AUTO REFRESH OTP
   Sinkron dengan siklus waktu TOTP
========================= */
function startOTPRefresh() {
    // Generate pertama kali
    generateSystemOTP();

    // Refresh setiap detik — hanya update state jika siklus berubah
    let lastCycle = Math.floor(Date.now() / 1000 / OTP_INTERVAL);

    setInterval(() => {
        const currentCycle = Math.floor(Date.now() / 1000 / OTP_INTERVAL);
        if (currentCycle !== lastCycle) {
            lastCycle = currentCycle;
            generateSystemOTP();
            if (typeof addAlert === "function") {
                addAlert("System OTP diperbarui: " + OTP_STATE.systemOTP, "info");
            }
        }
    }, 1000);
}

/* =========================
   GLOBAL OTP
   Alias untuk System OTP
========================= */
function triggerGlobalOTP() {
    const otp = generateSystemOTP();
    if (typeof addAlert === "function") {
        addAlert("GLOBAL OTP aktif: " + otp, "info");
    }
    // Tampilkan di modal
    if (typeof openOTPModal === "function") openOTPModal(otp);
    console.log("[GLOBAL OTP]", otp);
    return otp;
}

/* =========================
   MASTER OTP
   Untuk siswa violation >= 26
   Di-push ke Firebase agar pengawas
   bisa melihatnya secara realtime
========================= */
function generateMasterOTP() {
    const t    = Math.floor(Date.now() / 1000 / OTP_INTERVAL);
    const h    = _totpHash(t + TOTP_SECRET + "_MASTER");
    const code = (h % 1000000).toString().padStart(6, "0");

    OTP_STATE.unlockOTP = code;
    OTP_STATS.master++;

    if (window.db && typeof window.db.ref === "function") {
        window.db.ref("system/masterOtp").set({
            code:    code,
            created: Date.now(),
            type:    "master",
            status:  "active"
        });
    }

    if (typeof addAlert === "function") {
        addAlert("MASTER OTP: " + code, "warn");
    }

    if (typeof openOTPModal === "function") openOTPModal(code);

    console.log("[MASTER OTP]", code);
    return code;
}

/* =========================
   SELECTED STUDENT OTP
   Dari drawer — trigger Master OTP
   jika violation >= 26
========================= */
function generateSelectedStudentOTP() {
    const student = window.UI_STATE?.selectedStudent;
    if (!student) {
        console.warn("[OTP] Tidak ada siswa dipilih");
        return;
    }

    if (student.violation >= 26) {
        return generateMasterOTP();
    } else {
        if (typeof addAlert === "function") {
            addAlert(student.name + " belum mencapai threshold Master OTP (violation < 26)", "info");
        }
    }
}

/* =========================
   REVOKE MASTER OTP
========================= */
function revokeMasterOTP() {
    if (window.db && typeof window.db.ref === "function") {
        window.db.ref("system/masterOtp").update({ status: "revoked" });
    }
    OTP_STATE.unlockOTP = null;
    console.log("[OTP] Master OTP dicabut");
}

/* =========================
   AUTO SUBMIT
   >= 30 VIOLATION
========================= */
function triggerAutoSubmit(studentId) {
    console.log("[OTP] AUTO SUBMIT:", studentId);

    if (window.db && typeof window.db.ref === "function") {
        window.db.ref("students/" + studentId).update({
            status:      "submitted",
            autoSubmit:  true,
            submittedAt: Date.now()
        });
    }

    if (typeof addAlert === "function") {
        addAlert("AUTO SUBMIT: " + studentId, "danger");
    }
}

/* =========================
   VERIFY OTP
========================= */
function verifyOTP(input, target) {
    return String(input).replace(/\s/g, "") === String(target).replace(/\s/g, "");
}

/* =========================
   GETTERS
========================= */
function getSystemOTP()    { return OTP_STATE.systemOTP; }
function getUnlockOTP()    { return OTP_STATE.unlockOTP; }
function getOTPCountdown() { return OTP_STATE.expires; }
function getOTPInfo()      { return { ...OTP_STATE, stats: OTP_STATS }; }

/* =========================
   AUTO START
========================= */
startOTPRefresh();
startOTPCountdown();

/* =========================
   GLOBAL EXPORT
========================= */
window.generateSystemOTP          = generateSystemOTP;
window.generateMasterOTP          = generateMasterOTP;
window.generateSelectedStudentOTP = generateSelectedStudentOTP;
window.revokeMasterOTP            = revokeMasterOTP;
window.triggerGlobalOTP           = triggerGlobalOTP;
window.triggerAutoSubmit          = triggerAutoSubmit;
window.verifyOTP                  = verifyOTP;
window.getSystemOTP               = getSystemOTP;
window.getUnlockOTP               = getUnlockOTP;
window.getOTPCountdown            = getOTPCountdown;
window.getOTPInfo                 = getOTPInfo;
