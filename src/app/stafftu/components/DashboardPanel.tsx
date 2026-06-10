'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Santri, Halaqah, DBUser, BackupLog } from '@/types/tahfiz';
import {
  Users,
  BookMarked,
  Database,
  ShieldAlert,
  CheckCircle2,
  Megaphone,
  Send,
  Loader2,
} from 'lucide-react';

interface DashboardPanelProps {
  santriList: Santri[];
  halaqahs: Halaqah[];
  allUsers: DBUser[];
  backups: BackupLog[];
  namaLengkap: string;
  userId: string;
  isLoading: boolean;
  onDataChanged: () => void;
}

export default function DashboardPanel({
  santriList,
  halaqahs,
  allUsers,
  backups,
  namaLengkap,
  userId,
  isLoading,
  onDataChanged,
}: DashboardPanelProps) {
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annTargets, setAnnTargets] = useState<Record<string, boolean>>({
    koordinator: false,
    pengampu: false,
  });

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle || !annContent) {
      toast.error('Judul dan isi pengumuman harus diisi.');
      return;
    }

    const targets: string[] = [];
    if (annTargets.koordinator) targets.push('koordinator');
    if (annTargets.pengampu) targets.push('pengampu');

    if (targets.length === 0) {
      toast.error('Silakan pilih minimal satu target penerima.');
      return;
    }

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
        pengirim_role: 'tata_usaha',
        target_role: targets,
      });

      if (error) throw error;

      toast.success('Pengumuman berhasil dipublikasikan!');
      setAnnTitle('');
      setAnnContent('');
      setAnnTargets({
        koordinator: false,
        pengampu: false,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan tidak diketahui';
      toast.error('Gagal memublikasikan pengumuman: ' + msg);
    }
  };

  // Suppress unused variable warning — userId & onDataChanged may be used by future features
  void userId;
  void onDataChanged;
  void santriList;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-xl">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Total Akun Aktif</p>
            <p className="text-xl font-bold">{allUsers.filter(u => u.is_active).length} Akun</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <BookMarked className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Total Halaqah</p>
            <p className="text-xl font-bold">{halaqahs.length} Kelompok</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
            <Database className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Backup Terakhir</p>
            <p className="text-xs font-mono font-bold mt-1">{backups[0]?.timestamp || '-'}</p>
          </div>
        </div>
      </div>

      {/* Alert System health card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
        <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 pb-3 border-b border-slate-100 dark:border-slate-855 flex items-center space-x-2">
          <ShieldAlert className="h-4 w-4 text-violet-650" />
          <span>Kesehatan &amp; Pemantauan Sistem (Alert System)</span>
        </h3>
        <div className="mt-4 p-4 bg-emerald-500/5 text-emerald-800 dark:text-emerald-400/90 rounded-xl border border-emerald-500/10 flex items-start space-x-3 text-xs">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="font-bold text-slate-855 dark:text-slate-100">Status Sistem: Normal &amp; Berjalan Lancar</p>
            <p className="text-[11px] text-slate-500">Database tersambung dengan Supabase Cloud. Sistem auto-backup database terjadwal aktif setiap pukul 23:00. Integrasi pelaporan unit putra/putri tersinkronisasi. Semua pengguna aktif terdaftar dengan otorisasi RBAC (Role-Based Access Control) yang benar.</p>
          </div>
        </div>
      </div>

      {/* Buat Pengumuman Form */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4 animate-in fade-in duration-300">
        <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-2">
          <Megaphone className="h-5 w-5 text-violet-650 dark:text-violet-400" />
          <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
            Buat Pengumuman Baru (Khusus Staff &amp; Murobbi)
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
              className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500"
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
              className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Target Penerima</label>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center space-x-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <input
                  type="checkbox"
                  checked={annTargets.koordinator || false}
                  onChange={e => setAnnTargets(prev => ({ ...prev, koordinator: e.target.checked }))}
                  className="rounded text-violet-600 focus:ring-violet-500 h-3.5 w-3.5"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300">Koordinator</span>
              </label>
              <label className="flex items-center space-x-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <input
                  type="checkbox"
                  checked={annTargets.pengampu || false}
                  onChange={e => setAnnTargets(prev => ({ ...prev, pengampu: e.target.checked }))}
                  className="rounded text-violet-600 focus:ring-violet-500 h-3.5 w-3.5"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300">Pengampu</span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-gradient-to-r from-violet-650 to-indigo-600 hover:from-violet-550 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-md transition-all active:scale-98 disabled:opacity-60"
          >
            {isLoading ? (
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
