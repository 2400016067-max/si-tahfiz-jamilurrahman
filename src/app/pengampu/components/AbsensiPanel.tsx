'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Santri, Absensi } from '@/types/tahfiz';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Calendar, UserX, UserCheck, X, Check, Loader2 } from 'lucide-react';

interface AbsensiPanelProps {
  activeStudents: Santri[];
  pengampuDbId: string;
}

export default function AbsensiPanel({ activeStudents, pengampuDbId }: AbsensiPanelProps) {
  // State
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [absensiRecords, setAbsensiRecords] = useState<Absensi[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [editingSantriId, setEditingSantriId] = useState<string | null>(null);
  const [formStatus, setFormStatus] = useState<'sakit' | 'izin' | 'alpha'>('sakit');
  const [formKeterangan, setFormKeterangan] = useState<string>('');

  // loadAbsensi
  const loadAbsensi = useCallback(async () => {
    setIsLoading(true);
    const studentIds = activeStudents.map(s => s.id);
    if (studentIds.length === 0) {
      setAbsensiRecords([]);
      setIsLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('absensi')
      .select('*')
      .eq('tanggal', selectedDate)
      .in('santri_id', studentIds);

    if (!error && data) {
      setAbsensiRecords(data as Absensi[]);
    } else if (error) {
      toast.error('Gagal memuat data absensi: ' + error.message);
    }
    setIsLoading(false);
  }, [selectedDate, activeStudents]);

  // useEffect - trigger when selectedDate or activeStudents changes
  useEffect(() => {
    loadAbsensi();
  }, [loadAbsensi]);

  // Helper function
  const getAbsensiForStudent = (santriId: string) => {
    return absensiRecords.find(a => a.santri_id === santriId);
  };

  // Handlers
  const handleTandaiTidakHadir = (santriId: string) => {
    setEditingSantriId(santriId);
    setFormStatus('sakit');
    setFormKeterangan('');
  };

  const handleCancelEdit = () => {
    setEditingSantriId(null);
  };

  const handleSimpanAbsensi = async (santriId: string) => {
    const existing = getAbsensiForStudent(santriId);

    if (existing) {
      // UPDATE
      const { error } = await supabase
        .from('absensi')
        .update({
          status: formStatus,
          keterangan: formKeterangan || null
        })
        .eq('id', existing.id);

      if (error) {
        toast.error('Gagal memperbarui absensi: ' + error.message);
        return;
      }
    } else {
      // INSERT
      const { error } = await supabase
        .from('absensi')
        .insert({
          santri_id: santriId,
          tanggal: selectedDate,
          status: formStatus,
          keterangan: formKeterangan || null,
          dicatat_oleh: pengampuDbId
        });

      if (error) {
        toast.error('Gagal menyimpan absensi: ' + error.message);
        return;
      }
    }

    toast.success('Absensi berhasil disimpan.');
    setEditingSantriId(null);
    loadAbsensi();
  };

  const handleKembalikanHadir = async (absensiId: string) => {
    if (!window.confirm('Kembalikan status santri ini menjadi Hadir?')) return;

    const { error } = await supabase
      .from('absensi')
      .delete()
      .eq('id', absensiId);

    if (error) {
      toast.error('Gagal menghapus absensi: ' + error.message);
      return;
    }

    toast.success('Status berhasil dikembalikan menjadi Hadir.');
    loadAbsensi();
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
      {/* Header card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-150 dark:border-slate-800 mb-6 gap-4">
        <div>
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center space-x-2">
            <Calendar className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
            <span>Absensi Santri</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Semua santri dianggap Hadir secara otomatis. Tandai santri yang Sakit, Izin, atau Alpha (tidak hadir tanpa keterangan).
          </p>
        </div>
        <div className="flex items-center shrink-0">
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="text-xs p-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200/50 dark:border-slate-850 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Total Santri</span>
          <strong className="text-lg font-extrabold text-slate-700 dark:text-slate-200 mt-1">{activeStudents.length}</strong>
        </div>
        <div className="bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-450 uppercase">Hadir</span>
          <strong className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            {activeStudents.length - absensiRecords.length}
          </strong>
        </div>
        <div className={`p-3 rounded-xl border flex flex-col justify-between ${absensiRecords.length > 0 ? 'bg-red-500/5 border-red-500/10' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200/50 dark:border-slate-850'}`}>
          <span className={`text-[10px] font-bold uppercase ${absensiRecords.length > 0 ? 'text-red-650 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>Tidak Hadir</span>
          <strong className={`text-lg font-extrabold mt-1 ${absensiRecords.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'}`}>
            {absensiRecords.length}
          </strong>
        </div>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-2">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <span className="text-xs">Memuat data absensi...</span>
        </div>
      ) : (
        /* List santri */
        <div className="space-y-3">
          {activeStudents.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-450 italic">
              Belum ada santri di halaqah ini.
            </div>
          ) : (
            activeStudents.map(student => {
              const record = getAbsensiForStudent(student.id);
              const isEditing = editingSantriId === student.id;

              return (
                <div key={student.id} className="border border-slate-150 dark:border-slate-800/80 p-3 rounded-xl hover:shadow-sm transition-all duration-200 bg-white dark:bg-slate-900/50">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">{student.nama}</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">Kelas {student.kelas} · {student.grade}</p>
                    </div>

                    <div className="flex items-center space-x-2">
                      {!record ? (
                        <>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                            Hadir
                          </span>
                          <button
                            onClick={() => handleTandaiTidakHadir(student.id)}
                            className="p-1 rounded-lg border border-slate-200 dark:border-slate-750 text-slate-500 hover:text-red-500 hover:border-red-200 dark:hover:text-red-400 transition-colors"
                            title="Tandai Tidak Hadir"
                          >
                            <UserX className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <span
                            onClick={() => {
                              setEditingSantriId(student.id);
                              setFormStatus(record.status === 'hadir' ? 'sakit' : record.status);
                              setFormKeterangan(record.keterangan || '');
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-opacity hover:opacity-80 ${
                              record.status === 'sakit'
                                ? 'bg-orange-500/10 text-orange-600 dark:text-orange-405'
                                : record.status === 'izin'
                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-405'
                                : 'bg-red-500/10 text-red-600 dark:text-red-405'
                            }`}
                            title="Klik untuk mengubah status/keterangan"
                          >
                            {record.status === 'sakit' ? 'Sakit' : record.status === 'izin' ? 'Izin' : 'Alpha'}
                          </span>
                          <button
                            onClick={() => handleKembalikanHadir(record.id)}
                            className="p-1 rounded-lg border border-slate-200 dark:border-slate-750 text-slate-500 hover:text-emerald-600 hover:border-emerald-200 dark:hover:text-emerald-400 transition-colors"
                            title="Kembalikan Hadir"
                          >
                            <UserCheck className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {record && record.keterangan && !isEditing && (
                    <div className="mt-2 text-[10px] text-slate-500 bg-slate-50 dark:bg-slate-805/30 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                      Keterangan: {record.keterangan}
                    </div>
                  )}

                  {isEditing && (
                    <div className="border-t border-slate-100 dark:border-slate-800/60 pt-3 mt-3 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-1">
                          <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase block mb-1">Status</label>
                          <select
                            value={formStatus}
                            onChange={e => setFormStatus(e.target.value as 'sakit' | 'izin' | 'alpha')}
                            className="w-full text-xs p-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:border-emerald-500"
                          >
                            <option value="sakit">Sakit</option>
                            <option value="izin">Izin</option>
                            <option value="alpha">Alpha (Tanpa Keterangan)</option>
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase block mb-1">Keterangan</label>
                          <textarea
                            rows={2}
                            value={formKeterangan}
                            onChange={e => setFormKeterangan(e.target.value)}
                            placeholder="Tambahkan keterangan (opsional)..."
                            className="w-full text-xs p-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:border-emerald-500 resize-none"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={handleCancelEdit}
                          className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 text-[10px] font-bold transition-colors"
                        >
                          <X className="h-3 w-3" />
                          <span>Batal</span>
                        </button>
                        <button
                          onClick={() => handleSimpanAbsensi(student.id)}
                          className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold transition-colors"
                        >
                          <Check className="h-3 w-3" />
                          <span>Simpan</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
