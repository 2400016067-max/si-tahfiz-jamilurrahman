-- ============================================================
-- SEED DATA — Sistem Informasi Tahfiz MTs TQ Jamilurrahman
-- Sumber: src/lib/mockData.ts
-- Tanggal: 2026-06-06
--
-- UUID PREFIX LEGEND (semua karakter hex valid: 0-9, a-f):
--   1xxxxxxx-... → users
--   2xxxxxxx-... → halaqah
--   3xxxxxxx-... → santri
--   4xxxxxxx-... → hafalan_juz
--   5xxxxxxx-... → setoran
--   6xxxxxxx-... → pesan
--   7xxxxxxx-... → modul_ajar
--   8xxxxxxx-... → ujian_juz
--
-- CATATAN:
--   • password_hash di bawah adalah placeholder untuk development.
--     Ganti dengan hash bcrypt yang benar sebelum ke production.
--   • Jalankan schema SQL terlebih dahulu sebelum menjalankan seed ini.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. USERS
--    11 baris: 2 pengampu + 9 orang tua
-- ============================================================
INSERT INTO users (id, email, password_hash, role, nama_lengkap, no_hp, is_active)
VALUES
  -- Pengampu
  (
    '10000000-0000-0000-0000-000000000001',
    'ahmad.fauzi@mts-tq.sch.id',
    '$2b$10$placeholderHashForDevOnly.AhmadFauzi',
    'pengampu', 'Ustadz Ahmad Fauzi', NULL, true
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'aminah@mts-tq.sch.id',
    '$2b$10$placeholderHashForDevOnly.UstadzahAminah',
    'pengampu', 'Ustadzah Aminah', NULL, true
  ),
  -- Orang Tua / Wali Santri
  (
    '10000000-0000-0000-0000-000000000011',
    'salman@parent.mts-tq.sch.id',
    '$2b$10$placeholderHashForDevOnly.Salman',
    'orangtua', 'Bapak Salman', '081234567890', true
  ),
  (
    '10000000-0000-0000-0000-000000000012',
    'joko@parent.mts-tq.sch.id',
    '$2b$10$placeholderHashForDevOnly.Joko',
    'orangtua', 'Bapak Joko', '081298765432', true
  ),
  (
    '10000000-0000-0000-0000-000000000013',
    'arman@parent.mts-tq.sch.id',
    '$2b$10$placeholderHashForDevOnly.Arman',
    'orangtua', 'Bapak Arman', '085211223344', true
  ),
  (
    '10000000-0000-0000-0000-000000000014',
    'rahmat@parent.mts-tq.sch.id',
    '$2b$10$placeholderHashForDevOnly.Rahmat',
    'orangtua', 'Bapak Rahmat', '089877665544', true
  ),
  (
    '10000000-0000-0000-0000-000000000015',
    'yusuf@parent.mts-tq.sch.id',
    '$2b$10$placeholderHashForDevOnly.Yusuf',
    'orangtua', 'Bapak Yusuf', '081122334455', true
  ),
  (
    '10000000-0000-0000-0000-000000000016',
    'ali@parent.mts-tq.sch.id',
    '$2b$10$placeholderHashForDevOnly.Ali',
    'orangtua', 'Bapak Ali', '082233445566', true
  ),
  (
    '10000000-0000-0000-0000-000000000017',
    'usman@parent.mts-tq.sch.id',
    '$2b$10$placeholderHashForDevOnly.UsmanParent',
    'orangtua', 'Bapak Usman', '083344556677', true
  ),
  (
    '10000000-0000-0000-0000-000000000018',
    'hasyim@parent.mts-tq.sch.id',
    '$2b$10$placeholderHashForDevOnly.Hasyim',
    'orangtua', 'Bapak Hasyim', '084455667788', true
  ),
  (
    '10000000-0000-0000-0000-000000000019',
    'harun@parent.mts-tq.sch.id',
    '$2b$10$placeholderHashForDevOnly.Harun',
    'orangtua', 'Bapak Harun', '085566778899', true
  );


