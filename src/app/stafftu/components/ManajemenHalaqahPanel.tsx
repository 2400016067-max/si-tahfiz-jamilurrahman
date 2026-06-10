'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Halaqah, Santri, DBUser } from '@/types/tahfiz';
import {
  BookMarked,
  RotateCw,
  PlusCircle,
  Users,
  CheckCircle2,
  ArrowRightLeft,
  Edit2,
  X,
} from 'lucide-react';

interface ManajemenHalaqahPanelProps {
  halaqahs: Halaqah[];
  santriList: Santri[];
  pengampuUsers: DBUser[];
  isLoading: boolean;
  onDataChanged: () => void;
}

export default function ManajemenHalaqahPanel({
  halaqahs,
  santriList,
  pengampuUsers,
  isLoading,
  onDataChanged,
}: ManajemenHalaqahPanelProps) {
  const [newHalaqahNama, setNewHalaqahNama] = useState('');
  const [newHalaqahUnit, setNewHalaqahUnit] = useState<'Putra' | 'Putri'>('Putra');
  const [newHalaqahPengampuId, setNewHalaqahPengampuId] = useState(pengampuUsers[0]?.id || '');
  const [createHalaqahSuccess, setCreateHalaqahSuccess] = useState(false);
  const [selectedHalaqahId, setSelectedHalaqahId] = useState<string>(halaqahs[0]?.id || '');
  const [newPengampu, setNewPengampu] = useState<string>(halaqahs[0]?.pengampu_id || '');
  const [editingHalaqah, setEditingHalaqah] = useState<Halaqah | null>(null);
  const [editHalaqahNama, setEditHalaqahNama] = useState('');
  const [editHalaqahUnit, setEditHalaqahUnit] = useState<'Putra' | 'Putri'>('Putra');

  const handleCreateHalaqah = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHalaqahNama.trim() || !newHalaqahPengampuId) return;

    setCreateHalaqahSuccess(false);

    const { error } = await supabase.from('halaqah').insert({
      nama: newHalaqahNama.trim(),
      unit: newHalaqahUnit,
      pengampu_id: newHalaqahPengampuId,
      is_active: true,
    });

    if (error) {
      toast.error('Gagal membuat halaqah: ' + error.message);
      return;
    }

    setCreateHalaqahSuccess(true);
    toast.success('Halaqah baru berhasil dibuat!');
    setNewHalaqahNama('');
    setTimeout(() => setCreateHalaqahSuccess(false), 3000);
    onDataChanged();
  };

  const handleRotatePersonnel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHalaqahId || !newPengampu) return;

    const matchedUser = pengampuUsers.find(u => u.id === newPengampu);

    if (!matchedUser) {
      toast.error('Pengampu baru tidak valid.');
      return;
    }

    const currentHalaqah = halaqahs.find(h => h.id === selectedHalaqahId);
    const oldName = currentHalaqah?.pengampu ?? '(tidak diketahui)';

    const { error } = await supabase
      .from('halaqah')
      .update({
        pengampu_id: matchedUser.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedHalaqahId);

    if (error) {
      toast.error('Gagal memperbarui pengampu: ' + error.message);
      return;
    }

    toast.success(
      `Personel dirotasi! Pengampu ${currentHalaqah?.nama} berhasil dialihkan ` +
      `dari "${oldName}" ke "${matchedUser.nama_lengkap}".`
    );
    onDataChanged();
  };

  const handleUpdateHalaqah = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHalaqah) return;

    try {
      const { error } = await supabase
        .from('halaqah')
        .update({
          nama: editHalaqahNama.trim(),
          unit: editHalaqahUnit,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingHalaqah.id);

      if (error) throw error;

      toast.success('Halaqah berhasil diperbarui!');
      setEditingHalaqah(null);
      onDataChanged();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui halaqah.';
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-8">
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Buat Halaqah Form */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-850 pb-3 mb-5 flex items-center space-x-2">
            <BookMarked className="h-4 w-4 text-violet-500" />
            <span>Buat Halaqah Baru</span>
          </h3>

          <form onSubmit={handleCreateHalaqah} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Nama Halaqah</label>
              <input
                type="text"
                value={newHalaqahNama}
                onChange={e => setNewHalaqahNama(e.target.value)}
                placeholder="cth: Halaqah Abu Bakar"
                required
                className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:border-violet-400"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Unit</label>
              <select
                value={newHalaqahUnit}
                onChange={e => setNewHalaqahUnit(e.target.value as 'Putra' | 'Putri')}
                className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none"
              >
                <option value="Putra">Putra</option>
                <option value="Putri">Putri</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Pengampu</label>
              <select
                value={newHalaqahPengampuId}
                onChange={e => setNewHalaqahPengampuId(e.target.value)}
                required
                className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none"
              >
                <option value="">-- Pilih Pengampu --</option>
                {pengampuUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.nama_lengkap}</option>
                ))}
              </select>
            </div>

            {createHalaqahSuccess && (
              <div className="flex items-center space-x-1.5 text-emerald-600 text-xs font-bold">
                <CheckCircle2 className="h-4 w-4" />
                <span>Halaqah berhasil didaftarkan!</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-violet-650 hover:bg-violet-750 text-white font-bold py-2 rounded-xl text-xs transition-colors flex items-center justify-center space-x-1.5 disabled:opacity-60"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Simpan Halaqah</span>
            </button>
          </form>
        </div>

        {/* Rotasi Pengampu Form */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-850 pb-3 mb-5 flex items-center space-x-2">
            <RotateCw className="h-4 w-4 text-violet-500" />
            <span>Rotasi Pengampu Halaqah</span>
          </h3>

          <form onSubmit={handleRotatePersonnel} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Pilih Halaqah</label>
              <select
                value={selectedHalaqahId}
                onChange={e => {
                  setSelectedHalaqahId(e.target.value);
                  const match = halaqahs.find(h => h.id === e.target.value);
                  if (match) setNewPengampu(match.pengampu_id || '');
                }}
                required
                className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none"
              >
                {halaqahs.map(h => (
                  <option key={h.id} value={h.id}>{h.nama}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Pengampu Baru</label>
              <select
                value={newPengampu}
                onChange={e => setNewPengampu(e.target.value)}
                required
                className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:border-violet-500"
              >
                <option value="">-- Pilih Pengampu Baru --</option>
                {pengampuUsers.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.nama_lengkap}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-800 dark:bg-slate-750 hover:bg-slate-750 text-white font-bold py-2 rounded-xl text-xs transition-colors flex items-center justify-center space-x-1.5 disabled:opacity-60"
            >
              <ArrowRightLeft className="h-3.5 w-3.5 mr-1" />
              <span>Terapkan Alih Hak Akses</span>
            </button>
          </form>
        </div>

        {/* Info Distribusi Santri */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="font-extrabold text-sm text-slate-850 dark:text-slate-150 border-b border-slate-100 dark:border-slate-850 pb-3 mb-4 flex items-center space-x-2">
            <Users className="h-4.5 w-4.5 text-violet-500" />
            <span>Distribusi Santri Per Halaqah</span>
          </h3>
          
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {halaqahs.map(h => {
              const list = santriList.filter(s => s.halaqahId === h.id);
              return (
                <div key={h.id} className="p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-850 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-slate-800 dark:text-slate-250">{h.nama} ({h.unit})</span>
                    <span className="text-violet-650 bg-violet-500/10 px-2 py-0.5 rounded text-[10px]">{list.length} Santri</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Pengampu: <span className="font-semibold">{h.pengampu}</span></p>
                  {list.length > 0 && (
                    <div className="text-[10px] text-slate-450 dark:text-slate-400 pt-1.5 border-t border-slate-100 dark:border-slate-850">
                      <span className="font-bold">Santri:</span> {list.map(s => s.nama).join(', ')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Halaqah List Table with Edit */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
        <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 pb-3 border-b border-slate-100 dark:border-slate-850 mb-4">
          Daftar Halaqah Aktif
        </h3>
        <div className="overflow-x-auto border border-slate-150 dark:border-slate-850 rounded-xl">
          <table className="w-full text-xs text-left divide-y divide-slate-100 dark:divide-slate-850">
            <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="p-3">Nama Halaqah</th>
                <th className="p-3">Unit</th>
                <th className="p-3">Pengampu Utama</th>
                <th className="p-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
              {halaqahs.map(h => (
                <tr key={h.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                  <td className="p-3 font-bold text-slate-850 dark:text-slate-100">{h.nama}</td>
                  <td className="p-3">{h.unit}</td>
                  <td className="p-3 font-semibold text-slate-700 dark:text-slate-350">{h.pengampu}</td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => {
                        setEditingHalaqah(h);
                        setEditHalaqahNama(h.nama);
                        setEditHalaqahUnit(h.unit);
                      }}
                      className="text-violet-600 hover:text-violet-850 p-1.5 hover:bg-violet-50 dark:hover:bg-violet-950/20 rounded-lg transition-colors"
                      title="Edit Detail Halaqah"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Edit Data Halaqah */}
      {editingHalaqah && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-850">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                Edit Detail Halaqah
              </h3>
              <button onClick={() => setEditingHalaqah(null)} className="text-slate-400 hover:text-slate-500">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleUpdateHalaqah} className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Nama Halaqah</label>
                <input
                  type="text"
                  value={editHalaqahNama}
                  onChange={e => setEditHalaqahNama(e.target.value)}
                  required
                  className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Unit Halaqah</label>
                <select
                  value={editHalaqahUnit}
                  onChange={e => setEditHalaqahUnit(e.target.value as 'Putra' | 'Putri')}
                  className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg"
                >
                  <option value="Putra">Putra</option>
                  <option value="Putri">Putri</option>
                </select>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingHalaqah(null)}
                  className="flex-1 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-350 font-bold py-2 rounded-xl text-xs transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-violet-600 hover:bg-violet-750 text-white font-bold py-2 rounded-xl text-xs transition-colors disabled:opacity-60"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
