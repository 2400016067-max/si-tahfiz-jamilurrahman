'use client';

import React, { useEffect, useState, useCallback } from 'react';
import RoleHeader from '@/components/RoleHeader';
import PengumumanPopup from '@/components/PengumumanPopup';
import { supabase } from '@/lib/supabase';
import { Santri, Setoran, ModulAjar, UjianJuz, MenuItem } from '@/types/tahfiz';
import {
  FolderLock,
  LayoutDashboard,
  BarChart2,
  Users,
  FileText,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

import RingkasanPanel from './components/RingkasanPanel';
import AnalitikPanel from './components/AnalitikPanel';
import PemantauanPanel from './components/PemantauanPanel';
import ArsipPanel from './components/ArsipPanel';
import LaporanPanel from './components/LaporanPanel';

const MENU_ITEMS: MenuItem[] = [
  { id: 'ringkasan', name: 'Ringkasan Eksekutif', shortName: 'Ringkasan', icon: LayoutDashboard },
  { id: 'analitik', name: 'Analitik Program', shortName: 'Analitik', icon: BarChart2 },
  { id: 'pemantauan', name: 'Pemantauan Santri', shortName: 'Pemantauan', icon: Users },
  { id: 'arsip', name: 'Arsip & HAKI', shortName: 'Arsip', icon: FolderLock },
  { id: 'laporan', name: 'Laporan', shortName: 'Laporan', icon: FileText },
];

export default function KepalaSekolahDashboard() {
  const [mounted, setMounted] = useState(false);

  // Master data — shared across multiple panels
  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [setorans, setSetorans] = useState<Setoran[]>([]);
  const [moduls, setModuls] = useState<ModulAjar[]>([]);
  const [ujians, setUjians] = useState<UjianJuz[]>([]);
  const [halaqahMap, setHalaqahMap] = useState<Record<string, string>>({});

  // Session / user info
  const [namaLengkap, setNamaLengkap] = useState<string>('');

  // Loading & error state
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Navigation
  const [activeMenu, setActiveMenu] = useState<string>('ringkasan');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // ---------------------------------------------------------------------------
  // DATA LOADING — Supabase queries
  // ---------------------------------------------------------------------------
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      // Ambil sesi aktif dari Supabase client (tersimpan di localStorage setelah login).
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) throw new Error('Sesi tidak valid. Silakan login kembali.');

      const email = session.user.email;

      // Query tabel users untuk dapat nama lengkap
      const { data: dbUser, error: dbUserError } = await supabase
        .from('users')
        .select('nama_lengkap')
        .eq('email', email)
        .single();

      if (dbUserError || !dbUser) throw new Error('Detail pengguna tidak ditemukan di database.');
      setNamaLengkap(dbUser.nama_lengkap ?? '');

      // 0. Fetch halaqah — untuk mapping id → nama singkat
      const { data: halaqahData } = await supabase
        .from('halaqah')
        .select('id, nama');

      const newHalaqahMap: Record<string, string> = {};
      (halaqahData ?? []).forEach((h: { id: string; nama: string }) => {
        const match = h.nama.match(/Halaqah (.+?) \(/);
        newHalaqahMap[h.id] = match ? match[1] : h.nama;
      });
      setHalaqahMap(newHalaqahMap);

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
          size: m.file_size ?? '—',
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

  // Derived stats (used by RingkasanPanel)
  const stagnantCount = santriList.filter(s => s.status === 'stagnant').length;
  const totalPassedUjians = ujians.filter(u => u.status === 'lulus' && u.approvedByKoordinator).length;

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-955 text-slate-800 dark:text-slate-100 flex flex-col">
      <RoleHeader roleName="Kepala Sekolah &amp; Komite" activeRole="kepalasekolah" />
      <PengumumanPopup />
      
      {/* Layout Container */}
      <div className="flex flex-1 min-h-[calc(100vh-4rem)]">
        {/* Sidebar - Desktop */}
        <aside className={`hidden md:flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-60'} shrink-0 z-30`}>
          <div className="flex-1 flex flex-col justify-between py-6">
            <nav className="space-y-1 px-3">
              {MENU_ITEMS.map((item) => {
                const isActive = activeMenu === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveMenu(item.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400'
                        : 'text-slate-500 hover:bg-slate-55 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    <item.icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} />
                    {!sidebarCollapsed && <span className="truncate">{item.name}</span>}
                  </button>
                );
              })}
            </nav>
            
            <div className="px-3">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="w-full flex items-center justify-center p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-400 hover:text-slate-650 dark:hover:text-slate-300 transition-all"
              >
                {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-slate-50 dark:bg-slate-950 pb-24 md:pb-8 overflow-x-hidden">
          {/* Greeting banner (shown if loaded and on Dashboard) */}
          {activeMenu === 'ringkasan' && namaLengkap && (
            <div className="mb-6 px-5 py-4 bg-gradient-to-r from-amber-500/10 to-amber-600/5 dark:from-amber-500/20 dark:to-slate-900 border border-amber-200/50 dark:border-amber-900/40 rounded-2xl shadow-sm flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">👑</span>
                <div>
                  <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Selamat datang kembali, <span className="text-amber-600 dark:text-amber-400">{namaLengkap}</span>
                  </h2>
                  <p className="text-[10px] text-slate-450 mt-0.5">
                    Peran: Kepala Sekolah &amp; Komite Madrasah
                  </p>
                </div>
              </div>
              <span className="text-[9px] font-bold bg-amber-500 text-white px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Principal Mode
              </span>
            </div>
          )}

          {/* Load Error Banner */}
          {loadError && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-2xl flex items-center space-x-2 text-red-700 dark:text-red-400 text-xs font-semibold">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{loadError}</span>
            </div>
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/40 rounded-2xl text-amber-700 dark:text-amber-400 text-xs font-semibold text-center flex items-center justify-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin text-amber-600 dark:text-amber-400" />
              <span>Memuat data dari Supabase...</span>
            </div>
          )}

          {/* Panel Rendering */}
          {activeMenu === 'ringkasan' && (
            <RingkasanPanel
              santriList={santriList}
              moduls={moduls}
              stagnantCount={stagnantCount}
              totalPassedUjians={totalPassedUjians}
              setoransCount={setorans.length}
              namaLengkap={namaLengkap}
              isLoading={isLoading}
            />
          )}
          {activeMenu === 'analitik' && (
            <AnalitikPanel
              santriList={santriList}
              setorans={setorans}
              halaqahMap={halaqahMap}
            />
          )}
          {activeMenu === 'pemantauan' && (
            <PemantauanPanel
              santriList={santriList}
              halaqahMap={halaqahMap}
            />
          )}
          {activeMenu === 'arsip' && (
            <ArsipPanel
              moduls={moduls}
              namaLengkap={namaLengkap}
              isLoading={isLoading}
            />
          )}
          {activeMenu === 'laporan' && (
            <LaporanPanel
              santriList={santriList}
              halaqahMap={halaqahMap}
            />
          )}
        </main>
      </div>

      {/* Bottom Navigation - Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-around items-center z-45 px-2 shadow-lg">
        {MENU_ITEMS.map((item) => {
          const isActive = activeMenu === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveMenu(item.id)}
              className={`flex flex-col items-center justify-center space-y-0.5 flex-1 py-1 transition-all ${
                isActive ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <item.icon className={`h-4.5 w-4.5 ${isActive ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} />
              <span className="text-[9px] font-bold truncate max-w-full px-1">{item.shortName || item.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
