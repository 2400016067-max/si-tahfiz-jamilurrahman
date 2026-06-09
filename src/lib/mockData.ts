export interface Santri {
  id: string;
  nama: string;
  nis?: string;
  kelas: string;
  grade: 'Tahsin' | 'Takmil' | 'Tahfiz';
  targetBaris: number; // Tahsin: 2-3, Takmil: 7, Tahfiz: 10-15
  halaqahId: string;
  status: 'active' | 'stagnant';
  stagnancyReason?: 'keluarga' | 'psikososial' | 'game' | 'lainnya';
  stagnancyDetail?: string;
  stagnancyAction?: string;
  parentName: string;
  parentPhone: string;
  currentJuz: number;
  totalHafalanJuz: number[]; // e.g. [30, 29]
  parentUserId?: string | null;
}

export interface Halaqah {
  id: string;
  nama: string;
  pengampu: string;
  unit: 'Putra' | 'Putri';
  pengampu_id?: string;
}

export interface Setoran {
  id: string;
  santriId: string;
  date: string; // YYYY-MM-DD
  type: 'sabak' | 'sabki' | 'manzil';
  surah: string;
  halamanMulai: number;
  halamanSelesai: number;
  baris: number;
  kesalahan: number;
  status: 'lulus' | 'mengulang';
  parentVerified: boolean;
  notes?: string;
  parentSignature?: string;
  halamanAktual?: number;
}

export interface Pesan {
  id: string;
  santriId: string;
  sender: 'pengampu' | 'orangtua';
  content: string;
  timestamp: string;
  sudahDibaca?: boolean;
}

export interface ModulAjar {
  id: string;
  judul: string;
  fileUrl: string;
  size: string;
}

export interface UjianJuz {
  id: string;
  santriId: string;
  juz: number;
  date: string;
  kesalahan: number;
  status: 'lulus' | 'mengulang';
  approvedByKoordinator: boolean;
}

export const initialHalaqahs: Halaqah[] = [
  { id: 'h-1', nama: 'Halaqah Abu Bakar (Putra)', pengampu: 'Ustadz Ahmad Fauzi', unit: 'Putra' },
  { id: 'h-2', nama: 'Halaqah Aisyah (Putri)', pengampu: 'Ustadzah Aminah', unit: 'Putri' },
];

export const initialSantri: Santri[] = [
  {
    id: 's-1',
    nama: 'Muhammad Al-Fatih',
    kelas: '7A',
    grade: 'Tahfiz',
    targetBaris: 12,
    halaqahId: 'h-1',
    status: 'active',
    parentName: 'Bapak Salman',
    parentPhone: '081234567890',
    currentJuz: 30,
    totalHafalanJuz: [30]
  },
  {
    id: 's-2',
    nama: 'Abdurrahman Wahid',
    kelas: '7A',
    grade: 'Takmil',
    targetBaris: 7,
    halaqahId: 'h-1',
    status: 'active',
    parentName: 'Bapak Joko',
    parentPhone: '081298765432',
    currentJuz: 30,
    totalHafalanJuz: []
  },
  {
    id: 's-3',
    nama: 'Zaid bin Haritsah',
    kelas: '8A',
    grade: 'Tahfiz',
    targetBaris: 15,
    halaqahId: 'h-1',
    status: 'stagnant',
    stagnancyReason: 'game',
    stagnancyDetail: 'Santri sering tidur di kelas karena bermain game larut malam di rumah di akhir pekan.',
    stagnancyAction: 'Memanggil orang tua dan membatasi akses gadget saat libur sekolah.',
    parentName: 'Bapak Arman',
    parentPhone: '085211223344',
    currentJuz: 29,
    totalHafalanJuz: [30]
  },
  {
    id: 's-4',
    nama: 'Ali bin Abi Thalib',
    kelas: '8A',
    grade: 'Tahsin',
    targetBaris: 3,
    halaqahId: 'h-1',
    status: 'active',
    parentName: 'Bapak Rahmat',
    parentPhone: '089877665544',
    currentJuz: 30,
    totalHafalanJuz: []
  },
  {
    id: 's-5',
    nama: 'Usman bin Affan',
    kelas: '9A',
    grade: 'Tahfiz',
    targetBaris: 12,
    halaqahId: 'h-1',
    status: 'active',
    parentName: 'Bapak Yusuf',
    parentPhone: '081122334455',
    currentJuz: 28,
    totalHafalanJuz: [30, 29]
  },
  // Putri Group (Halaqah Aisyah)
  {
    id: 's-6',
    nama: 'Fathimah Az-Zahra',
    kelas: '7B',
    grade: 'Tahfiz',
    targetBaris: 12,
    halaqahId: 'h-2',
    status: 'active',
    parentName: 'Bapak Ali',
    parentPhone: '082233445566',
    currentJuz: 30,
    totalHafalanJuz: [30]
  },
  {
    id: 's-7',
    nama: 'Aisyah Humaira',
    kelas: '7B',
    grade: 'Takmil',
    targetBaris: 7,
    halaqahId: 'h-2',
    status: 'active',
    parentName: 'Bapak Usman',
    parentPhone: '083344556677',
    currentJuz: 30,
    totalHafalanJuz: []
  },
  {
    id: 's-8',
    nama: 'Khadijah Al-Kubra',
    kelas: '8B',
    grade: 'Tahfiz',
    targetBaris: 15,
    halaqahId: 'h-2',
    status: 'stagnant',
    stagnancyReason: 'keluarga',
    stagnancyDetail: 'Santri tertekan karena orang tua menuntut terlalu tinggi tanpa mendampingi proses murajaah di rumah.',
    stagnancyAction: 'Konseling bersama Koordinator Tahfiz dan Orang Tua untuk melunakkan ekspektasi.',
    parentName: 'Bapak Hasyim',
    parentPhone: '084455667788',
    currentJuz: 29,
    totalHafalanJuz: [30]
  },
  {
    id: 's-9',
    nama: 'Sumayyah binti Khayyat',
    kelas: '9B',
    grade: 'Tahsin',
    targetBaris: 3,
    halaqahId: 'h-2',
    status: 'active',
    parentName: 'Bapak Harun',
    parentPhone: '085566778899',
    currentJuz: 30,
    totalHafalanJuz: []
  }
];

