'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { logAudit } from '@/lib/auditLog';
import { Santri, UjianJuz } from '@/types/tahfiz';
import confetti from 'canvas-confetti';
import { Award, History } from 'lucide-react';

interface UKJPanelProps {
  santriList: Santri[];
  ujianList: UjianJuz[];
  halaqahMap: Record<string, string>;
  userId: string;
  namaLengkap: string;
  isLoading: boolean;
  onDataChanged: () => void;
}

export default function UKJPanel({
  santriList,
  ujianList,
  halaqahMap,
  userId,
  namaLengkap,
  isLoading,
  onDataChanged,
}: UKJPanelProps) {
  // ── Local State ──────────────────────────────────────────────────────────
  const [showUjianModal, setShowUjianModal] = useState(false);
  const [ujianSantriId, setUjianSantriId] = useState('');
  const [ujianJuz, setUjianJuz] = useState(30);
  const [ujianKesalahan, setUjianKesalahan] = useState(2);
  const [ujianStatus, setUjianStatus] = useState<'lulus' | 'mengulang'>('lulus');
  const [localLoading, setLocalLoading] = useState(false);

  // ── Computed ───────────────────────────────────────────────────────────────
  const pending  = ujianList.filter(u => !u.approvedByKoordinator);
  const approved = ujianList.filter(u => u.approvedByKoordinator);

  // ── Handler: Approve UKJ ──────────────────────────────────────────────────
  const handleApproveUjian = async (ujianId: string) => {
    setLocalLoading(true);
    const ujian = ujianList.find(u => u.id === ujianId);
    if (!ujian) { setLocalLoading(false); return; }

    // 1. Setujui ujian di tabel ujian_juz
    const { error: approveError } = await supabase
      .from('ujian_juz')
      .update({
        approved_by_koordinator: true,
        koordinator_id:          null,
        approved_at:             new Date().toISOString(),
        updated_at:              new Date().toISOString(),
      })
      .eq('id', ujianId);

    if (approveError) {
      toast.error('Gagal menyetujui UKJ: ' + approveError.message);
      setLocalLoading(false);
      return;
    }

    // 2. Jika status lulus → masukkan ke hafalan_juz & update current_juz santri
    if (ujian.status === 'lulus') {
      const { error: hafalanError } = await supabase.from('hafalan_juz').upsert(
        {
          santri_id:       ujian.santriId,
          juz:             ujian.juz,
          tanggal_selesai: ujian.date,
        },
        { onConflict: 'santri_id,juz' }
      );

      if (hafalanError) {
        console.warn('[UKJPanel] Gagal insert hafalan_juz:', hafalanError.message);
      }

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
            .update({ current_juz: minJuz - 1, updated_at: new Date().toISOString() })
            .eq('id', ujian.santriId);
        }
      }
    }

    // Celebrasi konfeti
    confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });

    const student = santriList.find(s => s.id === ujian.santriId);
    const namaSantri = student ? student.nama : 'Unknown';

    logAudit({
      userId,
      namaUser: namaLengkap,
      aksi: 'APPROVE_UJIAN',
      targetTabel: 'ujian_juz',
      targetId: ujianId,
      detail: { santri: namaSantri, juz: ujian.juz },
    });

    toast.success('Ujian Kenaikan Juz berhasil disetujui!');
    setLocalLoading(false);
    onDataChanged();
  };

  // ── Handler: Tambah Ujian Baru ────────────────────────────────────────────
  const handleAddUjian = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ujianSantriId) return;

    setLocalLoading(true);

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
      toast.error('Gagal menyimpan ujian: ' + error.message);
      setLocalLoading(false);
      return;
    }

    setShowUjianModal(false);
    toast.success('Log Ujian Kenaikan Juz berhasil dibuat. Silakan klik "Setujui" pada daftar Ujian di bawah untuk verifikasi.');
    setLocalLoading(false);
    onDataChanged();
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
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
                        disabled={isLoading || localLoading}
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
              {santriList.map(s => (
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
              ))}
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
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ujian.status === 'lulus'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40'
                            : 'bg-red-100 text-red-805 dark:bg-red-950/40'
                        }`}>
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

      {/* ── Modal: Catat Log Ujian Kenaikan Juz ── */}
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
                  disabled={isLoading || localLoading}
                  className="flex-grow bg-indigo-650 hover:bg-indigo-750 text-white py-2 rounded-lg text-xs font-bold disabled:opacity-60 shadow"
                >
                  Simpan Ujian
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
