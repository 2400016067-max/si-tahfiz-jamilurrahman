'use client';

import React from 'react';
import { AlertCircle, Calendar, Flame } from 'lucide-react';
import { Santri, Setoran, TikrarTask } from '@/types/tahfiz';

interface BerandaPanelProps {
  activeSantri: Santri | null;
  childSetorans: Setoran[];
  tikrars: TikrarTask[];
  selectedSantriId: string;
  namaLengkap: string;
}

export default function BerandaPanel({
  activeSantri,
  childSetorans,
  tikrars,
  namaLengkap,
}: BerandaPanelProps) {
  if (!activeSantri) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const todaySchoolSetorans = childSetorans.filter(
    (s) => s.date === todayStr && s.type !== 'manzil'
  );
  const activeHomeTikrars = tikrars.filter(
    (t) => t.santri_id === activeSantri.id && t.status === 'wajib_rumah'
  );

  return (
    <div className="space-y-6">
      {/* Personal Greeting */}
      {namaLengkap && (
        <div className="mb-2 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex items-center space-x-2">
          <span className="text-lg">👋</span>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-205">
            Selamat datang, <span className="font-semibold text-teal-650 dark:text-teal-400">{namaLengkap}</span>
          </p>
        </div>
      )}

      {/* Today's School Results */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <h3 className="font-extrabold text-sm text-slate-805 dark:text-slate-100 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
          <span>🏫 Laporan Setoran Sekolah Hari Ini</span>
          <span className="text-[10px] text-slate-450 font-medium">F2.2</span>
        </h3>

        {todaySchoolSetorans.length > 0 ? (
          <div className="space-y-4">
            {todaySchoolSetorans.map((setoran) => (
              <div
                key={setoran.id}
                className={`p-4 border rounded-xl flex items-start justify-between ${
                  setoran.status === 'lulus'
                    ? 'bg-emerald-500/5 border-emerald-100 dark:border-emerald-900/30'
                    : 'bg-red-500/5 border-red-100 dark:border-red-900/30'
                }`}
              >
                <div className="space-y-1">
                  <span
                    className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded ${
                      setoran.type === 'sabak'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-950/40'
                    }`}
                  >
                    {setoran.type === 'sabak' ? 'Sabak (Baru)' : 'Sabki (Kemarin)'}
                  </span>
                  <h4 className="font-extrabold text-sm mt-1.5 text-slate-900 dark:text-slate-105">
                    Surah {setoran.surah} (Halaman {setoran.halamanMulai})
                  </h4>
                  <p className="text-xs text-slate-500">
                    Jumlah: {setoran.baris} baris · Kesalahan: {setoran.kesalahan} kali
                  </p>
                  {setoran.notes && (
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-450 italic mt-1">
                      &ldquo;{setoran.notes}&rdquo;
                    </p>
                  )}
                </div>
                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                    setoran.status === 'lulus'
                      ? 'bg-emerald-100 text-emerald-805 dark:bg-emerald-950/50'
                      : 'bg-red-100 text-red-805 dark:bg-red-950/50'
                  }`}
                >
                  {setoran.status === 'lulus' ? 'Lulus Target' : 'Mengulang'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-slate-450 dark:text-slate-500 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-150 dark:border-slate-800">
            <Calendar className="h-8 w-8 mx-auto text-slate-350 mb-2" />
            Belum ada setoran sekolah yang direkam oleh Ustadz hari ini. Sesi tahfiz berlangsung pukul 07:00 - 09:00 WIB.
          </div>
        )}
      </div>

      {/* Notifications & Reminders */}
      {activeHomeTikrars.length > 0 && (
        <div className="bg-purple-500/10 border border-purple-200 dark:border-purple-900/40 p-4 rounded-2xl flex items-start space-x-3 text-purple-750 dark:text-purple-350 shadow-sm">
          <Flame className="h-5 w-5 mt-0.5 shrink-0 text-purple-500" />
          <div>
            <h4 className="font-bold text-xs">Kewajiban Tikrar Rumah Aktif</h4>
            <p className="text-[10px] leading-relaxed mt-1">
              Ada {activeHomeTikrars.length} tugas Tikrar mandiri di rumah yang belum diselesaikan untuk {activeSantri.nama}. Silakan lihat menu{' '}
              <strong className="font-semibold text-purple-700 dark:text-purple-400">Tikrar Rumah</strong>{' '}
              untuk melakukan konfirmasi.
            </p>
          </div>
        </div>
      )}

      {activeSantri.status === 'stagnant' && (
        <div className="bg-red-500/10 border border-red-200 dark:border-red-900/40 p-4 rounded-2xl flex items-start space-x-3 text-red-750 dark:text-red-350 shadow-sm">
          <AlertCircle className="h-5 w-5 mt-0.5 shrink-0 text-red-655" />
          <div>
            <h4 className="font-bold text-xs">Pemberitahuan Stagnasi</h4>
            <p className="text-[10px] leading-relaxed mt-1">
              Ustadz mencatat adanya hambatan perkembangan hafalan (stuck) pada {activeSantri.nama}. Koordinator Tahfiz saat ini sedang memantau dan mengambil langkah intervensi ({activeSantri.stagnancyAction || 'Konseling'}). Mohon dampingi murojaah di rumah.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
