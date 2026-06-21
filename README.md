# SMANSASOO Security System 2.0

Sistem keamanan, monitoring, dan pengawasan ujian digital yang dikembangkan oleh Tim IT SMAN 1 Sooko Mojokerto.

---

## Overview

SMANSASOO Security System 2.0 merupakan platform monitoring dan pengamanan ujian berbasis Moodle yang dirancang untuk mendeteksi pelanggaran, mengelola OTP, memonitor peserta secara realtime, serta menyediakan pusat kendali bagi panitia dan pengawas.

Sistem ini dibangun menggunakan HTML, CSS, JavaScript, Firebase Realtime Database, GitHub, dan Vercel.

---

## Tujuan Sistem

* Monitoring peserta ujian secara realtime
* Deteksi pelanggaran ujian otomatis
* Sistem OTP Unlock terpusat
* Dashboard Panitia (Control Center)
* Dashboard Pengawas (Supervisor Panel)
* Integrasi Moodle CBT
* Monitoring status perangkat peserta
* Monitoring progres pengerjaan soal
* Statistik realtime selama ujian berlangsung

---

## Target Pengguna

### Panitia

* Monitoring seluruh peserta
* Monitoring pelanggaran realtime
* Monitoring OTP dan Master OTP
* Monitoring status perangkat
* Monitoring progres ujian
* Monitoring Firebase dan server CBT

### Pengawas

* Menampilkan OTP peserta
* Membantu proses unlock peserta
* Monitoring sederhana ruang ujian

### Tim IT

* Monitoring infrastruktur sistem
* Monitoring Firebase Realtime Database
* Monitoring integrasi Moodle
* Monitoring deployment Vercel

---

## Arsitektur Sistem

Moodle CBT

↓

CBT Client Security Layer

↓

Firebase Realtime Database

↓

Panitia Control Center

↓

Supervisor Panel

---

## Struktur Project

```text
public/

├── index.html
│
├── panitia/
│   ├── index.html
│   ├── css/
│   └── js/
│
├── pengawas/
│   ├── index.html
│   ├── css/
│   └── js/
│
├── shared/
│   ├── constants.js
│   ├── engine.js
│   ├── otp-engine.js
│   └── status-engine.js
│
├── firebase/
│   ├── config.js
│   ├── schema.json
│   └── rules.txt
│
├── moodle/
│   ├── cbtlock.js
│   ├── sync.js
│   └── tracker.js
│
└── assets/
    ├── img/
    │   ├── logo.png
    │   ├── favicon.ico
    │   ├── stg.jpg
    │   └── bg.jpg
    │
    ├── css/
    │   └── glass.css
    │
    └── js/
        └── app.js
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

Peserta wajib menggunakan Master OTP Panitia.

### AUTO SUBMIT

30 pelanggaran

Ujian otomatis dikirim dan sesi berakhir.

---

## Sistem OTP

### OTP Pengawas

Digunakan pada status:

* WARNING

### Master OTP Panitia

Digunakan pada status:

* CRITICAL

### Auto Submit

Terjadi pada:

* 30 pelanggaran

---

## Dashboard Panitia

Fitur utama:

* Live Monitoring
* Live Statistics
* Realtime Alert System
* OTP Center
* Master OTP Center
* Detail Peserta
* Violation Monitoring
* Progress Monitoring
* Firebase Monitoring
* Realtime Event System

---

## Dashboard Pengawas

Fitur utama:

* OTP Display
* OTP Unlock
* Auto Refresh
* Realtime Sinkronisasi
* Monitoring Ruang Ujian

---

## Teknologi

### Frontend

* HTML5
* CSS3
* JavaScript ES6

### Backend

* Firebase Realtime Database

### Deployment

* GitHub
* Vercel

### CBT Platform

* Moodle

---

## Asset Standar

### Logo

```text
/assets/img/logo.png
```

### Favicon

```text
/assets/img/favicon.ico
```

### Background Dashboard Panitia

```text
/assets/img/stg.jpg
```

### Background Dashboard Pengawas

```text
/ assets/img/bg.jpg
```

---

## Branding

Nama Sistem:

SMANSASOO Security System 2.0

Sekolah:

SMAN 1 Sooko Mojokerto

Developer:

Tim IT SMAN 1 Sooko

---

## Roadmap

### Layer 1

Project Foundation

### Layer 2

Dashboard Panitia

### Layer 3

Dashboard Pengawas

### Layer 4

Firebase Realtime Integration

### Layer 5

OTP Engine

### Layer 6

Moodle Integration

### Layer 7

Production Deployment

### Layer 8

Full Security Monitoring System

---

## License

Internal Project

SMAN 1 Sooko Mojokerto

---

SMANSASOO Security System 2.0
© Tim IT SMAN 1 Sooko Mojokerto
