'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { DBUser } from '@/types/tahfiz';
import {
  UserPlus,
  Search,
  CheckCircle2,
  Power,
} from 'lucide-react';

interface ManajemenAkunPanelProps {
  allUsers: DBUser[];
  isLoading: boolean;
  onDataChanged: () => void;
}

export default function ManajemenAkunPanel({
  allUsers,
  isLoading,
  onDataChanged,
}: ManajemenAkunPanelProps) {
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [newUserNama, setNewUserNama] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [createUserSuccess, setCreateUserSuccess] = useState(false);
  const [newParentNama, setNewParentNama] = useState('');
  const [newParentPhone, setNewParentPhone] = useState('');
  const [newParentEmailAcc, setNewParentEmailAcc] = useState('');

  const filteredUsers = allUsers.filter(u =>
    u.nama_lengkap.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  const handleCreatePengampu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserNama.trim()) return;

    setCreateUserSuccess(false);

    const emailToUse = newUserEmail.trim() || (() => {
      const base = newUserNama
        .toLowerCase()
        .replace(/ustadz(ah)?\s*/i, '')
        .trim()
        .replace(/\s+/g, '.')
        .replace(/[^a-z.]/g, '');
      return `${base}@mts-tq.sch.id`;
    })();

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', emailToUse)
      .maybeSingle();

    if (existing) {
      toast.error(`Email "${emailToUse}" sudah terdaftar di sistem. Gunakan email lain.`);
      return;
    }

    const { error } = await supabase.from('users').insert({
      email: emailToUse,
      password_hash: '$2b$10$placeholderHashForDevOnly.NewPengampu',
      role: 'pengampu',
      nama_lengkap: newUserNama.trim(),
      no_hp: newUserPhone.trim() || null,
      is_active: true,
    });

    if (error) {
      toast.error('Gagal membuat akun pengampu: ' + error.message);
      return;
    }

    setCreateUserSuccess(true);
    toast.success('Akun pengampu berhasil dibuat!');
    setNewUserNama('');
    setNewUserPhone('');
    setNewUserEmail('');
    setTimeout(() => setCreateUserSuccess(false), 3000);
    onDataChanged();
  };

  const handleCreateParentAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newParentNama.trim()) return;

    const emailToUse = newParentEmailAcc.trim() || (() => {
      const base = newParentNama
        .toLowerCase()
        .replace(/bapak|ibu|wali\s*/i, '')
        .trim()
        .replace(/\s+/g, '.')
        .replace(/[^a-z.]/g, '');
      return `${base}@parent.mts-tq.sch.id`;
    })();

    try {
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', emailToUse)
        .maybeSingle();

      if (existing) {
        throw new Error(`Email "${emailToUse}" sudah terdaftar di sistem.`);
      }

      const { error } = await supabase.from('users').insert({
        email: emailToUse,
        password_hash: '$2b$10$placeholderHashForDevOnly.ParentDefault',
        role: 'orangtua',
        nama_lengkap: newParentNama.trim(),
        no_hp: newParentPhone.trim() || null,
        is_active: true,
      });

      if (error) throw error;

      toast.success('Akun Orang Tua baru berhasil dibuat!');
      setNewParentNama('');
      setNewParentPhone('');
      setNewParentEmailAcc('');
      onDataChanged();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal membuat akun orang tua.';
      toast.error(msg);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: !currentStatus })
        .eq('id', userId);

      if (error) throw error;

      toast.success(`Akun berhasil ${!currentStatus ? 'diaktifkan' : 'dinonaktifkan'}.`);
      onDataChanged();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengubah status akun.';
      toast.error(msg);
    }
  };

  const handleResetUserPassword = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          password_hash: '$2b$10$placeholderHashForDevOnly.ResetPassword123' 
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success('Password pengguna berhasil direset ke password default ("123456").');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mereset password.';
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-8">
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Buat Akun Pengampu Baru */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-850 pb-3 mb-5 flex items-center space-x-2">
            <UserPlus className="h-4 w-4 text-violet-500" />
            <span>Daftarkan Akun Pengampu Baru</span>
          </h3>

          <form onSubmit={handleCreatePengampu} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Nama Lengkap Pengampu</label>
              <input
                type="text"
                value={newUserNama}
                onChange={e => setNewUserNama(e.target.value)}
                placeholder="cth: Ustadz Ahmad Fauzi"
                required
                className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Nomor HP</label>
              <input
                type="tel"
                value={newUserPhone}
                onChange={e => setNewUserPhone(e.target.value)}
                placeholder="cth: 0812xxxx"
                className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Email (Opsional)</label>
              <input
                type="email"
                value={newUserEmail}
                onChange={e => setNewUserEmail(e.target.value)}
                placeholder="auto: nama@mts-tq.sch.id"
                className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none font-mono"
              />
            </div>

            {createUserSuccess && (
              <div className="flex items-center space-x-1.5 text-emerald-600 text-xs font-bold">
                <CheckCircle2 className="h-4 w-4" />
                <span>Akun pengampu berhasil dibuat!</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 rounded-xl text-xs shadow transition-colors flex items-center justify-center space-x-1.5 disabled:opacity-60"
            >
              <UserPlus className="h-4 w-4" />
              <span>Buat Akun Pengampu</span>
            </button>
          </form>
        </div>

        {/* Buat Akun Orang Tua Baru */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="font-extrabold text-sm text-slate-850 dark:text-slate-150 border-b border-slate-100 dark:border-slate-850 pb-3 mb-5 flex items-center space-x-2">
            <UserPlus className="h-4 w-4 text-emerald-500" />
            <span>Daftarkan Akun Orang Tua Baru</span>
          </h3>

          <form onSubmit={handleCreateParentAccount} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Nama Orang Tua</label>
              <input
                type="text"
                value={newParentNama}
                onChange={e => setNewParentNama(e.target.value)}
                placeholder="cth: Bapak Salman"
                required
                className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Nomor HP</label>
              <input
                type="tel"
                value={newParentPhone}
                onChange={e => setNewParentPhone(e.target.value)}
                placeholder="cth: 0812xxxx"
                className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Email (Opsional)</label>
              <input
                type="email"
                value={newParentEmailAcc}
                onChange={e => setNewParentEmailAcc(e.target.value)}
                placeholder="auto: nama@parent.mts-tq.sch.id"
                className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs shadow transition-colors flex items-center justify-center space-x-1.5 disabled:opacity-60"
            >
              <UserPlus className="h-4 w-4" />
              <span>Buat Akun Orang Tua</span>
            </button>
          </form>
        </div>
      </div>

      {/* Akun List Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
        <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 pb-3 border-b border-slate-100 dark:border-slate-850 mb-4">
          Daftar &amp; Status Pengguna Sistem
        </h3>
        
        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Cari user berdasarkan Nama atau Email..." 
            value={userSearchQuery}
            onChange={e => setUserSearchQuery(e.target.value)}
            className="w-full text-xs pl-10 pr-4 py-2 border border-slate-250 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none" 
          />
        </div>

        <div className="overflow-x-auto border border-slate-150 dark:border-slate-850 rounded-xl">
          <table className="w-full text-xs text-left divide-y divide-slate-100 dark:divide-slate-850">
            <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="p-3">Nama Lengkap</th>
                <th className="p-3">Email</th>
                <th className="p-3">Peran (Role)</th>
                <th className="p-3">Status Akun</th>
                <th className="p-3 text-center">Aksi Otoritas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
              {filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                  <td className="p-3 font-bold text-slate-800 dark:text-slate-100">{u.nama_lengkap}</td>
                  <td className="p-3 font-mono text-[11px]">{u.email}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                      u.role === 'stafftu' ? 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400' :
                      u.role === 'pengampu' ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400' :
                      u.role === 'orangtua' ? 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-400' :
                      'bg-slate-100 text-slate-850 border-slate-200'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.is_active ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                      {u.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="p-3 text-center space-x-2">
                    <button
                      onClick={() => handleToggleUserStatus(u.id, u.is_active)}
                      className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${
                        u.is_active ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100/50' : 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100/50'
                      }`}
                      title={u.is_active ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                    >
                      <Power className="h-3 w-3 inline mr-1" />
                      {u.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                    <button
                      onClick={() => handleResetUserPassword(u.id)}
                      className="px-2 py-1 bg-slate-100 border border-slate-200 text-slate-650 hover:bg-slate-200 rounded text-[10px] font-bold transition-colors"
                    >
                      Reset Password
                    </button>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-slate-400 py-6">Tidak ada user ditemukan.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
