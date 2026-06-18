/* =====================================================
   SMANSASOO CBT CONTROL TOWER
   OTP ENGINE MODULE (LAYER 4–7 READY)
===================================================== */

/**
 * FEATURES:
 * - Generate OTP lokal
 * - Global OTP broadcast
 * - OTP per siswa
 * - Firebase ready hook
 * - Safe fallback (tanpa Firebase tetap jalan)
 */

/* =========================
   OTP STATE
========================= */

let OTP_STATE = {
  lastGenerated: null,
  lastTarget: null
};

/* =========================
   RANDOM OTP GENERATOR
========================= */

function generateOTPCode(){

  return Math.floor(100000 + Math.random() * 900000);

}

/* =========================
   LOCAL OTP (UI ONLY)
========================= */

function createLocalOTP(){

  const otp = generateOTPCode();

  OTP_STATE.lastGenerated = otp;

  console.log("LOCAL OTP:", otp);

  return otp;
}

/* =========================
   GLOBAL OTP (ALL STUDENTS)
========================= */

function triggerGlobalOTP(){

  const otp = generateOTPCode();

  OTP_STATE.lastGenerated = otp;
  OTP_STATE.lastTarget = "GLOBAL";

  alert("GLOBAL OTP GENERATED → " + otp);

  /* FIREBASE HOOK */
  if(window.db){
    window.db.ref("otp/global").set({
      otp: otp,
      created: Date.now(),
      scope: "global"
    });
  }

  /* OPTIONAL ALERT HOOK */
  if(typeof pushAlert === "function"){
    pushAlert({
      type:"warn",
      msg:"GLOBAL OTP GENERATED",
      otp:otp
    });
  }

  return otp;
}

/* =========================
   STUDENT OTP
========================= */

function sendStudentOTP(studentId){

  const otp = generateOTPCode();

  OTP_STATE.lastGenerated = otp;
  OTP_STATE.lastTarget = studentId;

  alert("OTP → " + otp + " (Student ID: " + studentId + ")");

  /* FIREBASE */
  if(window.db){
    window.db.ref("otp/" + studentId).set({
      otp: otp,
      created: Date.now(),
      status: "active"
    });
  }

  /* ALERT SYSTEM */
  if(typeof pushAlert === "function"){
    pushAlert({
      type:"info",
      msg:"OTP SENT TO STUDENT " + studentId
    });
  }

  return otp;
}

/* =========================
   VERIFY OTP (OPTIONAL FUTURE)
========================= */

function verifyOTP(inputOtp, targetOtp){

  return String(inputOtp) === String(targetOtp);

}

/* =========================
   REVOKE OTP
========================= */

function revokeOTP(studentId){

  if(window.db){
    window.db.ref("otp/" + studentId).update({
      status:"revoked"
    });
  }

  if(typeof pushAlert === "function"){
    pushAlert({
      type:"danger",
      msg:"OTP REVOKED → " + studentId
    });
  }

}

/* =========================
   QUICK DEBUG
========================= */

function getLastOTP(){
  return OTP_STATE.lastGenerated;
}

/* EXPORT FOR GLOBAL USE */
window.triggerGlobalOTP = triggerGlobalOTP;
window.sendStudentOTP = sendStudentOTP;
window.createLocalOTP = createLocalOTP;
window.revokeOTP = revokeOTP;
window.verifyOTP = verifyOTP;
window.getLastOTP = getLastOTP;
