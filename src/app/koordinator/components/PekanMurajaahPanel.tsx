'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { logAudit } from '@/lib/auditLog';
import { Santri, PekanSchedule } from '@/types/tahfiz';
import { Calendar, Plus } from 'lucide-react';

interface PekanMurajaahPanelProps {
  santriList: Santri[];
  halaqahMap: Record<string, string>;
  userId: string;
  namaLengkap: string;
  onDataChanged: () => void;
}

export default function PekanMurajaahPanel({
  santriList,
  halaqahMap,
  userId,
  namaLengkap,
  onDataChanged,
}: PekanMurajaahPanelProps) {
  // ── Local State ──────────────────────────────────────────────────────────
  const [pekanSchedules, setPekanSchedules] = useState<PekanSchedule[]>([]);
  const [pekanMulai, setPekanMulai] = useState<string>('');
  const [pekanSelesai, setPekanSelesai] = useState<string>('');
  const [pekanMat7, setPekanMat7] = useState<string>('Juz 30');
  const [pekanMat8, setPekanMat8] = useState<string>('Juz 29');
  const [pekanMat9, setPekanMat9] = useState<string>('Juz 28');
  const [pekanBatasSalah, setPekanBatasSalah] = useState<number>(2);
  const [pekanDeadline, setPekanDeadline] = useState<string>('');
  const [selectedHalaqahRotation, setSelectedHalaqahRotation] = useState<string>('');
  const [teacherRotationDate, setTeacherRotationDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // ── Fetch jadwal_ujian ────────────────────────────────────────────────────
  const loadSchedules = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('jadwal_ujian')
      .select('*')
      .order('tanggal_mulai', { ascending: false });

    if (error) {
      console.warn('Gagal memuat jadwal_ujian:', error.message);
    } else if (data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mappedSchedules: PekanSchedule[] = (data as any[]).map((j) => {
        let details = {
          materiKelas7: 'Juz 30',
          materiKelas8: 'Juz 29',
          materiKelas9: 'Juz 28',
          batasKesalahan: 2,
          deadlineAkses: j.tanggal_selesai + 'T23:59:59',
        };
        try {
          if (j.keterangan && j.keterangan.startsWith('{')) {
            details = { ...details, ...JSON.parse(j.keterangan) };
          }
        } catch {
          // Not a JSON, keep defaults
        }
        return {
          id: j.id,
          tanggalMulai: j.tanggal_mulai,
          tanggalSelesai: j.tanggal_selesai,
          status: j.status,
          ...details,
        };
      });
      setPekanSchedules(mappedSchedules);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  // ── Handler: Tambah Jadwal ────────────────────────────────────────────────
  const handleAddPekanSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pekanMulai || !pekanSelesai) {
      toast.error('Silakan tentukan tanggal mulai dan selesai.');
      return;
    }

    setIsLoading(true);

    const keteranganJson = JSON.stringify({
      materiKelas7:   pekanMat7,
      materiKelas8:   pekanMat8,
      materiKelas9:   pekanMat9,
      batasKesalahan: pekanBatasSalah,
      deadlineAkses:  pekanDeadline || (pekanSelesai + 'T23:59:59'),
    });

    const namaPekan = `Pekan Muraja'ah ${pekanMulai} - ${pekanSelesai}`;

    const { error } = await supabase.from('jadwal_ujian').insert({
      nama:            namaPekan,
      tanggal_mulai:   pekanMulai,
      tanggal_selesai: pekanSelesai,
      status:          'aktif',
      keterangan:      keteranganJson,
    });

    if (error) {
      toast.error("Gagal mengaktifkan Pekan Muraja'ah: " + error.message);
      setIsLoading(false);
      return;
    }

    toast.success("Pekan Muraja'ah Massal berhasil diaktifkan!");
    setPekanMulai('');
    setPekanSelesai('');
    setPekanDeadline('');
    await loadSchedules();
    onDataChanged();
  };

  // ── Handler: Stop Jadwal ──────────────────────────────────────────────────
  const handleStopPekanSchedule = async (id: string) => {
    setIsLoading(true);

    const { error } = await supabase
      .from('jadwal_ujian')
      .update({ status: 'selesai' })
      .eq('id', id);

    if (error) {
      toast.error("Gagal menghentikan Pekan Muraja'ah: " + error.message);
      setIsLoading(false);
      return;
    }

    toast.success("Pekan Muraja'ah Massal berhasil dihentikan.");
    await loadSchedules();
    onDataChanged();
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Scheduler Form */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="font-extrabold text-sm text-slate-850 dark:text-slate-150 border-b border-slate-100 dark:border-slate-800 pb-3 mb-5 flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-indigo-505" />
            <span>Jadwalkan Pekan Muraja&apos;ah Massal</span>
          </h3>

          <form onSubmit={handleAddPekanSchedule} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Tanggal Mulai</label>
                <input
                  type="date"
                  value={pekanMulai}
                  onChange={e => setPekanMulai(e.target.value)}
                  required
                  className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-55 dark:bg-slate-800 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Tanggal Selesai</label>
                <input
                  type="date"
                  value={pekanSelesai}
                  onChange={e => setPekanSelesai(e.target.value)}
                  required
                  className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-55 dark:bg-slate-800 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Materi Ujian Kelas 7</label>
              <input
                type="text"
                value={pekanMat7}
                onChange={e => setPekanMat7(e.target.value)}
                placeholder="cth: Juz 30"
                required
                className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-55 dark:bg-slate-800 rounded-lg focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Materi Ujian Kelas 8</label>
              <input
                type="text"
                value={pekanMat8}
                onChange={e => setPekanMat8(e.target.value)}
                placeholder="cth: Juz 29"
                required
                className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-55 dark:bg-slate-800 rounded-lg focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Materi Ujian Kelas 9</label>
              <input
                type="text"
                value={pekanMat9}
                onChange={e => setPekanMat9(e.target.value)}
                placeholder="cth: Juz 28"
                required
                className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-55 dark:bg-slate-800 rounded-lg focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Batas Kesalahan (Maks)</label>
                <select
                  value={pekanBatasSalah}
                  onChange={e => setPekanBatasSalah(Number(e.target.value))}
                  className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-55 dark:bg-slate-800 rounded-lg focus:outline-none"
                >
                  <option value={1}>Maks 1 / hal</option>
                  <option value={2}>Maks 2 / hal</option>
                  <option value={3}>Maks 3 / hal</option>
                  <option value={4}>Maks 4 / hal</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Deadline Akses</label>
                <input
                  type="datetime-local"
                  value={pekanDeadline}
                  onChange={e => setPekanDeadline(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-55 dark:bg-slate-800 rounded-lg focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-650 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-md flex items-center justify-center space-x-1.5 disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              <span>Buat Jadwal Massal</span>
            </button>
          </form>
        </div>

        {/* Schedule Feed Listing */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="font-extrabold text-sm text-slate-850 dark:text-slate-150 border-b border-slate-100 dark:border-slate-800 pb-3 mb-5">
            📅 Daftar Jadwal Pekan Muraja&apos;ah Massal Aktif
          </h3>

          <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
            {pekanSchedules.map((schedule, idx) => (
              <div key={schedule.id || idx} className="p-4 border border-slate-150 dark:border-slate-850 rounded-xl text-xs space-y-2 bg-indigo-500/5">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-805">
                  <span className="font-bold text-slate-800 dark:text-slate-100">
                    📅 {schedule.tanggalMulai} s/d {schedule.tanggalSelesai}
                  </span>
                  {schedule.status === 'aktif' ? (
                    <button
                      onClick={() => handleStopPekanSchedule(schedule.id)}
                      disabled={isLoading}
                      className="text-red-650 font-bold hover:underline disabled:opacity-60"
                    >
                      Hentikan
                    </button>
                  ) : (
                    <span className="text-slate-450 dark:text-slate-500 italic font-medium">Selesai</span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-[10px]">
                  <div className="p-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded">
                    <span className="font-semibold text-slate-400 block uppercase">Materi Kls 7</span>
                    <strong className="text-slate-700 dark:text-slate-300 mt-1 block">{schedule.materiKelas7}</strong>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded">
                    <span className="font-semibold text-slate-400 block uppercase">Materi Kls 8</span>
                    <strong className="text-slate-700 dark:text-slate-300 mt-1 block">{schedule.materiKelas8}</strong>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded">
                    <span className="font-semibold text-slate-400 block uppercase">Materi Kls 9</span>
                    <strong className="text-slate-700 dark:text-slate-300 mt-1 block">{schedule.materiKelas9}</strong>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1">
                  <span>Kesalahan: <strong>Maks {schedule.batasKesalahan} / hal</strong></span>
                  <span>Deadline input: <strong>{new Date(schedule.deadlineAkses).toLocaleString('id-ID')}</strong></span>
                </div>
              </div>
            ))}

            {pekanSchedules.length === 0 && (
              <p className="text-center py-10 text-slate-450 italic">Belum ada jadwal Pekan Muraja&apos;ah massal terdaftar.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
