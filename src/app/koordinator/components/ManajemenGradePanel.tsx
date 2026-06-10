'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { logAudit } from '@/lib/auditLog';
import { Santri, RiwayatGrade } from '@/types/tahfiz';
import { History } from 'lucide-react';

interface ManajemenGradePanelProps {
  santriList: Santri[];
  halaqahMap: Record<string, string>;
  userId: string;
  namaLengkap: string;
  isLoading: boolean;
  onDataChanged: () => void;
}

export default function ManajemenGradePanel({
  santriList,
  halaqahMap,
  userId,
  namaLengkap,
  isLoading,
  onDataChanged,
}: ManajemenGradePanelProps) {
  // ── Local State ──────────────────────────────────────────────────────────
  const [editingSantri, setEditingSantri] = useState<Santri | null>(null);
  const [newGrade, setNewGrade] = useState<'Tahsin' | 'Takmil' | 'Tahfiz'>('Tahfiz');
  const [riwayatGrades, setRiwayatGrades] = useState<RiwayatGrade[]>([]);
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState<string>('');

  // ── Fetch riwayat_grade ───────────────────────────────────────────────────
  const loadRiwayat = useCallback(async () => {
    const { data, error } = await supabase
      .from('riwayat_grade')
      .select('*')
      .order('tanggal_ubah', { ascending: false });
    if (error) {
      console.warn('Gagal memuat riwayat_grade:', error.message);
    } else if (data) {
      setRiwayatGrades(data);
    }
  }, []);

  useEffect(() => {
    loadRiwayat();
  }, [loadRiwayat]);

  // ── Handler: Simpan Grade Baru ────────────────────────────────────────────
  const handleUpdateGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSantri) return;

    let targetBaris = 12;
    if (newGrade === 'Tahsin') targetBaris = 3;
    if (newGrade === 'Takmil') targetBaris = 7;
    if (newGrade === 'Tahfiz') targetBaris = 15;

    // 1. Update tabel santri
    const { error: updateError } = await supabase
      .from('santri')
      .update({
        grade: newGrade,
        target_baris: targetBaris,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingSantri.id);

    if (updateError) {
      toast.error('Gagal memperbarui grade santri: ' + updateError.message);
      return;
    }

    // 2. Catat ke riwayat_grade
    const { error: riwayatError } = await supabase.from('riwayat_grade').insert({
      santri_id:         editingSantri.id,
      grade_lama:        editingSantri.grade,
      grade_baru:        newGrade,
      target_baris_baru: targetBaris,
      tanggal_ubah:      new Date().toISOString().split('T')[0],
      alasan:            'Perubahan grade oleh Koordinator Tahfiz',
    });

    if (riwayatError) {
      toast.error('Gagal mencatat riwayat grade: ' + riwayatError.message);
      return;
    }

    toast.success(`Berhasil memperbarui Grade ${editingSantri.nama} ke ${newGrade} dengan target harian ${targetBaris} baris.`);

    logAudit({
      userId,
      namaUser: namaLengkap,
      aksi: 'UBAH_GRADE',
      targetTabel: 'santri',
      targetId: editingSantri.id,
      detail: {
        nama: editingSantri.nama,
        grade_lama: editingSantri.grade,
        grade_baru: newGrade,
      },
    });

    setEditingSantri(null);
    await loadRiwayat();
    onDataChanged();
  };

  const filteredHistory = selectedStudentForHistory
    ? riwayatGrades.filter(r => r.santri_id === selectedStudentForHistory)
    : riwayatGrades;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="space-y-6">
        {/* Grade Management Section (F3.1) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="font-extrabold text-sm text-slate-850 dark:text-slate-150 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex items-center justify-between">
            <span>📋 Manajemen Grade &amp; Target Santri</span>
            <span className="text-[10px] text-slate-450">F3.1</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
                  <th className="pb-2 font-bold">Nama Santri</th>
                  <th className="pb-2 font-bold">Grade Aktual</th>
                  <th className="pb-2 font-bold">Target Harian</th>
                  <th className="pb-2 font-bold">Halaqah</th>
                  <th className="pb-2 text-right font-bold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {santriList.map(student => (
                  <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/10 transition-colors">
                    <td className="py-3 font-bold text-slate-800 dark:text-slate-200">{student.nama}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        student.grade === 'Tahfiz'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/45 dark:text-emerald-400'
                          : student.grade === 'Takmil'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/45 dark:text-blue-400'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/45 dark:text-amber-400'
                      }`}>
                        {student.grade}
                      </span>
                    </td>
                    <td className="py-3 font-semibold text-slate-600 dark:text-slate-400">{student.targetBaris} baris/hari</td>
                    <td className="py-3 text-slate-500">{halaqahMap[student.halaqahId] || 'Halaqah'}</td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => {
                          setEditingSantri(student);
                          setNewGrade(student.grade);
                        }}
                        disabled={isLoading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-2.5 py-1 rounded transition-colors disabled:opacity-60"
                      >
                        Ubah Grade
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Riwayat Perubahan Grade */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 gap-3">
            <h3 className="font-extrabold text-sm text-slate-850 dark:text-slate-150 flex items-center space-x-1.5">
              <History className="h-4 w-4 text-indigo-500" />
              <span>Riwayat Perubahan Grade Santri</span>
            </h3>
            <select
              value={selectedStudentForHistory}
              onChange={e => setSelectedStudentForHistory(e.target.value)}
              className="text-xs p-1.5 border border-slate-250 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none"
            >
              <option value="">Semua Santri</option>
              {santriList.map(s => (
                <option key={s.id} value={s.id}>{s.nama}</option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto max-h-60">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
                  <th className="pb-2 font-bold">Santri</th>
                  <th className="pb-2 font-bold">Dari &rarr; Ke</th>
                  <th className="pb-2 font-bold">Target Baru</th>
                  <th className="pb-2 font-bold">Tanggal Ubah</th>
                  <th className="pb-2 font-bold">Alasan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {filteredHistory.map((r, idx) => {
                  const student = santriList.find(s => s.id === r.santri_id);
                  return (
                    <tr key={r.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/10">
                      <td className="py-3 font-semibold">{student?.nama || 'Santri'}</td>
                      <td className="py-3 font-semibold">
                        <span className="text-slate-400">{r.grade_lama}</span> &rarr; <span className="text-indigo-650 dark:text-indigo-400 font-bold">{r.grade_baru}</span>
                      </td>
                      <td className="py-3 text-slate-500">{r.target_baris_baru} baris/hari</td>
                      <td className="py-3 text-slate-500">{r.tanggal_ubah}</td>
                      <td className="py-3 text-slate-450 italic">&ldquo;{r.alasan}&rdquo;</td>
                    </tr>
                  );
                })}
                {filteredHistory.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-4 text-slate-400 italic">Belum ada riwayat perubahan grade.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Modal: Ubah Klasifikasi Grade ── */}
      {editingSantri && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-sm shadow-xl space-y-4 animate-in zoom-in-95 duration-200">
            <h4 className="font-extrabold text-base">Ubah Klasifikasi Grade</h4>
            <p className="text-xs text-slate-500">Sesuaikan target hafalan {editingSantri.nama} secara instan.</p>

            <form onSubmit={handleUpdateGrade} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400">Pilih Grade Baru</label>
                <select
                  value={newGrade}
                  onChange={e => setNewGrade(e.target.value as 'Tahsin' | 'Takmil' | 'Tahfiz')}
                  className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none"
                >
                  <option value="Tahsin">Tahsin (Target: 2-3 baris/hari)</option>
                  <option value="Takmil">Takmil (Target: 7 baris/hari)</option>
                  <option value="Tahfiz">Tahfiz (Target: 10-15 baris/hari)</option>
                </select>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSantri(null)}
                  className="flex-grow bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-355 py-2 rounded-lg text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-grow bg-indigo-650 hover:bg-indigo-750 text-white py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-60 shadow"
                >
                  Simpan Grade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
