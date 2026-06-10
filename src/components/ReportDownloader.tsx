'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { FileText, FileSpreadsheet, Download, Loader2, AlertCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { applyPlugin } from 'jspdf-autotable';

applyPlugin(jsPDF);

import { ReportDownloaderProps, ReportType, PeriodType } from '@/types/tahfiz';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

function getDateRange(period: PeriodType, customFrom: string, customTo: string): { from: string; to: string } {
  const today = new Date();
  const to = getTodayStr();

  if (period === 'bulanan') {
    const from = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    return { from, to };
  }
  if (period === 'tahunan') {
    const from = `${today.getFullYear()}-01-01`;
    return { from, to };
  }
  return { from: customFrom, to: customTo };
}

function formatDateID(dateStr: string) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function periodLabel(period: PeriodType, from: string, to: string) {
  if (period === 'bulanan') return `Bulanan (${formatDateID(from)} – ${formatDateID(to)})`;
  if (period === 'tahunan') return `Tahunan ${new Date().getFullYear()}`;
  return `${formatDateID(from)} – ${formatDateID(to)}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ReportDownloader({ santriList, halaqahMap }: ReportDownloaderProps) {
  const [reportType, setReportType] = useState<ReportType>('setoran');
  const [period, setPeriod] = useState<PeriodType>('bulanan');
  const [customFrom, setCustomFrom] = useState(getTodayStr());
  const [customTo, setCustomTo] = useState(getTodayStr());
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);

  // Guard against SSR/hydration mismatch from Date calls in initial state
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  // ---- lookup helpers -------------------------------------------------------
  function getSantriNama(santriId: string) {
    return santriList.find(s => s.id === santriId)?.nama ?? '—';
  }
  function getHalaqahNama(santriId: string) {
    const halaqahId = santriList.find(s => s.id === santriId)?.halaqahId ?? '';
    return halaqahMap[halaqahId] ?? '—';
  }

  // ---- fetch data from Supabase ---------------------------------------------
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function fetchData(): Promise<{ rows: any[][]; headers: string[] }> {
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

  // ---- report metadata ------------------------------------------------------
  const reportTitleMap: Record<ReportType, string> = {
    setoran: 'Laporan Setoran Hafalan',
    ukj: 'Laporan Ujian Kenaikan Juz (UKJ)',
    grade: 'Laporan Perpindahan Grade',
  };

  // ---- PDF generation -------------------------------------------------------
  async function handleDownloadPDF() {
    setIsGenerating(true);
    setGenError(null);
    try {
      const { headers, rows } = await fetchData();
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
        headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
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
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Terjadi kesalahan saat membuat PDF.');
    } finally {
      setIsGenerating(false);
    }
  }

  // ---- Excel generation -----------------------------------------------------
  async function handleDownloadExcel() {
    setIsGenerating(true);
    setGenError(null);
    try {
      const { headers, rows } = await fetchData();
      const { from, to } = getDateRange(period, customFrom, customTo);

      const XLSX = await import('xlsx');

      // Build worksheet data: meta rows + header + data
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

      // Auto column widths
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
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Terjadi kesalahan saat membuat Excel.');
    } finally {
      setIsGenerating(false);
    }
  }

  // ---- UI -------------------------------------------------------------------
  const reportTypeOptions: { value: ReportType; label: string; icon: string }[] = [
    { value: 'setoran', label: 'Setoran Hafalan', icon: '📖' },
    { value: 'ukj', label: 'Ujian Kenaikan Juz', icon: '🏆' },
    { value: 'grade', label: 'Perpindahan Grade', icon: '📊' },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
      {/* Section header */}
      <div className="flex items-center space-x-2 mb-5 border-b border-slate-100 dark:border-slate-800 pb-4">
        <Download className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        <h2 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
          Unduh Laporan
        </h2>
        <span className="text-[10px] text-slate-400 ml-auto">PDF · Excel</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* Column 1: Tipe Laporan */}
        <div>
          <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-2">
            Tipe Laporan
          </label>
          <div className="space-y-2">
            {reportTypeOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setReportType(opt.value)}
                className={`w-full text-left px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all flex items-center space-x-2 ${
                  reportType === opt.value
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <span>{opt.icon}</span>
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
            {(['bulanan', 'tahunan', 'custom'] as PeriodType[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`w-full text-left px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all capitalize ${
                  period === p
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                {p === 'bulanan' ? '📅 Bulan Ini' : p === 'tahunan' ? '📆 Tahun Ini' : '🗓 Custom Range'}
              </button>
            ))}
          </div>

          {/* Custom date range */}
          {period === 'custom' && (
            <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
              <div>
                <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Dari Tanggal</label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={e => setCustomFrom(e.target.value)}
                  max={customTo}
                  className="w-full text-xs p-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Sampai Tanggal</label>
                <input
                  type="date"
                  value={customTo}
                  onChange={e => setCustomTo(e.target.value)}
                  min={customFrom}
                  max={getTodayStr()}
                  className="w-full text-xs p-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Column 3: Aksi Download */}
        <div className="flex flex-col justify-between">
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-2">
              Format & Unduh
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
                className="w-full inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
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
              <div className="flex items-start space-x-1.5 p-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg text-[10px] text-red-600 dark:text-red-400 font-semibold">
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
  );
}