-- ============================================================
-- 2. HALAQAH
--    h-1 = Halaqah Abu Bakar (Putra)
--    h-2 = Halaqah Aisyah (Putri)
-- ============================================================
INSERT INTO halaqah (id, nama, unit, pengampu_id, is_active)
VALUES
  (
    '20000000-0000-0000-0000-000000000001',
    'Halaqah Abu Bakar (Putra)',
    'Putra',
    '10000000-0000-0000-0000-000000000001',  -- Ustadz Ahmad Fauzi
    true
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    'Halaqah Aisyah (Putri)',
    'Putri',
    '10000000-0000-0000-0000-000000000002',  -- Ustadzah Aminah
    true
  );


-- ============================================================
-- 3. SANTRI (9 santri)
-- ============================================================
INSERT INTO santri (
  id, nama, kelas, grade, target_baris, halaqah_id,
  parent_user_id, parent_name, parent_phone,
  current_juz, status,
  stagnancy_reason, stagnancy_detail, stagnancy_action, stagnancy_since
)
VALUES
  -- s-1: Muhammad Al-Fatih
  (
    '30000000-0000-0000-0000-000000000001',
    'Muhammad Al-Fatih',
    '7A', 'Tahfiz', 12,
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000011',
    'Bapak Salman', '081234567890',
    30, 'active',
    NULL, NULL, NULL, NULL
  ),
  -- s-2: Abdurrahman Wahid
  (
    '30000000-0000-0000-0000-000000000002',
    'Abdurrahman Wahid',
    '7A', 'Takmil', 7,
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000012',
    'Bapak Joko', '081298765432',
    30, 'active',
    NULL, NULL, NULL, NULL
  ),
  -- s-3: Zaid bin Haritsah (stagnant — game)
  (
    '30000000-0000-0000-0000-000000000003',
    'Zaid bin Haritsah',
    '8A', 'Tahfiz', 15,
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000013',
    'Bapak Arman', '085211223344',
    29, 'stagnant',
    'game',
    'Santri sering tidur di kelas karena bermain game larut malam di rumah di akhir pekan.',
    'Memanggil orang tua dan membatasi akses gadget saat libur sekolah.',
    '2026-05-15'
  ),
  -- s-4: Ali bin Abi Thalib
  (
    '30000000-0000-0000-0000-000000000004',
    'Ali bin Abi Thalib',
    '8A', 'Tahsin', 3,
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000014',
    'Bapak Rahmat', '089877665544',
    30, 'active',
    NULL, NULL, NULL, NULL
  ),
  -- s-5: Usman bin Affan
  (
    '30000000-0000-0000-0000-000000000005',
    'Usman bin Affan',
    '9A', 'Tahfiz', 12,
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000015',
    'Bapak Yusuf', '081122334455',
    28, 'active',
    NULL, NULL, NULL, NULL
  ),
  -- s-6: Fathimah Az-Zahra
  (
    '30000000-0000-0000-0000-000000000006',
    'Fathimah Az-Zahra',
    '7B', 'Tahfiz', 12,
    '20000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000016',
    'Bapak Ali', '082233445566',
    30, 'active',
    NULL, NULL, NULL, NULL
  ),
  -- s-7: Aisyah Humaira
  (
    '30000000-0000-0000-0000-000000000007',
    'Aisyah Humaira',
    '7B', 'Takmil', 7,
    '20000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000017',
    'Bapak Usman', '083344556677',
    30, 'active',
    NULL, NULL, NULL, NULL
  ),
  -- s-8: Khadijah Al-Kubra (stagnant — keluarga)
  (
    '30000000-0000-0000-0000-000000000008',
    'Khadijah Al-Kubra',
    '8B', 'Tahfiz', 15,
    '20000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000018',
    'Bapak Hasyim', '084455667788',
    29, 'stagnant',
    'keluarga',
    'Santri tertekan karena orang tua menuntut terlalu tinggi tanpa mendampingi proses murajaah di rumah.',
    'Konseling bersama Koordinator Tahfiz dan Orang Tua untuk melunakkan ekspektasi.',
    '2026-05-20'
  ),
  -- s-9: Sumayyah binti Khayyat
  (
    '30000000-0000-0000-0000-000000000009',
    'Sumayyah binti Khayyat',
    '9B', 'Tahsin', 3,
    '20000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000019',
    'Bapak Harun', '085566778899',
    30, 'active',
    NULL, NULL, NULL, NULL
  );


