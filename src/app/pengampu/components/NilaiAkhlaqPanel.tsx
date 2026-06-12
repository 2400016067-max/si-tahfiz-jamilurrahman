'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Santri, NilaiAkhlaq } from '@/types/tahfiz';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Heart, Loader2, Save, CheckCircle2 } from 'lucide-react';

interface NilaiAkhlaqPanelProps {
  activeStudents: Santri[];
  pengampuDbId: string;
}

export default function NilaiAkhlaqPanel({
  activeStudents,
  pengampuDbId
}: NilaiAkhlaqPanelProps) {
  // State
  const [akhlaqAktif, setAkhlaqAktif] = useState<boolean>(false);
  const [akhlaqSemester, setAkhlaqSemester] = useState<string>('');
  const [isLoadingSettings, setIsLoadingSettings] = useState<boolean>(true);
  const [nilaiMap, setNilaiMap] = useState<Record<string, NilaiAkhlaq>>({});
  const [formValues, setFormValues] = useState<Record<string, { nilai: number; catatan: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  // loadNilai function
  const loadNilai = useCallback(async (semester: string) => {
    const studentIds = activeStudents.map(s => s.id);
    if (studentIds.length === 0) {
      setNilaiMap({});
      setFormValues({});
      return;
    }

    const { data } = await supabase
      .from('nilai_akhlaq')
      .select('*')
      .eq('semester', semester)
      .in('santri_id', studentIds);

    if (data) {
      const map: Record<string, NilaiAkhlaq> = {};
      const initialForm: Record<string, { nilai: number; catatan: string }> = {};

      data.forEach((n: NilaiAkhlaq) => {
        map[n.santri_id] = n;
      });

      activeStudents.forEach(s => {
        const existing = map[s.id];
        initialForm[s.id] = {
          nilai: existing?.nilai ?? 80,
          catatan: existing?.catatan ?? ''
        };
      });

      setNilaiMap(map);
      setFormValues(initialForm);
    }
  }, [activeStudents]);

  // loadSettings function
  const loadSettings = useCallback(async () => {
    setIsLoadingSettings(true);
    try {
      const { data } = await supabase
        .from('system_config')
        .select('key, value')
        .in('key', ['akhlaq_input_aktif', 'akhlaq_semester_aktif']);

      if (data) {
        const aktif = data.find(d => d.key === 'akhlaq_input_aktif');
        const semester = data.find(d => d.key === 'akhlaq_semester_aktif');
        const isAktif = aktif?.value === 'true';
        setAkhlaqAktif(isAktif);
        setAkhlaqSemester(semester?.value || '');

        if (isAktif && semester?.value) {
          await loadNilai(semester.value);
        }
      }
    } catch (err) {
      console.error('Gagal memuat pengaturan system_config:', err);
    } finally {
      setIsLoadingSettings(false);
    }
  }, [loadNilai]);

  // loadSettings on mount / activeStudents change
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Handlers
  const handleChangeNilai = (
    santriId: string,
    field: 'nilai' | 'catatan',
    value: string
  ) => {
    setFormValues(prev => ({
      ...prev,
      [santriId]: {
        ...prev[santriId],
        [field]: field === 'nilai'
          ? Math.max(0, Math.min(100, Number(value)))
          : value
      }
    }));
  };

  const handleSimpan = async (santriId: string) => {
    setSavingId(santriId);

    const existing = nilaiMap[santriId];
    const formVal = formValues[santriId];

    if (!formVal) {
      setSavingId(null);
      return;
    }

    if (existing) {
      const { error } = await supabase
        .from('nilai_akhlaq')
        .update({
          nilai: formVal.nilai,
          catatan: formVal.catatan || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);

      if (error) {
        toast.error('Gagal menyimpan: ' + error.message);
      } else {
        toast.success('Nilai akhlaq berhasil diperbarui.');
        await loadNilai(akhlaqSemester);
      }
    } else {
      const { error } = await supabase
        .from('nilai_akhlaq')
        .insert({
          santri_id: santriId,
          semester: akhlaqSemester,
          nilai: formVal.nilai,
          catatan: formVal.catatan || null,
          dicatat_oleh: pengampuDbId
        });

      if (error) {
        toast.error('Gagal menyimpan: ' + error.message);
      } else {
        toast.success('Nilai akhlaq berhasil disimpan.');
        await loadNilai(akhlaqSemester);
      }
    }

    setSavingId(null);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
      {/* 1. Header card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-150 dark:border-slate-800 mb-6 gap-4">
        <div>
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center space-x-2">
            <Heart className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
            <span>Penilaian Akhlaq Santri</span>
          </h3>
        </div>
        {akhlaqAktif && (
          <div className="flex items-center shrink-0">
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
              Periode Aktif: {akhlaqSemester}
            </span>
          </div>
        )}
      </div>

      {/* 2. Loading Settings */}
      {isLoadingSettings ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-2">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <span className="text-xs">Memuat pengaturan...</span>
        </div>
      ) : !akhlaqAktif ? (
        /* 3. Inactive Info Box */
        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-6 text-center">
          <Heart className="h-12 w-12 text-slate-300 dark:text-slate-650 mx-auto mb-3 opacity-50" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Belum ada periode penilaian akhlaq yang aktif saat ini.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-550 mt-1">
            Menu ini akan otomatis aktif ketika Koordinator membuka periode penilaian akhlaq semester.
          </p>
        </div>
      ) : (
        /* 4. Active Evaluation Form */
        <div>
          <p className="text-xs text-slate-500 mb-4">
            Berikan nilai akhlaq 0-100 untuk setiap santri di halaqah Anda. Nilai ini berkontribusi 10% dari nilai akhir semester.
          </p>

          {activeStudents.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-450 italic">
              Belum ada santri di halaqah ini.
            </div>
          ) : (
            <div className="space-y-3">
              {activeStudents.map(student => {
                const hasExisting = !!nilaiMap[student.id];
                const isSaving = savingId === student.id;

                return (
                  <div
                    key={student.id}
                    className="border border-slate-150 dark:border-slate-800/80 p-3 rounded-xl hover:shadow-sm transition-all duration-200 bg-white dark:bg-slate-900/50"
                  >
                    {/* Baris Atas */}
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                          {student.nama}
                        </h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Kelas {student.kelas} · {student.grade}
                        </p>
                      </div>
                      {hasExisting && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-105 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          Tersimpan
                        </span>
                      )}
                    </div>

                    {/* Baris Form */}
                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end mt-3">
                      {/* Nilai Input */}
                      <div className="flex flex-col space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                          Nilai (0-100)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={formValues[student.id]?.nilai ?? 80}
                          onChange={e => handleChangeNilai(student.id, 'nilai', e.target.value)}
                          className="w-full sm:w-20 text-xs p-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      {/* Catatan Input */}
                      <div className="flex-grow flex flex-col space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                          Catatan (opsional)
                        </label>
                        <input
                          type="text"
                          value={formValues[student.id]?.catatan ?? ''}
                          onChange={e => handleChangeNilai(student.id, 'catatan', e.target.value)}
                          placeholder="cth: Sopan, rajin membantu teman"
                          className="w-full text-xs p-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      {/* Simpan Button */}
                      <button
                        onClick={() => handleSimpan(student.id)}
                        disabled={isSaving}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-60 flex items-center justify-center gap-1.5 transition-colors self-stretch sm:self-auto h-9"
                      >
                        {isSaving ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                        <span>Simpan</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
