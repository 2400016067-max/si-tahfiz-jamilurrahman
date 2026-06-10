'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import RoleHeader from '@/components/RoleHeader';
import PengumumanPopup from '@/components/PengumumanPopup';
import { supabase } from '@/lib/supabase';
import { Santri, UjianJuz, Setoran } from '@/types/tahfiz';
import {
  Award,
  Users,
  AlertTriangle,
  BarChart2,
  LayoutDashboard,
  BookOpen,
  TrendingUp,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import DashboardPanel      from './components/DashboardPanel';
import ManajemenGradePanel from './components/ManajemenGradePanel';
import StagnasisPanel      from './components/StagnasisPanel';
import UKJPanel            from './components/UKJPanel';
import PekanMurajaahPanel  from './components/PekanMurajaahPanel';
import AnalitikPanel       from './components/AnalitikPanel';

export default function KoordinatorDashboard() {
  const [mounted, setMounted] = useState(false);

  // ── Shared Master Data ────────────────────────────────────────────────────
  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [ujianList, setUjianList] = useState<UjianJuz[]>([]);
  const [setorans, setSetorans] = useState<Setoran[]>([]);
  const [halaqahMap, setHalaqahMap] = useState<Record<string, string>>({});

  // ── Session / User Info ───────────────────────────────────────────────────
  const [namaLengkap, setNamaLengkap] = useState<string>('');
  const [userId, setUserId] = useState<string>('');

  // ── Loading & Error ───────────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Navigation ────────────────────────────────────────────────────────────
  const [activeMenu, setActiveMenu] = useState<'dashboard' | 'grade' | 'stagnasi' | 'ukj' | 'pekan' | 'analitik'>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  // ── Derived Stats (used by sidebar badges) ─────────────────────────────────
  const stagnantCount  = santriList.filter(s => s.status === 'stagnant').length;
  const pendingUjians  = ujianList.filter(u => !u.approvedByKoordinator);

  // ---------------------------------------------------------------------------
  // DATA LOADING — Supabase queries
  // ---------------------------------------------------------------------------
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setSaveError(null);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) throw new Error('Sesi tidak valid. Silakan login kembali.');

      const email = session.user.email;

      // User info
      const { data: dbUser, error: dbUserError } = await supabase
        .from('users')
        .select('id, nama_lengkap')
        .eq('email', email)
        .single();

      if (dbUserError || !dbUser) throw new Error('Detail pengguna tidak ditemukan di database.');
      setNamaLengkap(dbUser.nama_lengkap ?? '');
      setUserId(dbUser.id);

      // 1. Halaqah map
      const { data: halaqahData, error: halaqahError } = await supabase
        .from('halaqah')
        .select('id, nama');

      if (halaqahError) throw new Error('Gagal memuat halaqah: ' + halaqahError.message);

      const newHalaqahMap: Record<string, string> = {};
      (halaqahData ?? []).forEach((h: { id: string; nama: string }) => {
        const match = h.nama.match(/Halaqah (.+?) \(/);
        newHalaqahMap[h.id] = match ? match[1] : h.nama;
      });
      setHalaqahMap(newHalaqahMap);

      // 2. Santri
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
          totalHafalanJuz: [],
        }));
        setSantriList(mapped);
      }

      // 3. Ujian juz
      const { data: ujianData, error: ujianError } = await supabase
        .from('ujian_juz')
        .select('*')
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
        setUjianList(mappedUjian);
      }

      // 4. Setoran — 90 hari terakhir untuk analytics halaqah
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const fromDateAnalytics = ninetyDaysAgo.toISOString().split('T')[0];

      const { data: setoranData, error: setoranError } = await supabase
        .from('setoran')
        .select('id, santri_id, tanggal, tipe, jumlah_baris, status')
        .gte('tanggal', fromDateAnalytics)
        .order('tanggal', { ascending: true });

      if (setoranError) throw new Error('Gagal memuat setoran: ' + setoranError.message);

      if (setoranData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mappedSetoran: Setoran[] = (setoranData as any[]).map((s) => ({
          id: s.id,
          santriId: s.santri_id,
          date: s.tanggal,
          type: s.tipe as 'sabak' | 'sabki' | 'manzil',
          surah: '',
          halamanMulai: 0,
          halamanSelesai: 0,
          baris: s.jumlah_baris,
          kesalahan: 0,
          status: s.status as 'lulus' | 'mengulang',
          parentVerified: false,
        }));
        setSetorans(mappedSetoran);
      }

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan tidak diketahui.';
      console.error('[KoordinatorDashboard] loadData error:', err);
      setSaveError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, [loadData]);

  // Real-time listener for stagnant status updates
  useEffect(() => {
    const channel = supabase
      .channel('koordinator-stagnant-notif')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'santri' },
        (payload) => {
          const oldSantri = payload.old;
          const newSantri = payload.new;
          if (newSantri.status === 'stagnant' && oldSantri.status !== 'stagnant') {
            toast.error(`Perhatian: Status santri ${newSantri.nama} berubah menjadi stagnant!`, {
              style: { backgroundColor: '#fff5f5', border: '1px solid #e53e3e', color: '#9b2c2c' },
            });
            loadData();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-805 dark:text-slate-105 flex flex-col md:flex-row">
      {/* 1. Desktop Collapsible Sidebar */}
      <aside className={`hidden md:flex flex-col shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-60'}`}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center space-x-2 overflow-hidden">
          <div className="h-9 w-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0">
            📚
          </div>
          {!sidebarCollapsed && (
            <div className="transition-opacity duration-300">
              <h1 className="font-bold text-sm leading-tight text-slate-900 dark:text-white">SI Tahfiz</h1>
              <p className="text-[10px] text-slate-505">Koordinator Dashboard</p>
            </div>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {[
            { id: 'dashboard', label: 'Dashboard',          icon: LayoutDashboard },
            { id: 'grade',     label: 'Manajemen Grade',    icon: BookOpen },
            { id: 'stagnasi',  label: 'Stagnasi',           icon: AlertTriangle, badge: stagnantCount },
            { id: 'ukj',       label: 'Ujian UKJ',          icon: Award, badge: pendingUjians.length },
            { id: 'pekan',     label: "Pekan Muraja'ah",    icon: Calendar },
            { id: 'analitik',  label: 'Analitik',           icon: TrendingUp },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeMenu === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveMenu(item.id as typeof activeMenu)}
                className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 font-bold border-l-4 border-indigo-500'
                    : 'text-slate-605 hover:bg-slate-105 dark:hover:bg-slate-800/40 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!sidebarCollapsed && <span className="ml-3 text-sm">{item.label}</span>}
                {!sidebarCollapsed && item.badge && item.badge > 0 ? (
                  <span className="ml-auto bg-indigo-605 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
          >
            {sidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </div>
      </aside>

      {/* 2. Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2 py-2 flex items-center justify-around shadow-lg">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'grade',     label: 'Grade',     icon: BookOpen },
          { id: 'stagnasi',  label: 'Stagnasi',  icon: AlertTriangle, badge: stagnantCount },
          { id: 'ukj',       label: 'UKJ',       icon: Award, badge: pendingUjians.length },
          { id: 'pekan',     label: 'Pekan',     icon: Calendar },
          { id: 'analitik',  label: 'Analitik',  icon: TrendingUp },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeMenu === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveMenu(item.id as typeof activeMenu)}
              className={`flex flex-col items-center p-1.5 rounded-lg transition-colors relative ${
                isActive ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-500'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[9px] mt-0.5">{item.label}</span>
              {item.badge && item.badge > 0 ? (
                <span className="absolute top-0.5 right-1 bg-red-500 text-white text-[8px] h-4 w-4 rounded-full flex items-center justify-center font-bold">
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      {/* 3. Main Viewport */}
      <div className="flex-grow flex flex-col min-w-0 pb-16 md:pb-0">
        <RoleHeader roleName="Koordinator Tahfiz" activeRole="koordinator" />
        <PengumumanPopup />

        <div className="flex-grow p-4 sm:p-6 overflow-y-auto max-w-5xl mx-auto w-full">
          {/* Personal Greeting */}
          {namaLengkap && activeMenu === 'dashboard' && (
            <div className="mb-6 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex items-center space-x-2">
              <span className="text-lg">👋</span>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-205">
                Selamat datang, <span className="font-semibold text-indigo-650 dark:text-indigo-400">Ustadz {namaLengkap}</span>
              </p>
            </div>
          )}

          {/* Global error banner */}
          {saveError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-805 rounded-xl flex items-center space-x-2 text-red-700 dark:text-red-400 text-xs font-semibold">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          {/* Loading indicator */}
          {isLoading && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl text-blue-700 dark:text-blue-400 text-xs font-semibold text-center">
              Memuat data dari Supabase…
            </div>
          )}

          {/* Panel Rendering */}
          {activeMenu === 'dashboard' && (
            <DashboardPanel
              santriList={santriList}
              ujianList={ujianList}
              setorans={setorans}
              halaqahMap={halaqahMap}
              namaLengkap={namaLengkap}
              userId={userId}
              isLoading={isLoading}
              onDataChanged={loadData}
            />
          )}
          {activeMenu === 'grade' && (
            <ManajemenGradePanel
              santriList={santriList}
              halaqahMap={halaqahMap}
              userId={userId}
              namaLengkap={namaLengkap}
              isLoading={isLoading}
              onDataChanged={loadData}
            />
          )}
          {activeMenu === 'stagnasi' && (
            <StagnasisPanel
              santriList={santriList}
              halaqahMap={halaqahMap}
              userId={userId}
              namaLengkap={namaLengkap}
              isLoading={isLoading}
              onDataChanged={loadData}
            />
          )}
          {activeMenu === 'ukj' && (
            <UKJPanel
              santriList={santriList}
              ujianList={ujianList}
              halaqahMap={halaqahMap}
              userId={userId}
              namaLengkap={namaLengkap}
              isLoading={isLoading}
              onDataChanged={loadData}
            />
          )}
          {activeMenu === 'pekan' && (
            <PekanMurajaahPanel
              santriList={santriList}
              halaqahMap={halaqahMap}
              userId={userId}
              namaLengkap={namaLengkap}
              onDataChanged={loadData}
            />
          )}
          {activeMenu === 'analitik' && (
            <AnalitikPanel
              santriList={santriList}
              setorans={setorans}
              ujianList={ujianList}
              halaqahMap={halaqahMap}
            />
          )}
        </div>
      </div>
    </div>
  );
}
