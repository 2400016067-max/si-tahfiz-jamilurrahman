'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Santri, ReportLog } from '@/types/tahfiz';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { UserOptions } from 'jspdf-autotable';
import { Download, Activity, FileText, FileSpreadsheet, Loader2, AlertCircle } from 'lucide-react';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: UserOptions) => jsPDF;
    lastAutoTable?: { finalY: number };
  }
}

interface LaporanPanelProps {
  santriList: Santri[];
  halaqahMap: Record<string, string>;
}

type ReportType = 'setoran' | 'ukj' | 'grade';
type PeriodType = 'bulanan' | 'tahunan' | 'custom';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

function formatDateID(dateStr: string) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function getDateRange(p: PeriodType, from: string, to: string): { from: string; to: string } {
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
}

function periodLabel(p: PeriodType, from: string, to: string) {
  if (p === 'bulanan') return `Bulanan (${formatDateID(from)} – ${formatDateID(to)})`;
  if (p === 'tahunan') return `Tahunan ${new Date().getFullYear()}`;
  return `${formatDateID(from)} – ${formatDateID(to)}`;
}

export default function LaporanPanel({ santriList, halaqahMap }: LaporanPanelProps) {
  const [reportType, setReportType] = useState<ReportType>('setoran');
  const [period, setPeriod] = useState<PeriodType>('bulanan');
  const [customFrom, setCustomFrom] = useState(getTodayStr());
  const [customTo, setCustomTo] = useState(getTodayStr());
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);
  const [reportHistory, setReportHistory] = useState<ReportLog[]>([]);

  const reportTitleMap: Record<ReportType, string> = {
    setoran: 'Laporan Setoran Hafalan',
    ukj: 'Laporan Ujian Kenaikan Juz (UKJ)',
    grade: 'Laporan Perpindahan Grade',
  };

  const getSantriNama = (santriId: string) =>
    santriList.find(s => s.id === santriId)?.nama ?? '—';

  const getHalaqahNama = (santriId: string) => {
    const halaqahId = santriList.find(s => s.id === santriId)?.halaqahId ?? '';
    return halaqahMap[halaqahId] ?? '—';
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
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
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
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
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

  const reportTypeOptions = [
    { value: 'setoran' as ReportType, label: 'Setoran Hafalan', icon: '📖' },
    { value: 'ukj' as ReportType, label: 'Ujian Kenaikan Juz', icon: '🏆' },
    { value: 'grade' as ReportType, label: 'Perpindahan Grade', icon: '📊' },
  ];

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
              {reportHistory.map(log => (
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
}
