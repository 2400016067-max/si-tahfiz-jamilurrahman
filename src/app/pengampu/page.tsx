'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { applyPlugin } from 'jspdf-autotable';

applyPlugin(jsPDF);

import RoleHeader from '@/components/RoleHeader';
import PengumumanPopup from '@/components/PengumumanPopup';
import { supabase } from '@/lib/supabase';
import { Santri, Halaqah, Setoran, Pesan } from '@/lib/mockData';
import { 
  Users, 
  AlertCircle, 
  Send, 
  FileSpreadsheet, 
  FileText, 
  TrendingUp, 
  BookOpen, 
  User, 
  Flame,
  Home,
  ClipboardCheck,
  Menu,
  ChevronLeft,
  ChevronRight,
  Award,
  MessageSquare
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, LineChart, Line, Legend } from 'recharts';

// ---------------------------------------------------------------------------
// Placeholder pengampu ID dari seed data (sebelum auth diimplementasikan).
// Ini mewakili Ustadz Ahmad Fauzi (halaqah Putra).
// ---------------------------------------------------------------------------
// Fallback ID digunakan hanya jika sesi belum termuat.
const PENGAMPU_FALLBACK_ID = '10000000-0000-0000-0000-000000000001';

interface TikrarTask {
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

  // ID pengampu yang login (dari tabel users), digunakan sebagai dicatat_oleh saat menyimpan setoran
  const [pengampuDbId, setPengampuDbId] = useState<string>(PENGAMPU_FALLBACK_ID);
  const [namaLengkap, setNamaLengkap] = useState<string>('');
  
  // Form Inputs
  const [sabkiDone, setSabkiDone] = useState<boolean>(false);
  const [sabkiSurah, setSabkiSurah] = useState<string>('');
  const [sabkiHalaman, setSabkiHalaman] = useState<number>(1);
  const [sabkiKesalahan, setSabkiKesalahan] = useState<number>(0);
  
  const [sabakSurah, setSabakSurah] = useState<string>('An-Naba');
  const [sabakHalMulai, setSabakHalMulai] = useState<number>(582);
  const [sabakHalSelesai, setSabakHalSelesai] = useState<number>(582);
  const [sabakBaris, setSabakBaris] = useState<number>(10);
  const [sabakKesalahan, setSabakKesalahan] = useState<number>(0);
  const [sabakNotes, setSabakNotes] = useState<string>('');

