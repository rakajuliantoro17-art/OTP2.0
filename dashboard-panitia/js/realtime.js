/* =====================================================
   SMANSASOO CBT CONTROL TOWER
   REALTIME EVENT ENGINE (LAYER 4–7 READY)
===================================================== */

/**
 * CORE FUNCTION:
 * - Sinkron siswa realtime
 * - Sinkron stats realtime
 * - Sinkron alert realtime
 * - Bridge ke Firebase (jika tersedia)
 * - Local fallback mode (tanpa Firebase tetap jalan)
 */

/* =========================
   GLOBAL STATE
========================= */

window.CBT_STATE = {
  students: {},
  stats: {},
  alerts: []
};

/* =========================
   EVENT BUS SYSTEM
========================= */

const EventBus = {

  listeners: {},

  on(event, callback){
    if(!this.listeners[event]){
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  },

  emit(event, data){
    if(this.listeners[event]){
      this.listeners[event].forEach(cb => cb(data));
    }
  }

};

/* =========================
   INIT FIREBASE SAFE
========================= */

function db(){
  return window.db || null;
}

/* =========================
   REALTIME STUDENTS STREAM
========================= */

function listenStudents(){

  if(!db()){
    console.warn("Realtime: Firebase not available (students offline mode)");
    return;
  }

  db().ref("students").on("value", (snap)=>{

    const data = snap.val() || {};

    CBT_STATE.students = data;

    EventBus.emit("students:update", data);

    console.log("Students synced:", Object.keys(data).length);

  });

}

/* =========================
   REALTIME STATS STREAM
========================= */

function listenStats(){

  if(!db()){
    console.warn("Realtime: Firebase not available (stats offline mode)");
    return;
  }

  db().ref("stats").on("value", (snap)=>{

    const data = snap.val() || {};

    CBT_STATE.stats = data;

    EventBus.emit("stats:update", data);

    console.log("Stats updated");

  });

}

/* =========================
   REALTIME ALERT STREAM
========================= */

function listenAlerts(){

  if(!db()){
    console.warn("Realtime: Firebase not available (alerts offline mode)");
    return;
  }

  db().ref("alerts").on("child_added", (snap)=>{

    const data = snap.val();

    CBT_STATE.alerts.unshift(data);

    EventBus.emit("alert:new", data);

    console.log("New alert:", data);

  });

}

/* =========================
   PUSH ALERT
========================= */

function pushRealtimeAlert(type, message){

  const payload = {
    type: type || "info",
    msg: message,
    time: Date.now()
  };

  CBT_STATE.alerts.unshift(payload);

  EventBus.emit("alert:new", payload);

  if(db()){
    db().ref("alerts").push(payload);
  }

}

/* =========================
   UPDATE STUDENT (VIOLATION / STATUS)
========================= */

function updateStudent(id, payload){

  if(!db()){
    console.warn("Realtime: offline update student skipped");
    return;
  }

  db().ref("students/" + id).update(payload);

}

/* =========================
   UPDATE STATS
========================= */

function updateStats(payload){

  if(!db()){
    console.warn("Realtime: offline stats update skipped");
    return;
  }

  db().ref("stats").set(payload);

}

/* =========================
   SYSTEM HEARTBEAT
========================= */

function heartbeat(){

  if(!db()){
    return;
  }

  db().ref("system/heartbeat").set({
    time: Date.now(),
    status: "live",
    activeStudents: Object.keys(CBT_STATE.students || {}).length
  });

}

/* =========================
   AUTO INIT SYSTEM
========================= */

function initRealtime(){

  console.log("CBT Realtime Engine starting...");

  listenStudents();
  listenStats();
  listenAlerts();

  setInterval(heartbeat, 5000);

  console.log("CBT Realtime Engine READY ✔");

}

/* =========================
   EVENT HOOK EXPORT
========================= */

window.EventBus = EventBus;
window.pushRealtimeAlert = pushRealtimeAlert;
window.updateStudent = updateStudent;
window.updateStats = updateStats;
window.initRealtime = initRealtime;

/* AUTO START */
initRealtime();
