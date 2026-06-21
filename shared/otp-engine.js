/* =====================================================
   SMANSASOO CBT LOCK 2.0
   CORE OTP ENGINE
   GLOBAL AUTH UNLOCK SYSTEM
===================================================== */

/* =========================
   OTP STATE
========================= */

const OTP_ENGINE = {

    currentGlobalOTP: null,

    masterOTP: null,

    history: [],

    issued: {},

    expiryMap: {}

};

/* =========================
   INIT OTP SYSTEM
========================= */

function initOTPSystem() {

    generateGlobalOTP();

    logOTP("OTP SYSTEM INITIALIZED");

    // auto refresh global OTP
    setInterval(() => {

        generateGlobalOTP();

    }, SMANSASOO.OTP.GLOBAL_REFRESH_MS);

}

/* =========================
   GLOBAL OTP GENERATOR
========================= */

function generateGlobalOTP() {

    const otp = generateOTP();

    OTP_ENGINE.currentGlobalOTP = otp;

    OTP_ENGINE.history.unshift({
        type: "GLOBAL",
        otp: otp,
        time: Date.now()
    });

    OTP_ENGINE.history = OTP_ENGINE.history.slice(0, 20);

    logOTP("GLOBAL OTP GENERATED → " + otp);

    emitEvent("OTP_GLOBAL_UPDATE", { otp });

    return otp;

}

/* =========================
   MASTER OTP GENERATOR
========================= */

function generateMasterOTP() {

    const otp = generateOTP();

    OTP_ENGINE.masterOTP = otp;

    logOTP("MASTER OTP GENERATED → " + otp);

    emitEvent("OTP_MASTER_UPDATE", { otp });

    return otp;

}

/* =========================
   ISSUE OTP FOR STUDENT
========================= */

function issueStudentOTP(studentId) {

    const otp = generateOTP();

    OTP_ENGINE.issued[studentId] = otp;

    OTP_ENGINE.expiryMap[studentId] =
        Date.now() + SMANSASOO.OTP.EXPIRY_MS;

    logOTP(`OTP ISSUED → ${studentId} = ${otp}`);

    emitEvent("OTP_STUDENT", {

        studentId,

        otp

    });

    return otp;

}

/* =========================
   VALIDATE OTP
========================= */

function validateOTP(inputOtp, studentId = null) {

    // MASTER OTP CHECK
    if (inputOtp === OTP_ENGINE.masterOTP) {

        logOTP("MASTER OTP USED");

        return {
            valid: true,
            type: "MASTER"
        };

    }

    // GLOBAL OTP CHECK
    if (inputOtp === OTP_ENGINE.currentGlobalOTP) {

        logOTP("GLOBAL OTP USED");

        return {
            valid: true,
            type: "GLOBAL"
        };

    }

    // STUDENT OTP CHECK
    if (studentId &&
        OTP_ENGINE.issued[studentId] === inputOtp) {

        const expired =
            Date.now() >
            OTP_ENGINE.expiryMap[studentId];

        if (expired) {

            logOTP("OTP EXPIRED → " + studentId);

            return {
                valid: false,
                reason: "EXPIRED"
            };

        }

        logOTP("STUDENT OTP VALID → " + studentId);

        return {
            valid: true,
            type: "STUDENT"
        };

    }

    logOTP("INVALID OTP ATTEMPT");

    return {
        valid: false,
        reason: "INVALID"
    };

}

/* =========================
   REVOKE OTP
========================= */

function revokeOTP(studentId) {

    delete OTP_ENGINE.issued[studentId];

    delete OTP_ENGINE.expiryMap[studentId];

    logOTP("OTP REVOKED → " + studentId);

    emitEvent("OTP_REVOKED", { studentId });

}

/* =========================
   FORCE RESET OTP SYSTEM
========================= */

function resetOTPSystem() {

    OTP_ENGINE.currentGlobalOTP = null;

    OTP_ENGINE.masterOTP = null;

    OTP_ENGINE.issued = {};

    OTP_ENGINE.expiryMap = {};

    logOTP("OTP SYSTEM RESET");

    emitEvent("OTP_RESET", {});

}

/* =========================
   OTP LOGGING
========================= */

function logOTP(text) {

    console.log("[SMANSASOO OTP] " + text);

}

/* =========================
   EXPORT GLOBAL
========================= */

window.OTP_ENGINE = OTP_ENGINE;

window.initOTPSystem = initOTPSystem;

window.generateGlobalOTP = generateGlobalOTP;

window.generateMasterOTP = generateMasterOTP;

window.issueStudentOTP = issueStudentOTP;

window.validateOTP = validateOTP;

window.revokeOTP = revokeOTP;

window.resetOTPSystem = resetOTPSystem;
