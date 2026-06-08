'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import RoleHeader from '@/components/RoleHeader';
import PengumumanPopup from '@/components/PengumumanPopup';
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
  BookOpen,
  LayoutDashboard,
  BarChart2,
  FileText,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Loader2,
  FileSpreadsheet,
  AlertCircle,
  Megaphone,
  Send
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { UserOptions } from 'jspdf-autotable';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: UserOptions) => jsPDF;
  }
}

interface ReportLog {
  id: string;
  tipe: string;
  periode: string;
  format: 'PDF' | 'Excel';
  timestamp: string;
}

const HALAQAH_COLORS = ['#d97706', '#f59e0b', '#fbbf24', '#f59e0b', '#b45309', '#78350f'];

interface MenuItem {
  id: 'ringkasan' | 'analitik' | 'pemantauan' | 'arsip' | 'laporan';
  name: string;
  shortName: string;
  icon: React.ComponentType<{ className?: string }>;
}

const MENU_ITEMS: MenuItem[] = [
  { id: 'ringkasan', name: 'Ringkasan Eksekutif', shortName: 'Ringkasan', icon: LayoutDashboard },
  { id: 'analitik', name: 'Analitik Program', shortName: 'Analitik', icon: BarChart2 },
  { id: 'pemantauan', name: 'Pemantauan Santri', shortName: 'Pemantauan', icon: Users },
  { id: 'arsip', name: 'Arsip & HAKI', shortName: 'Arsip', icon: FolderLock },
  { id: 'laporan', name: 'Laporan', shortName: 'Laporan', icon: FileText }
];

