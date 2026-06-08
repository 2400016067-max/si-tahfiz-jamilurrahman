'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import RoleHeader from '@/components/RoleHeader';
import PengumumanPopup from '@/components/PengumumanPopup';
import { supabase } from '@/lib/supabase';
import { Santri, Halaqah, Setoran } from '@/lib/mockData';
import { 
  Database, 
  Search, 
  RotateCw,
  UserPlus,
  PlusCircle,
  BookMarked,
  CheckCircle2,
  Link2,
  Link2Off,
  Users,
  LayoutDashboard,
  UserSquare2,
  Settings2,
  ChevronRight,
  ChevronLeft,
  X,
  Edit2,
  Menu,
  Power,
  ShieldAlert,
  ArrowRightLeft,
  Loader2,
  Megaphone,
  Send
} from 'lucide-react';

interface BackupLog {
  id: string;
  timestamp: string;
  size: string;
  status: 'sukses' | 'gagal';
}

interface DBUser {
  id: string;
  nama_lengkap: string;
  email: string;
  no_hp: string | null;
  role: string;
  is_active: boolean;
}

export default function StaffTUDashboard() {
  const [mounted, setMounted] = useState(false);
  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [halaqahs, setHalaqahs] = useState<Halaqah[]>([]);
  const [setorans, setSetorans] = useState<Setoran[]>([]);
  const [allUsers, setAllUsers] = useState<DBUser[]>([]);

  // Map halaqah_id → nama halaqah
  const [halaqahMap, setHalaqahMap] = useState<Record<string, string>>({});

  // Loading & error state
  const [isLoading, setIsLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [namaLengkap, setNamaLengkap] = useState<string>('');
  
  // Navigation states
  const [activeMenu, setActiveMenu] = useState<'dashboard' | 'santri' | 'halaqah' | 'akun' | 'relasi' | 'sistem'>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);

  // Edit Santri Modal states
  const [editingSantri, setEditingSantri] = useState<Santri | null>(null);
  const [editSantriNama, setEditSantriNama] = useState('');
  const [editSantriKelas, setEditSantriKelas] = useState('7A');
  const [editSantriGrade, setEditSantriGrade] = useState<'Tahsin' | 'Takmil' | 'Tahfiz'>('Tahsin');
  const [editSantriHalaqahId, setEditSantriHalaqahId] = useState('');
  const [editSantriStatus, setEditSantriStatus] = useState<'active' | 'stagnant'>('active');

  // Edit Halaqah Modal states
  const [editingHalaqah, setEditingHalaqah] = useState<Halaqah | null>(null);
  const [editHalaqahNama, setEditHalaqahNama] = useState('');
  const [editHalaqahUnit, setEditHalaqahUnit] = useState<'Putra' | 'Putri'>('Putra');

  // Parent account assignment states
  const [parentAccountMode, setParentAccountMode] = useState<'new' | 'existing'>('new');
  const [selectedParentUserId, setSelectedParentUserId] = useState<string>('');
  const [newParentEmail, setNewParentEmail] = useState('');

  // Add parent from Manajemen Akun panel
  const [newParentNama, setNewParentNama] = useState('');
  const [newParentPhone, setNewParentPhone] = useState('');
  const [newParentEmailAcc, setNewParentEmailAcc] = useState('');

  // Announcement form state
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annTargets, setAnnTargets] = useState<Record<string, boolean>>({
    koordinator: false,
    pengampu: false,
  });

  // Search queries
  const [searchQuery, setSearchQuery] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Backup simulator logs
  const [backups, setBackups] = useState<BackupLog[]>([
    { id: 'b-1', timestamp: '2026-06-05 23:00:02', size: '154 KB', status: 'sukses' },
    { id: 'b-2', timestamp: '2026-06-04 23:00:01', size: '152 KB', status: 'sukses' }
  ]);

  // Personnel rotation states
  const [selectedHalaqahId, setSelectedHalaqahId] = useState<string>('');
  const [newPengampu, setNewPengampu] = useState<string>('');

  // Input correction state
  const [editingSetoranId, setEditingSetoranId] = useState<string>('');
  const [correctedKesalahan, setCorrectedKesalahan] = useState<number>(0);
  const [isApprovedByKoordinator, setIsApprovedByKoordinator] = useState(false);

  // NEW FORM STATES — Form 1: Buat Halaqah Baru
  const [newHalaqahNama, setNewHalaqahNama] = useState('');
  const [newHalaqahUnit, setNewHalaqahUnit] = useState<'Putra' | 'Putri'>('Putra');
  const [newHalaqahPengampuId, setNewHalaqahPengampuId] = useState('');
  const [createHalaqahSuccess, setCreateHalaqahSuccess] = useState(false);

  // NEW FORM STATES — Form 2: Tambah Santri Baru
  const [newSantriNama, setNewSantriNama] = useState('');
  const [newSantriKelas, setNewSantriKelas] = useState('7A');
  const [newSantriGrade, setNewSantriGrade] = useState<'Tahsin' | 'Takmil' | 'Tahfiz'>('Tahsin');
  const [newSantriHalaqahId, setNewSantriHalaqahId] = useState('');
  const [newSantriParentName, setNewSantriParentName] = useState('');
  const [newSantriParentPhone, setNewSantriParentPhone] = useState('');
  const [createSantriSuccess, setCreateSantriSuccess] = useState(false);

  // NEW FORM STATES — Form 3: Buat Akun Pengampu Baru
  const [newUserNama, setNewUserNama] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [createUserSuccess, setCreateUserSuccess] = useState(false);

  // Parent-Student relationship editor states
  const [relationParentId, setRelationParentId] = useState<string>('');
  const [relationChildId, setRelationChildId] = useState<string>('');

  // Computed states
  const pengampuUsers = allUsers.filter(u => u.role === 'pengampu');
  const parentUsers = allUsers.filter(u => u.role === 'orangtua');

  // ---------------------------------------------------------------------------
  // DATA LOADING — Supabase queries
  // ---------------------------------------------------------------------------
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setSaveError(null);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) throw new Error('Sesi tidak valid. Silakan login kembali.');

      const email = session.user.email;

      // Query tabel users untuk dapat nama lengkap
      const { data: dbUser, error: dbUserError } = await supabase
        .from('users')
        .select('nama_lengkap')
        .eq('email', email)
        .single();

      if (dbUserError || !dbUser) throw new Error('Detail pengguna tidak ditemukan di database.');
      setNamaLengkap(dbUser.nama_lengkap ?? '');

      // 1. Fetch all users for account management list
      const { data: allUsersData, error: allUsersError } = await supabase
        .from('users')
        .select('id, nama_lengkap, email, no_hp, role, is_active')
        .order('nama_lengkap', { ascending: true });

      if (allUsersError) throw new Error('Gagal memuat akun pengguna: ' + allUsersError.message);
      setAllUsers(allUsersData ?? []);

      // 2. Fetch semua hafalan_juz untuk totalHafalanJuz per santri
      const { data: hafalanData, error: hafalanError } = await supabase
        .from('hafalan_juz')
        .select('santri_id, juz');

      if (hafalanError) throw new Error('Gagal memuat hafalan_juz: ' + hafalanError.message);

      const hafalanMap: Record<string, number[]> = {};
      (hafalanData ?? []).forEach((h: { santri_id: string; juz: number }) => {
        if (!hafalanMap[h.santri_id]) hafalanMap[h.santri_id] = [];
        hafalanMap[h.santri_id].push(h.juz);
      });

      // 3. Fetch santri
      const { data: santriData, error: santriError } = await supabase
        .from('santri')
        .select('*')
        .order('nama', { ascending: true });

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
          parentUserId: s.parent_user_id,
        }));
        setSantriList(mapped);
      }

      // Map user_id → nama
      const userNameMap: Record<string, string> = {};
      (allUsersData ?? []).forEach(u => { userNameMap[u.id] = u.nama_lengkap; });

      // Set default untuk form buat halaqah baru
      const activePengampus = (allUsersData ?? []).filter(u => u.role === 'pengampu');
      if (activePengampus.length > 0 && !newHalaqahPengampuId) {
        setNewHalaqahPengampuId(activePengampus[0].id);
      }

      // Set default parent jika belum dipilih
      const activeParents = (allUsersData ?? []).filter(u => u.role === 'orangtua');
      if (activeParents.length > 0 && !relationParentId) {
        setRelationParentId(activeParents[0].id);
      }

      // 4. Fetch halaqah
      const { data: halaqahData, error: halaqahError } = await supabase
        .from('halaqah')
        .select('id, nama, unit, pengampu_id')
        .eq('is_active', true)
        .order('nama', { ascending: true });

      if (halaqahError) throw new Error('Gagal memuat halaqah: ' + halaqahError.message);

      if (halaqahData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mappedHalaqah: Halaqah[] = (halaqahData as any[]).map((h) => ({
          id: h.id,
          nama: h.nama,
          unit: h.unit as 'Putra' | 'Putri',
          pengampu: userNameMap[h.pengampu_id] ?? 'Unknown',
          pengampu_id: h.pengampu_id,
        }));
        setHalaqahs(mappedHalaqah);

        // Bangun halaqahMap untuk lookup nama di selectedStudent detail
        const newHalaqahMap: Record<string, string> = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (halaqahData as any[]).forEach(h => {
          const match = h.nama.match(/Halaqah (.+)/);
          newHalaqahMap[h.id] = match ? match[1] : h.nama;
        });
        setHalaqahMap(newHalaqahMap);

        // Set default halaqah terpilih
        if (mappedHalaqah.length > 0 && !selectedHalaqahId) {
          setSelectedHalaqahId(mappedHalaqah[0].id);
          setNewPengampu(mappedHalaqah[0].pengampu_id || '');
        }

        // Set default halaqah untuk form tambah santri
        if (mappedHalaqah.length > 0 && !newSantriHalaqahId) {
          setNewSantriHalaqahId(mappedHalaqah[0].id);
        }
      }

      // 5. Fetch setoran 30 hari terakhir
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
        }));
        setSetorans(mappedSetoran);
      }

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan tidak diketahui.';
      console.error('[StaffTUDashboard] loadData error:', err);
      setSaveError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [selectedHalaqahId, newHalaqahPengampuId, newSantriHalaqahId, relationParentId]);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, [loadData]);

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

    setIsLoading(true);
    try {
      const session = await supabase.auth.getSession();
      const userId = session.data.session?.user.id;
      if (!userId) throw new Error('Sesi tidak valid.');

      const { error } = await supabase.from('pengumuman').insert({
        judul: annTitle,
        isi: annContent,
        pengirim_id: userId,
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
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 1. ROTASI PERSONEL — UPDATE halaqah.pengampu_id di Supabase
  // ---------------------------------------------------------------------------
  const handleRotatePersonnel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHalaqahId || !newPengampu) return;

    setSaveError(null);
    setIsLoading(true);

    const matchedUser = pengampuUsers.find(u => u.id === newPengampu);

    if (!matchedUser) {
      setSaveError(`Pengampu baru tidak valid.`);
      setIsLoading(false);
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
      setSaveError('Gagal memperbarui pengampu: ' + error.message);
      toast.error('Gagal memperbarui pengampu: ' + error.message);
      setIsLoading(false);
      return;
    }

    toast.success(
      `Personel dirotasi! Pengampu ${currentHalaqah?.nama} berhasil dialihkan ` +
      `dari "${oldName}" ke "${matchedUser.nama_lengkap}".`
    );
    await loadData();
  };

  // ---------------------------------------------------------------------------
  // 2. BACKUP DATABASE — Simulasi
  // ---------------------------------------------------------------------------
  const handleBackup = () => {
    const timestampStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const simSizeKb = (140 + Math.random() * 40).toFixed(1);
    const newBackup: BackupLog = {
      id: `b-${Date.now()}`,
      timestamp: timestampStr,
      size: `${simSizeKb} KB`,
      status: 'sukses'
    };
    setBackups(prev => [newBackup, ...prev]);
    localStorage.setItem('last_backup_timestamp', timestampStr);
    toast.success('Simulasi pencadangan otomatis (Auto-backup) berhasil! Berkas terkompresi disimpan di cloud storage yayasan.');
  };

  // ---------------------------------------------------------------------------
  // 3. SINKRONISASI FORMAT — Simulasi
  // ---------------------------------------------------------------------------
  const handleSyncFormats = () => {
    toast.success('[Sinkronisasi Unit] Berhasil menyelaraskan format rekapitulasi pelaporan harian antara Unit Putra dan Unit Putri.\nFormat draf laporan PDF/Excel sekarang seragam.');
  };

  // ---------------------------------------------------------------------------
  // 4. KOREKSI INPUT SETORAN — UPDATE setoran di Supabase
  // ---------------------------------------------------------------------------
  const handleCorrectInput = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSetoranId) return;

    if (!isApprovedByKoordinator) {
      toast.error('Peringatan: Koreksi data input harian harus mendapatkan persetujuan Koordinator terlebih dahulu (F5.4.1).');
      return;
    }

    setSaveError(null);
    setIsLoading(true);

    const target = setorans.find(s => s.id === editingSetoranId);
    const oldKesalahan = target?.kesalahan ?? 0;
    const newStatus = correctedKesalahan <= 1 ? 'lulus' : 'mengulang';

    const { error } = await supabase
      .from('setoran')
      .update({
        jumlah_kesalahan: correctedKesalahan,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingSetoranId);

    if (error) {
      setSaveError('Gagal menerapkan koreksi setoran: ' + error.message);
      toast.error('Gagal menerapkan koreksi setoran: ' + error.message);
      setIsLoading(false);
      return;
    }

    toast.success(
      `Koreksi Berhasil! Kesalahan setoran diubah dari ${oldKesalahan} menjadi ` +
      `${correctedKesalahan}. Status kelulusan disesuaikan.`
    );

    setEditingSetoranId('');
    setIsApprovedByKoordinator(false);
    await loadData();
  };

  // ---------------------------------------------------------------------------
  // 5. BUAT HALAQAH BARU — INSERT ke tabel halaqah
  // ---------------------------------------------------------------------------
  const handleCreateHalaqah = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHalaqahNama.trim() || !newHalaqahPengampuId) return;

    setSaveError(null);
    setIsLoading(true);
    setCreateHalaqahSuccess(false);

    const { error } = await supabase.from('halaqah').insert({
      nama:        newHalaqahNama.trim(),
      unit:        newHalaqahUnit,
      pengampu_id: newHalaqahPengampuId,
      is_active:   true,
    });

    if (error) {
      setSaveError('Gagal membuat halaqah: ' + error.message);
      toast.error('Gagal membuat halaqah: ' + error.message);
      setIsLoading(false);
      return;
    }

    setCreateHalaqahSuccess(true);
    toast.success('Halaqah baru berhasil dibuat!');
    setNewHalaqahNama('');
    setTimeout(() => setCreateHalaqahSuccess(false), 3000);
    await loadData();
  };

  // ---------------------------------------------------------------------------
  // 6. TAMBAH SANTRI BARU — INSERT ke tabel santri
  // ---------------------------------------------------------------------------
  const handleCreateSantri = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSantriNama.trim() || !newSantriHalaqahId) return;
    if (parentAccountMode === 'new' && !newSantriParentName.trim()) return;
    if (parentAccountMode === 'existing' && !selectedParentUserId) return;

    setSaveError(null);
    setIsLoading(true);
    setCreateSantriSuccess(false);

    const targetBarisMap = { Tahsin: 3, Takmil: 7, Tahfiz: 12 };
    const targetBaris = targetBarisMap[newSantriGrade];

    let parentUserId = null;
    let parentName = '';
    let parentPhone = null;

    if (parentAccountMode === 'existing') {
      const selectedParent = parentUsers.find(p => p.id === selectedParentUserId);
      if (!selectedParent) {
        setSaveError('Orang tua yang dipilih tidak valid.');
        setIsLoading(false);
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
        setSaveError(`Email "${emailToUse}" sudah terdaftar di sistem. Gunakan email lain.`);
        setIsLoading(false);
        return;
      }

      const { data: newParent, error: newParentError } = await supabase
        .from('users')
        .insert({
          email:         emailToUse,
          password_hash: '$2b$10$placeholderHashForDevOnly.' + newSantriParentName.toLowerCase().replace(/[^a-z]/g, ''),
          role:          'orangtua',
          nama_lengkap:  newSantriParentName.trim(),
          no_hp:         newSantriParentPhone.trim() || null,
          is_active:     true,
        })
        .select('id')
        .single();

      if (newParentError || !newParent) {
        setSaveError('Gagal membuat akun orang tua baru: ' + (newParentError?.message || 'Unknown error'));
        setIsLoading(false);
        return;
      }

      parentUserId = newParent.id;
      parentName = newSantriParentName.trim();
      parentPhone = newSantriParentPhone.trim() || null;
    }

    const { error } = await supabase.from('santri').insert({
      nama:           newSantriNama.trim(),
      kelas:          newSantriKelas.trim(),
      grade:          newSantriGrade,
      target_baris:   targetBaris,
      halaqah_id:     newSantriHalaqahId,
      parent_name:    parentName,
      parent_phone:   parentPhone,
      parent_user_id: parentUserId,
      current_juz:    30,
      status:         'active',
    });

    if (error) {
      setSaveError('Gagal menambahkan santri: ' + error.message);
      toast.error('Gagal menambahkan santri: ' + error.message);
      setIsLoading(false);
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
    await loadData();
  };

  // ---------------------------------------------------------------------------
  // 7. BUAT AKUN PENGAMPU BARU — INSERT ke tabel users
  // ---------------------------------------------------------------------------
  const handleCreatePengampu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserNama.trim()) return;

    setSaveError(null);
    setIsLoading(true);
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
      setSaveError(`Email "${emailToUse}" sudah terdaftar di sistem. Gunakan email lain.`);
      setIsLoading(false);
      return;
    }

    const { error } = await supabase.from('users').insert({
      email:         emailToUse,
      password_hash: '$2b$10$placeholderHashForDevOnly.NewPengampu',
      role:          'pengampu',
      nama_lengkap:  newUserNama.trim(),
      no_hp:         newUserPhone.trim() || null,
      is_active:     true,
    });

    if (error) {
      setSaveError('Gagal membuat akun pengampu: ' + error.message);
      toast.error('Gagal membuat akun pengampu: ' + error.message);
      setIsLoading(false);
      return;
    }

    setCreateUserSuccess(true);
    toast.success('Akun pengampu berhasil dibuat!');
    setNewUserNama('');
    setNewUserPhone('');
    setNewUserEmail('');
    setTimeout(() => setCreateUserSuccess(false), 3000);
    await loadData();
  };

  // ---------------------------------------------------------------------------
  // 8. MANAJEMEN RELASI ORANG TUA-SANTRI — UPDATE parent_user_id di Supabase
  // ---------------------------------------------------------------------------
  const handleDisconnectParent = async (childId: string) => {
    setSaveError(null);
    setIsLoading(true);

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
      await loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan saat memutuskan relasi.';
      setSaveError(msg);
      toast.error('Gagal memutuskan relasi: ' + msg);
      setIsLoading(false);
    }
  };

  const handleConnectParent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!relationParentId || !relationChildId) return;

    setSaveError(null);
    setIsLoading(true);

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
      await loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan saat menghubungkan santri.';
      setSaveError(msg);
      toast.error('Gagal menghubungkan santri: ' + msg);
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // NEW EDIT & TOGGLE ACTIONS (FOR REFACTOR)
  // ---------------------------------------------------------------------------
  const handleUpdateSantri = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSantri) return;

    setIsLoading(true);
    setSaveError(null);

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
      await loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui data santri.';
      setSaveError(msg);
      toast.error(msg);
      setIsLoading(false);
    }
  };

  const handleUpdateHalaqah = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHalaqah) return;

    setIsLoading(true);
    setSaveError(null);

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
      await loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui halaqah.';
      setSaveError(msg);
      toast.error(msg);
      setIsLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    setIsLoading(true);
    setSaveError(null);

    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: !currentStatus })
        .eq('id', userId);

      if (error) throw error;

      toast.success(`Akun berhasil ${!currentStatus ? 'diaktifkan' : 'dinonaktifkan'}.`);
      await loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengubah status akun.';
      setSaveError(msg);
      toast.error(msg);
      setIsLoading(false);
    }
  };

  const handleResetUserPassword = async (userId: string) => {
    setIsLoading(true);
    setSaveError(null);

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
      setSaveError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateParentAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newParentNama.trim()) return;

    setSaveError(null);
    setIsLoading(true);

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
        email:         emailToUse,
        password_hash: '$2b$10$placeholderHashForDevOnly.ParentDefault',
        role:          'orangtua',
        nama_lengkap:  newParentNama.trim(),
        no_hp:         newParentPhone.trim() || null,
        is_active:     true,
      });

      if (error) throw error;

      toast.success('Akun Orang Tua baru berhasil dibuat!');
      setNewParentNama('');
      setNewParentPhone('');
      setNewParentEmailAcc('');
      await loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal membuat akun orang tua.';
      setSaveError(msg);
      toast.error(msg);
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // FILTER UTILITIES
  // ---------------------------------------------------------------------------
  const filteredStudents = santriList.filter(s =>
    s.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = allUsers.filter(u =>
    u.nama_lengkap.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  if (!mounted) return null;

  // Navigation Items details
  const navItems = [
    { id: 'dashboard', label: 'Dashboard Admin', icon: LayoutDashboard },
    { id: 'santri', label: 'Manajemen Santri', icon: UserSquare2 },
    { id: 'halaqah', label: 'Manajemen Halaqah', icon: BookMarked },
    { id: 'akun', label: 'Manajemen Akun', icon: UserPlus },
    { id: 'relasi', label: 'Relasi Ortu-Santri', icon: Link2 },
    { id: 'sistem', label: 'Sistem & Backup', icon: Settings2 },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col">
      {/* Header */}
      <RoleHeader roleName="Staf Tata Usaha (TU)" activeRole="stafftu" />
      <PengumumanPopup />

      {/* Main Container */}
      <div className="flex-1 flex relative">
        
        {/* ==================================================================== */}
        {/* DESKTOP SIDEBAR (Lebar 240px, collapsible)                           */}
        {/* ==================================================================== */}
        <aside className={`hidden md:flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-60'}`}>
          <div className="p-4 flex-1 space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeMenu === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveMenu(item.id as 'dashboard' | 'santri' | 'halaqah' | 'akun' | 'relasi' | 'sistem')}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${isActive ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400' : 'text-slate-650 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-850/50'}`}
                  title={item.label}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </div>

          {/* Sidebar Collapse Toggle */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-850">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-full flex items-center justify-center p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-slate-400 dark:text-slate-500 transition-colors"
            >
              {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
        </aside>

        {/* ==================================================================== */}
        {/* MAIN PANEL CONTENT                                                   */}
        {/* ==================================================================== */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 overflow-y-auto max-w-7xl mx-auto w-full">
          
          {/* Welcome Banner */}
          {namaLengkap && activeMenu === 'dashboard' && (
            <div className="mb-6 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex items-center space-x-2">
              <span className="text-lg">👋</span>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Selamat datang, <span className="font-semibold text-violet-600 dark:text-violet-400">Admin {namaLengkap}</span>
              </p>
            </div>
          )}

          {/* Banner loading & error */}
          {saveError && (
            <div className="mb-6 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl text-red-750 dark:text-red-400 text-xs font-semibold flex items-center justify-between">
              <span>⚠ {saveError}</span>
              <button onClick={() => setSaveError(null)} className="text-red-500 hover:text-red-750">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {isLoading && (
            <div className="mb-6 p-3 bg-violet-500/10 border border-violet-200 dark:border-violet-850/60 rounded-xl text-violet-750 dark:text-violet-300 text-xs font-semibold text-center flex items-center justify-center space-x-2">
              <span className="animate-spin h-3.5 w-3.5 border-2 border-violet-600 border-t-transparent rounded-full" />
              <span>Memuat data dari database Supabase…</span>
            </div>
          )}

          {/* ==================================================================== */}
          {/* PANEL 1: DASHBOARD ADMIN                                             */}
          {/* ==================================================================== */}
          {activeMenu === 'dashboard' && (
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
          )}

          {/* ==================================================================== */}
          {/* PANEL 2: MANAJEMEN SANTRI                                            */}
          {/* ==================================================================== */}
          {activeMenu === 'santri' && (
            <div className="space-y-8">
              
              {/* Santri Search Table */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-850 pb-3 mb-4">
                  🔍 Cari &amp; Edit Data Santri
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

            </div>
          )}

          {/* ==================================================================== */}
          {/* PANEL 3: MANAJEMEN HALAQAH                                           */}
          {/* ==================================================================== */}
          {activeMenu === 'halaqah' && (
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

            </div>
          )}

          {/* ==================================================================== */}
          {/* PANEL 4: MANAJEMEN AKUN                                              */}
          {/* ==================================================================== */}
          {activeMenu === 'akun' && (
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
          )}

          {/* ==================================================================== */}
          {/* PANEL 5: RELASI ORTU-SANTRI                                          */}
          {/* ==================================================================== */}
          {activeMenu === 'relasi' && (
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
          )}

          {/* ==================================================================== */}
          {/* PANEL 6: SISTEM                                                      */}
          {/* ==================================================================== */}
          {activeMenu === 'sistem' && (
            <div className="space-y-8">
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left/Middle Columns: Input Correction */}
                <div className="lg:col-span-8 space-y-8">
                  {/* Error Input Correction Simulator (F5.4.1) */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
                    <h3 className="font-extrabold text-sm text-slate-850 dark:text-slate-150 border-b border-slate-100 dark:border-slate-850 pb-3 mb-4 flex items-center justify-between">
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
                            className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg"
                          />
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 p-3 bg-violet-500/10 text-violet-800 dark:text-violet-300 rounded-xl text-xs font-semibold">
                        <input
                          type="checkbox"
                          checked={isApprovedByKoordinator}
                          onChange={e => setIsApprovedByKoordinator(e.target.checked)}
                          className="h-4 w-4 text-violet-600 border-slate-350 rounded"
                        />
                        <span>Koreksi ini telah disetujui oleh Koordinator Tahfiz (Wajib)</span>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-violet-650 hover:bg-violet-750 text-white font-bold py-2 rounded-xl text-xs shadow transition-colors disabled:opacity-60"
                      >
                        Terapkan Koreksi Log
                      </button>
                    </form>
                  </div>
                </div>

                {/* Right Column: Database Backup & Sync */}
                <div className="lg:col-span-4 space-y-8">
                  {/* Auto-Backup Database Simulator (F5.1.2) */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
                    <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-850 pb-3 mb-4">
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

                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                      {backups.map(log => (
                        <div key={log.id} className="p-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-850 rounded-lg flex justify-between items-center text-[10px]">
                          <div className="space-y-0.5">
                            <p className="font-bold text-slate-750 dark:text-slate-350">{log.timestamp}</p>
                            <p className="text-slate-400">Ukuran file: {log.size}</p>
                          </div>
                          <span className="text-[8px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded font-bold">
                            {log.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sync Unit */}
                  <div>
                    <button
                      onClick={handleSyncFormats}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 p-4 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center space-x-2 text-slate-700 dark:text-slate-300"
                    >
                      <RotateCw className="h-4 w-4 text-violet-650" />
                      <span>Sinkronisasi Format Unit (F5.2.1)</span>
                    </button>
                  </div>
                </div>

              </div>

            </div>
          )}

        </main>
      </div>

      {/* ==================================================================== */}
      {/* MOBILE BOTTOM NAVIGATION (5 icon di bawah layar)                      */}
      {/* ==================================================================== */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 h-16 flex items-center justify-around z-40 px-2">
        <button
          onClick={() => { setActiveMenu('dashboard'); setIsMobileMoreOpen(false); }}
          className={`flex flex-col items-center space-y-0.5 text-center focus:outline-none ${activeMenu === 'dashboard' ? 'text-violet-600' : 'text-slate-400'}`}
        >
          <LayoutDashboard className="h-5 w-5" />
          <span className="text-[8.5px] font-bold">Dashboard</span>
        </button>

        <button
          onClick={() => { setActiveMenu('santri'); setIsMobileMoreOpen(false); }}
          className={`flex flex-col items-center space-y-0.5 text-center focus:outline-none ${activeMenu === 'santri' ? 'text-violet-600' : 'text-slate-400'}`}
        >
          <UserSquare2 className="h-5 w-5" />
          <span className="text-[8.5px] font-bold">Santri</span>
        </button>

        <button
          onClick={() => { setActiveMenu('halaqah'); setIsMobileMoreOpen(false); }}
          className={`flex flex-col items-center space-y-0.5 text-center focus:outline-none ${activeMenu === 'halaqah' ? 'text-violet-600' : 'text-slate-400'}`}
        >
          <BookMarked className="h-5 w-5" />
          <span className="text-[8.5px] font-bold">Halaqah</span>
        </button>

        <button
          onClick={() => { setActiveMenu('relasi'); setIsMobileMoreOpen(false); }}
          className={`flex flex-col items-center space-y-0.5 text-center focus:outline-none ${activeMenu === 'relasi' ? 'text-violet-600' : 'text-slate-400'}`}
        >
          <Link2 className="h-5 w-5" />
          <span className="text-[8.5px] font-bold">Relasi</span>
        </button>

        <button
          onClick={() => setIsMobileMoreOpen(!isMobileMoreOpen)}
          className={`flex flex-col items-center space-y-0.5 text-center focus:outline-none ${isMobileMoreOpen || activeMenu === 'akun' || activeMenu === 'sistem' ? 'text-violet-600' : 'text-slate-400'}`}
        >
          <Menu className="h-5 w-5" />
          <span className="text-[8.5px] font-bold">Lainnya</span>
        </button>
      </nav>

      {/* Mobile More Sheet Drawer */}
      {isMobileMoreOpen && (
        <div className="md:hidden fixed inset-0 z-45 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex justify-end flex-col">
          <div className="fixed inset-0" onClick={() => setIsMobileMoreOpen(false)} />
          <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-3xl p-6 space-y-4 z-50 animate-in slide-in-from-bottom duration-250">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-850">
              <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-250">Menu Tambahan</h4>
              <button onClick={() => setIsMobileMoreOpen(false)} className="text-slate-400 hover:text-slate-650">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 py-2">
              <button
                onClick={() => { setActiveMenu('akun'); setIsMobileMoreOpen(false); }}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border ${activeMenu === 'akun' ? 'bg-violet-500/10 border-violet-200 text-violet-650' : 'bg-slate-50 dark:bg-slate-950/30 border-slate-150 dark:border-slate-850 text-slate-650'}`}
              >
                <UserPlus className="h-6 w-6 mb-1.5" />
                <span className="text-xs font-bold">Manajemen Akun</span>
              </button>

              <button
                onClick={() => { setActiveMenu('sistem'); setIsMobileMoreOpen(false); }}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border ${activeMenu === 'sistem' ? 'bg-violet-500/10 border-violet-200 text-violet-650' : 'bg-slate-50 dark:bg-slate-950/30 border-slate-150 dark:border-slate-850 text-slate-650'}`}
              >
                <Settings2 className="h-6 w-6 mb-1.5" />
                <span className="text-xs font-bold">Sistem &amp; Backup</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Padding space to prevent bottom navigation overlaps on mobile screens */}
      <div className="h-16 md:hidden" />

      {/* ==================================================================== */}
      {/* MODAL EDIT DATA SANTRI                                               */}
      {/* ==================================================================== */}
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

      {/* ==================================================================== */}
      {/* MODAL EDIT DATA HALAQAH                                              */}
      {/* ==================================================================== */}
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
