// SMANSASOO CBT Monitor Lokal — tanpa dependency, hanya Node.js.  Jalankan: node server.js
const http = require("http"), fs = require("fs"), os = require("os"), path = require("path");
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
  if (url === "/api/students") { res.writeHead(200, { ...CORS, "Content-Type": "application/json" }); return res.end(JSON.stringify(view())); }
  if (url === "/events") {
    res.writeHead(200, { ...CORS, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
    clients.add(res); res.write("data: " + JSON.stringify(view()) + "\n\n"); req.on("close", () => clients.delete(res)); return;
  }
  if (url === "/api/reset" && req.method === "POST") { students = {}; dirty = true; push(); res.writeHead(200, CORS); return res.end("ok"); }
  if (url === "/" || url === "/index.html") { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); return res.end(fs.readFileSync(path.join(__dirname, "dashboard.html"))); }
  res.writeHead(404); res.end("not found");
}).listen(PORT, "0.0.0.0", () => {
  console.log("CBT Monitor aktif. Buka dashboard di salah satu alamat ini:");
  for (const l of Object.values(os.networkInterfaces()).flat()) if (l.family === "IPv4" && !l.internal) console.log("  http://" + l.address + ":" + PORT);
});
