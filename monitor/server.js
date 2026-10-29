// SMANSASOO CBT Monitor Lokal — tanpa dependency, hanya Node.js.  Jalankan: node server.js
const http = require("http"), fs = require("fs"), os = require("os"), path = require("path"), crypto = require("crypto");
const PORT = process.env.PORT || 3000;
const FILE = path.join(__dirname, "data.json");
const OFFLINE_AFTER = 40000; // ms tanpa heartbeat = offline

let students = {};
try { students = JSON.parse(fs.readFileSync(FILE, "utf8")); } catch (_) {}
let dirty = false;
setInterval(() => { if (dirty) { fs.writeFile(FILE, JSON.stringify(students), () => {}); dirty = false; } }, 3000);

const statusOf = c => c >= 30 ? "locked" : c >= 26 ? "critical" : c >= 11 ? "warning" : "safe";
const clients = new Set();
const view = () => Object.values(students).map(s => ({ ...s, online: Date.now() - (s.lastSeen || 0) < OFFLINE_AFTER }));
function push() { const d = "data: " + JSON.stringify(view()) + "\n\n"; for (const c of clients) c.write(d); }
setInterval(push, 5000);

function upsert(b) {
  if (!b || !b.uid) return null;
  const s = students[b.uid] || { uid: b.uid, violationCount: 0, unlockCount: 0, log: [] };
  Object.assign(s, { nama: b.nama || s.nama || "-", username: b.username || s.username, kelas: b.kelas || s.kelas, exam: b.exam || s.exam, lastSeen: Date.now() });
  // monotonic: pelanggaran tidak boleh turun
  s.violationCount = Math.max(s.violationCount, Number(b.violation) || 0);
  s.unlockCount = Math.max(s.unlockCount, Number(b.unlocks) || 0);
  s.status = statusOf(s.violationCount);
  if (b.event && b.event !== "heartbeat") {
    s.log.push({ t: Date.now(), e: b.event }); if (s.log.length > 50) s.log.shift();
  }
  students[b.uid] = s; dirty = true; return s;
}

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };

/* ---------- PIN pengawas ---------- */
const PIN_FILE = path.join(__dirname, "pin.json");
const FIREBASE_DB = "https://otp-2-70d6e-default-rtdb.firebaseio.com";
let pinData = null; try { pinData = JSON.parse(fs.readFileSync(PIN_FILE, "utf8")); } catch (_) {}
const tokens = new Map();           // token -> expiry
const fails = new Map();            // ip -> {n, until}
const today = () => new Date().toLocaleDateString("sv-SE");
const sha = t => crypto.createHash("sha256").update(t).digest("hex");
const isLocal = req => ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress);
const okToken = t => tokens.has(t) && tokens.get(t) > Date.now();
function json(res, code, obj) { res.writeHead(code, { ...CORS, "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); }
function readBody(req, cb) { let b = ""; req.on("data", c => { b += c; if (b.length > 1e5) req.destroy(); }); req.on("end", () => { try { cb(JSON.parse(b)); } catch (_) { cb(null); } }); }
async function pushPinToFirebase(rec) { // best-effort, hanya jika ada internet
  try { await fetch(FIREBASE_DB + "/system/pengawasPin.json", { method: "PUT", body: JSON.stringify(rec), signal: AbortSignal.timeout(4000) }); return true; } catch (_) { return false; }
}


http.createServer((req, res) => {
  const url = req.url.split("?")[0];
  if (req.method === "OPTIONS") { res.writeHead(204, CORS); return res.end(); }
  if (req.method === "POST" && url === "/api/report") {
    let body = ""; req.on("data", c => { body += c; if (body.length > 1e5) req.destroy(); });
    req.on("end", () => {
      let s = null; try { s = upsert(JSON.parse(body)); } catch (_) {}
      res.writeHead(s ? 200 : 400, { ...CORS, "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: !!s })); if (s) push();
    }); return;
  }
  const q = new URL(req.url, "http://x").searchParams;
  if (url === "/api/pin" && req.method === "POST") {           // hanya dari laptop panitia
    if (!isLocal(req)) return json(res, 403, { ok: false });
    const pin = String(crypto.randomInt(100000, 1000000)), date = today();
    pinData = { hash: sha("SMANSASOO_PENGAWAS_" + pin + date), date, created: Date.now() };
    fs.writeFileSync(PIN_FILE, JSON.stringify(pinData)); tokens.clear();
    return pushPinToFirebase(pinData).then(fb => json(res, 200, { ok: true, pin, date, firebase: fb }));
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
  if (url === "/api/students") { if (!isLocal(req) && !okToken(q.get("token"))) return json(res, 401, { ok: false }); return json(res, 200, view()); }
  if (url === "/events") {
    if (!isLocal(req) && !okToken(q.get("token"))) { res.writeHead(401, CORS); return res.end(); }
    res.writeHead(200, { ...CORS, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
    clients.add(res); res.write("data: " + JSON.stringify(view()) + "\n\n"); req.on("close", () => clients.delete(res)); return;
  }
  if (url === "/api/reset" && req.method === "POST") { if (!isLocal(req)) return json(res, 403, {}); students = {}; dirty = true; push(); res.writeHead(200, CORS); return res.end("ok"); }
  if (url === "/pengawas") { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); return res.end(fs.readFileSync(path.join(__dirname, "pengawas.html"))); }
  if (url.startsWith("/assets/")) {
    const f = path.join(__dirname, path.normalize(url).replace(/^([\\/]\.\.)+/, ""));
    if (!f.startsWith(path.join(__dirname, "assets")) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
    const mime = { ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon", ".css": "text/css" }[path.extname(f)] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": mime, "Cache-Control": "max-age=3600" }); return res.end(fs.readFileSync(f));
  }
  if ((url === "/" || url === "/index.html") && !isLocal(req)) { res.writeHead(302, { Location: "/pengawas" }); return res.end(); }
  if (url === "/" || url === "/index.html") { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); return res.end(fs.readFileSync(path.join(__dirname, "dashboard.html"))); }
  res.writeHead(404); res.end("not found");
}).listen(PORT, "0.0.0.0", () => {
  console.log("CBT Monitor aktif.\nDashboard panitia: http://localhost:" + PORT + "\nPengawas (HP, wifi sekolah) buka salah satu alamat + /pengawas:");
  for (const l of Object.values(os.networkInterfaces()).flat()) if (l.family === "IPv4" && !l.internal) console.log("  http://" + l.address + ":" + PORT);
});
