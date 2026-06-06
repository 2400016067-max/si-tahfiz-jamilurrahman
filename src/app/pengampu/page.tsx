'use client';

import React, { useEffect, useState, useCallback } from 'react';
import RoleHeader from '@/components/RoleHeader';
import { 
  getSantriList, 
  getHalaqahList, 
  getSetoranList, 
  getPesanList,
  addSetoran, 
  addPesan 
} from '@/lib/store';
import { Santri, Halaqah, Setoran, Pesan } from '@/lib/mockData';
import { 
  Users, 
  Check, 
  AlertCircle, 
  Send, 
  FileSpreadsheet, 
  FileText, 
  TrendingUp, 
  BookOpen, 
  User, 
  Flame
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function PengampuDashboard() {
  const [mounted, setMounted] = useState(false);
  const [halaqahs, setHalaqahs] = useState<Halaqah[]>([]);
  const [selectedHalaqahId, setSelectedHalaqahId] = useState<string>('');
  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [selectedSantri, setSelectedSantri] = useState<Santri | null>(null);
  
  // Setorans & Messages
  const [setorans, setSetorans] = useState<Setoran[]>([]);
  const [pesans, setPesans] = useState<Pesan[]>([]);
  
  // Form Inputs
  const [sabkiDone, setSabkiDone] = useState<boolean>(false);
  const [sabkiSurah, setSabkiSurah] = useState<string>('');
  const [sabkiHalaman, setSabkiHalaman] = useState<number>(1);
  const [sabkiKesalahan, setSabkiKesalahan] = useState<number>(0);
  
  const [sabakSurah, setSabakSurah] = useState<string>('An-Naba');
  const [sabakHalMulai, setSabakHalMulai] = useState<number>(582);
  const [sabakHalSelesai, setSabakHalSelesai] = useState<number>(582);
  const [sabakBaris, setSabakBaris] = useState<number>(10);
  const [sabakKesalahan, setSabakKesalahan] = useState<number>(0);
  const [sabakNotes, setSabakNotes] = useState<string>('');

  // Pekan Murajaah Settings
  const [isPekanMurajaah, setIsPekanMurajaah] = useState<boolean>(false);
  const [targetDivider, setTargetDivider] = useState<number>(15);
  const [mistakeThreshold, setMistakeThreshold] = useState<number>(1); // default 1 error per page

  // Chats
  const [chatInput, setChatInput] = useState<string>('');

  // Tikrar status
  const [tikrarCount, setTikrarCount] = useState<number>(0);

  // Active form tab
  const [activeTab, setActiveTab] = useState<'setoran' | 'pekan' | 'analitik' | 'pesan'>('setoran');

  const loadData = useCallback(() => {
    const h = getHalaqahList();
    setHalaqahs(h);
    if (h.length > 0 && !selectedHalaqahId) {
      setSelectedHalaqahId(h[0].id);
    }

    const s = getSantriList();
    setSantriList(s);

    const seto = getSetoranList();
    setSetorans(seto);

    const p = getPesanList();
    setPesans(p);
  }, [selectedHalaqahId]);

  useEffect(() => {
    setMounted(true);
    loadData();
    
    // Storage listener
    const handleUpdate = () => loadData();
    window.addEventListener('tahfiz_storage_update', handleUpdate);
    return () => window.removeEventListener('tahfiz_storage_update', handleUpdate);
  }, [loadData]);

  // Switch student
  const handleSelectSantri = (student: Santri) => {
    setSelectedSantri(student);
    setSabkiDone(false);
    setSabkiSurah('');
    setSabkiKesalahan(0);
    setSabkiHalaman(1);
    
    // Pre-fill target baris based on student grade
    let defaultBaris = 10;
    if (student.grade === 'Tahsin') defaultBaris = 3;
    if (student.grade === 'Takmil') defaultBaris = 7;
    if (student.grade === 'Tahfiz') defaultBaris = 12;
    setSabakBaris(defaultBaris);

    // Get current progress or set default surah based on target
    setSabakSurah(student.grade === 'Tahsin' ? "Iqra' / Juz 30" : 'Juz 30');
    setSabakKesalahan(0);
    setSabakNotes('');
    setTikrarCount(0);
  };

  const activeHalaqah = halaqahs.find(h => h.id === selectedHalaqahId);
  const activeStudents = santriList.filter(s => s.halaqahId === selectedHalaqahId);

  // Calculate stats for current halaqah
  const getStudentTodayStatus = (studentId: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todaySetorans = setorans.filter(s => s.santriId === studentId && s.date === todayStr);
    
    const hasSabak = todaySetorans.some(s => s.type === 'sabak');
    const hasSabki = todaySetorans.some(s => s.type === 'sabki');
    const failedSabak = todaySetorans.some(s => s.type === 'sabak' && s.status === 'mengulang');

    if (hasSabak && !failedSabak) return { label: 'Tuntas Sabak & Sabki', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' };
    if (hasSabak && failedSabak) return { label: 'Mengulang Sabak', color: 'text-red-600 dark:text-red-400 bg-red-500/10' };
    if (hasSabki) return { label: 'Sabki Tuntas', color: 'text-blue-600 dark:text-blue-400 bg-blue-500/10' };
    return { label: 'Belum Setor', color: 'text-slate-500 dark:text-slate-400 bg-slate-500/10' };
  };

  // Check if yesterday's Manzil was verified by parent
  const checkManzilStatus = (studentId: string) => {
    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const yesterdayManzil = setorans.find(
      s => s.santriId === studentId && s.type === 'manzil' && s.date === yesterdayStr
    );

    if (yesterdayManzil) {
      return {
        verified: yesterdayManzil.parentVerified,
        surah: yesterdayManzil.surah,
        halaman: `${yesterdayManzil.halamanMulai}-${yesterdayManzil.halamanSelesai}`
      };
    }
    return null;
  };

  // Submit Sabki
  const handleSaveSabki = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSantri) return;

    addSetoran({
      santriId: selectedSantri.id,
      date: new Date().toISOString().split('T')[0],
      type: 'sabki',
      surah: sabkiSurah || 'Murojaah Sabki',
      halamanMulai: sabkiHalaman,
      halamanSelesai: sabkiHalaman,
      baris: 15, // full page review
      kesalahan: sabkiKesalahan,
      status: sabkiKesalahan <= mistakeThreshold ? 'lulus' : 'mengulang',
      parentVerified: false,
      notes: 'Diinput oleh Pengampu'
    });

    if (sabkiKesalahan <= mistakeThreshold) {
      setSabkiDone(true);
      alert('Setoran Sabki TUNTAS! Silakan lanjut input setoran Sabak.');
    } else {
      alert('Sabki memiliki kesalahan melebihi batas. Santri harus mengulang Sabki terlebih dahulu.');
    }
    loadData();
  };

  // Submit Sabak
  const handleSaveSabak = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSantri) return;

    const autoStatus = sabakKesalahan <= mistakeThreshold ? 'lulus' : 'mengulang';

    addSetoran({
      santriId: selectedSantri.id,
      date: new Date().toISOString().split('T')[0],
      type: 'sabak',
      surah: sabakSurah,
      halamanMulai: sabakHalMulai,
      halamanSelesai: sabakHalSelesai,
      baris: sabakBaris,
      kesalahan: sabakKesalahan,
      status: autoStatus,
      parentVerified: false,
      notes: sabakNotes
    });

    if (autoStatus === 'mengulang') {
      alert(`Setoran Sabak ditandai MENGULANG karena memiliki ${sabakKesalahan} kesalahan (maksimal ${mistakeThreshold}). Santri diwajibkan mengikuti program Tikrar (pengulangan 10x).`);
    } else {
      alert('Setoran Sabak berhasil direkam dengan status LULUS.');
    }

    loadData();
    // Refresh select student panel
    const updated = getSantriList().find(s => s.id === selectedSantri.id);
    if (updated) setSelectedSantri(updated);
  };

  // Submit Message/Chat
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSantri || !chatInput.trim()) return;

    addPesan(selectedSantri.id, 'pengampu', chatInput.trim());
    setChatInput('');
    loadData();
  };

  // Export report simulation
  const handleExport = (type: 'pdf' | 'excel') => {
    if (!activeHalaqah) return;
    alert(`[Simulasi Ekspor] Berhasil membuat draf laporan ${type.toUpperCase()} untuk ${activeHalaqah.nama}.\nFile tersimpan di direktori pengarsipan Tata Usaha.`);
  };

  // Prepare chart data for student history
  const getChartData = (studentId: string) => {
    const studentSetorans = setorans
      .filter(s => s.santriId === studentId && s.type === 'sabak' && s.status === 'lulus')
      .slice(-7) // last 7 sessions
      .reverse(); // chronological

    return studentSetorans.map(s => ({
      tanggal: s.date.slice(5), // MM-DD
      baris: s.baris,
      kesalahan: s.kesalahan
    }));
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
      <RoleHeader roleName="Pengampu / Murobbi" activeRole="pengampu" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Top Controls: Halaqah Selection & Reports */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <span className="font-bold text-slate-705 dark:text-slate-300">Pilih Halaqah:</span>
            <div className="flex bg-slate-100 dark:bg-slate-850 p-1 rounded-lg">
              {halaqahs.map(h => (
                <button
                  key={h.id}
                  onClick={() => {
                    setSelectedHalaqahId(h.id);
                    setSelectedSantri(null);
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${selectedHalaqahId === h.id ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-750 dark:hover:text-slate-300'}`}
                >
                  {h.nama}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2 self-end md:self-auto">
            <button
              onClick={() => handleExport('excel')}
              className="inline-flex items-center px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300 transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600 dark:text-emerald-400" />
              Ekspor Excel
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className="inline-flex items-center px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300 transition-colors"
            >
              <FileText className="h-4 w-4 mr-2 text-red-650 dark:text-red-400" />
              Ekspor PDF Laporan
            </button>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Panel: Halaqah Students List */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col h-[650px]">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2 border-b border-slate-150 dark:border-slate-800 pb-3 mb-3">
              <span>Daftar Halaqah Santri</span>
              <span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                {activeStudents.length} Santri
              </span>
            </h3>
            
            <div className="overflow-y-auto flex-grow divide-y divide-slate-100 dark:divide-slate-800/50 pr-1">
              {activeStudents.map(student => {
                const isSelected = selectedSantri?.id === student.id;
                const status = getStudentTodayStatus(student.id);
                
                return (
                  <button
                    key={student.id}
                    onClick={() => handleSelectSantri(student)}
                    className={`w-full text-left p-3 my-1 rounded-xl transition-all flex items-center justify-between ${isSelected ? 'bg-emerald-50 dark:bg-emerald-950/20 border-l-4 border-emerald-500' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'}`}
                  >
                    <div>
                      <h4 className="font-bold text-sm text-slate-850 dark:text-slate-200">{student.nama}</h4>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-150 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-400">
                          {student.grade}
                        </span>
                        <span className="text-[10px] text-slate-450 dark:text-slate-550">
                          Kelas {student.kelas} · Target: {student.targetBaris} baris
                        </span>
                      </div>
                    </div>
                    
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${status.color}`}>
                      {status.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Panel: Student Management Area */}
          <div className="lg:col-span-8 flex flex-col h-[650px]">
            {selectedSantri ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col h-full shadow-sm overflow-hidden">
                
                {/* Selected Student Banner Info */}
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-b border-slate-150 dark:border-slate-800 p-5 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-extrabold shadow-md">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-slate-805 dark:text-slate-100 flex items-center space-x-2">
                        <span>{selectedSantri.nama}</span>
                        {selectedSantri.status === 'stagnant' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400">
                            Stagnan!
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-550 dark:text-slate-400 mt-0.5">
                        Grade {selectedSantri.grade} · Kelas {selectedSantri.kelas} · Target: {selectedSantri.targetBaris} baris/hari
                      </p>
                    </div>
                  </div>

                  {/* Tabs Selector */}
                  <div className="flex bg-slate-200/50 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    <button 
                      onClick={() => setActiveTab('setoran')}
                      className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${activeTab === 'setoran' ? 'bg-white dark:bg-slate-750 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-750 dark:hover:text-slate-300'}`}
                    >
                      Input Harian
                    </button>
                    <button 
                      onClick={() => setActiveTab('pekan')}
                      className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${activeTab === 'pekan' ? 'bg-white dark:bg-slate-750 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-750 dark:hover:text-slate-300'}`}
                    >
                      Pekan Muraja&apos;ah
                    </button>
                    <button 
                      onClick={() => setActiveTab('analitik')}
                      className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${activeTab === 'analitik' ? 'bg-white dark:bg-slate-750 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-750 dark:hover:text-slate-300'}`}
                    >
                      Analitik
                    </button>
                    <button 
                      onClick={() => setActiveTab('pesan')}
                      className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${activeTab === 'pesan' ? 'bg-white dark:bg-slate-750 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-750 dark:hover:text-slate-300'}`}
                    >
                      Catatan Wali
                    </button>
                  </div>
                </div>

                {/* Tab Contents */}
                <div className="flex-grow overflow-y-auto p-6">
                  
                  {/* TAB 1: INPUT SETORAN HARIAN */}
                  {activeTab === 'setoran' && (
                    <div className="space-y-6">
                      
                      {/* Manzil Alert / Check */}
                      <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-900/50">
                        <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
                          <span>📊 Pemantauan Manzil (Review Rumah - Kemarin)</span>
                          <span className="text-[10px] text-slate-500">F1.2.1 / F1.2.2</span>
                        </h4>
                        
                        {(() => {
                          const manzil = checkManzilStatus(selectedSantri.id);
                          if (manzil) {
                            return (
                              <div className="flex items-center justify-between text-xs">
                                <div>
                                  <span className="font-semibold text-slate-800 dark:text-slate-200">Surah {manzil.surah} (halaman {manzil.halaman})</span>
                                </div>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${manzil.verified ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/35 dark:text-emerald-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/35 dark:text-amber-400'}`}>
                                  {manzil.verified ? '✓ Terverifikasi Orang Tua' : '⚠ Belum Dikonfirmasi Orang Tua'}
                                </span>
                              </div>
                            );
                          }
                          return (
                            <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 text-xs font-semibold">
                              <AlertCircle className="h-4 w-4" />
                              <span>Peringatan: Laporan Manzil belum diinput oleh Orang Tua. Koordinasikan sebelum santri ujian juz.</span>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Side-by-Side: Sabki (Prerequisite) & Sabak Form */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Sabki Form */}
                        <div className="border border-slate-150 dark:border-slate-850 p-4 rounded-xl relative">
                          <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <span>1. Sabki (Review Kemarin)</span>
                            <span className="text-[9px] text-slate-500 bg-slate-105 dark:bg-slate-800 px-1 rounded">Prasyarat</span>
                          </h4>
                          
                          {sabkiDone ? (
                            <div className="flex flex-col items-center justify-center py-6 text-emerald-600 dark:text-emerald-400 space-y-2">
                              <Check className="h-8 w-8 bg-emerald-500/10 p-1.5 rounded-full" />
                              <span className="text-xs font-bold">Sabki Telah Tuntas Hari Ini</span>
                            </div>
                          ) : (
                            <form onSubmit={handleSaveSabki} className="space-y-3">
                              <div>
                                <label className="text-[10px] font-bold uppercase text-slate-400">Surah Sabki</label>
                                <input 
                                  type="text" 
                                  placeholder="e.g. An-Naba" 
                                  value={sabkiSurah}
                                  onChange={e => setSabkiSurah(e.target.value)}
                                  required
                                  className="w-full text-xs p-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:border-emerald-500" 
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] font-bold uppercase text-slate-400">Halaman</label>
                                  <input 
                                    type="number" 
                                    value={sabkiHalaman}
                                    onChange={e => setSabkiHalaman(Number(e.target.value))}
                                    required
                                    className="w-full text-xs p-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none" 
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold uppercase text-slate-400">Jumlah Kesalahan</label>
                                  <input 
                                    type="number" 
                                    value={sabkiKesalahan}
                                    onChange={e => setSabkiKesalahan(Number(e.target.value))}
                                    className="w-full text-xs p-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none" 
                                  />
                                </div>
                              </div>
                              <button 
                                type="submit"
                                className="w-full bg-slate-800 dark:bg-slate-700 text-white py-1.5 rounded-lg text-xs font-bold hover:bg-slate-750 transition-colors"
                              >
                                Simpan Sabki
                              </button>
                            </form>
                          )}
                        </div>

                        {/* Sabak Form */}
                        <div className="border border-slate-150 dark:border-slate-850 p-4 rounded-xl relative">
                          <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <span>2. Sabak (Setoran Baru)</span>
                            <span className="text-[9px] text-slate-500 bg-slate-105 dark:bg-slate-800 px-1 rounded">Target Harian</span>
                          </h4>

                          <form onSubmit={handleSaveSabak} className="space-y-3">
                            <div>
                              <label className="text-[10px] font-bold uppercase text-slate-400">Surah Baru</label>
                              <input 
                                type="text" 
                                value={sabakSurah}
                                onChange={e => setSabakSurah(e.target.value)}
                                required
                                className="w-full text-xs p-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:border-emerald-500" 
                              />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                  <label className="text-[10px] font-bold uppercase text-slate-400">Hal Mulai</label>
                                  <input 
                                    type="number" 
                                    value={sabakHalMulai}
                                    onChange={e => setSabakHalMulai(Number(e.target.value))}
                                    className="w-full text-xs p-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg" 
                                  />
                              </div>
                              <div>
                                  <label className="text-[10px] font-bold uppercase text-slate-400">Hal Selesai</label>
                                  <input 
                                    type="number" 
                                    value={sabakHalSelesai}
                                    onChange={e => setSabakHalSelesai(Number(e.target.value))}
                                    className="w-full text-xs p-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg" 
                                  />
                              </div>
                              <div>
                                  <label className="text-[10px] font-bold uppercase text-slate-400">Baris Setor</label>
                                  <input 
                                    type="number" 
                                    value={sabakBaris}
                                    onChange={e => setSabakBaris(Number(e.target.value))}
                                    className="w-full text-xs p-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg" 
                                  />
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-bold uppercase text-slate-400">Kesalahan</label>
                                <input 
                                  type="number" 
                                  value={sabakKesalahan}
                                  onChange={e => setSabakKesalahan(Number(e.target.value))}
                                  className="w-full text-xs p-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg" 
                                />
                              </div>
                              <div className="flex flex-col justify-end">
                                <span className={`text-[10px] font-bold p-2 text-center rounded-lg border ${sabakKesalahan <= mistakeThreshold ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30'}`}>
                                  {sabakKesalahan <= mistakeThreshold ? '✓ Lulus Target' : '⚠ Harus Mengulang'}
                                </span>
                              </div>
                            </div>

                            <div>
                              <label className="text-[10px] font-bold uppercase text-slate-400">Catatan Harian</label>
                              <input 
                                type="text" 
                                placeholder="Feedback kualitas bacaan..." 
                                value={sabakNotes}
                                onChange={e => setSabakNotes(e.target.value)}
                                className="w-full text-xs p-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg" 
                              />
                            </div>

                            <button 
                              type="submit"
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 rounded-lg text-xs font-bold transition-colors"
                            >
                              Simpan Setoran Sabak
                            </button>
                          </form>
                        </div>
                      </div>

                      {/* Tikrar Section */}
                      <div className="border border-red-150 dark:border-red-900/40 rounded-xl p-4 bg-red-50/20 dark:bg-red-950/5 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Flame className="h-5 w-5 text-red-500" />
                          <div>
                            <h5 className="font-bold text-xs">Tikrar Log (Pengulangan Sekolah 10x)</h5>
                            <p className="text-[10px] text-slate-500">Bagi santri yang mengulang Sabak pada hari ini.</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm">{tikrarCount} / 10</span>
                          <button
                            onClick={() => {
                              if (tikrarCount < 10) {
                                setTikrarCount(prev => prev + 1);
                                if (tikrarCount + 1 === 10) {
                                  alert('Alhamdulillah! Santri telah menyelesaikan pengulangan Tikrar 10x di sekolah.');
                                }
                              }
                            }}
                            className="bg-red-100 hover:bg-red-200 dark:bg-red-950 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 font-bold text-[10px] px-2.5 py-1 rounded"
                          >
                            + Tambah Tikrar
                          </button>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* TAB 2: PEKAN MURAJAAH */}
                  {activeTab === 'pekan' && (
                    <div className="space-y-6">
                      <div className="bg-slate-50 dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 rounded-xl">
                        <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 mb-2 flex items-center justify-between">
                          <span>🔧 Pengaturan Pekan Muraja&apos;ah</span>
                          <span className="text-xs text-slate-500">Requirement F1.6</span>
                        </h4>
                        <p className="text-xs text-slate-500 mb-4">
                          Ubah target harian secara otomatis berdasarkan total halaman dibagi hari dan tingkat toleransi kesalahan.
                        </p>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold">Aktifkan Pekan Muraja&apos;ah:</span>
                            <input 
                              type="checkbox" 
                              checked={isPekanMurajaah}
                              onChange={e => {
                                setIsPekanMurajaah(e.target.checked);
                                if (e.target.checked) {
                                  alert('Mode Pekan Muraja\'ah diaktifkan. Target setoran diubah mengikuti pembagian hari.');
                                }
                              }}
                              className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-350 rounded" 
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-[10px] font-bold uppercase text-slate-400">Pembagi Hari (Rumus Target)</label>
                              <select 
                                value={targetDivider}
                                onChange={e => setTargetDivider(Number(e.target.value))}
                                disabled={!isPekanMurajaah}
                                className="w-full text-xs p-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none"
                              >
                                <option value={10}>10 Hari</option>
                                <option value={15}>15 Hari</option>
                                <option value={20}>20 Hari</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold uppercase text-slate-400">Batas Kesalahan Ujian (Threshold)</label>
                              <select 
                                value={mistakeThreshold}
                                onChange={e => setMistakeThreshold(Number(e.target.value))}
                                className="w-full text-xs p-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none"
                              >
                                <option value={1}>Maks 1 kesalahan / hal (Standar)</option>
                                <option value={2}>Maks 2 kesalahan / hal (Fleksibel)</option>
                                <option value={3}>Maks 3 kesalahan / hal (Kelonggaran)</option>
                              </select>
                            </div>
                          </div>

                          {isPekanMurajaah && (
                            <div className="p-3 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-semibold">
                              Simulasi target Pekan Muraja&apos;ah untuk {selectedSantri.nama}: {Math.ceil(300 / targetDivider)} baris / hari (Batas kesalahan ujian: {mistakeThreshold} kesalahan).
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: ANALITIK PERKEMBANGAN INDIVIDU */}
                  {activeTab === 'analitik' && (
                    <div className="space-y-6">
                      <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 p-4 rounded-xl shadow-sm">
                        <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300 mb-3 flex items-center justify-between">
                          <span>📈 Grafik Tren Baris Setoran (Sabak Lulus)</span>
                          <span className="text-[9px] text-slate-500">Requirement F1.5.1</span>
                        </h4>
                        
                        {getChartData(selectedSantri.id).length > 0 ? (
                          <div className="h-[220px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={getChartData(selectedSantri.id)}>
                                <defs>
                                  <linearGradient id="colorBaris" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="tanggal" />
                                <YAxis />
                                <Tooltip />
                                <Area type="monotone" dataKey="baris" name="Baris Setoran" stroke="#10b981" fillOpacity={1} fill="url(#colorBaris)" />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <div className="h-[220px] flex items-center justify-center text-xs text-slate-400">
                            Belum ada riwayat setoran lulus dalam beberapa hari terakhir.
                          </div>
                        )}
                      </div>

                      {/* Stagnancy Alert Check */}
                      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between">
                        <div>
                          <h5 className="font-bold text-xs flex items-center space-x-1.5">
                            <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            <span>Indikator Stagnasi</span>
                          </h5>
                          <p className="text-[10px] text-slate-550 dark:text-slate-450 mt-1">
                            {selectedSantri.status === 'stagnant' 
                              ? `Santri terdeteksi stagnant (Alasan: ${selectedSantri.stagnancyReason}). Catatan intervensi telah dikirim ke Koordinator.`
                              : 'Santri menunjukkan perkembangan normal dan aktif.'}
                          </p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${selectedSantri.status === 'stagnant' ? 'bg-red-100 text-red-800 dark:bg-red-950/30' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30'}`}>
                          {selectedSantri.status === 'stagnant' ? '⚠ Stuck' : '✓ Aman'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: HUBUNGAN DUA ARAH (CHAT/PESAN WALI) */}
                  {activeTab === 'pesan' && (
                    <div className="flex flex-col h-[380px]">
                      
                      {/* Chat History */}
                      <div className="flex-grow overflow-y-auto border border-slate-150 dark:border-slate-800 rounded-xl p-4 space-y-3 bg-slate-50/50 dark:bg-slate-900/50 mb-3">
                        {pesans.filter(p => p.santriId === selectedSantri.id).length > 0 ? (
                          pesans
                            .filter(p => p.santriId === selectedSantri.id)
                            .map(p => {
                              const isMe = p.sender === 'pengampu';
                              return (
                                <div key={p.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                  <div className={`max-w-[75%] rounded-2xl p-3 text-xs shadow-sm ${isMe ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-tl-none'}`}>
                                    <p className="font-semibold text-[9px] opacity-75 uppercase mb-1">{isMe ? 'Anda' : 'Orang Tua'}</p>
                                    <p className="leading-relaxed">{p.content}</p>
                                    <span className="text-[8px] opacity-50 block text-right mt-1">
                                      {p.timestamp.slice(11, 16)}
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                        ) : (
                          <div className="h-full flex items-center justify-center text-xs text-slate-400">
                            Belum ada pesan terkirim. Kirim pesan pertama untuk memulai komunikasi dengan Orang Tua.
                          </div>
                        )}
                      </div>

                      {/* Chat Form */}
                      <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                        <input 
                          type="text" 
                          placeholder="Ketik catatan atau saran perbaikan untuk orang tua..." 
                          value={chatInput}
                          onChange={e => setChatInput(e.target.value)}
                          className="flex-grow text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:border-emerald-500" 
                        />
                        <button 
                          type="submit"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-lg transition-colors"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      </form>

                    </div>
                  )}

                </div>

              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center h-full shadow-sm">
                <BookOpen className="h-12 w-12 text-slate-350 mb-3" />
                <h4 className="font-bold text-slate-700 dark:text-slate-205">Silakan pilih santri</h4>
                <p className="text-xs text-slate-450 dark:text-slate-400 mt-1 max-w-sm leading-relaxed">
                  Pilih salah satu profil santri dari kelompok halaqah sebelah kiri untuk mulai melakukan pencatatan setoran, memantau manzil, atau mengirim pesan ke orang tua.
                </p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
