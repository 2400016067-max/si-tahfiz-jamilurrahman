'use client';

import React from 'react';
import { Santri, Setoran } from '@/types/tahfiz';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';

const HALAQAH_COLORS = ['#d97706', '#f59e0b', '#fbbf24', '#f59e0b', '#b45309', '#78350f'];

interface AnalitikPanelProps {
  santriList: Santri[];
  setorans: Setoran[];
  halaqahMap: Record<string, string>;
}

export default function AnalitikPanel({ santriList, setorans, halaqahMap }: AnalitikPanelProps) {
  // ---------------------------------------------------------------------------
  // COMPUTED — Pie chart: distribusi grade santri
  // ---------------------------------------------------------------------------
  const getGradePieData = () => {
    const grades = { Tahsin: 0, Takmil: 0, Tahfiz: 0 };
    santriList.forEach(s => {
      if (grades[s.grade] !== undefined) {
        grades[s.grade]++;
      }
    });
    return [
      { name: 'Tahsin', value: grades.Tahsin, color: '#d97706' },
      { name: 'Takmil', value: grades.Takmil, color: '#2563eb' },
      { name: 'Tahfiz', value: grades.Tahfiz, color: '#059669' },
    ];
  };

  // ---------------------------------------------------------------------------
  // COMPUTED — Bar chart: rerata baris setoran sukses per grade
  // ---------------------------------------------------------------------------
  const getAverageLinesData = () => {
    const counts = {
      Tahsin: { sum: 0, count: 0 },
      Takmil: { sum: 0, count: 0 },
      Tahfiz: { sum: 0, count: 0 },
    };

    const sabakSetorans = setorans.filter(s => s.type === 'sabak' && s.status === 'lulus');
    sabakSetorans.forEach(s => {
      const student = santriList.find(st => st.id === s.santriId);
      if (student && counts[student.grade]) {
        counts[student.grade].sum += s.baris;
        counts[student.grade].count++;
      }
    });

    return Object.keys(counts).map(grade => {
      const g = counts[grade as keyof typeof counts];
      const avg = g.count > 0 ? Math.round((g.sum / g.count) * 10) / 10 : 0;
      return { grade, 'Rata-rata Baris': avg };
    });
  };

  // ---------------------------------------------------------------------------
  // ANALYTICS — Perbandingan Performa Antar Halaqah
  // ---------------------------------------------------------------------------
  const getHalaqahBarData = () => {
    const halaqahIds = Object.keys(halaqahMap);
    return halaqahIds.map(hId => {
      const santriIds = santriList.filter(s => s.halaqahId === hId).map(s => s.id);
      const sabakLulus = setorans.filter(
        s => santriIds.includes(s.santriId) && s.type === 'sabak' && s.status === 'lulus'
      );
      const avg =
        sabakLulus.length > 0
          ? Math.round((sabakLulus.reduce((sum, s) => sum + s.baris, 0) / sabakLulus.length) * 10) / 10
          : 0;
      return { halaqah: halaqahMap[hId] || hId, 'Rata-rata Baris': avg };
    });
  };

  const getHalaqahTrendData = () => {
    const months: string[] = [];
    const now = new Date();
    for (let i = 2; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }));
    }
    const halaqahIds = Object.keys(halaqahMap);
    const monthNames: Record<string, number> = {
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, Mei: 4, Jun: 5,
      Jul: 6, Agu: 7, Sep: 8, Okt: 9, Nov: 10, Des: 11,
    };
    return months.map(monthLabel => {
      const [monthStr, yearStr] = monthLabel.split(' ');
      const mIdx = monthNames[monthStr] ?? -1;
      const yFull = mIdx !== -1 ? parseInt('20' + yearStr) : -1;
      const entry: Record<string, string | number> = { bulan: monthLabel };
      halaqahIds.forEach(hId => {
        const santriIds = santriList.filter(s => s.halaqahId === hId).map(s => s.id);
        const ms = setorans.filter(s => {
          if (!santriIds.includes(s.santriId) || s.type !== 'sabak' || s.status !== 'lulus') return false;
          const d = new Date(s.date);
          return d.getMonth() === mIdx && d.getFullYear() === yFull;
        });
        entry[halaqahMap[hId] || hId] =
          ms.length > 0
            ? Math.round((ms.reduce((sum, s) => sum + s.baris, 0) / ms.length) * 10) / 10
            : 0;
      });
      return entry;
    });
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Distribution Pie Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
          <h3 className="font-extrabold text-xs text-slate-450 uppercase tracking-wider mb-4">
            📊 Distribusi Grade Santri (Kurikulum)
          </h3>
          
          <div className="h-[220px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={getGradePieData()}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {getGradePieData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <p className="text-[10px] text-slate-500 text-center leading-relaxed mt-4">
            Visualisasi proporsi santri pada tingkat Tahsin (amber), Takmil (blue), dan Tahfiz (green).
          </p>
        </div>

        {/* Average Performance Bar Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
          <h3 className="font-extrabold text-xs text-slate-450 uppercase tracking-wider mb-4">
            📈 Rerata Baris Setoran Sukses per Grade
          </h3>

          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getAverageLinesData()}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="grade" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="Rata-rata Baris" fill="#f59e0b" radius={[4, 4, 0, 0]}>
                  {getAverageLinesData().map((entry, index) => {
                    const colors = ['#d97706', '#2563eb', '#059669'];
                    return <Cell key={`cell-${index}`} fill={colors[index % 3]} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="text-[10px] text-slate-500 leading-relaxed mt-4">
            Memantau standar kelulusan sabak harian santri berdasarkan tingkatan grade masing-masing.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* BarChart: rata-rata per halaqah */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
          <h3 className="font-extrabold text-xs text-slate-405 uppercase tracking-wider mb-1">
            📊 Rata-rata Baris Sabak per Halaqah
          </h3>
          <p className="text-[10px] text-slate-500 mb-4">Semua riwayat · hanya sabak lulus</p>
          {getHalaqahBarData().length > 0 ? (
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getHalaqahBarData()} barCategoryGap="35%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="halaqah" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(v) => [`${Number(v)} baris`, 'Rata-rata']}
                    labelFormatter={(l) => `Halaqah ${l}`}
                  />
                  <Bar dataKey="Rata-rata Baris" fill="#d97706" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-xs text-slate-400">
              Belum ada data setoran yang cukup.
            </div>
          )}
        </div>

        {/* LineChart: tren per bulan */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
          <h3 className="font-extrabold text-xs text-slate-405 uppercase tracking-wider mb-1">
            📈 Tren Performa Halaqah (3 Bulan Terakhir)
          </h3>
          <p className="text-[10px] text-slate-500 mb-4">Rata-rata baris sabak lulus per bulan</p>
          {Object.keys(halaqahMap).length > 0 ? (
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={getHalaqahTrendData()}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="bulan" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`${Number(v)} baris`]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {Object.keys(halaqahMap).map((hId, idx) => (
                    <Line
                      key={hId}
                      type="monotone"
                      dataKey={halaqahMap[hId] || hId}
                      stroke={HALAQAH_COLORS[idx % HALAQAH_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-xs text-slate-400">
              Belum ada data halaqah.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
