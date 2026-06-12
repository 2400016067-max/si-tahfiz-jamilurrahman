'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { logAudit } from '@/lib/auditLog';
import { Santri, PekanSchedule, HariLibur } from '@/types/tahfiz';
import { Calendar, Plus, Pencil, Trash } from 'lucide-react';

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

  // ── Hari Libur State ──────────────────────────────────────────────────────
  const [hariLiburList, setHariLiburList] = useState<HariLibur[]>([]);
  const [showHariLiburForm, setShowHariLiburForm] = useState<boolean>(false);
  const [editHariLibur, setEditHariLibur] = useState<HariLibur | null>(null);
  const [hlNama, setHlNama] = useState<string>('');
  const [hlTanggalMulai, setHlTanggalMulai] = useState<string>('');
  const [hlTanggalSelesai, setHlTanggalSelesai] = useState<string>('');
  const [hlJenis, setHlJenis] = useState<'libur_nasional' | 'libur_semester' | 'libur_tahfiz_mendadak'>('libur_nasional');
  const [hlKeterangan, setHlKeterangan] = useState<string>('');

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

  // ── Fetch hari_libur ──────────────────────────────────────────────────────
  const loadHariLibur = useCallback(async () => {
    const { data, error } = await supabase
      .from('hari_libur')
      .select('*')
      .order('tanggal_mulai', { ascending: false });
    if (error) {
      console.warn('Gagal memuat hari_libur:', error.message);
    } else if (data) {
      setHariLiburList(data);
    }
  }, []);

  useEffect(() => {
    loadSchedules();
    loadHariLibur();
  }, [loadSchedules, loadHariLibur]);

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

  // ── Handlers: Kelola Hari Libur ──────────────────────────────────────────
  const resetHariLiburForm = () => {
    setHlNama('');
    setHlTanggalMulai('');
    setHlTanggalSelesai('');
    setHlJenis('libur_nasional');
    setHlKeterangan('');
    setEditHariLibur(null);
    setShowHariLiburForm(false);
  };

  const tambahHariLibur = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hlTanggalSelesai < hlTanggalMulai) {
      toast.error('Tanggal selesai harus setelah atau sama dengan tanggal mulai.');
      return;
    }

    setIsLoading(true);

    if (editHariLibur) {
      // Mode Edit
      const { error } = await supabase
        .from('hari_libur')
        .update({
          nama: hlNama,
          tanggal_mulai: hlTanggalMulai,
          tanggal_selesai: hlTanggalSelesai,
          jenis: hlJenis,
          keterangan: hlKeterangan || null,
        })
        .eq('id', editHariLibur.id);

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Hari libur berhasil diperbarui.');
        resetHariLiburForm();
        loadHariLibur();
      }
    } else {
      // Mode Tambah
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          throw new Error('Sesi tidak valid.');
        }

        const email = session.user.email;
        const { data: dbUser, error: dbUserError } = await supabase
          .from('users')
          .select('id')
          .eq('email', email)
          .single();

        if (dbUserError || !dbUser) {
          throw new Error('Gagal mendapatkan informasi pengguna.');
        }

        const { error } = await supabase
          .from('hari_libur')
          .insert({
            nama: hlNama,
            tanggal_mulai: hlTanggalMulai,
            tanggal_selesai: hlTanggalSelesai,
            jenis: hlJenis,
            keterangan: hlKeterangan || null,
            dibuat_oleh: dbUser.id,
          });

        if (error) {
          toast.error(error.message);
        } else {
          toast.success('Hari libur berhasil ditambahkan.');
          resetHariLiburForm();
          loadHariLibur();
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Terjadi kesalahan.';
        toast.error(msg);
      }
    }
    setIsLoading(false);
  };

  const handleEditHariLibur = (item: HariLibur) => {
    setEditHariLibur(item);
    setHlNama(item.nama);
    setHlTanggalMulai(item.tanggal_mulai);
    setHlTanggalSelesai(item.tanggal_selesai);
    setHlJenis(item.jenis);
    setHlKeterangan(item.keterangan || '');
    setShowHariLiburForm(true);
  };

  const hapusHariLibur = async (id: string) => {
    if (!window.confirm('Yakin ingin menghapus hari libur ini?')) return;
    setIsLoading(true);
    const { error } = await supabase
      .from('hari_libur')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Hari libur berhasil dihapus.');
      loadHariLibur();
    }
    setIsLoading(false);
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

      {/* ── CARD BARU: KELOLA HARI LIBUR & TANGGAL MERAH ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm mt-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 gap-3">
          <div>
            <h3 className="font-extrabold text-sm text-slate-850 dark:text-slate-150 flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-indigo-500" />
              <span>Kelola Hari Libur &amp; Tanggal Merah</span>
            </h3>
            <p className="text-xs text-slate-450 dark:text-slate-500 mt-1">
              Atur tanggal libur nasional, libur semester, atau libur tahfiz mendadak. Hari-hari ini tidak dihitung sebagai target setoran santri dalam rekapan.
            </p>
          </div>
          <button
            onClick={() => {
              resetHariLiburForm();
              setShowHariLiburForm(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition-colors flex items-center space-x-1.5 shrink-0 self-start sm:self-center"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Hari Libur</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
                <th className="pb-2 font-bold">Nama</th>
                <th className="pb-2 font-bold">Tanggal</th>
                <th className="pb-2 font-bold">Jenis</th>
                <th className="pb-2 font-bold">Keterangan</th>
                <th className="pb-2 text-right font-bold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {hariLiburList.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/10 transition-colors">
                  <td className="py-3 font-bold text-slate-805 dark:text-slate-150">{item.nama}</td>
                  <td className="py-3 text-slate-600 dark:text-slate-400 font-medium">
                    {(() => {
                      const start = new Date(item.tanggal_mulai + 'T00:00:00');
                      const end = new Date(item.tanggal_selesai + 'T00:00:00');
                      const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
                      if (item.tanggal_mulai === item.tanggal_selesai) {
                        return start.toLocaleDateString('id-ID', options);
                      }
                      return `${start.toLocaleDateString('id-ID', options)} - ${end.toLocaleDateString('id-ID', options)}`;
                    })()}
                  </td>
                  <td className="py-3">
                    {item.jenis === 'libur_nasional' && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-500/10 text-red-600">
                        Libur Nasional
                      </span>
                    )}
                    {item.jenis === 'libur_semester' && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/10 text-blue-600">
                        Libur Semester
                      </span>
                    )}
                    {item.jenis === 'libur_tahfiz_mendadak' && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-600">
                        Libur Tahfiz Mendadak
                      </span>
                    )}
                  </td>
                  <td className="py-3 text-slate-500 dark:text-slate-400 max-w-[200px] truncate">
                    {item.keterangan || '-'}
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex justify-end items-center space-x-2">
                      <button
                        onClick={() => handleEditHariLibur(item)}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-650 dark:text-slate-400 hover:text-indigo-650 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => hapusHariLibur(item.id)}
                        className="p-1 hover:bg-red-50 dark:hover:bg-red-950/30 rounded text-red-500 hover:text-red-700 transition-colors"
                        title="Hapus"
                      >
                        <Trash className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {hariLiburList.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-450 italic">
                    Belum ada data hari libur yang ditambahkan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL FORM: TAMBAH/EDIT HARI LIBUR ── */}
      {showHariLiburForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-xl space-y-4 animate-in zoom-in-95 duration-200">
            <h4 className="font-extrabold text-base text-slate-850 dark:text-slate-150">
              {editHariLibur ? 'Edit Hari Libur' : 'Tambah Hari Libur'}
            </h4>
            <form onSubmit={tambahHariLibur} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Nama
                </label>
                <input
                  type="text"
                  placeholder="cth: Idul Fitri 2026"
                  value={hlNama}
                  onChange={(e) => setHlNama(e.target.value)}
                  required
                  className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    Tanggal Mulai
                  </label>
                  <input
                    type="date"
                    value={hlTanggalMulai}
                    onChange={(e) => setHlTanggalMulai(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    Tanggal Selesai
                  </label>
                  <input
                    type="date"
                    value={hlTanggalSelesai}
                    onChange={(e) => setHlTanggalSelesai(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Jenis
                </label>
                <select
                  value={hlJenis}
                  onChange={(e) =>
                    setHlJenis(
                      e.target.value as 'libur_nasional' | 'libur_semester' | 'libur_tahfiz_mendadak'
                    )
                  }
                  required
                  className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:border-indigo-500"
                >
                  <option value="libur_nasional">Libur Nasional</option>
                  <option value="libur_semester">Libur Semester</option>
                  <option value="libur_tahfiz_mendadak">Libur Tahfiz Mendadak</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Keterangan (opsional)
                </label>
                <textarea
                  rows={2}
                  value={hlKeterangan}
                  onChange={(e) => setHlKeterangan(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:border-indigo-500"
                  placeholder="Keterangan tambahan..."
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={resetHariLiburForm}
                  className="flex-grow bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 py-2 rounded-lg text-xs font-bold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-grow bg-indigo-650 hover:bg-indigo-750 text-white py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-60 shadow"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
