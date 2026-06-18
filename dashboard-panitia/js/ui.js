/* =====================================================
   SMANSASOO CBT CONTROL TOWER
   UI ENGINE
   Layer 7 Final
===================================================== */

/* =========================
   GLOBAL UI STATE
========================= */

window.UI = {

  selectedStudent: null,

  stats: {
    active: 0,
    warning: 0,
    critical: 0,
    otp: 0,
    master: 0
  }

};

/* =========================
   DOM HELPER
========================= */

function $(id){
  return document.getElementById(id);
}

/* =========================
   CLOCK ENGINE
========================= */

function startClock(){

  const clock = $("clock");

  if(!clock) return;

  setInterval(()=>{

    clock.innerText =
      new Date().toLocaleTimeString("id-ID");

  },1000);

}

/* =========================
   ALERT SYSTEM
========================= */

function addAlert(message){

  const list = $("alertList");

  if(!list) return;

  const item = document.createElement("div");

  item.className = "alert-item";

  item.innerHTML = `
    <small>
      ${new Date().toLocaleTimeString()}
    </small>
    <div>${message}</div>
  `;

  list.prepend(item);

  while(list.children.length > 20){
    list.removeChild(list.lastChild);
  }

}

/* =========================
   DRAWER SYSTEM
========================= */

function openDrawer(student){

  UI.selectedStudent = student;

  if($("drawer")){
    $("drawer").classList.add("active");
  }

  if($("d-name")) $("d-name").innerText = student.name || "-";
  if($("d-class")) $("d-class").innerText = student.class || "-";
  if($("d-progress")) $("d-progress").innerText = student.progress || "-";
  if($("d-violation")) $("d-violation").innerText = student.violation || 0;
  if($("d-status")) $("d-status").innerText = student.status || "-";

}

function closeDrawer(){

  if($("drawer")){
    $("drawer").classList.remove("active");
  }

}

/* =========================
   OTP MODAL
========================= */

function openOTPModal(code){

  if(!$("otpModal")) return;

  $("otpValue").innerText = code;

  $("otpModal").classList.add("active");

}

function closeOTPModal(){

  if($("otpModal")){
    $("otpModal").classList.remove("active");
  }

}

/* =========================
   GENERATE OTP FROM DRAWER
========================= */

function generateSelectedStudentOTP(){

  if(!UI.selectedStudent){

    addAlert("Tidak ada siswa dipilih");

    return;
  }

  const otp = sendStudentOTP(
    UI.selectedStudent.id || UI.selectedStudent.name
  );

  openOTPModal(otp);

}

/* =========================
   RENDER TABLE
========================= */

function renderStudentsTable(students){

  const tbody = $("tableBody");

  if(!tbody) return;

  tbody.innerHTML = "";

  Object.entries(students).forEach(([id,student])=>{

    const tr = document.createElement("tr");

    tr.dataset.id = id;

    tr.innerHTML = `
      <td>${student.name || "-"}</td>
      <td>${student.class || "-"}</td>
      <td>${student.progress || "0/0"}</td>
      <td>${student.violation || 0}</td>
      <td class="status-${student.status || 'safe'}">
        ${(student.status || "safe").toUpperCase()}
      </td>
    `;

    tr.onclick = ()=>{

      openDrawer({
        id:id,
        ...student
      });

    };

    tbody.appendChild(tr);

  });

}

/* =========================
   STATS ENGINE
========================= */

function renderStats(stats){

  if($("statActive"))
    $("statActive").innerText = stats.active || 0;

  if($("statWarning"))
    $("statWarning").innerText = stats.warning || 0;

  if($("statCritical"))
    $("statCritical").innerText = stats.critical || 0;

  if($("statOtp"))
    $("statOtp").innerText = stats.otp || 0;

  if($("statMaster"))
    $("statMaster").innerText = stats.master || 0;

}

/* =========================
   FILTER ENGINE
========================= */

function filterTable(type){

  const rows =
    document.querySelectorAll("#tableBody tr");

  rows.forEach(row=>{

    const statusCell =
      row.querySelector("td:last-child");

    if(!statusCell) return;

    const status =
      statusCell.innerText.toLowerCase();

    if(type==="all"){

      row.style.display="";

    }else{

      row.style.display =
        status.includes(type)
        ? ""
        : "none";

    }

  });

}

/* =========================
   GLOBAL OTP BUTTON
========================= */

function generateGlobalOTP(){

  const otp = triggerGlobalOTP();

  openOTPModal(otp);

  addAlert("GLOBAL OTP GENERATED");

}

/* =========================
   EVENT BUS BINDING
========================= */

if(window.EventBus){

  EventBus.on("students:update",(data)=>{

    renderStudentsTable(data);

  });

  EventBus.on("stats:update",(data)=>{

    renderStats(data);

  });

  EventBus.on("alert:new",(data)=>{

    addAlert(data.msg || data.message);

  });

}

/* =========================
   INIT UI
========================= */

function initUI(){

  startClock();

  console.log(
    "SMANSASOO UI ENGINE READY ✔"
  );

}

document.addEventListener(
  "DOMContentLoaded",
  initUI
);

/* =========================
   EXPORTS
========================= */

window.openDrawer = openDrawer;
window.closeDrawer = closeDrawer;

window.openOTPModal = openOTPModal;
window.closeOTPModal = closeOTPModal;

window.generateSelectedStudentOTP =
  generateSelectedStudentOTP;

window.generateGlobalOTP =
  generateGlobalOTP;

window.filterTable =
  filterTable;

window.addAlert =
  addAlert;
