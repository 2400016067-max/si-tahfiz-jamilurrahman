'use client';

import React from 'react';
import { toast } from 'sonner';
import { Award } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Santri, Setoran } from '@/types/tahfiz';

interface ManzilPanelProps {
  activeStudents: Santri[];
  setorans: Setoran[];
}

// Check if yesterday's Manzil was verified by parent
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

export default function ManzilPanel({ activeStudents, setorans }: ManzilPanelProps) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-slate-150 dark:border-slate-800 mb-6">
        <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100 flex items-center space-x-2">
          <Award className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <span>Status Manzil Santri Kemarin / Hari Ini</span>
        </h3>
        <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-350 px-2 py-0.5 rounded font-extrabold">Verification</span>
      </div>

      <div className="space-y-4">
        {activeStudents.map((student) => {
          const manzil = checkManzilStatus(student.id, setorans);
          return (
            <div key={student.id} className="border border-slate-150 dark:border-slate-800 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-sm transition-shadow">
              <div>
                <h4 className="font-bold text-sm text-slate-850 dark:text-slate-200">{student.nama}</h4>
                <p className="text-[10px] text-slate-500">Grade {student.grade} · Kelas {student.kelas}</p>
                {manzil ? (
                  <div className="mt-2 text-xs text-slate-650 dark:text-slate-350">
                    Setoran Manzil: <span className="font-bold text-slate-805 dark:text-slate-105">Surah {manzil.surah} (Halaman {manzil.halaman})</span>
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-slate-400 italic">Belum ada laporan Manzil.</div>
                )}
              </div>
              <div className="flex flex-col md:items-end justify-center space-y-2">
                {manzil ? (
                  <>
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${manzil.verified ? 'bg-emerald-100 text-emerald-805 dark:bg-emerald-950/35 dark:text-emerald-400' : 'bg-amber-100 text-amber-805 dark:bg-amber-950/35 dark:text-amber-400'}`}>
                      {manzil.verified ? '✓ Terverifikasi' : '⚠ Pending'}
                    </span>
                    {manzil.verified && manzil.parentSignature && (
                      <div className="flex items-center space-x-2">
                        <span className="text-[9px] text-slate-450">Bukti:</span>
                        <div className="bg-white p-0.5 rounded border border-slate-200 dark:border-slate-700">
                          <img src={manzil.parentSignature} alt="Sig" className="h-6 object-contain max-w-[100px]" />
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950/35 dark:text-red-400">⚠ Belum Ada Laporan</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
