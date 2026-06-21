/* =====================================================
   SMANSASOO Security System 2.0
   OTP ENGINE
   Auto OTP + Unlock OTP + Auto Submit
===================================================== */

/* =========================
   OTP STATE
========================= */
window.OTP_STATE = {
    systemOTP: "000000",
    unlockOTP: null,
    expires: 60,
    generatedAt: Date.now(),
    lastTarget: null
};

/* =========================
   RANDOM OTP GENERATOR
========================= */
function generateOTPCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/* =========================
   SYSTEM OTP
   WARNING (11-25)
========================= */
function generateSystemOTP() {
    OTP_STATE.systemOTP = generateOTPCode();
    OTP_STATE.generatedAt = Date.now();
    OTP_STATE.expires = 60;

    console.log("SYSTEM OTP REFRESHED");

    if (window.db && typeof window.db.ref === 'function') {
        window.db.ref("system/otp").set({
            code: OTP_STATE.systemOTP,
            expires: 60,
            generatedAt: Date.now(),
            type: "system"
        });
    }

    return OTP_STATE.systemOTP;
}

/* =========================
   OTP COUNTDOWN
========================= */
function startOTPCountdown() {
    setInterval(() => {
        const elapsed = Math.floor((Date.now() - OTP_STATE.generatedAt) / 1000);
        OTP_STATE.expires = Math.max(0, 60 - elapsed);

        // Update realtime countdown ke Firebase setiap 1 detik
        if (window.db && typeof window.db.ref === 'function') {
            window.db.ref("system/otp/expires").set(OTP_STATE.expires);
        }
    }, 1000);
}

/* =========================
   AUTO REFRESH OTP
========================= */
function startOTPRefresh() {
    generateSystemOTP();
    
    // Auto refresh siklus OTP System tiap 60 detik
    setInterval(() => {
        generateSystemOTP();
    }, 60000);
}

/* =========================
   UNLOCK OTP
   CRITICAL (26-29)
========================= */
function generateUnlockOTP(studentId) {
    const otp = generateOTPCode();
    OTP_STATE.unlockOTP = otp;
    OTP_STATE.lastTarget = studentId;

    if (window.db && typeof window.db.ref === 'function') {
        window.db.ref("unlockOtp/" + studentId).set({
            otp: otp,
            created: Date.now(),
            status: "active",
            type: "unlock"
        });
    }

    if (typeof addAlert === "function") {
        addAlert("UNLOCK OTP diberikan kepada " + studentId, "warn");
    }

    return otp;
}

/* =========================
   REVOKE UNLOCK OTP
========================= */
function revokeUnlockOTP(studentId) {
    if (window.db && typeof window.db.ref === 'function') {
        window.db.ref("unlockOtp/" + studentId).update({
            status: "revoked"
        });
    }
}

/* =========================
   AUTO SUBMIT
   >= 30 VIOLATION
========================= */
function triggerAutoSubmit(studentId) {
    console.log("AUTO SUBMIT:", studentId);

    if (window.db && typeof window.db.ref === 'function') {
        window.db.ref("students/" + studentId).update({
            status: "submitted",
            autoSubmit: true,
            submittedAt: Date.now()
        });
    }

    if (typeof addAlert === "function") {
        addAlert("AUTO SUBMIT dijalankan untuk " + studentId, "danger");
    }
}

/* =========================
   VERIFY OTP
========================= */
function verifyOTP(inputOtp, targetOtp) {
    return String(inputOtp) === String(targetOtp);
}

/* =========================
   GET CURRENT SYSTEM OTP
========================= */
function getSystemOTP() {
    return OTP_STATE.systemOTP;
}

/* =========================
   GET CURRENT UNLOCK OTP
========================= */
function getUnlockOTP() {
    return OTP_STATE.unlockOTP;
}

/* =========================
   GET COUNTDOWN
========================= */
function getOTPCountdown() {
    return OTP_STATE.expires;
}

/* =========================
   DEBUG INFO
========================= */
function getOTPInfo() {
    return {
        systemOTP: OTP_STATE.systemOTP,
        unlockOTP: OTP_STATE.unlockOTP,
        expires: OTP_STATE.expires,
        generatedAt: OTP_STATE.generatedAt,
        lastTarget: OTP_STATE.lastTarget
    };
}

/* =========================
   AUTO START
========================= */
startOTPRefresh();
startOTPCountdown();

/* =========================
   GLOBAL EXPORT
========================= */
window.generateSystemOTP = generateSystemOTP;
window.generateUnlockOTP = generateUnlockOTP;
window.revokeUnlockOTP = revokeUnlockOTP;
window.triggerAutoSubmit = triggerAutoSubmit;
window.verifyOTP = verifyOTP;
window.getSystemOTP = getSystemOTP;
window.getUnlockOTP = getUnlockOTP;
window.getOTPCountdown = getOTPCountdown;
window.getOTPInfo = getOTPInfo;
