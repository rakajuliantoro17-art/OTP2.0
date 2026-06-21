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
   GLOBAL OTP ENGINE
========================= */

window.GLOBAL_OTP = {

    code: "000000",

    expires: 60,

    generatedAt: Date.now(),

    source: "local",

    updatedBy: "system"

};

function generateSystemOTP() {

    GLOBAL_OTP.code =
        Math.floor(
            100000 + Math.random() * 900000
        ).toString();

    GLOBAL_OTP.generatedAt =
        Date.now();

    GLOBAL_OTP.expires = 60;

    addAlert("System OTP berhasil diperbarui");

}

function startOTPCountdown() {

    setInterval(() => {

        const elapsed =
            Math.floor(
                (Date.now() -
                    GLOBAL_OTP.generatedAt) / 1000
            );

        GLOBAL_OTP.expires =
            Math.max(0, 60 - elapsed);

    }, 1000);

}

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

    const statusEl =
        $("d-status");

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
