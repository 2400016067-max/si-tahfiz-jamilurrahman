'use client';

import React, { useEffect, useState, useCallback } from 'react';
import RoleHeader from '@/components/RoleHeader';
import { supabase } from '@/lib/supabase';
import { Santri, Setoran, ModulAjar, UjianJuz } from '@/lib/mockData';
import { 
  Award, 
  FolderLock, 
  Download, 
  Search, 
  Activity, 
  Users, 
  AlertTriangle,
  BookOpen
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

export default function KepalaSekolahDashboard() {
  const [mounted, setMounted] = useState(false);
  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [setorans, setSetorans] = useState<Setoran[]>([]);
  const [moduls, setModuls] = useState<ModulAjar[]>([]);
  const [ujians, setUjians] = useState<UjianJuz[]>([]);

  // Loading & error state
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Search query
  const [searchQuery, setSearchQuery] = useState('');

  // Lock status simulator for HAKI modules
  const [userOtorisasi, setUserOtorisasi] = useState<boolean>(false);

  // ---------------------------------------------------------------------------
  // DATA LOADING — Supabase queries
  // ---------------------------------------------------------------------------
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      // 1. Fetch semua hafalan_juz — dibutuhkan untuk totalHafalanJuz per santri
      const { data: hafalanData, error: hafalanError } = await supabase
        .from('hafalan_juz')
        .select('santri_id, juz');

      if (hafalanError) throw new Error('Gagal memuat hafalan_juz: ' + hafalanError.message);

      // Bangun map: santri_id → number[]
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
          // totalHafalanJuz diisi dari join tabel hafalan_juz
          totalHafalanJuz: hafalanMap[s.id] ?? [],
        }));
        setSantriList(mapped);
      }

      // 3. Fetch SEMUA setoran (dibutuhkan untuk chart rerata baris per grade)
      //    Kepala Sekolah melihat data historis keseluruhan, bukan hanya 30 hari
      const { data: setoranData, error: setoranError } = await supabase
        .from('setoran')
        .select('id, santri_id, tanggal, tipe, surah, halaman_mulai, halaman_selesai, jumlah_baris, jumlah_kesalahan, status, parent_verified, catatan')
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

      // 4. Fetch modul_ajar
      //    Kolom DB: judul, file_size, file_url → dimap ke interface field: judul, size, fileUrl
      const { data: modulData, error: modulError } = await supabase
        .from('modul_ajar')
        .select('id, judul, file_url, file_size, akses_role');

      if (modulError) throw new Error('Gagal memuat modul_ajar: ' + modulError.message);

      if (modulData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mappedModul: ModulAjar[] = (modulData as any[]).map((m) => ({
          id: m.id,
          judul: m.judul,
          fileUrl: m.file_url ?? '',
          size: m.file_size ?? '—',   // file_size → size (interface field)
        }));
        setModuls(mappedModul);
      }

      // 5. Fetch ujian_juz
      const { data: ujianData, error: ujianError } = await supabase
        .from('ujian_juz')
        .select('id, santri_id, juz, tanggal_ujian, jumlah_kesalahan, status, approved_by_koordinator')
        .order('tanggal_ujian', { ascending: false });

      if (ujianError) throw new Error('Gagal memuat ujian_juz: ' + ujianError.message);

      if (ujianData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mappedUjian: UjianJuz[] = (ujianData as any[]).map((u) => ({
          id: u.id,
          santriId: u.santri_id,
          juz: u.juz,
          date: u.tanggal_ujian,
          kesalahan: u.jumlah_kesalahan,
          status: u.status as 'lulus' | 'mengulang',
          approvedByKoordinator: u.approved_by_koordinator,
        }));
        setUjians(mappedUjian);
      }

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan tidak diketahui.';
      console.error('[KepalaSekolahDashboard] loadData error:', err);
      setLoadError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, [loadData]);

  // ---------------------------------------------------------------------------
  // COMPUTED — Pie chart: distribusi grade santri
  // ---------------------------------------------------------------------------
  const getGradePieData = () => {
    const grades = { Tahsin: 0, Takmil: 0, Tahfiz: 0 };
    santriList.forEach(s => {
      if (grades[s.grade] !== undefined) {
        grades[s.grade]++;
      }
    });

    return [
      { name: 'Tahsin', value: grades.Tahsin, color: '#f59e0b' },
      { name: 'Takmil', value: grades.Takmil, color: '#3b82f6' },
      { name: 'Tahfiz', value: grades.Tahfiz, color: '#10b981' }
    ];
  };

  // ---------------------------------------------------------------------------
  // COMPUTED — Bar chart: rerata baris setoran sukses per grade
  // Data dari tabel setoran (semua riwayat, join santriList di client)
  // ---------------------------------------------------------------------------
  const getAverageLinesData = () => {
    const counts = {
      Tahsin: { sum: 0, count: 0 },
      Takmil: { sum: 0, count: 0 },
      Tahfiz: { sum: 0, count: 0 }
    };

    // Hanya Sabak yang lulus — mencerminkan capaian hafalan baru
    const sabakSetorans = setorans.filter(s => s.type === 'sabak' && s.status === 'lulus');

    sabakSetorans.forEach(s => {
      const student = santriList.find(st => st.id === s.santriId);
      if (student && counts[student.grade]) {
        counts[student.grade].sum += s.baris;
        counts[student.grade].count++;
      }
    });

    return Object.keys(counts).map(grade => {
      const g = counts[grade as keyof typeof counts];
      const avg = g.count > 0 ? Math.round((g.sum / g.count) * 10) / 10 : 0;
      return {
        grade,
        'Rata-rata Baris': avg
      };
    });
  };

  // Simulate download archive check
  const handleDownload = (judul: string) => {
    if (!userOtorisasi) {
      alert(`[HAKI Gate Alert] Hak cipta sekolah dilindungi (NFR-02.2).\nUnduhan modul "${judul}" ditolak karena akun Anda tidak memiliki hak otorisasi pengunduhan.\n\nSilakan centang "Aktifkan Otorisasi Unduh" di bagian kanan untuk melakukan simulasi.`);
    } else {
      alert(`[Unduhan Berhasil] Memulai unduhan file "${judul}".\nData dienkripsi secara lokal.`);
    }
  };

  // Filter student list based on search
  const filteredStudents = santriList.filter(s =>
    s.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.kelas.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Derived stats
  const stagnantCount = santriList.filter(s => s.status === 'stagnant').length;
  const totalPassedUjians = ujians.filter(u => u.status === 'lulus' && u.approvedByKoordinator).length;

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
      <RoleHeader roleName="Kepala Sekolah &amp; Komite" activeRole="kepalasekolah" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Error banner */}
        {loadError && (
          <div className="mb-6 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center space-x-2 text-red-700 dark:text-red-400 text-xs font-semibold">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{loadError}</span>
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl text-blue-700 dark:text-blue-400 text-xs font-semibold text-center">
            Memuat data dari Supabase…
          </div>
        )}
        
        {/* Executive Stats Dashboard (F4.1.1) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Santri</p>
              <h4 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">{santriList.length} Santri</h4>
              <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Semua aktif di unit</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Capaian Kenaikan Juz</p>
              <h4 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">{totalPassedUjians} Ujian Juz</h4>
              <p className="text-[10px] text-indigo-600 font-semibold mt-0.5">Tervalidasi Koordinator</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-red-500/10 text-red-650 dark:text-red-400 rounded-xl">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Stagnasi Pembelajaran</p>
              <h4 className="text-xl font-extrabold text-red-600 dark:text-red-400 mt-0.5">{stagnantCount} Santri</h4>
              <p className="text-[10px] text-red-500 font-semibold mt-0.5">Butuh pendampingan</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Setoran Direkam</p>
              <h4 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">{setorans.length} Setoran</h4>
              <p className="text-[10px] text-slate-500 mt-0.5">Sabak, Sabki, &amp; Manzil</p>
            </div>
          </div>

        </div>

        {/* Aggregate Charts & Visualizations (F4.1.2) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
          
          {/* Distribution Pie Chart */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
            <h3 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider mb-4">
              📊 Distribusi Grade Santri (Kurikulum)
            </h3>
            
            <div className="h-[220px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={getGradePieData()}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {getGradePieData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <p className="text-[11px] text-slate-500 text-center leading-relaxed mt-2">
              Grade Tahfiz (Target &ge; 10 baris) mendominasi, menunjukkan mayoritas santri berada pada tingkat hafalan lanjut.
            </p>
          </div>

          {/* Average Performance Bar Chart */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
            <h3 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider mb-4">
              📈 Rerata Baris Setoran Sukses per Grade
            </h3>

            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getAverageLinesData()}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="grade" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="Rata-rata Baris" fill="#f59e0b" radius={[4, 4, 0, 0]}>
                    {getAverageLinesData().map((entry, index) => {
                      const colors = ['#f59e0b', '#3b82f6', '#10b981'];
                      return <Cell key={`cell-${index}`} fill={colors[index % 3]} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Mengevaluasi apakah santri di tiap grade memenuhi target standardisasi kurikulum sekolah secara kolektif.
            </p>
          </div>

        </div>

        {/* Bottom Panel: School Module Archives & Reports (F4.3, F4.2) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Module Archive - IP Protection Gate (F4.3) */}
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                <FolderLock className="h-5 w-5 text-amber-500" />
                <span>Arsip Modul Ajar &amp; HAKI Sekolah</span>
              </h3>
              
              <div className="flex items-center space-x-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Otorisasi Unduh:</span>
                <input 
                  type="checkbox"
                  checked={userOtorisasi}
                  onChange={e => setUserOtorisasi(e.target.checked)}
                  className="h-4 w-4 text-amber-600 border-slate-350 rounded"
                />
              </div>
            </div>

            <div className="space-y-4 flex-grow">
              {moduls.map(mod => (
                <div key={mod.id} className="p-3 border border-slate-150 dark:border-slate-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{mod.judul}</h4>
                      {/* mod.size ← DB kolom file_size */}
                      <p className="text-[10px] text-slate-450 mt-0.5">Ukuran: {mod.size} · Hak Cipta MTs TQ</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownload(mod.judul)}
                    className="p-2 text-slate-500 hover:text-amber-650 hover:bg-amber-500/10 dark:hover:bg-amber-500/5 rounded-lg transition-colors"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {moduls.length === 0 && !isLoading && (
                <p className="text-center text-xs text-slate-400 py-6">Belum ada modul ajar tersimpan.</p>
              )}
            </div>
            
            <p className="text-[9px] text-red-500 font-bold mt-4">
              ⚠ NFR-02.2: Sistem membatasi pengunduhan hanya untuk personel berotoritas penuh untuk mencegah penyebaran modul ajar secara ilegal.
            </p>
          </div>

          {/* Student Search & Report List (F4.2) */}
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              🔍 Peninjauan Capaian Santri &amp; Rapat Komite
            </h3>

            {/* Search Input */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari santri berdasarkan nama atau kelas..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-10 pr-4 py-2 border border-slate-250 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="overflow-y-auto max-h-[240px] divide-y divide-slate-100 dark:divide-slate-800 pr-1">
              {filteredStudents.map(student => (
                <div key={student.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <h4 className="font-bold text-slate-850 dark:text-slate-200">{student.nama}</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {/* totalHafalanJuz dari tabel hafalan_juz (di-join saat loadData) */}
                      Kelas {student.kelas} · Juz Selesai: {student.totalHafalanJuz.length > 0 ? student.totalHafalanJuz.join(', ') : 'Belum ada'}
                    </p>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${student.status === 'stagnant' ? 'bg-red-100 text-red-800 dark:bg-red-950/40' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40'}`}>
                    {student.status === 'stagnant' ? 'Stagnan' : 'Aktif'}
                  </span>
                </div>
              ))}
              
              {filteredStudents.length === 0 && (
                <p className="text-center text-xs text-slate-400 py-4">Tidak ada santri ditemukan.</p>
              )}
            </div>

            <button
              onClick={() => alert('[Simulasi Laporan] Berhasil mengunduh dokumen laporan capaian semesteran untuk Rapat Komite.')}
              className="w-full mt-4 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 rounded-xl text-xs shadow-md transition-colors"
            >
              Unduh Laporan Rapat Komite (Semesteran)
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
