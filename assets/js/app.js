/* =====================================================
   SMANSASOO CBT LOCK 2.0
   GLOBAL APP ENGINE
===================================================== */

const APP = {

    name: "SMANSASOO CBT LOCK",

    version: "2.0",

    build: "production",

    startedAt: Date.now()

};

/* =====================================================
   DOM READY
===================================================== */

document.addEventListener("DOMContentLoaded", () => {

    startClock();

    initSidebar();

    initTooltips();

    console.log(
        APP.name +
        " v" +
        APP.version +
        " initialized"
    );

});

/* =====================================================
   LIVE CLOCK
===================================================== */

function startClock() {

    const clock = document.getElementById("clock");

    if (!clock) return;

    updateClock();

    setInterval(updateClock, 1000);

}

function updateClock() {

    const now = new Date();

    document.getElementById("clock").innerHTML =
        now.toLocaleTimeString("id-ID");

}

/* =====================================================
   SIDEBAR ACTIVE
===================================================== */

function initSidebar() {

    const menus =
        document.querySelectorAll(".menu");

    menus.forEach(menu => {

        menu.addEventListener("click", () => {

            menus.forEach(m =>
                m.classList.remove("active")
            );

            menu.classList.add("active");

        });

    });

}

/* =====================================================
   TOOLTIP
===================================================== */

function initTooltips() {

    document
        .querySelectorAll("[data-tooltip]")
        .forEach(el => {

            el.addEventListener("mouseenter", () => {

                const text =
                    el.dataset.tooltip;

                showToast(text);

            });

        });

}

/* =====================================================
   TOAST
===================================================== */

function showToast(message) {

    let toast =
        document.getElementById("globalToast");

    if (!toast) {

        toast =
            document.createElement("div");

        toast.id = "globalToast";

        toast.style.position = "fixed";
        toast.style.bottom = "25px";
        toast.style.left = "50%";
        toast.style.transform = "translateX(-50%)";

        toast.style.padding =
            "12px 18px";

        toast.style.borderRadius =
            "16px";

        toast.style.backdropFilter =
            "blur(20px)";

        toast.style.background =
            "rgba(255,255,255,0.7)";

        toast.style.zIndex = "99999";

        toast.style.boxShadow =
            "0 10px 30px rgba(0,0,0,.12)";

        document.body.appendChild(toast);

    }

    toast.innerText = message;

    toast.style.opacity = "1";

    clearTimeout(toast.timer);

    toast.timer = setTimeout(() => {

        toast.style.opacity = "0";

    }, 3000);

}

/* =====================================================
   MODAL
===================================================== */

function openModal(id) {

    const modal =
        document.getElementById(id);

    if (!modal) return;

    modal.classList.add("active");

}

function closeModal(id) {

    const modal =
        document.getElementById(id);

    if (!modal) return;

    modal.classList.remove("active");

}

/* =====================================================
   DRAWER
===================================================== */

function openDrawer(id) {

    const drawer =
        document.getElementById(id);

    if (!drawer) return;

    drawer.classList.add("active");

}

function closeDrawer(id) {

    const drawer =
        document.getElementById(id);

    if (!drawer) return;

    drawer.classList.remove("active");

}

/* =====================================================
   FORMAT NUMBER
===================================================== */

function formatNumber(value) {

    return Number(value)
        .toLocaleString("id-ID");

}

/* =====================================================
   COPY TO CLIPBOARD
===================================================== */

async function copyText(text) {

    try {

        await navigator.clipboard.writeText(text);

        showToast("Berhasil disalin");

    }

    catch {

        showToast("Gagal menyalin");

    }

}

/* =====================================================
   RANDOM OTP
===================================================== */

function generateOTP() {

    return Math.floor(
        100000 +
        Math.random() * 900000
    );

}

/* =====================================================
   STORAGE
===================================================== */

function saveLocal(key, value) {

    localStorage.setItem(
        key,
        JSON.stringify(value)
    );

}

function getLocal(key) {

    const data =
        localStorage.getItem(key);

    if (!data) return null;

    return JSON.parse(data);

}

/* =====================================================
   STATUS HELPER
===================================================== */

function getViolationStatus(count) {

    count = Number(count);

    if (count >= 30)
        return "AUTOSUBMIT";

    if (count >= 26)
        return "CRITICAL";

    if (count >= 11)
        return "WARNING";

    return "SAFE";

}

/* =====================================================
   NETWORK STATUS
===================================================== */

window.addEventListener("online", () => {

    showToast(
        "Koneksi internet tersambung"
    );

});

window.addEventListener("offline", () => {

    showToast(
        "Koneksi internet terputus"
    );

});

/* =====================================================
   GLOBAL ALERT
===================================================== */

function addGlobalAlert(text) {

    const container =
        document.getElementById("alertList");

    if (!container) return;

    const item =
        document.createElement("div");

    item.className = "alert-item";

    item.innerHTML =
        "• " + text;

    container.prepend(item);

    while (
        container.children.length > 20
    ) {
        container.removeChild(
            container.lastChild
        );
    }

}

/* =====================================================
   HEALTH CHECK
===================================================== */

setInterval(() => {

    window.APP_HEALTH = {

        uptime:
            Math.floor(
                (Date.now() - APP.startedAt)
                / 1000
            ),

        online:
            navigator.onLine

    };

}, 5000);

/* =====================================================
   END
===================================================== */