// Historical setoran data (Sabak, Sabki, Manzil)
// Generation of recent 5 days to populate graphs nicely
export const initialSetorans: Setoran[] = [
  // Muhammad Al-Fatih
  { id: 'set-1', santriId: 's-1', date: '2026-06-01', type: 'sabak', surah: 'An-Naba', halamanMulai: 582, halamanSelesai: 582, baris: 12, kesalahan: 0, status: 'lulus', parentVerified: true },
  { id: 'set-2', santriId: 's-1', date: '2026-06-01', type: 'sabki', surah: 'An-Nazi\'at', halamanMulai: 583, halamanSelesai: 583, baris: 12, kesalahan: 1, status: 'lulus', parentVerified: true },
  { id: 'set-3', santriId: 's-1', date: '2026-06-01', type: 'manzil', surah: 'An-Naba', halamanMulai: 582, halamanSelesai: 582, baris: 15, kesalahan: 0, status: 'lulus', parentVerified: true },
  
  { id: 'set-4', santriId: 's-1', date: '2026-06-02', type: 'sabak', surah: 'An-Naba', halamanMulai: 583, halamanSelesai: 583, baris: 10, kesalahan: 1, status: 'lulus', parentVerified: true },
  { id: 'set-5', santriId: 's-1', date: '2026-06-02', type: 'sabki', surah: 'An-Naba', halamanMulai: 582, halamanSelesai: 582, baris: 12, kesalahan: 0, status: 'lulus', parentVerified: true },
  { id: 'set-6', santriId: 's-1', date: '2026-06-02', type: 'manzil', surah: 'An-Nazi\'at', halamanMulai: 583, halamanSelesai: 584, baris: 30, kesalahan: 1, status: 'lulus', parentVerified: true },

  { id: 'set-7', santriId: 's-1', date: '2026-06-03', type: 'sabak', surah: 'Abasa', halamanMulai: 585, halamanSelesai: 585, baris: 12, kesalahan: 0, status: 'lulus', parentVerified: true },
  { id: 'set-8', santriId: 's-1', date: '2026-06-03', type: 'sabki', surah: 'An-Naba', halamanMulai: 583, halamanSelesai: 583, baris: 12, kesalahan: 0, status: 'lulus', parentVerified: true },
  { id: 'set-9', santriId: 's-1', date: '2026-06-03', type: 'manzil', surah: 'Abasa', halamanMulai: 585, halamanSelesai: 585, baris: 15, kesalahan: 0, status: 'lulus', parentVerified: true },

  { id: 'set-10', santriId: 's-1', date: '2026-06-04', type: 'sabak', surah: 'Abasa', halamanMulai: 586, halamanSelesai: 586, baris: 14, kesalahan: 2, status: 'mengulang', parentVerified: false },
  { id: 'set-11', santriId: 's-1', date: '2026-06-04', type: 'sabki', surah: 'Abasa', halamanMulai: 585, halamanSelesai: 585, baris: 12, kesalahan: 1, status: 'lulus', parentVerified: true },
  
  { id: 'set-12', santriId: 's-1', date: '2026-06-05', type: 'sabak', surah: 'Abasa', halamanMulai: 586, halamanSelesai: 586, baris: 12, kesalahan: 0, status: 'lulus', parentVerified: false },
  { id: 'set-13', santriId: 's-1', date: '2026-06-05', type: 'sabki', surah: 'Abasa', halamanMulai: 585, halamanSelesai: 586, baris: 24, kesalahan: 1, status: 'lulus', parentVerified: false },
  { id: 'set-14', santriId: 's-1', date: '2026-06-05', type: 'manzil', surah: 'At-Takwir', halamanMulai: 586, halamanSelesai: 587, baris: 30, kesalahan: 0, status: 'lulus', parentVerified: true },

  // Abdurrahman Wahid
  { id: 'set-15', santriId: 's-2', date: '2026-06-04', type: 'sabak', surah: 'An-Naba', halamanMulai: 582, halamanSelesai: 582, baris: 7, kesalahan: 1, status: 'lulus', parentVerified: true },
  { id: 'set-16', santriId: 's-2', date: '2026-06-05', type: 'sabak', surah: 'An-Naba', halamanMulai: 583, halamanSelesai: 583, baris: 7, kesalahan: 0, status: 'lulus', parentVerified: false },
  
  // Zaid bin Haritsah (stagnant, no progress recently)
  { id: 'set-17', santriId: 's-3', date: '2026-06-01', type: 'sabak', surah: 'At-Takwir', halamanMulai: 586, halamanSelesai: 586, baris: 12, kesalahan: 3, status: 'mengulang', parentVerified: true },
  
  // Fathimah Az-Zahra
  { id: 'set-18', santriId: 's-6', date: '2026-06-04', type: 'sabak', surah: 'An-Naba', halamanMulai: 582, halamanSelesai: 582, baris: 12, kesalahan: 0, status: 'lulus', parentVerified: true },
  { id: 'set-19', santriId: 's-6', date: '2026-06-05', type: 'sabak', surah: 'An-Nazi\'at', halamanMulai: 583, halamanSelesai: 583, baris: 12, kesalahan: 1, status: 'lulus', parentVerified: true }
];

