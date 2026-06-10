'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Santri, ModulAjar } from '@/types/tahfiz';
import {
  Users,
  Award,
  AlertTriangle,
  Activity,
  ShieldAlert,
  Megaphone,
  Send,
  Loader2,
} from 'lucide-react';

interface RingkasanPanelProps {
  santriList: Santri[];
  moduls: ModulAjar[];
  stagnantCount: number;
  totalPassedUjians: number;
  setoransCount: number;
  namaLengkap: string;
  isLoading: boolean;
}

export default function RingkasanPanel({
  santriList,
  moduls,
  stagnantCount,
  totalPassedUjians,
  setoransCount,
  namaLengkap,
  isLoading,
}: RingkasanPanelProps) {
  // Announcement form state — local to this panel
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annTargets, setAnnTargets] = useState<Record<string, boolean>>({
    pengampu: false,
    orangtua: false,
    kepala_sekolah: false,
    semua: false,
  });
  const [isSending, setIsSending] = useState(false);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle || !annContent) {
      toast.error('Judul dan isi pengumuman harus diisi.');
      return;
    }

    const targets: string[] = [];
    if (annTargets.semua) {
      targets.push('pengampu', 'orangtua', 'koordinator', 'kepala_sekolah', 'tata_usaha');
    } else {
      if (annTargets.pengampu) targets.push('pengampu');
      if (annTargets.orangtua) targets.push('orangtua');
      if (annTargets.kepala_sekolah) targets.push('kepala_sekolah');
    }

    if (targets.length === 0) {
      toast.error('Silakan pilih minimal satu target penerima.');
      return;
    }

    setIsSending(true);
    try {
      const sessionRes = await supabase.auth.getSession();
      const session = sessionRes.data.session;
      if (!session) throw new Error('Sesi tidak valid.');

      const { data: dbUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', session.user.email)
        .single();

      if (!dbUser) throw new Error('Pengguna tidak ditemukan di database.');

      const { error } = await supabase.from('pengumuman').insert({
        judul: annTitle,
        isi: annContent,
        pengirim_id: dbUser.id,
        pengirim_role: 'kepala_sekolah',
        target_role: targets,
      });

      if (error) throw error;

      toast.success('Pengumuman berhasil dipublikasikan!');
      setAnnTitle('');
      setAnnContent('');
      setAnnTargets({
        pengampu: false,
        orangtua: false,
        kepala_sekolah: false,
        semua: false,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan tidak diketahui';
      toast.error('Gagal memublikasikan pengumuman: ' + msg);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Executive Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Total Santri</p>
            <h4 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">{santriList.length} Santri</h4>
            <p className="text-[9px] text-emerald-600 font-semibold mt-0.5">Semua aktif di unit</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] text-slate-455 font-bold uppercase tracking-wider">Capaian Kenaikan Juz</p>
            <h4 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">{totalPassedUjians} Ujian Juz</h4>
            <p className="text-[9px] text-amber-600 font-semibold mt-0.5">Tervalidasi Koordinator</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-red-500/10 text-red-500 dark:text-red-400 rounded-xl">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Stagnasi</p>
            <h4 className="text-lg font-extrabold text-red-600 dark:text-red-400 mt-0.5">{stagnantCount} Santri</h4>
            <p className="text-[9px] text-red-505 font-semibold mt-0.5">Butuh intervensi</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Total Setoran</p>
            <h4 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">{setoransCount} Setoran</h4>
            <p className="text-[9px] text-slate-500 mt-0.5">Sabak, Sabki, &amp; Manzil</p>
          </div>
        </div>
      </div>

      {/* Status Program Keseluruhan */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
        <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
          <ShieldAlert className="h-5 w-5 text-amber-500" />
          <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
            Status Program Pendidikan &amp; Standardisasi Kurikulum
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-xl">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Standardisasi Unit</span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1 block">MTs TQ Jamilurrahman</span>
            <div className="flex items-center space-x-1.5 mt-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] text-emerald-600 font-semibold">Berjalan Normal</span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-xl">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Rasio Keaktifan</span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1 block">
              {santriList.length > 0 
                ? `${Math.round(((santriList.length - stagnantCount) / santriList.length) * 100)}% Santri Aktif` 
                : '0%'}
            </span>
            <span className="text-[10px] text-slate-500 mt-2 block">
              {stagnantCount} santri terdeteksi stagnant belajar.
            </span>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-xl">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Sumber Daya Kurikulum</span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1 block">
              {moduls.length} Modul Terotorisasi
            </span>
            <span className="text-[10px] text-amber-600 font-semibold mt-2 block">
              Hak Cipta MTs TQ dilindungi
            </span>
          </div>
        </div>

        <div className="mt-5 p-4 bg-amber-500/5 border border-amber-250/20 rounded-xl text-[11px] text-slate-650 dark:text-slate-400 leading-relaxed">
          <span className="font-extrabold text-amber-600 dark:text-amber-400 block mb-1">Catatan Eksekutif Kepala Sekolah:</span>
          Seluruh data santri dan setoran disinkronisasikan secara real-time dari database pusat Supabase. Capaian kenaikan juz didasarkan pada kelulusan ujian Ujian Kenaikan Juz (UKJ) yang disetujui koordinator. Gunakan menu <strong>Pemantauan Santri</strong> untuk meninjau secara rinci profil santri stagnant, dan menu <strong>Laporan</strong> untuk menghasilkan rekapitulasi performa.
        </div>
      </div>

      {/* Buat Pengumuman Form */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4 animate-in fade-in duration-300">
        <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-2">
          <Megaphone className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
            Buat Pengumuman Baru
          </h3>
        </div>
        
        <form onSubmit={handleCreateAnnouncement} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Judul Pengumuman</label>
            <input
              type="text"
              placeholder="Masukkan judul pengumuman..."
              value={annTitle}
              onChange={e => setAnnTitle(e.target.value)}
              required
              className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Isi Pengumuman</label>
            <textarea
              placeholder="Tuliskan isi pengumuman secara rinci..."
              value={annContent}
              onChange={e => setAnnContent(e.target.value)}
              required
              rows={4}
              className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Target Penerima</label>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center space-x-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <input
                  type="checkbox"
                  checked={annTargets.pengampu || false}
                  onChange={e => setAnnTargets(prev => ({ ...prev, pengampu: e.target.checked, semua: false }))}
                  className="rounded text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300">Pengampu</span>
              </label>
              <label className="flex items-center space-x-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <input
                  type="checkbox"
                  checked={annTargets.orangtua || false}
                  onChange={e => setAnnTargets(prev => ({ ...prev, orangtua: e.target.checked, semua: false }))}
                  className="rounded text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300">Orang Tua</span>
              </label>
              <label className="flex items-center space-x-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <input
                  type="checkbox"
                  checked={annTargets.kepala_sekolah || false}
                  onChange={e => setAnnTargets(prev => ({ ...prev, kepala_sekolah: e.target.checked, semua: false }))}
                  className="rounded text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300">Kepala Sekolah</span>
              </label>
              <label className="flex items-center space-x-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <input
                  type="checkbox"
                  checked={annTargets.semua || false}
                  onChange={e => setAnnTargets(prev => ({
                    ...prev,
                    semua: e.target.checked,
                    pengampu: false,
                    orangtua: false,
                    kepala_sekolah: false,
                  }))}
                  className="rounded text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300 font-bold">Semua Peran</span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSending || isLoading}
            className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-md transition-all active:scale-98 disabled:opacity-60"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Mengirim Pengumuman...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>Kirim Pengumuman</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
