'use client';

import React, { useEffect, useState, useCallback } from 'react';
import RoleHeader from '@/components/RoleHeader';
import { 
  getSantriList, 
  getSetoranList, 
  getPesanList,
  addSetoran, 
  addPesan 
} from '@/lib/store';
import { Santri, Setoran, Pesan } from '@/lib/mockData';
import { 
  User, 
  AlertCircle, 
  Send, 
  Smartphone,
  Calendar,
  PenTool,
  FileCheck2,
  Sparkles
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

export default function OrangTuaDashboard() {
  const [mounted, setMounted] = useState(false);
  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [selectedSantriId, setSelectedSantriId] = useState<string>('');
  
  // Child specific state
  const [setorans, setSetorans] = useState<Setoran[]>([]);
  const [pesans, setPesans] = useState<Pesan[]>([]);
  
  // Manzil Form State
  const [manzilSurah, setManzilSurah] = useState<string>('Juz 30');
  const [manzilHalMulai, setManzilHalMulai] = useState<number>(582);
  const [manzilHalSelesai, setManzilHalSelesai] = useState<number>(583);
  const [manzilAktualHalaman, setManzilAktualHalaman] = useState<number>(2);
  const [signatureDone, setSignatureDone] = useState<boolean>(false);
  const [signatureName, setSignatureName] = useState<string>('');
  const [canvasDrawing, setCanvasDrawing] = useState<boolean>(false);
  const [drawnLines, setDrawnLines] = useState<string[]>([]);

  // Reply Form
  const [replyInput, setReplyInput] = useState<string>('');

  const loadData = useCallback(() => {
    const s = getSantriList();
    setSantriList(s);
    if (s.length > 0 && !selectedSantriId) {
      setSelectedSantriId(s[0].id); // default first student
    }

    const seto = getSetoranList();
    setSetorans(seto);

    const p = getPesanList();
    setPesans(p);
  }, [selectedSantriId]);

  useEffect(() => {
    setMounted(true);
    loadData();

    // Storage listener
    const handleUpdate = () => loadData();
    window.addEventListener('tahfiz_storage_update', handleUpdate);
    return () => window.removeEventListener('tahfiz_storage_update', handleUpdate);
  }, [loadData]);

  const activeSantri = santriList.find(s => s.id === selectedSantriId);

  // Filter child specific data
  const childSetorans = setorans.filter(s => s.santriId === selectedSantriId);
  const childPesans = pesans.filter(p => p.santriId === selectedSantriId);

  // Today's school results
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySchoolSetorans = childSetorans.filter(s => s.date === todayStr && s.type !== 'manzil');

  // Handle Manzil Confirmation
  const handleSaveManzil = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSantri) return;

    if (!signatureDone && !signatureName.trim() && drawnLines.length === 0) {
      alert('Silakan lakukan tanda tangan atau ketik nama Anda sebagai validasi.');
      return;
    }

    addSetoran({
      santriId: activeSantri.id,
      date: new Date().toISOString().split('T')[0], // Today's review
      type: 'manzil',
      surah: manzilSurah,
      halamanMulai: manzilHalMulai,
      halamanSelesai: manzilHalSelesai,
      baris: manzilAktualHalaman * 15, // approx lines
      kesalahan: 0, // parents don't mark errors, just verify attendance
      status: 'lulus',
      parentVerified: true,
      notes: `Divalidasi oleh Orang Tua (${signatureName || activeSantri.parentName})`
    });

    alert('Laporan Manzil berhasil dikirim ke Pengampu. Jazakumullahu khairan.');
    setSignatureDone(true);
    loadData();
  };

  // Reply message
  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSantri || !replyInput.trim()) return;

    addPesan(activeSantri.id, 'orangtua', replyInput.trim());
    setReplyInput('');
    loadData();
  };

  // Prepare chart data for parent dashboard
  const getWeeklyStats = () => {
    // Group passed school setoran lines by day
    const last7Days = Array.from({ length: 5 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map(dateStr => {
      const daySetorans = childSetorans.filter(s => s.date === dateStr && s.type === 'sabak' && s.status === 'lulus');
      const totalLines = daySetorans.reduce((sum, s) => sum + s.baris, 0);
      return {
        hari: new Date(dateStr).toLocaleDateString('id-ID', { weekday: 'short' }),
        baris: totalLines || 0
      };
    });
  };

  // Draw signature pad simulator
  const handleDrawStart = () => setCanvasDrawing(true);
  const handleDraw = () => {
    if (!canvasDrawing) return;
    setDrawnLines(prev => [...prev, 'line']);
  };
  const handleDrawEnd = () => {
    setCanvasDrawing(false);
    setSignatureDone(true);
  };
  const clearSignature = () => {
    setDrawnLines([]);
    setSignatureName('');
    setSignatureDone(false);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
      <RoleHeader roleName="Orang Tua / Wali Santri" activeRole="orangtua" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Child Selector portal simulation */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl mb-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <Smartphone className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            <span className="font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-300">Pilih Akun Orang Tua (Wali dari):</span>
            <select
              value={selectedSantriId}
              onChange={e => {
                setSelectedSantriId(e.target.value);
                setSignatureDone(false);
                clearSignature();
              }}
              className="text-xs p-1.5 border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none"
            >
              {santriList.map(s => (
                <option key={s.id} value={s.id}>
                  {s.parentName} (Orang Tua {s.nama})
                </option>
              ))}
            </select>
          </div>
          <span className="text-[10px] text-slate-450 font-medium hidden sm:inline">📱 Tampilan Mobile-Responsive</span>
        </div>

        {activeSantri ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Stats & Chat */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Today's School Results */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                <h3 className="font-extrabold text-sm text-slate-805 dark:text-slate-100 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                  <span>🏫 Laporan Setoran Sekolah Hari Ini</span>
                  <span className="text-[10px] text-slate-450 font-medium">F2.2</span>
                </h3>

                {todaySchoolSetorans.length > 0 ? (
                  <div className="space-y-4">
                    {todaySchoolSetorans.map(setoran => (
                      <div 
                        key={setoran.id} 
                        className={`p-4 border rounded-xl flex items-start justify-between ${setoran.status === 'lulus' ? 'bg-emerald-500/5 border-emerald-100 dark:border-emerald-900/30' : 'bg-red-500/5 border-red-100 dark:border-red-900/30'}`}
                      >
                        <div className="space-y-1">
                          <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded ${setoran.type === 'sabak' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40' : 'bg-blue-100 text-blue-800 dark:bg-blue-950/40'}`}>
                            {setoran.type === 'sabak' ? 'Sabak (Baru)' : 'Sabki (Kemarin)'}
                          </span>
                          <h4 className="font-extrabold text-sm mt-1.5 text-slate-900 dark:text-slate-100">
                            Surah {setoran.surah} (Halaman {setoran.halamanMulai})
                          </h4>
                          <p className="text-xs text-slate-500">
                            Jumlah: {setoran.baris} baris · Kesalahan: {setoran.kesalahan} kali
                          </p>
                          {setoran.notes && (
                            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 italic">
                              &ldquo;{setoran.notes}&rdquo;
                            </p>
                          )}
                        </div>

                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${setoran.status === 'lulus' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50' : 'bg-red-100 text-red-800 dark:bg-red-950/50'}`}>
                          {setoran.status === 'lulus' ? 'Lulus Target' : 'Mengulang'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-slate-450 dark:text-slate-500 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-150 dark:border-slate-800">
                    <Calendar className="h-8 w-8 mx-auto text-slate-350 mb-2" />
                    Belum ada setoran sekolah yang direkam oleh Ustadz hari ini. Sesi tahfiz berlangsung pukul 07:00 - 09:00 WIB.
                  </div>
                )}
              </div>

              {/* History & Analytics */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                <h3 className="font-extrabold text-sm text-slate-805 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex items-center justify-between">
                  <span>📊 Tren Baris Sabak Anak (5 Hari Terakhir)</span>
                  <span className="text-[10px] text-slate-450 font-medium">F2.3.1</span>
                </h3>

                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getWeeklyStats()}>
                      <XAxis dataKey="hari" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <Tooltip />
                      <Bar dataKey="baris" name="Baris Hafalan" fill="#0d9488" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                  <span>Juz yang sudah dikuasai:</span>
                  <div className="flex items-center space-x-1">
                    {activeSantri.totalHafalanJuz.length > 0 ? (
                      activeSantri.totalHafalanJuz.map(j => (
                        <span key={j} className="inline-flex items-center px-2 py-0.5 rounded bg-teal-500/10 text-teal-700 dark:text-teal-400 font-bold border border-teal-200 dark:border-teal-800/50">
                          Juz {j}
                        </span>
                      ))
                    ) : (
                      <span>Belum ada juz tuntas (UKJ)</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Communication Chat */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col h-[320px]">
                <h3 className="font-extrabold text-sm text-slate-805 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex items-center justify-between">
                  <span>💬 Komunikasi Dua Arah dengan Ustadz</span>
                  <span className="text-[10px] text-slate-450 font-medium">F2.4</span>
                </h3>

                <div className="flex-grow overflow-y-auto space-y-3 p-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-150 dark:border-slate-800 mb-3 text-xs">
                  {childPesans.length > 0 ? (
                    childPesans.map(p => {
                      const isTeacher = p.sender === 'pengampu';
                      return (
                        <div key={p.id} className={`flex ${isTeacher ? 'justify-start' : 'justify-end'}`}>
                          <div className={`max-w-[80%] rounded-xl p-3 shadow-sm ${isTeacher ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-tl-none' : 'bg-teal-600 text-white rounded-tr-none'}`}>
                            <p className="font-semibold text-[8px] opacity-75 uppercase mb-1">{isTeacher ? 'Ustadz' : 'Anda'}</p>
                            <p className="leading-relaxed">{p.content}</p>
                            <span className="text-[7px] opacity-50 block text-right mt-1">
                              {p.timestamp.slice(11, 16)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-450 dark:text-slate-500">
                      Belum ada obrolan terkirim. Kirim pesan ke ustadz jika anak memiliki kendala murajaah di rumah.
                    </div>
                  )}
                </div>

                <form onSubmit={handleSendReply} className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Laporkan kendala belajar anak di rumah..."
                    value={replyInput}
                    onChange={e => setReplyInput(e.target.value)}
                    className="flex-grow text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:border-teal-500"
                  />
                  <button
                    type="submit"
                    className="bg-teal-600 hover:bg-teal-700 text-white p-2.5 rounded-lg transition-colors"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>

            </div>

            {/* Right Column: Manzil Form & Validation */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Manzil Verification Form */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden">
                
                {/* Decorative background */}
                <div className="absolute -top-10 -right-10 w-28 h-28 bg-teal-500/10 rounded-full blur-xl pointer-events-none" />

                <h3 className="font-extrabold text-sm text-slate-805 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex items-center justify-between">
                  <span>✍ Validasi Manzil (Murojaah Rumah)</span>
                  <span className="text-[10px] text-slate-450 font-medium">F2.1 / F2.5.2</span>
                </h3>

                <p className="text-xs text-slate-550 dark:text-slate-400 mb-4 leading-relaxed">
                  Berdasarkan urutan hafalan, target murajaah mandiri anak hari ini adalah **2.5 Lembar (Juz {activeSantri.currentJuz})**. Tolong simak hafalan anak dan beri konfirmasi digital.
                </p>

                <form onSubmit={handleSaveManzil} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400">Surah Murojaah</label>
                    <input
                      type="text"
                      value={manzilSurah}
                      onChange={e => setManzilSurah(e.target.value)}
                      required
                      className="w-full text-xs p-2 border border-slate-250 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400">Halaman Mulai</label>
                      <input
                        type="number"
                        value={manzilHalMulai}
                        onChange={e => setManzilHalMulai(Number(e.target.value))}
                        className="w-full text-xs p-2 border border-slate-250 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400">Halaman Selesai</label>
                      <input
                        type="number"
                        value={manzilHalSelesai}
                        onChange={e => setManzilHalSelesai(Number(e.target.value))}
                        className="w-full text-xs p-2 border border-slate-250 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400">Aktual Halaman</label>
                      <input
                        type="number"
                        value={manzilAktualHalaman}
                        onChange={e => setManzilAktualHalaman(Number(e.target.value))}
                        className="w-full text-xs p-2 border border-slate-250 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Digital Signature Pad Simulator */}
                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-900/50">
                    <label className="text-[10px] font-bold uppercase text-slate-400 flex justify-between items-center mb-2">
                      <span>Tanda Tangan Digital Orang Tua (Simulasi Canvas)</span>
                      <button 
                        type="button" 
                        onClick={clearSignature}
                        className="text-[9px] text-teal-600 dark:text-teal-400 hover:underline"
                      >
                        Bersihkan
                      </button>
                    </label>

                    <div
                      onMouseDown={handleDrawStart}
                      onMouseMove={handleDraw}
                      onMouseUp={handleDrawEnd}
                      onMouseLeave={handleDrawEnd}
                      onTouchStart={handleDrawStart}
                      onTouchMove={handleDraw}
                      onTouchEnd={handleDrawEnd}
                      className="border border-dashed border-slate-350 dark:border-slate-700 h-[100px] bg-white dark:bg-slate-900 rounded-lg flex items-center justify-center cursor-crosshair overflow-hidden relative"
                    >
                      {drawnLines.length > 0 ? (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="text-[10px] font-semibold text-teal-600 bg-teal-50 dark:bg-teal-950/60 border border-teal-150 px-2 py-0.5 rounded shadow">
                            ✓ Tanda Tangan Terekam
                          </span>
                          {/* Signature line placeholder simulation */}
                          <div className="absolute h-1 w-2/3 border-b-2 border-slate-800 dark:border-slate-400 rotate-3 opacity-30" />
                          <div className="absolute h-1 w-1/2 border-b-2 border-slate-800 dark:border-slate-400 -rotate-3 opacity-20" />
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 flex items-center">
                          <PenTool className="h-3 w-3 mr-1" />
                          Gunakan Mouse/Sentuhan untuk Menandatangani
                        </span>
                      )}
                    </div>

                    <div className="mt-2">
                      <input
                        type="text"
                        placeholder="Atau ketik nama lengkap Anda..."
                        value={signatureName}
                        onChange={e => {
                          setSignatureName(e.target.value);
                          setSignatureDone(e.target.value.trim().length > 0);
                        }}
                        className="w-full text-xs p-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center space-x-1"
                  >
                    <FileCheck2 className="h-4 w-4" />
                    <span>Kirim Konfirmasi Manzil</span>
                  </button>

                </form>
              </div>

              {/* Tikrar / Exam Notifications */}
              {activeSantri.status === 'stagnant' && (
                <div className="bg-red-500/10 border border-red-200 dark:border-red-900/40 p-4 rounded-2xl flex items-start space-x-3 text-red-750 dark:text-red-350">
                  <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-bold text-xs">Pemberitahuan Stagnasi</h4>
                    <p className="text-[10px] leading-relaxed mt-1">
                      Ustadz mencatat adanya hambatan perkembangan hafalan (stuck) pada Zaid. Koordinator Tahfiz saat ini sedang memantau dan mengambil langkah intervensi ({activeSantri.stagnancyAction || 'Konseling'}). Mohon dampingi murojaah di rumah.
                    </p>
                  </div>
                </div>
              )}

              {/* Celebration of target */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 border border-indigo-150 dark:border-indigo-900/30 p-4 rounded-2xl flex items-center justify-between text-indigo-900 dark:text-indigo-300">
                <div className="flex items-center space-x-3">
                  <Sparkles className="h-5 w-5 text-indigo-500" />
                  <div>
                    <h5 className="font-bold text-xs">Persiapan Ujian Kenaikan Juz</h5>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Jika juz tuntas, infokan ke Ustadz untuk dijadwalkan UKJ.</p>
                  </div>
                </div>
                <button 
                  onClick={() => alert('Notifikasi kesiapan dikirim ke Ustadz!')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg transition-colors shadow-sm"
                >
                  Ajukan Ujian
                </button>
              </div>

            </div>

          </div>
        ) : (
          <div className="text-center py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm">
            <User className="h-12 w-12 text-slate-350 mx-auto mb-2" />
            <p className="font-bold text-slate-705">Silakan pilih akun Orang Tua.</p>
          </div>
        )}

      </div>
    </div>
  );
}
