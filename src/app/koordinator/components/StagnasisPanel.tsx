'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { logAudit } from '@/lib/auditLog';
import { Santri, CatatanStagnasi } from '@/types/tahfiz';
import { AlertTriangle, Check } from 'lucide-react';

interface StagnasisPanelProps {
  santriList: Santri[];
  halaqahMap: Record<string, string>;
  userId: string;
  namaLengkap: string;
  isLoading: boolean;
  onDataChanged: () => void;
}

export default function StagnasisPanel({
  santriList,
  halaqahMap,
  userId,
  namaLengkap,
  isLoading,
  onDataChanged,
}: StagnasisPanelProps) {
  // ── Local State ──────────────────────────────────────────────────────────
  const [stagnantSantri, setStagnantSantri] = useState<Santri | null>(null);
  const [stagnancyReason, setStagnancyReason] = useState<'keluarga' | 'psikososial' | 'game' | 'lainnya'>('game');
  const [stagnancyDetail, setStagnancyDetail] = useState('');
  const [stagnancyAction, setStagnancyAction] = useState('');
  const [stagnantSearchQuery, setStagnantSearchQuery] = useState('');
  const [catatanStagnasiList, setCatatanStagnasiList] = useState<CatatanStagnasi[]>([]);
  const [localLoading, setLocalLoading] = useState(false);

  // ── Fetch catatan_stagnasi ────────────────────────────────────────────────
  const loadCatatan = useCallback(async () => {
    const { data, error } = await supabase
      .from('catatan_stagnasi')
      .select('*')
      .order('tanggal', { ascending: false });
    if (error) {
      console.warn('Gagal memuat catatan_stagnasi:', error.message);
    } else if (data) {
      setCatatanStagnasiList(data);
    }
  }, []);

  useEffect(() => {
    loadCatatan();
  }, [loadCatatan]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const filteredActiveOnes = santriList
    .filter(s => s.status !== 'stagnant')
    .filter(s => s.nama.toLowerCase().includes(stagnantSearchQuery.toLowerCase()));

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

  // ── Handler: Simpan Intervensi ────────────────────────────────────────────
  const handleSaveIntervention = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stagnantSantri) return;

    setLocalLoading(true);
    try {
      if (stagnantSantri.status === 'stagnant') {
        // Find the latest catatan_stagnasi record for this student
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
          const { error: catatanError } = await supabase
            .from('catatan_stagnasi')
            .update({
              penyebab:         stagnancyReason,
              detail:           stagnancyDetail,
              langkah_korektif: stagnancyAction,
              tanggal:          new Date().toISOString().split('T')[0],
            })
            .eq('id', latestCatatanId);

          if (catatanError) {
            toast.error('Gagal memperbarui catatan stagnasi: ' + catatanError.message);
            return;
          }
        } else {
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
            toast.error('Gagal mencatat intervensi stagnasi: ' + catatanError.message);
            return;
          }
        }

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
          toast.error('Gagal memperbarui data santri: ' + updateError.message);
          return;
        }

        toast.success(`Rencana stagnasi untuk ${stagnantSantri.nama} berhasil diperbarui.`);
      } else {
        // Update status santri menjadi stagnant
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
          toast.error('Gagal memperbarui status stagnasi: ' + updateError.message);
          return;
        }

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
          toast.error('Gagal mencatat intervensi stagnasi: ' + catatanError.message);
          return;
        }

        toast.success(`Langkah intervensi untuk ${stagnantSantri.nama} berhasil dicatat.`);
      }

      setStagnantSantri(null);
      setStagnancyDetail('');
      setStagnancyAction('');
      await loadCatatan();
      onDataChanged();
    } finally {
      setLocalLoading(false);
    }
  };

  // ── Handler: Resolve Stagnasi ─────────────────────────────────────────────
  const handleResolveStagnancy = async (studentId: string) => {
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
      toast.error('Gagal memperbarui status santri: ' + error.message);
      return;
    }

    toast.success('Santri dikembalikan ke status aktif normal.');
    onDataChanged();
  };

  // ── Handler: Update Status Catatan ───────────────────────────────────────
  const handleUpdateStagnancyStatus = async (catatanId: string, status: 'proses' | 'selesai' | 'dipantau') => {
    const { error } = await supabase
      .from('catatan_stagnasi')
      .update({ status_penanganan: status })
      .eq('id', catatanId);

    if (error) {
      toast.error('Gagal memperbarui status penanganan: ' + error.message);
      return;
    }

    toast.success('Status penanganan stagnasi berhasil diperbarui.');
    await loadCatatan();
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
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

            {/* Flag Stagnancy button */}
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

      {/* ── Modal: Analisis Kendala & Intervensi Stagnasi ── */}
      {stagnantSantri && (
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
                    if (selected) setStagnantSantri(selected);
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
                  disabled={localLoading || (stagnantSantri.status !== 'stagnant' && filteredActiveOnes.length === 0)}
                  className="flex-grow bg-red-650 hover:bg-red-750 text-white py-2 rounded-lg text-xs font-bold disabled:opacity-60 shadow"
                >
                  Simpan Tindakan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
