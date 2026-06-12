// =============================================================================
// src/types/tahfiz.ts
// File terpusat untuk semua TypeScript interfaces & types SI-Tahfiz Jamilurrahman
// =============================================================================

// =============================================================================
// === ENTITIES ===
// Domain entities yang merepresentasikan data utama aplikasi
// =============================================================================

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

export interface TikrarTask {
  id: string;
  santri_id: string;
  tanggal: string;
  surah: string;
  halaman: number;
  jumlah_ulang: number;
  status: string;
  lokasi: string;
  selesai: boolean;
  parent_verified: boolean;
  dicatat_oleh: string;
  updated_at?: string;
}

// =============================================================================
// === FORMS ===
// Types yang digunakan untuk state form dan operasi UI
// =============================================================================

export type ReportType = 'setoran' | 'ukj' | 'grade';
export type PeriodType = 'bulanan' | 'tahunan' | 'custom';

export interface ReportLog {
  id: string;
  tipe: string;
  periode: string;
  format: 'PDF' | 'Excel';
  timestamp: string;
}

// =============================================================================
// === UI STATE ===
// Types untuk komponen UI, props, dan state navigasi
// =============================================================================

export interface RoleHeaderProps {
  roleName: string;
  activeRole: 'pengampu' | 'orangtua' | 'koordinator' | 'kepalasekolah' | 'stafftu';
}

export interface UserProfile {
  id: string;
  nama_lengkap: string | null;
  no_hp: string | null;
  avatar_url: string | null;
}

export interface RoleStats {
  halaqahNama?: string;
  jumlahSantri?: number;
  anakList?: { nama: string; grade: string }[];
  totalSantri?: number;
  totalHalaqah?: number;
  totalStagnant?: number;
  totalUkjLulus?: number;
  totalAkun?: number;
  tanggalBackup?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  shortName: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface ReportDownloaderProps {
  santriList: Pick<Santri, 'id' | 'nama' | 'halaqahId'>[];
  halaqahMap: Record<string, string>;
}

// =============================================================================
// === SUPABASE RESPONSES ===
// Types yang merepresentasikan data dari Supabase (snake_case) sebelum di-mapping
// =============================================================================

export interface DBUser {
  id: string;
  nama_lengkap: string;
  email: string;
  no_hp: string | null;
  role: string;
  is_active: boolean;
}

export interface AuditLogEntry {
  id: string;
  user_id: string;
  nama_user: string;
  aksi: string;
  target_tabel: string | null;
  target_id: string | null;
  detail: Record<string, string | number | boolean | null | undefined> | null;
  created_at: string;
}

export interface Announcement {
  id: string;
  judul: string;
  isi: string;
  pengirim_id: string;
  pengirim_role: string;
  target_role: string[];
  created_at: string;
}

export interface Berita {
  id: string;
  judul: string;
  isi: string;
  is_aktif: boolean;
  dibuat_oleh: string | null;
  created_at: string;
}

export interface BackupLog {
  id: string;
  timestamp: string;
  size: string;
  status: 'sukses' | 'gagal';
}

export interface RiwayatGrade {
  id: string;
  santri_id: string;
  grade_lama: string;
  grade_baru: string;
  target_baris_baru: number;
  tanggal_ubah: string;
  alasan: string;
  diubah_oleh: string | null;
}

export interface CatatanStagnasi {
  id: string;
  santri_id: string;
  tanggal: string;
  penyebab: 'keluarga' | 'psikososial' | 'game' | 'lainnya';
  detail: string;
  langkah_korektif: string;
  status_penanganan: 'proses' | 'selesai' | 'dipantau';
  dicatat_oleh: string | null;
}

export interface PekanSchedule {
  id: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  materiKelas7: string;
  materiKelas8: string;
  materiKelas9: string;
  batasKesalahan: number;
  deadlineAkses: string;
  status?: string;
}

export interface HariLibur {
  id: string;
  nama: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  jenis: 'libur_nasional' | 'libur_semester' | 'libur_tahfiz_mendadak';
  keterangan?: string;
  dibuat_oleh: string | null;
  created_at: string;
}

export interface Absensi {
  id: string;
  santri_id: string;
  tanggal: string;
  status: 'hadir' | 'sakit' | 'izin' | 'alpha';
  keterangan: string | null;
  dicatat_oleh: string | null;
  created_at: string;
}

export interface NilaiAkhlaq {
  id: string;
  santri_id: string;
  semester: string;
  nilai: number;
  catatan: string | null;
  dicatat_oleh: string | null;
  created_at: string;
  updated_at: string;
}


export interface NilaiAkhlaq {
  id: string;
  santri_id: string;
  semester: string;
  nilai: number;
  catatan: string | null;
  dicatat_oleh: string | null;
  created_at: string;
  updated_at: string;
}



