'use client';

import React, { useState } from 'react';
import { Santri } from '@/types/tahfiz';
import { Search, AlertTriangle } from 'lucide-react';

interface PemantauanPanelProps {
  santriList: Santri[];
  halaqahMap: Record<string, string>;
}

export default function PemantauanPanel({ santriList, halaqahMap }: PemantauanPanelProps) {
  // Filter state — local to this panel
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGrade, setFilterGrade] = useState<'All' | 'Tahsin' | 'Takmil' | 'Tahfiz'>('All');
  const [filterHalaqah, setFilterHalaqah] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<'All' | 'active' | 'stagnant'>('All');

  const monitoredStudents = santriList.filter(s => {
    const matchesSearch =
      s.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.kelas.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGrade = filterGrade === 'All' || s.grade === filterGrade;
    const matchesHalaqah = filterHalaqah === 'All' || s.halaqahId === filterHalaqah;
    const matchesStatus = filterStatus === 'All' || s.status === filterStatus;
    return matchesSearch && matchesGrade && matchesHalaqah && matchesStatus;
  });

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-6">
      {/* Panel header */}
      <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
        <h3 className="font-extrabold text-sm text-slate-850 dark:text-slate-100">
          Pemantauan Capaian &amp; Perkembangan Santri
        </h3>
        <p className="text-[10px] text-slate-450 mt-1">
          Gunakan filter untuk meninjau secara cepat status keaktifan, grade kurikulum, dan capaian juz per santri.
        </p>
      </div>

      {/* Filter Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        {/* Search Query */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama atau kelas..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        {/* Grade filter */}
        <div>
          <select
            value={filterGrade}
            onChange={e => setFilterGrade(e.target.value as 'All' | 'Tahsin' | 'Takmil' | 'Tahfiz')}
            className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none focus:border-amber-500 transition-colors"
          >
            <option value="All">Semua Grade</option>
            <option value="Tahsin">Tahsin</option>
            <option value="Takmil">Takmil</option>
            <option value="Tahfiz">Tahfiz</option>
          </select>
        </div>

        {/* Halaqah filter */}
        <div>
          <select
            value={filterHalaqah}
            onChange={e => setFilterHalaqah(e.target.value)}
            className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none focus:border-amber-500 transition-colors"
          >
            <option value="All">Semua Halaqah</option>
            {Object.entries(halaqahMap).map(([id, nama]) => (
              <option key={id} value={id}>{nama}</option>
            ))}
          </select>
        </div>

        {/* Status filter */}
        <div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as 'All' | 'active' | 'stagnant')}
            className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none focus:border-amber-500 transition-colors"
          >
            <option value="All">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="stagnant">Stagnan</option>
          </select>
        </div>
      </div>

      {/* Students list */}
      <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-150 dark:border-slate-850 text-slate-500 font-bold uppercase tracking-wider text-[9px]">
              <th className="p-3">Nama &amp; Kelas</th>
              <th className="p-3">Halaqah</th>
              <th className="p-3">Grade &amp; Target</th>
              <th className="p-3">Status</th>
              <th className="p-3">Capaian Juz Selesai</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {monitoredStudents.map(student => {
              const isStagnant = student.status === 'stagnant';
              const gradeColors = {
                Tahsin: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/30',
                Takmil: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/30',
                Tahfiz: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/30',
              };

              return (
                <React.Fragment key={student.id}>
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-slate-855 dark:text-slate-200">{student.nama}</div>
                      <div className="text-[10px] text-slate-400">Kelas {student.kelas}</div>
                    </td>
                    <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                      {halaqahMap[student.halaqahId] || student.halaqahId}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${gradeColors[student.grade] || 'bg-slate-105'}`}>
                        {student.grade}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-1">Target: {student.targetBaris} baris</div>
                    </td>
                    <td className="p-3">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        isStagnant
                          ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400 border border-red-200/30'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/30'
                      }`}>
                        {isStagnant ? 'Stagnan' : 'Aktif'}
                      </span>
                    </td>
                    <td className="p-3 font-medium text-slate-750 dark:text-slate-350">
                      {student.totalHafalanJuz.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {student.totalHafalanJuz.map(j => (
                            <span key={j} className="bg-slate-100 dark:bg-slate-800 text-[10px] font-bold px-1.5 py-0.5 rounded text-slate-650 dark:text-slate-400">
                              Juz {j}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[10px]">Belum ada juz selesai</span>
                      )}
                    </td>
                  </tr>
                  
                  {/* Stagnancy Intervention Box */}
                  {isStagnant && (
                    <tr className="bg-red-500/5">
                      <td colSpan={5} className="p-3 border-t-0 border-b border-slate-150 dark:border-slate-850">
                        <div className="flex items-start space-x-2.5 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/80 rounded-xl text-[10px] text-slate-600 dark:text-slate-400">
                          <AlertTriangle className="h-4 w-4 text-red-505 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <div>
                              <span className="font-extrabold text-red-650 dark:text-red-400 uppercase text-[9px] tracking-wider block mb-0.5">Analisis Penyebab Stagnasi:</span>
                              <span className="capitalize font-semibold text-slate-800 dark:text-slate-200">{student.stagnancyReason || 'Belum dianalisis'}</span>
                            </div>
                            {student.stagnancyDetail && (
                              <div>
                                <span className="font-bold text-slate-700 dark:text-slate-300">Detail Kasus:</span> {student.stagnancyDetail}
                              </div>
                            )}
                            {student.stagnancyAction && (
                              <div>
                                <span className="font-bold text-slate-700 dark:text-slate-300">Langkah Korektif Koordinator:</span>{' '}
                                <span className="text-amber-700 dark:text-amber-400 font-semibold">{student.stagnancyAction}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}

            {monitoredStudents.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-400 italic">
                  Tidak ada data santri yang cocok dengan filter aktif.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
