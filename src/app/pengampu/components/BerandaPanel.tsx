'use client';

import React from 'react';
import { AlertCircle, ClipboardCheck, Award, Flame } from 'lucide-react';
import { Santri, TikrarTask, Setoran } from '@/types/tahfiz';

interface BerandaPanelProps {
  activeStudents: Santri[];
  tikrars: TikrarTask[];
  setorans: Setoran[];
  activePekan: any | null;
  namaLengkap: string;
  activeHalaqahNama: string;
  activeHalaqahUnit: string;
}

export default function BerandaPanel({
  activeStudents,
  tikrars,
  setorans,
  namaLengkap,
  activeHalaqahNama,
  activeHalaqahUnit,
}: BerandaPanelProps) {
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySetorans = setorans.filter(s => s.date === todayStr);
  const activeStudentIds = activeStudents.map(s => s.id);
  const todaySabakSetorans = todaySetorans.filter(s => s.type === 'sabak' && activeStudentIds.includes(s.santriId));
  const totalSetor = todaySabakSetorans.length;
  const totalBelumSetor = activeStudents.length - totalSetor;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const yesterdayManzilSetorans = setorans.filter(s => s.type === 'manzil' && s.date === yesterdayStr && activeStudentIds.includes(s.santriId));
  const totalManzilYesterday = yesterdayManzilSetorans.length;
  const totalManzilVerifiedYesterday = yesterdayManzilSetorans.filter(s => s.parentVerified).length;

  const activeHalaqahTikrars = tikrars.filter(t => activeStudentIds.includes(t.santri_id) && !t.selesai);

  return (
    <div className="space-y-6">
      {namaLengkap && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex items-center space-x-4">
          <span className="text-3xl">🕌</span>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-105">
              Selamat Datang, Ustadz/Ustadzah <span className="text-emerald-605 dark:text-emerald-400 font-extrabold">{namaLengkap}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Aplikasi SI Tahfiz · Kelompok Halaqah: <span className="font-semibold text-slate-700 dark:text-slate-350">{activeHalaqahNama || 'Halaqah Pengampu'}</span> · Unit: {activeHalaqahUnit || '-'}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Setoran Hari Ini</span>
            <div className="text-2xl font-black text-slate-850 dark:text-white">
              {totalSetor} <span className="text-xs text-slate-400 font-normal">/ {activeStudents.length} Santri</span>
            </div>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
              {totalBelumSetor} santri belum menyetor
            </p>
          </div>
          <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <ClipboardCheck className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Verifikasi Manzil Kemarin</span>
            <div className="text-2xl font-black text-slate-850 dark:text-white">
              {totalManzilVerifiedYesterday} <span className="text-xs text-slate-400 font-normal">/ {totalManzilYesterday} Laporan</span>
            </div>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
              {totalManzilYesterday - totalManzilVerifiedYesterday} pending persetujuan ortu
            </p>
          </div>
          <div className="h-12 w-12 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <Award className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Tikrar Aktif</span>
            <div className="text-2xl font-black text-slate-850 dark:text-white">
              {activeHalaqahTikrars.length} <span className="text-xs text-slate-400 font-normal">Kewajiban</span>
            </div>
            <p className="text-[10px] text-amber-605 dark:text-amber-400 font-semibold mt-1">
              Perlu pengulangan di sekolah/rumah
            </p>
          </div>
          <div className="h-12 w-12 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Flame className="h-6 w-6" />
          </div>
        </div>
      </div>

      {activeHalaqahTikrars.length > 0 && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/80 p-5 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-red-800 dark:text-red-400 font-extrabold text-sm">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span>Peringatan Tikrar Aktif Harian</span>
          </div>
          <p className="text-xs text-red-750 dark:text-red-400">
            Berikut adalah daftar santri yang memiliki tugas Tikrar yang belum selesai. Mohon dikoordinasikan untuk pengulangan agar hafalan tidak hilang.
          </p>
          <div className="divide-y divide-red-100 dark:divide-red-900/40 bg-white dark:bg-slate-950/50 rounded-xl border border-red-200 dark:border-red-905/50 overflow-hidden">
            {activeHalaqahTikrars.map((t) => {
              const studentName = activeStudents.find(s => s.id === t.santri_id)?.nama || 'Santri';
              return (
                <div key={t.id} className="p-3 text-xs flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-205">{studentName}</span>
                    <span className="ml-2 text-slate-500 font-medium">Surah {t.surah} (Hal {t.halaman})</span>
                  </div>
                  <span className="bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                    {t.status === 'wajib_sekolah' ? 'Wajib Sekolah' : 'Wajib Rumah'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
