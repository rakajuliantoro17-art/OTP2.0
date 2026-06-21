/* =====================================================
   SMANSASOO Security System 2.0
   Control Center Engine
   Dashboard Panitia
===================================================== */

/* =========================
   GLOBAL UI STATE
========================= */

window.UI = {

    selectedStudent: null,

    alerts: 0,

    connection: "offline",

    lastSync: null,

    dummyData: [

        {
            id: "S001",
            name: "Ahmad Maulana",
            kelas: "XI-1",
            progress: "40/40",
            violation: 0,
            status: "safe"
        },

        {
            id: "S002",
            name: "Budi Santoso",
            kelas: "XI-2",
            progress: "25/40",
            violation: 12,
            status: "warn"
        },

        {
            id: "S003",
            name: "Citra Kirana",
            kelas: "XI-3",
            progress: "30/40",
            violation: 28,
            status: "danger"
        },

        {
            id: "S004",
            name: "Dewi Lestari",
            kelas: "XI-1",
            progress: "15/40",
            violation: 5,
            status: "safe"
        },

        {
            id: "S005",
            name: "Eko Pratama",
            kelas: "XII-IPA",
            progress: "10/40",
            violation: 32,
            status: "danger"
        }

    ]

};


/* =========================
   DOM HELPERS
========================= */

function $(id) {

    return document.getElementById(id);

}

/* =========================
   INITIALIZATION
========================= */

document.addEventListener("DOMContentLoaded", () => {

    startClock();

    renderStudentsTable(
        UI.dummyData
    );

    updateDashboardStats(
        UI.dummyData
    );

    generateSystemOTP();

    startOTPCountdown();

    setInterval(() => {

        generateSystemOTP();

    }, 60000);

    addAlert(
        "SMANSASOO Security System 2.0 berhasil dimuat"
    );

    console.log(
        "SMANSASOO Security System 2.0 - Control Center Ready"
    );

});

/* =========================
   CLOCK ENGINE
========================= */

function startClock() {

    const clock = $("clock");

    if (!clock) return;

    setInterval(() => {

        clock.innerText =
            new Date().toLocaleTimeString(
                "id-ID"
            );

    }, 1000);

}

/* =========================
   STATUS COLOR
========================= */

function getStatusColor(status) {

    switch (status) {

        case "safe":
            return "#34c759";

        case "warn":
            return "#ff9500";

        case "danger":
            return "#ff3b30";

        default:
            return "#6e6e73";

    }

}

/* =========================
   TABLE ENGINE
========================= */

function renderStudentsTable(data) {

    const tbody = $("tableBody");

    if (!tbody) return;

    tbody.innerHTML = "";

    data.forEach(student => {

        const tr =
            document.createElement("tr");

        tr.style.cursor = "pointer";

        tr.style.borderBottom =
            "1px solid rgba(255,255,255,.08)";

        tr.onmouseover = () => {

            tr.style.background =
                "rgba(255,255,255,.08)";

        };

        tr.onmouseout = () => {

            tr.style.background =
                "transparent";

        };

        tr.onclick = () =>
            openDrawer(student);

        const color =
            getStatusColor(student.status);

        tr.innerHTML = `

            <td>${student.name}</td>

            <td>${student.kelas}</td>

            <td>${student.progress}</td>

            <td>
                <b>${student.violation}</b>
            </td>

            <td
                style="
                    color:${color};
                    font-weight:700;
                    text-transform:uppercase;
                "
            >
                ${student.status}
            </td>

        `;

        tbody.appendChild(tr);

    });

}

/* =========================
   TABLE FILTER
========================= */

function filterTable(keyword) {

    let filtered = [];

    if (keyword === "all") {

        filtered = UI.dummyData;

    } else {

        filtered =
            UI.dummyData.filter(
                s => s.status === keyword
            );

    }

    renderStudentsTable(filtered);

    addAlert(
        "Filter tabel: " +
        keyword.toUpperCase()
    );

}

/* =========================
   STATS ENGINE
========================= */

function updateDashboardStats(data) {

    const safe =
        data.filter(
            s => s.status === "safe"
        ).length;

    const warn =
        data.filter(
            s => s.status === "warn"
        ).length;

    const danger =
        data.filter(
            s => s.status === "danger"
        ).length;

    const total =
        data.length;

    if ($("statActive"))
        $("statActive").innerText =
        total;

    if ($("statWarning"))
        $("statWarning").innerText =
        warn;

    if ($("statCritical"))
        $("statCritical").innerText =
        danger;

    if ($("statOtp"))
        $("statOtp").innerText =
        GLOBAL_OTP.code;

    if ($("statMaster"))
        $("statMaster").innerText =
        "READY";

}

