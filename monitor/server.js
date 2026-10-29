// SMANSASOO CBT Monitor Lokal — tanpa dependency, hanya Node.js.  Jalankan: node server.js
const http = require("http"), fs = require("fs"), os = require("os"), path = require("path"), crypto = require("crypto");
const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname, "..");               // root repo (berisi panitia/, assets/)
const FILE = path.join(__dirname, "data.json");
const PIN_FILE = path.join(__dirname, "pin.json");
const FIREBASE_DB = "https://otp-2-70d6e-default-rtdb.firebaseio.com";
const OFFLINE_AFTER = 40000;          // ms tanpa heartbeat = offline
const MIRROR_EVERY  = 10000;          // salin ke Firebase tiap 10 dtk jika ada internet
const MIRROR_NAMA   = process.env.MIRROR_NAMA || "short";   // "full" | "short" (nama depan + inisial)

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };

/* ---------- data siswa ---------- */
let students = {}; try { students = JSON.parse(fs.readFileSync(FILE, "utf8")); } catch (_) {}
let dirty = false;
setInterval(() => { if (dirty) { fs.writeFile(FILE, JSON.stringify(students), () => {}); dirty = false; } }, 3000);
const statusOf = c => c >= 30 ? "locked" : c >= 26 ? "critical" : c >= 11 ? "warning" : "safe";
const view = () => Object.values(students).map(s => ({ ...s, online: Date.now() - (s.lastSeen || 0) < OFFLINE_AFTER }));
const clients = new Set();
function push() { const d = "data: " + JSON.stringify(view()) + "\n\n"; for (const c of clients) c.write(d); }
setInterval(push, 5000);

function upsert(b) {
  if (!b || !b.uid) return null;
  const s = students[b.uid] || { uid: b.uid, violationCount: 0, unlockCount: 0, log: [] };
  Object.assign(s, { nama: b.nama || s.nama || "-", username: b.username || s.username, kelas: b.kelas || s.kelas, exam: b.exam || s.exam, lastSeen: Date.now() });
  s.violationCount = Math.max(s.violationCount, Number(b.violation) || 0);   // monotonic
  s.unlockCount = Math.max(s.unlockCount, Number(b.unlocks) || 0);
  s.status = statusOf(s.violationCount);
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
let lastMirror = "", mirrorOk = false;
const shortName = n => { const w = String(n || "-").trim().split(/\s+/); return w[0] + (w.length > 1 ? " " + w.slice(1).map(x => x[0].toUpperCase() + ".").join("") : ""); };
setInterval(async () => {
  const out = {};
  for (const s of view()) out[s.uid] = { uid: s.uid, nama: MIRROR_NAMA === "full" ? s.nama : shortName(s.nama), username: s.username, kelas: s.kelas,
    violationCount: s.violationCount, unlockCount: s.unlockCount, status: s.status, online: s.online, lastSeen: s.lastSeen, source: "local" };
  const sig = JSON.stringify(out);
  if (sig === lastMirror && mirrorOk) return;
  mirrorOk = await fb("PUT", "/students", out); if (mirrorOk) lastMirror = sig;
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
    return readBody(req, b => { const s = upsert(b); json(res, s ? 200 : 400, { ok: !!s }); if (s) push(); });

  /* PIN */
  if (url === "/api/pin" && req.method === "POST") {
    if (!isLocal(req)) return json(res, 403, { ok: false });
    const pin = String(crypto.randomInt(100000, 1000000)), date = today();
    pinData = { hash: sha("SMANSASOO_PENGAWAS_" + pin + date), date, created: Date.now() };
    fs.writeFileSync(PIN_FILE, JSON.stringify(pinData)); tokens.clear();
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
  if (url === "/api/status") return json(res, 200, { ok: true, mirror: mirrorOk, students: Object.keys(students).length });

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
