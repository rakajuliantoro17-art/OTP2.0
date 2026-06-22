/* =====================================================
   SMANSASOO Security System 2.0
   UI ENGINE — Dashboard Panitia
===================================================== */

/* =========================
   GLOBAL UI STATE
========================= */
window.UI = {
    selectedStudent: null,
    alerts:          0,
    connection:      "offline",
    lastSync:        null,
    currentFilter:   "all",
    liveData:        [],          // data aktif dari Firebase / fallback dummy
    dummyData: [
        { id: "S001", name: "Ahmad Maulana", kelas: "XI-1",     progress: "40/40", violation: 0,  status: "safe"   },
        { id: "S002", name: "Budi Santoso",  kelas: "XI-2",     progress: "25/40", violation: 12, status: "warn"   },
        { id: "S003", name: "Citra Kirana",  kelas: "XI-3",     progress: "30/40", violation: 28, status: "danger" },
        { id: "S004", name: "Dewi Lestari",  kelas: "XI-1",     progress: "15/40", violation: 5,  status: "safe"   },
        { id: "S005", name: "Eko Pratama",   kelas: "XII-IPA",  progress: "10/40", violation: 32, status: "danger" }
    ]
};

/* =========================
   DOM HELPER
========================= */
function $(id) { return document.getElementById(id); }

/* =========================
   INITIALIZATION
========================= */
document.addEventListener("DOMContentLoaded", () => {

    // Render awal dengan dummy data agar UI tidak kosong
    UI.liveData = UI.dummyData;
    renderStudentsTable(UI.liveData);
    updateDashboardStats(UI.liveData);

    // OTP engine — defer agar otp.js sudah load
    if (typeof startOTPRefresh   === "function") startOTPRefresh();
    if (typeof startOTPCountdown === "function") startOTPCountdown();

    // Search input listener
    const search = $("studentSearch");
    if (search) search.addEventListener("input", e => filterTableBySearch(e.target.value));

    addAlert("SMANSASOO Security System 2.0 berhasil dimuat", "info");
    console.log("[UI] Control Center Ready");
});

/* =========================
   STATUS HELPER
========================= */
function getStatusColor(status) {
    const map = { safe: "#34c759", warn: "#ff9500", danger: "#ff3b30" };
    return map[status] || "#6e6e73";
}

function resolveStatus(violation) {
    if (violation >= 26) return "danger";
    if (violation >= 11) return "warn";
    return "safe";
}