/* =========================
   DRAWER ENGINE
========================= */

function openDrawer(student) {

    UI.selectedStudent =
        student;

    $("d-name").innerText =
        student.name;

    $("d-class").innerText =
        student.kelas;

    $("d-progress").innerText =
        student.progress;

    $("d-violation").innerText =
        student.violation;

    const color =
        getStatusColor(
            student.status
        );

    const statusEl = $("d-status");

   statusEl.className =
    "drawer-status";

   switch(student.status){

    case "safe":
        statusEl.classList.add("status-safe");
        break;

    case "warn":
        statusEl.classList.add("status-warn");
        break;

    case "danger":
        statusEl.classList.add("status-danger");
        break;

}

statusEl.innerText =
    student.status.toUpperCase();

    statusEl.style.color =
        color;

    statusEl.style.fontWeight =
        "bold";

    $("drawer")
        ?.classList.add("active");

}

function closeDrawer() {

    $("drawer")
        ?.classList.remove("active");

}

/* =========================
   MASTER OTP
========================= */

function generateSelectedStudentOTP() {

    if (!UI.selectedStudent)
        return;

    const otp =
        Math.floor(
            100000 +
            Math.random() * 900000
        );

    openOTPModal(otp);

    addAlert(
        "Master OTP diberikan kepada " +
        UI.selectedStudent.name
    );

    closeDrawer();

}
function addAlert(message,type="info"){

    const list =
        document.getElementById("alertList");

    if(!list) return;

    const item =
        document.createElement("div");

    item.className =
        "alert-item " + type;

    item.innerHTML = `

        <div>
            ${message}
        </div>

        <div class="alert-time">
            ${new Date()
            .toLocaleTimeString("id-ID")}
        </div>

    `;

    list.prepend(item);

    while(list.children.length > 50){

        list.removeChild(
            list.lastChild
        );

    }

    const counter =
        document.getElementById(
            "alertCount"
        );

    if(counter){

        counter.innerText =
            list.children.length;

    }

}
/* =========================
   OTP MODAL
========================= */

function openOTPModal(otpValue) {

    const modal =
        $("otpModal");

    if (!modal)
        return;

    $("otpValue").innerText =
        otpValue;

    modal.classList.add(
        "active"
    );

}

function closeOTPModal() {

    $("otpModal")
        ?.classList.remove(
            "active"
        );

}

/* =========================
   ALERT SYSTEM
========================= */

function addAlert(message) {

    const list =
        $("alertList");

    if (!list)
        return;

    const item =
        document.createElement(
            "div"
        );

    item.style.padding =
        "10px";

    item.style.marginBottom =
        "8px";

    item.style.borderRadius =
        "10px";

    item.style.background =
        "rgba(255,255,255,.08)";

    item.style.borderLeft =
        "4px solid #007aff";

    item.innerHTML = `

        <div
            style="
                font-size:10px;
                opacity:.7;
            "
        >
            ${new Date()
                .toLocaleTimeString("id-ID")}
        </div>

        <div
            style="
                font-size:13px;
            "
        >
            ${message}
        </div>

    `;

    list.prepend(item);

    while (
        list.children.length > 10
    ) {

        list.removeChild(
            list.lastChild
        );

    }

}

/* ====================================
   SIDEBAR LIVE SYNC
==================================== */

function syncSidebarStats(){

    if(!window.CBT_STATE) return;

    const students =
        Object.values(
            CBT_STATE.students || {}
        );

    const active =
        students.length;

    const warn =
        students.filter(
            s => s.status === "warn"
        ).length;

    const danger =
        students.filter(
            s => s.status === "danger"
        ).length;

    const unlock =
        students.filter(
            s => (s.unlockCount || 0) > 0
        ).length;

    document.getElementById("sActive").innerText =
        active;

    document.getElementById("sWarn").innerText =
        warn;

    document.getElementById("sDanger").innerText =
        danger;

    const unlockEl =
        document.getElementById("unlockCounter");

    if(unlockEl)
        unlockEl.innerText = unlock;

}
