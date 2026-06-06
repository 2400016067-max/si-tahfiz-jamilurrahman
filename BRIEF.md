# 📋 PROJECT BRIEF — Sistem Informasi Tahfiz MTs TQ Jamilurrahman

> **Dokumen Referensi:** `SRS_Kelompok6.pdf` & `Laporan_Fase1.pdf`
> **Disusun oleh:** Kelompok 6 — Program Studi Sistem Informasi, Universitas Ahmad Dahlan
> **Tanggal Brief:** 6 Juni 2026

---

## 1. Ringkasan Proyek

Sistem Informasi Tahfiz ini dirancang untuk mendigitalisasi manajemen operasional program Tahfiz Al-Qur'an di MTs TQ Jamilurrahman (cabang yayasan Islamic Centre Binbas). Saat ini, data hafalan santri masih tersebar di berbagai media yang tidak terintegrasi (buku kontrol fisik, WhatsApp Group, OneDrive statis, dan input manual ke komputer). Sistem ini bertujuan menggantikan proses manual tersebut dengan platform web terpadu yang mendukung pencatatan harian, pemantauan real-time, dan pelaporan otomatis.

**Tiga pilar kegiatan utama yang dikelola:**
- **Sabak** — Setoran hafalan baru (dilakukan setiap pagi di sekolah)
- **Sabki/Saki** — Pengulangan hafalan yang baru disetorkan (memperkuat daya ingat)
- **Manzil** — Pengulangan hafalan lama di rumah (murojaah juz yang sudah dihafal, diawasi orang tua)

**Klasifikasi Grade Santri:**
- **Tahsin** — Target: 2–3 baris/hari (tingkat pemula, perbaikan bacaan)
- **Takmil** — Target: 7 baris/hari (tingkat menengah)
- **Tahfiz** — Target: 10–15 baris atau 1 muka/hari (tingkat lanjut)

---

## 2. Daftar Aktor & Tanggung Jawab

### 2.1 Pengampu / Murobbi (Guru Tahfiz) — *Primary User*
Pengguna utama yang melakukan input data harian di sekolah.

| No | Tanggung Jawab |
|----|----------------|
| a | Mengelola kelompok kecil (Halaqah) yang berisi 10–12 santri |
| b | Menyimak setoran **Sabak** (hafalan baru) dan **Sabki** (hafalan kemarin) |
| c | Melakukan input data setoran santri ke sistem (saat ini dilakukan akumulatif setiap 1 bulan) |
| d | Memberikan catatan evaluasi pada buku kontrol / laporan harian melalui WhatsApp |

**Masalah yang dialami:** Proses rekapitulasi data manual memakan waktu sangat lama hingga harus lembur berhari-hari. Data terfragmentasi di berbagai media (buku fisik, WA, OneDrive).

---

### 2.2 Orang Tua / Wali Santri
Aktor yang berperan sebagai pengawas aktivitas santri di luar jam sekolah.

| No | Tanggung Jawab |
|----|----------------|
| a | Menyimak dan bertanggung jawab atas program **Manzil** (murojaah hafalan lama) santri di rumah |
| b | Memberikan bukti validasi berupa tanda tangan di buku kontrol jika santri sudah melakukan murojaah |
| c | Memantau perkembangan harian anak melalui grup WhatsApp |

**Masalah yang dialami:** Sulit memantau perkembangan anak secara real-time. Sering terjadi miskomunikasi dengan sekolah terkait progres hafalan.

---

### 2.3 Koordinator Tahfiz — *Supervisor*
Berfungsi sebagai supervisor dan pengambil keputusan operasional.

| No | Tanggung Jawab |
|----|----------------|
| a | Menentukan klasifikasi Grade santri (Tahsin, Takmil, Tahfiz) berdasarkan hasil tes awal |
| b | Menangani santri yang mengalami stagnasi (stuck) dengan mencari penyebabnya (masalah keluarga, kebiasaan buruk) |
| c | Mengevaluasi kenaikan atau penurunan Grade santri secara berkala |