/* =========================
   TABLE RENDER
========================= */
function renderStudentsTable(data) {
    const tbody = $("studentsTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:24px;opacity:.5">Tidak ada data siswa</td></tr>`;
        return;
    }

    data.forEach(student => {
        const violation = student.violation || 0;
        const status    = student.status || resolveStatus(violation);
        const color     = getStatusColor(status);
        const isMaster  = violation >= 26;

        const tr = document.createElement("tr");
        tr.onclick = () => openDrawer(student);

        tr.innerHTML = `
            <td>${student.name  || "-"}</td>
            <td>${student.kelas || student.class || "-"}</td>
            <td>${student.progress || "0/40"}</td>
            <td><b style="color:${color}">${violation}</b></td>
            <td class="${isMaster ? "unlock-master" : "unlock-normal"}"
                style="font-size:12px;font-weight:600;">
                ${isMaster ? "MASTER" : "NORMAL"}
            </td>
            <td style="color:${color};font-weight:700;text-transform:uppercase;">${status}</td>
        `;

        tbody.appendChild(tr);
    });
}

/* =========================
   TABLE FILTER BY STATUS
========================= */
function filterTable(keyword) {
    UI.currentFilter = keyword;
    const base = UI.liveData.length ? UI.liveData : UI.dummyData;

    const filtered = keyword === "all"
        ? base
        : base.filter(s => s.status === keyword);

    renderStudentsTable(filtered);
    addAlert("Filter: " + keyword.toUpperCase(), "info");
}

/* =========================
   TABLE SEARCH
========================= */
function filterTableBySearch(keyword) {
    const q    = keyword.toLowerCase().trim();
    const base = UI.liveData.length ? UI.liveData : UI.dummyData;

    const filtered = q
        ? base.filter(s =>
            (s.name  || "").toLowerCase().includes(q) ||
            (s.kelas || "").toLowerCase().includes(q)
          )
        : base;

    renderStudentsTable(filtered);
}

function refreshStudents() {
    renderStudentsTable(UI.liveData.length ? UI.liveData : UI.dummyData);
    addAlert("Tabel di-refresh", "info");
}

/* =========================
   STATS ENGINE
========================= */
function updateDashboardStats(data) {
    if (!data || !data.length) return;

    const safe   = data.filter(s => s.status === "safe").length;
    const warn   = data.filter(s => s.status === "warn").length;
    const danger = data.filter(s => s.status === "danger").length;
    const total  = data.length;

    if ($("statActive"))   $("statActive").innerText   = total;
    if ($("statWarning"))  $("statWarning").innerText  = warn;
    if ($("statCritical")) $("statCritical").innerText = danger;
    if ($("statOtp"))      $("statOtp").innerText      = window.OTP_STATS?.normal || 0;
    if ($("statMaster"))   $("statMaster").innerText   = window.OTP_STATS?.master || 0;

    // Simpan ke liveData agar filter & search pakai data terbaru
    UI.liveData = data;
}

/* =========================
   DRAWER ENGINE
========================= */
function openDrawer(student) {
    UI.selectedStudent = student;
    window.UI_STATE    = { selectedStudent: student }; // kompatibilitas otp.js

    const violation = student.violation || 0;
    const status    = student.status || resolveStatus(violation);

    if ($("d-name"))     $("d-name").innerText     = student.name  || "-";
    if ($("d-class"))    $("d-class").innerText     = student.kelas || student.class || "-";
    if ($("d-progress")) $("d-progress").innerText  = student.progress || "0/40";
    if ($("d-violation"))$("d-violation").innerText = violation;
    if ($("d-cbt"))      $("d-cbt").innerText       = student.autoSubmit ? "Auto Submit" : "Aktif";
    if ($("d-device"))   $("d-device").innerText    = student.device || "Unknown";

    const statusEl = $("d-status");
    if (statusEl) {
        statusEl.innerText   = status.toUpperCase();
        statusEl.className   = "drawer-status status-" + status;
    }

    // Riwayat pelanggaran
    const histEl = $("d-history");
    if (histEl) {
        const logs = student.logs || [];
        histEl.innerHTML = logs.length
            ? logs.map(l => `<div class="history-item">${l.type || l} — <small>${l.time ? new Date(l.time).toLocaleTimeString("id-ID") : ""}</small></div>`).join("")
            : `<div class="history-item">Belum ada pelanggaran</div>`;
    }

    const drawer = $("drawer");
    if (drawer) drawer.classList.add("open");
}

function closeDrawer() {
    const drawer = $("drawer");
    if (drawer) drawer.classList.remove("open");
    UI.selectedStudent = null;
    window.UI_STATE    = { selectedStudent: null };
}

/* =========================
   ALERT ENGINE
========================= */
function addAlert(message, type = "info") {
    const list = $("alertList");
    if (!list) return;

    UI.alerts++;

    const iconMap = { info: "ℹ️", warn: "⚠️", danger: "🚨", success: "✅" };
    const icon    = iconMap[type] || "ℹ️";
    const time    = new Date().toLocaleTimeString("id-ID");

    const item = document.createElement("div");
    item.className = `alert-item alert-${type}`;
    item.innerHTML = `
        <span class="alert-icon">${icon}</span>
        <span class="alert-msg">${message}</span>
        <span class="alert-time">${time}</span>
    `;

    list.prepend(item);

    // Batasi maksimal 20 alert di DOM
    const items = list.querySelectorAll(".alert-item");
    if (items.length > 20) items[items.length - 1].remove();

    const counter = $("alertCount");
    if (counter) counter.innerText = UI.alerts;
}

/* =========================
   FIREBASE STATUS INDICATOR
   Dipanggil dari firebase.js
========================= */
function setFirebaseStatus(isOnline) {
    UI.connection = isOnline ? "online" : "offline";

    const badge = $("serverStatus");
    const dot   = $("serverDot");
    const label = $("serverLabel");

    if (badge) {
        badge.innerText   = isOnline ? "ONLINE" : "OFFLINE";
        badge.className   = isOnline ? "badge safe" : "badge danger";
    }
    if (dot)   dot.style.background   = isOnline ? "#34c759" : "#ff3b30";
    if (label) label.innerText        = isOnline ? "ONLINE"  : "OFFLINE";
}

/* =========================
   EXPORT GLOBAL
========================= */
window.renderStudentsTable  = renderStudentsTable;
window.updateDashboardStats = updateDashboardStats;
window.filterTable          = filterTable;
window.filterTableBySearch  = filterTableBySearch;
window.refreshStudents      = refreshStudents;
window.openDrawer           = openDrawer;
window.closeDrawer          = closeDrawer;
window.addAlert             = addAlert;
window.setFirebaseStatus    = setFirebaseStatus;
