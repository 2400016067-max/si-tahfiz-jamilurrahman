'use client';

import React from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Santri, TikrarTask } from '@/types/tahfiz';

interface TikrarPanelProps {
  activeSantri: Santri | null;
  tikrars: TikrarTask[];
  isLoading: boolean;
  onDataChanged: () => void;
}

export default function TikrarPanel({
  activeSantri,
  tikrars,
  onDataChanged,
}: TikrarPanelProps) {
  if (!activeSantri) return null;

  const activeHomeTikrars = tikrars.filter(
    (t) => t.santri_id === activeSantri.id && t.status === 'wajib_rumah'
  );
  const completedHomeTikrars = tikrars.filter(
    (t) => t.santri_id === activeSantri.id && t.status === 'selesai_rumah'
  );

  const handleConfirmTikrar = async (tikrarId: string) => {
    const { error } = await supabase
      .from('tikrar')
      .update({
        status: 'selesai_rumah',
        selesai: true,
        parent_verified: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tikrarId);

    if (error) {
      toast.error('Gagal mengonfirmasi Tikrar: ' + error.message);
      return;
    }

    toast.success('Alhamdulillah! Konfirmasi Tikrar Rumah berhasil dikirim ke Pengampu.');
    onDataChanged();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
        <h3 className="font-extrabold text-sm text-slate-805 dark:text-slate-105 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex items-center justify-between">
          <span>🏠 Tikrar Wajib di Rumah</span>
          <span className="text-[10px] text-purple-700 bg-purple-500/10 px-2.5 py-0.5 rounded font-extrabold">
            Wajib Rumah
          </span>
        </h3>

        {activeHomeTikrars.length > 0 ? (
          <div className="space-y-3">
            {activeHomeTikrars.map((t) => (
              <div
                key={t.id}
                className="bg-white/80 dark:bg-slate-900/80 p-4 rounded-xl border border-purple-100 dark:border-purple-900/30 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-3"
              >
                <div>
                  <span className="font-bold text-slate-850 dark:text-slate-200 text-sm">
                    Surah {t.surah} (Halaman {t.halaman})
                  </span>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Wajib diulang sebanyak {t.jumlah_ulang}x di rumah.
                  </p>
                </div>
                <button
                  onClick={() => handleConfirmTikrar(t.id)}
                  className="bg-purple-600 hover:bg-purple-705 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm transition-colors whitespace-nowrap self-end sm:self-auto"
                >
                  Konfirmasi Selesai
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic py-4 text-center">
            Alhamdulillah, tidak ada tugas Tikrar Rumah aktif untuk anak Anda saat ini.
          </p>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
        <h3 className="font-extrabold text-sm text-slate-805 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
          📜 Riwayat Tikrar Mandiri Selesai
        </h3>

        {completedHomeTikrars.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/40">
            {completedHomeTikrars.map((t) => (
              <div key={t.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-slate-750 dark:text-slate-200">
                    Surah {t.surah} (Hal {t.halaman})
                  </span>
                  <span className="block text-[10px] text-slate-455 mt-0.5">
                    Selesai pada: {t.tanggal}
                  </span>
                </div>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-450 font-bold">
                  ✓ Selesai &amp; Terkonfirmasi
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic py-4 text-center">
            Belum ada riwayat Tikrar Rumah yang dikonfirmasi selesai.
          </p>
        )}
      </div>
    </div>
  );
}