**Masalah yang dialami:** Kesulitan melakukan evaluasi akurat karena data tidak terintegrasi dan belum ada visualisasi tren perkembangan (grafik).

---

### 2.4 Santri (Murid) — *Subjek Sistem*
Subjek utama dari sistem, namun memiliki **interaksi terbatas** dengan teknologi karena adanya larangan penggunaan gadget pribadi.

| No | Tanggung Jawab |
|----|----------------|
| a | Melakukan setoran hafalan secara tatap muka dengan Pengampu |
| b | Mengisi laporan manual di buku kontrol atau kertas murojaah (divalidasi oleh Pengampu/orang tua) |
| c | Memenuhi target hafalan harian sesuai dengan Grade masing-masing |

**Masalah yang dialami:** Adanya peluang untuk berbohong pada laporan murojaah rumah (Manzil). Dibatasi oleh kebijakan larangan membawa HP pribadi.

> ⚠️ **Catatan Penting:** Santri **tidak memiliki akses langsung** ke sistem. Seluruh input data dilakukan oleh aktor dewasa (Pengampu dan Orang Tua).

---

### 2.5 Kepala Sekolah & Komite Sekolah — *Manajerial*
Berada di level manajerial yang mengawasi hasil akhir dan keberlanjutan program.

| No | Tanggung Jawab |
|----|----------------|
| a | Kepala Sekolah memiliki otoritas atas arsip dan modul ajar tahfiz (hak cipta sekolah) |
| b | Komite Sekolah memberikan usulan strategis (misalnya pengadaan aplikasi khusus tahfiz) |
| c | Menerima dan meninjau laporan rekapitulasi capaian untuk bahan rapat evaluasi |

**Masalah yang dialami:** Belum memiliki sistem informasi yang memadai untuk memberikan laporan komprehensif sebagai bahan rapat evaluasi komite.

---

### Aktor Tambahan: Staf Tata Usaha (TU)
*(Disebutkan dalam dokumen sebagai aktor ke-6, namun termasuk dalam cakupan stakeholder pendukung)*

| No | Tanggung Jawab |
|----|----------------|
| a | Membantu pengelolaan data administratif sekolah |
| b | Mendukung koordinasi data antar unit (unit putra dan putri) |

**Masalah yang dialami:** Tingginya rotasi personel sering memutus kontinuitas dan pemeliharaan sistem data manual.

---

## 3. Functional Requirements (F1–F5)

### F1 — Pengampu / Murobbi (Guru Tahfiz)

#### F1.1 Pencatatan Setoran Hafalan Harian secara Digital (Sabak & Sabki)
| Kode | Deskripsi |
|------|-----------|
| F1.1.1 | Sistem harus memungkinkan Pengampu memilih profil santri dalam kelompok hafalannya (10–12 anak) |
| F1.1.2 | Sistem menyediakan fitur input data **Sabki** (murojaah hafalan kemarin) sebagai prasyarat sebelum menambah hafalan baru |
| F1.1.3 | Sistem menyediakan fitur input data **Sabak** (hafalan baru) meliputi: nama surah, rentang ayat/halaman, dan jumlah baris sesuai target grade |
| F1.1.4 | Sistem secara otomatis memvalidasi kelancaran setoran berdasarkan jumlah kesalahan (maksimal 1 kesalahan per halaman) |

#### F1.2 Pemantauan Aktivitas Murojaah Mandiri Santri di Rumah (Manzil)
| Kode | Deskripsi |
|------|-----------|
| F1.2.1 | Sistem menampilkan status konfirmasi/tanda tangan digital dari Orang Tua terkait aktivitas Manzil santri |
| F1.2.2 | Sistem memberikan peringatan jika santri tidak memiliki laporan Manzil yang tuntas (sebagai pertimbangan sebelum ujian kenaikan juz) |

#### F1.3 Evaluasi Progres dan Komunikasi Dua Arah dengan Orang Tua
| Kode | Deskripsi |
|------|-----------|
| F1.3.1 | Sistem menyediakan fitur "Catatan Pengampu" untuk memberikan feedback harian mengenai kualitas bacaan atau kendala santri |
| F1.3.2 | Sistem menampilkan pesan/catatan dari Orang Tua yang dikirimkan melalui platform (pengganti buku kontrol fisik) |

