# SMANSASOO CBT LOCK 2.0

Sistem pengawasan dan pengamanan Computer Based Test (CBT) berbasis Moodle yang dikembangkan oleh Tim IT SMAN 1 Sooko Mojokerto.

---

## Overview

SMANSASOO CBT LOCK 2.0 merupakan sistem pendamping Moodle yang dirancang untuk:

* Mendeteksi pelanggaran peserta ujian secara realtime
* Mengelola OTP Unlock secara terpusat
* Menyediakan dashboard monitoring panitia
* Menyediakan dashboard OTP untuk pengawas
* Menampilkan statistik ujian secara realtime
* Terintegrasi dengan Moodle, Firebase, GitHub, dan Vercel

---

## Target Pengguna

### Panitia

* Monitoring seluruh peserta ujian
* Monitoring pelanggaran realtime
* Monitoring OTP
* Monitoring status perangkat peserta
* Monitoring progress pengerjaan soal

### Pengawas

* Menampilkan OTP Unlock
* Membantu peserta yang terkunci
* Monitoring sederhana

### Tim IT

* Monitoring sistem
* Monitoring Firebase
* Monitoring server Moodle
* Monitoring konektivitas

---

## Arsitektur Sistem

Moodle
↓
CBT Lock Client
↓
Firebase Realtime Database
↓
Dashboard Panitia
↓
Dashboard Pengawas

---

## Struktur Project

```text
SMANSASOO-CBTLOCK/

├── dashboard-panitia/
│
│   ├── index.html
│
│   ├── css/
│   │   └── dashboard.css
│
│   ├── js/
│   │   ├── firebase.js
│   │   ├── otp.js
│   │   ├── realtime.js
│   │   └── ui.js
│
│   ├── components/
│   │   ├── sidebar.html
│   │   ├── topbar.html
│   │   ├── stats.html
│   │   ├── table.html
│   │   ├── drawer.html
│   │   └── alert.html
│
│   └── assets/
│
├── dashboard-pengawas/
│
├── moodle-client/
│
├── public/
│   └── assets/
│       └── img/
│           ├── logo.png
│           └── stg.jpg
│
├── vercel.json
│
└── README.md
```

---

## Status Pelanggaran

### SAFE

0 – 10 pelanggaran

Peserta masih dianggap aman.

### WARNING

11 – 25 pelanggaran

Peserta dapat membuka soal kembali menggunakan OTP Pengawas.

### CRITICAL

26 – 29 pelanggaran

Soal terkunci.

Peserta wajib menggunakan Master OTP.

### AUTO SUBMIT

30 pelanggaran

Ujian otomatis diselesaikan dan dikirim.

---

## Jenis Pelanggaran

### Mobile Device

* Keluar fullscreen
* Berpindah tab
* Berpindah aplikasi
* Browser minimize
* Screen lock
* Membuka notifikasi
* Swipe notification bar
* Mengaktifkan paket data
* Menonaktifkan paket data
* Membuka aplikasi lain

---

## OTP System

### OTP Pengawas

Digunakan pada pelanggaran:

11 – 25

### Master OTP Panitia

Digunakan pada pelanggaran:

26 – 29

### Auto Submit

Terjadi pada:

30 pelanggaran

---

## Dashboard Panitia

Fitur utama:

* Live Monitoring
* Live Statistics
* Alert System
* OTP Center
* Master OTP Center
* Detail Siswa
* Violation Monitoring
* Progress Monitoring
* Firebase Monitoring
* Realtime Event System

---

## Dashboard Pengawas

Fitur utama:

* Global OTP Display
* Auto Refresh OTP
* Tampilan sederhana
* Realtime sinkron dengan Panitia

---

## Teknologi

Frontend:

* HTML5
* CSS3
* JavaScript

Backend:

* Firebase Realtime Database

Deployment:

* GitHub
* Vercel

CBT Platform:

* Moodle

---

## Branding

Nama Sistem:

SMANSASOO CBT LOCK 2.0

Sekolah:

SMAN 1 Sooko Mojokerto

Logo:

public/assets/img/logo.png

Background:

public/assets/img/stg.jpg

---

## Roadmap

### Phase 1

Dashboard Panitia

### Phase 2

Dashboard Pengawas

### Phase 3

Firebase Realtime

### Phase 4

Moodle Integration

### Phase 5

CBT Lock Client

### Phase 6

Production Deployment

### Phase 7

Full Live Examination System

---

## Developer

Tim IT
SMAN 1 Sooko Mojokerto

SMANSASOO CBT LOCK 2.0