-- ============================================================
-- 4. HAFALAN_JUZ
--    Dari field totalHafalanJuz[] tiap santri:
--      s-1: [30]     s-3: [30]     s-5: [30, 29]
--      s-6: [30]     s-8: [30]
-- ============================================================
INSERT INTO hafalan_juz (id, santri_id, juz, tanggal_selesai)
VALUES
  -- s-1, juz 30 (dari ujian uj-1: 2026-05-15)
  (
    '40000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    30, '2026-05-15'
  ),
  -- s-3, juz 30 (estimasi, sebelum masa stagnasi)
  (
    '40000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000003',
    30, '2026-03-01'
  ),
  -- s-5, juz 30 (dari ujian uj-2: 2026-04-10)
  (
    '40000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000005',
    30, '2026-04-10'
  ),
  -- s-5, juz 29 (dari ujian uj-3: 2026-05-28)
  (
    '40000000-0000-0000-0000-000000000004',
    '30000000-0000-0000-0000-000000000005',
    29, '2026-05-28'
  ),
  -- s-6, juz 30 (dari ujian uj-4: 2026-05-22)
  (
    '40000000-0000-0000-0000-000000000005',
    '30000000-0000-0000-0000-000000000006',
    30, '2026-05-22'
  ),
  -- s-8, juz 30 (estimasi)
  (
    '40000000-0000-0000-0000-000000000006',
    '30000000-0000-0000-0000-000000000008',
    30, '2026-02-15'
  );