#### F1.4 Otomatisasi Proses Administrasi dan Pelaporan Berkala
| Kode | Deskripsi |
|------|-----------|
| F1.4.1 | Sistem secara otomatis mengakumulasi data setoran harian menjadi draf laporan mingguan dan bulanan |
| F1.4.2 | Sistem menyediakan fitur ekspor data rekapitulasi ke format PDF/Excel untuk rapat evaluasi atau arsip sekolah |

#### F1.5 Pemantauan Grafik Perkembangan Performa Santri (Analytics)
| Kode | Deskripsi |
|------|-----------|
| F1.5.1 | Sistem menyediakan visualisasi grafik historis tren hafalan (naik/turun) untuk setiap santri |
| F1.5.2 | Sistem memberikan notifikasi kepada Pengampu jika terdapat santri yang menunjukkan tanda stagnasi (tidak ada progres selama periode tertentu) |

#### F1.6 Pengelolaan Target dan Penilaian Khusus selama Pekan Muraja'ah
| Kode | Deskripsi |
|------|-----------|
| F1.6.1 | Sistem memungkinkan Pengampu mengatur jumlah target setoran berdasarkan rumus pembagian hari (contoh: total hafalan ÷ 15 hari) |
| F1.6.2 | Sistem menyediakan fitur penyesuaian threshold kesalahan secara fleksibel (contoh: dari maks 1 menjadi maks 2 per halaman) |
| F1.6.3 | Sistem menyediakan modul pencatatan "Tikrar" (pengulangan 10× di sekolah) bagi santri yang belum tuntas setoran harian |

---

### F2 — Orang Tua / Wali Santri

#### F2.1 Validasi Digital Aktivitas Murojaah Mandiri di Rumah (Manzil)
| Kode | Deskripsi |
|------|-----------|
| F2.1.1 | Sistem menyediakan fitur login khusus akun Orang Tua yang terhubung dengan data anak |
| F2.1.2 | Sistem menampilkan target halaman/juz murojaah harian berdasarkan urutan hafalan santri (target 2,5 lembar/hari) |
| F2.1.3 | Sistem menyediakan fitur konfirmasi (centang digital/tanda tangan layar) sebagai bukti orang tua telah menyimak murojaah anak |
| F2.1.4 | Sistem memungkinkan orang tua menginput jumlah halaman aktual jika santri tidak mencapai target |

#### F2.2 Pemantauan Perkembangan Hafalan Harian dan Kualitas Bacaan Anak
| Kode | Deskripsi |
|------|-----------|
| F2.2.1 | Sistem menampilkan laporan harian hasil setoran Sabak (baru) dan Sabki (kemarin) yang diinput oleh Pengampu |
| F2.2.2 | Sistem menampilkan status kelancaran setoran dan jumlah kesalahan yang tercatat pada setiap sesi |
| F2.2.3 | Sistem menampilkan pemberitahuan (notifikasi) jika anak dinyatakan lulus atau harus mengulang pada Ujian Kenaikan Juz (UKJ) |

#### F2.3 Visualisasi Tren Perkembangan Performa Anak (Analytics)
| Kode | Deskripsi |
|------|-----------|
| F2.3.1 | Sistem menyediakan dashboard grafik yang menunjukkan tren naik/turunnya jumlah baris yang dihafal anak setiap bulannya |
| F2.3.2 | Sistem menampilkan historis capaian juz santri dari awal pendaftaran hingga posisi saat ini |

#### F2.4 Komunikasi Dua Arah dengan Pengampu/Murobbi
| Kode | Deskripsi |
|------|-----------|
| F2.4.1 | Sistem menyediakan fitur "Catatan Orang Tua" untuk mengirim pesan/laporan kendala belajar anak di rumah kepada Pengampu |
| F2.4.2 | Sistem menampilkan catatan evaluasi atau saran perbaikan yang dikirimkan oleh Pengampu |

