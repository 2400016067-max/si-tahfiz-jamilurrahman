'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import RoleHeader from '@/components/RoleHeader';
import PengumumanPopup from '@/components/PengumumanPopup';
import { supabase } from '@/lib/supabase';
import { Santri, Setoran, Pesan } from '@/lib/mockData';
import { 
  User, 
  AlertCircle, 
  Send, 
  Smartphone,
  Calendar,
  FileCheck2,
  Sparkles,
  Flame,
  Home,
  Award,
  TrendingUp,
  MessageSquare,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

interface TikrarTask {
  id: string;
  santri_id: string;
  tanggal: string;
  surah: string;
  halaman: number;
  jumlah_ulang: number;
  status: string;
  lokasi: string;
  selesai: boolean;
  parent_verified: boolean;
  dicatat_oleh: string;
  updated_at?: string;
}

export default function OrangTuaDashboard() {
  const [mounted, setMounted] = useState(false);
  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [selectedSantriId, setSelectedSantriId] = useState<string>('');

  // Child specific state
  const [setorans, setSetorans] = useState<Setoran[]>([]);
  const [pesans, setPesans] = useState<Pesan[]>([]);
  const [tikrars, setTikrars] = useState<TikrarTask[]>([]);

  // Navigation states
  const [activeMenu, setActiveMenu] = useState<'beranda' | 'manzil' | 'tikrar' | 'perkembangan' | 'pesan'>('beranda');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  // Loading & error state
  const [isLoading, setIsLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [namaLengkap, setNamaLengkap] = useState<string>('');

  // Maps santri_id → parent_user_id (dari DB).
  // Diperlukan karena pesan.pengirim_id NOT NULL dan harus berisi UUID user nyata.
  const [parentUserIdMap, setParentUserIdMap] = useState<Record<string, string>>({});

  // Manzil Form State
  const [manzilSurah, setManzilSurah] = useState<string>('Juz 30');
  const [manzilHalMulai, setManzilHalMulai] = useState<number>(582);
  const [manzilHalSelesai, setManzilHalSelesai] = useState<number>(583);
  const [manzilAktualHalaman, setManzilAktualHalaman] = useState<number>(2);
  const [signatureDone, setSignatureDone] = useState<boolean>(false);
  const [signatureName, setSignatureName] = useState<string>('');
  const [canvasSigned, setCanvasSigned] = useState<boolean>(false);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Reply Form
  const [replyInput, setReplyInput] = useState<string>('');

  const activeSantri = santriList.find(s => s.id === selectedSantriId);
  const todayStr = new Date().toISOString().split('T')[0];
  const todayManzil = activeSantri ? setorans.find(
    s => s.santriId === activeSantri.id && s.type === 'manzil' && s.date === todayStr
  ) : null;
  const isManzilConfirmedToday = !!todayManzil;

  // Initialize vanilla canvas drawing event listeners (client-only to avoid SSR issues)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || isManzilConfirmedToday) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Adjust canvas resolution/coordinate system to match styling bounds
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width || 400;
    canvas.height = rect.height || 120;

    // Drawing configuration
    ctx.strokeStyle = '#0d9488'; // teal-600 to look premium
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    const getPos = (e: MouseEvent | TouchEvent) => {
      const r = canvas.getBoundingClientRect();
      let clientX, clientY;
      if ('touches' in e) {
        if (e.touches.length === 0) return null;
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      return {
        x: clientX - r.left,
        y: clientY - r.top
      };
    };

    const startDrawing = (e: MouseEvent | TouchEvent) => {
      const pos = getPos(e);
      if (!pos) return;
      isDrawing = true;
      lastX = pos.x;
      lastY = pos.y;
      
      // Draw a small point on starting click/tap
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();

      setCanvasSigned(true);
      setSignatureDone(true);
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing) return;
      
      // Prevent scrolling on mobile touch screens when drawing
      if (e.cancelable) {
        e.preventDefault();
      }

      const pos = getPos(e);
      if (!pos) return;

      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();

      lastX = pos.x;
      lastY = pos.y;
    };

    const stopDrawing = () => {
      isDrawing = false;
    };

    // Attach listeners
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);

    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);
    canvas.addEventListener('touchcancel', stopDrawing);

    return () => {
      // Cleanup listeners
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseleave', stopDrawing);

      canvas.removeEventListener('touchstart', startDrawing);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDrawing);
      canvas.removeEventListener('touchcancel', stopDrawing);
    };
  }, [mounted, activeMenu, isManzilConfirmedToday]);

  // ---------------------------------------------------------------------------
  // DATA LOADING — Supabase queries
  // ---------------------------------------------------------------------------
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setSaveError(null);

    try {
      // Ambil sesi aktif dari Supabase client (tersimpan di localStorage setelah login).
      // Lebih aman daripada mem-parsing cookie secara manual yang rawan edge-case.
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) throw new Error('Sesi tidak valid. Silakan login kembali.');

      const email = session.user.email;

      // Query tabel users untuk dapat UUID dan nama lengkap
      const { data: dbUser, error: dbUserError } = await supabase
        .from('users')
        .select('id, nama_lengkap')
        .eq('email', email)
        .single();

      if (dbUserError || !dbUser) throw new Error('Detail pengguna tidak ditemukan di database.');
      setNamaLengkap(dbUser.nama_lengkap ?? '');

      // 1. Fetch semua juz hafalan santri (untuk totalHafalanJuz)
      const { data: hafalanData, error: hafalanError } = await supabase
        .from('hafalan_juz')
        .select('santri_id, juz');

      if (hafalanError) throw new Error('Gagal memuat hafalan_juz: ' + hafalanError.message);

      // Bangun map: santri_id → number[]
      const hafalanMap: Record<string, number[]> = {};
      (hafalanData ?? []).forEach((h: { santri_id: string; juz: number }) => {
        if (!hafalanMap[h.santri_id]) hafalanMap[h.santri_id] = [];
        hafalanMap[h.santri_id].push(h.juz);
      });

      // 2. Fetch santri - filter by parent_user_id yang sesuai dengan UUID orang tua
      const { data: santriData, error: santriError } = await supabase
        .from('santri')
        .select('*')
        .eq('parent_user_id', dbUser.id);

      if (santriError) throw new Error('Gagal memuat santri: ' + santriError.message);

      if (santriData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped: Santri[] = (santriData as any[]).map((s) => ({
          id: s.id,
          nama: s.nama,
          kelas: s.kelas,
          grade: s.grade as 'Tahsin' | 'Takmil' | 'Tahfiz',
          targetBaris: s.target_baris,
          halaqahId: s.halaqah_id,
          status: s.status as 'active' | 'stagnant',
          stagnancyReason: s.stagnancy_reason ?? undefined,
          stagnancyDetail: s.stagnancy_detail ?? undefined,
          stagnancyAction: s.stagnancy_action ?? undefined,
          parentName: s.parent_name,
          parentPhone: s.parent_phone,
          currentJuz: s.current_juz,
          totalHafalanJuz: hafalanMap[s.id] ?? [],
        }));
        setSantriList(mapped);

        // Simpan map santri_id → parent_user_id untuk keperluan insert pesan
        const pidMap: Record<string, string> = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (santriData as any[]).forEach((s) => {
          if (s.parent_user_id) pidMap[s.id] = s.parent_user_id;
        });
        setParentUserIdMap(pidMap);

        // Set default santri yang dipilih
        if (mapped.length > 0 && !selectedSantriId) {
          setSelectedSantriId(mapped[0].id);
        }
      }

      // 3. Fetch setoran — 30 hari terakhir
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const fromDate = thirtyDaysAgo.toISOString().split('T')[0];

      const { data: setoranData, error: setoranError } = await supabase
        .from('setoran')
        .select('*')
        .gte('tanggal', fromDate)
        .order('tanggal', { ascending: false });

      if (setoranError) throw new Error('Gagal memuat setoran: ' + setoranError.message);

      if (setoranData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mappedSetoran: Setoran[] = (setoranData as any[]).map((s) => ({
          id: s.id,
          santriId: s.santri_id,
          date: s.tanggal,
          type: s.tipe as 'sabak' | 'sabki' | 'manzil',
          surah: s.surah,
          halamanMulai: s.halaman_mulai,
          halamanSelesai: s.halaman_selesai,
          baris: s.jumlah_baris,
          kesalahan: s.jumlah_kesalahan,
          status: s.status as 'lulus' | 'mengulang',
          parentVerified: s.parent_verified,
          notes: s.catatan ?? undefined,
          parentSignature: s.parent_signature ?? undefined,
          halamanAktual: s.halaman_aktual ?? undefined,
        }));
        setSetorans(mappedSetoran);
      }

      // 4. Fetch pesan
      const { data: pesanData, error: pesanError } = await supabase
        .from('pesan')
        .select('*')
        .order('created_at', { ascending: true });

      if (pesanError) throw new Error('Gagal memuat pesan: ' + pesanError.message);

      if (pesanData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mappedPesan: Pesan[] = (pesanData as any[]).map((p) => ({
          id: p.id,
          santriId: p.santri_id,
          sender: p.tipe_pengirim as 'pengampu' | 'orangtua',
          content: p.konten,
          timestamp: p.created_at,
          sudahDibaca: p.sudah_dibaca,
        }));
        setPesans(mappedPesan);
      }

      // 5. Fetch tikrar
      let activeId = selectedSantriId;
      if (!activeId && santriData && santriData.length > 0) {
        activeId = santriData[0].id;
      }

      if (activeId) {
        const { data: tikrarData, error: tikrarError } = await supabase
          .from('tikrar')
          .select('*')
          .eq('santri_id', activeId)
          .order('tanggal', { ascending: false });

        if (tikrarError) throw new Error('Gagal memuat data tikrar: ' + tikrarError.message);
        if (tikrarData) {
          setTikrars(tikrarData);
        }
      } else {
        setTikrars([]);
      }

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan tidak diketahui.';
      console.error('[OrangTuaDashboard] loadData error:', err);
      setSaveError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSantriId]);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, [loadData]);

  // Real-time listener for teacher setoran inputs
  useEffect(() => {
    if (santriList.length === 0) return;

    const childIds = santriList.map(s => s.id);

    const channel = supabase
      .channel('orangtua-setoran-notif')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'setoran',
        },
        (payload) => {
          const newSetoran = payload.new;
          if (
            (newSetoran.tipe === 'sabak' || newSetoran.tipe === 'sabki') &&
            childIds.includes(newSetoran.santri_id)
          ) {
            const student = santriList.find(s => s.id === newSetoran.santri_id);
            if (student) {
              toast.info(`Ustadz menginput setoran baru untuk ${student.nama}: Surah ${newSetoran.surah}`, {
                style: { backgroundColor: '#ebf8ff', border: '1px solid #3182ce', color: '#2b6cb0' }
              });
              loadData();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [santriList, loadData]);

  // Real-time listener for Tikrar updates from teacher
  useEffect(() => {
    if (santriList.length === 0) return;

    const childIds = santriList.map(s => s.id);

    const channel = supabase
      .channel('orangtua-tikrar-notif')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all database operations (INSERT, UPDATE)
          schema: 'public',
          table: 'tikrar',
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const tikrarRecord = payload.new as TikrarTask;
            if (
              tikrarRecord &&
              tikrarRecord.status === 'wajib_rumah' &&
              childIds.includes(tikrarRecord.santri_id)
            ) {
              const student = santriList.find(s => s.id === tikrarRecord.santri_id);
              if (student) {
                toast.error(`Perhatian: Ustadz mewajibkan Tikrar Mandiri di Rumah (${tikrarRecord.jumlah_ulang}x) untuk ${student.nama}: Surah ${tikrarRecord.surah} (Halaman ${tikrarRecord.halaman})`, {
                  style: { backgroundColor: '#fff5f5', border: '1px solid #e53e3e', color: '#c53030' },
                  duration: 6000
                });
              }
            }
          }
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [santriList, loadData]);

  // Filter child specific data
  const childSetorans = setorans.filter(s => s.santriId === selectedSantriId);
  const childPesans = pesans.filter(p => p.santriId === selectedSantriId);

  // ---------------------------------------------------------------------------
  // KONFIRMASI MANZIL — INSERT ke tabel setoran, parent_verified = true
  // ---------------------------------------------------------------------------
  const handleSaveManzil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSantri) return;

    let signatureBase64 = null;
    const canvas = canvasRef.current;
    if (canvas && canvasSigned) {
      signatureBase64 = canvas.toDataURL('image/png');
    }

    if (!signatureBase64 && !signatureName.trim()) {
      toast.error('Silakan lakukan tanda tangan atau ketik nama Anda sebagai validasi.');
      return;
    }

    setSaveError(null);

    // Ambil parent_user_id untuk kolom parent_verified_by
    const parentUserId = parentUserIdMap[activeSantri.id] ?? null;

    const { error } = await supabase.from('setoran').insert({
      santri_id:          activeSantri.id,
      tanggal:            new Date().toISOString().split('T')[0],
      tipe:               'manzil',
      surah:              manzilSurah,
      halaman_mulai:      manzilHalMulai,
      halaman_selesai:    manzilHalSelesai,
      jumlah_baris:       manzilAktualHalaman * 15,
      jumlah_kesalahan:   0,
      status:             'lulus',
      parent_verified:    true,
      parent_verified_by: parentUserId,
      parent_verified_at: new Date().toISOString(),
      halaman_aktual:     manzilAktualHalaman,
      catatan:            `Divalidasi oleh Orang Tua (${signatureName || activeSantri.parentName})`,
      parent_signature:   signatureBase64,
    });

    if (error) {
      setSaveError('Gagal menyimpan konfirmasi Manzil: ' + error.message);
      toast.error('Gagal menyimpan konfirmasi Manzil: ' + error.message);
      return;
    }

    toast.success('Laporan Manzil berhasil dikirim ke Pengampu. Jazakumullahu khairan.');
    setSignatureDone(true);
    await loadData();
  };

  // ---------------------------------------------------------------------------
  // KIRIM PESAN — INSERT ke tabel pesan sebagai orangtua
  // ---------------------------------------------------------------------------
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSantri || !replyInput.trim()) return;

    setSaveError(null);

    // pengirim_id harus berisi UUID user valid (NOT NULL di schema)
    const parentUserId = parentUserIdMap[activeSantri.id];
    if (!parentUserId) {
      setSaveError('Tidak dapat mengirim pesan: akun orang tua tidak ditemukan di database.');
      return;
    }

    const { error } = await supabase.from('pesan').insert({
      santri_id:     activeSantri.id,
      pengirim_id:   parentUserId,
      tipe_pengirim: 'orangtua',
      konten:        replyInput.trim(),
    });

    if (error) {
      setSaveError('Gagal mengirim pesan: ' + error.message);
      toast.error('Gagal mengirim pesan: ' + error.message);
      return;
    }

    toast.success('Pesan berhasil dikirim.');
    setReplyInput('');
    await loadData();
  };

  const handleConfirmTikrar = async (tikrarId: string) => {
    setSaveError(null);
    const { error } = await supabase
      .from('tikrar')
      .update({
        status: 'selesai_rumah',
        selesai: true,
        parent_verified: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', tikrarId);

    if (error) {
      setSaveError('Gagal mengonfirmasi Tikrar: ' + error.message);
      toast.error('Gagal mengonfirmasi Tikrar: ' + error.message);
      return;
    }

    toast.success('Alhamdulillah! Konfirmasi Tikrar Rumah berhasil dikirim ke Pengampu.');
    await loadData();
  };

  // Prepare chart data for parent dashboard
  const getWeeklyStats = () => {
    const last5Days = Array.from({ length: 5 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    return last5Days.map(dateStr => {
      const daySetorans = childSetorans.filter(s => s.date === dateStr && s.type === 'sabak' && s.status === 'lulus');
      const totalLines = daySetorans.reduce((sum, s) => sum + s.baris, 0);
      return {
        hari: new Date(dateStr).toLocaleDateString('id-ID', { weekday: 'short' }),
        baris: totalLines || 0
      };
    });
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    setSignatureName('');
    setSignatureDone(false);
    setCanvasSigned(false);
  };

  // ---------------------------------------------------------------------------
  // 5 MENU PANELS FOR PARENTS
  // ---------------------------------------------------------------------------
  const renderBerandaPanel = () => {
    if (!activeSantri) return null;

    const todaySchoolSetorans = childSetorans.filter(s => s.date === todayStr && s.type !== 'manzil');
    const activeHomeTikrars = tikrars.filter(t => t.santri_id === activeSantri.id && t.status === 'wajib_rumah');

    return (
      <div className="space-y-6">
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
                    <h4 className="font-extrabold text-sm mt-1.5 text-slate-900 dark:text-slate-105">
                      Surah {setoran.surah} (Halaman {setoran.halamanMulai})
                    </h4>
                    <p className="text-xs text-slate-500">
                      Jumlah: {setoran.baris} baris · Kesalahan: {setoran.kesalahan} kali
                    </p>
                    {setoran.notes && (
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-450 italic mt-1">
                        &ldquo;{setoran.notes}&rdquo;
                      </p>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${setoran.status === 'lulus' ? 'bg-emerald-100 text-emerald-805 dark:bg-emerald-950/50' : 'bg-red-100 text-red-805 dark:bg-red-950/50'}`}>
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

        {/* Notifications & Reminders */}
        {activeHomeTikrars.length > 0 && (
          <div className="bg-purple-500/10 border border-purple-200 dark:border-purple-900/40 p-4 rounded-2xl flex items-start space-x-3 text-purple-750 dark:text-purple-350 shadow-sm">
            <Flame className="h-5 w-5 mt-0.5 shrink-0 text-purple-500" />
            <div>
              <h4 className="font-bold text-xs">Kewajiban Tikrar Rumah Aktif</h4>
              <p className="text-[10px] leading-relaxed mt-1">
                Ada {activeHomeTikrars.length} tugas Tikrar mandiri di rumah yang belum diselesaikan untuk {activeSantri.nama}. Silakan lihat menu <strong className="font-semibold text-purple-700 dark:text-purple-400">Tikrar Rumah</strong> untuk melakukan konfirmasi.
              </p>
            </div>
          </div>
        )}

        {activeSantri.status === 'stagnant' && (
          <div className="bg-red-500/10 border border-red-200 dark:border-red-900/40 p-4 rounded-2xl flex items-start space-x-3 text-red-750 dark:text-red-350 shadow-sm">
            <AlertCircle className="h-5 w-5 mt-0.5 shrink-0 text-red-655" />
            <div>
              <h4 className="font-bold text-xs">Pemberitahuan Stagnasi</h4>
              <p className="text-[10px] leading-relaxed mt-1">
                Ustadz mencatat adanya hambatan perkembangan hafalan (stuck) pada {activeSantri.nama}. Koordinator Tahfiz saat ini sedang memantau dan mengambil langkah intervensi ({activeSantri.stagnancyAction || 'Konseling'}). Mohon dampingi murojaah di rumah.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderValidasiManzilPanel = () => {
    if (!activeSantri) return null;

    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-teal-500/10 rounded-full blur-xl pointer-events-none" />
        <h3 className="font-extrabold text-sm text-slate-805 dark:text-slate-100 border-b border-slate-105 dark:border-slate-800 pb-3 mb-4 flex items-center justify-between">
          <span>✍ Validasi Manzil (Murojaah Rumah)</span>
          <span className="text-[10px] text-slate-450 font-medium">F2.1 / F2.5.2</span>
        </h3>
        
        {todayManzil ? (
          <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-400 rounded-xl flex items-center space-x-2 text-xs font-bold">
            <span>Manzil Sudah Dikonfirmasi Hari Ini ✅</span>
          </div>
        ) : (
          <p className="text-xs text-slate-550 dark:text-slate-400 mb-4 leading-relaxed">
            Berdasarkan urutan hafalan, target murajaah mandiri anak hari ini adalah **2.5 Lembar (Juz {activeSantri.currentJuz})**. Tolong simak hafalan anak and beri konfirmasi digital.
          </p>
        )}

        {todayManzil && (
          <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-150 dark:border-slate-800 text-xs space-y-2.5">
            <h4 className="font-bold text-slate-700 dark:text-slate-350 border-b border-slate-200 dark:border-slate-750 pb-1.5 mb-2">
              Ringkasan Data Terkirim:
            </h4>
            <div className="grid grid-cols-2 gap-y-2">
              <span className="text-slate-450">Surah Murojaah:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{todayManzil.surah}</span>
              
              <span className="text-slate-450">Halaman Mulai:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{todayManzil.halamanMulai}</span>
              
              <span className="text-slate-450">Halaman Selesai:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{todayManzil.halamanSelesai}</span>
              
              <span className="text-slate-450">Aktual Halaman:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{todayManzil.halamanAktual ?? (todayManzil.halamanMulai && todayManzil.halamanSelesai ? (todayManzil.halamanSelesai - todayManzil.halamanMulai + 1) : 0)} Lembar/Halaman</span>
              
              <span className="text-slate-450">Catatan/Validasi:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{todayManzil.notes || '-'}</span>
            </div>
            {todayManzil.parentSignature && (
              <div className="mt-3">
                <span className="text-slate-450 block mb-1">Tanda Tangan Konfirmasi:</span>
                <div className="inline-block bg-white p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                  <img src={todayManzil.parentSignature} alt="Tanda Tangan Orang Tua" className="h-16 object-contain max-w-[200px]" />
                </div>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSaveManzil} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400">Surah Murojaah</label>
            <input
              type="text"
              value={manzilSurah}
              onChange={e => setManzilSurah(e.target.value)}
              required
              disabled={!!todayManzil}
              className="w-full text-xs p-2 border border-slate-250 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:border-teal-500 disabled:opacity-60"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400">Hal Mulai</label>
              <input
                type="number"
                value={manzilHalMulai}
                onChange={e => setManzilHalMulai(Number(e.target.value))}
                disabled={!!todayManzil}
                className="w-full text-xs p-2 border border-slate-250 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg disabled:opacity-60"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400">Hal Selesai</label>
              <input
                type="number"
                value={manzilHalSelesai}
                onChange={e => setManzilHalSelesai(Number(e.target.value))}
                disabled={!!todayManzil}
                className="w-full text-xs p-2 border border-slate-250 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg disabled:opacity-60"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400">Aktual Hal</label>
              <input
                type="number"
                value={manzilAktualHalaman}
                onChange={e => setManzilAktualHalaman(Number(e.target.value))}
                disabled={!!todayManzil}
                className="w-full text-xs p-2 border border-slate-250 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg disabled:opacity-60"
              />
            </div>
          </div>

          <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-900/50">
            <label className="text-[10px] font-bold uppercase text-slate-400 flex justify-between items-center mb-2">
              <span>Tanda Tangan Digital Orang Tua {signatureDone && '✓'}</span>
              <button 
                type="button" 
                onClick={clearSignature}
                disabled={!!todayManzil}
                className="text-[9px] text-teal-600 dark:text-teal-400 hover:underline font-bold disabled:opacity-50"
              >
                Bersihkan
              </button>
            </label>

            <div className="border border-dashed border-slate-350 dark:border-slate-700 h-[120px] bg-white dark:bg-slate-900 rounded-lg overflow-hidden relative">
              <canvas
                ref={canvasRef}
                className="w-full h-full cursor-crosshair touch-none"
              />
            </div>

            <div className="mt-2">
              <input
                type="text"
                placeholder="Atau ketik nama lengkap Anda..."
                value={signatureName}
                onChange={e => {
                  setSignatureName(e.target.value);
                  setSignatureDone(e.target.value.trim().length > 0 || canvasSigned);
                }}
                disabled={!!todayManzil}
                className="w-full text-xs p-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md focus:outline-none disabled:opacity-60"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !!todayManzil}
            className="w-full bg-teal-650 hover:bg-teal-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center space-x-1 disabled:opacity-60"
          >
            <FileCheck2 className="h-4 w-4" />
            <span>Kirim Konfirmasi Manzil</span>
          </button>
        </form>
      </div>
    );
  };

  const renderTikrarPanel = () => {
    if (!activeSantri) return null;

    const activeHomeTikrars = tikrars.filter(t => t.santri_id === activeSantri.id && t.status === 'wajib_rumah');
    const completedHomeTikrars = tikrars.filter(t => t.santri_id === activeSantri.id && t.status === 'selesai_rumah');

    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
          <h3 className="font-extrabold text-sm text-slate-805 dark:text-slate-105 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex items-center justify-between">
            <span>🏠 Tikrar Wajib di Rumah</span>
            <span className="text-[10px] text-purple-700 bg-purple-500/10 px-2.5 py-0.5 rounded font-extrabold">Wajib Rumah</span>
          </h3>

          {activeHomeTikrars.length > 0 ? (
            <div className="space-y-3">
              {activeHomeTikrars.map(t => (
                <div key={t.id} className="bg-white/80 dark:bg-slate-900/80 p-4 rounded-xl border border-purple-100 dark:border-purple-900/30 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-3">
                  <div>
                    <span className="font-bold text-slate-850 dark:text-slate-200 text-sm">
                      Surah {t.surah} (Halaman {t.halaman})
                    </span>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Wajib diulang sebanyak {t.jumlah_ulang}x di rumah.
                    </p>
                  </div>
                  <button
                    onClick={() => handleConfirmTikrar(t.id)}
                    className="bg-purple-600 hover:bg-purple-705 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm transition-colors whitespace-nowrap self-end sm:self-auto"
                  >
                    Konfirmasi Selesai
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic py-4 text-center">
              Alhamdulillah, tidak ada tugas Tikrar Rumah aktif untuk anak Anda saat ini.
            </p>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
          <h3 className="font-extrabold text-sm text-slate-805 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            📜 Riwayat Tikrar Mandiri Selesai
          </h3>

          {completedHomeTikrars.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/40">
              {completedHomeTikrars.map(t => (
                <div key={t.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-750 dark:text-slate-200">Surah {t.surah} (Hal {t.halaman})</span>
                    <span className="block text-[10px] text-slate-455 mt-0.5">Selesai pada: {t.tanggal}</span>
                  </div>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-450 font-bold">
                    ✓ Selesai & Terkonfirmasi
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic py-4 text-center">
              Belum ada riwayat Tikrar Rumah yang dikonfirmasi selesai.
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderPerkembanganPanel = () => {
    if (!activeSantri) return null;

    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
          <h3 className="font-extrabold text-sm text-slate-850 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex items-center justify-between">
            <span>📊 Tren Baris Sabak Anak (5 Hari Terakhir)</span>
            <span className="text-[10px] text-slate-450 font-medium">F2.3.1</span>
          </h3>

          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getWeeklyStats()}>
                <XAxis dataKey="hari" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip />
                <Bar dataKey="baris" name="Baris Hafalan" fill="#0d9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-105 border-b border-slate-100 dark:border-slate-800 pb-3">
            Achievements & Capaian Juz
          </h3>

          <div className="flex items-center justify-between text-xs text-slate-550">
            <span>Juz yang sudah dikuasai (Lulus UKJ):</span>
            <div className="flex items-center space-x-1 flex-wrap">
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

        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 border border-indigo-150 dark:border-indigo-900/30 p-5 rounded-2xl flex items-center justify-between text-indigo-900 dark:text-indigo-300">
          <div className="flex items-center space-x-3">
            <Sparkles className="h-5 w-5 text-indigo-500" />
            <div>
              <h5 className="font-bold text-xs">Persiapan Ujian Kenaikan Juz</h5>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Jika juz tuntas, infokan ke Ustadz untuk dijadwalkan UKJ.</p>
            </div>
          </div>
          <button 
            onClick={() => toast.success('Notifikasi kesiapan dikirim ke Ustadz!')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg transition-colors shadow-sm"
          >
            Ajukan Ujian
          </button>
        </div>
      </div>
    );
  };

  const renderPesanPanel = () => {
    if (!activeSantri) return null;

    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col h-[450px]">
        <h3 className="font-extrabold text-sm text-slate-805 dark:text-slate-100 border-b border-slate-105 dark:border-slate-800 pb-3 mb-4 flex items-center justify-between">
          <span>💬 Komunikasi Dua Arah dengan Ustadz</span>
          <span className="text-[10px] text-slate-450 font-medium">F2.4</span>
        </h3>

        <div className="flex-grow overflow-y-auto space-y-3 p-3 bg-slate-55 dark:bg-slate-905 rounded-xl border border-slate-150 dark:border-slate-800 mb-3 text-xs">
          {childPesans.length > 0 ? (
            childPesans.map(p => {
              const isTeacher = p.sender === 'pengampu';
              return (
                <div key={p.id} className={`flex ${isTeacher ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[80%] rounded-xl p-3 shadow-sm ${isTeacher ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-805 dark:text-slate-100 rounded-tl-none' : 'bg-teal-600 text-white rounded-tr-none'}`}>
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
            disabled={isLoading}
            className="bg-teal-650 hover:bg-teal-700 text-white p-2.5 rounded-lg transition-colors disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    );
  };

  const renderActivePanel = () => {
    switch (activeMenu) {
      case 'beranda': return renderBerandaPanel();
      case 'manzil': return renderValidasiManzilPanel();
      case 'tikrar': return renderTikrarPanel();
      case 'perkembangan': return renderPerkembanganPanel();
      case 'pesan': return renderPesanPanel();
      default: return renderBerandaPanel();
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-805 dark:text-slate-105 flex flex-col md:flex-row">
      {/* 1. Desktop Collapsible Sidebar */}
      <aside className={`hidden md:flex flex-col shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-60'}`}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center space-x-2 overflow-hidden">
          <div className="h-9 w-9 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold shrink-0">
            🕌
          </div>
          {!sidebarCollapsed && (
            <div className="transition-opacity duration-300">
              <h1 className="font-bold text-sm leading-tight text-slate-900 dark:text-white">SI Tahfiz</h1>
              <p className="text-[10px] text-slate-505">Wali Santri Dashboard</p>
            </div>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {[
            { id: 'beranda', label: 'Beranda', icon: Home },
            { id: 'manzil', label: 'Validasi Manzil', icon: Award },
            { id: 'tikrar', label: 'Tikrar Rumah', icon: Flame, badge: tikrars.filter(t => t.santri_id === selectedSantriId && t.status === 'wajib_rumah').length },
            { id: 'perkembangan', label: 'Perkembangan', icon: TrendingUp },
            { id: 'pesan', label: 'Pesan Ustadz', icon: MessageSquare },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeMenu === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveMenu(item.id as 'beranda' | 'manzil' | 'tikrar' | 'perkembangan' | 'pesan')}
                className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-teal-500/10 text-teal-650 dark:text-teal-400 font-bold border-l-4 border-teal-500' 
                    : 'text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800/40 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!sidebarCollapsed && <span className="ml-3 text-sm">{item.label}</span>}
                {!sidebarCollapsed && item.badge && item.badge > 0 ? (
                  <span className="ml-auto bg-teal-605 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
          >
            {sidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </div>
      </aside>

      {/* 2. Mobile Bottom Navigation (PRIMARY FOR PARENTS ACCESSING VIA PHONES) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2 py-2 flex items-center justify-around shadow-lg">
        {[
          { id: 'beranda', label: 'Beranda', icon: Home },
          { id: 'manzil', label: 'Manzil', icon: Award },
          { id: 'tikrar', label: 'Tikrar', icon: Flame, badge: tikrars.filter(t => t.santri_id === selectedSantriId && t.status === 'wajib_rumah').length },
          { id: 'perkembangan', label: 'Progres', icon: TrendingUp },
          { id: 'pesan', label: 'Chat', icon: MessageSquare },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeMenu === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveMenu(item.id as 'beranda' | 'manzil' | 'tikrar' | 'perkembangan' | 'pesan')}
              className={`flex flex-col items-center p-1.5 rounded-lg transition-colors relative ${
                isActive ? 'text-teal-600 dark:text-teal-400 font-bold' : 'text-slate-500'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] mt-0.5">{item.label}</span>
              {item.badge && item.badge > 0 ? (
                <span className="absolute top-1 right-2 bg-red-500 text-white text-[8px] h-4 w-4 rounded-full flex items-center justify-center font-bold">
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      {/* 3. Main Viewport */}
      <div className="flex-grow flex flex-col min-w-0 pb-16 md:pb-0">
        <RoleHeader roleName="Orang Tua / Wali Santri" activeRole="orangtua" />
        <PengumumanPopup />
        
        <div className="flex-grow p-4 sm:p-6 overflow-y-auto max-w-5xl mx-auto w-full">
          {/* Personal Greeting */}
          {namaLengkap && activeMenu === 'beranda' && (
            <div className="mb-6 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex items-center space-x-2">
              <span className="text-lg">👋</span>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-205">
                Selamat datang, <span className="font-semibold text-teal-650 dark:text-teal-400">{namaLengkap}</span>
              </p>
            </div>
          )}

          {/* Child selector (always shown at the very top of ALL menus if parent has more than 1 child) */}
          {santriList.length > 1 && (
            <div className="mb-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
              <label className="block text-[10px] font-bold uppercase text-slate-400 dark:border-slate-505 mb-2">
                Pilih Santri (Anak):
              </label>
              <div className="flex flex-wrap gap-2">
                {santriList.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSantriId(s.id)}
                    type="button"
                    className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl border transition-all duration-200 ${
                      selectedSantriId === s.id
                        ? 'bg-teal-650 border-teal-650 text-white shadow-sm shadow-teal-500/10'
                        : 'bg-white dark:bg-slate-900 border-slate-205 dark:border-slate-800 text-slate-650 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    👶 {s.nama} ({s.kelas})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Global error banner */}
          {saveError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center space-x-2 text-red-700 dark:text-red-400 text-xs font-semibold">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          {/* Loading indicator */}
          {isLoading && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl text-blue-700 dark:text-blue-400 text-xs font-semibold text-center">
              Memuat data dari Supabase…
            </div>
          )}

          {/* Child Info Block */}
          {activeSantri && activeMenu === 'beranda' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl mb-6 flex items-center justify-between shadow-sm">
              <div className="flex items-center space-x-3">
                <Smartphone className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                <span className="font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                  Wali Santri: <span className="text-teal-650 dark:text-teal-450">{activeSantri.parentName} (Orang Tua dari {activeSantri.nama})</span>
                </span>
              </div>
              <span className="text-[10px] text-slate-450 font-medium hidden sm:inline">📱 Tampilan Mobile Utama</span>
            </div>
          )}

          {activeSantri ? (
            renderActivePanel()
          ) : (
            <div className="text-center py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm">
              <User className="h-12 w-12 text-slate-350 mx-auto mb-2" />
              <p className="font-bold text-slate-705">Silakan hubungkan akun dengan data santri di TU.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