export default function KepalaSekolahDashboard() {
  const [mounted, setMounted] = useState(false);
  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [setorans, setSetorans] = useState<Setoran[]>([]);
  const [moduls, setModuls] = useState<ModulAjar[]>([]);
  const [ujians, setUjians] = useState<UjianJuz[]>([]);

  // Loading & error state
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [namaLengkap, setNamaLengkap] = useState<string>('');

  // Search query
  const [searchQuery, setSearchQuery] = useState('');

  // Active navigation tab/menu
  const [activeMenu, setActiveMenu] = useState<'ringkasan' | 'analitik' | 'pemantauan' | 'arsip' | 'laporan'>('ringkasan');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Filters for Pemantauan Santri
  const [filterGrade, setFilterGrade] = useState<'All' | 'Tahsin' | 'Takmil' | 'Tahfiz'>('All');
  const [filterHalaqah, setFilterHalaqah] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<'All' | 'active' | 'stagnant'>('All');

  // Laporan panel states
  const [reportType, setReportType] = useState<'setoran' | 'ukj' | 'grade'>('setoran');
  const [period, setPeriod] = useState<'bulanan' | 'tahunan' | 'custom'>('bulanan');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);
  const [reportHistory, setReportHistory] = useState<ReportLog[]>([]);

  // Map halaqah_id → nama singkat halaqah
  const [halaqahMap, setHalaqahMap] = useState<Record<string, string>>({});

  // Announcement form state
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annTargets, setAnnTargets] = useState<Record<string, boolean>>({
    pengampu: false,
    orangtua: false,
    kepala_sekolah: false,
    semua: false,
  });

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
    const today = new Date().toISOString().split('T')[0];
    setCustomFrom(today);
    setCustomTo(today);
    loadData();
  }, [loadData]);

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
        pengirim_role: 'kepala_sekolah',
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
  // HELPERS — Date formatting and ranges
  // ---------------------------------------------------------------------------
  const getTodayStr = () => {
    return new Date().toISOString().split('T')[0];
  };

  const getDateRange = (p: 'bulanan' | 'tahunan' | 'custom', from: string, to: string): { from: string; to: string } => {
    const today = new Date();
    const todayStr = getTodayStr();

    if (p === 'bulanan') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      return { from: firstDay, to: todayStr };
    }
    if (p === 'tahunan') {
      const firstDay = `${today.getFullYear()}-01-01`;
      return { from: firstDay, to: todayStr };
    }
    return { from, to };
  };

  const formatDateID = (dateStr: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const periodLabel = (p: 'bulanan' | 'tahunan' | 'custom', from: string, to: string) => {
    if (p === 'bulanan') return `Bulanan (${formatDateID(from)} – ${formatDateID(to)})`;
    if (p === 'tahunan') return `Tahunan ${new Date().getFullYear()}`;
    return `${formatDateID(from)} – ${formatDateID(to)}`;
  };

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
      { name: 'Tahsin', value: grades.Tahsin, color: '#d97706' },
      { name: 'Takmil', value: grades.Takmil, color: '#2563eb' },
      { name: 'Tahfiz', value: grades.Tahfiz, color: '#059669' }
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

  // Derived stats
  const stagnantCount = santriList.filter(s => s.status === 'stagnant').length;
  const totalPassedUjians = ujians.filter(u => u.status === 'lulus' && u.approvedByKoordinator).length;

  // ---------------------------------------------------------------------------
  // ANALYTICS — Perbandingan Performa Antar Halaqah
  // ---------------------------------------------------------------------------
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
      return { halaqah: halaqahMap[hId] || hId, 'Rata-rata Baris': avg };
    });
  };

  const getHalaqahTrendData = () => {
    const months: string[] = [];
    const now = new Date();
    for (let i = 2; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }));
    }
    const halaqahIds = Object.keys(halaqahMap);
    const monthNames: Record<string, number> = {
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, Mei: 4, Jun: 5,
      Jul: 6, Agu: 7, Sep: 8, Okt: 9, Nov: 10, Des: 11
    };
    return months.map(monthLabel => {
      const [monthStr, yearStr] = monthLabel.split(' ');
      const mIdx = monthNames[monthStr] ?? -1;
      const yFull = mIdx !== -1 ? parseInt('20' + yearStr) : -1;
      const entry: Record<string, string | number> = { bulan: monthLabel };
      halaqahIds.forEach(hId => {
        const santriIds = santriList.filter(s => s.halaqahId === hId).map(s => s.id);
        const ms = setorans.filter(s => {
          if (!santriIds.includes(s.santriId) || s.type !== 'sabak' || s.status !== 'lulus') return false;
          const d = new Date(s.date);
          return d.getMonth() === mIdx && d.getFullYear() === yFull;
        });
        entry[halaqahMap[hId] || hId] = ms.length > 0
          ? Math.round((ms.reduce((sum, s) => sum + s.baris, 0) / ms.length) * 10) / 10
          : 0;
      });
      return entry;
    });
  };

  // ---------------------------------------------------------------------------
  // REPORT DOWNLOADS - PDF / Excel generators
  // ---------------------------------------------------------------------------
  const getSantriNama = (santriId: string) => {
    return santriList.find(s => s.id === santriId)?.nama ?? '—';
  };
  const getHalaqahNama = (santriId: string) => {
    const halaqahId = santriList.find(s => s.id === santriId)?.halaqahId ?? '';
    return halaqahMap[halaqahId] ?? '—';
  };

  const reportTitleMap = {
    setoran: 'Laporan Setoran Hafalan',
    ukj: 'Laporan Ujian Kenaikan Juz (UKJ)',
    grade: 'Laporan Perpindahan Grade',
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function fetchReportData(): Promise<{ rows: any[][]; headers: string[] }> {
    const { from, to } = getDateRange(period, customFrom, customTo);

    if (reportType === 'setoran') {
      const { data, error } = await supabase
        .from('setoran')
        .select('id, santri_id, tanggal, tipe, surah, jumlah_baris, jumlah_kesalahan, status')
        .gte('tanggal', from)
        .lte('tanggal', to)
        .order('tanggal', { ascending: false });

      if (error) throw new Error('Gagal memuat setoran: ' + error.message);

      const headers = ['Tanggal', 'Nama Santri', 'Halaqah', 'Tipe', 'Surah', 'Baris', 'Kesalahan', 'Status'];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = (data ?? []).map((s: any) => [
        formatDateID(s.tanggal),
        getSantriNama(s.santri_id),
        getHalaqahNama(s.santri_id),
        s.tipe ?? '—',
        s.surah ?? '—',
        s.jumlah_baris ?? 0,
        s.jumlah_kesalahan ?? 0,
        s.status ?? '—',
      ]);
      return { headers, rows };
    }

    if (reportType === 'ukj') {
      const { data, error } = await supabase
        .from('ujian_juz')
        .select('id, santri_id, juz, tanggal_ujian, jumlah_kesalahan, status, approved_by_koordinator')
        .gte('tanggal_ujian', from)
        .lte('tanggal_ujian', to)
        .order('tanggal_ujian', { ascending: false });

      if (error) throw new Error('Gagal memuat ujian_juz: ' + error.message);

      const headers = ['Tanggal', 'Nama Santri', 'Halaqah', 'Juz', 'Kesalahan', 'Status', 'Disetujui Koordinator'];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = (data ?? []).map((u: any) => [
        formatDateID(u.tanggal_ujian),
        getSantriNama(u.santri_id),
        getHalaqahNama(u.santri_id),
        u.juz ?? '—',
        u.jumlah_kesalahan ?? 0,
        u.status ?? '—',
        u.approved_by_koordinator ? 'Ya' : 'Belum',
      ]);
      return { headers, rows };
    }

    // grade
    const { data, error } = await supabase
      .from('riwayat_grade')
      .select('id, santri_id, grade_lama, grade_baru, target_baris_baru, tanggal_ubah, alasan')
      .gte('tanggal_ubah', from)
      .lte('tanggal_ubah', to)
      .order('tanggal_ubah', { ascending: false });

    if (error) throw new Error('Gagal memuat riwayat_grade: ' + error.message);

    const headers = ['Tanggal', 'Nama Santri', 'Halaqah', 'Grade Lama', 'Grade Baru', 'Target Baru (baris/hari)', 'Alasan'];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (data ?? []).map((g: any) => [
      formatDateID(g.tanggal_ubah),
      getSantriNama(g.santri_id),
      getHalaqahNama(g.santri_id),
      g.grade_lama ?? '—',
      g.grade_baru ?? '—',
      g.target_baris_baru ?? '—',
      g.alasan ?? '—',
    ]);
    return { headers, rows };
  }

  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    setGenError(null);
    try {
      const { headers, rows } = await fetchReportData();
      const { from, to } = getDateRange(period, customFrom, customTo);

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      // ---- Header ----
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('MTs TQ Jamilurrahman', 148, 16, { align: 'center' });

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(reportTitleMap[reportType], 148, 23, { align: 'center' });

      doc.setFontSize(9);
      doc.text(`Periode: ${periodLabel(period, from, to)}`, 148, 29, { align: 'center' });

      doc.setLineWidth(0.5);
      doc.line(14, 32, 282, 32);

      // ---- Table ----
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (doc as any).autoTable({
        head: [headers],
        body: rows,
        startY: 36,
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [217, 119, 6], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [254, 243, 199] },
        margin: { left: 14, right: 14 },
      });

      // ---- Footer ----
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const finalY = (doc as any).lastAutoTable?.finalY ?? 200;
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Dicetak pada: ${formatDateID(getTodayStr())} · Total data: ${rows.length} baris`,
        14,
        finalY + 8
      );

      doc.save(`${reportTitleMap[reportType].replace(/\s+/g, '_')}_${from}_sd_${to}.pdf`);
      setLastGenerated(`PDF berhasil dibuat (${rows.length} baris data)`);

      const newLog: ReportLog = {
        id: Math.random().toString(),
        tipe: reportTitleMap[reportType],
        periode: periodLabel(period, from, to),
        format: 'PDF',
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };
      setReportHistory(prev => [newLog, ...prev]);
      toast.success('Laporan PDF berhasil diunduh!');
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Terjadi kesalahan saat membuat PDF.');
      toast.error('Gagal mengunduh PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadExcel = async () => {
    setIsGenerating(true);
    setGenError(null);
    try {
      const { headers, rows } = await fetchReportData();
      const { from, to } = getDateRange(period, customFrom, customTo);

      const XLSX = await import('xlsx');

      const metaRows = [
        ['MTs TQ Jamilurrahman'],
        [reportTitleMap[reportType]],
        [`Periode: ${periodLabel(period, from, to)}`],
        [],
        headers,
        ...rows,
        [],
        [`Dicetak pada: ${formatDateID(getTodayStr())}`, `Total: ${rows.length} data`],
      ];

      const ws = XLSX.utils.aoa_to_sheet(metaRows);

      const colWidths = headers.map((_: string, ci: number) => ({
        wch: Math.max(
          headers[ci].length,
          ...rows.map((r: (string | number)[]) => String(r[ci] ?? '').length)
        ) + 2,
      }));
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, reportTitleMap[reportType].slice(0, 31));

      XLSX.writeFile(wb, `${reportTitleMap[reportType].replace(/\s+/g, '_')}_${from}_sd_${to}.xlsx`);
      setLastGenerated(`Excel berhasil dibuat (${rows.length} baris data)`);

      const newLog: ReportLog = {
        id: Math.random().toString(),
        tipe: reportTitleMap[reportType],
        periode: periodLabel(period, from, to),
        format: 'Excel',
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };
      setReportHistory(prev => [newLog, ...prev]);
      toast.success('Laporan Excel berhasil diunduh!');
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Terjadi kesalahan saat membuat Excel.');
      toast.error('Gagal mengunduh Excel.');
    } finally {
      setIsGenerating(false);
    }
  };

  // ---------------------------------------------------------------------------
  // PANELS RENDER PROCEDURES
  // ---------------------------------------------------------------------------

  const renderRingkasanPanel = () => {
    return (
      <div className="space-y-6">
        {/* Executive Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Total Santri</p>
              <h4 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">{santriList.length} Santri</h4>
              <p className="text-[9px] text-emerald-600 font-semibold mt-0.5">Semua aktif di unit</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] text-slate-455 font-bold uppercase tracking-wider">Capaian Kenaikan Juz</p>
              <h4 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">{totalPassedUjians} Ujian Juz</h4>
              <p className="text-[9px] text-amber-600 font-semibold mt-0.5">Tervalidasi Koordinator</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-red-500/10 text-red-500 dark:text-red-400 rounded-xl">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Stagnasi</p>
              <h4 className="text-lg font-extrabold text-red-600 dark:text-red-400 mt-0.5">{stagnantCount} Santri</h4>
              <p className="text-[9px] text-red-505 font-semibold mt-0.5">Butuh intervensi</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Total Setoran</p>
              <h4 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">{setorans.length} Setoran</h4>
              <p className="text-[9px] text-slate-500 mt-0.5">Sabak, Sabki, &amp; Manzil</p>
            </div>
          </div>
        </div>

        {/* Status Program Keseluruhan */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
          <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
              Status Program Pendidikan &amp; Standardisasi Kurikulum
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-xl">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Standardisasi Unit</span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1 block">MTs TQ Jamilurrahman</span>
              <div className="flex items-center space-x-1.5 mt-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] text-emerald-600 font-semibold">Berjalan Normal</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-xl">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Rasio Keaktifan</span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1 block">
                {santriList.length > 0 
                  ? `${Math.round(((santriList.length - stagnantCount) / santriList.length) * 100)}% Santri Aktif` 
                  : '0%'}
              </span>
              <span className="text-[10px] text-slate-500 mt-2 block">
                {stagnantCount} santri terdeteksi stagnant belajar.
              </span>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-xl">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Sumber Daya Kurikulum</span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1 block">
                {moduls.length} Modul Terotorisasi
              </span>
              <span className="text-[10px] text-amber-600 font-semibold mt-2 block">
                Hak Cipta MTs TQ dilindungi
              </span>
            </div>
          </div>

          <div className="mt-5 p-4 bg-amber-500/5 border border-amber-250/20 rounded-xl text-[11px] text-slate-650 dark:text-slate-400 leading-relaxed">
            <span className="font-extrabold text-amber-600 dark:text-amber-400 block mb-1">Catatan Eksekutif Kepala Sekolah:</span>
            Seluruh data santri dan setoran disinkronisasikan secara real-time dari database pusat Supabase. Capaian kenaikan juz didasarkan pada kelulusan ujian Ujian Kenaikan Juz (UKJ) yang disetujui koordinator. Gunakan menu <strong>Pemantauan Santri</strong> untuk meninjau secara rinci profil santri stagnant, dan menu <strong>Laporan</strong> untuk menghasilkan rekapitulasi performa.
          </div>
        </div>

        {/* Buat Pengumuman Form */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-2">
            <Megaphone className="h-5 w-5 text-amber-600 dark:text-amber-400" />
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
                className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
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
                className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
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
                    className="rounded text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300">Pengampu</span>
                </label>
                <label className="flex items-center space-x-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <input
                    type="checkbox"
                    checked={annTargets.orangtua || false}
                    onChange={e => setAnnTargets(prev => ({ ...prev, orangtua: e.target.checked, semua: false }))}
                    className="rounded text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300">Orang Tua</span>
                </label>
                <label className="flex items-center space-x-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <input
                    type="checkbox"
                    checked={annTargets.kepala_sekolah || false}
                    onChange={e => setAnnTargets(prev => ({ ...prev, kepala_sekolah: e.target.checked, semua: false }))}
                    className="rounded text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
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
                    className="rounded text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-bold">Semua Peran</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-md transition-all active:scale-98 disabled:opacity-60"
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

  const renderAnalitikPanel = () => {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Distribution Pie Chart */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
            <h3 className="font-extrabold text-xs text-slate-450 uppercase tracking-wider mb-4">
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

            <p className="text-[10px] text-slate-500 text-center leading-relaxed mt-4">
              Visualisasi proporsi santri pada tingkat Tahsin (amber), Takmil (blue), dan Tahfiz (green).
            </p>
          </div>

          {/* Average Performance Bar Chart */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
            <h3 className="font-extrabold text-xs text-slate-450 uppercase tracking-wider mb-4">
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
                      const colors = ['#d97706', '#2563eb', '#059669'];
                      return <Cell key={`cell-${index}`} fill={colors[index % 3]} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <p className="text-[10px] text-slate-500 leading-relaxed mt-4">
              Memantau standar kelulusan sabak harian santri berdasarkan tingkatan grade masing-masing.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* BarChart: rata-rata per halaqah */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
            <h3 className="font-extrabold text-xs text-slate-405 uppercase tracking-wider mb-1">
              📊 Rata-rata Baris Sabak per Halaqah
            </h3>
            <p className="text-[10px] text-slate-500 mb-4">Semua riwayat · hanya sabak lulus</p>
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
                    <Bar dataKey="Rata-rata Baris" fill="#d97706" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-xs text-slate-400">
                Belum ada data setoran yang cukup.
              </div>
            )}
          </div>

          {/* LineChart: tren per bulan */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
            <h3 className="font-extrabold text-xs text-slate-405 uppercase tracking-wider mb-1">
              📈 Tren Performa Halaqah (3 Bulan Terakhir)
            </h3>
            <p className="text-[10px] text-slate-500 mb-4">Rata-rata baris sabak lulus per bulan</p>
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
                Belum ada data halaqah.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderPemantauanPanel = () => {
    const monitoredStudents = santriList.filter(s => {
      const matchesSearch = s.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            s.kelas.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGrade = filterGrade === 'All' || s.grade === filterGrade;
      const matchesHalaqah = filterHalaqah === 'All' || s.halaqahId === filterHalaqah;
      const matchesStatus = filterStatus === 'All' || s.status === filterStatus;
      return matchesSearch && matchesGrade && matchesHalaqah && matchesStatus;
    });

    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-6">
        {/* Panel header */}
        <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="font-extrabold text-sm text-slate-850 dark:text-slate-100">
            Pemantauan Capaian &amp; Perkembangan Santri
          </h3>
          <p className="text-[10px] text-slate-450 mt-1">
            Gunakan filter untuk meninjau secara cepat status keaktifan, grade kurikulum, dan capaian juz per santri.
          </p>
        </div>

        {/* Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Search Query */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama atau kelas..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          {/* Grade filter */}
          <div>
            <select
              value={filterGrade}
              onChange={e => setFilterGrade(e.target.value as 'All' | 'Tahsin' | 'Takmil' | 'Tahfiz')}
              className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none focus:border-amber-500 transition-colors"
            >
              <option value="All">Semua Grade</option>
              <option value="Tahsin">Tahsin</option>
              <option value="Takmil">Takmil</option>
              <option value="Tahfiz">Tahfiz</option>
            </select>
          </div>

          {/* Halaqah filter */}
          <div>
            <select
              value={filterHalaqah}
              onChange={e => setFilterHalaqah(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none focus:border-amber-500 transition-colors"
            >
              <option value="All">Semua Halaqah</option>
              {Object.entries(halaqahMap).map(([id, nama]) => (
                <option key={id} value={id}>{nama}</option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as 'All' | 'active' | 'stagnant')}
              className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none focus:border-amber-500 transition-colors"
            >
              <option value="All">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="stagnant">Stagnan</option>
            </select>
          </div>
        </div>

        {/* Students list */}
        <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-150 dark:border-slate-850 text-slate-500 font-bold uppercase tracking-wider text-[9px]">
                <th className="p-3">Nama &amp; Kelas</th>
                <th className="p-3">Halaqah</th>
                <th className="p-3">Grade &amp; Target</th>
                <th className="p-3">Status</th>
                <th className="p-3">Capaian Juz Selesai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {monitoredStudents.map(student => {
                const isStagnant = student.status === 'stagnant';
                const gradeColors = {
                  Tahsin: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/30',
                  Takmil: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/30',
                  Tahfiz: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/30'
                };

                return (
                  <React.Fragment key={student.id}>
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-slate-855 dark:text-slate-200">{student.nama}</div>
                        <div className="text-[10px] text-slate-400">Kelas {student.kelas}</div>
                      </td>
                      <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                        {halaqahMap[student.halaqahId] || student.halaqahId}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${gradeColors[student.grade] || 'bg-slate-105'}`}>
                          {student.grade}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-1">Target: {student.targetBaris} baris</div>
                      </td>
                      <td className="p-3">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          isStagnant 
                            ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400 border border-red-200/30' 
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/30'
                        }`}>
                          {isStagnant ? 'Stagnan' : 'Aktif'}
                        </span>
                      </td>
                      <td className="p-3 font-medium text-slate-750 dark:text-slate-350">
                        {student.totalHafalanJuz.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {student.totalHafalanJuz.map(j => (
                              <span key={j} className="bg-slate-100 dark:bg-slate-800 text-[10px] font-bold px-1.5 py-0.5 rounded text-slate-650 dark:text-slate-400">
                                Juz {j}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[10px]">Belum ada juz selesai</span>
                        )}
                      </td>
                    </tr>
                    
                    {/* Stagnancy Intervention Box */}
                    {isStagnant && (
                      <tr className="bg-red-500/5">
                        <td colSpan={5} className="p-3 border-t-0 border-b border-slate-150 dark:border-slate-850">
                          <div className="flex items-start space-x-2.5 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/80 rounded-xl text-[10px] text-slate-600 dark:text-slate-400">
                            <AlertTriangle className="h-4 w-4 text-red-505 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <div>
                                <span className="font-extrabold text-red-650 dark:text-red-400 uppercase text-[9px] tracking-wider block mb-0.5">Analisis Penyebab Stagnasi:</span>
                                <span className="capitalize font-semibold text-slate-800 dark:text-slate-200">{student.stagnancyReason || 'Belum dianalisis'}</span>
                              </div>
                              {student.stagnancyDetail && (
                                <div>
                                  <span className="font-bold text-slate-700 dark:text-slate-300">Detail Kasus:</span> {student.stagnancyDetail}
                                </div>
                              )}
                              {student.stagnancyAction && (
                                <div>
                                  <span className="font-bold text-slate-700 dark:text-slate-300">Langkah Korektif Koordinator:</span> <span className="text-amber-700 dark:text-amber-400 font-semibold">{student.stagnancyAction}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {monitoredStudents.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400 italic">
                    Tidak ada data santri yang cocok dengan filter aktif.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderArsipPanel = () => {
    const handleAuthorizedDownload = (judul: string) => {
      toast.success(`Akses Terverifikasi: Kepala Sekolah "${namaLengkap || 'User'}" mengunduh berkas "${judul}". Data dienkripsi secara lokal.`);
    };

    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col space-y-6">
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 flex items-center space-x-2">
            <FolderLock className="h-5 w-5 text-amber-500" />
            <span>Arsip Modul Ajar &amp; Hak Kekayaan Intelektual (HAKI)</span>
          </h3>
          <span className="text-[10px] text-amber-600 font-bold bg-amber-50 dark:bg-amber-950/20 px-2.5 py-0.5 rounded-full border border-amber-200/30">
            Akses Terbatas
          </span>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {moduls.map(mod => (
            <div key={mod.id} className="p-4 border border-slate-150 dark:border-slate-800 rounded-xl flex items-center justify-between hover:border-amber-300 dark:hover:border-amber-900 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{mod.judul}</h4>
                  <p className="text-[10px] text-slate-450 mt-0.5">
                    Ukuran: {mod.size} · Terlindungi HAKI MTs TQ Jamilurrahman
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleAuthorizedDownload(mod.judul)}
                className="p-2.5 text-slate-500 hover:text-amber-650 hover:bg-amber-500/10 dark:hover:bg-amber-500/5 rounded-xl transition-all shadow-sm border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900"
                title="Unduh Berkas Terotorisasi"
              >
                <Download className="h-4.5 w-4.5 text-amber-600" />
              </button>
            </div>
          ))}

          {moduls.length === 0 && !isLoading && (
            <div className="col-span-2 text-center text-xs text-slate-400 py-8 italic">
              Belum ada modul ajar tersimpan dalam arsip sekolah.
            </div>
          )}
        </div>

        {/* HAKI Notice */}
        <div className="p-4 bg-red-500/5 border border-red-200/20 rounded-xl space-y-2 text-[10px] text-slate-500">
          <div className="flex items-center space-x-1.5 font-bold text-red-600 dark:text-red-400 text-xs">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>Pemberitahuan Kepatuhan Hukum &amp; IP Protection (NFR-02.2)</span>
          </div>
          <p className="leading-relaxed">
            MTs TQ Jamilurrahman memiliki kepemilikan penuh atas seluruh materi dan modul ajar yang tercantum pada sistem. Sistem secara otomatis mencatat audit trail setiap kali berkas diunduh. Penggandaan, pendistribusian, atau penyebarluasan modul ajar tanpa izin tertulis dari Kepala Sekolah/Pengelola Yayasan merupakan pelanggaran hukum HAKI.
          </p>
        </div>
      </div>
    );
  };

  const renderLaporanPanel = () => {
    const reportTypeOptions = [
      { value: 'setoran', label: 'Setoran Hafalan', icon: '📖' },
      { value: 'ukj', label: 'Ujian Kenaikan Juz', icon: '🏆' },
      { value: 'grade', label: 'Perpindahan Grade', icon: '📊' },
    ] as const;

    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          {/* Section header */}
          <div className="flex items-center space-x-2 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
            <Download className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <h2 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
              Unduh Rekapitulasi Laporan Program
            </h2>
            <span className="text-[10px] text-slate-400 ml-auto">PDF · Excel</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Column 1: Tipe Laporan */}
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-2">
                Tipe Laporan
              </label>
              <div className="space-y-2">
                {reportTypeOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setReportType(opt.value);
                      setGenError(null);
                      setLastGenerated(null);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-xl border text-xs font-semibold transition-all flex items-center space-x-2.5 ${
                      reportType === opt.value
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 shadow-sm font-bold animate-in fade-in duration-200'
                        : 'border-slate-200 dark:border-slate-700 text-slate-650 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <span className="text-base">{opt.icon}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Column 2: Periode */}
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-2">
                Periode
              </label>
              <div className="space-y-2 mb-3">
                {(['bulanan', 'tahunan', 'custom'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => {
                      setPeriod(p);
                      setGenError(null);
                      setLastGenerated(null);
                    }}
                    className={`w-full text-left px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all capitalize ${
                      period === p
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-305 font-bold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    {p === 'bulanan' ? '📅 Bulan Ini' : p === 'tahunan' ? '📆 Tahun Ini' : '🗓 Custom Range'}
                  </button>
                ))}
              </div>

              {/* Custom date range */}
              {period === 'custom' && (
                <div className="space-y-2.5 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div>
                    <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Dari Tanggal</label>
                    <input
                      type="date"
                      value={customFrom}
                      onChange={e => {
                        setCustomFrom(e.target.value);
                        setGenError(null);
                        setLastGenerated(null);
                      }}
                      max={customTo}
                      className="w-full text-xs p-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Sampai Tanggal</label>
                    <input
                      type="date"
                      value={customTo}
                      onChange={e => {
                        setCustomTo(e.target.value);
                        setGenError(null);
                        setLastGenerated(null);
                      }}
                      min={customFrom}
                      max={getTodayStr()}
                      className="w-full text-xs p-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Column 3: Aksi Download */}
            <div className="flex flex-col justify-between">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-2">
                  Format &amp; Unduh
                </label>

                {/* Summary card */}
                <div className="p-3 mb-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] text-slate-500 space-y-1">
                  <div><span className="font-bold text-slate-600 dark:text-slate-400">Laporan:</span> {reportTitleMap[reportType]}</div>
                  <div>
                    <span className="font-bold text-slate-600 dark:text-slate-400">Periode:</span>{' '}
                    {(() => {
                      const { from, to } = getDateRange(period, customFrom, customTo);
                      return periodLabel(period, from, to);
                    })()}
                  </div>
                  <div><span className="font-bold text-slate-600 dark:text-slate-400">Sumber:</span> Supabase (real-time)</div>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={handleDownloadPDF}
                    disabled={isGenerating}
                    className="w-full inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                  >
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                    <span>{isGenerating ? 'Memproses…' : 'Unduh PDF'}</span>
                  </button>

                  <button
                    onClick={handleDownloadExcel}
                    disabled={isGenerating}
                    className="w-full inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                  >
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="h-4 w-4" />
                    )}
                    <span>{isGenerating ? 'Memproses…' : 'Unduh Excel'}</span>
                  </button>
                </div>
              </div>

              {/* Status messages */}
              <div className="mt-3 space-y-1">
                {genError && (
                  <div className="flex items-start space-x-1.5 p-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg text-[10px] text-red-655 dark:text-red-400 font-semibold">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>{genError}</span>
                  </div>
                )}
                {lastGenerated && !genError && (
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
                    ✓ {lastGenerated}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Laporan History List */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center space-x-2 mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Activity className="h-4.5 w-4.5 text-amber-500" />
            <h3 className="font-extrabold text-xs text-slate-800 dark:text-slate-200">
              Riwayat Laporan Diunduh (Sesi Ini)
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-150 dark:border-slate-850 text-slate-550 font-bold uppercase tracking-wider text-[9px]">
                  <th className="p-3">Waktu Unduh</th>
                  <th className="p-3">Nama Laporan</th>
                  <th className="p-3">Cakupan Periode</th>
                  <th className="p-3">Format</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {reportHistory.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                    <td className="p-3 font-mono text-[10px] text-slate-500">{log.timestamp}</td>
                    <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{log.tipe}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-400">{log.periode}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                        log.format === 'PDF' 
                          ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-350' 
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-350'
                      }`}>
                        {log.format}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-1">
                        <span>✓</span>
                        <span>Berhasil diunduh</span>
                      </span>
                    </td>
                  </tr>
                ))}
                
                {reportHistory.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400 italic">
                      Belum ada laporan yang diunduh pada sesi ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderActivePanel = () => {
    switch (activeMenu) {
      case 'ringkasan':
        return renderRingkasanPanel();
      case 'analitik':
        return renderAnalitikPanel();
      case 'pemantauan':
        return renderPemantauanPanel();
      case 'arsip':
        return renderArsipPanel();
      case 'laporan':
        return renderLaporanPanel();
      default:
        return renderRingkasanPanel();
    }
  };

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

          {renderActivePanel()}
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