#### F2.5 Pemantauan Kewajiban Tikrar dan Persiapan Ujian Anak
| Kode | Deskripsi |
|------|-----------|
| F2.5.1 | Sistem memberikan notifikasi jika anak diwajibkan melakukan Tikrar 10× di rumah sebagai konsekuensi belum tuntas setoran |
| F2.5.2 | Sistem menyediakan fitur bagi Orang Tua untuk menandai kesiapan bagian hafalan yang akan disetorkan anak pada Pekan Muraja'ah |

---

### F3 — Koordinator Tahfiz

#### F3.1 Pengelolaan Klasifikasi Tingkat (Grade) Santri secara Sistematis
| Kode | Deskripsi |
|------|-----------|
| F3.1.1 | Sistem menyediakan fitur untuk menentukan grade awal santri (Tahsin, Takmil, Tahfiz) berdasarkan hasil tes pendaftaran |
| F3.1.2 | Sistem memfasilitasi evaluasi berkala (setengah tahun/tahunan) untuk menentukan kenaikan/penurunan grade berdasarkan performa hafalan |
| F3.1.3 | Sistem memungkinkan penyesuaian target setoran harian secara otomatis mengikuti perubahan grade santri |

#### F3.2 Intervensi dan Penanganan Santri Stagnasi (Stuck)
| Kode | Deskripsi |
|------|-----------|
| F3.2.1 | Sistem memberikan notifikasi otomatis kepada Koordinator jika santri tidak menunjukkan progres selama periode tertentu |
| F3.2.2 | Sistem menyediakan form khusus untuk menginput hasil analisis penyebab stagnasi (masalah keluarga, psikososial, kecanduan game) |
| F3.2.3 | Sistem mencatat langkah-langkah korektif yang diambil Koordinator sebagai bagian dari historis perkembangan santri |

#### F3.3 Pengawasan dan Validasi Ujian Kenaikan Juz (UKJ)
| Kode | Deskripsi |
|------|-----------|
| F3.3.1 | Sistem memungkinkan Koordinator untuk menyimak dan memvalidasi setoran ujian juz secara utuh bersama Pengampu |
| F3.3.2 | Sistem menyediakan fitur otorisasi kelulusan UKJ sebelum santri diperbolehkan mengakses target hafalan di juz berikutnya |

#### F3.4 Dashboard Manajerial (Analytics)
| Kode | Deskripsi |
|------|-----------|
| F3.4.1 | Sistem menyajikan visualisasi data agregat (grafik tren) untuk melihat performa program tahfiz keseluruhan antar-grade |
| F3.4.2 | Sistem menyediakan fitur pembuatan laporan rekapitulasi komprehensif sebagai bahan rapat evaluasi bersama Komite Sekolah |

#### F3.5 Pengelolaan Jadwal dan Materi Ujian Tahfidz Semesteran
| Kode | Deskripsi |
|------|-----------|
| F3.5.1 | Sistem menyediakan fitur penjadwalan ujian massal (contoh: periode 18–23 Mei) dengan pembatasan waktu akses (deadline) |
| F3.5.2 | Sistem memungkinkan Koordinator menetapkan materi ujian secara spesifik (contoh: hanya 2 juz untuk kelas 9) yang berbeda dari standar UKJ biasa |

---

### F4 — Kepala Sekolah & Komite Sekolah

#### F4.1 Pemantauan Keberhasilan dan Ketercapaian Target Program secara Makro
| Kode | Deskripsi |
|------|-----------|
| F4.1.1 | Sistem menyediakan Dashboard eksekutif yang menampilkan ringkasan statistik capaian hafalan seluruh santri secara agregat |
| F4.1.2 | Sistem menampilkan visualisasi perbandingan performa antar-grade (Tahsin, Takmil, Tahfiz) sebagai bahan evaluasi kebijakan |

