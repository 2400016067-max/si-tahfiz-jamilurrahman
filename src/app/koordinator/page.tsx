'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import RoleHeader from '@/components/RoleHeader';
import PengumumanPopup from '@/components/PengumumanPopup';
import { supabase } from '@/lib/supabase';
import { Santri, UjianJuz, Setoran } from '@/lib/mockData';
import { 
  Award, 
  Users, 
  Check, 
  AlertTriangle,
  BarChart2,
  LayoutDashboard,
  BookOpen,
  TrendingUp,
  History,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Megaphone,
  Send,
  Loader2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line
} from 'recharts';
import ReportDownloader from '@/components/ReportDownloader';

interface RiwayatGrade {
  id: string;
  santri_id: string;
  grade_lama: string;
  grade_baru: string;
  target_baris_baru: number;
  tanggal_ubah: string;
  alasan: string;
  diubah_oleh: string | null;
}

interface CatatanStagnasi {
  id: string;
  santri_id: string;
  tanggal: string;
  penyebab: 'keluarga' | 'psikososial' | 'game' | 'lainnya';
  detail: string;
  langkah_korektif: string;
  status_penanganan: 'proses' | 'selesai' | 'dipantau';
  dicatat_oleh: string | null;
}

interface PekanSchedule {
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

export default function KoordinatorDashboard() {
  const [mounted, setMounted] = useState(false);
  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [ujianList, setUjianList] = useState<UjianJuz[]>([]);
  const [setorans, setSetorans] = useState<Setoran[]>([]);

  // Map halaqah_id → nama halaqah (agar lookup halaqah nama tidak hardcode)
  const [halaqahMap, setHalaqahMap] = useState<Record<string, string>>({});

  // Loading & error state
  const [isLoading, setIsLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [namaLengkap, setNamaLengkap] = useState<string>('');

  // Navigation states
  const [activeMenu, setActiveMenu] = useState<'dashboard' | 'grade' | 'stagnasi' | 'ukj' | 'pekan' | 'analitik'>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  // Added states for refactoring
  const [riwayatGrades, setRiwayatGrades] = useState<RiwayatGrade[]>([]);
  const [catatanStagnasiList, setCatatanStagnasiList] = useState<CatatanStagnasi[]>([]);
  const [pekanSchedules, setPekanSchedules] = useState<PekanSchedule[]>([]);
  const [teacherRotationDate, setTeacherRotationDate] = useState<string>('');

  // Selected student for detail/history views
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState<string>('');
  const [selectedHalaqahRotation, setSelectedHalaqahRotation] = useState<string>('');

  // Pekan Muraja'ah form states
  const [pekanMulai, setPekanMulai] = useState<string>('');
  const [pekanSelesai, setPekanSelesai] = useState<string>('');
  const [pekanMat7, setPekanMat7] = useState<string>('Juz 30');
  const [pekanMat8, setPekanMat8] = useState<string>('Juz 29');
  const [pekanMat9, setPekanMat9] = useState<string>('Juz 28');
  const [pekanBatasSalah, setPekanBatasSalah] = useState<number>(2);
  const [pekanDeadline, setPekanDeadline] = useState<string>('');

  // Grade edit state
  const [editingSantri, setEditingSantri] = useState<Santri | null>(null);
  const [newGrade, setNewGrade] = useState<'Tahsin' | 'Takmil' | 'Tahfiz'>('Tahfiz');

  // Stagnancy intervention state
  const [stagnantSantri, setStagnantSantri] = useState<Santri | null>(null);
  const [stagnancyReason, setStagnancyReason] = useState<'keluarga' | 'psikososial' | 'game' | 'lainnya'>('game');
  const [stagnancyDetail, setStagnancyDetail] = useState('');
  const [stagnancyAction, setStagnancyAction] = useState('');
  const [stagnantSearchQuery, setStagnantSearchQuery] = useState('');

  const handleSearchChange = (query: string) => {
    setStagnantSearchQuery(query);
    const filtered = santriList
      .filter(s => s.status !== 'stagnant')
      .filter(s => s.nama.toLowerCase().includes(query.toLowerCase()));
    if (filtered.length > 0) {
      const isStillInList = filtered.some(s => s.id === stagnantSantri?.id);
      if (!isStillInList) {
        setStagnantSantri(filtered[0]);
      }
    }
  };

  const filteredActiveOnes = santriList
    .filter(s => s.status !== 'stagnant')
    .filter(s => s.nama.toLowerCase().includes(stagnantSearchQuery.toLowerCase()));

  // Announcement form state
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annTargets, setAnnTargets] = useState<Record<string, boolean>>({
    pengampu: false,
    orangtua: false,
    kepala_sekolah: false,
    semua: false,
  });

  // UKJ Input state (for simulator)
  const [showUjianModal, setShowUjianModal] = useState(false);
  const [ujianSantriId, setUjianSantriId] = useState('');
  const [ujianJuz, setUjianJuz] = useState(30);
  const [ujianKesalahan, setUjianKesalahan] = useState(2);
  const [ujianStatus, setUjianStatus] = useState<'lulus' | 'mengulang'>('lulus');

  // ---------------------------------------------------------------------------
  // DATA LOADING — Supabase queries
  // ---------------------------------------------------------------------------
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setSaveError(null);

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

      // 1. Fetch halaqah — untuk mapping id → nama (menggantikan hardcode 'h-1')
      const { data: halaqahData, error: halaqahError } = await supabase
        .from('halaqah')
        .select('id, nama');

      if (halaqahError) throw new Error('Gagal memuat halaqah: ' + halaqahError.message);

      const newHalaqahMap: Record<string, string> = {};
      (halaqahData ?? []).forEach((h: { id: string; nama: string }) => {
        // Ambil nama singkat: "Halaqah Abu Bakar (Putra)" → "Abu Bakar"
        const match = h.nama.match(/Halaqah (.+?) \(/);
        newHalaqahMap[h.id] = match ? match[1] : h.nama;
      });
      setHalaqahMap(newHalaqahMap);

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
          totalHafalanJuz: [],
        }));
        setSantriList(mapped);
      }

      // 3. Fetch ujian_juz
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

      // 4. Fetch setoran — 90 hari terakhir untuk analytics halaqah
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

      // 5. Fetch riwayat_grade
      const { data: riwayatData, error: riwayatError } = await supabase
        .from('riwayat_grade')
        .select('*')
        .order('tanggal_ubah', { ascending: false });
      if (riwayatError) console.warn('Gagal memuat riwayat_grade:', riwayatError.message);
      else if (riwayatData) setRiwayatGrades(riwayatData);

      // 6. Fetch catatan_stagnasi
      const { data: catatanData, error: catatanError } = await supabase
        .from('catatan_stagnasi')
        .select('*')
        .order('tanggal', { ascending: false });
      if (catatanError) console.warn('Gagal memuat catatan_stagnasi:', catatanError.message);
      else if (catatanData) setCatatanStagnasiList(catatanData);

      // Load Pekan Muraja'ah schedules from jadwal_ujian table
      const { data: jadwalData, error: jadwalError } = await supabase
        .from('jadwal_ujian')
        .select('*')
        .order('tanggal_mulai', { ascending: false });

      if (jadwalError) {
        console.warn('Gagal memuat jadwal_ujian:', jadwalError.message);
      } else if (jadwalData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mappedSchedules: PekanSchedule[] = (jadwalData as any[]).map((j) => {
          let details = {
            materiKelas7: 'Juz 30',
            materiKelas8: 'Juz 29',
            materiKelas9: 'Juz 28',
            batasKesalahan: 2,
            deadlineAkses: j.tanggal_selesai + 'T23:59:59'
          };
          try {
            if (j.keterangan && j.keterangan.startsWith('{')) {
              details = { ...details, ...JSON.parse(j.keterangan) };
            }
          } catch {
            // Not a JSON, keep defaults
          }
          return {
            id: j.id,
            tanggalMulai: j.tanggal_mulai,
            tanggalSelesai: j.tanggal_selesai,
            status: j.status,
            ...details
          };
        });
        setPekanSchedules(mappedSchedules);
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
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'santri',
        },
        (payload) => {
          const oldSantri = payload.old;
          const newSantri = payload.new;
          if (newSantri.status === 'stagnant' && oldSantri.status !== 'stagnant') {
            toast.error(`Perhatian: Status santri ${newSantri.nama} berubah menjadi stagnant!`, {
              style: { backgroundColor: '#fff5f5', border: '1px solid #e53e3e', color: '#9b2c2c' }
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

  // ---------------------------------------------------------------------------
  // UPDATE GRADE — UPDATE santri + INSERT riwayat_grade
  // ---------------------------------------------------------------------------
  const handleUpdateGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSantri) return;

    setSaveError(null);

    let targetBaris = 12;
    if (newGrade === 'Tahsin') targetBaris = 3;
    if (newGrade === 'Takmil') targetBaris = 7;
    if (newGrade === 'Tahfiz') targetBaris = 15;

    // 1. Update tabel santri
    const { error: updateError } = await supabase
      .from('santri')
      .update({
        grade: newGrade,
        target_baris: targetBaris,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingSantri.id);

    if (updateError) {
      setSaveError('Gagal memperbarui grade santri: ' + updateError.message);
      toast.error('Gagal memperbarui grade santri: ' + updateError.message);
      return;
    }

    // 2. Catat ke riwayat_grade
    const { error: riwayatError } = await supabase.from('riwayat_grade').insert({
      santri_id:         editingSantri.id,
      grade_lama:        editingSantri.grade,
      grade_baru:        newGrade,
      target_baris_baru: targetBaris,
      tanggal_ubah:      new Date().toISOString().split('T')[0],
      alasan:            'Perubahan grade oleh Koordinator Tahfiz'
    });

    if (riwayatError) {
      setSaveError('Gagal mencatat riwayat grade: ' + riwayatError.message);
      toast.error('Gagal mencatat riwayat grade: ' + riwayatError.message);
      return;
    }

    toast.success(`Berhasil memperbarui Grade ${editingSantri.nama} ke ${newGrade} dengan target harian ${targetBaris} baris.`);
    setEditingSantri(null);
    await loadData();
  };

  // ---------------------------------------------------------------------------
  // SIMPAN INTERVENSI STAGNASI — UPDATE santri + INSERT catatan_stagnasi
  // ---------------------------------------------------------------------------
  const handleSaveIntervention = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stagnantSantri) return;

    setSaveError(null);

    if (stagnantSantri.status === 'stagnant') {
      // Find the latest catatan_stagnasi record for this student directly from Supabase
      const { data: latestRecords, error: fetchError } = await supabase
        .from('catatan_stagnasi')
        .select('id')
        .eq('santri_id', stagnantSantri.id)
        .order('tanggal', { ascending: false })
        .limit(1);

      if (fetchError) {
        console.warn('Gagal mencari catatan stagnasi:', fetchError.message);
      }

      const latestCatatanId = latestRecords && latestRecords.length > 0 ? latestRecords[0].id : null;

      if (latestCatatanId) {
        // UPDATE existing catatan_stagnasi
        const { error: catatanError } = await supabase
          .from('catatan_stagnasi')
          .update({
            penyebab:          stagnancyReason,
            detail:            stagnancyDetail,
            langkah_korektif:  stagnancyAction,
            tanggal:           new Date().toISOString().split('T')[0]
          })
          .eq('id', latestCatatanId);

        if (catatanError) {
          setSaveError('Gagal memperbarui catatan stagnasi: ' + catatanError.message);
          toast.error('Gagal memperbarui catatan stagnasi: ' + catatanError.message);
          return;
        }
      } else {
        // Fallback to INSERT if not found
        const { error: catatanError } = await supabase.from('catatan_stagnasi').insert({
          santri_id:         stagnantSantri.id,
          tanggal:           new Date().toISOString().split('T')[0],
          penyebab:          stagnancyReason,
          detail:            stagnancyDetail,
          langkah_korektif:  stagnancyAction,
          status_penanganan: 'proses',
          dicatat_oleh:      null,
        });

        if (catatanError) {
          setSaveError('Gagal mencatat intervensi stagnasi: ' + catatanError.message);
          toast.error('Gagal mencatat intervensi stagnasi: ' + catatanError.message);
          return;
        }
      }

      // UPDATE santri details
      const { error: updateError } = await supabase
        .from('santri')
        .update({
          stagnancy_reason:  stagnancyReason,
          stagnancy_detail:  stagnancyDetail,
          stagnancy_action:  stagnancyAction,
          updated_at:        new Date().toISOString(),
        })
        .eq('id', stagnantSantri.id);

      if (updateError) {
        setSaveError('Gagal memperbarui data santri: ' + updateError.message);
        toast.error('Gagal memperbarui data santri: ' + updateError.message);
        return;
      }

      toast.success(`Rencana stagnasi untuk ${stagnantSantri.nama} berhasil diperbarui.`);
    } else {
      // 1. Update status santri menjadi stagnant
      const { error: updateError } = await supabase
        .from('santri')
        .update({
          status:            'stagnant',
          stagnancy_reason:  stagnancyReason,
          stagnancy_detail:  stagnancyDetail,
          stagnancy_action:  stagnancyAction,
          stagnancy_since:   new Date().toISOString().split('T')[0],
          updated_at:        new Date().toISOString(),
        })
        .eq('id', stagnantSantri.id);

      if (updateError) {
        setSaveError('Gagal memperbarui status stagnasi: ' + updateError.message);
        toast.error('Gagal memperbarui status stagnasi: ' + updateError.message);
        return;
      }

      // 2. Insert catatan ke tabel catatan_stagnasi
      const { error: catatanError } = await supabase.from('catatan_stagnasi').insert({
        santri_id:         stagnantSantri.id,
        tanggal:           new Date().toISOString().split('T')[0],
        penyebab:          stagnancyReason,
        detail:            stagnancyDetail,
        langkah_korektif:  stagnancyAction,
        status_penanganan: 'proses',
        dicatat_oleh:      null,
      });

      if (catatanError) {
        setSaveError('Gagal mencatat intervensi stagnasi: ' + catatanError.message);
        toast.error('Gagal mencatat intervensi stagnasi: ' + catatanError.message);
        return;
      }

      toast.success(`Langkah intervensi untuk ${stagnantSantri.nama} berhasil dicatat.`);
    }

    setStagnantSantri(null);
    setStagnancyDetail('');
    setStagnancyAction('');
    await loadData();
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle || !annContent) {
      toast.error('Judul dan isi pengumuman harus diisi.');
      return;
    }

    const targets: string[] = [];
    if (annTargets.semua) {
      targets.push('pengampu', 'orangtua', 'koordinator', 'kepala_sekolah', 'tata_usaha');
    } else {
      if (annTargets.pengampu) targets.push('pengampu');
      if (annTargets.orangtua) targets.push('orangtua');
      if (annTargets.kepala_sekolah) targets.push('kepala_sekolah');
    }

    if (targets.length === 0) {
      toast.error('Silakan pilih minimal satu target penerima.');
      return;
    }

    setIsLoading(true);
    try {
      const session = await supabase.auth.getSession();
      const userId = session.data.session?.user.id;
      if (!userId) throw new Error('Sesi tidak valid.');

      const { error } = await supabase.from('pengumuman').insert({
        judul: annTitle,
        isi: annContent,
        pengirim_id: userId,
        pengirim_role: 'koordinator',
        target_role: targets,
      });

      if (error) throw error;

      toast.success('Pengumuman berhasil dipublikasikan!');
      setAnnTitle('');
      setAnnContent('');
      setAnnTargets({
        pengampu: false,
        orangtua: false,
        kepala_sekolah: false,
        semua: false,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan tidak diketahui';
      toast.error('Gagal memublikasikan pengumuman: ' + msg);
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // RESOLVE STAGNASI — UPDATE santri status kembali ke active
  // ---------------------------------------------------------------------------
  const handleResolveStagnancy = async (studentId: string) => {
    setSaveError(null);

    const { error } = await supabase
      .from('santri')
      .update({
        status:           'active',
        stagnancy_reason: null,
        stagnancy_detail: null,
        stagnancy_action: null,
        stagnancy_since:  null,
        updated_at:       new Date().toISOString(),
      })
      .eq('id', studentId);

    if (error) {
      setSaveError('Gagal memperbarui status santri: ' + error.message);
      toast.error('Gagal memperbarui status santri: ' + error.message);
      return;
    }

    toast.success('Santri dikembalikan ke status aktif normal.');
    await loadData();
  };

  // ---------------------------------------------------------------------------
  // APPROVE UKJ — UPDATE ujian_juz + UPDATE hafalan_juz + UPDATE santri
  // Meniru logika approveUjianJuz() di store.ts
  // ---------------------------------------------------------------------------
  const handleApproveUjian = async (ujianId: string) => {
    setSaveError(null);
    const ujian = ujianList.find(u => u.id === ujianId);
    if (!ujian) return;

    // 1. Setujui ujian di tabel ujian_juz
    const { error: approveError } = await supabase
      .from('ujian_juz')
      .update({
        approved_by_koordinator: true,
        koordinator_id:          null,   // nullable sampai auth
        approved_at:             new Date().toISOString(),
        updated_at:              new Date().toISOString(),
      })
      .eq('id', ujianId);

    if (approveError) {
      setSaveError('Gagal menyetujui UKJ: ' + approveError.message);
      toast.error('Gagal menyetujui UKJ: ' + approveError.message);
      return;
    }

    // 2. Jika status lulus → masukkan ke hafalan_juz & update current_juz santri
    if (ujian.status === 'lulus') {
      // Insert hafalan_juz (upsert agar tidak duplikat jika sudah ada)
      const { error: hafalanError } = await supabase.from('hafalan_juz').upsert(
        {
          santri_id:       ujian.santriId,
          juz:             ujian.juz,
          tanggal_selesai: ujian.date,
        },
        { onConflict: 'santri_id,juz' }
      );

      if (hafalanError) {
        console.warn('[KoordinatorDashboard] Gagal insert hafalan_juz:', hafalanError.message);
      }

      // Hitung current_juz baru: juz terkecil yang belum dikuasai
      const { data: hafalanAll } = await supabase
        .from('hafalan_juz')
        .select('juz')
        .eq('santri_id', ujian.santriId);

      if (hafalanAll && hafalanAll.length > 0) {
        const completedJuz = hafalanAll.map((h: { juz: number }) => h.juz);
        const minJuz = Math.min(...completedJuz);
        if (minJuz > 1) {
          await supabase
            .from('santri')
            .update({
              current_juz: minJuz - 1,
              updated_at:  new Date().toISOString(),
            })
            .eq('id', ujian.santriId);
        }
      }
    }

    // Celebrasi konfeti
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 }
    });

    toast.success('Ujian Kenaikan Juz berhasil disetujui!');
    await loadData();
  };

  // ---------------------------------------------------------------------------
  // TAMBAH UJIAN BARU — INSERT ke tabel ujian_juz
  // ---------------------------------------------------------------------------
  const handleAddUjian = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ujianSantriId) return;

    setSaveError(null);

    const { error } = await supabase.from('ujian_juz').insert({
      santri_id:               ujianSantriId,
      juz:                     ujianJuz,
      tanggal_ujian:           new Date().toISOString().split('T')[0],
      jumlah_kesalahan:        ujianKesalahan,
      status:                  ujianStatus,
      approved_by_koordinator: false,
      koordinator_id:          null,
      pengampu_id:             null,
    });

    if (error) {
      setSaveError('Gagal menyimpan ujian: ' + error.message);
      toast.error('Gagal menyimpan ujian: ' + error.message);
      return;
    }

    setShowUjianModal(false);
    toast.success('Log Ujian Kenaikan Juz berhasil dibuat. Silakan klik "Setujui" pada daftar Ujian di bawah untuk verifikasi.');
    await loadData();
  };

  const handleUpdateStagnancyStatus = async (catatanId: string, status: 'proses' | 'selesai' | 'dipantau') => {
    setSaveError(null);
    const { error } = await supabase
      .from('catatan_stagnasi')
      .update({ status_penanganan: status })
      .eq('id', catatanId);

    if (error) {
      setSaveError('Gagal memperbarui status penanganan: ' + error.message);
      toast.error('Gagal memperbarui status penanganan: ' + error.message);
      return;
    }

    toast.success('Status penanganan stagnasi berhasil diperbarui.');
    await loadData();
  };

  const handleAddPekanSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pekanMulai || !pekanSelesai) {
      toast.error('Silakan tentukan tanggal mulai dan selesai.');
      return;
    }

    setSaveError(null);
    setIsLoading(true);

    const keteranganJson = JSON.stringify({
      materiKelas7: pekanMat7,
      materiKelas8: pekanMat8,
      materiKelas9: pekanMat9,
      batasKesalahan: pekanBatasSalah,
      deadlineAkses: pekanDeadline || (pekanSelesai + 'T23:59:59')
    });

    const { error } = await supabase
      .from('jadwal_ujian')
      .insert({
        tanggal_mulai: pekanMulai,
        tanggal_selesai: pekanSelesai,
        status: 'aktif',
        keterangan: keteranganJson
      });

    if (error) {
      setSaveError('Gagal mengaktifkan Pekan Muraja\'ah: ' + error.message);
      toast.error('Gagal mengaktifkan Pekan Muraja\'ah: ' + error.message);
      setIsLoading(false);
      return;
    }

    toast.success('Pekan Muraja\'ah Massal berhasil diaktifkan!');
    setIsLoading(false);
    setPekanMulai('');
    setPekanSelesai('');
    setPekanDeadline('');
    await loadData();
  };

  const handleStopPekanSchedule = async (id: string) => {
    setSaveError(null);
    setIsLoading(true);

    const { error } = await supabase
      .from('jadwal_ujian')
      .update({ status: 'selesai' })
      .eq('id', id);

    if (error) {
      setSaveError('Gagal menghentikan Pekan Muraja\'ah: ' + error.message);
      toast.error('Gagal menghentikan Pekan Muraja\'ah: ' + error.message);
      setIsLoading(false);
      return;
    }

    toast.success('Pekan Muraja\'ah Massal berhasil dihentikan.');
    setIsLoading(false);
    await loadData();
  };

  // Calculated Stats
  const stagnantCount = santriList.filter(s => s.status === 'stagnant').length;
  const pendingUjians = ujianList.filter(u => !u.approvedByKoordinator);

  // ---------------------------------------------------------------------------
  // ANALYTICS — Perbandingan Performa Antar Halaqah
  // ---------------------------------------------------------------------------

  // BarChart: Rata-rata baris sabak lulus per halaqah (keseluruhan 90 hari)
  const getHalaqahBarData = () => {
    const halaqahIds = Object.keys(halaqahMap);
    return halaqahIds.map(hId => {
      const santriIds = santriList.filter(s => s.halaqahId === hId).map(s => s.id);
      const sabakLulus = setorans.filter(
        s => santriIds.includes(s.santriId) && s.type === 'sabak' && s.status === 'lulus'
      );
      const avg = sabakLulus.length > 0
        ? Math.round((sabakLulus.reduce((sum, s) => sum + s.baris, 0) / sabakLulus.length) * 10) / 10
        : 0;
      return {
        halaqah: halaqahMap[hId] || hId,
        'Rata-rata Baris': avg,
        count: sabakLulus.length,
      };
    });
  };

  // LineChart: Tren rata-rata baris sabak lulus per halaqah per bulan (3 bulan terakhir)
  const getHalaqahTrendData = () => {
    // Bangun daftar 3 bulan terakhir sebagai label
    const months: string[] = [];
    const now = new Date();
    for (let i = 2; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
      months.push(label);
    }

    const halaqahIds = Object.keys(halaqahMap);

    // Untuk setiap bulan, hitung avg per halaqah
    return months.map(monthLabel => {
      const [monthStr, yearStr] = monthLabel.split(' ');
      const monthNames: Record<string, number> = {
        Jan: 0, Feb: 1, Mar: 2, Apr: 3, Mei: 4, Jun: 5,
        Jul: 6, Agu: 7, Sep: 8, Okt: 9, Nov: 10, Des: 11
      };
      const mIdx = monthNames[monthStr] ?? -1;
      const yFull = mIdx !== -1 ? parseInt('20' + yearStr) : -1;

      const entry: Record<string, string | number> = { bulan: monthLabel };

      halaqahIds.forEach(hId => {
        const santriIds = santriList.filter(s => s.halaqahId === hId).map(s => s.id);
        const monthSetorans = setorans.filter(s => {
          if (!santriIds.includes(s.santriId) || s.type !== 'sabak' || s.status !== 'lulus') return false;
          const d = new Date(s.date);
          return d.getMonth() === mIdx && d.getFullYear() === yFull;
        });
        const avg = monthSetorans.length > 0
          ? Math.round((monthSetorans.reduce((sum, s) => sum + s.baris, 0) / monthSetorans.length) * 10) / 10
          : 0;
        entry[halaqahMap[hId] || hId] = avg;
      });

      return entry;
    });
  };

  // Warna per halaqah untuk LineChart
  const HALAQAH_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  const getRotationComparison = () => {
    if (!teacherRotationDate || !selectedHalaqahRotation) return null;
    const santriIds = santriList.filter(s => s.halaqahId === selectedHalaqahRotation).map(s => s.id);
    
    const beforeSetorans = setorans.filter(
      s => santriIds.includes(s.santriId) && s.type === 'sabak' && s.status === 'lulus' && s.date < teacherRotationDate
    );
    const afterSetorans = setorans.filter(
      s => santriIds.includes(s.santriId) && s.type === 'sabak' && s.status === 'lulus' && s.date >= teacherRotationDate
    );

    const beforeAvg = beforeSetorans.length > 0
      ? Math.round((beforeSetorans.reduce((sum, s) => sum + s.baris, 0) / beforeSetorans.length) * 10) / 10
      : 0;

    const afterAvg = afterSetorans.length > 0
      ? Math.round((afterSetorans.reduce((sum, s) => sum + s.baris, 0) / afterSetorans.length) * 10) / 10
      : 0;

    return {
      beforeAvg,
      beforeCount: beforeSetorans.length,
      afterAvg,
      afterCount: afterSetorans.length,
      percentageChange: beforeAvg > 0 ? Math.round(((afterAvg - beforeAvg) / beforeAvg) * 100) : 0
    };
  };

  const renderDashboardPanel = () => {
    const activeCount = santriList.filter(s => s.status === 'active').length;
    const pendingUkjCount = pendingUjians.length;

    return (
      <div className="space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-sm border-l-4 border-l-red-500">
            <div>
              <p className="text-xs text-slate-405 font-bold uppercase tracking-wider">Santri Perlu Intervensi</p>
              <h3 className="text-2xl font-extrabold text-red-650 dark:text-red-400 mt-1">{stagnantCount} Santri</h3>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-950/30 text-red-650 dark:text-red-400 rounded-xl">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-sm border-l-4 border-l-indigo-500">
            <div>
              <p className="text-xs text-slate-405 font-bold uppercase tracking-wider">Menunggu Kelulusan UKJ</p>
              <h3 className="text-2xl font-extrabold text-indigo-655 dark:text-indigo-400 mt-1">{pendingUkjCount} Ujian</h3>
            </div>
            <div className="p-3 bg-indigo-100 dark:bg-indigo-950/30 text-indigo-650 dark:text-indigo-400 rounded-xl">
              <Award className="h-6 w-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-sm border-l-4 border-l-teal-500">
            <div>
              <p className="text-xs text-slate-405 font-bold uppercase tracking-wider">Total Santri Aktif</p>
              <h3 className="text-2xl font-extrabold text-teal-600 dark:text-teal-400 mt-1">{activeCount} Santri</h3>
            </div>
            <div className="p-3 bg-teal-100 dark:bg-teal-950/30 text-teal-605 dark:text-teal-400 rounded-xl">
              <Users className="h-6 w-6" />
            </div>
          </div>

          {/* Halaqah Performance Summary */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex items-center justify-between">
              <span>📊 Ringkasan Performa per Halaqah</span>
              <span className="text-[10px] text-slate-455 font-medium">90 Hari Terakhir</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-slate-400 uppercase tracking-wider border-b border-slate-150 dark:border-slate-850 pb-2">
                    <th className="pb-2 font-bold">Nama Halaqah</th>
                    <th className="pb-2 font-bold">Rata-rata Baris Sabak</th>
                    <th className="pb-2 font-bold">Jumlah Setoran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {getHalaqahBarData().map((h, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/10">
                      <td className="py-3 font-semibold text-slate-800 dark:text-slate-200">{h.halaqah}</td>
                      <td className="py-3 font-bold text-indigo-600 dark:text-indigo-400">{h['Rata-rata Baris']} baris/hari</td>
                      <td className="py-3 text-slate-500">{h.count} setoran</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Buat Pengumuman Form */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-2">
            <Megaphone className="h-5 w-5 text-indigo-650 dark:text-indigo-400" />
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
              Buat Pengumuman Baru
            </h3>
          </div>
          
          <form onSubmit={handleCreateAnnouncement} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Judul Pengumuman</label>
              <input
                type="text"
                placeholder="Masukkan judul pengumuman..."
                value={annTitle}
                onChange={e => setAnnTitle(e.target.value)}
                required
                className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Isi Pengumuman</label>
              <textarea
                placeholder="Tuliskan isi pengumuman secara rinci..."
                value={annContent}
                onChange={e => setAnnContent(e.target.value)}
                required
                rows={4}
                className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Target Penerima</label>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center space-x-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <input
                    type="checkbox"
                    checked={annTargets.pengampu || false}
                    onChange={e => setAnnTargets(prev => ({ ...prev, pengampu: e.target.checked, semua: false }))}
                    className="rounded text-indigo-650 focus:ring-indigo-500 h-3.5 w-3.5"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300">Pengampu</span>
                </label>
                <label className="flex items-center space-x-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <input
                    type="checkbox"
                    checked={annTargets.orangtua || false}
                    onChange={e => setAnnTargets(prev => ({ ...prev, orangtua: e.target.checked, semua: false }))}
                    className="rounded text-indigo-650 focus:ring-indigo-500 h-3.5 w-3.5"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300">Orang Tua</span>
                </label>
                <label className="flex items-center space-x-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <input
                    type="checkbox"
                    checked={annTargets.kepala_sekolah || false}
                    onChange={e => setAnnTargets(prev => ({ ...prev, kepala_sekolah: e.target.checked, semua: false }))}
                    className="rounded text-indigo-650 focus:ring-indigo-500 h-3.5 w-3.5"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300">Kepala Sekolah</span>
                </label>
                <label className="flex items-center space-x-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <input
                    type="checkbox"
                    checked={annTargets.semua || false}
                    onChange={e => setAnnTargets(prev => ({
                      ...prev,
                      semua: e.target.checked,
                      pengampu: false,
                      orangtua: false,
                      kepala_sekolah: false,
                    }))}
                    className="rounded text-indigo-650 focus:ring-indigo-500 h-3.5 w-3.5"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-bold">Semua Peran</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-gradient-to-r from-indigo-650 to-violet-600 hover:from-indigo-550 hover:to-violet-500 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-md transition-all active:scale-98 disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Mengirim Pengumuman...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Kirim Pengumuman</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  };

  const renderGradePanel = () => {
    const filteredHistory = selectedStudentForHistory 
      ? riwayatGrades.filter(r => r.santri_id === selectedStudentForHistory)
      : riwayatGrades;

    return (
      <div className="space-y-6">
        {/* Grade Management Section (F3.1) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="font-extrabold text-sm text-slate-850 dark:text-slate-150 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex items-center justify-between">
            <span>📋 Manajemen Grade &amp; Target Santri</span>
            <span className="text-[10px] text-slate-450">F3.1</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
                  <th className="pb-2 font-bold">Nama Santri</th>
                  <th className="pb-2 font-bold">Grade Aktual</th>
                  <th className="pb-2 font-bold">Target Harian</th>
                  <th className="pb-2 font-bold">Halaqah</th>
                  <th className="pb-2 text-right font-bold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {santriList.map(student => (
                  <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/10 transition-colors">
                    <td className="py-3 font-bold text-slate-800 dark:text-slate-200">{student.nama}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${student.grade === 'Tahfiz' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/45 dark:text-emerald-400' : student.grade === 'Takmil' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/45 dark:text-blue-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/45 dark:text-amber-400'}`}>
                        {student.grade}
                      </span>
                    </td>
                    <td className="py-3 font-semibold text-slate-600 dark:text-slate-400">{student.targetBaris} baris/hari</td>
                    <td className="py-3 text-slate-500">{halaqahMap[student.halaqahId] || 'Halaqah'}</td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => {
                          setEditingSantri(student);
                          setNewGrade(student.grade);
                        }}
                        disabled={isLoading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-2.5 py-1 rounded transition-colors disabled:opacity-60"
                      >
                        Ubah Grade
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Riwayat Perubahan Grade */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 gap-3">
            <h3 className="font-extrabold text-sm text-slate-850 dark:text-slate-150 flex items-center space-x-1.5">
              <History className="h-4 w-4 text-indigo-500" />
              <span>Riwayat Perubahan Grade Santri</span>
            </h3>
            <select
              value={selectedStudentForHistory}
              onChange={e => setSelectedStudentForHistory(e.target.value)}
              className="text-xs p-1.5 border border-slate-250 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none"
            >
              <option value="">Semua Santri</option>
              {santriList.map(s => (
                <option key={s.id} value={s.id}>{s.nama}</option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto max-h-60">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
                  <th className="pb-2 font-bold">Santri</th>
                  <th className="pb-2 font-bold">Dari &rarr; Ke</th>
                  <th className="pb-2 font-bold">Target Baru</th>
                  <th className="pb-2 font-bold">Tanggal Ubah</th>
                  <th className="pb-2 font-bold">Alasan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {filteredHistory.map((r, idx) => {
                  const student = santriList.find(s => s.id === r.santri_id);
                  return (
                    <tr key={r.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/10">
                      <td className="py-3 font-semibold">{student?.nama || 'Santri'}</td>
                      <td className="py-3 font-semibold">
                        <span className="text-slate-400">{r.grade_lama}</span> &rarr; <span className="text-indigo-650 dark:text-indigo-400 font-bold">{r.grade_baru}</span>
                      </td>
                      <td className="py-3 text-slate-500">{r.target_baris_baru} baris/hari</td>
                      <td className="py-3 text-slate-500">{r.tanggal_ubah}</td>
                      <td className="py-3 text-slate-450 italic">&ldquo;{r.alasan}&rdquo;</td>
                    </tr>
                  );
                })}
                {filteredHistory.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-4 text-slate-400 italic">Belum ada riwayat perubahan grade.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderStagnasiPanel = () => {
    return (
      <div className="space-y-6">
        {/* Stagnancy Monitoring & Interventions (F3.2) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="font-extrabold text-sm text-slate-850 dark:text-slate-150 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex items-center justify-between">
            <span>⚠ Pemantauan Stagnasi &amp; Langkah Korektif</span>
            <span className="text-[10px] text-slate-450">F3.2</span>
          </h3>

          <div className="space-y-4">
            {santriList.filter(s => s.status === 'stagnant').map(stagnant => (
              <div key={stagnant.id} className="border border-red-200 dark:border-red-950/55 p-4 rounded-xl bg-red-50/10 dark:bg-red-950/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white">{stagnant.nama}</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-red-100 text-red-805 dark:bg-red-950/50 dark:text-red-300 rounded">
                      Sebab: {stagnant.stagnancyReason}
                    </span>
                  </div>
                  <button
                    onClick={() => handleResolveStagnancy(stagnant.id)}
                    disabled={isLoading}
                    className="text-emerald-600 dark:text-emerald-450 font-bold text-xs hover:underline flex items-center disabled:opacity-60"
                  >
                    <Check className="h-3.5 w-3.5 mr-0.5" /> Tandai Normal
                  </button>
                </div>

                <div className="text-xs space-y-1.5 text-slate-650 dark:text-slate-400">
                  <p><span className="font-bold">Analisis Kendala:</span> {stagnant.stagnancyDetail}</p>
                  <p><span className="font-bold">Langkah Korektif:</span> {stagnant.stagnancyAction}</p>
                </div>

                <button
                  onClick={() => {
                    setStagnantSantri(stagnant);
                    setStagnancyReason(stagnant.stagnancyReason || 'game');
                    setStagnancyDetail(stagnant.stagnancyDetail || '');
                    setStagnancyAction(stagnant.stagnancyAction || '');
                  }}
                  className="text-xs font-bold text-indigo-650 dark:text-indigo-400 hover:underline"
                >
                  Perbarui Rencana &rarr;
                </button>
              </div>
            ))}

            {santriList.filter(s => s.status === 'stagnant').length === 0 && (
              <p className="text-center text-xs text-slate-450 py-4 italic">Tidak ada santri yang mengalami stagnasi/stuck saat ini.</p>
            )}
            
            {/* Simulator: Flag Stagnancy button */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  const activeOnes = santriList.filter(s => s.status !== 'stagnant');
                  if (activeOnes.length > 0) {
                    setStagnantSantri(activeOnes[0]);
                    setStagnancyReason('game');
                    setStagnancyDetail('');
                    setStagnancyAction('');
                    setStagnantSearchQuery('');
                  } else {
                    toast.error('Semua santri sudah berstatus stagnan.');
                  }
                }}
                disabled={isLoading}
                className="inline-flex items-center text-xs font-bold text-red-600 dark:text-red-400 hover:underline disabled:opacity-60"
              >
                + Flag Stagnansi Santri Baru (Simulasi)
              </button>
            </div>
          </div>
        </div>

        {/* Catatan Intervensi Historis */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="font-extrabold text-sm text-slate-855 dark:text-slate-150 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            📜 Catatan Langkah Korektif &amp; Penanganan
          </h3>

          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
            {catatanStagnasiList.map((c, idx) => {
              const student = santriList.find(s => s.id === c.santri_id);
              return (
                <div key={c.id || idx} className="p-4 border border-slate-150 dark:border-slate-855 rounded-xl text-xs space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-100">{student?.nama || 'Santri'}</h4>
                      <p className="text-[10px] text-slate-400">{c.tanggal} · Kategori: <span className="font-semibold text-slate-500 capitalize">{c.penyebab}</span></p>
                    </div>
                    
                    <div className="flex items-center space-x-1.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        c.status_penanganan === 'selesai' 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' 
                          : c.status_penanganan === 'dipantau'
                          ? 'bg-amber-100 text-amber-850 dark:bg-amber-950/40 dark:text-amber-450'
                          : 'bg-red-100 text-red-805 dark:bg-red-950/45 dark:text-red-400'
                      }`}>
                        {c.status_penanganan}
                      </span>
                      
                      <select
                        value={c.status_penanganan}
                        onChange={e => handleUpdateStagnancyStatus(c.id, e.target.value as 'proses' | 'selesai' | 'dipantau')}
                        className="text-[10px] p-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded focus:outline-none"
                      >
                        <option value="proses">Proses</option>
                        <option value="dipantau">Dipantau</option>
                        <option value="selesai">Selesai</option>
                      </select>
                    </div>
                  </div>

                  <p className="text-slate-600 dark:text-slate-350"><strong className="text-slate-400">Analisis:</strong> {c.detail}</p>
                  <p className="text-slate-600 dark:text-slate-350"><strong className="text-slate-400">Langkah:</strong> {c.langkah_korektif}</p>
                </div>
              );
            })}
            {catatanStagnasiList.length === 0 && (
              <p className="text-center py-4 text-slate-400 italic">Belum ada log catatan stagnasi.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderUkjPanel = () => {
    const pending = ujianList.filter(u => !u.approvedByKoordinator);
    const approved = ujianList.filter(u => u.approvedByKoordinator);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Ujian Kenaikan Juz Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                <Award className="h-5 w-5 text-indigo-650 dark:text-indigo-400" />
                <span>UKJ Menunggu Kelulusan</span>
              </h3>
              <button
                onClick={() => setShowUjianModal(true)}
                disabled={isLoading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-2.5 py-1.5 rounded-lg disabled:opacity-60 shadow-sm"
              >
                + Log UKJ Baru
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto max-h-[300px] pr-1">
              {pending.map(ujian => {
                const student = santriList.find(s => s.id === ujian.santriId);
                return (
                  <div key={ujian.id} className="border border-slate-150 dark:border-slate-800 p-3.5 rounded-xl text-xs space-y-2 bg-indigo-500/5">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-855 dark:text-slate-200">{student?.nama || 'Santri'}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 rounded">
                        Juz {ujian.juz}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center text-[10px] text-slate-500">
                      <span>Kesalahan: <strong className="text-red-500">{ujian.kesalahan} kali</strong></span>
                      <span>Tanggal: {ujian.date}</span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>Status Hasil: <span className={`font-bold uppercase ${ujian.status === 'lulus' ? 'text-emerald-600' : 'text-red-650'}`}>{ujian.status}</span></span>
                    </div>

                    <div className="flex items-center space-x-2 mt-2">
                      <button
                        onClick={() => handleApproveUjian(ujian.id)}
                        disabled={isLoading}
                        className="flex-grow bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 rounded text-[10px] shadow disabled:opacity-60"
                      >
                        Setujui &amp; Verifikasi Kelulusan
                      </button>
                    </div>
                  </div>
                );
              })}
              {pending.length === 0 && (
                <p className="text-center py-6 text-slate-450 italic">Tidak ada ujian yang menunggu kelulusan saat ini.</p>
              )}
            </div>
          </div>

          {/* List Santri Ready for UKJ */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              👶 Daftar Santri &amp; Target Juz Ujian
            </h3>
            <div className="space-y-3 overflow-y-auto max-h-[300px]">
              {santriList.map(s => {
                return (
                  <div key={s.id} className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-850 rounded-xl text-xs">
                    <div>
                      <p className="font-bold text-slate-805 dark:text-slate-200">{s.nama}</p>
                      <p className="text-[10px] text-slate-450">{s.kelas} · Sedang Juz {s.currentJuz} · Grade: {s.grade}</p>
                    </div>
                    <button
                      onClick={() => {
                        setUjianSantriId(s.id);
                        setUjianJuz(s.currentJuz);
                        setShowUjianModal(true);
                      }}
                      className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-705 dark:text-slate-300 font-bold px-2 py-1 rounded"
                    >
                      Daftarkan UKJ
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Riwayat UKJ */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="font-extrabold text-sm text-slate-850 dark:text-slate-150 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex items-center space-x-1.5">
            <History className="h-4 w-4 text-indigo-500" />
            <span>Riwayat Kelulusan UKJ (Ujian Kenaikan Juz)</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
                  <th className="pb-2 font-bold">Nama Santri</th>
                  <th className="pb-2 font-bold">Juz</th>
                  <th className="pb-2 font-bold">Kesalahan</th>
                  <th className="pb-2 font-bold">Hasil Ujian</th>
                  <th className="pb-2 font-bold">Tanggal</th>
                  <th className="pb-2 font-bold">Verifikasi Koordinator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {approved.map((ujian, idx) => {
                  const student = santriList.find(s => s.id === ujian.santriId);
                  return (
                    <tr key={ujian.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/10">
                      <td className="py-3 font-semibold">{student?.nama || 'Santri'}</td>
                      <td className="py-3 font-bold text-indigo-650 dark:text-indigo-400">Juz {ujian.juz}</td>
                      <td className="py-3">{ujian.kesalahan} kali</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${ujian.status === 'lulus' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40' : 'bg-red-100 text-red-805 dark:bg-red-950/40'}`}>
                          {ujian.status === 'lulus' ? 'Lulus' : 'Mengulang / Remedial'}
                        </span>
                      </td>
                      <td className="py-3 text-slate-500">{ujian.date}</td>
                      <td className="py-3 text-emerald-600 font-bold">✓ Approved</td>
                    </tr>
                  );
                })}
                {approved.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-slate-400 italic">Belum ada riwayat UKJ yang disetujui.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderPekanPanel = () => {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Scheduler Form */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="font-extrabold text-sm text-slate-850 dark:text-slate-150 border-b border-slate-100 dark:border-slate-800 pb-3 mb-5 flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-indigo-505" />
              <span>Jadwalkan Pekan Muraja&apos;ah Massal</span>
            </h3>

            <form onSubmit={handleAddPekanSchedule} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Tanggal Mulai</label>
                  <input
                    type="date"
                    value={pekanMulai}
                    onChange={e => setPekanMulai(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-55 dark:bg-slate-800 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Tanggal Selesai</label>
                  <input
                    type="date"
                    value={pekanSelesai}
                    onChange={e => setPekanSelesai(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-55 dark:bg-slate-800 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Materi Ujian Kelas 7</label>
                <input
                  type="text"
                  value={pekanMat7}
                  onChange={e => setPekanMat7(e.target.value)}
                  placeholder="cth: Juz 30"
                  required
                  className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-55 dark:bg-slate-800 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Materi Ujian Kelas 8</label>
                <input
                  type="text"
                  value={pekanMat8}
                  onChange={e => setPekanMat8(e.target.value)}
                  placeholder="cth: Juz 29"
                  required
                  className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-55 dark:bg-slate-800 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Materi Ujian Kelas 9</label>
                <input
                  type="text"
                  value={pekanMat9}
                  onChange={e => setPekanMat9(e.target.value)}
                  placeholder="cth: Juz 28"
                  required
                  className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-55 dark:bg-slate-800 rounded-lg focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Batas Kesalahan (Maks)</label>
                  <select
                    value={pekanBatasSalah}
                    onChange={e => setPekanBatasSalah(Number(e.target.value))}
                    className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-55 dark:bg-slate-800 rounded-lg focus:outline-none"
                  >
                    <option value={1}>Maks 1 / hal</option>
                    <option value={2}>Maks 2 / hal</option>
                    <option value={3}>Maks 3 / hal</option>
                    <option value={4}>Maks 4 / hal</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Deadline Akses</label>
                  <input
                    type="datetime-local"
                    value={pekanDeadline}
                    onChange={e => setPekanDeadline(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-55 dark:bg-slate-800 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-650 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-md flex items-center justify-center space-x-1.5"
              >
                <Plus className="h-4 w-4" />
                <span>Buat Jadwal Massal</span>
              </button>
            </form>
          </div>

          {/* Schedule Feed Listing */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="font-extrabold text-sm text-slate-850 dark:text-slate-150 border-b border-slate-100 dark:border-slate-800 pb-3 mb-5">
              📅 Daftar Jadwal Pekan Muraja&apos;ah Massal Aktif
            </h3>

            <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
              {pekanSchedules.map((schedule, idx) => (
                <div key={schedule.id || idx} className="p-4 border border-slate-150 dark:border-slate-850 rounded-xl text-xs space-y-2 bg-indigo-500/5">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-805">
                    <span className="font-bold text-slate-800 dark:text-slate-100">
                      📅 {schedule.tanggalMulai} s/d {schedule.tanggalSelesai}
                    </span>
                    {schedule.status === 'aktif' ? (
                      <button
                        onClick={() => handleStopPekanSchedule(schedule.id)}
                        className="text-red-650 font-bold hover:underline"
                      >
                        Hentikan
                      </button>
                    ) : (
                      <span className="text-slate-450 dark:text-slate-500 italic font-medium">Selesai</span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    <div className="p-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded">
                      <span className="font-semibold text-slate-400 block uppercase">Materi Kls 7</span>
                      <strong className="text-slate-700 dark:text-slate-300 mt-1 block">{schedule.materiKelas7}</strong>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded">
                      <span className="font-semibold text-slate-400 block uppercase">Materi Kls 8</span>
                      <strong className="text-slate-700 dark:text-slate-300 mt-1 block">{schedule.materiKelas8}</strong>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded">
                      <span className="font-semibold text-slate-400 block uppercase">Materi Kls 9</span>
                      <strong className="text-slate-700 dark:text-slate-300 mt-1 block">{schedule.materiKelas9}</strong>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1">
                    <span>Kesalahan: <strong>Maks {schedule.batasKesalahan} / hal</strong></span>
                    <span>Deadline input: <strong>{new Date(schedule.deadlineAkses).toLocaleString('id-ID')}</strong></span>
                  </div>
                </div>
              ))}

              {pekanSchedules.length === 0 && (
                <p className="text-center py-10 text-slate-450 italic">Belum ada jadwal Pekan Muraja&apos;ah massal terdaftar.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAnalitikPanel = () => {
    const comparison = getRotationComparison();

    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2 mb-2">
          <BarChart2 className="h-5 w-5 text-indigo-650 dark:text-indigo-400" />
          <h2 className="font-extrabold text-base text-slate-805 dark:text-slate-100">
            Analitik Performa Antar Halaqah
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart: Avg baris per halaqah */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
            <h3 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider mb-1">
              📊 Rata-rata Baris Sabak per Halaqah
            </h3>
            <p className="text-[10px] text-slate-500 mb-4">90 hari terakhir · hanya sabak lulus</p>
            {getHalaqahBarData().length > 0 ? (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getHalaqahBarData()} barCategoryGap="35%">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="halaqah" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(v) => [`${Number(v)} baris`, 'Rata-rata']}
                      labelFormatter={(l) => `Halaqah ${l}`}
                    />
                    <Bar dataKey="Rata-rata Baris" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-xs text-slate-400">
                Belum ada data setoran yang cukup untuk analitik.
              </div>
            )}
          </div>

          {/* Line Chart: Tren baris per halaqah per bulan */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
            <h3 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider mb-1">
              📈 Tren Performa Halaqah (3 Bulan Terakhir)
            </h3>
            <p className="text-[10px] text-slate-500 mb-4">Rata-rata baris sabak lulus per bulan per halaqah</p>
            {Object.keys(halaqahMap).length > 0 ? (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={getHalaqahTrendData()}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="bulan" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [`${Number(v)} baris`]} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {Object.keys(halaqahMap).map((hId, idx) => (
                      <Line
                        key={hId}
                        type="monotone"
                        dataKey={halaqahMap[hId] || hId}
                        stroke={HALAQAH_COLORS[idx % HALAQAH_COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-xs text-slate-400">
                Belum ada data halaqah untuk ditampilkan.
              </div>
            )}
          </div>
        </div>

        {/* Teacher Rotation Analysis Section */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
          <h3 className="font-extrabold text-sm text-slate-850 dark:text-slate-150 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex items-center space-x-2">
            <Clock className="h-4.5 w-4.5 text-indigo-500" />
            <span>🔄 Analisis Tren Sebelum / Sesudah Rotasi Pengampu</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Pilih Halaqah</label>
              <select
                value={selectedHalaqahRotation}
                onChange={e => setSelectedHalaqahRotation(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none"
              >
                <option value="">-- Pilih Halaqah --</option>
                {Object.keys(halaqahMap).map(hId => (
                  <option key={hId} value={hId}>{halaqahMap[hId]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Tanggal Rotasi Pengampu</label>
              <input
                type="date"
                value={teacherRotationDate}
                onChange={e => setTeacherRotationDate(e.target.value)}
                className="w-full text-xs p-2 border border-slate-200 dark:border-slate-700 bg-slate-55 dark:bg-slate-800 rounded-lg focus:outline-none"
              />
            </div>
            <div className="flex items-end">
              <span className="text-[10px] text-slate-400 leading-normal">
                Analisis ini menghitung performa hafalan santri di halaqah terpilih sebelum dan sesudah tanggal rotasi untuk melihat dampak pergantian ustadz.
              </span>
            </div>
          </div>

          {comparison && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-indigo-100 dark:border-indigo-950/40 rounded-xl bg-indigo-500/5">
              <div className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Rata-rata Sebelum Rotasi</span>
                <strong className="block text-lg font-extrabold text-slate-705 dark:text-slate-300 mt-1">{comparison.beforeAvg} baris/hari</strong>
                <span className="text-[9px] text-slate-455 block">{comparison.beforeCount} setoran sabak lulus</span>
              </div>
              <div className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-440 font-bold uppercase">Rata-rata Sesudah Rotasi</span>
                <strong className="block text-lg font-extrabold text-indigo-650 mt-1">{comparison.afterAvg} baris/hari</strong>
                <span className="text-[9px] text-slate-455 block">{comparison.afterCount} setoran sabak lulus</span>
              </div>
              <div className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl flex flex-col justify-center">
                <span className="text-[10px] text-slate-440 font-bold uppercase">Perubahan Performa</span>
                <div className={`text-lg font-extrabold mt-1 flex items-center ${comparison.percentageChange >= 0 ? 'text-emerald-600' : 'text-red-655'}`}>
                  <span>{comparison.percentageChange >= 0 ? '+' : ''}{comparison.percentageChange}%</span>
                  <span className="text-[9px] font-bold ml-2 text-slate-455">({comparison.percentageChange >= 0 ? 'Meningkat' : 'Menurun'})</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Report Downloader Component */}
        <div className="mt-8">
          <ReportDownloader santriList={santriList} halaqahMap={halaqahMap} />
        </div>
      </div>
    );
  };

  const renderActivePanel = () => {
    switch (activeMenu) {
      case 'dashboard': return renderDashboardPanel();
      case 'grade': return renderGradePanel();
      case 'stagnasi': return renderStagnasiPanel();
      case 'ukj': return renderUkjPanel();
      case 'pekan': return renderPekanPanel();
      case 'analitik': return renderAnalitikPanel();
      default: return renderDashboardPanel();
    }
  };

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
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'grade', label: 'Manajemen Grade', icon: BookOpen },
            { id: 'stagnasi', label: 'Stagnasi', icon: AlertTriangle, badge: stagnantCount },
            { id: 'ukj', label: 'Ujian UKJ', icon: Award, badge: pendingUjians.length },
            { id: 'pekan', label: 'Pekan Muraja\'ah', icon: Calendar },
            { id: 'analitik', label: 'Analitik', icon: TrendingUp },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeMenu === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveMenu(item.id as 'dashboard' | 'grade' | 'stagnasi' | 'ukj' | 'pekan' | 'analitik')}
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
          { id: 'grade', label: 'Grade', icon: BookOpen },
          { id: 'stagnasi', label: 'Stagnasi', icon: AlertTriangle, badge: stagnantCount },
          { id: 'ukj', label: 'UKJ', icon: Award, badge: pendingUjians.length },
          { id: 'pekan', label: 'Pekan', icon: Calendar },
          { id: 'analitik', label: 'Analitik', icon: TrendingUp },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeMenu === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveMenu(item.id as 'dashboard' | 'grade' | 'stagnasi' | 'ukj' | 'pekan' | 'analitik')}
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

          {renderActivePanel()}
        </div>
      </div>

      {/* Grade Edit Modal Form Overlay */}
      {editingSantri && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-sm shadow-xl space-y-4 animate-in zoom-in-95 duration-200">
            <h4 className="font-extrabold text-base">Ubah Klasifikasi Grade</h4>
            <p className="text-xs text-slate-500">Sesuaikan target hafalan {editingSantri.nama} secara instan.</p>
            
            <form onSubmit={handleUpdateGrade} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400">Pilih Grade Baru</label>
                <select
                  value={newGrade}
                  onChange={e => setNewGrade(e.target.value as 'Tahsin' | 'Takmil' | 'Tahfiz')}
                  className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none"
                >
                  <option value="Tahsin">Tahsin (Target: 2-3 baris/hari)</option>
                  <option value="Takmil">Takmil (Target: 7 baris/hari)</option>
                  <option value="Tahfiz">Tahfiz (Target: 10-15 baris/hari)</option>
                </select>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSantri(null)}
                  className="flex-grow bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-355 py-2 rounded-lg text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-grow bg-indigo-650 hover:bg-indigo-750 text-white py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-60 shadow"
                >
                  Simpan Grade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stagnancy Intervention Form Modal */}
      {stagnantSantri && !editingSantri && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-xl space-y-4 animate-in zoom-in-95 duration-200">
            <h4 className="font-extrabold text-base flex items-center space-x-1.5 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <span>Analisis Kendala &amp; Intervensi Stagnasi</span>
            </h4>
            
            {stagnantSantri.status !== 'stagnant' ? (
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-slate-400">Pilih Santri yang Stagnan</label>
                <input
                  type="text"
                  placeholder="Cari nama santri..."
                  value={stagnantSearchQuery}
                  onChange={e => handleSearchChange(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500"
                />
                <select
                  value={stagnantSantri.id}
                  onChange={e => {
                    const selected = santriList.find(s => s.id === e.target.value);
                    if (selected) {
                      setStagnantSantri(selected);
                    }
                  }}
                  className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none"
                >
                  {filteredActiveOnes.map(s => (
                    <option key={s.id} value={s.id}>{s.nama} ({s.kelas})</option>
                  ))}
                </select>
                {filteredActiveOnes.length === 0 && (
                  <p className="text-[10px] text-red-500 font-semibold italic">Tidak ada santri yang cocok dengan pencarian.</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 font-medium">
                Catat analisis penyebab dan program penanganan untuk <span className="font-bold">{stagnantSantri.nama}</span>.
              </p>
            )}
            
            <form onSubmit={handleSaveIntervention} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400">Kategori Penyebab</label>
                <select
                  value={stagnancyReason}
                  onChange={e => setStagnancyReason(e.target.value as 'keluarga' | 'psikososial' | 'game' | 'lainnya')}
                  className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none"
                >
                  <option value="game">Kecanduan Game / Gadget di Akhir Pekan</option>
                  <option value="keluarga">Masalah Keluarga / Kurang Dukungan Ortu</option>
                  <option value="psikososial">Tekanan Psikososial / Stres di Kelas</option>
                  <option value="lainnya">Penyebab Lainnya / Sakit / Kurang Motivasi</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400">Detail Analisis Kendala</label>
                <textarea
                  value={stagnancyDetail}
                  onChange={e => setStagnancyDetail(e.target.value)}
                  placeholder="Ceritakan temuan Anda terkait penyebab anak stuck..."
                  required
                  rows={2}
                  className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400">Rencana Tindakan Korektif</label>
                <textarea
                  value={stagnancyAction}
                  onChange={e => setStagnancyAction(e.target.value)}
                  placeholder="Langkah nyata yang diambil (misalnya: Panggil orang tua, konseling harian, penahanan HP)..."
                  required
                  rows={2}
                  className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStagnantSantri(null)}
                  className="flex-grow bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 py-2 rounded-lg text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isLoading || (stagnantSantri.status !== 'stagnant' && filteredActiveOnes.length === 0)}
                  className="flex-grow bg-red-650 hover:bg-red-750 text-white py-2 rounded-lg text-xs font-bold disabled:opacity-60 shadow"
                >
                  Simpan Tindakan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Register New Exam Modal (Simulator) */}
      {showUjianModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-sm shadow-xl space-y-4 animate-in zoom-in-95 duration-200">
            <h4 className="font-extrabold text-base">Catat Log Ujian Kenaikan Juz</h4>
            
            <form onSubmit={handleAddUjian} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400">Pilih Santri</label>
                <select
                  value={ujianSantriId}
                  onChange={e => setUjianSantriId(e.target.value)}
                  required
                  className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none"
                >
                  <option value="">-- Pilih Santri --</option>
                  {santriList.map(s => (
                    <option key={s.id} value={s.id}>{s.nama}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400">Juz Ujian</label>
                  <input
                    type="number"
                    value={ujianJuz}
                    onChange={e => setUjianJuz(Number(e.target.value))}
                    min={1}
                    max={30}
                    className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400">Kesalahan Halaman</label>
                  <input
                    type="number"
                    value={ujianKesalahan}
                    onChange={e => setUjianKesalahan(Number(e.target.value))}
                    className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400">Status Hasil</label>
                <select
                  value={ujianStatus}
                  onChange={e => setUjianStatus(e.target.value as 'lulus' | 'mengulang')}
                  className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none"
                >
                  <option value="lulus">Lulus Juz (Batas kesalahan &le; 4)</option>
                  <option value="mengulang">Mengulang (Kesalahan &gt; 4)</option>
                </select>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUjianModal(false)}
                  className="flex-grow bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-705 dark:text-slate-355 py-2 rounded-lg text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-grow bg-indigo-650 hover:bg-indigo-750 text-white py-2 rounded-lg text-xs font-bold disabled:opacity-60 shadow"
                >
                  Simpan Ujian
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
