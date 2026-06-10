'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';

import RoleHeader from '@/components/RoleHeader';
import PengumumanPopup from '@/components/PengumumanPopup';
import { supabase } from '@/lib/supabase';
import { Santri, Halaqah, Setoran, Pesan, TikrarTask } from '@/types/tahfiz';
import {
  AlertCircle,
  Home,
  ClipboardCheck,
  Menu,
  ChevronLeft,
  ChevronRight,
  Award,
  MessageSquare,
  TrendingUp,
  Flame,
} from 'lucide-react';

import BerandaPanel from './components/BerandaPanel';
import InputSetoranPanel from './components/InputSetoranPanel';
import TikrarPanel from './components/TikrarPanel';
import ManzilPanel from './components/ManzilPanel';
import AnalitikPanel from './components/AnalitikPanel';
import PesanPanel from './components/PesanPanel';

export default function PengampuDashboard() {
  const [mounted, setMounted] = useState(false);
  const [halaqahs, setHalaqahs] = useState<Halaqah[]>([]);
  const [selectedHalaqahId, setSelectedHalaqahId] = useState<string>('');
  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [selectedSantri, setSelectedSantri] = useState<Santri | null>(null);

  // Setorans & Messages
  const [setorans, setSetorans] = useState<Setoran[]>([]);
  const [pesans, setPesans] = useState<Pesan[]>([]);

  // Loading & error state
  const [isLoading, setIsLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ID pengampu yang login (dari tabel users)
  const [pengampuDbId, setPengampuDbId] = useState<string>('');
  const [namaLengkap, setNamaLengkap] = useState<string>('');

  // Pekan Muraja'ah active schedule
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [activePekan, setActivePekan] = useState<any | null>(null);

  // Tikrar status
  const [tikrars, setTikrars] = useState<TikrarTask[]>([]);

  // Active menu & layout state
  const [activeMenu, setActiveMenu] = useState<'beranda' | 'setoran' | 'tikrar' | 'manzil' | 'analitik' | 'pesan'>('beranda');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState<boolean>(false);

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

      const { data: dbUser, error: dbUserError } = await supabase
        .from('users')
        .select('id, nama_lengkap')
        .eq('email', email)
        .single();

      if (dbUserError || !dbUser) throw new Error('Detail pengguna tidak ditemukan di database.');

      setPengampuDbId(dbUser.id);
      setNamaLengkap(dbUser.nama_lengkap ?? '');

      // 1. Fetch halaqah
      const { data: halaqahData, error: halaqahError } = await supabase
        .from('halaqah')
        .select('id, nama, unit, users!pengampu_id(nama_lengkap)')
        .eq('pengampu_id', dbUser.id)
        .eq('is_active', true);

      if (halaqahError) throw new Error('Gagal memuat data halaqah: ' + halaqahError.message);

      if (halaqahData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mappedHalaqah: Halaqah[] = (halaqahData as any[]).map((h) => ({
          id: h.id,
          nama: h.nama,
          unit: h.unit as 'Putra' | 'Putri',
          pengampu: h.users?.nama_lengkap ?? 'Unknown',
        }));
        setHalaqahs(mappedHalaqah);
        if (mappedHalaqah.length > 0) {
          setSelectedHalaqahId(prev => prev || mappedHalaqah[0].id);
        }
      }

      // 2. Fetch santri
      const { data: santriData, error: santriError } = await supabase
        .from('santri')
        .select('*');

      if (santriError) throw new Error('Gagal memuat data santri: ' + santriError.message);

      if (santriData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mappedSantri: Santri[] = (santriData as any[]).map((s) => ({
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
        setSantriList(mappedSantri);
      }

      // 3. Fetch setoran — ambil 30 hari terakhir
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const fromDate = thirtyDaysAgo.toISOString().split('T')[0];

      const { data: setoranData, error: setoranError } = await supabase
        .from('setoran')
        .select('*')
        .gte('tanggal', fromDate)
        .order('tanggal', { ascending: false });

      if (setoranError) throw new Error('Gagal memuat data setoran: ' + setoranError.message);

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

      if (pesanError) throw new Error('Gagal memuat data pesan: ' + pesanError.message);

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
      const { data: tikrarData, error: tikrarError } = await supabase
        .from('tikrar')
        .select('*')
        .order('tanggal', { ascending: false });

      if (tikrarError) throw new Error('Gagal memuat data tikrar: ' + tikrarError.message);
      if (tikrarData) {
        setTikrars(tikrarData);
      }

      // Fetch active Pekan Muraja'ah schedule
      const { data: activeJadwalData, error: activeJadwalError } = await supabase
        .from('jadwal_ujian')
        .select('*')
        .eq('status', 'aktif');

      if (activeJadwalError) {
        console.warn('Gagal memuat jadwal_ujian:', activeJadwalError.message);
      } else if (activeJadwalData) {
        const todayStr = new Date().toISOString().split('T')[0];
        const active = activeJadwalData.find(j => j.tanggal_mulai <= todayStr);
        if (active) {
          let details = {
            materiKelas7: 'Juz 30',
            materiKelas8: 'Juz 29',
            materiKelas9: 'Juz 28',
            batasKesalahan: 2,
            deadlineAkses: active.tanggal_selesai + 'T23:59:59'
          };
          try {
            if (active.keterangan && active.keterangan.startsWith('{')) {
              details = { ...details, ...JSON.parse(active.keterangan) };
            }
          } catch {
            // keep defaults
          }
          setActivePekan({
            id: active.id,
            tanggalMulai: active.tanggal_mulai,
            tanggalSelesai: active.tanggal_selesai,
            status: active.status,
            ...details
          });
        } else {
          setActivePekan(null);
        }
      }

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan tidak diketahui.';
      console.error('[PengampuDashboard] loadData error:', err);
      setSaveError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, [loadData]);

  // Real-time listener for parent Manzil verification
  useEffect(() => {
    if (!selectedHalaqahId || santriList.length === 0) return;

    const activeStudentIds = santriList
      .filter(s => s.halaqahId === selectedHalaqahId)
      .map(s => s.id);

    const channel = supabase
      .channel('pengampu-manzil-notif')
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
            newSetoran.tipe === 'manzil' &&
            newSetoran.parent_verified &&
            activeStudentIds.includes(newSetoran.santri_id)
          ) {
            const student = santriList.find(s => s.id === newSetoran.santri_id);
            if (student) {
              toast.success(`Orang tua mengonfirmasi Manzil: ${student.nama} (Juz ${newSetoran.surah})`, {
                style: { backgroundColor: '#e6fffa', border: '1px solid #319795', color: '#234e52' }
              });
              loadData();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedHalaqahId, santriList, loadData]);

  // Real-time listener for parent Tikrar updates
  useEffect(() => {
    const channel = supabase
      .channel('pengampu-tikrar-notif')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tikrar',
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updatedTikrar = payload.new as TikrarTask;
            if (updatedTikrar.status === 'selesai_rumah') {
              const student = santriList.find(s => s.id === updatedTikrar.santri_id);
              if (student) {
                toast.success(`Orang tua menyelesaikan Tikrar Rumah untuk ${student.nama}: Surah ${updatedTikrar.surah}`, {
                  style: { backgroundColor: '#f0fff4', border: '1px solid #38a169', color: '#276749' }
                });
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

  // Real-time listener for Pekan Muraja'ah mass exam
  useEffect(() => {
    const channel = supabase
      .channel('pengampu-jadwal-ujian-notif')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jadwal_ujian',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newJadwal = payload.new;
            if (newJadwal.status === 'aktif') {
              toast.info("Pengumuman: Pekan Muraja'ah Massal Baru Saja Diaktifkan!", {
                style: { backgroundColor: '#fffaf0', border: '1px solid #dd6b20', color: '#7b341e' }
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            const newJadwal = payload.new;
            if (newJadwal.status === 'selesai') {
              toast.info("Pengumuman: Pekan Muraja'ah Massal Telah Dihentikan.", {
                style: { backgroundColor: '#fffaf0', border: '1px solid #dd6b20', color: '#7b341e' }
              });
            } else if (newJadwal.status === 'aktif') {
              toast.info("Pengumuman: Pekan Muraja'ah Massal Baru Saja Diaktifkan!", {
                style: { backgroundColor: '#fffaf0', border: '1px solid #dd6b20', color: '#7b341e' }
              });
            }
          }
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  // Mark messages as read when menu is 'pesan' and selectedSantri is set
  useEffect(() => {
    if (activeMenu === 'pesan' && selectedSantri) {
      const markMessagesAsRead = async () => {
        const { error } = await supabase
          .from('pesan')
          .update({ sudah_dibaca: true })
          .eq('santri_id', selectedSantri.id)
          .eq('tipe_pengirim', 'orangtua')
          .eq('sudah_dibaca', false);

        if (error) {
          console.warn('Gagal menandai pesan terbaca:', error.message);
        } else {
          setPesans(prev => prev.map(p =>
            (p.santriId === selectedSantri.id && p.sender === 'orangtua')
              ? { ...p, sudahDibaca: true }
              : p
          ));
        }
      };
      markMessagesAsRead();
    }
  }, [activeMenu, selectedSantri]);

  // Switch student (kept here as it's called by multiple panels)
  const handleSelectSantri = (student: Santri) => {
    setSelectedSantri(student);
  };

  const activeHalaqah = halaqahs.find(h => h.id === selectedHalaqahId);
  const activeStudents = santriList.filter(s => s.halaqahId === selectedHalaqahId);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-805 dark:text-slate-100 flex flex-col md:flex-row">
      {/* 1. Desktop Collapsible Sidebar */}
      <aside className={`hidden md:flex flex-col shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-60'}`}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center space-x-2 overflow-hidden">
          <div className="h-9 w-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
            🕌
          </div>
          {!sidebarCollapsed && (
            <div className="transition-opacity duration-300">
              <h1 className="font-bold text-sm leading-tight text-slate-900 dark:text-white">SI Tahfiz</h1>
              <p className="text-[10px] text-slate-500">Murobbi Dashboard</p>
            </div>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {[
            { id: 'beranda', label: 'Beranda', icon: Home },
            { id: 'setoran', label: 'Input Setoran', icon: ClipboardCheck },
            { id: 'tikrar', label: 'Program Tikrar', icon: Flame, badge: tikrars.filter(t => !t.selesai && activeStudents.map(s => s.id).includes(t.santri_id)).length },
            { id: 'manzil', label: 'Manzil Santri', icon: Award },
            { id: 'analitik', label: 'Analitik', icon: TrendingUp },
            { id: 'pesan', label: 'Pesan Wali', icon: MessageSquare, badge: pesans.filter(p => p.sender === 'orangtua' && activeStudents.map(s => s.id).includes(p.santriId) && !p.sudahDibaca).length },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeMenu === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveMenu(item.id as 'beranda' | 'setoran' | 'tikrar' | 'manzil' | 'analitik' | 'pesan')}
                className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-605 dark:text-emerald-400 font-bold border-l-4 border-emerald-500'
                    : 'text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800/40 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!sidebarCollapsed && <span className="ml-3 text-sm">{item.label}</span>}
                {!sidebarCollapsed && item.badge && item.badge > 0 ? (
                  <span className="ml-auto bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
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
          { id: 'beranda', label: 'Beranda', icon: Home },
          { id: 'setoran', label: 'Setoran', icon: ClipboardCheck },
          { id: 'tikrar', label: 'Tikrar', icon: Flame },
          { id: 'manzil', label: 'Manzil', icon: Award },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeMenu === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveMenu(item.id as 'beranda' | 'setoran' | 'tikrar' | 'manzil' | 'analitik' | 'pesan')}
              className={`flex flex-col items-center p-1.5 rounded-lg transition-colors ${
                isActive ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-500'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] mt-0.5">{item.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => setIsMobileMoreOpen(true)}
          className={`flex flex-col items-center p-1.5 rounded-lg transition-colors ${
            activeMenu === 'analitik' || activeMenu === 'pesan' ? 'text-emerald-605 dark:text-emerald-400 font-bold' : 'text-slate-500'
          }`}
        >
          <Menu className="h-5 w-5" />
          <span className="text-[10px] mt-0.5">Lainnya</span>
        </button>
      </nav>

      {/* 3. Mobile More Drawer Sheet */}
      {isMobileMoreOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-2xl p-4 shadow-xl border-t border-slate-200 dark:border-slate-800 flex flex-col space-y-3 pb-8">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Menu Lainnya</h3>
              <button
                onClick={() => setIsMobileMoreOpen(false)}
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 text-xs font-bold"
              >
                Tutup
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'analitik', label: 'Analitik', icon: TrendingUp },
                { id: 'pesan', label: 'Pesan Wali', icon: MessageSquare },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = activeMenu === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveMenu(item.id as 'beranda' | 'setoran' | 'tikrar' | 'manzil' | 'analitik' | 'pesan');
                      setIsMobileMoreOpen(false);
                    }}
                    className={`flex items-center p-3 rounded-xl border ${
                      isActive
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-650 dark:bg-emerald-950/20 dark:text-emerald-400 font-bold'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <Icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="ml-2.5 text-xs text-slate-700 dark:text-slate-300">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 4. Main viewport */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        <RoleHeader roleName="Pengampu / Murobbi" activeRole="pengampu" />
        <PengumumanPopup />
        <div className="flex-grow p-4 md:p-8 overflow-y-auto">
          {activePekan && (
            <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 text-amber-805 dark:text-amber-400 rounded-2xl flex items-center justify-between shadow-sm animate-in fade-in duration-300">
              <div className="flex items-center space-x-3">
                <span className="text-2xl animate-pulse">📢</span>
                <div>
                  <h4 className="font-extrabold text-sm text-amber-900 dark:text-amber-300">Pekan Muraja&apos;ah Sedang Berlangsung!</h4>
                  <p className="text-xs text-amber-700 dark:text-amber-400/90 font-medium">
                    Ujian Massal Ustadz aktif mulai {activePekan.tanggalMulai} s.d {activePekan.tanggalSelesai}.
                  </p>
                </div>
              </div>
              <div className="text-[10px] bg-amber-500/20 px-2 py-1 rounded-lg font-bold uppercase tracking-wider">
                Mode Ujian Aktif
              </div>
            </div>
          )}

          {/* Global error banner */}
          {saveError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-955/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center space-x-2 text-red-700 dark:text-red-400 text-xs font-semibold">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          {/* Loading indicator */}
          {isLoading && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-955/20 border border-blue-200 dark:border-blue-800 rounded-xl text-blue-700 dark:text-blue-400 text-xs font-semibold text-center">
              Memuat data dari Supabase…
            </div>
          )}

          {/* Panel rendering */}
          {activeMenu === 'beranda' && (
            <BerandaPanel
              activeStudents={activeStudents}
              tikrars={tikrars}
              setorans={setorans}
              activePekan={activePekan}
              namaLengkap={namaLengkap}
              activeHalaqahNama={activeHalaqah?.nama || ''}
              activeHalaqahUnit={activeHalaqah?.unit || ''}
            />
          )}
          {activeMenu === 'setoran' && (
            <InputSetoranPanel
              activeStudents={activeStudents}
              setorans={setorans}
              tikrars={tikrars}
              selectedSantri={selectedSantri}
              activePekan={activePekan}
              pengampuDbId={pengampuDbId}
              isLoading={isLoading}
              onSelectSantri={handleSelectSantri}
              onDataChanged={loadData}
            />
          )}
          {activeMenu === 'tikrar' && (
            <TikrarPanel
              tikrars={tikrars}
              activeStudents={activeStudents}
              isLoading={isLoading}
              onDataChanged={loadData}
            />
          )}
          {activeMenu === 'manzil' && (
            <ManzilPanel
              activeStudents={activeStudents}
              setorans={setorans}
            />
          )}
          {activeMenu === 'analitik' && (
            <AnalitikPanel
              activeStudents={activeStudents}
              setorans={setorans}
              selectedSantri={selectedSantri}
              activeHalaqahNama={activeHalaqah?.nama || ''}
              onSelectSantri={handleSelectSantri}
            />
          )}
          {activeMenu === 'pesan' && (
            <PesanPanel
              pesans={pesans}
              activeStudents={activeStudents}
              selectedSantri={selectedSantri}
              pengampuDbId={pengampuDbId}
              isLoading={isLoading}
              onSelectSantri={handleSelectSantri}
              onDataChanged={loadData}
            />
          )}
        </div>
      </div>
    </div>
  );
}
