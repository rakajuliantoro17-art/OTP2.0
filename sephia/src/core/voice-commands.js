/**
 * Tier A voice commands: fixed keyword rules, no AI, no network, no student names.
 * Replies contain only aggregate counts from the dashboard snapshot.
 */
const normalize = (value) => String(value || "")
  .normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, " ").trim();

const RULES = [
  ["quiet", /\b(diam|berhenti|stop|cukup|selesai|terima kasih|makasih)\b/],
  ["repeat", /\b(ulangi|ulang|sekali lagi|ulangi lagi)\b/],
  ["help", /\b(bantuan|bantu|perintah|help|apa saja)\b/],
  ["locked", /\b(terkunci|dikunci|kunci|locked)\b/],
  ["critical", /\b(kritis|critical|bahaya|master)\b/],
  ["warning", /\b(peringatan|warning|waspada)\b/],
  ["status", /\b(status|ringkasan|laporan|kondisi|keadaan|berapa siswa|jumlah siswa|siswa aktif)\b/],
];

export function parseVoiceCommand(transcript) {
  const text = normalize(transcript);
  if (!text) return null;
  for (const [id, rule] of RULES) if (rule.test(text)) return id;
  return null;
}

const n = (value) => (Number.isFinite(value) && value >= 0 ? Math.trunc(value) : 0);

export function summarizeStudents(students = []) {
  const out = { total: 0, safe: 0, warning: 0, critical: 0, locked: 0 };
  for (const s of students) {
    const v = n(Number(s?.violation ?? s?.violationCount ?? 0));
    const raw = String(s?.status ?? "").toLowerCase();
    out.total += 1;
    if (v >= 30 || raw === "locked" || raw === "submitted") out.locked += 1;
    else if (v >= 26) out.critical += 1;
    else if (v >= 11) out.warning += 1;
    else out.safe += 1;
  }
  return out;
}

export const HELP_REPLY = "Perintah yang tersedia: status, terkunci, kritis, peringatan, ulangi, dan diam.";
export const UNKNOWN_REPLY = "Maaf, perintah belum dikenali. Katakan bantuan untuk melihat daftar perintah.";
export const NO_DATA_REPLY = "Data siswa belum tersedia.";

export function buildCommandReply(command, snapshot) {
  if (command === "help") return HELP_REPLY;
  if (!snapshot || !Number.isFinite(snapshot.total)) return NO_DATA_REPLY;
  const s = { total: n(snapshot.total), safe: n(snapshot.safe), warning: n(snapshot.warning), critical: n(snapshot.critical), locked: n(snapshot.locked) };
  if (s.total === 0) return "Belum ada siswa yang terpantau.";
  switch (command) {
    case "status":
      return `Ada ${s.total} siswa terpantau. ${s.locked} terkunci, ${s.critical} kritis, ${s.warning} peringatan, dan ${s.safe} aman.`;
    case "locked":
      return s.locked ? `${s.locked} siswa terkunci.` : "Tidak ada siswa terkunci.";
    case "critical":
      return s.critical ? `${s.critical} siswa berstatus kritis, memerlukan kode master.` : "Tidak ada siswa berstatus kritis.";
    case "warning":
      return s.warning ? `${s.warning} siswa berstatus peringatan.` : "Tidak ada siswa berstatus peringatan.";
    default:
      return UNKNOWN_REPLY;
  }
}
