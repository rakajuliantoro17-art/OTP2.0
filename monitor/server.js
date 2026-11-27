// SMANSASOO CBT Monitor Lokal — tanpa dependency, hanya Node.js.  Jalankan: node server.js
const http = require("http"), fs = require("fs"), os = require("os"), path = require("path"), crypto = require("crypto");
const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname, "..");               // root repo (berisi panitia/, assets/)
const FILE = path.join(__dirname, "data.json");
const PIN_FILE = path.join(__dirname, "pin.json");
const FIREBASE_DB = process.env.FIREBASE_DB || "https://otp-2-70d6e-default-rtdb.firebaseio.com";
const OFFLINE_AFTER = 40000;          // ms tanpa heartbeat = offline
const MIRROR_EVERY  = 10000;          // salin ke Firebase tiap 10 dtk jika ada internet
const MIRROR_NAMA   = process.env.MIRROR_NAMA || "full";   // "full" | "short" (nama depan + inisial)

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Private-Network": "true" };

/* ---------- data siswa ---------- */
let students = {}; try { students = JSON.parse(fs.readFileSync(FILE, "utf8")); } catch (_) {}
let dirty = false;
setInterval(() => { if (dirty) { fs.writeFile(FILE, JSON.stringify(students), () => {}); dirty = false; } }, 3000);
/* ---------- reset otomatis tiap ganti hari ----------
   Hitungan pelanggaran, status terkunci & daftar siswa dari hari sebelumnya dibawa terus (hitungan hanya naik) dan
   dibaca tab baru siswa lewat /api/me. Setiap ganti hari data lama disimpan ke data-<tanggal>.json lalu dikosongkan. */
const DAY_FILE = path.join(__dirname, "day.txt");
const dayOf = d => d.toLocaleDateString("sv-SE");
function rollDay() {
  const now = dayOf(new Date());
  let last = ""; try { last = fs.readFileSync(DAY_FILE, "utf8").trim(); } catch (_) {}
  if (!last) { try { last = dayOf(fs.statSync(FILE).mtime); } catch (_) { last = now; } }   // belum ada catatan hari: pakai tanggal data.json
  if (last !== now) {
    if (Object.keys(students).length) {
      try { fs.writeFileSync(path.join(__dirname, "data-" + last + ".json"), JSON.stringify(students)); } catch (_) {}
      students = {}; dirty = true; push();
      console.log("[HARI BARU] " + last + " -> " + now + ": data siswa disimpan ke data-" + last + ".json dan direset.");
    }
  }
  try { fs.writeFileSync(DAY_FILE, now); } catch (_) {}
}
const statusOf = c => c >= 30 ? "locked" : c >= 26 ? "critical" : c >= 11 ? "warning" : "safe";
const view = () => Object.values(students).map(s => ({ ...s, online: Date.now() - (s.lastSeen || 0) < OFFLINE_AFTER }));
const clients = new Set();
function push() { const d = "data: " + JSON.stringify(view()) + "\n\n"; for (const c of clients) c.write(d); }
setInterval(push, 5000);
rollDay(); setInterval(rollDay, 60000);   // dipanggil setelah `clients`/`view` ada (hindari TDZ)

/* ---------- reset otomatis menjelang tiap sesi ujian ----------
   Jam reset (waktu PC ini), pisahkan dengan koma. Bawaan: 15 menit sebelum sesi 1 (masuk 06.45) dan sesi 2 (masuk 09.45).
   Ubah dengan variabel lingkungan SESI_RESET, mis.  set SESI_RESET=06:30,09:30  sebelum menjalankan node.
   Hanya berlaku saat jamnya DILEWATI selagi server hidup (menjalankan ulang server tengah sesi TIDAK mereset). */
const SESI_RESET = (process.env.SESI_RESET || "06:30,09:30").split(",").map(s => s.trim()).filter(s => /^\d{1,2}:\d{2}$/.test(s));
const minOfDay = d => d.getHours() * 60 + d.getMinutes();
let lastTickMin = minOfDay(new Date());
function sessionReset() {
  const now = new Date(), cur = minOfDay(now), prev = lastTickMin;
  lastTickMin = cur;
  if (cur <= prev || cur - prev > 5) return;               // menit sama, lewat tengah malam (ditangani rollDay), atau PC baru bangun dari tidur
  for (const t of SESI_RESET) {
    const [h, m] = t.split(":").map(Number), at = h * 60 + m;
    if (at > prev && at <= cur) {
      if (Object.keys(students).length) {
        const stamp = dayOf(now) + "-" + String(h).padStart(2, "0") + String(m).padStart(2, "0");
        try { fs.writeFileSync(path.join(__dirname, "data-" + stamp + ".json"), JSON.stringify(students)); } catch (_) {}
        students = {}; dirty = true; push();
        console.log("[RESET SESI " + t + "] data siswa disimpan ke data-" + stamp + ".json dan direset.");
      }
      break;
    }
  }
}
setInterval(sessionReset, 15000);