#### F4.2 Akses Laporan Formal untuk Rapat Strategis dan Rapat Komite
| Kode | Deskripsi |
|------|-----------|
| F4.2.1 | Sistem menyediakan akses langsung untuk melihat dan mengunduh laporan rekapitulasi capaian semesteran dan tahunan |
| F4.2.2 | Sistem menyediakan data historis untuk mendukung usulan strategis terkait pengembangan infrastruktur atau aplikasi tahfiz |

#### F4.3 Pengelolaan dan Perlindungan Aset Intelektual serta Arsip Sekolah
| Kode | Deskripsi |
|------|-----------|
| F4.3.1 | Sistem menyediakan modul penyimpanan arsip digital untuk modul ajar tahfiz (hak cipta sekolah) |
| F4.3.2 | Sistem membatasi akses pengunduhan modul ajar hanya untuk personel yang memiliki otoritas tertentu |

#### F4.4 Pengawasan Kualitas dan Kontinuitas Program
| Kode | Deskripsi |
|------|-----------|
| F4.4.1 | Sistem menyediakan informasi mengenai status ketersediaan personel (pengampu) dan distribusi hafalan untuk memastikan operasional tetap stabil |

---

### F5 — Staf Tata Usaha (TU)

#### F5.1 Jaminan Kontinuitas dan Pemeliharaan Sistem meskipun Terjadi Rotasi Staf
| Kode | Deskripsi |
|------|-----------|
| F5.1.1 | Sistem menyediakan modul pengelolaan akun (User Management) untuk mengalihkan hak akses saat terjadi pergantian staf TU atau pengampu |
| F5.1.2 | Sistem menyediakan fitur pencadangan (backup) data secara otomatis dan berkala untuk mencegah kehilangan data historis |

#### F5.2 Dukungan Manajemen Data Administratif dan Koordinasi Antar-Unit
| Kode | Deskripsi |
|------|-----------|
| F5.2.1 | Sistem memungkinkan TU melakukan sinkronisasi format pelaporan agar seragam di seluruh unit sekolah |
| F5.2.2 | Sistem menyediakan fitur pencarian cepat data santri berdasarkan NIM atau nama untuk keperluan surat-menyurat administratif |

#### F5.3 Pengelolaan Arsip Digital Laporan Perkembangan Santri secara Terpusat
| Kode | Deskripsi |
|------|-----------|
| F5.3.1 | Sistem menyediakan fitur pengarsipan otomatis untuk laporan bulanan dan semesteran yang telah divalidasi Koordinator |
| F5.3.2 | Sistem memungkinkan TU memverifikasi kelengkapan data administratif (kontak orang tua terbaru) guna memastikan laporan tersampaikan |

#### F5.4 Bantuan Operasional Harian jika Terdapat Kendala Teknis
| Kode | Deskripsi |
|------|-----------|
| F5.4.1 | Sistem memberikan otoritas terbatas kepada TU untuk membantu perbaikan kesalahan input data harian atas persetujuan Koordinator |

---

## 4. Constraints (Batasan Sistem)

### 4.1 Batasan Akses Pengguna (*Strict User Access Control*)
- **Larangan Gadget Santri:** Santri dilarang memiliki HP pribadi selama 3 tahun masa pendidikan. Sistem **tidak boleh** menyediakan antarmuka (UI) untuk santri.
- **Otoritas Input Dewasa:** Seluruh input data digital sepenuhnya menjadi tanggung jawab Pengampu (guru) dan Orang Tua.
- **Hierarki Akses:** Akses terhadap modul ajar dan data sensitif dibatasi berdasarkan peran (*Role-Based Access Control*) untuk menjaga privasi dan keamanan data.

### 4.2 Batasan Arsitektur & Teknologi (*Technical Constraints*)
- **Platform Web-Responsive:** Sistem harus berbasis web agar dapat diakses melalui berbagai perangkat (PC/Laptop untuk Guru, Smartphone untuk Orang Tua) tanpa perlu instalasi aplikasi tambahan.
- **Kemudahan Penggunaan (Usability):** Antarmuka harus sangat sederhana mengingat latar belakang pengguna (Guru Tahfiz) yang tidak semuanya memiliki keahlian IT tinggi.
- **Skalabilitas Unit:** Desain sistem harus bersifat generik agar dapat diadopsi oleh unit lain (seperti unit Putri) di masa depan.

