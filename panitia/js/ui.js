/* =====================================================
   SMANSASOO CBT CONTROL TOWER
   UI ENGINE & LOGIC (DASHBOARD PANITIA)
===================================================== */

/* =========================
   GLOBAL UI STATE
========================= */
window.UI = {
    selectedStudent: null,
    alerts: 0,
    // Data Dummy (Simulasi Siswa)
    dummyData: [
        { id: "S001", name: "Ahmad Maulana", kelas: "XI-1", progress: "40/40", violation: 0, status: "safe" },
        { id: "S002", name: "Budi Santoso", kelas: "XI-2", progress: "25/40", violation: 12, status: "warn" },
        { id: "S003", name: "Citra Kirana", kelas: "XI-3", progress: "30/40", violation: 28, status: "danger" },
        { id: "S004", name: "Dewi Lestari", kelas: "XI-1", progress: "15/40", violation: 5, status: "safe" },
        { id: "S005", name: "Eko Pratama", kelas: "XII-IPA", progress: "10/40", violation: 32, status: "danger" }
    ]
};

/* =========================
   DOM HELPERS & INIT
========================= */
function $(id) {
    return document.getElementById(id);
}

document.addEventListener("DOMContentLoaded", () => {
    startClock();
    renderStudentsTable(UI.dummyData);
    updateDashboardStats(UI.dummyData);
    
    addAlert("Sistem UI berhasil dimuat. Mode: Local Dummy");
    console.log("SMANSASOO UI ENGINE READY ✔");
});

/* =========================
   CLOCK ENGINE
========================= */
function startClock() {
    const clock = $("clock");
    if (!clock) return;
    setInterval(() => {
        clock.innerText = new Date().toLocaleTimeString("id-ID");
    }, 1000);
}

/* =========================
   TABLE ENGINE
========================= */
function renderStudentsTable(data) {
    const tbody = $("tableBody"); // <-- Disesuaikan dengan HTML Anda
    if (!tbody) return;
    tbody.innerHTML = ""; 

    data.forEach(student => {
        const tr = document.createElement("tr");
        tr.style.cursor = "pointer";
        tr.style.borderBottom = "1px solid rgba(0,0,0,0.05)";
        
        // Efek hover
        tr.onmouseover = () => tr.style.backgroundColor = "rgba(255,255,255,0.4)";
        tr.onmouseout = () => tr.style.backgroundColor = "transparent";

        // Klik baris untuk buka Drawer
        tr.onclick = () => openDrawer(student);

        // Warna teks status
        let color = student.status === 'safe' ? 'green' : (student.status === 'warn' ? 'orange' : 'red');

        tr.innerHTML = `
            <td style="padding:12px;">${student.name}</td>
            <td style="padding:12px;">${student.kelas}</td>
            <td style="padding:12px;">${student.progress}</td>
            <td style="padding:12px;"><b>${student.violation}</b></td>
            <td style="padding:12px; font-weight:bold; color:${color}; text-transform:uppercase;">
                ${student.status}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Fungsi filter saat klik menu sidebar (Dashboard, Aman, Warning, Critical)
function filterTable(keyword) {
    let filtered;
    if (keyword === 'all') {
        filtered = UI.dummyData;
    } else if (['safe', 'warn', 'danger'].includes(keyword)) {
        filtered = UI.dummyData.filter(s => s.status === keyword);
    }
    renderStudentsTable(filtered);
    addAlert(`Tabel difilter berdasarkan: ${keyword.toUpperCase()}`);
}

/* =========================
   STATS ENGINE
========================= */
function updateDashboardStats(data) {
    const safe = data.filter(s => s.status === "safe").length;
    const warn = data.filter(s => s.status === "warn").length;
    const danger = data.filter(s => s.status === "danger").length;
    const total = data.length;

    // Update panel statistik utama
    if($("statActive")) $("statActive").innerText = total;
    if($("statWarning")) $("statWarning").innerText = warn;
    if($("statCritical")) $("statCritical").innerText = danger;
    
    // Angka dummy untuk OTP dan Master
    if($("statOtp")) $("statOtp").innerText = "2"; 
    if($("statMaster")) $("statMaster").innerText = "0"; 
}

/* =========================
   DRAWER ENGINE (PANEL KANAN)
========================= */
function openDrawer(student) {
    UI.selectedStudent = student;
    
    $("d-name").innerText = student.name;
    $("d-class").innerText = student.kelas;
    $("d-progress").innerText = student.progress;
    $("d-violation").innerText = student.violation;
    
    let color = student.status === 'safe' ? 'green' : (student.status === 'warn' ? 'orange' : 'red');
    const statusEl = $("d-status");
    statusEl.innerText = student.status.toUpperCase();
    statusEl.style.color = color;
    statusEl.style.fontWeight = "bold";

    // Buka Drawer (Pastikan class .active ada di dashboard.css)
    if($("drawer")) $("drawer").classList.add("active");
}

function closeDrawer() {
    if($("drawer")) $("drawer").classList.remove("active");
}

/* =========================
   OTP MODAL ENGINE
========================= */
function generateGlobalOTP() {
    const otp = Math.floor(100000 + Math.random() * 900000);
    openOTPModal(otp);
    addAlert(`Global OTP berhasil di-generate: ${otp}`);
    
    // Update counter OTP di stat
    let currentOtpCount = parseInt($("statOtp").innerText) || 0;
    $("statOtp").innerText = currentOtpCount + 1;
}

function generateSelectedStudentOTP() {
    if (!UI.selectedStudent) return;
    const otp = Math.floor(100000 + Math.random() * 900000);
    openOTPModal(otp);
    addAlert(`OTP dibuat untuk ${UI.selectedStudent.name}`);
    closeDrawer(); // Tutup laci otomatis
    
    let currentOtpCount = parseInt($("statOtp").innerText) || 0;
    $("statOtp").innerText = currentOtpCount + 1;
}

function openOTPModal(otpValue) {
    const modal = $("otpModal");
    if(modal) {
        $("otpValue").innerText = otpValue;
        modal.classList.add("active"); // Munculkan Modal
    }
}

function closeOTPModal() {
    if($("otpModal")) $("otpModal").classList.remove("active");
}

/* =========================
   ALERT SYSTEM
========================= */
function addAlert(message) {
    const list = $("alertList");
    if (!list) return;

    const item = document.createElement("div");
    item.style.padding = "10px";
    item.style.marginBottom = "8px";
    item.style.background = "rgba(255,255,255,0.6)";
    item.style.borderRadius = "8px";
    item.style.borderLeft = "4px solid #007aff";
    item.innerHTML = `
        <div style="font-size:10px; opacity:0.7;">${new Date().toLocaleTimeString()}</div>
        <div style="font-size:13px;">${message}</div>
    `;

    list.prepend(item);

    // Maksimal 10 log di layar
    while (list.children.length > 10) {
        list.removeChild(list.lastChild);
    }
}
