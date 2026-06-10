'use client';

import React, { useState } from 'react';
import { Santri, Setoran, UjianJuz } from '@/types/tahfiz';
import ReportDownloader from '@/components/ReportDownloader';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { BarChart2, Clock } from 'lucide-react';

interface AnalitikPanelProps {
  santriList: Santri[];
  setorans: Setoran[];
  ujianList: UjianJuz[];
  halaqahMap: Record<string, string>;
}

const HALAQAH_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function AnalitikPanel({
  santriList,
  setorans,
  ujianList,
  halaqahMap,
}: AnalitikPanelProps) {
  // ── Local State (for teacher rotation analysis) ───────────────────────────
  const [selectedHalaqahRotation, setSelectedHalaqahRotation] = useState<string>('');
  const [teacherRotationDate, setTeacherRotationDate] = useState<string>('');

  // ── Computed: BarChart data ───────────────────────────────────────────────
  const getHalaqahBarData = () => {
    const halaqahIds = Object.keys(halaqahMap);
    return halaqahIds.map(hId => {
      const santriIds = santriList.filter(s => s.halaqahId === hId).map(s => s.id);
      const sabakLulus = setorans.filter(
        s => santriIds.includes(s.santriId) && s.type === 'sabak' && s.status === 'lulus'
      );
      const avg = sabakLulus.length > 0
        ? Math.round((sabakLulus.reduce((sum, s) => sum + s.baris, 0) / sabakLulus.length) * 10) / 10
        : 0;
      return {
        halaqah: halaqahMap[hId] || hId,
        'Rata-rata Baris': avg,
        count: sabakLulus.length,
      };
    });
  };

  // ── Computed: LineChart trend data ────────────────────────────────────────
  const getHalaqahTrendData = () => {
    const months: string[] = [];
    const now = new Date();
    for (let i = 2; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }));
    }

    const halaqahIds = Object.keys(halaqahMap);

    return months.map(monthLabel => {
      const [monthStr, yearStr] = monthLabel.split(' ');
      const monthNames: Record<string, number> = {
        Jan: 0, Feb: 1, Mar: 2, Apr: 3, Mei: 4, Jun: 5,
        Jul: 6, Agu: 7, Sep: 8, Okt: 9, Nov: 10, Des: 11,
      };
      const mIdx = monthNames[monthStr] ?? -1;
      const yFull = mIdx !== -1 ? parseInt('20' + yearStr) : -1;

      const entry: Record<string, string | number> = { bulan: monthLabel };

      halaqahIds.forEach(hId => {
        const santriIds = santriList.filter(s => s.halaqahId === hId).map(s => s.id);
        const monthSetorans = setorans.filter(s => {
          if (!santriIds.includes(s.santriId) || s.type !== 'sabak' || s.status !== 'lulus') return false;
          const d = new Date(s.date);
          return d.getMonth() === mIdx && d.getFullYear() === yFull;
        });
        const avg = monthSetorans.length > 0
          ? Math.round((monthSetorans.reduce((sum, s) => sum + s.baris, 0) / monthSetorans.length) * 10) / 10
          : 0;
        entry[halaqahMap[hId] || hId] = avg;
      });

      return entry;
    });
  };

  // ── Computed: Teacher Rotation Comparison ─────────────────────────────────
  const getRotationComparison = () => {
    if (!teacherRotationDate || !selectedHalaqahRotation) return null;
    const santriIds = santriList.filter(s => s.halaqahId === selectedHalaqahRotation).map(s => s.id);

    const beforeSetorans = setorans.filter(
      s => santriIds.includes(s.santriId) && s.type === 'sabak' && s.status === 'lulus' && s.date < teacherRotationDate
    );
    const afterSetorans = setorans.filter(
      s => santriIds.includes(s.santriId) && s.type === 'sabak' && s.status === 'lulus' && s.date >= teacherRotationDate
    );

    const beforeAvg = beforeSetorans.length > 0
      ? Math.round((beforeSetorans.reduce((sum, s) => sum + s.baris, 0) / beforeSetorans.length) * 10) / 10
      : 0;

    const afterAvg = afterSetorans.length > 0
      ? Math.round((afterSetorans.reduce((sum, s) => sum + s.baris, 0) / afterSetorans.length) * 10) / 10
      : 0;

    return {
      beforeAvg,
      beforeCount: beforeSetorans.length,
      afterAvg,
      afterCount: afterSetorans.length,
      percentageChange: beforeAvg > 0 ? Math.round(((afterAvg - beforeAvg) / beforeAvg) * 100) : 0,
    };
  };

  const comparison = getRotationComparison();

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 mb-2">
        <BarChart2 className="h-5 w-5 text-indigo-650 dark:text-indigo-400" />
        <h2 className="font-extrabold text-base text-slate-805 dark:text-slate-100">
          Analitik Performa Antar Halaqah
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart: Avg baris per halaqah */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
          <h3 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider mb-1">
            📊 Rata-rata Baris Sabak per Halaqah
          </h3>
          <p className="text-[10px] text-slate-500 mb-4">90 hari terakhir · hanya sabak lulus</p>
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
                  <Bar dataKey="Rata-rata Baris" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-xs text-slate-400">
              Belum ada data setoran yang cukup untuk analitik.
            </div>
          )}
        </div>

        {/* Line Chart: Tren baris per halaqah per bulan */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
          <h3 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider mb-1">
            📈 Tren Performa Halaqah (3 Bulan Terakhir)
          </h3>
          <p className="text-[10px] text-slate-500 mb-4">Rata-rata baris sabak lulus per bulan per halaqah</p>
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
              Belum ada data halaqah untuk ditampilkan.
            </div>
          )}
        </div>
      </div>

      {/* Teacher Rotation Analysis Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
        <h3 className="font-extrabold text-sm text-slate-850 dark:text-slate-150 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex items-center space-x-2">
          <Clock className="h-4.5 w-4.5 text-indigo-500" />
          <span>🔄 Analisis Tren Sebelum / Sesudah Rotasi Pengampu</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Pilih Halaqah</label>
            <select
              value={selectedHalaqahRotation}
              onChange={e => setSelectedHalaqahRotation(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none"
            >
              <option value="">-- Pilih Halaqah --</option>
              {Object.keys(halaqahMap).map(hId => (
                <option key={hId} value={hId}>{halaqahMap[hId]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Tanggal Rotasi Pengampu</label>
            <input
              type="date"
              value={teacherRotationDate}
              onChange={e => setTeacherRotationDate(e.target.value)}
              className="w-full text-xs p-2 border border-slate-200 dark:border-slate-700 bg-slate-55 dark:bg-slate-800 rounded-lg focus:outline-none"
            />
          </div>
          <div className="flex items-end">
            <span className="text-[10px] text-slate-400 leading-normal">
              Analisis ini menghitung performa hafalan santri di halaqah terpilih sebelum dan sesudah tanggal rotasi untuk melihat dampak pergantian ustadz.
            </span>
          </div>
        </div>

        {comparison && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-indigo-100 dark:border-indigo-950/40 rounded-xl bg-indigo-500/5">
            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Rata-rata Sebelum Rotasi</span>
              <strong className="block text-lg font-extrabold text-slate-705 dark:text-slate-300 mt-1">{comparison.beforeAvg} baris/hari</strong>
              <span className="text-[9px] text-slate-455 block">{comparison.beforeCount} setoran sabak lulus</span>
            </div>
            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl">
              <span className="text-[10px] text-slate-440 font-bold uppercase">Rata-rata Sesudah Rotasi</span>
              <strong className="block text-lg font-extrabold text-indigo-650 mt-1">{comparison.afterAvg} baris/hari</strong>
              <span className="text-[9px] text-slate-455 block">{comparison.afterCount} setoran sabak lulus</span>
            </div>
            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl flex flex-col justify-center">
              <span className="text-[10px] text-slate-440 font-bold uppercase">Perubahan Performa</span>
              <div className={`text-lg font-extrabold mt-1 flex items-center ${comparison.percentageChange >= 0 ? 'text-emerald-600' : 'text-red-655'}`}>
                <span>{comparison.percentageChange >= 0 ? '+' : ''}{comparison.percentageChange}%</span>
                <span className="text-[9px] font-bold ml-2 text-slate-455">({comparison.percentageChange >= 0 ? 'Meningkat' : 'Menurun'})</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Report Downloader Component */}
      <div className="mt-8">
        <ReportDownloader santriList={santriList} halaqahMap={halaqahMap} />
      </div>
    </div>
  );
}
