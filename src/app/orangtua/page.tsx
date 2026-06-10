'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import RoleHeader from '@/components/RoleHeader';
import PengumumanPopup from '@/components/PengumumanPopup';
import { supabase } from '@/lib/supabase';
import { Santri, Setoran, Pesan, TikrarTask } from '@/types/tahfiz';
import {
  User,
  AlertCircle,
  Smartphone,
  Flame,
  Home,
  Award,
  TrendingUp,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import BerandaPanel from './components/BerandaPanel';
import ValidasiManzilPanel from './components/ValidasiManzilPanel';
import TikrarPanel from './components/TikrarPanel';
import PerkembanganPanel from './components/PerkembanganPanel';
import PesanPanel from './components/PesanPanel';

export default function OrangTuaDashboard() {
  const [mounted, setMounted] = useState(false);
  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [selectedSantriId, setSelectedSantriId] = useState<string>('');

  // Child specific state
  const [setorans, setSetorans] = useState<Setoran[]>([]);
  const [pesans, setPesans] = useState<Pesan[]>([]);
  const [tikrars, setTikrars] = useState<TikrarTask[]>([]);

  // Navigation states
  const [activeMenu, setActiveMenu] = useState<'beranda' | 'manzil' | 'tikrar' | 'perkembangan' | 'pesan'>('beranda');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  // Loading & error state
  const [isLoading, setIsLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [namaLengkap, setNamaLengkap] = useState<string>('');

  // Maps santri_id → parent_user_id (dari DB).
  // Diperlukan karena pesan.pengirim_id NOT NULL dan harus berisi UUID user nyata.
  const [parentUserIdMap, setParentUserIdMap] = useState<Record<string, string>>({});

  // ---------------------------------------------------------------------------
  // Computed values — derived from state, passed as props to panels
  // ---------------------------------------------------------------------------
  const todayStr = new Date().toISOString().split('T')[0];

  const activeSantri = santriList.find((s) => s.id === selectedSantriId) ?? null;

  const todayManzil = activeSantri
    ? setorans.find(
        (s) => s.santriId === activeSantri.id && s.type === 'manzil' && s.date === todayStr
      )
    : null;

  const childSetorans = setorans.filter((s) => s.santriId === selectedSantriId);
  const childPesans = pesans.filter((p) => p.santriId === selectedSantriId);

  // ---------------------------------------------------------------------------
  // DATA LOADING — Supabase queries
  // ---------------------------------------------------------------------------
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setSaveError(null);

    try {
      // Ambil sesi aktif dari Supabase client (tersimpan di localStorage setelah login).
      // Lebih aman daripada mem-parsing cookie secara manual yang rawan edge-case.
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) throw new Error('Sesi tidak valid. Silakan login kembali.');

      const email = session.user.email;

      // Query tabel users untuk dapat UUID dan nama lengkap
      const { data: dbUser, error: dbUserError } = await supabase
        .from('users')
        .select('id, nama_lengkap')
        .eq('email', email)
        .single();

      if (dbUserError || !dbUser) throw new Error('Detail pengguna tidak ditemukan di database.');
      setNamaLengkap(dbUser.nama_lengkap ?? '');

      // 1. Fetch semua juz hafalan santri (untuk totalHafalanJuz)
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

      // 2. Fetch santri - filter by parent_user_id yang sesuai dengan UUID orang tua
      const { data: santriData, error: santriError } = await supabase
        .from('santri')
        .select('*')
        .eq('parent_user_id', dbUser.id);

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

        // Simpan map santri_id → parent_user_id untuk keperluan insert pesan
        const pidMap: Record<string, string> = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (santriData as any[]).forEach((s) => {
          if (s.parent_user_id) pidMap[s.id] = s.parent_user_id;
        });
        setParentUserIdMap(pidMap);

        // Set default santri yang dipilih
        if (mapped.length > 0 && !selectedSantriId) {
          setSelectedSantriId(mapped[0].id);
        }
      }

      // 3. Fetch setoran — 30 hari terakhir
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
          parentSignature: s.parent_signature ?? undefined,
          halamanAktual: s.halaman_aktual ?? undefined,
        }));
        setSetorans(mappedSetoran);
      }

      // 4. Fetch pesan
      const { data: pesanData, error: pesanError } = await supabase
        .from('pesan')
        .select('*')
        .order('created_at', { ascending: true });

      if (pesanError) throw new Error('Gagal memuat pesan: ' + pesanError.message);

      if (pesanData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mappedPesan: Pesan[] = (pesanData as any[]).map((p) => ({
          id: p.id,
          santriId: p.santri_id,
          sender: p.tipe_pengirim as 'pengampu' | 'orangtua',
          content: p.konten,
          timestamp: p.created_at,
          sudahDibaca: p.sudah_dibaca,
        }));
        setPesans(mappedPesan);
      }

      // 5. Fetch tikrar
      let activeId = selectedSantriId;
      if (!activeId && santriData && santriData.length > 0) {
        activeId = santriData[0].id;
      }

      if (activeId) {
        const { data: tikrarData, error: tikrarError } = await supabase
          .from('tikrar')
          .select('*')
          .eq('santri_id', activeId)
          .order('tanggal', { ascending: false });

        if (tikrarError) throw new Error('Gagal memuat data tikrar: ' + tikrarError.message);
        if (tikrarData) {
          setTikrars(tikrarData);
        }
      } else {
        setTikrars([]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan tidak diketahui.';
      console.error('[OrangTuaDashboard] loadData error:', err);
      setSaveError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSantriId]);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, [loadData]);

  // Real-time listener for teacher setoran inputs
  useEffect(() => {
    if (santriList.length === 0) return;

    const childIds = santriList.map((s) => s.id);

    const channel = supabase
      .channel('orangtua-setoran-notif')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'setoran',
        },
        (payload) => {
          const newSetoran = payload.new;
          if (
            (newSetoran.tipe === 'sabak' || newSetoran.tipe === 'sabki') &&
            childIds.includes(newSetoran.santri_id)
          ) {
            const student = santriList.find((s) => s.id === newSetoran.santri_id);
            if (student) {
              toast.info(
                `Ustadz menginput setoran baru untuk ${student.nama}: Surah ${newSetoran.surah}`,
                {
                  style: {
                    backgroundColor: '#ebf8ff',
                    border: '1px solid #3182ce',
                    color: '#2b6cb0',
                  },
                }
              );
              loadData();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [santriList, loadData]);

  // Real-time listener for Tikrar updates from teacher
  useEffect(() => {
    if (santriList.length === 0) return;

    const childIds = santriList.map((s) => s.id);

    const channel = supabase
      .channel('orangtua-tikrar-notif')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all database operations (INSERT, UPDATE)
          schema: 'public',
          table: 'tikrar',
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const tikrarRecord = payload.new as TikrarTask;
            if (
              tikrarRecord &&
              tikrarRecord.status === 'wajib_rumah' &&
              childIds.includes(tikrarRecord.santri_id)
            ) {
              const student = santriList.find((s) => s.id === tikrarRecord.santri_id);
              if (student) {
                toast.error(
                  `Perhatian: Ustadz mewajibkan Tikrar Mandiri di Rumah (${tikrarRecord.jumlah_ulang}x) untuk ${student.nama}: Surah ${tikrarRecord.surah} (Halaman ${tikrarRecord.halaman})`,
                  {
                    style: {
                      backgroundColor: '#fff5f5',
                      border: '1px solid #e53e3e',
                      color: '#c53030',
                    },
                    duration: 6000,
                  }
                );
              }
            }
          }
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [santriList, loadData]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-805 dark:text-slate-105 flex flex-col md:flex-row">
      {/* 1. Desktop Collapsible Sidebar */}
      <aside
        className={`hidden md:flex flex-col shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-300 ${
          sidebarCollapsed ? 'w-16' : 'w-60'
        }`}
      >
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center space-x-2 overflow-hidden">
          <div className="h-9 w-9 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold shrink-0">
            🕌
          </div>
          {!sidebarCollapsed && (
            <div className="transition-opacity duration-300">
              <h1 className="font-bold text-sm leading-tight text-slate-900 dark:text-white">SI Tahfiz</h1>
              <p className="text-[10px] text-slate-505">Wali Santri Dashboard</p>
            </div>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {[
            { id: 'beranda', label: 'Beranda', icon: Home },
            { id: 'manzil', label: 'Validasi Manzil', icon: Award },
            {
              id: 'tikrar',
              label: 'Tikrar Rumah',
              icon: Flame,
              badge: tikrars.filter(
                (t) => t.santri_id === selectedSantriId && t.status === 'wajib_rumah'
              ).length,
            },
            { id: 'perkembangan', label: 'Perkembangan', icon: TrendingUp },
            { id: 'pesan', label: 'Pesan Ustadz', icon: MessageSquare },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeMenu === item.id;
            return (
              <button
                key={item.id}
                onClick={() =>
                  setActiveMenu(item.id as 'beranda' | 'manzil' | 'tikrar' | 'perkembangan' | 'pesan')
                }
                className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-teal-500/10 text-teal-650 dark:text-teal-400 font-bold border-l-4 border-teal-500'
                    : 'text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800/40 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!sidebarCollapsed && <span className="ml-3 text-sm">{item.label}</span>}
                {!sidebarCollapsed && item.badge && item.badge > 0 ? (
                  <span className="ml-auto bg-teal-605 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
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

      {/* 2. Mobile Bottom Navigation (PRIMARY FOR PARENTS ACCESSING VIA PHONES) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2 py-2 flex items-center justify-around shadow-lg">
        {[
          { id: 'beranda', label: 'Beranda', icon: Home },
          { id: 'manzil', label: 'Manzil', icon: Award },
          {
            id: 'tikrar',
            label: 'Tikrar',
            icon: Flame,
            badge: tikrars.filter(
              (t) => t.santri_id === selectedSantriId && t.status === 'wajib_rumah'
            ).length,
          },
          { id: 'perkembangan', label: 'Progres', icon: TrendingUp },
          { id: 'pesan', label: 'Chat', icon: MessageSquare },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeMenu === item.id;
          return (
            <button
              key={item.id}
              onClick={() =>
                setActiveMenu(item.id as 'beranda' | 'manzil' | 'tikrar' | 'perkembangan' | 'pesan')
              }
              className={`flex flex-col items-center p-1.5 rounded-lg transition-colors relative ${
                isActive ? 'text-teal-600 dark:text-teal-400 font-bold' : 'text-slate-500'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] mt-0.5">{item.label}</span>
              {item.badge && item.badge > 0 ? (
                <span className="absolute top-1 right-2 bg-red-500 text-white text-[8px] h-4 w-4 rounded-full flex items-center justify-center font-bold">
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      {/* 3. Main Viewport */}
      <div className="flex-grow flex flex-col min-w-0 pb-16 md:pb-0">
        <RoleHeader roleName="Orang Tua / Wali Santri" activeRole="orangtua" />
        <PengumumanPopup />

        <div className="flex-grow p-4 sm:p-6 overflow-y-auto max-w-5xl mx-auto w-full">
          {/* Child selector (always shown at the very top of ALL menus if parent has more than 1 child) */}
          {santriList.length > 1 && (
            <div className="mb-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
              <label className="block text-[10px] font-bold uppercase text-slate-400 dark:border-slate-505 mb-2">
                Pilih Santri (Anak):
              </label>
              <div className="flex flex-wrap gap-2">
                {santriList.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSantriId(s.id)}
                    type="button"
                    className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl border transition-all duration-200 ${
                      selectedSantriId === s.id
                        ? 'bg-teal-650 border-teal-650 text-white shadow-sm shadow-teal-500/10'
                        : 'bg-white dark:bg-slate-900 border-slate-205 dark:border-slate-800 text-slate-650 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    👶 {s.nama} ({s.kelas})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Global error banner */}
          {saveError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center space-x-2 text-red-700 dark:text-red-400 text-xs font-semibold">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          {/* Loading indicator */}
          {isLoading && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl text-blue-700 dark:text-blue-400 text-xs font-semibold text-center">
              Memuat data dari Supabase…
            </div>
          )}

          {/* Child Info Block (aktif di beranda) */}
          {activeSantri && activeMenu === 'beranda' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl mb-6 flex items-center justify-between shadow-sm">
              <div className="flex items-center space-x-3">
                <Smartphone className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                <span className="font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                  Wali Santri:{' '}
                  <span className="text-teal-650 dark:text-teal-450">
                    {activeSantri.parentName} (Orang Tua dari {activeSantri.nama})
                  </span>
                </span>
              </div>
              <span className="text-[10px] text-slate-450 font-medium hidden sm:inline">
                📱 Tampilan Mobile Utama
              </span>
            </div>
          )}

          {/* Panel rendering */}
          {activeSantri ? (
            <>
              {activeMenu === 'beranda' && (
                <BerandaPanel
                  activeSantri={activeSantri}
                  childSetorans={childSetorans}
                  tikrars={tikrars}
                  selectedSantriId={selectedSantriId}
                  namaLengkap={namaLengkap}
                />
              )}
              {activeMenu === 'manzil' && (
                <ValidasiManzilPanel
                  activeSantri={activeSantri}
                  todayManzil={todayManzil}
                  parentUserIdMap={parentUserIdMap}
                  isLoading={isLoading}
                  onDataChanged={loadData}
                />
              )}
              {activeMenu === 'tikrar' && (
                <TikrarPanel
                  activeSantri={activeSantri}
                  tikrars={tikrars}
                  isLoading={isLoading}
                  onDataChanged={loadData}
                />
              )}
              {activeMenu === 'perkembangan' && (
                <PerkembanganPanel
                  activeSantri={activeSantri}
                  childSetorans={childSetorans}
                />
              )}
              {activeMenu === 'pesan' && (
                <PesanPanel
                  activeSantri={activeSantri}
                  childPesans={childPesans}
                  parentUserIdMap={parentUserIdMap}
                  isLoading={isLoading}
                  onDataChanged={loadData}
                />
              )}
            </>
          ) : (
            <div className="text-center py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm">
              <User className="h-12 w-12 text-slate-350 mx-auto mb-2" />
              <p className="font-bold text-slate-705">Silakan hubungkan akun dengan data santri di TU.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