### 4.3 Batasan Operasional & Waktu (*Operational Constraints*)
- **Jendela Waktu Input:** Sesi tahfiz hanya berlangsung 2 jam (07:00–09:00 WIB). Sistem harus mampu memproses input data 10–12 santri per halaqah dalam durasi tersebut tanpa mengganggu proses simakan.
- **Input Harian Wajib:** Sistem harus menggantikan kebiasaan input manual bulanan. Digitalisasi harus terjadi setiap hari agar data tetap real-time.
- **Konektivitas Internet:** Operasional sistem sepenuhnya bergantung pada ketersediaan jaringan internet di lingkungan sekolah dan rumah orang tua.

### 4.4 Batasan Legalitas & Hak Atas Kekayaan Intelektual (HAKI)
- **Hak Cipta Modul:** Seluruh modul ajar dan metode tahfiz merupakan hak cipta milik sekolah. Sistem dilarang keras menyebarkan atau memungkinkan pengunduhan dokumen modul ajar oleh pihak luar secara ilegal.
- **Kerahasiaan Data:** Riwayat perkembangan santri (termasuk catatan psikososial dari Koordinator) bersifat rahasia dan hanya boleh diakses oleh pihak yang berkepentingan langsung.

### 4.5 Batasan Keberlanjutan (*Sustainability Constraints*)
- **Kontinuitas Personel:** Sistem harus didesain agar mudah dikelola meskipun terjadi rotasi staf TU atau pengampu yang berpindah unit/cabang.
- **Kemudahan Pemeliharaan:** Dokumentasi teknis (rancangan database dan logika kode) harus jelas agar dapat dikembangkan atau diperbaiki oleh tim IT sekolah di masa depan.

---

## 5. Non-Functional Requirements (Ringkasan)

| Kategori | Kode | Deskripsi |
|----------|------|-----------|
| **Performance** | NFR-01.1 | Profil 10–12 santri harus dimuat dalam < 2 detik |
| | NFR-01.2 | Pengolahan data harian menjadi grafik tren harus real-time |
| **Security** | NFR-02.1 | Role-Based Access Control (RBAC) ketat — data psikososial hanya untuk Koordinator |
| | NFR-02.2 | Modul ajar harus dilindungi dengan enkripsi/pembatasan hak unduh |
| | NFR-02.3 | Tidak boleh ada celah akses (URL/Login) bagi santri |
| **Usability** | NFR-03.1 | UI sangat sederhana dan intuitif untuk berbagai tingkat literasi digital |
| | NFR-03.2 | Desain mobile-responsive untuk konfirmasi Manzil oleh orang tua |
| **Availability** | NFR-04.1 | Uptime minimal 99% selama jam operasional tahfiz (07:00–09:00 WIB) |
| | NFR-04.2 | Optimasi data agar stabil pada jaringan terbatas |
| **Sustainability** | NFR-05.1 | Dokumentasi teknis dan skema database yang jelas |
| | NFR-05.2 | Auto-backup harian yang dikelola staf TU |
| **Scalability** | NFR-06.1 | Arsitektur generik yang dapat diadopsi oleh unit lain |

---

## 6. Rekomendasi Tech Stack untuk Prototype Web App

Berdasarkan analisis kebutuhan, batasan, dan konteks pengguna, berikut rekomendasi tech stack:

### 🖥️ Frontend
| Teknologi | Alasan |
|-----------|--------|
| **Next.js 14+ (React)** | Framework full-stack dengan SSR/SSG untuk performa optimal, routing bawaan, dan ekosistem luas. Mendukung mobile-responsive design yang dibutuhkan. |
| **Tailwind CSS** | Utility-first CSS framework untuk membangun UI yang sederhana, konsisten, dan cepat — sesuai kebutuhan usability pengguna dengan literasi digital beragam. |
| **Chart.js / Recharts** | Library visualisasi data untuk grafik tren hafalan (requirement analytics F1.5, F2.3, F3.4). |
| **React Hook Form + Zod** | Pengelolaan form input setoran yang efisien dengan validasi schema — penting untuk F1.1 dan F2.1. |

