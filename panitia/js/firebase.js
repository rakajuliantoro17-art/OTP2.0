/* =====================================================
   SMANSASOO CBT CONTROL TOWER
   FIREBASE BRIDGE ENGINE (LAYER 4 READY)
===================================================== */

/**
 * NOTE:
 * - Ini SAFE untuk Vercel static hosting
 * - Akan aktif FULL ketika Firebase config diisi
 * - Tidak crash jika Firebase belum dipasang
 */

/* =========================
   FIREBASE PLACEHOLDER CONFIG
========================= */

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "XXXX",
  appId: "XXXX"
};

/* =========================
   SAFE INIT WRAPPER
========================= */

let firebaseApp = null;
let db = null;

function initFirebase(){

  try{

    if(typeof firebase === "undefined"){
      console.warn("Firebase SDK belum di-load (safe mode active)");
      return false;
    }

    firebaseApp = firebase.initializeApp(firebaseConfig);
    db = firebase.database();

    console.log("Firebase CONNECTED ✔");

    return true;

  }catch(e){
    console.error("Firebase INIT ERROR:",e);
    return false;
  }
}

/* =========================
   REALTIME STUDENTS STREAM
========================= */

function listenStudents(callback){

  if(!db){
    console.warn("DB not ready");
    return;
  }

  db.ref("students").on("value", (snap)=>{
    const data = snap.val();
    if(callback) callback(data);
  });

}

/* =========================
   REALTIME STATS STREAM
========================= */

function listenStats(callback){

  if(!db){
    console.warn("DB not ready");
    return;
  }

  db.ref("stats").on("value", (snap)=>{
    const data = snap.val();
    if(callback) callback(data);
  });

}

/* =========================
   ALERT SYSTEM STREAM
========================= */

function pushAlert(data){

  if(!db){
    console.warn("DB not ready (alert skipped)");
    return;
  }

  db.ref("alerts").push({
    ...data,
    timestamp: Date.now()
  });

}

/* =========================
   OTP SYSTEM
========================= */

function sendOTP(studentId, otp){

  if(!db){
    console.warn("DB not ready (OTP skipped)");
    return;
  }

  db.ref("otp/"+studentId).set({
    otp: otp,
    created: Date.now(),
    status: "active"
  });

}

/* =========================
   GLOBAL OTP BROADCAST
========================= */

function sendGlobalOTP(otp){

  if(!db){
    console.warn("DB not ready (global OTP skipped)");
    return;
  }

  db.ref("otp/global").set({
    otp: otp,
    created: Date.now()
  });

}

/* =========================
   VIOLATION UPDATE SYSTEM
========================= */

function updateViolation(studentId, value){

  if(!db){
    console.warn("DB not ready (violation skipped)");
    return;
  }

  db.ref("students/"+studentId).update({
    violation: value
  });

}

/* =========================
   STATUS UPDATE SYSTEM
========================= */

function updateStatus(studentId, status){

  if(!db){
    console.warn("DB not ready (status skipped)");
    return;
  }

  db.ref("students/"+studentId).update({
    status: status
  });

}

/* =========================
   SYSTEM HEARTBEAT
========================= */

function systemHeartbeat(){

  if(!db){
    return;
  }

  db.ref("system/heartbeat").set({
    time: Date.now(),
    status: "active"
  });

}

/* AUTO INIT */
initFirebase();

/* OPTIONAL AUTO HEARTBEAT */
setInterval(systemHeartbeat, 5000);
