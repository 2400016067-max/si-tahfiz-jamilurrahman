'use client';

import React, { useEffect, useState, useCallback } from 'react';
import RoleHeader from '@/components/RoleHeader';
import { 
  getSantriList, 
  getHalaqahList, 
  getSetoranList, 
  saveHalaqahList, 
  saveSetoranList
} from '@/lib/store';
import { Santri, Halaqah, Setoran } from '@/lib/mockData';
import { 
  Database, 
  Search, 
  RotateCw
} from 'lucide-react';

interface BackupLog {
  id: string;
  timestamp: string;
  size: string;
  status: 'sukses' | 'gagal';
}

export default function StaffTUDashboard() {
  const [mounted, setMounted] = useState(false);
  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [halaqahs, setHalaqahs] = useState<Halaqah[]>([]);
  const [setorans, setSetorans] = useState<Setoran[]>([]);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Santri | null>(null);

  // Backup simulator logs
  const [backups, setBackups] = useState<BackupLog[]>([
    { id: 'b-1', timestamp: '2026-06-05 23:00:02', size: '154 KB', status: 'sukses' },
    { id: 'b-2', timestamp: '2026-06-04 23:00:01', size: '152 KB', status: 'sukses' }
  ]);

  // Personnel rotation states
  const [selectedHalaqahId, setSelectedHalaqahId] = useState<string>('');
  const [newPengampu, setNewPengampu] = useState<string>('');

  // Input correction state (F5.4)
  const [editingSetoranId, setEditingSetoranId] = useState<string>('');
  const [correctedKesalahan, setCorrectedKesalahan] = useState<number>(0);
  const [isApprovedByKoordinator, setIsApprovedByKoordinator] = useState(false);

  const loadData = useCallback(() => {
    setSantriList(getSantriList());
    const h = getHalaqahList();
    setHalaqahs(h);
    if (h.length > 0 && !selectedHalaqahId) {
      setSelectedHalaqahId(h[0].id);
      setNewPengampu(h[0].pengampu);
    }
    setSetorans(getSetoranList());
  }, [selectedHalaqahId]);

  useEffect(() => {
    setMounted(true);
    loadData();

    // Storage listener
    const handleUpdate = () => loadData();
    window.addEventListener('tahfiz_storage_update', handleUpdate);
    return () => window.removeEventListener('tahfiz_storage_update', handleUpdate);
  }, [loadData]);

  // 1. Rotate Personnel / Teacher (F5.1.1)
  const handleRotatePersonnel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHalaqahId || !newPengampu.trim()) return;

    const list = getHalaqahList();
    const index = list.findIndex(h => h.id === selectedHalaqahId);
    if (index !== -1) {
      const oldName = list[index].pengampu;
      list[index].pengampu = newPengampu.trim();
      saveHalaqahList(list);
      alert(`Personel dirotasi!\nPengampu ${list[index].nama} berhasil dialihkan dari "${oldName}" ke "${newPengampu.trim()}".`);
    }
    loadData();
  };

  // 2. Database Auto-Backup Simulation (F5.1.2)
  const handleBackup = () => {
    const newBackup: BackupLog = {
      id: `b-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      size: `${Math.round((JSON.stringify(localStorage).length / 1024) * 10) / 10} KB`,
      status: 'sukses'
    };
    setBackups(prev => [newBackup, ...prev]);
    alert('Simulasi pencadangan otomatis (Auto-backup) berhasil! Berkas terkompresi disimpan di cloud storage yayasan.');
  };

  // 3. Format Synchronization (F5.2.1)
  const handleSyncFormats = () => {
    alert('[Sinkronisasi Unit] Berhasil menyelaraskan format rekapitulasi pelaporan harian antara Unit Putra (Halaqah Abu Bakar) dan Unit Putri (Halaqah Aisyah).\nFormat draf laporan PDF/Excel sekarang seragam.');
  };

  // 4. Correct Input Error (F5.4.1)
  const handleCorrectInput = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSetoranId) return;

    if (!isApprovedByKoordinator) {
      alert('Peringatan: Koreksi data input harian harus mendapatkan persetujuan Koordinator terlebih dahulu (F5.4.1).');
      return;
    }

    const list = getSetoranList();
    const index = list.findIndex(s => s.id === editingSetoranId);
    if (index !== -1) {
      const oldKesalahan = list[index].kesalahan;
      list[index].kesalahan = correctedKesalahan;
      // Recalculate status
      list[index].status = correctedKesalahan <= 1 ? 'lulus' : 'mengulang';
      saveSetoranList(list);
      alert(`Koreksi Berhasil!\nKesalahan setoran diubah dari ${oldKesalahan} menjadi ${correctedKesalahan}. Status kelulusan disesuaikan.`);
    }

    setEditingSetoranId('');
    setIsApprovedByKoordinator(false);
    loadData();
  };

  // Filter students for search
  const filteredStudents = santriList.filter(s => 
    s.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
      <RoleHeader roleName="Staf Tata Usaha (TU)" activeRole="stafftu" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Dashboard Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left / Middle Columns: Search & Input Correction */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Quick Search Santri & Admin Details (F5.2.2, F5.3.2) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
              <h3 className="font-extrabold text-sm text-slate-850 dark:text-slate-150 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex items-center justify-between">
                <span>🔍 Pencarian Cepat Administrasi Santri</span>
                <span className="text-[10px] text-slate-450">F5.2.2</span>
              </h3>

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

              {searchQuery && (
                <div className="border border-slate-150 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-850 max-h-[160px] overflow-y-auto mb-4">
                  {filteredStudents.map(student => (
                    <button
                      key={student.id}
                      onClick={() => setSelectedStudent(student)}
                      className="w-full text-left p-2.5 hover:bg-slate-50 dark:hover:bg-slate-850/50 flex justify-between text-xs transition-colors"
                    >
                      <span className="font-bold">{student.nama}</span>
                      <span className="text-slate-400">{student.id} · Kelas {student.kelas}</span>
                    </button>
                  ))}
                  {filteredStudents.length === 0 && (
                    <p className="text-center text-xs text-slate-400 py-3">Tidak ada data santri.</p>
                  )}
                </div>
              )}

              {selectedStudent ? (
                <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-4 rounded-xl space-y-3 text-xs">
                  <h4 className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                    <span>Detail Administratif Santri</span>
                    <button 
                      onClick={() => setSelectedStudent(null)}
                      className="text-[10px] text-slate-400 hover:underline"
                    >
                      Tutup
                    </button>
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] uppercase text-slate-400 font-bold">Nama Lengkap</p>
                      <p className="font-semibold">{selectedStudent.nama}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-slate-400 font-bold">ID Santri (NIM)</p>
                      <p className="font-mono">{selectedStudent.id}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-slate-400 font-bold">Grade & Kelas</p>
                      <p className="font-semibold">{selectedStudent.grade} (Kelas {selectedStudent.kelas})</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-slate-400 font-bold">Kelompok Halaqah</p>
                      <p className="font-semibold">{selectedStudent.halaqahId === 'h-1' ? 'Abu Bakar (Putra)' : 'Aisyah (Putri)'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-slate-400 font-bold">Nama Wali / Kontak</p>
                      <p className="font-semibold">{selectedStudent.parentName} ({selectedStudent.parentPhone})</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-slate-400 font-bold">Total Hafalan Juz</p>
                      <p className="font-semibold">Juz {selectedStudent.totalHafalanJuz.length > 0 ? selectedStudent.totalHafalanJuz.join(', ') : '-'}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-xs text-slate-400 py-4 bg-slate-50/50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  Pilih/cari santri di atas untuk memverifikasi kontak orang tua terbaru atau data administratif lainnya (F5.3.2).
                </p>
              )}
            </div>

            {/* Error Input Correction Simulator (F5.4.1) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
              <h3 className="font-extrabold text-sm text-slate-850 dark:text-slate-150 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex items-center justify-between">
                <span>🛠 Koreksi Kesalahan Input Setoran (Otoritas Terbatas)</span>
                <span className="text-[10px] text-slate-450">F5.4.1</span>
              </h3>

              <form onSubmit={handleCorrectInput} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400">Pilih Setoran (Log ID)</label>
                    <select
                      value={editingSetoranId}
                      onChange={e => {
                        setEditingSetoranId(e.target.value);
                        const match = setorans.find(s => s.id === e.target.value);
                        if (match) setCorrectedKesalahan(match.kesalahan);
                      }}
                      required
                      className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none"
                    >
                      <option value="">-- Pilih Log Setoran --</option>
                      {setorans.map(s => {
                        const student = santriList.find(st => st.id === s.santriId);
                        return (
                          <option key={s.id} value={s.id}>
                            {student?.nama} - {s.surah} ({s.date}) [Kesalahan: {s.kesalahan}]
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400">Jumlah Kesalahan Baru</label>
                    <input
                      type="number"
                      value={correctedKesalahan}
                      onChange={e => setCorrectedKesalahan(Number(e.target.value))}
                      className="w-full text-xs p-2 border border-slate-250 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2 p-3 bg-violet-500/10 text-violet-800 dark:text-violet-300 rounded-xl text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={isApprovedByKoordinator}
                    onChange={e => setIsApprovedByKoordinator(e.target.checked)}
                    className="h-4 w-4 text-violet-600 border-slate-300 rounded"
                  />
                  <span>Koreksi ini telah disetujui oleh Koordinator Tahfiz (Wajib)</span>
                </div>

                <button
                  type="submit"
                  className="w-full bg-violet-650 hover:bg-violet-750 text-white font-bold py-2 rounded-xl text-xs shadow-md transition-colors"
                >
                  Terapkan Koreksi Log
                </button>
              </form>
            </div>

          </div>

          {/* Right Column: Personnel Rotation & Backup Simulator (F5.1, F5.2.1) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* User Management & Teacher Rotation (F5.1.1) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex items-center justify-between">
                <span>🔄 Rotasi Hak Akses & Personel</span>
                <span className="text-[10px] text-slate-450">F5.1.1</span>
              </h3>

              <form onSubmit={handleRotatePersonnel} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400">Pilih Halaqah</label>
                  <select
                    value={selectedHalaqahId}
                    onChange={e => {
                      setSelectedHalaqahId(e.target.value);
                      const match = halaqahs.find(h => h.id === e.target.value);
                      if (match) setNewPengampu(match.pengampu);
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
                  <label className="text-[10px] font-bold uppercase text-slate-400">Pengampu Baru</label>
                  <input
                    type="text"
                    value={newPengampu}
                    onChange={e => setNewPengampu(e.target.value)}
                    required
                    className="w-full text-xs p-2 border border-slate-250 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:border-violet-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-slate-800 dark:bg-slate-700 hover:bg-slate-750 text-white font-bold py-2 rounded-xl text-xs transition-colors"
                >
                  Terapkan Alih Hak Akses
                </button>
              </form>
            </div>

            {/* Auto-Backup Database Simulator (F5.1.2) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                  <Database className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                  <span>Cadangan Database</span>
                </h3>
                <button
                  onClick={handleBackup}
                  className="bg-violet-600 hover:bg-violet-750 text-white font-bold text-[10px] px-2 py-1 rounded shadow"
                >
                  Backup Sekarang
                </button>
              </div>

              <p className="text-[10px] text-slate-500 mb-3">
                Histori pencadangan data otomatis (NFR-05.2) yang dikelola Staf TU:
              </p>

              <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                {backups.map(log => (
                  <div key={log.id} className="p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-lg flex justify-between items-center text-[10px]">
                    <div className="space-y-0.5">
                      <p className="font-bold text-slate-750 dark:text-slate-300">{log.timestamp}</p>
                      <p className="text-slate-400">Ukuran file: {log.size}</p>
                    </div>
                    <span className="text-[8px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded font-bold">
                      {log.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sync Unit and Reset Portal Data */}
            <div className="space-y-4">
              <button
                onClick={handleSyncFormats}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 p-4 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center space-x-2"
              >
                <RotateCw className="h-4 w-4 text-violet-650" />
                <span>Sinkronisasi Format Unit (F5.2.1)</span>
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