-- ============================================================
-- 5. SETORAN (19 baris — semua dari initialSetorans)
--    Santri putra (s-1..s-5) → dicatat_oleh Ustadz Ahmad Fauzi
--    Santri putri (s-6..s-9) → dicatat_oleh Ustadzah Aminah
-- ============================================================
INSERT INTO setoran (
  id, santri_id, tanggal, tipe,
  surah, halaman_mulai, halaman_selesai, jumlah_baris,
  jumlah_kesalahan, status, parent_verified, dicatat_oleh
)
VALUES
  -- ── Muhammad Al-Fatih (s-1) ──────────────────────────────
  -- set-1
  (
    '50000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    '2026-06-01', 'sabak',
    'An-Naba', 582, 582, 12,
    0, 'lulus', true,
    '10000000-0000-0000-0000-000000000001'
  ),
  -- set-2
  (
    '50000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000001',
    '2026-06-01', 'sabki',
    'An-Nazi''at', 583, 583, 12,
    1, 'lulus', true,
    '10000000-0000-0000-0000-000000000001'
  ),
  -- set-3
  (
    '50000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000001',
    '2026-06-01', 'manzil',
    'An-Naba', 582, 582, 15,
    0, 'lulus', true,
    '10000000-0000-0000-0000-000000000001'
  ),
  -- set-4
  (
    '50000000-0000-0000-0000-000000000004',
    '30000000-0000-0000-0000-000000000001',
    '2026-06-02', 'sabak',
    'An-Naba', 583, 583, 10,
    1, 'lulus', true,
    '10000000-0000-0000-0000-000000000001'
  ),
  -- set-5
  (
    '50000000-0000-0000-0000-000000000005',
    '30000000-0000-0000-0000-000000000001',
    '2026-06-02', 'sabki',
    'An-Naba', 582, 582, 12,
    0, 'lulus', true,
    '10000000-0000-0000-0000-000000000001'
  ),
  -- set-6
  (
    '50000000-0000-0000-0000-000000000006',
    '30000000-0000-0000-0000-000000000001',
    '2026-06-02', 'manzil',
    'An-Nazi''at', 583, 584, 30,
    1, 'lulus', true,
    '10000000-0000-0000-0000-000000000001'
  ),
  -- set-7
  (
    '50000000-0000-0000-0000-000000000007',
    '30000000-0000-0000-0000-000000000001',
    '2026-06-03', 'sabak',
    'Abasa', 585, 585, 12,
    0, 'lulus', true,
    '10000000-0000-0000-0000-000000000001'
  ),
  -- set-8
  (
    '50000000-0000-0000-0000-000000000008',
    '30000000-0000-0000-0000-000000000001',
    '2026-06-03', 'sabki',
    'An-Naba', 583, 583, 12,
    0, 'lulus', true,
    '10000000-0000-0000-0000-000000000001'
  ),
  -- set-9
  (
    '50000000-0000-0000-0000-000000000009',
    '30000000-0000-0000-0000-000000000001',
    '2026-06-03', 'manzil',
    'Abasa', 585, 585, 15,
    0, 'lulus', true,
    '10000000-0000-0000-0000-000000000001'
  ),
  -- set-10 (mengulang, parent_verified: false)
  (
    '50000000-0000-0000-0000-000000000010',
    '30000000-0000-0000-0000-000000000001',
    '2026-06-04', 'sabak',
    'Abasa', 586, 586, 14,
    2, 'mengulang', false,
    '10000000-0000-0000-0000-000000000001'
  ),
  -- set-11
  (
    '50000000-0000-0000-0000-000000000011',
    '30000000-0000-0000-0000-000000000001',
    '2026-06-04', 'sabki',
    'Abasa', 585, 585, 12,
    1, 'lulus', true,
    '10000000-0000-0000-0000-000000000001'
  ),
  -- set-12
  (
    '50000000-0000-0000-0000-000000000012',
    '30000000-0000-0000-0000-000000000001',
    '2026-06-05', 'sabak',
    'Abasa', 586, 586, 12,
    0, 'lulus', false,
    '10000000-0000-0000-0000-000000000001'
  ),
  -- set-13
  (
    '50000000-0000-0000-0000-000000000013',
    '30000000-0000-0000-0000-000000000001',
    '2026-06-05', 'sabki',
    'Abasa', 585, 586, 24,
    1, 'lulus', false,
    '10000000-0000-0000-0000-000000000001'
  ),
  -- set-14
  (
    '50000000-0000-0000-0000-000000000014',
    '30000000-0000-0000-0000-000000000001',
    '2026-06-05', 'manzil',
    'At-Takwir', 586, 587, 30,
    0, 'lulus', true,
    '10000000-0000-0000-0000-000000000001'
  ),
  -- ── Abdurrahman Wahid (s-2) ──────────────────────────────
  -- set-15
  (
    '50000000-0000-0000-0000-000000000015',
    '30000000-0000-0000-0000-000000000002',
    '2026-06-04', 'sabak',
    'An-Naba', 582, 582, 7,
    1, 'lulus', true,
    '10000000-0000-0000-0000-000000000001'
  ),
  -- set-16
  (
    '50000000-0000-0000-0000-000000000016',
    '30000000-0000-0000-0000-000000000002',
    '2026-06-05', 'sabak',
    'An-Naba', 583, 583, 7,
    0, 'lulus', false,
    '10000000-0000-0000-0000-000000000001'
  ),
  -- ── Zaid bin Haritsah (s-3, stagnant) ───────────────────
  -- set-17
  (
    '50000000-0000-0000-0000-000000000017',
    '30000000-0000-0000-0000-000000000003',
    '2026-06-01', 'sabak',
    'At-Takwir', 586, 586, 12,
    3, 'mengulang', true,
    '10000000-0000-0000-0000-000000000001'
  ),
  -- ── Fathimah Az-Zahra (s-6) ─────────────────────────────
  -- set-18
  (
    '50000000-0000-0000-0000-000000000018',
    '30000000-0000-0000-0000-000000000006',
    '2026-06-04', 'sabak',
    'An-Naba', 582, 582, 12,
    0, 'lulus', true,
    '10000000-0000-0000-0000-000000000002'
  ),
  -- set-19
  (
    '50000000-0000-0000-0000-000000000019',
    '30000000-0000-0000-0000-000000000006',
    '2026-06-05', 'sabak',
    'An-Nazi''at', 583, 583, 12,
    1, 'lulus', true,
    '10000000-0000-0000-0000-000000000002'
  );


-- ============================================================
-- 6. PESAN (3 pesan dari initialPesans)
--    pengirim_id:
--      'pengampu' → pengampu halaqah santri tsb
--      'orangtua' → parent_user_id santri tsb
-- ============================================================
INSERT INTO pesan (id, santri_id, pengirim_id, tipe_pengirim, konten, created_at)
VALUES
  -- msg-1: pengampu → s-1
  (
    '60000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'pengampu',
    'Alhamdulillah hafalan Al-Fatih hari ini sangat lancar. Tajwidnya tolong dipertahankan terutama panjang pendeknya.',
    '2026-06-05T09:15:00Z'
  ),
  -- msg-2: orangtua Bapak Salman → s-1
  (
    '60000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000011',
    'orangtua',
    'Syukron ustadz, kami akan dampingi murajaah Manzil-nya lebih ketat di rumah malam ini.',
    '2026-06-05T19:30:00Z'
  ),
  -- msg-3: pengampu → s-3
  (
    '60000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    'pengampu',
    'Mohon perhatian Bapak, Zaid hari ini mengantuk berat di Halaqah dan setoran barunya diulang-ulang tapi belum hafal.',
    '2026-06-04T08:45:00Z'
  );


