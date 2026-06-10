'use client';

import React from 'react';
import { toast } from 'sonner';
import { Sparkles } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { Santri, Setoran } from '@/types/tahfiz';

interface PerkembanganPanelProps {
  activeSantri: Santri | null;
  childSetorans: Setoran[];
}

export default function PerkembanganPanel({
  activeSantri,
  childSetorans,
}: PerkembanganPanelProps) {
  if (!activeSantri) return null;

  const getWeeklyStats = () => {
    const last5Days = Array.from({ length: 5 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    return last5Days.map((dateStr) => {
      const daySetorans = childSetorans.filter(
        (s) => s.date === dateStr && s.type === 'sabak' && s.status === 'lulus'
      );
      const totalLines = daySetorans.reduce((sum, s) => sum + s.baris, 0);
      return {
        hari: new Date(dateStr).toLocaleDateString('id-ID', { weekday: 'short' }),
        baris: totalLines || 0,
      };
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
        <h3 className="font-extrabold text-sm text-slate-850 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex items-center justify-between">
          <span>📊 Tren Baris Sabak Anak (5 Hari Terakhir)</span>
          <span className="text-[10px] text-slate-450 font-medium">F2.3.1</span>
        </h3>

        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={getWeeklyStats()}>
              <XAxis dataKey="hari" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
              <Tooltip />
              <Bar dataKey="baris" name="Baris Hafalan" fill="#0d9488" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-105 border-b border-slate-100 dark:border-slate-800 pb-3">
          Achievements &amp; Capaian Juz
        </h3>

        <div className="flex items-center justify-between text-xs text-slate-550">
          <span>Juz yang sudah dikuasai (Lulus UKJ):</span>
          <div className="flex items-center space-x-1 flex-wrap">
            {activeSantri.totalHafalanJuz.length > 0 ? (
              activeSantri.totalHafalanJuz.map((j) => (
                <span
                  key={j}
                  className="inline-flex items-center px-2 py-0.5 rounded bg-teal-500/10 text-teal-700 dark:text-teal-400 font-bold border border-teal-200 dark:border-teal-800/50"
                >
                  Juz {j}
                </span>
              ))
            ) : (
              <span>Belum ada juz tuntas (UKJ)</span>
            )}
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 border border-indigo-150 dark:border-indigo-900/30 p-5 rounded-2xl flex items-center justify-between text-indigo-900 dark:text-indigo-300">
        <div className="flex items-center space-x-3">
          <Sparkles className="h-5 w-5 text-indigo-500" />
          <div>
            <h5 className="font-bold text-xs">Persiapan Ujian Kenaikan Juz</h5>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              Jika juz tuntas, infokan ke Ustadz untuk dijadwalkan UKJ.
            </p>
          </div>
        </div>
        <button
          onClick={() => toast.success('Notifikasi kesiapan dikirim ke Ustadz!')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg transition-colors shadow-sm"
        >
          Ajukan Ujian
        </button>
      </div>
    </div>
  );
}
