'use client';

import React from 'react';
import { toast } from 'sonner';
import { Flame } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Santri, TikrarTask } from '@/types/tahfiz';

interface TikrarPanelProps {
  tikrars: TikrarTask[];
  activeStudents: Santri[];
  isLoading: boolean;
  onDataChanged: () => void;
}

export default function TikrarPanel({ tikrars, activeStudents, isLoading, onDataChanged }: TikrarPanelProps) {
  const activeStudentIds = activeStudents.map(s => s.id);
  const halaqahTikrars = tikrars.filter(t => activeStudentIds.includes(t.santri_id));

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
                <th className="py-3 px-4">Status &amp; Lokasi</th>
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
}