-- ============================================================
-- 7. MODUL_AJAR (3 modul dari initialModuls)
-- ============================================================
INSERT INTO modul_ajar (id, judul, file_url, file_size, akses_role, diunggah_oleh)
VALUES
  (
    '70000000-0000-0000-0000-000000000001',
    'Modul Metode Sabak-Sabki-Manzil Versi 1.2',
    '/modul/metode_sabak_sabki_manzil.pdf',
    '2.4 MB',
    ARRAY['pengampu', 'koordinator', 'kepala_sekolah'],
    '10000000-0000-0000-0000-000000000001'
  ),
  (
    '70000000-0000-0000-0000-000000000002',
    'Panduan Tajwid Praktis Santri MTs TQ',
    '/modul/panduan_tajwid.pdf',
    '1.8 MB',
    ARRAY['pengampu', 'koordinator', 'kepala_sekolah'],
    '10000000-0000-0000-0000-000000000001'
  ),
  (
    '70000000-0000-0000-0000-000000000003',
    'Target & Kurikulum Tahfidz Kelas 7-9',
    '/modul/kurikulum_tahfidz.pdf',
    '3.1 MB',
    ARRAY['pengampu', 'koordinator', 'kepala_sekolah'],
    '10000000-0000-0000-0000-000000000001'
  );


-- ============================================================
-- 8. UJIAN_JUZ (4 ujian dari initialUjians)
--    koordinator_id = NULL (tidak ada data koordinator di mockData)
-- ============================================================
INSERT INTO ujian_juz (
  id, santri_id, juz, tanggal_ujian,
  jumlah_kesalahan, status,
  approved_by_koordinator, koordinator_id, approved_at,
  pengampu_id
)
VALUES
  -- uj-1: s-1, juz 30
  (
    '80000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    30, '2026-05-15',
    3, 'lulus',
    true, NULL, '2026-05-15T10:00:00Z',
    '10000000-0000-0000-0000-000000000001'
  ),
  -- uj-2: s-5, juz 30
  (
    '80000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000005',
    30, '2026-04-10',
    2, 'lulus',
    true, NULL, '2026-04-10T10:00:00Z',
    '10000000-0000-0000-0000-000000000001'
  ),
  -- uj-3: s-5, juz 29
  (
    '80000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000005',
    29, '2026-05-28',
    4, 'lulus',
    true, NULL, '2026-05-28T10:00:00Z',
    '10000000-0000-0000-0000-000000000001'
  ),
  -- uj-4: s-6, juz 30
  (
    '80000000-0000-0000-0000-000000000004',
    '30000000-0000-0000-0000-000000000006',
    30, '2026-05-22',
    1, 'lulus',
    true, NULL, '2026-05-22T10:00:00Z',
    '10000000-0000-0000-0000-000000000002'
  );


COMMIT;

-- ============================================================
-- VERIFIKASI — uncomment dan jalankan setelah INSERT selesai
-- ============================================================
-- SELECT COUNT(*) AS total_users     FROM users;        -- expect 11
-- SELECT COUNT(*) AS total_halaqah   FROM halaqah;      -- expect 2
-- SELECT COUNT(*) AS total_santri    FROM santri;       -- expect 9
-- SELECT COUNT(*) AS total_haf_juz   FROM hafalan_juz;  -- expect 6
-- SELECT COUNT(*) AS total_setoran   FROM setoran;      -- expect 19
-- SELECT COUNT(*) AS total_pesan     FROM pesan;        -- expect 3
-- SELECT COUNT(*) AS total_modul     FROM modul_ajar;   -- expect 3
-- SELECT COUNT(*) AS total_ujian     FROM ujian_juz;    -- expect 4
