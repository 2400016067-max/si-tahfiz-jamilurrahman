'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Santri, Halaqah, DBUser } from '@/types/tahfiz';
import ImportExcelModal from './ImportExcelModal';
import {
  Search,
  PlusCircle,
  CheckCircle2,
  Edit2,
  Upload,
  X,
} from 'lucide-react';

interface ManajemenSantriPanelProps {
  santriList: Santri[];
  halaqahs: Halaqah[];
  halaqahMap: Record<string, string>;
  parentUsers: DBUser[];
  isLoading: boolean;
  onDataChanged: () => void;
}

export default function ManajemenSantriPanel({
  santriList,
  halaqahs,
  halaqahMap,
  parentUsers,
  isLoading,
  onDataChanged,
}: ManajemenSantriPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSantri, setEditingSantri] = useState<Santri | null>(null);
  const [editSantriNama, setEditSantriNama] = useState('');
  const [editSantriKelas, setEditSantriKelas] = useState('7A');
  const [editSantriGrade, setEditSantriGrade] = useState<'Tahsin' | 'Takmil' | 'Tahfiz'>('Tahsin');
  const [editSantriHalaqahId, setEditSantriHalaqahId] = useState('');
  const [editSantriStatus, setEditSantriStatus] = useState<'active' | 'stagnant'>('active');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [newSantriNama, setNewSantriNama] = useState('');
  const [newSantriKelas, setNewSantriKelas] = useState('7A');
  const [newSantriGrade, setNewSantriGrade] = useState<'Tahsin' | 'Takmil' | 'Tahfiz'>('Tahsin');
  const [newSantriHalaqahId, setNewSantriHalaqahId] = useState(halaqahs[0]?.id || '');
  const [newSantriParentName, setNewSantriParentName] = useState('');
  const [newSantriParentPhone, setNewSantriParentPhone] = useState('');
  const [createSantriSuccess, setCreateSantriSuccess] = useState(false);
  const [parentAccountMode, setParentAccountMode] = useState<'new' | 'existing'>('new');
  const [selectedParentUserId, setSelectedParentUserId] = useState<string>('');
  const [newParentEmail, setNewParentEmail] = useState('');

  const filteredStudents = santriList.filter(s =>
    s.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUpdateSantri = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSantri) return;

    const targetBarisMap = { Tahsin: 3, Takmil: 7, Tahfiz: 12 };
    const targetBaris = targetBarisMap[editSantriGrade];

    try {
      const { error } = await supabase
        .from('santri')
        .update({
          nama: editSantriNama.trim(),
          kelas: editSantriKelas,
          grade: editSantriGrade,
          target_baris: targetBaris,
          halaqah_id: editSantriHalaqahId,
          status: editSantriStatus,
        })
        .eq('id', editingSantri.id);

      if (error) throw error;

      toast.success('Data santri berhasil diperbarui!');
      setEditingSantri(null);
      onDataChanged();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui data santri.';
      toast.error(msg);
    }
  };

  const handleCreateSantri = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSantriNama.trim() || !newSantriHalaqahId) return;
    if (parentAccountMode === 'new' && !newSantriParentName.trim()) return;
    if (parentAccountMode === 'existing' && !selectedParentUserId) return;

    setCreateSantriSuccess(false);

    const targetBarisMap = { Tahsin: 3, Takmil: 7, Tahfiz: 12 };
    const targetBaris = targetBarisMap[newSantriGrade];

    let parentUserId = null;
    let parentName = '';
    let parentPhone = null;

    try {
      if (parentAccountMode === 'existing') {
        const selectedParent = parentUsers.find(p => p.id === selectedParentUserId);
        if (!selectedParent) {
          toast.error('Orang tua yang dipilih tidak valid.');
          return;
        }
        parentUserId = selectedParent.id;
        parentName = selectedParent.nama_lengkap;
        parentPhone = selectedParent.no_hp || null;
      } else {
        const emailToUse = newParentEmail.trim() || (() => {
          const base = newSantriParentName
            .toLowerCase()
            .replace(/bapak|ibu|wali\s*/i, '')
            .trim()
            .replace(/\s+/g, '.')
            .replace(/[^a-z.]/g, '');
          return `${base}@parent.mts-tq.sch.id`;
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

        const { data: newParent, error: newParentError } = await supabase
          .from('users')
          .insert({
            email: emailToUse,
            password_hash: '$2b$10$placeholderHashForDevOnly.' + newSantriParentName.toLowerCase().replace(/[^a-z]/g, ''),
            role: 'orangtua',
            nama_lengkap: newSantriParentName.trim(),
            no_hp: newSantriParentPhone.trim() || null,
            is_active: true,
          })
          .select('id')
          .single();

        if (newParentError || !newParent) {
          toast.error('Gagal membuat akun orang tua baru: ' + (newParentError?.message || 'Unknown error'));
          return;
        }

        parentUserId = newParent.id;
        parentName = newSantriParentName.trim();
        parentPhone = newSantriParentPhone.trim() || null;
      }

      const { error } = await supabase.from('santri').insert({
        nama: newSantriNama.trim(),
        kelas: newSantriKelas.trim(),
        grade: newSantriGrade,
        target_baris: targetBaris,
        halaqah_id: newSantriHalaqahId,
        parent_name: parentName,
        parent_phone: parentPhone,
        parent_user_id: parentUserId,
        current_juz: 30,
        status: 'active',
      });

      if (error) {
        toast.error('Gagal menambahkan santri: ' + error.message);
        return;
      }

      setCreateSantriSuccess(true);
      toast.success('Santri baru berhasil ditambahkan!');
      setNewSantriNama('');
      setNewSantriKelas('7A');
      setNewSantriGrade('Tahsin');
      setNewSantriParentName('');
      setNewSantriParentPhone('');
      setNewParentEmail('');
      setSelectedParentUserId('');
      setTimeout(() => setCreateSantriSuccess(false), 3000);
      onDataChanged();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menambahkan santri.';
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Santri Search Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-3 mb-4">
          <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
            🔍 Cari &amp; Edit Data Santri
          </h3>
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Import Excel</span>
          </button>
        </div>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Cari santri berdasarkan Nama atau ID Santri..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-10 pr-4 py-2 border border-slate-250 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:border-violet-500" 
          />
        </div>

        <div className="overflow-x-auto border border-slate-150 dark:border-slate-850 rounded-xl">
          <table className="w-full text-xs text-left divide-y divide-slate-100 dark:divide-slate-850">
            <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="p-3">Nama Santri</th>
                <th className="p-3">Kelas &amp; Grade</th>
                <th className="p-3">Halaqah</th>
                <th className="p-3">Wali / No. HP</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
              {filteredStudents.map(student => (
                <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                  <td className="p-3 font-bold text-slate-800 dark:text-slate-100">{student.nama}</td>
                  <td className="p-3">{student.kelas} · <span className="font-semibold text-violet-650">{student.grade}</span></td>
                  <td className="p-3">{halaqahMap[student.halaqahId] || 'Halaqah'}</td>
                  <td className="p-3">
                    <p className="font-semibold">{student.parentName}</p>
                    <p className="text-[10px] text-slate-400">{student.parentPhone || '-'}</p>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${student.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                      {student.status === 'active' ? 'Aktif' : 'Stagnan'}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => {
                        setEditingSantri(student);
                        setEditSantriNama(student.nama);
                        setEditSantriKelas(student.kelas);
                        setEditSantriGrade(student.grade);
                        setEditSantriHalaqahId(student.halaqahId);
                        setEditSantriStatus(student.status);
                      }}
                      className="text-violet-600 hover:text-violet-850 p-1.5 hover:bg-violet-50 dark:hover:bg-violet-950/20 rounded-lg transition-colors"
                      title="Edit Data Santri"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-slate-400 py-6">Tidak ada data santri ditemukan.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tambah Santri Form */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <h3 className="font-extrabold text-sm text-slate-850 dark:text-slate-150 border-b border-slate-100 dark:border-slate-800 pb-3 mb-5 flex items-center space-x-2">
          <PlusCircle className="h-4 w-4 text-violet-500" />
          <span>Daftarkan Santri Baru</span>
        </h3>

        <form onSubmit={handleCreateSantri} className="space-y-4 max-w-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Nama Lengkap Santri</label>
              <input
                type="text"
                value={newSantriNama}
                onChange={e => setNewSantriNama(e.target.value)}
                placeholder="cth: Ahmad Fauzan"
                required
                className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:border-violet-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Kelas</label>
                <select
                  value={newSantriKelas}
                  onChange={e => setNewSantriKelas(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none"
                >
                  {['7A','7B','8A','8B','9A','9B'].map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Grade</label>
                <select
                  value={newSantriGrade}
                  onChange={e => setNewSantriGrade(e.target.value as 'Tahsin' | 'Takmil' | 'Tahfiz')}
                  className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none"
                >
                  <option value="Tahsin">Tahsin (3 baris)</option>
                  <option value="Takmil">Takmil (7 baris)</option>
                  <option value="Tahfiz">Tahfiz (12 baris)</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Halaqah</label>
            <select
              value={newSantriHalaqahId}
              onChange={e => setNewSantriHalaqahId(e.target.value)}
              required
              className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:border-violet-400"
            >
              <option value="">-- Pilih Halaqah --</option>
              {halaqahs.map(h => (
                <option key={h.id} value={h.id}>{h.nama} ({h.unit})</option>
              ))}
            </select>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-850 pt-4 mt-4">
            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-2">Akun Orang Tua Wali</label>
            <div className="flex items-center space-x-4 mb-3">
              <label className="flex items-center space-x-1.5 text-xs text-slate-600 dark:text-slate-350 cursor-pointer font-semibold">
                <input
                  type="radio"
                  name="parentMode"
                  checked={parentAccountMode === 'new'}
                  onChange={() => setParentAccountMode('new')}
                  className="text-violet-500 focus:ring-violet-500"
                />
                <span>Buat Akun Baru</span>
              </label>
              <label className="flex items-center space-x-1.5 text-xs text-slate-600 dark:text-slate-350 cursor-pointer font-semibold">
                <input
                  type="radio"
                  name="parentMode"
                  checked={parentAccountMode === 'existing'}
                  onChange={() => setParentAccountMode('existing')}
                  className="text-violet-500 focus:ring-violet-500"
                />
                <span>Hubungkan Akun Orang Tua Lama</span>
              </label>
            </div>

            {parentAccountMode === 'existing' ? (
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Pilih Orang Tua</label>
                <select
                  value={selectedParentUserId}
                  onChange={e => setSelectedParentUserId(e.target.value)}
                  required={parentAccountMode === 'existing'}
                  className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none"
                >
                  <option value="">-- Pilih Akun Orang Tua --</option>
                  {parentUsers.map(p => (
                    <option key={p.id} value={p.id}>{p.nama_lengkap} ({p.email})</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Nama Orang Tua</label>
                  <input
                    type="text"
                    value={newSantriParentName}
                    onChange={e => setNewSantriParentName(e.target.value)}
                    placeholder="cth: Bapak Salman"
                    required={parentAccountMode === 'new'}
                    className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Nomor HP</label>
                  <input
                    type="tel"
                    value={newSantriParentPhone}
                    onChange={e => setNewSantriParentPhone(e.target.value)}
                    placeholder="cth: 0812xxxx"
                    className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Email (Opsional)</label>
                  <input
                    type="email"
                    value={newParentEmail}
                    onChange={e => setNewParentEmail(e.target.value)}
                    placeholder="auto: nama@parent.mts-tq.sch.id"
                    className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {createSantriSuccess && (
            <div className="flex items-center space-x-1.5 text-emerald-600 text-xs font-bold">
              <CheckCircle2 className="h-4 w-4" />
              <span>Santri baru berhasil ditambahkan ke database!</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 px-6 rounded-xl text-xs shadow transition-colors flex items-center justify-center space-x-1.5 disabled:opacity-60"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Daftarkan Santri Baru</span>
          </button>
        </form>
      </div>

      {/* Modal Edit Data Santri */}
      {editingSantri && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-850">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                Edit Profil Santri
              </h3>
              <button onClick={() => setEditingSantri(null)} className="text-slate-400 hover:text-slate-500">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSantri} className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Nama Santri</label>
                <input
                  type="text"
                  value={editSantriNama}
                  onChange={e => setEditSantriNama(e.target.value)}
                  required
                  className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Kelas</label>
                  <select
                    value={editSantriKelas}
                    onChange={e => setEditSantriKelas(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg"
                  >
                    {['7A','7B','8A','8B','9A','9B'].map(k => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Grade</label>
                  <select
                    value={editSantriGrade}
                    onChange={e => setEditSantriGrade(e.target.value as 'Tahsin' | 'Takmil' | 'Tahfiz')}
                    className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg"
                  >
                    <option value="Tahsin">Tahsin</option>
                    <option value="Takmil">Takmil</option>
                    <option value="Tahfiz">Tahfiz</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Kelompok Halaqah</label>
                <select
                  value={editSantriHalaqahId}
                  onChange={e => setEditSantriHalaqahId(e.target.value)}
                  required
                  className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg"
                >
                  {halaqahs.map(h => (
                    <option key={h.id} value={h.id}>{h.nama}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Status Keaktifan</label>
                <select
                  value={editSantriStatus}
                  onChange={e => setEditSantriStatus(e.target.value as 'active' | 'stagnant')}
                  className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg"
                >
                  <option value="active">Aktif</option>
                  <option value="stagnant">Stagnan</option>
                </select>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSantri(null)}
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

      {/* Import Excel Modal */}
      {isImportModalOpen && (
        <ImportExcelModal
          onClose={() => {
            setIsImportModalOpen(false);
            onDataChanged();
          }}
          halaqahs={halaqahs}
          santriList={santriList}
        />
      )}
    </div>
  );
}