  // Pekan Murajaah Settings
  const [isPekanMurajaah, setIsPekanMurajaah] = useState<boolean>(false);
  const [targetDivider, setTargetDivider] = useState<number>(15);
  const [mistakeThreshold, setMistakeThreshold] = useState<number>(1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [activePekan, setActivePekan] = useState<any | null>(null);
  const [murajaahSurah, setMurajaahSurah] = useState<string>('Juz 30');
  const [murajaahHalaman, setMurajaahHalaman] = useState<number>(582);
  const [murajaahBaris, setMurajaahBaris] = useState<number>(15);
  const [murajaahKesalahan, setMurajaahKesalahan] = useState<number>(0);
  const [murajaahNotes, setMurajaahNotes] = useState<string>('');
  const [isMurajaahEditMode, setIsMurajaahEditMode] = useState<boolean>(false);
  const [existingMurajaahId, setExistingMurajaahId] = useState<string | null>(null);

  // Chats
  const [chatInput, setChatInput] = useState<string>('');

  // Tikrar status
  const [tikrars, setTikrars] = useState<TikrarTask[]>([]);

  // Active menu & layout state
  const [activeMenu, setActiveMenu] = useState<'beranda' | 'setoran' | 'tikrar' | 'manzil' | 'analitik' | 'pesan'>('beranda');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState<boolean>(false);

  // Active form tab
  const [activeTab, setActiveTab] = useState<'setoran' | 'pekan' | 'analitik' | 'pesan'>('setoran');

  // Anti-duplikasi states
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [existingSetoranId, setExistingSetoranId] = useState<string | null>(null);
  const [isSabkiEditMode, setIsSabkiEditMode] = useState<boolean>(false);
  const [existingSabkiSetoranId, setExistingSabkiSetoranId] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // DATA LOADING — Supabase queries
  // Semua field DB (snake_case) di-map ke interface mockData (camelCase)
  // agar seluruh UI tidak perlu diubah.
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

      // Simpan ID nyata pengampu untuk digunakan saat insert setoran
      setPengampuDbId(dbUser.id);
      setNamaLengkap(dbUser.nama_lengkap ?? '');

      // 1. Fetch halaqah + nama pengampu (join ke tabel users) hanya untuk pengampu yang login
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
        // Functional update: hanya set jika belum ada nilai sebelumnya
        // Ini menghindari closure dependency pada selectedHalaqahId
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
          totalHafalanJuz: [],  // diisi terpisah via tabel hafalan_juz jika diperlukan
        }));
        setSantriList(mappedSantri);
      }

      // 3. Fetch setoran — ambil 30 hari terakhir untuk performa
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
  // Dependency array kosong []: loadData hanya dibuat sekali saat mount.
  // Kondisi init selectedHalaqahId menggunakan functional setter (prev => ...)
  // sehingga tidak perlu membaca selectedHalaqahId dari closure.
  }, []);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, [loadData]);

  // Auto-detect today's Sabak & Sabki setoran for the selected student
  useEffect(() => {
    if (!selectedSantri) {
      setIsEditMode(false);
      setExistingSetoranId(null);
      setIsSabkiEditMode(false);
      setExistingSabkiSetoranId(null);
      setIsMurajaahEditMode(false);
      setExistingMurajaahId(null);
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Pekan Muraja'ah Check
    const todayMurajaah = setorans.find(
      s => s.santriId === selectedSantri.id && s.type === 'sabak' && s.date === todayStr && s.notes?.startsWith('[Pekan Muraja\'ah]')
    );

    if (todayMurajaah) {
      setIsMurajaahEditMode(true);
      setExistingMurajaahId(todayMurajaah.id);
      setMurajaahSurah(todayMurajaah.surah);
      setMurajaahHalaman(todayMurajaah.halamanMulai);
      setMurajaahBaris(todayMurajaah.baris);
      setMurajaahKesalahan(todayMurajaah.kesalahan);
      const cleanNotes = todayMurajaah.notes?.replace(/^\[Pekan Muraja'ah\]\s*/, '') || '';
      setMurajaahNotes(cleanNotes);
    } else {
      setIsMurajaahEditMode(false);
      setExistingMurajaahId(null);
      // Pre-fill default values
      setMurajaahSurah('Juz 30');
      setMurajaahHalaman(582);
      setMurajaahBaris(15);
      setMurajaahKesalahan(0);
      setMurajaahNotes('');
    }

    // Sabak Check
    const todaySabak = setorans.find(
      s => s.santriId === selectedSantri.id && s.type === 'sabak' && s.date === todayStr
    );

    if (todaySabak) {
      setIsEditMode(true);
      setExistingSetoranId(todaySabak.id);
      setSabakSurah(todaySabak.surah);
      setSabakHalMulai(todaySabak.halamanMulai);
      setSabakHalSelesai(todaySabak.halamanSelesai);
      setSabakBaris(todaySabak.baris);
      setSabakKesalahan(todaySabak.kesalahan);
      setSabakNotes(todaySabak.notes || '');
    } else {
      setIsEditMode(false);
      setExistingSetoranId(null);
      // Pre-fill target baris based on student grade
      let defaultBaris = 10;
      if (selectedSantri.grade === 'Tahsin') defaultBaris = 3;
      if (selectedSantri.grade === 'Takmil') defaultBaris = 7;
      if (selectedSantri.grade === 'Tahfiz') defaultBaris = 12;
      setSabakBaris(defaultBaris);
      setSabakSurah(selectedSantri.grade === 'Tahsin' ? "Iqra' / Juz 30" : 'Juz 30');
      setSabakHalMulai(selectedSantri.grade === 'Tahsin' ? 1 : 582);
      setSabakHalSelesai(selectedSantri.grade === 'Tahsin' ? 1 : 582);
      setSabakKesalahan(0);
      setSabakNotes('');
    }

    // Sabki Check
    const todaySabki = setorans.find(
      s => s.santriId === selectedSantri.id && s.type === 'sabki' && s.date === todayStr
    );

    if (todaySabki) {
      setExistingSabkiSetoranId(todaySabki.id);
      setSabkiSurah(todaySabki.surah);
      setSabkiHalaman(todaySabki.halamanMulai);
      setSabkiKesalahan(todaySabki.kesalahan);
      setSabkiDone(todaySabki.status === 'lulus');
      setIsSabkiEditMode(false);
    } else {
      setExistingSabkiSetoranId(null);
      setIsSabkiEditMode(false);
      setSabkiDone(false);
      setSabkiSurah('');
      setSabkiHalaman(1);
      setSabkiKesalahan(0);
    }
  }, [selectedSantri, setorans]);

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
          event: '*', // Listen to all database operations (INSERT, UPDATE)
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

  // Real-time listener for Pekan Muraja'ah mass exam (jadwal_ujian status changes)
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
              toast.info('Pengumuman: Pekan Muraja\'ah Massal Baru Saja Diaktifkan!', {
                style: { backgroundColor: '#fffaf0', border: '1px solid #dd6b20', color: '#7b341e' }
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            const newJadwal = payload.new;
            if (newJadwal.status === 'selesai') {
              toast.info('Pengumuman: Pekan Muraja\'ah Massal Telah Dihentikan.', {
                style: { backgroundColor: '#fffaf0', border: '1px solid #dd6b20', color: '#7b341e' }
              });
            } else if (newJadwal.status === 'aktif') {
              toast.info('Pengumuman: Pekan Muraja\'ah Massal Baru Saja Diaktifkan!', {
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
          // Update local state to reflect that these messages are now read
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

  // Switch student
  const handleSelectSantri = (student: Santri) => {
    setSelectedSantri(student);
    setSabkiDone(false);
    setSabkiSurah('');
    setSabkiKesalahan(0);
    setSabkiHalaman(1);
    
    // Pre-fill target baris based on student grade
    let defaultBaris = 10;
    if (student.grade === 'Tahsin') defaultBaris = 3;
    if (student.grade === 'Takmil') defaultBaris = 7;
    if (student.grade === 'Tahfiz') defaultBaris = 12;
    setSabakBaris(defaultBaris);

    setSabakSurah(student.grade === 'Tahsin' ? "Iqra' / Juz 30" : 'Juz 30');
    setSabakKesalahan(0);
    setSabakNotes('');
  };

  const activeHalaqah = halaqahs.find(h => h.id === selectedHalaqahId);
  const activeStudents = santriList.filter(s => s.halaqahId === selectedHalaqahId);

  // Calculate stats for current halaqah
  const getStudentTodayStatus = (studentId: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todaySetorans = setorans.filter(s => s.santriId === studentId && s.date === todayStr);
    
    const hasSabak = todaySetorans.some(s => s.type === 'sabak');
    const hasSabki = todaySetorans.some(s => s.type === 'sabki');
    const failedSabak = todaySetorans.some(s => s.type === 'sabak' && s.status === 'mengulang');

    if (hasSabak && !failedSabak) return { label: 'Tuntas Sabak & Sabki', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' };
    if (hasSabak && failedSabak) return { label: 'Mengulang Sabak', color: 'text-red-600 dark:text-red-400 bg-red-500/10' };
    if (hasSabki) return { label: 'Sabki Tuntas', color: 'text-blue-600 dark:text-blue-400 bg-blue-500/10' };
    return { label: 'Belum Setor', color: 'text-slate-500 dark:text-slate-400 bg-slate-500/10' };
  };

  const getStudentCurrentTikrarStatus = (studentId: string) => {
    const studentTikrars = tikrars.filter(t => t.santri_id === studentId);
    if (studentTikrars.length === 0) return null;
    const latest = studentTikrars[0];
    return latest.status || (latest.selesai ? (latest.lokasi === 'sekolah' ? 'selesai_sekolah' : 'selesai_rumah') : (latest.lokasi === 'sekolah' ? 'wajib_sekolah' : 'wajib_rumah'));
  };

  // Check if yesterday's Manzil was verified by parent
  const checkManzilStatus = (studentId: string) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const yesterdayManzil = setorans.find(
      s => s.santriId === studentId && s.type === 'manzil' && s.date === yesterdayStr
    );

    if (yesterdayManzil) {
      return {
        verified: yesterdayManzil.parentVerified,
        surah: yesterdayManzil.surah,
        halaman: `${yesterdayManzil.halamanMulai}-${yesterdayManzil.halamanSelesai}`,
        parentSignature: yesterdayManzil.parentSignature
      };
    }
    return null;
  };

  // ---------------------------------------------------------------------------
  // SUBMIT SABKI — INSERT ke tabel setoran di Supabase
  // ---------------------------------------------------------------------------
  const handleSaveSabki = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSantri) return;

    setSaveError(null);
    const autoStatus = sabkiKesalahan <= mistakeThreshold ? 'lulus' : 'mengulang';

    if (existingSabkiSetoranId) {
      // Perform UPDATE
      const { error } = await supabase
        .from('setoran')
        .update({
          surah:            sabkiSurah || 'Murojaah Sabki',
          halaman_mulai:    sabkiHalaman,
          halaman_selesai:  sabkiHalaman,
          jumlah_kesalahan: sabkiKesalahan,
          status:           autoStatus,
        })
        .eq('id', existingSabkiSetoranId);

      if (error) {
        setSaveError('Gagal mengupdate Sabki: ' + error.message);
        toast.error('Gagal mengupdate Sabki: ' + error.message);
        return;
      }

      toast.success('Setoran Sabki berhasil diperbarui.');
      setIsSabkiEditMode(false);
    } else {
      // Perform INSERT
      const { error } = await supabase.from('setoran').insert({
        santri_id:        selectedSantri.id,
        tanggal:          new Date().toISOString().split('T')[0],
        tipe:             'sabki',
        surah:            sabkiSurah || 'Murojaah Sabki',
        halaman_mulai:    sabkiHalaman,
        halaman_selesai:  sabkiHalaman,
        jumlah_baris:     15, // Default sabki
        jumlah_kesalahan: sabkiKesalahan,
        status:           autoStatus,
        parent_verified:  false,
        dicatat_oleh:     pengampuDbId,
      });

      if (error) {
        setSaveError('Gagal menyimpan Sabki: ' + error.message);
        toast.error('Gagal menyimpan Sabki: ' + error.message);
        return;
      }
    }

    if (autoStatus === 'lulus') {
      setSabkiDone(true);
      if (!existingSabkiSetoranId) {
        toast.success('Setoran Sabki TUNTAS! Silakan lanjut input setoran Sabak.');
      }
    } else {
      setSabkiDone(false);
      toast.error('Sabki memiliki kesalahan melebihi batas. Santri harus mengulang Sabki.');
      
      // Auto-trigger Tikrar if mistakes > 1 per page (since Sabki is 1 page, mistakes > 1)
      if (sabkiKesalahan > 1) {
        const todayStr = new Date().toISOString().split('T')[0];
        const { data: existingTikrars, error: checkError } = await supabase
          .from('tikrar')
          .select('id')
          .eq('santri_id', selectedSantri.id)
          .eq('tanggal', todayStr)
          .eq('surah', sabkiSurah || 'Murojaah Sabki');

        if (!checkError && (!existingTikrars || existingTikrars.length === 0)) {
          const { error: tikrarError } = await supabase.from('tikrar').insert({
            santri_id: selectedSantri.id,
            tanggal: todayStr,
            surah: sabkiSurah || 'Murojaah Sabki',
            halaman: sabkiHalaman,
            jumlah_ulang: 10,
            status: 'wajib_sekolah',
            lokasi: 'sekolah',
            selesai: false,
            parent_verified: false,
            dicatat_oleh: pengampuDbId
          });
          if (tikrarError) {
            console.error('Failed to trigger Tikrar:', tikrarError);
          } else {
            toast.error('Santri gagal setoran (kesalahan > 1). Tikrar Sekolah otomatis diaktifkan.');
          }
        } else {
          toast.error('Tikrar untuk surah Sabki ini hari ini sudah terdaftar.');
        }
      }
    }
    await loadData();
  };

  // ---------------------------------------------------------------------------
  // SUBMIT SABAK — INSERT ke tabel setoran di Supabase
  // ---------------------------------------------------------------------------
  const handleSaveSabak = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSantri) return;

    setSaveError(null);
    const autoStatus = sabakKesalahan <= mistakeThreshold ? 'lulus' : 'mengulang';

    if (isEditMode && existingSetoranId) {
      // Perform UPDATE
      const { error } = await supabase
        .from('setoran')
        .update({
          surah:            sabakSurah,
          halaman_mulai:    sabakHalMulai,
          halaman_selesai:  sabakHalSelesai,
          jumlah_baris:     sabakBaris,
          jumlah_kesalahan: sabakKesalahan,
          status:           autoStatus,
          catatan:          sabakNotes || null,
        })
        .eq('id', existingSetoranId);

      if (error) {
        setSaveError('Gagal mengupdate Sabak: ' + error.message);
        toast.error('Gagal mengupdate Sabak: ' + error.message);
        return;
      }

      toast.success('Setoran Sabak berhasil diperbarui.');
    } else {
      // Perform INSERT
      const { error } = await supabase.from('setoran').insert({
        santri_id:        selectedSantri.id,
        tanggal:          new Date().toISOString().split('T')[0],
        tipe:             'sabak',
        surah:            sabakSurah,
        halaman_mulai:    sabakHalMulai,
        halaman_selesai:  sabakHalSelesai,
        jumlah_baris:     sabakBaris,
        jumlah_kesalahan: sabakKesalahan,
        status:           autoStatus,
        parent_verified:  false,
        catatan:          sabakNotes || null,
        dicatat_oleh:     pengampuDbId,
      });

      if (error) {
        setSaveError('Gagal menyimpan Sabak: ' + error.message);
        toast.error('Gagal menyimpan Sabak: ' + error.message);
        return;
      }
    }

    const pages = Math.max(1, sabakHalSelesai - sabakHalMulai + 1);
    const isFailed = sabakKesalahan > pages; // kesalahan lebih dari 1 per halaman

    if (isFailed) {
      // Check if a Tikrar already exists for today/surah/student to avoid duplicate inserts on Edit
      const todayStr = new Date().toISOString().split('T')[0];
      const { data: existingTikrars, error: checkError } = await supabase
        .from('tikrar')
        .select('id')
        .eq('santri_id', selectedSantri.id)
        .eq('tanggal', todayStr)
        .eq('surah', sabakSurah);

      if (!checkError && (!existingTikrars || existingTikrars.length === 0)) {
        toast.error(`Setoran Sabak ditandai MENGULANG dengan kesalahan > 1 per halaman (${sabakKesalahan} kesalahan di ${pages} halaman). Tikrar sekolah otomatis diaktifkan.`);
        
        const { error: tikrarError } = await supabase.from('tikrar').insert({
          santri_id: selectedSantri.id,
          tanggal: todayStr,
          surah: sabakSurah,
          halaman: sabakHalMulai,
          jumlah_ulang: 10,
          status: 'wajib_sekolah',
          lokasi: 'sekolah',
          selesai: false,
          parent_verified: false,
          dicatat_oleh: pengampuDbId
        });
        if (tikrarError) {
          console.error('Failed to trigger Tikrar:', tikrarError);
        }
      } else {
        toast.error(`Setoran Sabak ditandai MENGULANG. Tikrar untuk surah ini hari ini sudah terdaftar.`);
      }
    } else {
      if (autoStatus === 'mengulang') {
        toast.error(`Setoran Sabak ditandai MENGULANG karena memiliki ${sabakKesalahan} kesalahan (maksimal ${mistakeThreshold}).`);
      } else {
        if (!isEditMode) {
          toast.success('Setoran Sabak berhasil direkam dengan status LULUS.');
        }
      }
    }

    await loadData();
    // Refresh selected student dari state terbaru
    const updated = santriList.find(s => s.id === selectedSantri.id);
    if (updated) setSelectedSantri(updated);
  };

  // ---------------------------------------------------------------------------
  // SUBMIT MURAJAAH — INSERT/UPDATE setoran dengan [Pekan Muraja'ah] catatan
  // ---------------------------------------------------------------------------
  const handleSaveMurajaah = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSantri) return;

    setSaveError(null);
    setIsLoading(true);

    const autoStatus = murajaahKesalahan <= 2 ? 'lulus' : 'mengulang';
    const notesPrefix = `[Pekan Muraja'ah] ${murajaahNotes}`.trim();

    if (isMurajaahEditMode && existingMurajaahId) {
      // Perform UPDATE
      const { error } = await supabase
        .from('setoran')
        .update({
          surah:            murajaahSurah,
          halaman_mulai:    murajaahHalaman,
          halaman_selesai:  murajaahHalaman,
          jumlah_baris:     murajaahBaris,
          jumlah_kesalahan: murajaahKesalahan,
          status:           autoStatus,
          catatan:          notesPrefix,
        })
        .eq('id', existingMurajaahId);

      if (error) {
        setSaveError('Gagal mengupdate setoran Muraja\'ah: ' + error.message);
        toast.error('Gagal mengupdate setoran Muraja\'ah: ' + error.message);
        setIsLoading(false);
        return;
      }

      toast.success('Setoran Muraja\'ah berhasil diperbarui.');
    } else {
      // Perform INSERT
      const { error } = await supabase.from('setoran').insert({
        santri_id:        selectedSantri.id,
        tanggal:          new Date().toISOString().split('T')[0],
        tipe:             'sabak', // Saved as 'sabak' per constraint rules
        surah:            murajaahSurah,
        halaman_mulai:    murajaahHalaman,
        halaman_selesai:  murajaahHalaman,
        jumlah_baris:     murajaahBaris,
        jumlah_kesalahan: murajaahKesalahan,
        status:           autoStatus,
        parent_verified:  false,
        catatan:          notesPrefix,
        dicatat_oleh:     pengampuDbId,
      });

      if (error) {
        setSaveError('Gagal menyimpan setoran Muraja\'ah: ' + error.message);
        toast.error('Gagal menyimpan setoran Muraja\'ah: ' + error.message);
        setIsLoading(false);
        return;
      }

      toast.success('Setoran Muraja\'ah berhasil disimpan.');
    }

    setIsLoading(false);
    await loadData();
    const updated = santriList.find(s => s.id === selectedSantri.id);
    if (updated) setSelectedSantri(updated);
  };

  const renderMurajaahForm = () => {
    if (!selectedSantri) return null;

    // Determine target material based on student's class (e.g. Kelas 7, 8, 9)
    let material = 'Tidak ada materi khusus';
    if (activePekan) {
      if (selectedSantri.kelas?.includes('7')) material = activePekan.materiKelas7;
      else if (selectedSantri.kelas?.includes('8')) material = activePekan.materiKelas8;
      else if (selectedSantri.kelas?.includes('9')) material = activePekan.materiKelas9;
    }

    return (
      <div className="space-y-6">
        {/* Info Box */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-xs font-semibold text-amber-805 dark:text-amber-400">
          <h5 className="font-bold text-sm mb-1">📋 Parameter Ujian Pekan Muraja&apos;ah</h5>
          <ul className="list-disc pl-4 space-y-1 mt-2">
            <li>Materi Ujian Kelas Santri ({selectedSantri.kelas}): <span className="font-extrabold">{material}</span></li>
            <li>Batas Maksimal Kesalahan Per Halaman: <span className="font-extrabold">{activePekan?.batasKesalahan ?? 2}</span></li>
            <li>Deadline Ujian: <span className="font-extrabold">{activePekan?.deadlineAkses ? new Date(activePekan.deadlineAkses).toLocaleString('id-ID') : '-'}</span></li>
          </ul>
        </div>

        <div className="border border-amber-150 dark:border-amber-900/40 p-5 rounded-2xl bg-white dark:bg-slate-900 relative shadow-sm">
          <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span>Setoran Ujian Muraja&apos;ah Massal</span>
              {isMurajaahEditMode && (
                <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded text-[9px] font-bold">
                  Sudah Input Hari Ini (Mode Edit) ✅
                </span>
              )}
            </span>
            <span className="text-[9px] text-amber-505 bg-amber-100 dark:bg-amber-950/40 px-2.5 py-0.5 rounded font-bold uppercase">Ujian</span>
          </h4>

          <form onSubmit={handleSaveMurajaah} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400">Surah Ujian</label>
              <input 
                type="text" 
                value={murajaahSurah}
                onChange={e => setMurajaahSurah(e.target.value)}
                required
                placeholder="e.g. Juz 30 / An-Naba"
                className="w-full text-xs p-3 border border-slate-205 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:border-amber-500" 
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400">Halaman</label>
                <input 
                  type="number" 
                  value={murajaahHalaman}
                  onChange={e => setMurajaahHalaman(Number(e.target.value))}
                  required
                  className="w-full text-xs p-3 border border-slate-205 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:border-amber-500" 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400">Jumlah Baris</label>
                <input 
                  type="number" 
                  value={murajaahBaris}
                  onChange={e => setMurajaahBaris(Number(e.target.value))}
                  required
                  className="w-full text-xs p-3 border border-slate-205 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:border-amber-500" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400">Jumlah Kesalahan</label>
                <input 
                  type="number" 
                  value={murajaahKesalahan}
                  onChange={e => setMurajaahKesalahan(Number(e.target.value))}
                  required
                  className="w-full text-xs p-3 border border-slate-205 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:border-amber-500" 
                />
              </div>
              <div className="flex flex-col justify-end">
                <span className={`text-xs font-bold p-3 text-center rounded-lg border ${murajaahKesalahan <= 2 ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-405 dark:border-red-800/40'}`}>
                  {murajaahKesalahan <= 2 ? '✓ Lulus' : '⚠ Mengulang'}
                </span>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400">Catatan Harian</label>
              <input 
                type="text" 
                placeholder="Catat keterangan tambahan..." 
                value={murajaahNotes} 
                onChange={e => setMurajaahNotes(e.target.value)} 
                className="w-full text-xs p-3 border border-slate-205 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:border-amber-500" 
              />
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 rounded-lg text-xs font-bold transition-all disabled:opacity-60 text-white shadow ${isMurajaahEditMode ? 'bg-amber-600 hover:bg-amber-700' : 'bg-amber-500 hover:bg-amber-600'}`}
            >
              {isMurajaahEditMode ? 'Simpan Edit Setoran Muraja\'ah' : 'Simpan Setoran Ujian Muraja\'ah'}
            </button>
          </form>
        </div>
      </div>
    );
  };

  const handleUpdateTikrarStatus = async (tikrarId: string, newStatus: string) => {
    setSaveError(null);
    let lokasi = 'sekolah';
    let selesai = false;
    if (newStatus === 'selesai_sekolah' || newStatus === 'selesai_rumah') {
      selesai = true;
    }
    if (newStatus === 'wajib_rumah' || newStatus === 'selesai_rumah') {
      lokasi = 'rumah';
    }

    const { error } = await supabase
      .from('tikrar')
      .update({
        status: newStatus,
        lokasi: lokasi,
        selesai: selesai
      })
      .eq('id', tikrarId);

    if (error) {
      setSaveError('Gagal mengupdate status Tikrar: ' + error.message);
      toast.error('Gagal mengupdate status Tikrar: ' + error.message);
      return;
    }

    toast.success(`Status Tikrar berhasil diupdate menjadi ${newStatus}.`);
    await loadData();
  };

  // ---------------------------------------------------------------------------
  // SUBMIT PESAN — INSERT ke tabel pesan di Supabase
  // ---------------------------------------------------------------------------
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSantri || !chatInput.trim()) return;

    setSaveError(null);

    const { error } = await supabase.from('pesan').insert({
      santri_id:     selectedSantri.id,
      pengirim_id:   pengampuDbId,
      tipe_pengirim: 'pengampu',
      konten:        chatInput.trim(),
    });

    if (error) {
      setSaveError('Gagal mengirim pesan: ' + error.message);
      return;
    }

    setChatInput('');
    await loadData();
  };

  // Export report simulation
  // Export report implementation using jsPDF and SheetJS (xlsx)
  const handleExport = async (type: 'pdf' | 'excel') => {
    if (!activeHalaqah) return;

    const activeStudentIds = activeStudents.map(s => s.id);
    const filteredSetorans = setorans.filter(s => activeStudentIds.includes(s.santriId));

    if (filteredSetorans.length === 0) {
      toast.error('Tidak ada data setoran untuk halaqah ini untuk diekspor.');
      return;
    }

    const headers = ['Nama Santri', 'Tanggal', 'Surah/Halaman', 'Jumlah Baris', 'Jumlah Kesalahan', 'Status'];
    const rows = filteredSetorans.map(s => {
      const studentName = activeStudents.find(student => student.id === s.santriId)?.nama ?? 'Unknown';
      const surahInfo = s.type === 'manzil' 
        ? `${s.surah} (Halaman ${s.halamanMulai} - ${s.halamanSelesai}) [Manzil]`
        : `${s.surah} (Halaman ${s.halamanMulai} - ${s.halamanSelesai})`;
      return [
        studentName,
        s.date,
        surahInfo,
        s.baris,
        s.kesalahan,
        s.status === 'lulus' ? 'Lulus' : 'Mengulang'
      ];
    });

    const todayStr = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    if (type === 'pdf') {
      try {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

        // Header
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('MTs TQ Jamilurrahman', 105, 16, { align: 'center' });

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`Rekap Setoran Harian - ${activeHalaqah.nama}`, 105, 23, { align: 'center' });

        doc.setLineWidth(0.5);
        doc.line(14, 28, 196, 28);

        // Table
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (doc as any).autoTable({
          head: [headers],
          body: rows,
          startY: 32,
          styles: { fontSize: 9, cellPadding: 3 },
          headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [245, 247, 250] },
          margin: { left: 14, right: 14 }
        });

        // Footer
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const finalY = (doc as any).lastAutoTable?.finalY ?? 200;
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Tanggal Cetak: ${todayStr}`, 14, finalY + 10);

        doc.save(`Rekap_Setoran_${activeHalaqah.nama.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
      } catch (err) {
        console.error('PDF generation error:', err);
        toast.error('Gagal mengekspor ke PDF.');
      }
    } else {
      try {
        const XLSX = await import('xlsx');

        // Build worksheet data
        const metaRows = [
          ['MTs TQ Jamilurrahman'],
          [`Rekap Setoran Harian - ${activeHalaqah.nama}`],
          [`Tanggal Cetak: ${todayStr}`],
          [],
          headers,
          ...rows
        ];

        const ws = XLSX.utils.aoa_to_sheet(metaRows);

        // Auto column widths
        const colWidths = headers.map((_: string, ci: number) => ({
          wch: Math.max(
            headers[ci].length,
            ...rows.map(r => String(r[ci] ?? '').length)
          ) + 3
        }));
        ws['!cols'] = colWidths;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Rekap Setoran');

        XLSX.writeFile(wb, `Rekap_Setoran_${activeHalaqah.nama.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
      } catch (err) {
        console.error('Excel generation error:', err);
        toast.error('Gagal mengekspor ke Excel.');
      }
    }
  };

  // Helper to format date for setoran
  const formatSetoranDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const todayStr = new Date().toISOString().split('T')[0];
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (dateStr === todayStr) {
      return 'Hari Ini';
    }
    if (dateStr === yesterdayStr) {
      return 'Kemarin';
    }
    
    try {
      const d = new Date(dateStr);
      const day = d.getDate();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      if (isNaN(day) || !month) return dateStr;
      return `${day} ${month} ${year}`;
    } catch {
      return dateStr;
    }
  };

  // Prepare chart data for student history
  const getChartData = (studentId: string) => {
    const studentSetorans = setorans
      .filter(s => s.santriId === studentId && s.type === 'sabak' && s.status === 'lulus')
      .slice(-7)
      .reverse();

    return studentSetorans.map(s => ({
      tanggal: formatSetoranDate(s.date),
      baris: s.baris,
      kesalahan: s.kesalahan
    }));
  };

  // ---------------------------------------------------------------------------
  // HALAQAH ANALYTICS — Tren rata-rata baris per minggu untuk seluruh halaqah
  // ---------------------------------------------------------------------------
  const getHalaqahWeeklyData = () => {
    // Ambil santri yang termasuk halaqah pengampu ini
    const halaqahSantriIds = activeStudents.map(s => s.id);

    // Ambil semua sabak lulus dari santri di halaqah ini
    const sabakLulus = setorans.filter(
      s => halaqahSantriIds.includes(s.santriId) && s.type === 'sabak' && s.status === 'lulus'
    );

    if (sabakLulus.length === 0) return [];

    // Bangun label 4 minggu terakhir
    const weeks: { label: string; startDate: string; endDate: string }[] = [];
    const now = new Date();
    for (let i = 3; i >= 0; i--) {
      const endDate = new Date(now);
      endDate.setDate(now.getDate() - i * 7);
      const startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - 6);
      const label = `${startDate.getDate()}/${startDate.getMonth() + 1} – ${endDate.getDate()}/${endDate.getMonth() + 1}`;
      weeks.push({
        label,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      });
    }

    return weeks.map(week => {
      const weekSetorans = sabakLulus.filter(
        s => s.date >= week.startDate && s.date <= week.endDate
      );
      const avg = weekSetorans.length > 0
        ? Math.round((weekSetorans.reduce((sum, s) => sum + s.baris, 0) / weekSetorans.length) * 10) / 10
        : 0;
      return {
        minggu: week.label,
        'Rata-rata Baris': avg,
        total: weekSetorans.length,
      };
    });
  };

  // Per-santri avg baris sabak lulus (untuk bar chart santri)
  const getSantriBarData = () => {
    return activeStudents.map(student => {
      const sabakLulus = setorans.filter(
        s => s.santriId === student.id && s.type === 'sabak' && s.status === 'lulus'
      );
      const avg = sabakLulus.length > 0
        ? Math.round((sabakLulus.reduce((sum, s) => sum + s.baris, 0) / sabakLulus.length) * 10) / 10
        : 0;
      return {
        nama: student.nama.split(' ')[0], // nama depan agar muat
        'Rata-rata Baris': avg,
        target: student.targetBaris,
      };
    });
  };
  // ---------------------------------------------------------------------------
  // 6 MENU PANELS
  // ---------------------------------------------------------------------------
  const renderBerandaPanel = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todaySetorans = setorans.filter(s => s.date === todayStr);
    const activeStudentIds = activeStudents.map(s => s.id);
    const todaySabakSetorans = todaySetorans.filter(s => s.type === 'sabak' && activeStudentIds.includes(s.santriId));
    const totalSetor = todaySabakSetorans.length;
    const totalBelumSetor = activeStudents.length - totalSetor;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const yesterdayManzilSetorans = setorans.filter(s => s.type === 'manzil' && s.date === yesterdayStr && activeStudentIds.includes(s.santriId));
    const totalManzilYesterday = yesterdayManzilSetorans.length;
    const totalManzilVerifiedYesterday = yesterdayManzilSetorans.filter(s => s.parentVerified).length;

    const activeHalaqahTikrars = tikrars.filter(t => activeStudentIds.includes(t.santri_id) && !t.selesai);

    return (
      <div className="space-y-6">
        {namaLengkap && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex items-center space-x-4">
            <span className="text-3xl">🕌</span>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-105">
                Selamat Datang, Ustadz/Ustadzah <span className="text-emerald-605 dark:text-emerald-400 font-extrabold">{namaLengkap}</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Aplikasi SI Tahfiz · Kelompok Halaqah: <span className="font-semibold text-slate-700 dark:text-slate-350">{activeHalaqah?.nama || 'Halaqah Pengampu'}</span> · Unit: {activeHalaqah?.unit || '-'}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Setoran Hari Ini</span>
              <div className="text-2xl font-black text-slate-850 dark:text-white">
                {totalSetor} <span className="text-xs text-slate-400 font-normal">/ {activeStudents.length} Santri</span>
              </div>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                {totalBelumSetor} santri belum menyetor
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <ClipboardCheck className="h-6 w-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Verifikasi Manzil Kemarin</span>
              <div className="text-2xl font-black text-slate-850 dark:text-white">
                {totalManzilVerifiedYesterday} <span className="text-xs text-slate-400 font-normal">/ {totalManzilYesterday} Laporan</span>
              </div>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                {totalManzilYesterday - totalManzilVerifiedYesterday} pending persetujuan ortu
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Award className="h-6 w-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Tikrar Aktif</span>
              <div className="text-2xl font-black text-slate-850 dark:text-white">
                {activeHalaqahTikrars.length} <span className="text-xs text-slate-400 font-normal">Kewajiban</span>
              </div>
              <p className="text-[10px] text-amber-605 dark:text-amber-400 font-semibold mt-1">
                Perlu pengulangan di sekolah/rumah
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Flame className="h-6 w-6" />
            </div>
          </div>
        </div>

        {activeHalaqahTikrars.length > 0 && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/80 p-5 rounded-2xl shadow-sm space-y-3">
            <div className="flex items-center space-x-2 text-red-800 dark:text-red-400 font-extrabold text-sm">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span>Peringatan Tikrar Aktif Harian</span>
            </div>
            <p className="text-xs text-red-750 dark:text-red-400">
              Berikut adalah daftar santri yang memiliki tugas Tikrar yang belum selesai. Mohon dikoordinasikan untuk pengulangan agar hafalan tidak hilang.
            </p>
            <div className="divide-y divide-red-100 dark:divide-red-900/40 bg-white dark:bg-slate-950/50 rounded-xl border border-red-200 dark:border-red-905/50 overflow-hidden">
              {activeHalaqahTikrars.map((t) => {
                const studentName = activeStudents.find(s => s.id === t.santri_id)?.nama || 'Santri';
                return (
                  <div key={t.id} className="p-3 text-xs flex justify-between items-center">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-205">{studentName}</span>
                      <span className="ml-2 text-slate-500 font-medium">Surah {t.surah} (Hal {t.halaman})</span>
                    </div>
                    <span className="bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                      {t.status === 'wajib_sekolah' ? 'Wajib Sekolah' : 'Wajib Rumah'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSetoranPanel = () => {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <span className="font-bold text-slate-700 dark:text-slate-350 text-xs sm:text-sm">
              Kelompok: {activeHalaqah?.nama || 'Halaqah Pengampu'}
            </span>
          </div>
          <div className="flex items-center space-x-2 self-end md:self-auto">
            <button
              onClick={() => handleExport('excel')}
              className="inline-flex items-center px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300 transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600 dark:text-emerald-400" />
              Ekspor Excel
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className="inline-flex items-center px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300 transition-colors"
            >
              <FileText className="h-4 w-4 mr-2 text-red-650 dark:text-red-400" />
              Ekspor PDF Laporan
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col h-[650px]">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2 border-b border-slate-150 dark:border-slate-800 pb-3 mb-3">
              <span>Daftar Halaqah Santri</span>
              <span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                {activeStudents.length} Santri
              </span>
            </h3>
            
            <div className="overflow-y-auto flex-grow divide-y divide-slate-100 dark:divide-slate-800/50 pr-1">
              {activeStudents.map(student => {
                const isSelected = selectedSantri?.id === student.id;
                const status = getStudentTodayStatus(student.id);
                return (
                  <button
                    key={student.id}
                    onClick={() => handleSelectSantri(student)}
                    className={`w-full text-left p-3 my-1 rounded-xl transition-all flex items-center justify-between ${isSelected ? 'bg-emerald-50 dark:bg-emerald-950/20 border-l-4 border-emerald-500' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'}`}
                  >
                    <div>
                      <h4 className="font-bold text-sm text-slate-850 dark:text-slate-200 flex items-center justify-between gap-2">
                        <span>{student.nama}</span>
                        {(() => {
                          const tikrarStatus = getStudentCurrentTikrarStatus(student.id);
                          if (!tikrarStatus) return null;
                          if (tikrarStatus === 'wajib_sekolah') return <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">Tikrar Sekolah</span>;
                          if (tikrarStatus === 'wajib_rumah') return <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400">Tikrar Rumah</span>;
                          if (tikrarStatus === 'selesai_sekolah') return <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">Selesai Sekolah</span>;
                          if (tikrarStatus === 'selesai_rumah') return <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-600 dark:text-teal-400">Selesai Rumah</span>;
                          return null;
                        })()}
                      </h4>
                      <div className="flex items-center space-x-2 mt-1 flex-wrap gap-y-1">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-150 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-400">
                          {student.grade}
                        </span>
                        <span className="text-[10px] text-slate-450 dark:text-slate-555">
                          Kelas {student.kelas} · Target: {student.targetBaris} baris
                        </span>
                        {(() => {
                          const studentSetorans = setorans.filter(s => s.santriId === student.id && s.type === 'sabak');
                          const avgBaris = studentSetorans.length > 0
                            ? studentSetorans.reduce((sum, s) => sum + s.baris, 0) / studentSetorans.length
                            : 0;
                          const ratio = student.targetBaris > 0 ? (avgBaris / student.targetBaris) * 100 : 0;
                          if (studentSetorans.length === 0) return null;
                          let colorClasses = 'bg-red-500/10 text-red-600 dark:text-red-400';
                          if (ratio >= 100) colorClasses = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
                          else if (ratio >= 75) colorClasses = 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500';
                          else if (ratio >= 50) colorClasses = 'bg-orange-500/10 text-orange-600 dark:text-orange-400';
                          return (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${colorClasses}`} title={`Rata-rata: ${avgBaris.toFixed(1)} baris`}>
                              Avg: {avgBaris.toFixed(1)} ({Math.round(ratio)}%)
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${status.color}`}>
                      {status.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-8 flex flex-col h-[650px]">
            {selectedSantri ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col h-full shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-b border-slate-150 dark:border-slate-800 p-5 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-extrabold shadow-md">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-slate-805 dark:text-slate-100 flex items-center space-x-2">
                        <span>{selectedSantri.nama}</span>
                        {selectedSantri.status === 'stagnant' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400">
                            Stagnan!
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-550 dark:text-slate-400 mt-0.5">
                        Grade {selectedSantri.grade} · Kelas {selectedSantri.kelas} · Target: {selectedSantri.targetBaris} baris/hari
                      </p>
                    </div>
                  </div>
                  {activePekan ? (
                    <span className="bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400 text-[10px] px-2.5 py-1 rounded-lg font-bold border border-amber-500/25 uppercase tracking-wider animate-pulse">
                      Pekan Ujian Massal
                    </span>
                  ) : (
                    <div className="flex bg-slate-200/50 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                      <button 
                        onClick={() => setActiveTab('setoran')}
                        className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${activeTab === 'setoran' ? 'bg-white dark:bg-slate-750 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-750 dark:hover:text-slate-300'}`}
                      >
                        Input Harian
                      </button>
                      <button 
                        onClick={() => setActiveTab('pekan')}
                        className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${activeTab === 'pekan' ? 'bg-white dark:bg-slate-750 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-750 dark:hover:text-slate-300'}`}
                      >
                        Pekan Muraja&apos;ah
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex-grow overflow-y-auto p-6">
                  {activePekan ? (
                    renderMurajaahForm()
                  ) : activeTab === 'setoran' && (
                    <div className="space-y-6">
                      <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-900/50">
                        <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
                          <span>📊 Pemantauan Manzil (Review Rumah - Kemarin)</span>
                          <span className="text-[10px] text-slate-500">F1.2.1 / F1.2.2</span>
                        </h4>
                        {(() => {
                          const manzil = checkManzilStatus(selectedSantri.id);
                          if (manzil) {
                            return (
                              <div className="flex flex-col space-y-2 text-xs">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="font-semibold text-slate-800 dark:text-slate-202">Surah {manzil.surah} (halaman {manzil.halaman})</span>
                                  </div>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${manzil.verified ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/35 dark:text-emerald-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/35 dark:text-amber-400'}`}>
                                    {manzil.verified ? '✓ Terverifikasi Orang Tua' : '⚠ Belum Dikonfirmasi Orang Tua'}
                                  </span>
                                </div>
                                {manzil.verified && manzil.parentSignature && (
                                  <div className="mt-1 flex items-center space-x-2 border-t border-slate-100 dark:border-slate-800/80 pt-2">
                                    <span className="text-[10px] text-slate-450 font-medium">Bukti Validasi:</span>
                                    <div className="bg-white p-1 rounded border border-slate-200 dark:border-slate-700 inline-block">
                                      <img src={manzil.parentSignature} alt="Tanda Tangan" className="h-8 object-contain max-w-[120px]" />
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          }
                          return (
                            <div className="flex items-center space-x-2 text-red-600 dark:text-red-405 text-xs font-semibold">
                              <AlertCircle className="h-4 w-4" />
                              <span>Peringatan: Laporan Manzil belum diinput oleh Orang Tua. Koordinasikan sebelum santri ujian juz.</span>
                            </div>
                          );
                        })()}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="border border-slate-150 dark:border-slate-850 p-4 rounded-xl relative">
                          <h4 className="font-bold text-xs text-slate-700 dark:text-slate-350 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <span>1. Sabki (Review Kemarin) {sabkiDone && '✅'}</span>
                              {existingSabkiSetoranId && (
                                <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded text-[9px] font-bold">
                                  Sabki Sudah Diinput Hari Ini ✅
                                </span>
                              )}
                            </span>
                            <span className="text-[9px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-1 rounded">Prasyarat</span>
                          </h4>
                          
                          <form onSubmit={handleSaveSabki} className="space-y-3">
                            <div>
                              <label className="text-[10px] font-bold uppercase text-slate-400">Surah Sabki</label>
                              <input 
                                type="text" 
                                placeholder="e.g. An-Naba" 
                                value={sabkiSurah}
                                onChange={e => setSabkiSurah(e.target.value)}
                                required
                                disabled={existingSabkiSetoranId !== null && !isSabkiEditMode}
                                className="w-full text-xs p-2 border border-slate-200 dark:border-slate-700 bg-slate-55 dark:bg-slate-800 rounded-lg focus:outline-none focus:border-emerald-500 disabled:opacity-70" 
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-bold uppercase text-slate-400">Halaman</label>
                                <input 
                                  type="number" 
                                  value={sabkiHalaman}
                                  onChange={e => setSabkiHalaman(Number(e.target.value))}
                                  required
                                  disabled={existingSabkiSetoranId !== null && !isSabkiEditMode}
                                  className="w-full text-xs p-2 border border-slate-200 dark:border-slate-700 bg-slate-55 dark:bg-slate-800 rounded-lg focus:outline-none disabled:opacity-70" 
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold uppercase text-slate-400">Jumlah Kesalahan</label>
                                <input 
                                  type="number" 
                                  value={sabkiKesalahan}
                                  onChange={e => setSabkiKesalahan(Number(e.target.value))}
                                  disabled={existingSabkiSetoranId !== null && !isSabkiEditMode}
                                  className="w-full text-xs p-2 border border-slate-200 dark:border-slate-700 bg-slate-55 dark:bg-slate-800 rounded-lg focus:outline-none disabled:opacity-70" 
                                />
                              </div>
                            </div>
                            {existingSabkiSetoranId && !isSabkiEditMode ? (
                              <button 
                                type="button"
                                onClick={() => setIsSabkiEditMode(true)}
                                className="w-full bg-amber-600 hover:bg-amber-700 text-white py-1.5 rounded-lg text-xs font-bold transition-colors"
                              >
                                Edit Sabki
                              </button>
                            ) : (
                              <button 
                                type="submit"
                                disabled={isLoading}
                                className={`w-full py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-60 text-white ${existingSabkiSetoranId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-800 dark:bg-slate-700 hover:bg-slate-750'}`}
                              >
                                {existingSabkiSetoranId ? 'Simpan Edit Sabki' : 'Simpan Sabki'}
                              </button>
                            )}
                          </form>
                        </div>

                        <div className="border border-slate-150 dark:border-slate-850 p-4 rounded-xl relative">
                          <h4 className="font-bold text-xs text-slate-700 dark:text-slate-350 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <span>2. Sabak (Setoran Baru)</span>
                              {isEditMode && (
                                <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded text-[9px] font-bold">
                                  Sudah Setor Hari Ini ✅
                                </span>
                              )}
                            </span>
                            <span className="text-[9px] text-slate-505 bg-slate-100 dark:bg-slate-800 px-1 rounded">Target Harian</span>
                          </h4>
                          <form onSubmit={handleSaveSabak} className="space-y-3">
                            <div>
                              <label className="text-[10px] font-bold uppercase text-slate-400">Surah Baru</label>
                              <input 
                                type="text" 
                                value={sabakSurah}
                                onChange={e => setSabakSurah(e.target.value)}
                                required
                                className="w-full text-xs p-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:border-emerald-500" 
                              />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="text-[10px] font-bold uppercase text-slate-400">Hal Mulai</label>
                                <input type="number" value={sabakHalMulai} onChange={e => setSabakHalMulai(Number(e.target.value))} className="w-full text-xs p-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg" />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold uppercase text-slate-400">Hal Selesai</label>
                                <input type="number" value={sabakHalSelesai} onChange={e => setSabakHalSelesai(Number(e.target.value))} className="w-full text-xs p-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg" />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold uppercase text-slate-400">Baris Setor</label>
                                <input type="number" value={sabakBaris} onChange={e => setSabakBaris(Number(e.target.value))} className="w-full text-xs p-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg" />
                                {(() => {
                                  const targetBaris = selectedSantri ? selectedSantri.targetBaris : 10;
                                  const ratio = targetBaris > 0 ? (sabakBaris / targetBaris) * 100 : 100;
                                  let colorClasses = 'bg-red-500/10 text-red-600 dark:text-red-400';
                                  if (ratio >= 100) colorClasses = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-450';
                                  else if (ratio >= 75) colorClasses = 'bg-yellow-500/10 text-yellow-605 dark:text-yellow-500';
                                  else if (ratio >= 50) colorClasses = 'bg-orange-500/10 text-orange-600 dark:text-orange-400';
                                  return (
                                    <div className={`mt-1 text-[9px] font-extrabold px-1 py-0.5 rounded text-center ${colorClasses}`}>
                                      {Math.round(ratio)}% target ({selectedSantri?.targetBaris} baris)
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-bold uppercase text-slate-400">Kesalahan</label>
                                <input type="number" value={sabakKesalahan} onChange={e => setSabakKesalahan(Number(e.target.value))} className="w-full text-xs p-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg" />
                              </div>
                              <div className="flex flex-col justify-end">
                                <span className={`text-[10px] font-bold p-2 text-center rounded-lg border ${sabakKesalahan <= mistakeThreshold ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30'}`}>
                                  {sabakKesalahan <= mistakeThreshold ? '✓ Lulus' : '⚠ Mengulang'}
                                </span>
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold uppercase text-slate-400">Catatan Harian</label>
                              <input type="text" placeholder="Feedback..." value={sabakNotes} onChange={e => setSabakNotes(e.target.value)} className="w-full text-xs p-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg" />
                            </div>
                            <button 
                              type="submit"
                              disabled={isLoading}
                              className={`w-full py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-60 text-white ${isEditMode ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                            >
                              {isEditMode ? 'Edit Setoran' : 'Simpan Setoran Sabak'}
                            </button>
                          </form>
                        </div>
                      </div>

                      <div className="border border-red-150 dark:border-red-900/40 rounded-xl p-4 bg-red-50/5 dark:bg-red-950/10 space-y-3">
                        <h4 className="font-bold text-xs text-red-700 dark:text-red-400 flex items-center justify-between border-b border-red-100 dark:border-red-950/50 pb-2">
                          <span className="flex items-center">
                            <Flame className="h-4 w-4 mr-1 text-red-500" />
                            Program Tikrar ({selectedSantri.nama})
                          </span>
                        </h4>
                        {(() => {
                          const studentTikrars = tikrars.filter(t => t.santri_id === selectedSantri.id);
                          if (studentTikrars.length === 0) {
                            return <p className="text-xs text-slate-500 italic py-2 text-center">Tidak ada catatan kewajiban Tikrar.</p>;
                          }
                          return (
                            <div className="space-y-3 divide-y divide-slate-100 dark:divide-slate-800/40">
                              {studentTikrars.map((t, idx) => {
                                const status = t.status || (t.selesai ? (t.lokasi === 'sekolah' ? 'selesai_sekolah' : 'selesai_rumah') : (t.lokasi === 'sekolah' ? 'wajib_sekolah' : 'wajib_rumah'));
                                return (
                                  <div key={t.id} className={`pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${idx === 0 ? 'pt-0' : ''}`}>
                                    <div className="space-y-1">
                                      <div className="flex items-center space-x-2 flex-wrap">
                                        <span className="font-semibold text-slate-850 dark:text-slate-205">Surah {t.surah} (Hal {t.halaman})</span>
                                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold ${status === 'wajib_sekolah' ? 'bg-amber-100 text-amber-805 dark:bg-amber-950/40 dark:text-amber-400' : status === 'selesai_sekolah' ? 'bg-emerald-100 text-emerald-850 dark:bg-emerald-950/40 dark:text-emerald-450' : status === 'wajib_rumah' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-400' : 'bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-400'}`}>
                                          {status === 'wajib_sekolah' && 'Wajib Sekolah'}
                                          {status === 'selesai_sekolah' && 'Selesai Sekolah'}
                                          {status === 'wajib_rumah' && 'Wajib Rumah'}
                                          {status === 'selesai_rumah' && 'Selesai di Rumah ✅'}
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-slate-500">
                                        Tanggal: {t.tanggal} · Ulang: {t.jumlah_ulang}x
                                        {status === 'selesai_rumah' && t.updated_at && (
                                          <span className="text-teal-600 dark:text-teal-400 ml-1.5">
                                            · Terkonfirmasi: {new Date(t.updated_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                                          </span>
                                        )}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                                      {status === 'wajib_sekolah' && (
                                        <>
                                          <button onClick={() => handleUpdateTikrarStatus(t.id, 'selesai_sekolah')} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-2 py-1 rounded">Selesai</button>
                                          <button onClick={() => handleUpdateTikrarStatus(t.id, 'wajib_rumah')} className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] px-2 py-1 rounded">Ke Rumah</button>
                                        </>
                                      )}
                                      {status === 'selesai_sekolah' && (
                                        <button onClick={() => handleUpdateTikrarStatus(t.id, 'wajib_rumah')} className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] px-2 py-1 rounded">Ke Rumah</button>
                                      )}
                                      {status === 'wajib_rumah' && <span className="text-[10px] text-slate-450 italic">Menunggu konfirmasi wali</span>}
                                      {status === 'selesai_rumah' && (
                                        <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold flex flex-col items-end">
                                          <span>Selesai di Rumah ✅</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {activeTab === 'pekan' && (
                    <div className="space-y-6">
                      <div className="bg-slate-50 dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 rounded-xl">
                        <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 mb-2 flex items-center justify-between">
                          <span>🔧 Pengaturan Pekan Muraja&apos;ah</span>
                          <span className="text-xs text-slate-505 font-bold">F1.6 Setup</span>
                        </h4>
                        <p className="text-xs text-slate-500 mb-4">Ubah target harian secara otomatis berdasarkan total halaman dibagi hari dan toleransi kesalahan.</p>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold">Aktifkan Pekan Muraja&apos;ah:</span>
                            <input 
                              type="checkbox" 
                              checked={isPekanMurajaah}
                              onChange={e => {
                                setIsPekanMurajaah(e.target.checked);
                                if (e.target.checked) toast.info('Mode Pekan Muraja\'ah diaktifkan.');
                              }}
                              className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 rounded" 
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-[10px] font-bold uppercase text-slate-400">Pembagi Hari</label>
                              <select value={targetDivider} onChange={e => setTargetDivider(Number(e.target.value))} disabled={!isPekanMurajaah} className="w-full text-xs p-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg">
                                <option value={10}>10 Hari</option>
                                <option value={15}>15 Hari</option>
                                <option value={20}>20 Hari</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold uppercase text-slate-400">Batas Kesalahan</label>
                              <select value={mistakeThreshold} onChange={e => setMistakeThreshold(Number(e.target.value))} className="w-full text-xs p-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg">
                                <option value={1}>Maks 1 / hal</option>
                                <option value={2}>Maks 2 / hal</option>
                                <option value={3}>Maks 3 / hal</option>
                              </select>
                            </div>
                          </div>
                          {isPekanMurajaah && (
                            <div className="p-3 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-semibold">
                              Target Pekan Muraja&apos;ah: {Math.ceil(300 / targetDivider)} baris / hari.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center h-full shadow-sm">
                <BookOpen className="h-12 w-12 text-slate-350 mb-3" />
                <h4 className="font-bold text-slate-705 dark:text-slate-200">Silakan pilih santri</h4>
                <p className="text-xs text-slate-450 dark:text-slate-400 mt-1 max-w-sm">Pilih salah satu profil santri dari kelompok halaqah sebelah kiri untuk memulai pencatatan.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderTikrarPanel = () => {
    const activeStudentIds = activeStudents.map(s => s.id);
    const halaqahTikrars = tikrars.filter(t => activeStudentIds.includes(t.santri_id));

    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-150 dark:border-slate-800 mb-6">
          <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100 flex items-center space-x-2">
            <Flame className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <span>Program Tikrar Halaqah ({activeStudents.length} Santri)</span>
          </h3>
          <span className="text-[10px] bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-350 px-2 py-0.5 rounded font-extrabold">Monitoring</span>
        </div>

        {halaqahTikrars.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-450 uppercase text-[10px] font-bold">
                  <th className="py-3 px-4">Nama Santri</th>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Surah (Hal)</th>
                  <th className="py-3 px-4 text-center">Ulang</th>
                  <th className="py-3 px-4">Status & Lokasi</th>
                  <th className="py-3 px-4">Wali</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                {halaqahTikrars.map((t) => {
                  const student = activeStudents.find(s => s.id === t.santri_id);
                  const status = t.status || (t.selesai ? (t.lokasi === 'sekolah' ? 'selesai_sekolah' : 'selesai_rumah') : (t.lokasi === 'sekolah' ? 'wajib_sekolah' : 'wajib_rumah'));
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                      <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">{student?.nama || 'Unknown'}</td>
                      <td className="py-3 px-4 text-slate-500">{t.tanggal}</td>
                      <td className="py-3 px-4 font-medium">{t.surah} (Hal {t.halaman})</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-650">{t.jumlah_ulang}x</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold ${status === 'wajib_sekolah' ? 'bg-amber-100 text-amber-805 dark:bg-amber-950/40 dark:text-amber-400' : status === 'selesai_sekolah' ? 'bg-emerald-100 text-emerald-850 dark:bg-emerald-950/40 dark:text-emerald-450' : status === 'wajib_rumah' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-400' : 'bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-400'}`}>
                          {status === 'wajib_sekolah' && 'Wajib Sekolah'}
                          {status === 'selesai_sekolah' && 'Selesai Sekolah'}
                          {status === 'wajib_rumah' && 'Wajib Rumah'}
                          {status === 'selesai_rumah' && 'Selesai di Rumah ✅'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {t.parent_verified ? (
                          <div className="flex flex-col">
                            <span className="text-emerald-600 font-bold">✓ Ok</span>
                            {t.updated_at && (
                              <span className="text-[9px] text-slate-400 font-normal mt-0.5">
                                {new Date(t.updated_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Belum</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        {status === 'wajib_sekolah' && (
                          <>
                            <button onClick={() => handleUpdateTikrarStatus(t.id, 'selesai_sekolah')} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-2 py-1 rounded">Selesai</button>
                            <button onClick={() => handleUpdateTikrarStatus(t.id, 'wajib_rumah')} className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] px-2 py-1 rounded">Ke Rumah</button>
                          </>
                        )}
                        {status === 'selesai_sekolah' && (
                          <button onClick={() => handleUpdateTikrarStatus(t.id, 'wajib_rumah')} className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] px-2 py-1 rounded">Ke Rumah</button>
                        )}
                        {status === 'wajib_rumah' && <span className="text-[10px] text-slate-450 italic">Menunggu wali</span>}
                        {status === 'selesai_rumah' && <span className="text-[10px] text-emerald-600 font-semibold">✓ Tuntas</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500 italic">Tidak ada data tugas Tikrar.</div>
        )}
      </div>
    );
  };

  const renderManzilPanel = () => {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-150 dark:border-slate-800 mb-6">
          <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100 flex items-center space-x-2">
            <Award className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <span>Status Manzil Santri Kemarin / Hari Ini</span>
          </h3>
          <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-350 px-2 py-0.5 rounded font-extrabold">Verification</span>
        </div>

        <div className="space-y-4">
          {activeStudents.map((student) => {
            const manzil = checkManzilStatus(student.id);
            return (
              <div key={student.id} className="border border-slate-150 dark:border-slate-800 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-sm transition-shadow">
                <div>
                  <h4 className="font-bold text-sm text-slate-850 dark:text-slate-200">{student.nama}</h4>
                  <p className="text-[10px] text-slate-500">Grade {student.grade} · Kelas {student.kelas}</p>
                  {manzil ? (
                    <div className="mt-2 text-xs text-slate-650 dark:text-slate-350">
                      Setoran Manzil: <span className="font-bold text-slate-805 dark:text-slate-105">Surah {manzil.surah} (Halaman {manzil.halaman})</span>
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-slate-400 italic">Belum ada laporan Manzil.</div>
                  )}
                </div>
                <div className="flex flex-col md:items-end justify-center space-y-2">
                  {manzil ? (
                    <>
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${manzil.verified ? 'bg-emerald-100 text-emerald-805 dark:bg-emerald-950/35 dark:text-emerald-400' : 'bg-amber-100 text-amber-805 dark:bg-amber-950/35 dark:text-amber-400'}`}>
                        {manzil.verified ? '✓ Terverifikasi' : '⚠ Pending'}
                      </span>
                      {manzil.verified && manzil.parentSignature && (
                        <div className="flex items-center space-x-2">
                          <span className="text-[9px] text-slate-450">Bukti:</span>
                          <div className="bg-white p-0.5 rounded border border-slate-200 dark:border-slate-700">
                            <img src={manzil.parentSignature} alt="Sig" className="h-6 object-contain max-w-[100px]" />
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950/35 dark:text-red-400">⚠ Belum Ada Laporan</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderAnalitikPanel = () => {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <span className="font-bold text-slate-805 dark:text-slate-200 text-sm">Analitik Santri:</span>
            <select
              value={selectedSantri?.id || ''}
              onChange={(e) => {
                const student = activeStudents.find(s => s.id === e.target.value);
                if (student) handleSelectSantri(student);
              }}
              className="text-xs p-1.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none"
            >
              <option value="" disabled>Pilih Santri...</option>
              {activeStudents.map(s => (
                <option key={s.id} value={s.id}>{s.nama}</option>
              ))}
            </select>
          </div>
          {selectedSantri && (
            <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${selectedSantri.status === 'stagnant' ? 'bg-red-105 text-red-800 dark:bg-red-950/30 dark:text-red-400' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30'}`}>
              Status: {selectedSantri.status === 'stagnant' ? '⚠ Stagnan' : '✓ Normal'}
            </span>
          )}
        </div>

        {selectedSantri ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
            <h4 className="font-bold text-xs text-slate-700 dark:text-slate-350 mb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span>📈 Grafik Tren Baris Setoran ({selectedSantri.nama})</span>
              <span className="text-[10px] text-slate-500">7 setoran lulus terakhir</span>
            </h4>
            {getChartData(selectedSantri.id).length > 0 ? (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={getChartData(selectedSantri.id)}>
                    <defs>
                      <linearGradient id="colorBaris" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="tanggal" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="baris" name="Baris" stroke="#10b981" fillOpacity={1} fill="url(#colorBaris)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-xs text-slate-450">Belum ada riwayat setoran lulus.</div>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl text-center text-xs text-slate-400">Silakan pilih salah satu santri untuk melihat grafik tren.</div>
        )}

        <div className="pt-4 border-t border-slate-150 dark:border-slate-850 space-y-4">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <h4 className="font-extrabold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Analitik Halaqah: {activeHalaqah?.nama || 'Halaqah Pengampu'}
            </h4>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
              <h5 className="font-bold text-xs text-slate-750 dark:text-slate-350 mb-1">📈 Tren Rata-rata Baris per Minggu</h5>
              <p className="text-[10px] text-slate-500 mb-4">4 minggu terakhir</p>
              {getHalaqahWeeklyData().length > 0 ? (
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={getHalaqahWeeklyData()}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="minggu" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} />
                      <Tooltip formatter={(v, name) => [`${Number(v)} baris`, String(name)]} />
                      <Line type="monotone" dataKey="Rata-rata Baris" stroke="#10b981" strokeWidth={2} dot={{ r: 4, fill: '#10b981' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-[10px] text-slate-400">Belum ada riwayat.</div>
              )}
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
              <h5 className="font-bold text-xs text-slate-755 dark:text-slate-350 mb-1">📊 Rata-rata Sabak Lulus per Santri</h5>
              <p className="text-[10px] text-slate-500 mb-4">30 hari terakhir</p>
              {getSantriBarData().length > 0 ? (
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getSantriBarData()} barCategoryGap="30%">
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="nama" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} />
                      <Tooltip formatter={(v, name) => [`${Number(v)} baris`, name === 'Rata-rata Baris' ? 'Rata-rata' : 'Target']} />
                      <Legend wrapperStyle={{ fontSize: 9 }} />
                      <Bar dataKey="Rata-rata Baris" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="target" fill="#f97316" opacity={0.5} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-[10px] text-slate-400">Belum ada data.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPesanPanel = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col h-[600px]">
          <h3 className="font-bold text-slate-805 dark:text-slate-100 border-b border-slate-150 dark:border-slate-800 pb-3 mb-3">Pilih Chat Orang Tua</h3>
          <div className="overflow-y-auto flex-grow divide-y divide-slate-100 dark:divide-slate-800/50 pr-1">
            {activeStudents.map(student => {
              const isSelected = selectedSantri?.id === student.id;
              const parentMsgCount = pesans.filter(p => p.santriId === student.id && p.sender === 'orangtua' && !p.sudahDibaca).length;
              const studentMsgs = pesans.filter(p => p.santriId === student.id);
              const lastMsg = studentMsgs.length > 0 ? studentMsgs[studentMsgs.length - 1] : null;
              return (
                <button
                  key={student.id}
                  onClick={() => handleSelectSantri(student)}
                  className={`w-full text-left p-3 my-1 rounded-xl transition-all flex items-center justify-between ${isSelected ? 'bg-emerald-50 dark:bg-emerald-950/20 border-l-4 border-emerald-500' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'}`}
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <h4 className="font-bold text-sm text-slate-850 dark:text-slate-200 truncate">{student.nama}</h4>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">Wali: {student.parentName || 'Orang Tua'}</p>
                    {lastMsg && <p className="text-[10px] text-slate-450 dark:text-slate-500 truncate mt-1 italic">{lastMsg.sender === 'pengampu' ? 'Anda: ' : 'Wali: '}{lastMsg.content}</p>}
                  </div>
                  {parentMsgCount > 0 && <span className="bg-emerald-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold">{parentMsgCount}</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-8 flex flex-col h-[600px]">
          {selectedSantri ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col h-full shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-b border-slate-150 dark:border-slate-800 p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-9 w-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-extrabold shadow-md">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-805 dark:text-slate-105">Wali dari {selectedSantri.nama}</h3>
                    <p className="text-[10px] text-slate-500">No. HP: {selectedSantri.parentPhone || '-'} · Wali: {selectedSantri.parentName || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="flex-grow overflow-y-auto p-4 space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
                {pesans.filter(p => p.santriId === selectedSantri.id).length > 0 ? (
                  pesans.filter(p => p.santriId === selectedSantri.id).map(p => {
                    const isMe = p.sender === 'pengampu';
                    return (
                      <div key={p.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] rounded-2xl p-3 text-xs shadow-sm ${isMe ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100'}`}>
                          <p className="font-semibold text-[9px] opacity-75 uppercase mb-1">{isMe ? 'Anda' : 'Orang Tua'}</p>
                          <p className="leading-relaxed">{p.content}</p>
                          <span className="text-[8px] opacity-50 block text-right mt-1">{p.timestamp.slice(11, 16)}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">Belum ada pesan terkirim. Kirim pesan pertama untuk memulai komunikasi.</div>
                )}
              </div>

              <form onSubmit={handleSendMessage} className="p-4 flex items-center space-x-2 bg-slate-50 dark:bg-slate-900">
                <input 
                  type="text" 
                  placeholder="Ketik catatan atau saran perbaikan untuk orang tua..." 
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  className="flex-grow text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-905 rounded-lg focus:outline-none focus:border-emerald-500" 
                />
                <button type="submit" disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-lg transition-colors">
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center h-full shadow-sm">
              <MessageSquare className="h-12 w-12 text-slate-350 mb-3" />
              <h4 className="font-bold text-slate-705 dark:text-slate-200">Silakan pilih chat</h4>
              <p className="text-xs text-slate-450 dark:text-slate-400 mt-1 max-w-sm">Pilih salah satu profil santri di sebelah kiri untuk membuka percakapan.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderActivePanel = () => {
    switch (activeMenu) {
      case 'beranda': return renderBerandaPanel();
      case 'setoran': return renderSetoranPanel();
      case 'tikrar': return renderTikrarPanel();
      case 'manzil': return renderManzilPanel();
      case 'analitik': return renderAnalitikPanel();
      case 'pesan': return renderPesanPanel();
      default: return renderBerandaPanel();
    }
  };

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

          {renderActivePanel()}
        </div>
      </div>
    </div>
  );
}
