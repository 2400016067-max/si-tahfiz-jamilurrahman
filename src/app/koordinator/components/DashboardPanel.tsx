'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Santri, UjianJuz, Setoran } from '@/types/tahfiz';
import {
  AlertTriangle,
  Award,
  Users,
  Megaphone,
  Send,
  Loader2,
} from 'lucide-react';

interface DashboardPanelProps {
  santriList: Santri[];
  ujianList: UjianJuz[];
  setorans: Setoran[];
  halaqahMap: Record<string, string>;
  namaLengkap: string;
  userId: string;
  isLoading: boolean;
  onDataChanged: () => void;
}

export default function DashboardPanel({
  santriList,
  ujianList,
  setorans,
  halaqahMap,
  namaLengkap,
  userId,
  isLoading,
  onDataChanged,
}: DashboardPanelProps) {
  // ── Local State ──────────────────────────────────────────────────────────
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annTargets, setAnnTargets] = useState<Record<string, boolean>>({
    pengampu: false,
    orangtua: false,
    kepala_sekolah: false,
    semua: false,
  });
  const [isSending, setIsSending] = useState(false);

  // ── Computed Stats ────────────────────────────────────────────────────────
  const stagnantCount = santriList.filter(s => s.status === 'stagnant').length;
  const activeCount   = santriList.filter(s => s.status === 'active').length;
  const pendingUkjCount = ujianList.filter(u => !u.approvedByKoordinator).length;

  // BarChart data: rata-rata baris sabak lulus per halaqah
  const getHalaqahBarData = () => {
    return Object.keys(halaqahMap).map(hId => {
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

  // ── Handlers ──────────────────────────────────────────────────────────────
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
        pengirim_role: 'koordinator',
        target_role: targets,
      });

      if (error) throw error;

      toast.success('Pengumuman berhasil dipublikasikan!');
      setAnnTitle('');
      setAnnContent('');
      setAnnTargets({ pengampu: false, orangtua: false, kepala_sekolah: false, semua: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan tidak diketahui';
      toast.error('Gagal memublikasikan pengumuman: ' + msg);
    } finally {
      setIsSending(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-sm border-l-4 border-l-red-500">
          <div>
            <p className="text-xs text-slate-405 font-bold uppercase tracking-wider">Santri Perlu Intervensi</p>
            <h3 className="text-2xl font-extrabold text-red-650 dark:text-red-400 mt-1">{stagnantCount} Santri</h3>
          </div>
          <div className="p-3 bg-red-100 dark:bg-red-950/30 text-red-650 dark:text-red-400 rounded-xl">
            <AlertTriangle className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-sm border-l-4 border-l-indigo-500">
          <div>
            <p className="text-xs text-slate-405 font-bold uppercase tracking-wider">Menunggu Kelulusan UKJ</p>
            <h3 className="text-2xl font-extrabold text-indigo-655 dark:text-indigo-400 mt-1">{pendingUkjCount} Ujian</h3>
          </div>
          <div className="p-3 bg-indigo-100 dark:bg-indigo-950/30 text-indigo-650 dark:text-indigo-400 rounded-xl">
            <Award className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-sm border-l-4 border-l-teal-500">
          <div>
            <p className="text-xs text-slate-405 font-bold uppercase tracking-wider">Total Santri Aktif</p>
            <h3 className="text-2xl font-extrabold text-teal-600 dark:text-teal-400 mt-1">{activeCount} Santri</h3>
          </div>
          <div className="p-3 bg-teal-100 dark:bg-teal-950/30 text-teal-605 dark:text-teal-400 rounded-xl">
            <Users className="h-6 w-6" />
          </div>
        </div>

        {/* Halaqah Performance Summary */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
          <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex items-center justify-between">
            <span>📊 Ringkasan Performa per Halaqah</span>
            <span className="text-[10px] text-slate-455 font-medium">90 Hari Terakhir</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-slate-400 uppercase tracking-wider border-b border-slate-150 dark:border-slate-850 pb-2">
                  <th className="pb-2 font-bold">Nama Halaqah</th>
                  <th className="pb-2 font-bold">Rata-rata Baris Sabak</th>
                  <th className="pb-2 font-bold">Jumlah Setoran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {getHalaqahBarData().map((h, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/10">
                    <td className="py-3 font-semibold text-slate-800 dark:text-slate-200">{h.halaqah}</td>
                    <td className="py-3 font-bold text-indigo-600 dark:text-indigo-400">{h['Rata-rata Baris']} baris/hari</td>
                    <td className="py-3 text-slate-500">{h.count} setoran</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Buat Pengumuman Form */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4 animate-in fade-in duration-300">
        <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-2">
          <Megaphone className="h-5 w-5 text-indigo-650 dark:text-indigo-400" />
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
              className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
              className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                  className="rounded text-indigo-650 focus:ring-indigo-500 h-3.5 w-3.5"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300">Pengampu</span>
              </label>
              <label className="flex items-center space-x-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <input
                  type="checkbox"
                  checked={annTargets.orangtua || false}
                  onChange={e => setAnnTargets(prev => ({ ...prev, orangtua: e.target.checked, semua: false }))}
                  className="rounded text-indigo-650 focus:ring-indigo-500 h-3.5 w-3.5"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300">Orang Tua</span>
              </label>
              <label className="flex items-center space-x-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <input
                  type="checkbox"
                  checked={annTargets.kepala_sekolah || false}
                  onChange={e => setAnnTargets(prev => ({ ...prev, kepala_sekolah: e.target.checked, semua: false }))}
                  className="rounded text-indigo-650 focus:ring-indigo-500 h-3.5 w-3.5"
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
                  className="rounded text-indigo-650 focus:ring-indigo-500 h-3.5 w-3.5"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300 font-bold">Semua Peran</span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSending || isLoading}
            className="w-full py-2.5 bg-gradient-to-r from-indigo-650 to-violet-600 hover:from-indigo-550 hover:to-violet-500 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-md transition-all active:scale-98 disabled:opacity-60"
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
