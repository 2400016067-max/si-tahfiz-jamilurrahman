'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Santri, DBUser } from '@/types/tahfiz';
import {
  Link2,
  Link2Off,
  ShieldAlert,
} from 'lucide-react';

interface RelasiOrtuSantriPanelProps {
  santriList: Santri[];
  parentUsers: DBUser[];
  isLoading: boolean;
  onDataChanged: () => void;
}

export default function RelasiOrtuSantriPanel({
  santriList,
  parentUsers,
  isLoading,
  onDataChanged,
}: RelasiOrtuSantriPanelProps) {
  const [relationParentId, setRelationParentId] = useState<string>(parentUsers[0]?.id || '');
  const [relationChildId, setRelationChildId] = useState<string>('');

  const handleDisconnectParent = async (childId: string) => {
    try {
      const { error } = await supabase
        .from('santri')
        .update({ 
          parent_user_id: null,
          parent_name: '',
          parent_phone: null
        })
        .eq('id', childId);

      if (error) throw error;

      toast.success('Relasi orang tua & santri berhasil diputuskan.');
      onDataChanged();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan saat memutuskan relasi.';
      toast.error('Gagal memutuskan relasi: ' + msg);
    }
  };

  const handleConnectParent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!relationParentId || !relationChildId) return;

    try {
      const selectedParent = parentUsers.find(p => p.id === relationParentId);
      if (!selectedParent) {
        throw new Error('Orang tua yang dipilih tidak valid.');
      }

      const { error } = await supabase
        .from('santri')
        .update({
          parent_user_id: relationParentId,
          parent_name: selectedParent.nama_lengkap,
          parent_phone: selectedParent.no_hp || null,
        })
        .eq('id', relationChildId);

      if (error) throw error;

      toast.success('Santri berhasil dihubungkan ke orang tua.');
      setRelationChildId('');
      onDataChanged();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan saat menghubungkan santri.';
      toast.error('Gagal menghubungkan santri: ' + msg);
    }
  };

  return (
    <div className="space-y-8">
      
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <h3 className="font-extrabold text-sm text-slate-850 dark:text-slate-150 border-b border-slate-100 dark:border-slate-850 pb-3 mb-6 flex items-center space-x-2">
          <Link2 className="h-4.5 w-4.5 text-violet-500" />
          <span>Manajemen Relasi Orang Tua &amp; Santri</span>
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Panel Kiri: Pilih Orang Tua & Daftar Anak Terhubung */}
          <div className="space-y-6">
            <div>
              <h4 className="font-extrabold text-xs text-slate-850 dark:text-slate-200 mb-2">Pilih Akun Orang Tua</h4>
              <select
                value={relationParentId}
                onChange={e => setRelationParentId(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:border-violet-400"
              >
                <option value="">-- Pilih Orang Tua --</option>
                {parentUsers.map(p => {
                  const count = santriList.filter(s => s.parentUserId === p.id).length;
                  return (
                    <option key={p.id} value={p.id}>
                      {p.nama_lengkap} ({count} Anak terhubung)
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="space-y-3">
              <h5 className="font-bold text-xs text-slate-750 dark:text-slate-300">Daftar Anak Terhubung</h5>
              {relationParentId ? (
                (() => {
                  const connected = santriList.filter(s => s.parentUserId === relationParentId);
                  if (connected.length === 0) {
                    return (
                      <p className="text-xs text-slate-400 py-4 text-center bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                        Belum ada santri terhubung ke akun ini.
                      </p>
                    );
                  }
                  return (
                    <div className="space-y-2">
                      {connected.map(child => (
                        <div
                          key={child.id}
                          className="p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-850 rounded-xl flex items-center justify-between text-xs"
                        >
                          <div>
                            <p className="font-bold text-slate-850 dark:text-slate-100">{child.nama}</p>
                            <p className="text-[10px] text-slate-400">Kelas {child.kelas} · {child.grade}</p>
                          </div>
                          <button
                            onClick={() => handleDisconnectParent(child.id)}
                            disabled={isLoading}
                            className="flex items-center space-x-1 text-[10px] font-bold text-red-650 hover:text-red-750 bg-red-500/10 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-60"
                          >
                            <Link2Off className="h-3 w-3" />
                            <span>Putus Koneksi</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })()
              ) : (
                <p className="text-xs text-slate-400 py-4 text-center bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  Silakan pilih orang tua terlebih dahulu.
                </p>
              )}
            </div>
          </div>

          {/* Panel Kanan: Hubungkan Santri Baru */}
          <div className="space-y-6 lg:border-l lg:border-slate-150 lg:dark:border-slate-800 lg:pl-8">
            <div>
              <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 mb-3 flex items-center space-x-1.5">
                <Link2 className="h-4 w-4 text-emerald-500" />
                <span>Hubungkan Anak Baru</span>
              </h4>

              <form onSubmit={handleConnectParent} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Pilih Santri (Tanpa Orang Tua)</label>
                  <select
                    value={relationChildId}
                    onChange={e => setRelationChildId(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:border-emerald-400"
                  >
                    <option value="">-- Pilih Santri --</option>
                    {santriList
                      .filter(s => !s.parentUserId)
                      .map(s => (
                        <option key={s.id} value={s.id}>
                          {s.nama} (Kelas {s.kelas})
                        </option>
                      ))}
                  </select>
                  {santriList.filter(s => !s.parentUserId).length === 0 && (
                    <p className="text-[9px] text-amber-600 dark:text-amber-400 mt-1">
                      Semua santri saat ini sudah terhubung dengan akun orang tua.
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !relationParentId || !relationChildId}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center space-x-1.5 disabled:opacity-60"
                >
                  <Link2 className="h-4 w-4" />
                  <span>Hubungkan ke Orang Tua</span>
                </button>
              </form>
            </div>

            {/* Santri Tanpa Wali Box */}
            <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl space-y-2">
              <h5 className="font-bold text-xs text-amber-700 dark:text-amber-400 flex items-center space-x-1.5">
                <ShieldAlert className="h-4 w-4" />
                <span>Daftar Santri Tanpa Wali</span>
              </h5>
              <div className="text-[10.5px] text-slate-500 space-y-1">
                {santriList.filter(s => !s.parentUserId).length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {santriList.filter(s => !s.parentUserId).map(s => (
                      <span key={s.id} className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold">
                        {s.nama}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="italic">Semua santri terdaftar saat ini sudah terhubung ke akun orang tua.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