/* ---------- alert ke Firebase (untuk Sephia/panitia online) ---------- */
const ALERT_FROM = 26;                       // sama dengan api/violation.js (>=26)
const ALERT_FILE = path.join(__dirname, "alerts-pending.json");
let pendingAlerts = {}; try { pendingAlerts = JSON.parse(fs.readFileSync(ALERT_FILE, "utf8")); } catch (_) {}
const savePending = () => fs.writeFile(ALERT_FILE, JSON.stringify(pendingAlerts), () => {});
function queueAlert(s, n, ev) {
  const id = String(s.uid).replace(/[.#$\[\]\/]/g, "_") + "_" + n;   // ID stabil: 1 alert per (siswa, hitungan), aman diulang
  if (pendingAlerts[id]) return;
  pendingAlerts[id] = { type: "violation", msg: (MIRROR_NAMA === "full" ? s.nama : shortName(s.nama)) + " — " + (ev || "pelanggaran") + " (ke-" + n + ")",
    status: statusOf(n), uid: s.uid, violationCount: n, time: Date.now(), source: "local" };
  savePending();
}

function upsert(b) {
  if (!b || !b.uid) return null;
  const s = students[b.uid] || { uid: b.uid, violationCount: 0, unlockCount: 0, log: [] };
  Object.assign(s, { nama: b.nama || s.nama || "-", username: b.username || s.username, kelas: b.kelas || s.kelas, exam: b.exam || s.exam, lastSeen: Date.now() });
  if (/^\d{1,3}\/\d{1,3}$/.test(String(b.progress || ""))) s.progress = String(b.progress);   // soal terjawab/total
  const prevCount = s.violationCount;
  s.violationCount = Math.max(s.violationCount, Number(b.violation) || 0);   // monotonic
  // Alert susulan (hitungan melompat, mis. laporan sebelumnya tidak sampai): hanya hitungan terakhir memakai label kejadian sebenarnya.
  for (let n = Math.max(prevCount + 1, ALERT_FROM); n <= Math.min(s.violationCount, 30); n++) queueAlert(s, n, n === s.violationCount ? b.event : "pelanggaran (data terlambat)");
  s.unlockCount = Math.max(s.unlockCount, Number(b.unlocks) || 0);
  s.status = statusOf(s.violationCount);
  // Status terkunci menurut server (dipakai tab BARU siswa agar tidak lolos dari kunci). heartbeat tidak mengubah.
  if (b.event && b.event !== "heartbeat") s.locked = b.event !== "unlock";
  if (s.violationCount >= 30) s.locked = true;
  if (b.event && b.event !== "heartbeat") { s.log.push({ t: Date.now(), e: b.event }); if (s.log.length > 50) s.log.shift(); }
  students[b.uid] = s; dirty = true; return s;
}

/* ---------- Master OTP (diaktifkan panitia) ---------- */
let master = { status: "none" };
/* ---------- PIN pengawas ---------- */
let pinData = null; try { pinData = JSON.parse(fs.readFileSync(PIN_FILE, "utf8")); } catch (_) {}
const tokens = new Map(), fails = new Map();
const today = () => new Date().toLocaleDateString("sv-SE");
const sha = t => crypto.createHash("sha256").update(t).digest("hex");
const isLocal = req => ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress);
const okToken = t => tokens.has(t) && tokens.get(t) > Date.now();
const authed = (req, q) => isLocal(req) || okToken(q.get("token"));
function json(res, code, obj) { res.writeHead(code, { ...CORS, "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); }
function readBody(req, cb) { let b = ""; req.on("data", c => { b += c; if (b.length > 1e5) req.destroy(); }); req.on("end", () => { try { cb(JSON.parse(b)); } catch (_) { cb(null); } }); }
async function fb(method, p, body) {
  try { const r = await fetch(FIREBASE_DB + p + ".json", { method, body: JSON.stringify(body), signal: AbortSignal.timeout(4000) }); return r.ok; } catch (_) { return false; }
}

/* ---------- salin ke Firebase (jika laptop online) ---------- */
let lastMirror = "", mirrorOk = false, bridgeOk = false, mirrorFailSince = 0, lastFailWarn = 0;
const shortName = n => { const w = String(n || "-").trim().split(/\s+/); return w[0] + (w.length > 1 ? " " + w.slice(1).map(x => x[0].toUpperCase() + ".").join("") : ""); };
setInterval(async () => {
  const out = {};
  for (const s of view()) out[s.uid] = { uid: s.uid, nama: MIRROR_NAMA === "full" ? s.nama : shortName(s.nama), username: s.username, kelas: s.kelas,
    violationCount: s.violationCount, unlockCount: s.unlockCount, status: s.status, progress: s.progress, online: s.online, lastSeen: s.lastSeen, source: "local",
    logs: (s.log || []).slice(-5).map(x => ({ type: x.e, time: x.t })) };   // 5 kejadian terakhir untuk panel detail siswa
  const sig = JSON.stringify(out);
  if (sig !== lastMirror || !mirrorOk) { mirrorOk = await fb("PUT", "/students", out); if (mirrorOk) lastMirror = sig; }
  for (const id of Object.keys(pendingAlerts)) {                       // kirim alert tertunda (PUT idempoten)
    if (await fb("PUT", "/alerts/" + id, pendingAlerts[id])) { delete pendingAlerts[id]; savePending(); } else break;
  }
  bridgeOk = await fb("PUT", "/system/bridge", { timestamp: Date.now(), students: out ? Object.keys(out).length : 0, pending: Object.keys(pendingAlerts).length, source: "bridge" });
  // Peringatan jelas di jendela server bila tidak bisa menjangkau Firebase (dashboard Vercel akan membeku/basi).
  if (!bridgeOk) {
    if (!mirrorFailSince) mirrorFailSince = Date.now();
    if (Date.now() - lastFailWarn > 60000) {
      lastFailWarn = Date.now();
      console.log("[PERINGATAN " + new Date().toLocaleTimeString("id-ID") + "] Tidak bisa menjangkau Firebase sejak " + new Date(mirrorFailSince).toLocaleTimeString("id-ID") +
        ". Dashboard Vercel menampilkan data BASI. Periksa internet PC ini, atau pantau lewat http://localhost:" + PORT + "/panitia/");
    }
  } else if (mirrorFailSince) {
    console.log("[PULIH " + new Date().toLocaleTimeString("id-ID") + "] Firebase terjangkau lagi (terputus sejak " + new Date(mirrorFailSince).toLocaleTimeString("id-ID") + ").");
    mirrorFailSince = 0; lastFailWarn = 0;
  }
}, MIRROR_EVERY);

/* ---------- static ---------- */
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon" };
function serveStatic(res, url, injectLocal) {
  const rel = path.normalize(decodeURIComponent(url)).replace(/^([\\/]\.\.)+/, "");
  for (const base of [ROOT, __dirname]) {
    const f = path.join(base, rel);
    const allowed = ["panitia", "assets"].some(d => f.startsWith(path.join(base, d) + path.sep));
    if (!allowed || !fs.existsSync(f) || !fs.statSync(f).isFile()) continue;
    let body = fs.readFileSync(f);
    if (injectLocal && f.endsWith("index.html")) body = Buffer.from(body.toString().replace("<head>", "<head><script>window.CBT_LOCAL=true;</script>"));
    res.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-cache" });
    return res.end(body);
  }
  res.writeHead(404); res.end("not found");
}

http.createServer((req, res) => {
  const u = new URL(req.url, "http://x"), url = u.pathname, q = u.searchParams;
  if (req.method === "OPTIONS") { res.writeHead(204, CORS); return res.end(); }

  /* laporan dari PC siswa */
  if (req.method === "POST" && url === "/api/report")
    return readBody(req, b => { const s = upsert(b); json(res, s ? 200 : 400, { ok: !!s, violation: s ? s.violationCount : 0, locked: !!(s && s.locked) }); if (s) push(); });

  /* status satu siswa (dibaca inject.html saat tab baru dibuka): hanya angka, tanpa nama */
  if (req.method === "GET" && url === "/api/me") {
    const k = q.get("uid") || "", s = Object.prototype.hasOwnProperty.call(students, k) ? students[k] : null;
    return json(res, 200, { ok: true, violation: s ? s.violationCount : 0, unlocks: s ? s.unlockCount : 0, locked: !!(s && s.locked) });
  }

  /* PIN */
  if (url === "/api/pin" && req.method === "POST") {
    if (!isLocal(req)) return json(res, 403, { ok: false });
    const pin = String(crypto.randomInt(100000, 1000000)), date = today();
    pinData = { hash: sha("SMANSASOO_PENGAWAS_" + pin + date), date, created: Date.now() };
    fs.writeFileSync(PIN_FILE, JSON.stringify(pinData)); tokens.clear();
    fb("PUT", "/system/pengawasPinView", { pin, date, created: Date.now() });   // untuk dashboard Tim IT (sama dengan yang tampil di panitia)
    return fb("PUT", "/system/pengawasPin", pinData).then(ok => json(res, 200, { ok: true, pin, date, firebase: ok }));
  }
  if (url === "/api/pin/verify" && req.method === "POST") {
    const ip = req.socket.remoteAddress, f = fails.get(ip) || { n: 0, until: 0 };
    if (Date.now() < f.until) return json(res, 429, { ok: false, msg: "Dikunci. Tunggu " + Math.ceil((f.until - Date.now()) / 1000) + " detik." });
    return readBody(req, b => {
      if (!pinData) return json(res, 200, { ok: false, msg: "PIN belum dibuat panitia." });
      if (pinData.date !== today()) return json(res, 200, { ok: false, msg: "PIN kedaluwarsa. Minta PIN baru ke panitia." });
      if (b && sha("SMANSASOO_PENGAWAS_" + String(b.pin || "").trim() + pinData.date) === pinData.hash) {
        fails.delete(ip); const t = crypto.randomBytes(16).toString("hex"); tokens.set(t, Date.now() + 12 * 3600e3);
        return json(res, 200, { ok: true, token: t });
      }
      f.n++; if (f.n >= 5) { f.until = Date.now() + 60000; f.n = 0; } fails.set(ip, f);
      json(res, 200, { ok: false, msg: "PIN salah." });
    });
  }

  /* Master OTP: panitia (localhost) menulis, pengawas (token) membaca */
  if (url === "/api/master" && req.method === "POST") {
    if (!isLocal(req)) return json(res, 403, { ok: false });
    return readBody(req, b => {
      if (!b) return json(res, 400, { ok: false });
      master = b.status === "revoked" ? { status: "revoked", created: Date.now() }
             : { status: "active", code: String(b.code || ""), created: Date.now() };
      fb("PUT", "/system/masterOtp", master);
      json(res, 200, { ok: true });
    });
  }
  if (url === "/api/master" && req.method === "GET") return authed(req, q) ? json(res, 200, master) : json(res, 401, { ok: false });

  /* data siswa */
  if (url === "/api/students") return authed(req, q) ? json(res, 200, view()) : json(res, 401, { ok: false });
  if (url === "/events") {
    if (!authed(req, q)) { res.writeHead(401, CORS); return res.end(); }
    res.writeHead(200, { ...CORS, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
    clients.add(res); res.write("data: " + JSON.stringify(view()) + "\n\n"); req.on("close", () => clients.delete(res)); return;
  }
  if (url === "/api/reset" && req.method === "POST") { if (!isLocal(req)) return json(res, 403, {}); students = {}; dirty = true; push(); res.writeHead(200, CORS); return res.end("ok"); }
  if (url === "/api/status") return json(res, 200, { ok: true, mirror: mirrorOk, bridge: bridgeOk, firebaseDownSince: mirrorFailSince || null, pendingAlerts: Object.keys(pendingAlerts).length, students: Object.keys(students).length });

  /* halaman */
  if (url === "/pengawas") { res.writeHead(200, { "Content-Type": MIME[".html"] }); return res.end(fs.readFileSync(path.join(__dirname, "pengawas.html"))); }
  if (url === "/panitia") { res.writeHead(302, { Location: "/panitia/" }); return res.end(); }
  if (url.startsWith("/panitia/")) {
    if (!isLocal(req)) { res.writeHead(302, { Location: "/pengawas" }); return res.end(); }   // panitia hanya dari laptop
    return serveStatic(res, url === "/panitia/" ? "/panitia/index.html" : url, true);
  }
  if (url.startsWith("/assets/")) return serveStatic(res, url, false);
  if (url === "/" || url === "/index.html") { res.writeHead(302, { Location: isLocal(req) ? "/panitia/" : "/pengawas" }); return res.end(); }
  if (url === "/simple" && isLocal(req)) { res.writeHead(200, { "Content-Type": MIME[".html"] }); return res.end(fs.readFileSync(path.join(__dirname, "dashboard.html"))); }
  res.writeHead(404); res.end("not found");
}).listen(PORT, "0.0.0.0", () => {
  console.log("CBT Monitor aktif.\nDashboard panitia (di laptop ini): http://localhost:" + PORT + "/panitia/\nPengawas (HP, Wi-Fi sekolah) buka salah satu alamat + /pengawas:");
  for (const l of Object.values(os.networkInterfaces()).flat()) if (l.family === "IPv4" && !l.internal) console.log("  http://" + l.address + ":" + PORT);
});
