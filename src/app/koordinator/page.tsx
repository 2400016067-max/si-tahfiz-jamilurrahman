'use client';

import React, { useEffect, useState, useCallback } from 'react';
import RoleHeader from '@/components/RoleHeader';
import { supabase } from '@/lib/supabase';
import { Santri, UjianJuz } from '@/lib/mockData';
import { 
  Award, 
  Users, 
  Check, 
  AlertTriangle
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function KoordinatorDashboard() {
  const [mounted, setMounted] = useState(false);
  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [ujianList, setUjianList] = useState<UjianJuz[]>([]);

  // Map halaqah_id → nama halaqah (agar lookup halaqah nama tidak hardcode)
  const [halaqahMap, setHalaqahMap] = useState<Record<string, string>>({});

  // Loading & error state
  const [isLoading, setIsLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Grade edit state
  const [editingSantri, setEditingSantri] = useState<Santri | null>(null);
  const [newGrade, setNewGrade] = useState<'Tahsin' | 'Takmil' | 'Tahfiz'>('Tahfiz');

  // Stagnancy intervention state
  const [stagnantSantri, setStagnantSantri] = useState<Santri | null>(null);
  const [stagnancyReason, setStagnancyReason] = useState<'keluarga' | 'psikososial' | 'game' | 'lainnya'>('game');
  const [stagnancyDetail, setStagnancyDetail] = useState('');
  const [stagnancyAction, setStagnancyAction] = useState('');

  // UKJ Input state (for simulator)
  const [showUjianModal, setShowUjianModal] = useState(false);
  const [ujianSantriId, setUjianSantriId] = useState('');
  const [ujianJuz, setUjianJuz] = useState(30);
  const [ujianKesalahan, setUjianKesalahan] = useState(2);
  const [ujianStatus, setUjianStatus] = useState<'lulus' | 'mengulang'>('lulus');

  // ---------------------------------------------------------------------------
  // DATA LOADING — Supabase queries
  // ---------------------------------------------------------------------------
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setSaveError(null);

    try {
      // 1. Fetch halaqah — untuk mapping id → nama (menggantikan hardcode 'h-1')
      const { data: halaqahData, error: halaqahError } = await supabase
        .from('halaqah')
        .select('id, nama');

      if (halaqahError) throw new Error('Gagal memuat halaqah: ' + halaqahError.message);

      const newHalaqahMap: Record<string, string> = {};
      (halaqahData ?? []).forEach((h: { id: string; nama: string }) => {
        // Ambil nama singkat: "Halaqah Abu Bakar (Putra)" → "Abu Bakar"
        const match = h.nama.match(/Halaqah (.+?) \(/);
        newHalaqahMap[h.id] = match ? match[1] : h.nama;
      });
      setHalaqahMap(newHalaqahMap);

      // 2. Fetch santri
      const { data: santriData, error: santriError } = await supabase
        .from('santri')
        .select('*');

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
          totalHafalanJuz: [],
        }));
        setSantriList(mapped);
      }

      // 3. Fetch ujian_juz
      const { data: ujianData, error: ujianError } = await supabase
        .from('ujian_juz')
        .select('*')
        .order('tanggal_ujian', { ascending: false });

      if (ujianError) throw new Error('Gagal memuat ujian_juz: ' + ujianError.message);

      if (ujianData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mappedUjian: UjianJuz[] = (ujianData as any[]).map((u) => ({
          id: u.id,
          santriId: u.santri_id,
          juz: u.juz,
          date: u.tanggal_ujian,
          kesalahan: u.jumlah_kesalahan,
          status: u.status as 'lulus' | 'mengulang',
          approvedByKoordinator: u.approved_by_koordinator,
        }));
        setUjianList(mappedUjian);
      }

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan tidak diketahui.';
      console.error('[KoordinatorDashboard] loadData error:', err);
      setSaveError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, [loadData]);

  // ---------------------------------------------------------------------------
  // UPDATE GRADE — UPDATE santri + INSERT riwayat_grade
  // ---------------------------------------------------------------------------
  const handleUpdateGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSantri) return;

    setSaveError(null);

    let targetBaris = 12;
    if (newGrade === 'Tahsin') targetBaris = 3;
    if (newGrade === 'Takmil') targetBaris = 7;
    if (newGrade === 'Tahfiz') targetBaris = 15;

    // 1. Update tabel santri
    const { error: updateError } = await supabase
      .from('santri')
      .update({
        grade: newGrade,
        target_baris: targetBaris,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingSantri.id);

    if (updateError) {
      setSaveError('Gagal memperbarui grade santri: ' + updateError.message);
      return;
    }

    // 2. Catat ke riwayat_grade
    //    diubah_oleh = null (nullable) sampai auth diimplementasikan
    const { error: riwayatError } = await supabase.from('riwayat_grade').insert({
      santri_id:         editingSantri.id,
      grade_lama:        editingSantri.grade,
      grade_baru:        newGrade,
      target_baris_baru: targetBaris,
      tanggal_ubah:      new Date().toISOString().split('T')[0],
      alasan:            'Perubahan grade oleh Koordinator Tahfiz',
      diubah_oleh:       null,
    });

    if (riwayatError) {
      // Tidak fatal — grade sudah terupdate, log saja
      console.warn('[KoordinatorDashboard] Gagal insert riwayat_grade:', riwayatError.message);
    }

    alert(`Berhasil memperbarui Grade ${editingSantri.nama} ke ${newGrade} dengan target harian ${targetBaris} baris.`);
    setEditingSantri(null);
    await loadData();
  };

  // ---------------------------------------------------------------------------
  // SIMPAN INTERVENSI STAGNASI — UPDATE santri + INSERT catatan_stagnasi
  // ---------------------------------------------------------------------------
  const handleSaveIntervention = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stagnantSantri) return;

    setSaveError(null);

    // 1. Update status santri menjadi stagnant
    const { error: updateError } = await supabase
      .from('santri')
      .update({
        status:            'stagnant',
        stagnancy_reason:  stagnancyReason,
        stagnancy_detail:  stagnancyDetail,
        stagnancy_action:  stagnancyAction,
        stagnancy_since:   new Date().toISOString().split('T')[0],
        updated_at:        new Date().toISOString(),
      })
      .eq('id', stagnantSantri.id);

    if (updateError) {
      setSaveError('Gagal memperbarui status stagnasi: ' + updateError.message);
      return;
    }

    // 2. Insert catatan ke tabel catatan_stagnasi
    //    dicatat_oleh = null (nullable) sampai auth diimplementasikan
    const { error: catatanError } = await supabase.from('catatan_stagnasi').insert({
      santri_id:         stagnantSantri.id,
      tanggal:           new Date().toISOString().split('T')[0],
      penyebab:          stagnancyReason,
      detail:            stagnancyDetail,
      langkah_korektif:  stagnancyAction,
      status_penanganan: 'proses',
      dicatat_oleh:      null,
    });

    if (catatanError) {
      console.warn('[KoordinatorDashboard] Gagal insert catatan_stagnasi:', catatanError.message);
    }

    alert(`Langkah intervensi untuk ${stagnantSantri.nama} berhasil dicatat.`);
    setStagnantSantri(null);
    setStagnancyDetail('');
    setStagnancyAction('');
    await loadData();
  };

  // ---------------------------------------------------------------------------
  // RESOLVE STAGNASI — UPDATE santri status kembali ke active
  // ---------------------------------------------------------------------------
  const handleResolveStagnancy = async (studentId: string) => {
    setSaveError(null);

    const { error } = await supabase
      .from('santri')
      .update({
        status:           'active',
        stagnancy_reason: null,
        stagnancy_detail: null,
        stagnancy_action: null,
        stagnancy_since:  null,
        updated_at:       new Date().toISOString(),
      })
      .eq('id', studentId);

    if (error) {
      setSaveError('Gagal memperbarui status santri: ' + error.message);
      return;
    }

    alert('Santri dikembalikan ke status aktif normal.');
    await loadData();
  };

  // ---------------------------------------------------------------------------
  // APPROVE UKJ — UPDATE ujian_juz + UPDATE hafalan_juz + UPDATE santri
  // Meniru logika approveUjianJuz() di store.ts
  // ---------------------------------------------------------------------------
  const handleApproveUjian = async (ujianId: string) => {
    setSaveError(null);
    const ujian = ujianList.find(u => u.id === ujianId);
    if (!ujian) return;

    // 1. Setujui ujian di tabel ujian_juz
    const { error: approveError } = await supabase
      .from('ujian_juz')
      .update({
        approved_by_koordinator: true,
        koordinator_id:          null,   // nullable sampai auth
        approved_at:             new Date().toISOString(),
        updated_at:              new Date().toISOString(),
      })
      .eq('id', ujianId);

    if (approveError) {
      setSaveError('Gagal menyetujui UKJ: ' + approveError.message);
      return;
    }

    // 2. Jika status lulus → masukkan ke hafalan_juz & update current_juz santri
    if (ujian.status === 'lulus') {
      // Insert hafalan_juz (upsert agar tidak duplikat jika sudah ada)
      const { error: hafalanError } = await supabase.from('hafalan_juz').upsert(
        {
          santri_id:       ujian.santriId,
          juz:             ujian.juz,
          tanggal_selesai: ujian.date,
        },
        { onConflict: 'santri_id,juz' }
      );

      if (hafalanError) {
        console.warn('[KoordinatorDashboard] Gagal insert hafalan_juz:', hafalanError.message);
      }

      // Hitung current_juz baru: juz terkecil yang belum dikuasai
      const { data: hafalanAll } = await supabase
        .from('hafalan_juz')
        .select('juz')
        .eq('santri_id', ujian.santriId);

      if (hafalanAll && hafalanAll.length > 0) {
        const completedJuz = hafalanAll.map((h: { juz: number }) => h.juz);
        const minJuz = Math.min(...completedJuz);
        if (minJuz > 1) {
          await supabase
            .from('santri')
            .update({
              current_juz: minJuz - 1,
              updated_at:  new Date().toISOString(),
            })
            .eq('id', ujian.santriId);
        }
      }
    }

    // Celebrasi konfeti
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 }
    });

    await loadData();
  };

  // ---------------------------------------------------------------------------
  // TAMBAH UJIAN BARU — INSERT ke tabel ujian_juz
  // ---------------------------------------------------------------------------
  const handleAddUjian = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ujianSantriId) return;

    setSaveError(null);

    const { error } = await supabase.from('ujian_juz').insert({
      santri_id:               ujianSantriId,
      juz:                     ujianJuz,
      tanggal_ujian:           new Date().toISOString().split('T')[0],
      jumlah_kesalahan:        ujianKesalahan,
      status:                  ujianStatus,
      approved_by_koordinator: false,
      koordinator_id:          null,
      pengampu_id:             null,
    });

    if (error) {
      setSaveError('Gagal menyimpan ujian: ' + error.message);
      return;
    }

    setShowUjianModal(false);
    alert('Log Ujian Kenaikan Juz berhasil dibuat. Silakan klik "Setujui" pada daftar Ujian di bawah untuk verifikasi.');
    await loadData();
  };

  // Calculated Stats
  const stagnantCount = santriList.filter(s => s.status === 'stagnant').length;
  const pendingUjians = ujianList.filter(u => !u.approvedByKoordinator);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
      <RoleHeader roleName="Koordinator Tahfiz" activeRole="koordinator" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Global error banner */}
        {saveError && (
          <div className="mb-6 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center space-x-2 text-red-700 dark:text-red-400 text-xs font-semibold">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl text-blue-700 dark:text-blue-400 text-xs font-semibold text-center">
            Memuat data dari Supabase…
          </div>
        )}
        
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Santri Perlu Intervensi</p>
              <h3 className="text-2xl font-extrabold text-red-600 dark:text-red-400 mt-1">{stagnantCount} Santri</h3>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-950/30 text-red-650 dark:text-red-400 rounded-xl">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Menunggu Kelulusan UKJ</p>
              <h3 className="text-2xl font-extrabold text-indigo-650 dark:text-indigo-400 mt-1">{pendingUjians.length} Ujian</h3>
            </div>
            <div className="p-3 bg-indigo-100 dark:bg-indigo-950/30 text-indigo-650 dark:text-indigo-400 rounded-xl">
              <Award className="h-6 w-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Klasifikasi Santri</p>
              <div className="flex space-x-3 mt-1.5 text-xs font-bold">
                <span className="text-emerald-600">Tahfiz: {santriList.filter(s => s.grade === 'Tahfiz').length}</span>
                <span className="text-blue-600">Takmil: {santriList.filter(s => s.grade === 'Takmil').length}</span>
                <span className="text-amber-600">Tahsin: {santriList.filter(s => s.grade === 'Tahsin').length}</span>
              </div>
            </div>
            <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl">
              <Users className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Dashboard Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left / Middle: Grade Management & Stagnancy List */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Grade Management Section (F3.1) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <h3 className="font-extrabold text-sm text-slate-850 dark:text-slate-150 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex items-center justify-between">
                <span>📋 Manajemen Grade &amp; Target Santri</span>
                <span className="text-[10px] text-slate-450">F3.1</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
                      <th className="pb-2 font-bold">Nama Santri</th>
                      <th className="pb-2 font-bold">Grade Aktual</th>
                      <th className="pb-2 font-bold">Target Harian</th>
                      <th className="pb-2 font-bold">Halaqah</th>
                      <th className="pb-2 text-right font-bold">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {santriList.map(student => (
                      <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/10 transition-colors">
                        <td className="py-3 font-bold text-slate-800 dark:text-slate-200">{student.nama}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${student.grade === 'Tahfiz' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/45 dark:text-emerald-400' : student.grade === 'Takmil' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/45 dark:text-blue-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/45 dark:text-amber-400'}`}>
                            {student.grade}
                          </span>
                        </td>
                        <td className="py-3 font-semibold text-slate-600 dark:text-slate-400">{student.targetBaris} baris/hari</td>
                        {/* halaqahMap menggantikan hardcode 'h-1' check yang tidak valid setelah migrasi ke UUID */}
                        <td className="py-3 text-slate-500">{halaqahMap[student.halaqahId] || 'Halaqah'}</td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => {
                              setEditingSantri(student);
                              setNewGrade(student.grade);
                            }}
                            disabled={isLoading}
                            className="bg-slate-100 hover:bg-slate-250 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 font-bold px-2.5 py-1 rounded transition-colors disabled:opacity-60"
                          >
                            Ubah Grade
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Stagnancy Monitoring & Interventions (F3.2) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <h3 className="font-extrabold text-sm text-slate-850 dark:text-slate-150 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex items-center justify-between">
                <span>⚠ Pemantauan Stagnasi &amp; Langkah Korektif</span>
                <span className="text-[10px] text-slate-450">F3.2</span>
              </h3>

              <div className="space-y-4">
                {santriList.filter(s => s.status === 'stagnant').map(stagnant => (
                  <div key={stagnant.id} className="border border-red-200 dark:border-red-950/50 p-4 rounded-xl bg-red-50/10 dark:bg-red-950/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-sm">{stagnant.nama}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300 rounded">
                          Sebab: {stagnant.stagnancyReason}
                        </span>
                      </div>
                      <button
                        onClick={() => handleResolveStagnancy(stagnant.id)}
                        disabled={isLoading}
                        className="text-emerald-600 dark:text-emerald-450 font-bold text-xs hover:underline flex items-center disabled:opacity-60"
                      >
                        <Check className="h-3.5 w-3.5 mr-0.5" /> Tandai Normal
                      </button>
                    </div>

                    <div className="text-xs space-y-1.5 text-slate-650 dark:text-slate-400">
                      <p><span className="font-bold">Analisis Kendala:</span> {stagnant.stagnancyDetail}</p>
                      <p><span className="font-bold">Langkah Korektif:</span> {stagnant.stagnancyAction}</p>
                    </div>

                    <button
                      onClick={() => {
                        setStagnantSantri(stagnant);
                        setStagnancyReason(stagnant.stagnancyReason || 'game');
                        setStagnancyDetail(stagnant.stagnancyDetail || '');
                        setStagnancyAction(stagnant.stagnancyAction || '');
                      }}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Perbarui Rencana &rarr;
                    </button>
                  </div>
                ))}

                {santriList.filter(s => s.status === 'stagnant').length === 0 && (
                  <p className="text-center text-xs text-slate-400 py-4">Tidak ada santri yang mengalami stagnasi/stuck saat ini.</p>
                )}
                
                {/* Simulator: Flag Stagnancy button */}
                <div className="pt-2">
                  <button
                    onClick={() => {
                      const activeOnes = santriList.filter(s => s.status === 'active');
                      if (activeOnes.length > 0) {
                        setStagnantSantri(activeOnes[0]);
                      } else {
                        alert('Semua santri sudah berstatus stagnan.');
                      }
                    }}
                    disabled={isLoading}
                    className="inline-flex items-center text-xs font-bold text-red-600 dark:text-red-400 hover:underline disabled:opacity-60"
                  >
                    + Flag Stagnansi Santri Baru (Simulasi)
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: UKJ Approval Panel (F3.3) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Ujian Kenaikan Juz Section */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                  <Award className="h-5 w-5 text-indigo-650 dark:text-indigo-400" />
                  <span>Ujian Kenaikan Juz (UKJ)</span>
                </h3>
                <button
                  onClick={() => setShowUjianModal(true)}
                  disabled={isLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] px-2 py-1 rounded disabled:opacity-60"
                >
                  + Ujian Baru
                </button>
              </div>

              <div className="space-y-3 overflow-y-auto max-h-[420px] pr-1">
                {ujianList.map(ujian => {
                  const student = santriList.find(s => s.id === ujian.santriId);
                  return (
                    <div key={ujian.id} className="border border-slate-150 dark:border-slate-800 p-3.5 rounded-xl text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-slate-850 dark:text-slate-200">{student?.nama || 'Santri'}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-650 rounded">
                          Juz {ujian.juz}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center text-[10px] text-slate-500">
                        <span>Kesalahan: {ujian.kesalahan} halaman</span>
                        <span>{ujian.date}</span>
                      </div>

                      {ujian.approvedByKoordinator ? (
                        <div className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 p-1 rounded font-bold text-[10px] text-center flex items-center justify-center">
                          <Check className="h-3 w-3 mr-1" /> Approved
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2 mt-2">
                          <button
                            onClick={() => handleApproveUjian(ujian.id)}
                            disabled={isLoading}
                            className="flex-grow bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 rounded text-[10px] shadow disabled:opacity-60"
                          >
                            Setujui Kenaikan Juz
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Grade Edit Modal Form Overlay */}
      {editingSantri && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-sm shadow-xl space-y-4">
            <h4 className="font-extrabold text-base">Ubah Klasifikasi Grade</h4>
            <p className="text-xs text-slate-500">Sesuaikan target hafalan {editingSantri.nama} secara instan.</p>
            
            <form onSubmit={handleUpdateGrade} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400">Pilih Grade Baru</label>
                <select
                  value={newGrade}
                  onChange={e => setNewGrade(e.target.value as 'Tahsin' | 'Takmil' | 'Tahfiz')}
                  className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none"
                >
                  <option value="Tahsin">Tahsin (Target: 2-3 baris/hari)</option>
                  <option value="Takmil">Takmil (Target: 7 baris/hari)</option>
                  <option value="Tahfiz">Tahfiz (Target: 10-15 baris/hari)</option>
                </select>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSantri(null)}
                  className="flex-grow bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 py-2 rounded-lg text-xs font-bold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-grow bg-indigo-650 hover:bg-indigo-750 text-white py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-60"
                >
                  Simpan Grade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stagnancy Intervention Form Modal */}
      {stagnantSantri && !editingSantri && stagnantSantri.status === 'active' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-xl space-y-4">
            <h4 className="font-extrabold text-base flex items-center space-x-1.5 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <span>Analisis Kendala &amp; Intervensi Stagnasi</span>
            </h4>
            <p className="text-xs text-slate-500">Catat analisis penyebab dan program penanganan untuk {stagnantSantri.nama}.</p>
            
            <form onSubmit={handleSaveIntervention} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400">Kategori Penyebab</label>
                <select
                  value={stagnancyReason}
                  onChange={e => setStagnancyReason(e.target.value as 'keluarga' | 'psikososial' | 'game' | 'lainnya')}
                  className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none"
                >
                  <option value="game">Kecanduan Game / Gadget di Akhir Pekan</option>
                  <option value="keluarga">Masalah Keluarga / Kurang Dukungan Ortu</option>
                  <option value="psikososial">Tekanan Psikososial / Stres di Kelas</option>
                  <option value="lainnya">Penyebab Lainnya / Sakit / Kurang Motivasi</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400">Detail Analisis Kendala</label>
                <textarea
                  value={stagnancyDetail}
                  onChange={e => setStagnancyDetail(e.target.value)}
                  placeholder="Ceritakan temuan Anda terkait penyebab anak stuck..."
                  required
                  rows={2}
                  className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400">Rencana Tindakan Korektif</label>
                <textarea
                  value={stagnancyAction}
                  onChange={e => setStagnancyAction(e.target.value)}
                  placeholder="Langkah nyata yang diambil (misalnya: Panggil orang tua, konseling harian, penahanan HP)..."
                  required
                  rows={2}
                  className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStagnantSantri(null)}
                  className="flex-grow bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-355 py-2 rounded-lg text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-grow bg-red-650 hover:bg-red-750 text-white py-2 rounded-lg text-xs font-bold disabled:opacity-60"
                >
                  Simpan Tindakan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Register New Exam Modal (Simulator) */}
      {showUjianModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-sm shadow-xl space-y-4">
            <h4 className="font-extrabold text-base">Catat Log Ujian Kenaikan Juz</h4>
            
            <form onSubmit={handleAddUjian} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400">Pilih Santri</label>
                <select
                  value={ujianSantriId}
                  onChange={e => setUjianSantriId(e.target.value)}
                  required
                  className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none"
                >
                  <option value="">-- Pilih Santri --</option>
                  {santriList.map(s => (
                    <option key={s.id} value={s.id}>{s.nama}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400">Juz Ujian</label>
                  <input
                    type="number"
                    value={ujianJuz}
                    onChange={e => setUjianJuz(Number(e.target.value))}
                    min={1}
                    max={30}
                    className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400">Kesalahan Halaman</label>
                  <input
                    type="number"
                    value={ujianKesalahan}
                    onChange={e => setUjianKesalahan(Number(e.target.value))}
                    className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400">Status Hasil</label>
                <select
                  value={ujianStatus}
                  onChange={e => setUjianStatus(e.target.value as 'lulus' | 'mengulang')}
                  className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none"
                >
                  <option value="lulus">Lulus Juz (Batas kesalahan &le; 4)</option>
                  <option value="mengulang">Mengulang (Kesalahan &gt; 4)</option>
                </select>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUjianModal(false)}
                  className="flex-grow bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 py-2 rounded-lg text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-grow bg-indigo-650 hover:bg-indigo-750 text-white py-2 rounded-lg text-xs font-bold disabled:opacity-60"
                >
                  Simpan Ujian
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
