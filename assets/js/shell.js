/* =====================================================
   SMANSASOO CBT LOCK 2.0 — SHELL BERSAMA (tema, gear, sidebar, footer)
   Muat di <head> (tanpa defer) agar tema terpasang sebelum render.
===================================================== */
(function () {
    "use strict";
    const store = {
        get(k)    { try { return localStorage.getItem(k); } catch (_) { return null; } },
        set(k, v) { try { localStorage.setItem(k, v); } catch (_) {} }
    };

    /* ---------- TEMA ---------- */
    const mq = window.matchMedia ? matchMedia("(prefers-color-scheme: dark)") : null;
    function resolve(mode) { return mode === "dark" || (mode === "auto" && mq && mq.matches) ? "dark" : "light"; }
    function applyTheme(mode) {
        document.documentElement.dataset.theme = resolve(mode);
        document.documentElement.dataset.themeMode = mode;
    }
    let mode = store.get("cbt_theme") || "auto";
    applyTheme(mode);
    if (mq) (mq.addEventListener ? mq.addEventListener("change", () => mode === "auto" && applyTheme("auto")) : 0);
    function setTheme(m) { mode = m; store.set("cbt_theme", m); applyTheme(m); renderSeg(); }

    /* ---------- SIDEBAR ---------- */
    const isDesktop = () => window.innerWidth >= 1024;
    function setCollapsed(on) { document.body.classList.toggle("sidebar-collapsed", on); store.set("cbt_sb_collapsed", on ? "1" : "0"); }
    function toggleSidebar() { isDesktop() ? setCollapsed(!document.body.classList.contains("sidebar-collapsed")) : document.body.classList.toggle("sidebar-open"); }

    /* ---------- SETTINGS DRAWER ---------- */
    function renderSeg() {
        const seg = document.getElementById("segTheme");
        if (!seg) return;
        seg.querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.v === mode));
    }
    function buildSettings() {
        if (document.getElementById("settingsDrawer")) return;
        const extras = (window.SHELL_SETTINGS_EXTRA || []).map((x, i) => `
            <div class="settings-row">
                <div class="settings-title">${x.title}</div>
                <div class="settings-desc">${x.desc || ""}</div>
                <button class="settings-act" data-extra="${i}">${x.label}</button>
            </div>`).join("");
        const hasSidebar = !!window.SHELL_HAS_SIDEBAR || !!document.querySelector(".sidebar");
        const html = `
        <button class="settings-trigger" id="settingsTrigger" aria-label="Pengaturan" title="Pengaturan">⚙</button>
        <div class="settings-overlay" id="settingsOverlay"></div>
        <aside class="settings-drawer" id="settingsDrawer" aria-label="Pengaturan">
            <div class="settings-head"><strong>⚙ Pengaturan</strong><button class="settings-close" id="settingsClose" aria-label="Tutup">✕</button></div>
            <div class="settings-body">
                <div class="settings-row">
                    <div class="settings-title">Tema tampilan</div>
                    <div class="settings-desc">Terang, gelap, atau mengikuti pengaturan perangkat.</div>
                    <div class="seg" id="segTheme">
                        <button data-v="light">☀ Terang</button><button data-v="dark">🌙 Gelap</button><button data-v="auto">Otomatis</button>
                    </div>
                </div>
                ${hasSidebar ? `<div class="settings-row">
                    <div class="settings-title">Panel samping</div>
                    <div class="settings-desc">Perkecil menjadi ikon saja agar tabel lebih lebar (Ctrl+B).</div>
                    <button class="settings-act" id="settingsSb">Perkecil / perbesar panel</button>
                </div>` : ""}
                ${extras}
            </div>
            <div class="settings-foot">SMANSASOO CBT LOCK 2.0</div>
        </aside>`;
        document.body.insertAdjacentHTML("beforeend", html);
        renderSeg();
    }
    const openSettings  = () => document.body.classList.add("settings-open");
    const closeSettings = () => document.body.classList.remove("settings-open");

    /* ---------- FOOTER ---------- */
    function buildFooter() {
        const mount = document.getElementById("shellFooter");
        if (!mount || mount.dataset.done) return;
        mount.dataset.done = "1";
        mount.innerHTML = `<footer class="shell-footer"><div>&copy; ${new Date().getFullYear()} <b>Tim IT SMAN 1 Sooko Mojokerto</b></div><small>SMANSASOO CBT LOCK 2.0</small></footer>`;
    }

    /* ---------- EVENT (delegasi: komponen panitia dimuat async) ---------- */
    document.addEventListener("click", e => {
        const t = e.target;
        if (t.closest("#settingsTrigger")) return openSettings();
        if (t.closest("#settingsClose") || t.id === "settingsOverlay") return closeSettings();
        const th = t.closest("#segTheme button"); if (th) return setTheme(th.dataset.v);
        if (t.closest("#settingsSb")) { toggleSidebar(); return closeSettings(); }
        const ex = t.closest("[data-extra]"); if (ex) { closeSettings(); const f = (window.SHELL_SETTINGS_EXTRA || [])[ex.dataset.extra]; if (f && f.run) f.run(); return; }
        if (t.closest("#appSidebarCollapseBtn") || t.closest("#appSidebarToggle")) return toggleSidebar();
        if (t.id === "sidebarOverlay") document.body.classList.remove("sidebar-open");
        if (t.closest(".sidebar .menu") && !isDesktop()) document.body.classList.remove("sidebar-open");
    });
    document.addEventListener("keydown", e => {
        if (e.key === "Escape") { closeSettings(); document.body.classList.remove("sidebar-open"); }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b" && document.querySelector(".sidebar")) { e.preventDefault(); toggleSidebar(); }
    });
    window.addEventListener("resize", () => { if (isDesktop()) document.body.classList.remove("sidebar-open"); });

    document.addEventListener("DOMContentLoaded", () => {
        if (store.get("cbt_sb_collapsed") === "1") document.body.classList.add("sidebar-collapsed");
        if (!document.getElementById("sidebarOverlay")) document.body.insertAdjacentHTML("beforeend", '<div class="sidebar-overlay" id="sidebarOverlay"></div>');
        buildSettings();
        buildFooter();
    });

    window.Shell = { setTheme, toggleSidebar, openSettings, closeSettings, buildFooter };
})();
