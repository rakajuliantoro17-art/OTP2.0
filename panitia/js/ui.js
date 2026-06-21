/* =====================================================
   SMANSASOO Security System 2.0
   Control Center Engine - Dashboard Panitia (Refactored)
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
        { id: "S001", name: "Ahmad Maulana", kelas: "XI-1", progress: "40/40", violation: 0, status: "safe" },
        { id: "S002", name: "Budi Santoso", kelas: "XI-2", progress: "25/40", violation: 12, status: "warn" },
        { id: "S003", name: "Citra Kirana", kelas: "XI-3", progress: "30/40", violation: 28, status: "danger" },
        { id: "S004", name: "Dewi Lestari", kelas: "XI-1", progress: "15/40", violation: 5, status: "safe" },
        { id: "S005", name: "Eko Pratama", kelas: "XII-IPA", progress: "10/40", violation: 32, status: "danger" }
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
    
    // Inisialisasi awal menggunakan data dummy/lokal
    renderStudentsTable(UI.dummyData);
    updateDashboardStats(UI.dummyData);

    // Mencegah error jika fungsi OTP berada di file JS terpisah (otp.js)
    if (typeof generateSystemOTP === "function") generateSystemOTP();
    if (typeof startOTPCountdown === "function") startOTPCountdown();

    // Loop OTP Fallback (Bisa di-override oleh engine OTP utama jika ada)
    setInterval(() => {
        if (typeof generateSystemOTP === "function") generateSystemOTP();
    }, 60000);

    addAlert("SMANSASOO Security System 2.0 berhasil dimuat", "info");
    console.log("SMANSASOO Security System 2.0 - Control Center Ready");
});

/* =========================
   CLOCK ENGINE (Merged)
========================= */
function startClock() {
    const clock = $("clock");
    if (!clock) return;

    const updateTime = () => {
        clock.innerText = new Date().toLocaleTimeString("id-ID");
    };

    updateTime(); // Panggil sekali saat start
    setInterval(updateTime, 1000);
}

/* =========================
   STATUS COLOR HELPER
========================= */
function getStatusColor(status) {
    switch (status) {
        case "safe": return "#34c759";
        case "warn": return "#ff9500";
        case "danger": return "#ff3b30";
        default: return "#6e6e73";
    }
}

/* =========================
   TABLE ENGINE (Merged & Robust)
========================= */
function renderStudentsTable(data) {
    // Memastikan kompatibilitas ID tabel lama maupun baru
    const tbody = $("studentsTableBody") || $("tableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    data.forEach(student => {
        const tr = document.createElement("tr");
        tr.style.cursor = "pointer";
        tr.style.borderBottom = "1px solid rgba(255,255,255,.08)";
        tr.style.transition = "background 0.2s ease";

        tr.onmouseover = () => tr.style.background = "rgba(255,255,255,.08)";
        tr.onmouseout = () => tr.style.background = "transparent";
        
        // Kompatibilitas fungsi drawer (openDrawer vs openStudentDrawer)
        tr.onclick = () => {
            if (typeof openStudentDrawer === "function") {
                openStudentDrawer(student.id || student);
            } else {
                openDrawer(student);
            }
        };

        // Fallback properti (mendukung dummyData dan data Firebase)
        const studentName = student.name || '-';
        const studentClass = student.kelas || student.class || '-';
        const studentProgress = student.progress || "0%";
        const violationCount = student.violation || 0;
        
        let status = student.status || "safe";
        if (violationCount >= 25) status = "danger";
        else if (violationCount >= 10) status = "warn";

        const color = getStatusColor(status);
        const unlockType = violationCount >= 25 ? "MASTER" : "NORMAL";
        const unlockClass = violationCount >= 25 ? "unlock-master" : "unlock-normal";

        tr.innerHTML = `
            <td>${studentName}</td>
            <td>${studentClass}</td>
            <td>${studentProgress}</td>
            <td><b style="color:${color}">${violationCount}</b></td>
            <td class="${unlockClass}" style="font-size:12px; font-weight:600;">${unlockType}</td>
            <td style="color:${color}; font-weight:700; text-transform:uppercase;">${status}</td>
        `;

        tbody.appendChild(tr);
    });
}

/* =========================
   TABLE FILTER & SEARCH
========================= */
function filterTable(keyword) {
    let filtered = [];
    if (keyword === "all") {
        filtered = UI.dummyData;
    } else {
        filtered = UI.dummyData.filter(s => s.status === keyword);
    }
    renderStudentsTable(filtered);
    addAlert("Filter tabel: " + keyword.toUpperCase(), "info");
}

const searchInput = $("studentSearch");
if (searchInput) {
    searchInput.addEventListener("keyup", function() {
        const keyword = this.value.toLowerCase();
        const rows = document.querySelectorAll("#studentsTableBody tr, #tableBody tr");

        rows.forEach(row => {
            const text = row.innerText.toLowerCase();
            row.style.display = text.includes(keyword) ? "" : "none";
        });
    });
}

/* =========================
   STATS ENGINE
========================= */
function updateDashboardStats(data) {
    const safe = data.filter(s => s.status === "safe").length;
    const warn = data.filter(s => s.status === "warn").length;
    const danger = data.filter(s => s.status === "danger").length;
    const total = data.length;

    if ($("statActive")) $("statActive").innerText = total;
    if ($("statWarning")) $("statWarning").innerText = warn;
    if ($("statCritical")) $("statCritical").innerText = danger;
    if ($("statOtp")) $("statOtp").innerText = window.OTP_STATS?.normal || 0;
    if ($("statMaster"))
