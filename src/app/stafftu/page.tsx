'use client';

import React, { useEffect, useState, useCallback } from 'react';
import RoleHeader from '@/components/RoleHeader';
import { supabase } from '@/lib/supabase';
import { Santri, Halaqah, Setoran } from '@/lib/mockData';
import { 
  Database, 
  Search, 
  RotateCw,
  UserPlus,
  PlusCircle,
  BookMarked,
  CheckCircle2
} from 'lucide-react';

interface BackupLog {
  id: string;
  timestamp: string;
  size: string;
  status: 'sukses' | 'gagal';
}

// Daftar pengampu yang ada di sistem (diambil dari tabel users)
interface PengampuUser {
  id: string;
  nama: string;
}

export default function StaffTUDashboard() {
  const [mounted, setMounted] = useState(false);
  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [halaqahs, setHalaqahs] = useState<Halaqah[]>([]);
  const [setorans, setSetorans] = useState<Setoran[]>([]);

  // Map halaqah_id → nama halaqah (menggantikan hardcode 'h-1')
  const [halaqahMap, setHalaqahMap] = useState<Record<string, string>>({});
  // Daftar user pengampu untuk rotasi (lookup UUID saat save)
  const [pengampuUsers, setPengampuUsers] = useState<PengampuUser[]>([]);

  // Loading & error state
  const [isLoading, setIsLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Santri | null>(null);

  // Backup simulator logs
  const [backups, setBackups] = useState<BackupLog[]>([
    { id: 'b-1', timestamp: '2026-06-05 23:00:02', size: '154 KB', status: 'sukses' },
    { id: 'b-2', timestamp: '2026-06-04 23:00:01', size: '152 KB', status: 'sukses' }
  ]);

  // Personnel rotation states
  const [selectedHalaqahId, setSelectedHalaqahId] = useState<string>('');
  const [newPengampu, setNewPengampu] = useState<string>('');

  // Input correction state (F5.4)
  const [editingSetoranId, setEditingSetoranId] = useState<string>('');
  const [correctedKesalahan, setCorrectedKesalahan] = useState<number>(0);
  const [isApprovedByKoordinator, setIsApprovedByKoordinator] = useState(false);

  // ---------------------------------------------------------------------------
  // NEW FORM STATES — Form 1: Buat Halaqah Baru
  // ---------------------------------------------------------------------------
  const [newHalaqahNama, setNewHalaqahNama] = useState('');
  const [newHalaqahUnit, setNewHalaqahUnit] = useState<'Putra' | 'Putri'>('Putra');
  const [newHalaqahPengampuId, setNewHalaqahPengampuId] = useState('');
  const [createHalaqahSuccess, setCreateHalaqahSuccess] = useState(false);

  // ---------------------------------------------------------------------------
  // NEW FORM STATES — Form 2: Tambah Santri Baru
  // ---------------------------------------------------------------------------
  const [newSantriNama, setNewSantriNama] = useState('');
  const [newSantriKelas, setNewSantriKelas] = useState('7A');
  const [newSantriGrade, setNewSantriGrade] = useState<'Tahsin' | 'Takmil' | 'Tahfiz'>('Tahsin');
  const [newSantriHalaqahId, setNewSantriHalaqahId] = useState('');
  const [newSantriParentName, setNewSantriParentName] = useState('');
  const [newSantriParentPhone, setNewSantriParentPhone] = useState('');
  const [createSantriSuccess, setCreateSantriSuccess] = useState(false);

  // ---------------------------------------------------------------------------
  // NEW FORM STATES — Form 3: Buat Akun Pengampu Baru
  // ---------------------------------------------------------------------------
  const [newUserNama, setNewUserNama] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [createUserSuccess, setCreateUserSuccess] = useState(false);

  // ---------------------------------------------------------------------------
  // DATA LOADING — Supabase queries
  // ---------------------------------------------------------------------------
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setSaveError(null);

    try {
      // 1. Fetch semua hafalan_juz untuk totalHafalanJuz per santri
      const { data: hafalanData, error: hafalanError } = await supabase
        .from('hafalan_juz')
        .select('santri_id, juz');

      if (hafalanError) throw new Error('Gagal memuat hafalan_juz: ' + hafalanError.message);

      const hafalanMap: Record<string, number[]> = {};
      (hafalanData ?? []).forEach((h: { santri_id: string; juz: number }) => {
        if (!hafalanMap[h.santri_id]) hafalanMap[h.santri_id] = [];
        hafalanMap[h.santri_id].push(h.juz);
      });

      // 2. Fetch santri
      const { data: santriData, error: santriError } = await supabase
        .from('santri')
        .select('*');

      if (santriError) throw new Error('Gagal memuat santri: ' + santriError.message);

      if (santriData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped: Santri[] = (santriData as any[]).map((s) => ({
          id: s.id,
          nama: s.nama,
          kelas: s.kelas,
          grade: s.grade as 'Tahsin' | 'Takmil' | 'Tahfiz',
          targetBaris: s.target_baris,
          halaqahId: s.halaqah_id,
          status: s.status as 'active' | 'stagnant',
          stagnancyReason: s.stagnancy_reason ?? undefined,
          stagnancyDetail: s.stagnancy_detail ?? undefined,
          stagnancyAction: s.stagnancy_action ?? undefined,
          parentName: s.parent_name,
          parentPhone: s.parent_phone,
          currentJuz: s.current_juz,
          totalHafalanJuz: hafalanMap[s.id] ?? [],
        }));
        setSantriList(mapped);
      }

      // 3. Fetch users dengan role pengampu
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, nama_lengkap')
        .eq('role', 'pengampu');

      if (usersError) throw new Error('Gagal memuat users: ' + usersError.message);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pengampu: PengampuUser[] = (usersData ?? []).map((u: any) => ({
        id: u.id,
        nama: u.nama_lengkap,
      }));
      setPengampuUsers(pengampu);

      // Map user_id → nama
      const userNameMap: Record<string, string> = {};
      pengampu.forEach(u => { userNameMap[u.id] = u.nama; });

      // Set default untuk form buat halaqah baru
      if (pengampu.length > 0 && !newHalaqahPengampuId) {
        setNewHalaqahPengampuId(pengampu[0].id);
      }

      // 4. Fetch halaqah
      const { data: halaqahData, error: halaqahError } = await supabase
        .from('halaqah')
        .select('id, nama, unit, pengampu_id')
        .eq('is_active', true);

      if (halaqahError) throw new Error('Gagal memuat halaqah: ' + halaqahError.message);

      if (halaqahData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mappedHalaqah: Halaqah[] = (halaqahData as any[]).map((h) => ({
          id: h.id,
          nama: h.nama,
          unit: h.unit as 'Putra' | 'Putri',
          pengampu: userNameMap[h.pengampu_id] ?? 'Unknown',
        }));
        setHalaqahs(mappedHalaqah);

        // Bangun halaqahMap untuk lookup nama di selectedStudent detail
        const newHalaqahMap: Record<string, string> = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (halaqahData as any[]).forEach(h => {
          const match = h.nama.match(/Halaqah (.+)/);
          newHalaqahMap[h.id] = match ? match[1] : h.nama;
        });
        setHalaqahMap(newHalaqahMap);

        // Set default halaqah terpilih
        if (mappedHalaqah.length > 0 && !selectedHalaqahId) {
          setSelectedHalaqahId(mappedHalaqah[0].id);
          setNewPengampu(mappedHalaqah[0].pengampu);
        }

        // Set default halaqah untuk form tambah santri
        if (mappedHalaqah.length > 0 && !newSantriHalaqahId) {
          setNewSantriHalaqahId(mappedHalaqah[0].id);
        }
      }

      // 5. Fetch setoran 30 hari terakhir (untuk dropdown koreksi)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const fromDate = thirtyDaysAgo.toISOString().split('T')[0];

      const { data: setoranData, error: setoranError } = await supabase
        .from('setoran')
        .select('*')
        .gte('tanggal', fromDate)
        .order('tanggal', { ascending: false });

      if (setoranError) throw new Error('Gagal memuat setoran: ' + setoranError.message);

      if (setoranData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mappedSetoran: Setoran[] = (setoranData as any[]).map((s) => ({
          id: s.id,
          santriId: s.santri_id,
          date: s.tanggal,
          type: s.tipe as 'sabak' | 'sabki' | 'manzil',
          surah: s.surah,
          halamanMulai: s.halaman_mulai,
          halamanSelesai: s.halaman_selesai,
          baris: s.jumlah_baris,
          kesalahan: s.jumlah_kesalahan,
          status: s.status as 'lulus' | 'mengulang',
          parentVerified: s.parent_verified,
          notes: s.catatan ?? undefined,
        }));
        setSetorans(mappedSetoran);
      }

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan tidak diketahui.';
      console.error('[StaffTUDashboard] loadData error:', err);
      setSaveError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [selectedHalaqahId, newHalaqahPengampuId, newSantriHalaqahId]);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, [loadData]);

  // ---------------------------------------------------------------------------
  // 1. ROTASI PERSONEL — UPDATE halaqah.pengampu_id di Supabase
  // ---------------------------------------------------------------------------
  const handleRotatePersonnel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHalaqahId || !newPengampu.trim()) return;

    setSaveError(null);

    const matchedUser = pengampuUsers.find(
      u => u.nama.trim().toLowerCase() === newPengampu.trim().toLowerCase()
    );

    if (!matchedUser) {
      setSaveError(
        `Nama pengampu "${newPengampu}" tidak ditemukan di database. ` +
        `Pengampu yang tersedia: ${pengampuUsers.map(u => u.nama).join(', ')}.`
      );
      return;
    }

    const currentHalaqah = halaqahs.find(h => h.id === selectedHalaqahId);
    const oldName = currentHalaqah?.pengampu ?? '(tidak diketahui)';

    const { error } = await supabase
      .from('halaqah')
      .update({
        pengampu_id: matchedUser.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedHalaqahId);

    if (error) {
      setSaveError('Gagal memperbarui pengampu: ' + error.message);
      return;
    }

    alert(
      `Personel dirotasi!\nPengampu ${currentHalaqah?.nama} berhasil dialihkan ` +
      `dari "${oldName}" ke "${matchedUser.nama}".`
    );
    await loadData();
  };

  // ---------------------------------------------------------------------------
  // 2. BACKUP DATABASE — Simulasi
  // ---------------------------------------------------------------------------
  const handleBackup = () => {
    const simSizeKb = (140 + Math.random() * 40).toFixed(1);
    const newBackup: BackupLog = {
      id: `b-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      size: `${simSizeKb} KB`,
      status: 'sukses'
    };
    setBackups(prev => [newBackup, ...prev]);
    alert('Simulasi pencadangan otomatis (Auto-backup) berhasil! Berkas terkompresi disimpan di cloud storage yayasan.');
  };

  // ---------------------------------------------------------------------------
  // 3. SINKRONISASI FORMAT — Simulasi
  // ---------------------------------------------------------------------------
  const handleSyncFormats = () => {
    alert('[Sinkronisasi Unit] Berhasil menyelaraskan format rekapitulasi pelaporan harian antara Unit Putra (Halaqah Abu Bakar) dan Unit Putri (Halaqah Aisyah).\nFormat draf laporan PDF/Excel sekarang seragam.');
  };

  // ---------------------------------------------------------------------------
  // 4. KOREKSI INPUT SETORAN — UPDATE setoran di Supabase
  // ---------------------------------------------------------------------------
  const handleCorrectInput = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSetoranId) return;

    if (!isApprovedByKoordinator) {
      alert('Peringatan: Koreksi data input harian harus mendapatkan persetujuan Koordinator terlebih dahulu (F5.4.1).');
      return;
    }

    setSaveError(null);

    const target = setorans.find(s => s.id === editingSetoranId);
    const oldKesalahan = target?.kesalahan ?? 0;
    const newStatus = correctedKesalahan <= 1 ? 'lulus' : 'mengulang';

    const { error } = await supabase
      .from('setoran')
      .update({
        jumlah_kesalahan: correctedKesalahan,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingSetoranId);

    if (error) {
      setSaveError('Gagal menerapkan koreksi setoran: ' + error.message);
      return;
    }

    alert(
      `Koreksi Berhasil!\nKesalahan setoran diubah dari ${oldKesalahan} menjadi ` +
      `${correctedKesalahan}. Status kelulusan disesuaikan.`
    );

    setEditingSetoranId('');
    setIsApprovedByKoordinator(false);
    await loadData();
  };

  // ---------------------------------------------------------------------------
  // 5. BUAT HALAQAH BARU — INSERT ke tabel halaqah
  // ---------------------------------------------------------------------------
  const handleCreateHalaqah = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHalaqahNama.trim() || !newHalaqahPengampuId) return;

    setSaveError(null);
    setCreateHalaqahSuccess(false);

    const { error } = await supabase.from('halaqah').insert({
      nama:        newHalaqahNama.trim(),
      unit:        newHalaqahUnit,
      pengampu_id: newHalaqahPengampuId,
      is_active:   true,
    });

    if (error) {
      setSaveError('Gagal membuat halaqah: ' + error.message);
      return;
    }

    setCreateHalaqahSuccess(true);
    setNewHalaqahNama('');
    setTimeout(() => setCreateHalaqahSuccess(false), 3000);
    await loadData();
  };

  // ---------------------------------------------------------------------------
  // 6. TAMBAH SANTRI BARU — INSERT ke tabel santri
  // ---------------------------------------------------------------------------
  const handleCreateSantri = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSantriNama.trim() || !newSantriHalaqahId || !newSantriParentName.trim()) return;

    setSaveError(null);
    setCreateSantriSuccess(false);

    // Hitung target_baris dari grade
    const targetBarisMap = { Tahsin: 3, Takmil: 7, Tahfiz: 12 };
    const targetBaris = targetBarisMap[newSantriGrade];

    const { error } = await supabase.from('santri').insert({
      nama:         newSantriNama.trim(),
      kelas:        newSantriKelas.trim(),
      grade:        newSantriGrade,
      target_baris: targetBaris,
      halaqah_id:   newSantriHalaqahId,
      parent_name:  newSantriParentName.trim(),
      parent_phone: newSantriParentPhone.trim() || null,
      current_juz:  30,
      status:       'active',
    });

    if (error) {
      setSaveError('Gagal menambahkan santri: ' + error.message);
      return;
    }

    setCreateSantriSuccess(true);
    setNewSantriNama('');
    setNewSantriKelas('7A');
    setNewSantriGrade('Tahsin');
    setNewSantriParentName('');
    setNewSantriParentPhone('');
    setTimeout(() => setCreateSantriSuccess(false), 3000);
    await loadData();
  };

  // ---------------------------------------------------------------------------
  // 7. BUAT AKUN PENGAMPU BARU — INSERT ke tabel users
  // ---------------------------------------------------------------------------
  const handleCreatePengampu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserNama.trim()) return;

    setSaveError(null);
    setCreateUserSuccess(false);

    // Generate email dari nama jika tidak diisi manual
    const emailToUse = newUserEmail.trim() || (() => {
      const base = newUserNama
        .toLowerCase()
        .replace(/ustadz(ah)?\s*/i, '')
        .trim()
        .replace(/\s+/g, '.')
        .replace(/[^a-z.]/g, '');
      return `${base}@mts-tq.sch.id`;
    })();

    // Cek apakah email sudah ada
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', emailToUse)
      .maybeSingle();

    if (existing) {
      setSaveError(`Email "${emailToUse}" sudah terdaftar di sistem. Gunakan email lain.`);
      return;
    }

    const { error } = await supabase.from('users').insert({
      email:         emailToUse,
      // password_hash placeholder — harus diganti dengan hash bcrypt di production
      password_hash: '$2b$10$placeholderHashForDevOnly.NewPengampu',
      role:          'pengampu',
      nama_lengkap:  newUserNama.trim(),
      no_hp:         newUserPhone.trim() || null,
      is_active:     true,
    });

    if (error) {
      setSaveError('Gagal membuat akun pengampu: ' + error.message);
      return;
    }

    setCreateUserSuccess(true);
    setNewUserNama('');
    setNewUserPhone('');
    setNewUserEmail('');
    setTimeout(() => setCreateUserSuccess(false), 3000);
    await loadData();
  };

  // Filter students for search
  const filteredStudents = santriList.filter(s =>
    s.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
      <RoleHeader roleName="Staf Tata Usaha (TU)" activeRole="stafftu" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Error banner */}
        {saveError && (
          <div className="mb-6 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-xs font-semibold">
            ⚠ {saveError}
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl text-blue-700 dark:text-blue-400 text-xs font-semibold text-center">
            Memuat data dari Supabase…
          </div>
        )}
        
        {/* Dashboard Grid Layout — EXISTING FEATURES */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left / Middle Columns: Search & Input Correction */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Quick Search Santri & Admin Details (F5.2.2, F5.3.2) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
              <h3 className="font-extrabold text-sm text-slate-850 dark:text-slate-150 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex items-center justify-between">
                <span>🔍 Pencarian Cepat Administrasi Santri</span>
                <span className="text-[10px] text-slate-450">F5.2.2</span>
              </h3>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Cari santri berdasarkan Nama atau ID Santri..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-10 pr-4 py-2 border border-slate-250 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:border-violet-500" 
                />
              </div>

              {searchQuery && (
                <div className="border border-slate-150 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-850 max-h-[160px] overflow-y-auto mb-4">
                  {filteredStudents.map(student => (
                    <button
                      key={student.id}
                      onClick={() => setSelectedStudent(student)}
                      className="w-full text-left p-2.5 hover:bg-slate-50 dark:hover:bg-slate-850/50 flex justify-between text-xs transition-colors"
                    >
                      <span className="font-bold">{student.nama}</span>
                      <span className="text-slate-400">{student.id.slice(0, 8)}… · Kelas {student.kelas}</span>
                    </button>
                  ))}
                  {filteredStudents.length === 0 && (
                    <p className="text-center text-xs text-slate-400 py-3">Tidak ada data santri.</p>
                  )}
                </div>
              )}

              {selectedStudent ? (
                <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-4 rounded-xl space-y-3 text-xs">
                  <h4 className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                    <span>Detail Administratif Santri</span>
                    <button 
                      onClick={() => setSelectedStudent(null)}
                      className="text-[10px] text-slate-400 hover:underline"
                    >
                      Tutup
                    </button>
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] uppercase text-slate-400 font-bold">Nama Lengkap</p>
                      <p className="font-semibold">{selectedStudent.nama}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-slate-400 font-bold">ID Santri (NIM)</p>
                      <p className="font-mono text-[9px] break-all">{selectedStudent.id}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-slate-400 font-bold">Grade &amp; Kelas</p>
                      <p className="font-semibold">{selectedStudent.grade} (Kelas {selectedStudent.kelas})</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-slate-400 font-bold">Kelompok Halaqah</p>
                      <p className="font-semibold">{halaqahMap[selectedStudent.halaqahId] || 'Halaqah'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-slate-400 font-bold">Nama Wali / Kontak</p>
                      <p className="font-semibold">{selectedStudent.parentName} ({selectedStudent.parentPhone})</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-slate-400 font-bold">Total Hafalan Juz</p>
                      <p className="font-semibold">Juz {selectedStudent.totalHafalanJuz.length > 0 ? selectedStudent.totalHafalanJuz.join(', ') : '-'}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-xs text-slate-400 py-4 bg-slate-50/50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  Pilih/cari santri di atas untuk memverifikasi kontak orang tua terbaru atau data administratif lainnya (F5.3.2).
                </p>
              )}
            </div>

            {/* Error Input Correction Simulator (F5.4.1) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
              <h3 className="font-extrabold text-sm text-slate-850 dark:text-slate-150 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex items-center justify-between">
                <span>🛠 Koreksi Kesalahan Input Setoran (Otoritas Terbatas)</span>
                <span className="text-[10px] text-slate-450">F5.4.1</span>
              </h3>

              <form onSubmit={handleCorrectInput} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400">Pilih Setoran (Log ID)</label>
                    <select
                      value={editingSetoranId}
                      onChange={e => {
                        setEditingSetoranId(e.target.value);
                        const match = setorans.find(s => s.id === e.target.value);
                        if (match) setCorrectedKesalahan(match.kesalahan);
                      }}
                      required
                      className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none"
                    >
                      <option value="">-- Pilih Log Setoran --</option>
                      {setorans.map(s => {
                        const student = santriList.find(st => st.id === s.santriId);
                        return (
                          <option key={s.id} value={s.id}>
                            {student?.nama} - {s.surah} ({s.date}) [Kesalahan: {s.kesalahan}]
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400">Jumlah Kesalahan Baru</label>
                    <input
                      type="number"
                      value={correctedKesalahan}
                      onChange={e => setCorrectedKesalahan(Number(e.target.value))}
                      className="w-full text-xs p-2 border border-slate-250 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2 p-3 bg-violet-500/10 text-violet-800 dark:text-violet-300 rounded-xl text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={isApprovedByKoordinator}
                    onChange={e => setIsApprovedByKoordinator(e.target.checked)}
                    className="h-4 w-4 text-violet-600 border-slate-300 rounded"
                  />
                  <span>Koreksi ini telah disetujui oleh Koordinator Tahfiz (Wajib)</span>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-violet-650 hover:bg-violet-750 text-white font-bold py-2 rounded-xl text-xs shadow-md transition-colors disabled:opacity-60"
                >
                  Terapkan Koreksi Log
                </button>
              </form>
            </div>

          </div>

          {/* Right Column: Personnel Rotation & Backup Simulator (F5.1, F5.2.1) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* User Management & Teacher Rotation (F5.1.1) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex items-center justify-between">
                <span>🔄 Rotasi Hak Akses &amp; Personel</span>
                <span className="text-[10px] text-slate-450">F5.1.1</span>
              </h3>

              <form onSubmit={handleRotatePersonnel} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400">Pilih Halaqah</label>
                  <select
                    value={selectedHalaqahId}
                    onChange={e => {
                      setSelectedHalaqahId(e.target.value);
                      const match = halaqahs.find(h => h.id === e.target.value);
                      if (match) setNewPengampu(match.pengampu);
                    }}
                    required
                    className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none"
                  >
                    {halaqahs.map(h => (
                      <option key={h.id} value={h.id}>{h.nama}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400">Pengampu Baru</label>
                  <input
                    type="text"
                    value={newPengampu}
                    onChange={e => setNewPengampu(e.target.value)}
                    required
                    list="pengampu-suggestions"
                    className="w-full text-xs p-2 border border-slate-250 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:border-violet-500"
                  />
                  <datalist id="pengampu-suggestions">
                    {pengampuUsers.map(u => (
                      <option key={u.id} value={u.nama} />
                    ))}
                  </datalist>
                  {pengampuUsers.length > 0 && (
                    <p className="text-[9px] text-slate-400 mt-1">
                      Tersedia: {pengampuUsers.map(u => u.nama).join(', ')}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-slate-800 dark:bg-slate-700 hover:bg-slate-750 text-white font-bold py-2 rounded-xl text-xs transition-colors disabled:opacity-60"
                >
                  Terapkan Alih Hak Akses
                </button>
              </form>
            </div>

            {/* Auto-Backup Database Simulator (F5.1.2) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                  <Database className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                  <span>Cadangan Database</span>
                </h3>
                <button
                  onClick={handleBackup}
                  className="bg-violet-600 hover:bg-violet-750 text-white font-bold text-[10px] px-2 py-1 rounded shadow"
                >
                  Backup Sekarang
                </button>
              </div>

              <p className="text-[10px] text-slate-500 mb-3">
                Histori pencadangan data otomatis (NFR-05.2) yang dikelola Staf TU:
              </p>

              <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                {backups.map(log => (
                  <div key={log.id} className="p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-lg flex justify-between items-center text-[10px]">
                    <div className="space-y-0.5">
                      <p className="font-bold text-slate-750 dark:text-slate-300">{log.timestamp}</p>
                      <p className="text-slate-400">Ukuran file: {log.size}</p>
                    </div>
                    <span className="text-[8px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded font-bold">
                      {log.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sync Unit */}
            <div className="space-y-4">
              <button
                onClick={handleSyncFormats}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 p-4 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center space-x-2"
              >
                <RotateCw className="h-4 w-4 text-violet-650" />
                <span>Sinkronisasi Format Unit (F5.2.1)</span>
              </button>
            </div>

          </div>

        </div>

        {/* ================================================================== */}
        {/* SECTION BARU: Manajemen Data Master                                */}
        {/* ================================================================== */}
        <div className="mt-10">
          {/* Section Header */}
          <div className="flex items-center space-x-3 mb-6">
            <div className="h-px flex-grow bg-slate-200 dark:bg-slate-800" />
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 whitespace-nowrap px-2">
              ➕ Manajemen Data Master
            </h2>
            <div className="h-px flex-grow bg-slate-200 dark:bg-slate-800" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── FORM 1: Buat Halaqah Baru ───────────────────────────────── */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3 mb-5 flex items-center space-x-2">
                <BookMarked className="h-4 w-4 text-violet-500" />
                <span>Buat Halaqah Baru</span>
              </h3>

              <form onSubmit={handleCreateHalaqah} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    Nama Halaqah
                  </label>
                  <input
                    type="text"
                    value={newHalaqahNama}
                    onChange={e => setNewHalaqahNama(e.target.value)}
                    placeholder="cth: Halaqah Umar (Putra)"
                    required
                    className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:border-violet-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    Unit
                  </label>
                  <select
                    value={newHalaqahUnit}
                    onChange={e => setNewHalaqahUnit(e.target.value as 'Putra' | 'Putri')}
                    className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none"
                  >
                    <option value="Putra">Putra</option>
                    <option value="Putri">Putri</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    Pengampu
                  </label>
                  <select
                    value={newHalaqahPengampuId}
                    onChange={e => setNewHalaqahPengampuId(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none"
                  >
                    <option value="">-- Pilih Pengampu --</option>
                    {pengampuUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.nama}</option>
                    ))}
                  </select>
                </div>

                {createHalaqahSuccess && (
                  <div className="flex items-center space-x-1.5 text-emerald-600 text-xs font-bold">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Halaqah baru berhasil dibuat!</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-2.5 rounded-xl text-xs shadow transition-colors flex items-center justify-center space-x-1.5 disabled:opacity-60"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Simpan Halaqah</span>
                </button>
              </form>
            </div>

            {/* ── FORM 2: Tambah Santri Baru ──────────────────────────────── */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3 mb-5 flex items-center space-x-2">
                <PlusCircle className="h-4 w-4 text-emerald-500" />
                <span>Tambah Santri Baru</span>
              </h3>

              <form onSubmit={handleCreateSantri} className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    value={newSantriNama}
                    onChange={e => setNewSantriNama(e.target.value)}
                    placeholder="cth: Ahmad Fauzan"
                    required
                    className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Kelas</label>
                    <select
                      value={newSantriKelas}
                      onChange={e => setNewSantriKelas(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none"
                    >
                      {['7A','7B','8A','8B','9A','9B'].map(k => (
                        <option key={k} value={k}>{k}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                      Grade
                    </label>
                    <select
                      value={newSantriGrade}
                      onChange={e => setNewSantriGrade(e.target.value as 'Tahsin' | 'Takmil' | 'Tahfiz')}
                      className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none"
                    >
                      <option value="Tahsin">Tahsin (3 baris)</option>
                      <option value="Takmil">Takmil (7 baris)</option>
                      <option value="Tahfiz">Tahfiz (12 baris)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Halaqah</label>
                  <select
                    value={newSantriHalaqahId}
                    onChange={e => setNewSantriHalaqahId(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none"
                  >
                    <option value="">-- Pilih Halaqah --</option>
                    {halaqahs.map(h => (
                      <option key={h.id} value={h.id}>{h.nama} ({h.unit})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Nama Orang Tua / Wali</label>
                  <input
                    type="text"
                    value={newSantriParentName}
                    onChange={e => setNewSantriParentName(e.target.value)}
                    placeholder="cth: Bapak Wahyudi"
                    required
                    className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Nomor HP Orang Tua</label>
                  <input
                    type="tel"
                    value={newSantriParentPhone}
                    onChange={e => setNewSantriParentPhone(e.target.value)}
                    placeholder="cth: 0812xxxx"
                    className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:border-emerald-400"
                  />
                </div>

                {createSantriSuccess && (
                  <div className="flex items-center space-x-1.5 text-emerald-600 text-xs font-bold">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Santri baru berhasil ditambahkan!</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs shadow transition-colors flex items-center justify-center space-x-1.5 disabled:opacity-60"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Daftarkan Santri</span>
                </button>
              </form>
            </div>

            {/* ── FORM 3: Buat Akun Pengampu Baru ────────────────────────── */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3 mb-5 flex items-center space-x-2">
                <UserPlus className="h-4 w-4 text-indigo-500" />
                <span>Buat Akun Pengampu Baru</span>
              </h3>

              <form onSubmit={handleCreatePengampu} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    value={newUserNama}
                    onChange={e => setNewUserNama(e.target.value)}
                    placeholder="cth: Ustadz Budi Santoso"
                    required
                    className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:border-indigo-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    Nomor HP
                  </label>
                  <input
                    type="tel"
                    value={newUserPhone}
                    onChange={e => setNewUserPhone(e.target.value)}
                    placeholder="cth: 0812xxxx"
                    className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:border-indigo-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    Email (opsional — auto-generate jika kosong)
                  </label>
                  <input
                    type="email"
                    value={newUserEmail}
                    onChange={e => setNewUserEmail(e.target.value)}
                    placeholder="auto: nama@mts-tq.sch.id"
                    className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:border-indigo-400"
                  />
                  <p className="text-[9px] text-slate-400 mt-1">
                    Jika dikosongkan, email dibuat otomatis dari nama.
                  </p>
                </div>

                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl text-[9px] text-amber-700 dark:text-amber-400 font-semibold leading-relaxed">
                  ⚠ Password akan menggunakan placeholder dev. Koordinator harus mereset password melalui Supabase Auth sebelum pengampu bisa login ke sistem.
                </div>

                {createUserSuccess && (
                  <div className="flex items-center space-x-1.5 text-emerald-600 text-xs font-bold">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Akun pengampu berhasil dibuat!</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs shadow transition-colors flex items-center justify-center space-x-1.5 disabled:opacity-60"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Buat Akun Pengampu</span>
                </button>
              </form>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
