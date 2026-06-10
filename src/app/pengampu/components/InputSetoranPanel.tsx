'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { applyPlugin } from 'jspdf-autotable';
import { supabase } from '@/lib/supabase';
import { Santri, Setoran, TikrarTask } from '@/types/tahfiz';
import {
  Users,
  AlertCircle,
  FileSpreadsheet,
  FileText,
  BookOpen,
  User,
  Flame,
} from 'lucide-react';

applyPlugin(jsPDF);

interface InputSetoranPanelProps {
  activeStudents: Santri[];
  setorans: Setoran[];
  tikrars: TikrarTask[];
  selectedSantri: Santri | null;
  activePekan: any | null;
  pengampuDbId: string;
  isLoading: boolean;
  onSelectSantri: (student: Santri) => void;
  onDataChanged: () => void;
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------
function getStudentTodayStatus(studentId: string, setorans: Setoran[]) {
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySetorans = setorans.filter(s => s.santriId === studentId && s.date === todayStr);

  const hasSabak = todaySetorans.some(s => s.type === 'sabak');
  const hasSabki = todaySetorans.some(s => s.type === 'sabki');
  const failedSabak = todaySetorans.some(s => s.type === 'sabak' && s.status === 'mengulang');

  if (hasSabak && !failedSabak) return { label: 'Tuntas Sabak & Sabki', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' };
  if (hasSabak && failedSabak) return { label: 'Mengulang Sabak', color: 'text-red-600 dark:text-red-400 bg-red-500/10' };
  if (hasSabki) return { label: 'Sabki Tuntas', color: 'text-blue-600 dark:text-blue-400 bg-blue-500/10' };
  return { label: 'Belum Setor', color: 'text-slate-500 dark:text-slate-400 bg-slate-500/10' };
}

function getStudentCurrentTikrarStatus(studentId: string, tikrars: TikrarTask[]) {
  const studentTikrars = tikrars.filter(t => t.santri_id === studentId);
  if (studentTikrars.length === 0) return null;
  const latest = studentTikrars[0];
  return latest.status || (latest.selesai ? (latest.lokasi === 'sekolah' ? 'selesai_sekolah' : 'selesai_rumah') : (latest.lokasi === 'sekolah' ? 'wajib_sekolah' : 'wajib_rumah'));
}

function checkManzilStatus(studentId: string, setorans: Setoran[]) {
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
}

function formatSetoranDate(dateStr: string): string {
  if (!dateStr) return '';
  const todayStr = new Date().toISOString().split('T')[0];

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (dateStr === todayStr) return 'Hari Ini';
  if (dateStr === yesterdayStr) return 'Kemarin';

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
}

export default function InputSetoranPanel({
  activeStudents,
  setorans,
  tikrars,
  selectedSantri,
  activePekan,
  pengampuDbId,
  isLoading,
  onSelectSantri,
  onDataChanged,
}: InputSetoranPanelProps) {
  // ---------------------------------------------------------------------------
  // LOCAL STATE
  // ---------------------------------------------------------------------------
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

  const [isPekanMurajaah, setIsPekanMurajaah] = useState<boolean>(false);
  const [targetDivider, setTargetDivider] = useState<number>(15);
  const [mistakeThreshold, setMistakeThreshold] = useState<number>(1);

  const [murajaahSurah, setMurajaahSurah] = useState<string>('Juz 30');
  const [murajaahHalaman, setMurajaahHalaman] = useState<number>(582);
  const [murajaahBaris, setMurajaahBaris] = useState<number>(15);
  const [murajaahKesalahan, setMurajaahKesalahan] = useState<number>(0);
  const [murajaahNotes, setMurajaahNotes] = useState<string>('');
  const [isMurajaahEditMode, setIsMurajaahEditMode] = useState<boolean>(false);
  const [existingMurajaahId, setExistingMurajaahId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'setoran' | 'pekan'>('setoran');
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [existingSetoranId, setExistingSetoranId] = useState<string | null>(null);
  const [isSabkiEditMode, setIsSabkiEditMode] = useState<boolean>(false);
  const [existingSabkiSetoranId, setExistingSabkiSetoranId] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // AUTO-DETECT useEffect — deteksi setoran hari ini
  // ---------------------------------------------------------------------------
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
      s => s.santriId === selectedSantri.id && s.type === 'sabak' && s.date === todayStr && s.notes?.startsWith("[Pekan Muraja'ah]")
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

  // ---------------------------------------------------------------------------
  // HANDLER — SUBMIT SABKI
  // ---------------------------------------------------------------------------
  const handleSaveSabki = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSantri) return;

    const autoStatus = sabkiKesalahan <= mistakeThreshold ? 'lulus' : 'mengulang';

    if (existingSabkiSetoranId) {
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
        toast.error('Gagal mengupdate Sabki: ' + error.message);
        return;
      }

      toast.success('Setoran Sabki berhasil diperbarui.');
      setIsSabkiEditMode(false);
    } else {
      const { error } = await supabase.from('setoran').insert({
        santri_id:        selectedSantri.id,
        tanggal:          new Date().toISOString().split('T')[0],
        tipe:             'sabki',
        surah:            sabkiSurah || 'Murojaah Sabki',
        halaman_mulai:    sabkiHalaman,
        halaman_selesai:  sabkiHalaman,
        jumlah_baris:     15,
        jumlah_kesalahan: sabkiKesalahan,
        status:           autoStatus,
        parent_verified:  false,
        dicatat_oleh:     pengampuDbId,
      });

      if (error) {
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
    onDataChanged();
  };

  // ---------------------------------------------------------------------------
  // HANDLER — SUBMIT SABAK
  // ---------------------------------------------------------------------------
  const handleSaveSabak = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSantri) return;

    const autoStatus = sabakKesalahan <= mistakeThreshold ? 'lulus' : 'mengulang';

    if (isEditMode && existingSetoranId) {
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
        toast.error('Gagal mengupdate Sabak: ' + error.message);
        return;
      }

      toast.success('Setoran Sabak berhasil diperbarui.');
    } else {
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
        toast.error('Gagal menyimpan Sabak: ' + error.message);
        return;
      }
    }

    const pages = Math.max(1, sabakHalSelesai - sabakHalMulai + 1);
    const isFailed = sabakKesalahan > pages;

    if (isFailed) {
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

    onDataChanged();
  };

  // ---------------------------------------------------------------------------
  // HANDLER — SUBMIT MURAJAAH
  // ---------------------------------------------------------------------------
  const handleSaveMurajaah = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSantri) return;

    const autoStatus = murajaahKesalahan <= 2 ? 'lulus' : 'mengulang';
    const notesPrefix = `[Pekan Muraja'ah] ${murajaahNotes}`.trim();

    if (isMurajaahEditMode && existingMurajaahId) {
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
        toast.error("Gagal mengupdate setoran Muraja'ah: " + error.message);
        return;
      }

      toast.success("Setoran Muraja'ah berhasil diperbarui.");
    } else {
      const { error } = await supabase.from('setoran').insert({
        santri_id:        selectedSantri.id,
        tanggal:          new Date().toISOString().split('T')[0],
        tipe:             'sabak',
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
        toast.error("Gagal menyimpan setoran Muraja'ah: " + error.message);
        return;
      }

      toast.success("Setoran Muraja'ah berhasil disimpan.");
    }

    onDataChanged();
  };

  // ---------------------------------------------------------------------------
  // HANDLER — UPDATE TIKRAR STATUS
  // ---------------------------------------------------------------------------
  const handleUpdateTikrarStatus = async (tikrarId: string, newStatus: string) => {
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
      toast.error('Gagal mengupdate status Tikrar: ' + error.message);
      return;
    }

    toast.success(`Status Tikrar berhasil diupdate menjadi ${newStatus}.`);
    onDataChanged();
  };

  // ---------------------------------------------------------------------------
  // HANDLER — EXPORT PDF / EXCEL
  // ---------------------------------------------------------------------------
  const handleExport = async (type: 'pdf' | 'excel') => {
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

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('MTs TQ Jamilurrahman', 105, 16, { align: 'center' });

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`Rekap Setoran Harian`, 105, 23, { align: 'center' });

        doc.setLineWidth(0.5);
        doc.line(14, 28, 196, 28);

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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const finalY = (doc as any).lastAutoTable?.finalY ?? 200;
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Tanggal Cetak: ${todayStr}`, 14, finalY + 10);

        doc.save(`Rekap_Setoran_${new Date().toISOString().split('T')[0]}.pdf`);
      } catch (err) {
        console.error('PDF generation error:', err);
        toast.error('Gagal mengekspor ke PDF.');
      }
    } else {
      try {
        const XLSX = await import('xlsx');

        const metaRows = [
          ['MTs TQ Jamilurrahman'],
          [`Rekap Setoran Harian`],
          [`Tanggal Cetak: ${todayStr}`],
          [],
          headers,
          ...rows
        ];

        const ws = XLSX.utils.aoa_to_sheet(metaRows);

        const colWidths = headers.map((_: string, ci: number) => ({
          wch: Math.max(
            headers[ci].length,
            ...rows.map(r => String(r[ci] ?? '').length)
          ) + 3
        }));
        ws['!cols'] = colWidths;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Rekap Setoran');

        XLSX.writeFile(wb, `Rekap_Setoran_${new Date().toISOString().split('T')[0]}.xlsx`);
      } catch (err) {
        console.error('Excel generation error:', err);
        toast.error('Gagal mengekspor ke Excel.');
      }
    }
  };

  // ---------------------------------------------------------------------------
  // RENDER MURAJAAH FORM (internal function)
  // ---------------------------------------------------------------------------
  const renderMurajaahForm = () => {
    if (!selectedSantri) return null;

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
              {isMurajaahEditMode ? "Simpan Edit Setoran Muraja'ah" : "Simpan Setoran Ujian Muraja'ah"}
            </button>
          </form>
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-3">
          <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <span className="font-bold text-slate-700 dark:text-slate-350 text-xs sm:text-sm">
            Kelompok Halaqah
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
        {/* Student list sidebar */}
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
              const status = getStudentTodayStatus(student.id, setorans);
              return (
                <button
                  key={student.id}
                  onClick={() => onSelectSantri(student)}
                  className={`w-full text-left p-3 my-1 rounded-xl transition-all flex items-center justify-between ${isSelected ? 'bg-emerald-50 dark:bg-emerald-950/20 border-l-4 border-emerald-500' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'}`}
                >
                  <div>
                    <h4 className="font-bold text-sm text-slate-850 dark:text-slate-200 flex items-center justify-between gap-2">
                      <span>{student.nama}</span>
                      {(() => {
                        const tikrarStatus = getStudentCurrentTikrarStatus(student.id, tikrars);
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

        {/* Detail panel */}
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
                    {/* Manzil status box */}
                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-900/50">
                      <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
                        <span>📊 Pemantauan Manzil (Review Rumah - Kemarin)</span>
                        <span className="text-[10px] text-slate-500">F1.2.1 / F1.2.2</span>
                      </h4>
                      {(() => {
                        const manzil = checkManzilStatus(selectedSantri.id, setorans);
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

                    {/* Sabki & Sabak forms */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Sabki */}
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

                      {/* Sabak */}
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

                    {/* Tikrar section */}
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

                {activeTab === 'pekan' && !activePekan && (
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
                              if (e.target.checked) toast.info("Mode Pekan Muraja'ah diaktifkan.");
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
}
