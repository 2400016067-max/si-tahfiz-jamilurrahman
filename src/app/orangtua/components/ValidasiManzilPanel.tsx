'use client';

import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { FileCheck2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Santri, Setoran } from '@/types/tahfiz';

interface ValidasiManzilPanelProps {
  activeSantri: Santri | null;
  todayManzil: Setoran | null | undefined;
  parentUserIdMap: Record<string, string>;
  isLoading: boolean;
  onDataChanged: () => void;
}

export default function ValidasiManzilPanel({
  activeSantri,
  todayManzil,
  parentUserIdMap,
  isLoading,
  onDataChanged,
}: ValidasiManzilPanelProps) {
  const [manzilSurah, setManzilSurah] = useState<string>('Juz 30');
  const [manzilHalMulai, setManzilHalMulai] = useState<number>(582);
  const [manzilHalSelesai, setManzilHalSelesai] = useState<number>(583);
  const [manzilAktualHalaman, setManzilAktualHalaman] = useState<number>(2);
  const [signatureDone, setSignatureDone] = useState<boolean>(false);
  const [signatureName, setSignatureName] = useState<string>('');
  const [canvasSigned, setCanvasSigned] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize vanilla canvas drawing event listeners (client-only to avoid SSR issues)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !!todayManzil) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Adjust canvas resolution/coordinate system to match styling bounds
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width || 400;
    canvas.height = rect.height || 120;

    // Drawing configuration
    ctx.strokeStyle = '#0d9488'; // teal-600 to look premium
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    const getPos = (e: MouseEvent | TouchEvent) => {
      const r = canvas.getBoundingClientRect();
      let clientX, clientY;
      if ('touches' in e) {
        if (e.touches.length === 0) return null;
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      return {
        x: clientX - r.left,
        y: clientY - r.top,
      };
    };

    const startDrawing = (e: MouseEvent | TouchEvent) => {
      const pos = getPos(e);
      if (!pos) return;
      isDrawing = true;
      lastX = pos.x;
      lastY = pos.y;

      // Draw a small point on starting click/tap
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();

      setCanvasSigned(true);
      setSignatureDone(true);
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing) return;

      // Prevent scrolling on mobile touch screens when drawing
      if (e.cancelable) {
        e.preventDefault();
      }

      const pos = getPos(e);
      if (!pos) return;

      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();

      lastX = pos.x;
      lastY = pos.y;
    };

    const stopDrawing = () => {
      isDrawing = false;
    };

    // Attach listeners
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);

    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);
    canvas.addEventListener('touchcancel', stopDrawing);

    return () => {
      // Cleanup listeners
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseleave', stopDrawing);

      canvas.removeEventListener('touchstart', startDrawing);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDrawing);
      canvas.removeEventListener('touchcancel', stopDrawing);
    };
  }, [todayManzil]);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    setSignatureName('');
    setSignatureDone(false);
    setCanvasSigned(false);
  };

  // ---------------------------------------------------------------------------
  // KONFIRMASI MANZIL — INSERT ke tabel setoran, parent_verified = true
  // ---------------------------------------------------------------------------
  const handleSaveManzil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSantri) return;

    let signatureBase64 = null;
    const canvas = canvasRef.current;
    if (canvas && canvasSigned) {
      signatureBase64 = canvas.toDataURL('image/png');
    }

    if (!signatureBase64 && !signatureName.trim()) {
      toast.error('Silakan lakukan tanda tangan atau ketik nama Anda sebagai validasi.');
      return;
    }

    // Upload signature to Supabase Storage if it exists
    let signatureUrl = null;
    if (signatureBase64) {
      try {
        const parts = signatureBase64.split(',');
        const base64Data = parts[1];
        const binaryString = atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'image/png' });

        const fileName = `${activeSantri.id}_${Date.now()}.png`;
        const { error: uploadError } = await supabase.storage
          .from('signatures')
          .upload(fileName, blob, {
            contentType: 'image/png',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('signatures')
          .getPublicUrl(fileName);

        signatureUrl = urlData.publicUrl;
      } catch (err) {
        const errMsg =
          err instanceof Error ? err.message : 'Terjadi kesalahan saat mengunggah tanda tangan';
        toast.error('Gagal memproses tanda tangan: ' + errMsg);
        return;
      }
    }

    // Ambil parent_user_id untuk kolom parent_verified_by
    const parentUserId = parentUserIdMap[activeSantri.id] ?? null;

    const { error } = await supabase.from('setoran').insert({
      santri_id:          activeSantri.id,
      tanggal:            new Date().toISOString().split('T')[0],
      tipe:               'manzil',
      surah:              manzilSurah,
      halaman_mulai:      manzilHalMulai,
      halaman_selesai:    manzilHalSelesai,
      jumlah_baris:       manzilAktualHalaman * 15,
      jumlah_kesalahan:   0,
      status:             'lulus',
      parent_verified:    true,
      parent_verified_by: parentUserId,
      parent_verified_at: new Date().toISOString(),
      halaman_aktual:     manzilAktualHalaman,
      catatan:            `Divalidasi oleh Orang Tua (${signatureName || activeSantri.parentName})`,
      parent_signature:   signatureUrl,
    });

    if (error) {
      toast.error('Gagal menyimpan konfirmasi Manzil: ' + error.message);
      return;
    }

    toast.success('Laporan Manzil berhasil dikirim ke Pengampu. Jazakumullahu khairan.');
    setSignatureDone(true);
    onDataChanged();
  };

  if (!activeSantri) return null;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden">
      <div className="absolute -top-10 -right-10 w-28 h-28 bg-teal-500/10 rounded-full blur-xl pointer-events-none" />
      <h3 className="font-extrabold text-sm text-slate-805 dark:text-slate-100 border-b border-slate-105 dark:border-slate-800 pb-3 mb-4 flex items-center justify-between">
        <span>✍ Validasi Manzil (Murojaah Rumah)</span>
        <span className="text-[10px] text-slate-450 font-medium">F2.1 / F2.5.2</span>
      </h3>

      {todayManzil ? (
        <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-400 rounded-xl flex items-center space-x-2 text-xs font-bold">
          <span>Manzil Sudah Dikonfirmasi Hari Ini ✅</span>
        </div>
      ) : (
        <p className="text-xs text-slate-550 dark:text-slate-400 mb-4 leading-relaxed">
          Berdasarkan urutan hafalan, target murajaah mandiri anak hari ini adalah **2.5 Lembar (Juz {activeSantri.currentJuz})**. Tolong simak hafalan anak and beri konfirmasi digital.
        </p>
      )}

      {todayManzil && (
        <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-150 dark:border-slate-800 text-xs space-y-2.5">
          <h4 className="font-bold text-slate-700 dark:text-slate-350 border-b border-slate-200 dark:border-slate-750 pb-1.5 mb-2">
            Ringkasan Data Terkirim:
          </h4>
          <div className="grid grid-cols-2 gap-y-2">
            <span className="text-slate-450">Surah Murojaah:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{todayManzil.surah}</span>

            <span className="text-slate-450">Halaman Mulai:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{todayManzil.halamanMulai}</span>

            <span className="text-slate-450">Halaman Selesai:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{todayManzil.halamanSelesai}</span>

            <span className="text-slate-450">Aktual Halaman:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {todayManzil.halamanAktual ??
                (todayManzil.halamanMulai && todayManzil.halamanSelesai
                  ? todayManzil.halamanSelesai - todayManzil.halamanMulai + 1
                  : 0)}{' '}
              Lembar/Halaman
            </span>

            <span className="text-slate-450">Catatan/Validasi:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{todayManzil.notes || '-'}</span>
          </div>
          {todayManzil.parentSignature && (
            <div className="mt-3">
              <span className="text-slate-450 block mb-1">Tanda Tangan Konfirmasi:</span>
              <div className="inline-block bg-white p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                <img
                  src={todayManzil.parentSignature}
                  alt="Tanda Tangan Orang Tua"
                  className="h-16 object-contain max-w-[200px]"
                />
              </div>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSaveManzil} className="space-y-4">
        <div>
          <label className="text-[10px] font-bold uppercase text-slate-400">Surah Murojaah</label>
          <input
            type="text"
            value={manzilSurah}
            onChange={(e) => setManzilSurah(e.target.value)}
            required
            disabled={!!todayManzil}
            className="w-full text-xs p-2 border border-slate-250 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:border-teal-500 disabled:opacity-60"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400">Hal Mulai</label>
            <input
              type="number"
              value={manzilHalMulai}
              onChange={(e) => setManzilHalMulai(Number(e.target.value))}
              disabled={!!todayManzil}
              className="w-full text-xs p-2 border border-slate-250 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg disabled:opacity-60"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400">Hal Selesai</label>
            <input
              type="number"
              value={manzilHalSelesai}
              onChange={(e) => setManzilHalSelesai(Number(e.target.value))}
              disabled={!!todayManzil}
              className="w-full text-xs p-2 border border-slate-250 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg disabled:opacity-60"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400">Aktual Hal</label>
            <input
              type="number"
              value={manzilAktualHalaman}
              onChange={(e) => setManzilAktualHalaman(Number(e.target.value))}
              disabled={!!todayManzil}
              className="w-full text-xs p-2 border border-slate-250 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg disabled:opacity-60"
            />
          </div>
        </div>

        <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-900/50">
          <label className="text-[10px] font-bold uppercase text-slate-400 flex justify-between items-center mb-2">
            <span>Tanda Tangan Digital Orang Tua {signatureDone && '✓'}</span>
            <button
              type="button"
              onClick={clearSignature}
              disabled={!!todayManzil}
              className="text-[9px] text-teal-600 dark:text-teal-400 hover:underline font-bold disabled:opacity-50"
            >
              Bersihkan
            </button>
          </label>

          <div className="border border-dashed border-slate-350 dark:border-slate-700 h-[120px] bg-white dark:bg-slate-900 rounded-lg overflow-hidden relative">
            <canvas
              ref={canvasRef}
              className="w-full h-full cursor-crosshair touch-none"
            />
          </div>

          <div className="mt-2">
            <input
              type="text"
              placeholder="Atau ketik nama lengkap Anda..."
              value={signatureName}
              onChange={(e) => {
                setSignatureName(e.target.value);
                setSignatureDone(e.target.value.trim().length > 0 || canvasSigned);
              }}
              disabled={!!todayManzil}
              className="w-full text-xs p-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md focus:outline-none disabled:opacity-60"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !!todayManzil}
          className="w-full bg-teal-650 hover:bg-teal-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center space-x-1 disabled:opacity-60"
        >
          <FileCheck2 className="h-4 w-4" />
          <span>Kirim Konfirmasi Manzil</span>
        </button>
      </form>
    </div>
  );
}