### ⚙️ Backend & API
| Teknologi | Alasan |
|-----------|--------|
| **Next.js API Routes / Route Handlers** | API terintegrasi dalam satu codebase, mengurangi kompleksitas deployment. |
| **NextAuth.js (Auth.js)** | Autentikasi multi-role (RBAC) yang mature — mendukung 5 peran berbeda tanpa akses santri (NFR-02). |
| **Prisma ORM** | Type-safe database toolkit dengan schema yang jelas — mendukung kebutuhan dokumentasi teknis (NFR-05.1). |

### 🗄️ Database
| Teknologi | Alasan |
|-----------|--------|
| **PostgreSQL (via Supabase atau Neon)** | Database relasional yang robust untuk data terstruktur (hafalan, grade, evaluasi). Supabase menyediakan auto-backup (NFR-05.2), real-time subscriptions, dan row-level security (RBAC). |

### ☁️ Deployment & Infrastruktur
| Teknologi | Alasan |
|-----------|--------|
| **Vercel** | Platform deployment untuk Next.js dengan uptime tinggi (mendukung NFR-04.1: 99% availability). Free tier cukup untuk prototype. |
| **Supabase** | Backend-as-a-Service dengan PostgreSQL, auth, storage (untuk modul ajar), dan auto-backup built-in. |

### 📦 Fitur Tambahan
| Kebutuhan | Teknologi |
|-----------|-----------|
| Ekspor PDF/Excel (F1.4.2) | **jsPDF + SheetJS (xlsx)** |
| Notifikasi (F1.5.2, F2.2.3) | **Web Push Notifications** atau **WhatsApp Business API** (familiar bagi pengguna) |
| Tanda tangan digital (F2.1.3) | **react-signature-canvas** |
| File storage / arsip modul ajar (F4.3) | **Supabase Storage** dengan RLS (Row Level Security) |

### 🏗️ Arsitektur yang Direkomendasikan

```
┌─────────────────────────────────────────────────┐
│                   FRONTEND                       │
│          Next.js 14+ (App Router)                │
│     Tailwind CSS + Recharts + React Hook Form    │
├─────────────────────────────────────────────────┤
│                  API LAYER                       │
│       Next.js Route Handlers + NextAuth.js       │
│              Prisma ORM (Type-safe)              │
├─────────────────────────────────────────────────┤
│                  DATABASE                        │
│         PostgreSQL (Supabase / Neon)              │
│     Auto-backup · RLS · Real-time subscriptions  │
├─────────────────────────────────────────────────┤
│               INFRASTRUCTURE                     │
│     Vercel (Hosting) + Supabase (BaaS)           │
│        Storage · Auth · Edge Functions           │
└─────────────────────────────────────────────────┘
```

### 💡 Pertimbangan Khusus
1. **Offline-first bukan prioritas** — sistem bergantung pada konektivitas internet (Constraint 4.3), namun perlu optimasi agar stabil di jaringan lambat.
2. **WhatsApp Integration** — Pertimbangkan integrasi dengan WhatsApp Business API untuk notifikasi, karena orang tua sudah terbiasa menggunakan WhatsApp untuk komunikasi dengan sekolah.
3. **Progressive Web App (PWA)** — Bisa dipertimbangkan agar orang tua bisa "install" di layar home smartphone tanpa perlu app store.
4. **Multi-tenancy** — Arsitektur harus mendukung multi-unit (putra & putri) sejak awal sesuai Constraint 4.2 (Skalabilitas Unit).

---

> 📝 *Brief ini disusun berdasarkan dokumen SRS_Kelompok6.pdf dan Laporan_Fase1.pdf. Untuk detail teknis lebih lanjut (use case diagram, activity diagram, ERD), silakan rujuk ke dokumen SRS asli.*
