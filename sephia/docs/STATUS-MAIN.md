# SEPHIA — status di `main` (diperbarui 2026-11-20)

## Aktif di dashboard panitia
- Mount otomatis di sidebar (`#sephiaControlMount`, `#sephiaAvatarMount`); aktif tanpa klik (D-18-1).
- Alert dibaca dari DOM `#alertList` (pelanggaran ke-27..30), kalimat baku tanpa data siswa.
- Suara hybrid (D-18-3, D-18-4): neural lokal bila ekstensi+native host tersambung; selain itu suara browser id-ID
  (lokal wanita → lokal → id-ID apa pun → default Chrome `lang=id-ID`).
- Wake word (D-18-2): pengenal suara Chrome, varian ejaan sephia/sefia/sofia/sepia…; balasan baku
  "Ya, Panitia. SEPHIA siap membantu."
- Diagnostik di sidebar: baris status (mesin suara, ekstensi, wake word), baris "Mic: …" (tahap audio + teks terdengar),
  tombol "Uji suara SEPHIA" di menu ⋯.

## Ada di repo tetapi tidak aktif
- Neural lokal: `src/audio/local-neural-tts.js`, `chrome-native-messaging-tts.js`, `qualified-local-neural-engine.js`,
  `extension/`, `native-host/` (Rust), skrip provisioning/benchmark. Tidak dipasang di PC mana pun.
- Dokumen tahap 23–45. Tahap 44–45: tidak ada kandidat suara perempuan offline yang disetujui; jalur terbuka hanya
  suara referensi dengan izin tertulis penyuara (runbook stage 36).

## Sengaja belum dibawa dari `feature/sephia-module`
- Audit stage 40/41 dan job CI Rust/Windows (bergantung pada host neural-only yang bertentangan dengan D-18-3).
- Host neural-only fail-closed (akan membuat Sephia bisu tanpa ekstensi).
- File lama di cabang itu: `tim-it/*`, `panitia/*`, `monitor/*`, `moodle/*`, `vercel.json` (jangan di-merge ke `main`).

## Belum terverifikasi di PC panitia
Suara keluar, mikrofon, wake word, balasan suara. Uji: Ctrl+Shift+R → ⋯ → "Uji suara SEPHIA" → ucapkan "Sephia".