export const initialPesans: Pesan[] = [
  {
    id: 'msg-1',
    santriId: 's-1',
    sender: 'pengampu',
    content: 'Alhamdulillah hafalan Al-Fatih hari ini sangat lancar. Tajwidnya tolong dipertahankan terutama panjang pendeknya.',
    timestamp: '2026-06-05T09:15:00Z'
  },
  {
    id: 'msg-2',
    santriId: 's-1',
    sender: 'orangtua',
    content: 'Syukron ustadz, kami akan dampingi murajaah Manzil-nya lebih ketat di rumah malam ini.',
    timestamp: '2026-06-05T19:30:00Z'
  },
  {
    id: 'msg-3',
    santriId: 's-3',
    sender: 'pengampu',
    content: 'Mohon perhatian Bapak, Zaid hari ini mengantuk berat di Halaqah dan setoran barunya diulang-ulang tapi belum hafal.',
    timestamp: '2026-06-04T08:45:00Z'
  }
];

export const initialModuls: ModulAjar[] = [
  { id: 'mod-1', judul: 'Modul Metode Sabak-Sabki-Manzil Versi 1.2', fileUrl: '/modul/metode_sabak_sabki_manzil.pdf', size: '2.4 MB' },
  { id: 'mod-2', judul: 'Panduan Tajwid Praktis Santri MTs TQ', fileUrl: '/modul/panduan_tajwid.pdf', size: '1.8 MB' },
  { id: 'mod-3', judul: 'Target & Kurikulum Tahfidz Kelas 7-9', fileUrl: '/modul/kurikulum_tahfidz.pdf', size: '3.1 MB' },
];

export const initialUjians: UjianJuz[] = [
  { id: 'uj-1', santriId: 's-1', juz: 30, date: '2026-05-15', kesalahan: 3, status: 'lulus', approvedByKoordinator: true },
  { id: 'uj-2', santriId: 's-5', juz: 30, date: '2026-04-10', kesalahan: 2, status: 'lulus', approvedByKoordinator: true },
  { id: 'uj-3', santriId: 's-5', juz: 29, date: '2026-05-28', kesalahan: 4, status: 'lulus', approvedByKoordinator: true },
  { id: 'uj-4', santriId: 's-6', juz: 30, date: '2026-05-22', kesalahan: 1, status: 'lulus', approvedByKoordinator: true },
];
