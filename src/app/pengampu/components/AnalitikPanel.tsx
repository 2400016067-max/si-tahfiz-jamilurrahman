'use client';

import React from 'react';
import { TrendingUp } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, LineChart, Line, Legend } from 'recharts';
import { Santri, Setoran } from '@/types/tahfiz';

interface AnalitikPanelProps {
  activeStudents: Santri[];
  setorans: Setoran[];
  selectedSantri: Santri | null;
  activeHalaqahNama: string;
  onSelectSantri: (student: Santri) => void;
}

function formatSetoranDate(dateStr: string): string {
  if (!dateStr) return '';
  const todayStr = new Date().toISOString().split('T')[0];

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (dateStr === todayStr) {
    return 'Hari Ini';
  }
  if (dateStr === yesterdayStr) {
    return 'Kemarin';
  }

  try {
    const d = new Date(dateStr);
    const day = d.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    if (isNaN(day) || !month) return dateStr;
    return `${day} ${month} ${year}`;
  } catch {
    return dateStr;
  }
}

export default function AnalitikPanel({
  activeStudents,
  setorans,
  selectedSantri,
  activeHalaqahNama,
  onSelectSantri,
}: AnalitikPanelProps) {
  const getChartData = (studentId: string) => {
    const studentSetorans = setorans
      .filter(s => s.santriId === studentId && s.type === 'sabak' && s.status === 'lulus')
      .slice(-7)
      .reverse();

    return studentSetorans.map(s => ({
      tanggal: formatSetoranDate(s.date),
      baris: s.baris,
      kesalahan: s.kesalahan
    }));
  };

  const getHalaqahWeeklyData = () => {
    const halaqahSantriIds = activeStudents.map(s => s.id);
    const sabakLulus = setorans.filter(
      s => halaqahSantriIds.includes(s.santriId) && s.type === 'sabak' && s.status === 'lulus'
    );

    if (sabakLulus.length === 0) return [];

    const weeks: { label: string; startDate: string; endDate: string }[] = [];
    const now = new Date();
    for (let i = 3; i >= 0; i--) {
      const endDate = new Date(now);
      endDate.setDate(now.getDate() - i * 7);
      const startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - 6);
      const label = `${startDate.getDate()}/${startDate.getMonth() + 1} – ${endDate.getDate()}/${endDate.getMonth() + 1}`;
      weeks.push({
        label,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      });
    }

    return weeks.map(week => {
      const weekSetorans = sabakLulus.filter(
        s => s.date >= week.startDate && s.date <= week.endDate
      );
      const avg = weekSetorans.length > 0
        ? Math.round((weekSetorans.reduce((sum, s) => sum + s.baris, 0) / weekSetorans.length) * 10) / 10
        : 0;
      return {
        minggu: week.label,
        'Rata-rata Baris': avg,
        total: weekSetorans.length,
      };
    });
  };

  const getSantriBarData = () => {
    return activeStudents.map(student => {
      const sabakLulus = setorans.filter(
        s => s.santriId === student.id && s.type === 'sabak' && s.status === 'lulus'
      );
      const avg = sabakLulus.length > 0
        ? Math.round((sabakLulus.reduce((sum, s) => sum + s.baris, 0) / sabakLulus.length) * 10) / 10
        : 0;
      return {
        nama: student.nama.split(' ')[0],
        'Rata-rata Baris': avg,
        target: student.targetBaris,
      };
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <span className="font-bold text-slate-805 dark:text-slate-200 text-sm">Analitik Santri:</span>
          <select
            value={selectedSantri?.id || ''}
            onChange={(e) => {
              const student = activeStudents.find(s => s.id === e.target.value);
              if (student) onSelectSantri(student);
            }}
            className="text-xs p-1.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none"
          >
            <option value="" disabled>Pilih Santri...</option>
            {activeStudents.map(s => (
              <option key={s.id} value={s.id}>{s.nama}</option>
            ))}
          </select>
        </div>
        {selectedSantri && (
          <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${selectedSantri.status === 'stagnant' ? 'bg-red-105 text-red-800 dark:bg-red-950/30 dark:text-red-400' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30'}`}>
            Status: {selectedSantri.status === 'stagnant' ? '⚠ Stagnan' : '✓ Normal'}
          </span>
        )}
      </div>

      {selectedSantri ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
          <h4 className="font-bold text-xs text-slate-700 dark:text-slate-350 mb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <span>📈 Grafik Tren Baris Setoran ({selectedSantri.nama})</span>
            <span className="text-[10px] text-slate-500">7 setoran lulus terakhir</span>
          </h4>
          {getChartData(selectedSantri.id).length > 0 ? (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={getChartData(selectedSantri.id)}>
                  <defs>
                    <linearGradient id="colorBaris" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="tanggal" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="baris" name="Baris" stroke="#10b981" fillOpacity={1} fill="url(#colorBaris)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-xs text-slate-450">Belum ada riwayat setoran lulus.</div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl text-center text-xs text-slate-400">Silakan pilih salah satu santri untuk melihat grafik tren.</div>
      )}

      <div className="pt-4 border-t border-slate-150 dark:border-slate-850 space-y-4">
        <div className="flex items-center space-x-2">
          <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <h4 className="font-extrabold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Analitik Halaqah: {activeHalaqahNama || 'Halaqah Pengampu'}
          </h4>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
            <h5 className="font-bold text-xs text-slate-750 dark:text-slate-350 mb-1">📈 Tren Rata-rata Baris per Minggu</h5>
            <p className="text-[10px] text-slate-500 mb-4">4 minggu terakhir</p>
            {getHalaqahWeeklyData().length > 0 ? (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={getHalaqahWeeklyData()}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="minggu" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 9 }} />
                    <Tooltip formatter={(v, name) => [`${Number(v)} baris`, String(name)]} />
                    <Line type="monotone" dataKey="Rata-rata Baris" stroke="#10b981" strokeWidth={2} dot={{ r: 4, fill: '#10b981' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-[10px] text-slate-400">Belum ada riwayat.</div>
            )}
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
            <h5 className="font-bold text-xs text-slate-755 dark:text-slate-350 mb-1">📊 Rata-rata Sabak Lulus per Santri</h5>
            <p className="text-[10px] text-slate-500 mb-4">30 hari terakhir</p>
            {getSantriBarData().length > 0 ? (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getSantriBarData()} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="nama" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 9 }} />
                    <Tooltip formatter={(v, name) => [`${Number(v)} baris`, name === 'Rata-rata Baris' ? 'Rata-rata' : 'Target']} />
                    <Legend wrapperStyle={{ fontSize: 9 }} />
                    <Bar dataKey="Rata-rata Baris" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="target" fill="#f97316" opacity={0.5} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-[10px] text-slate-400">Belum ada data.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
