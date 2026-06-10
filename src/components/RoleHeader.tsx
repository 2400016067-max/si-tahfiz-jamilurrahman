'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  BookOpen, 
  LogOut, 
  Settings, 
  Key, 
  X, 
  ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

import { RoleHeaderProps, UserProfile, RoleStats } from '@/types/tahfiz';

export default function RoleHeader({ roleName, activeRole }: RoleHeaderProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<RoleStats | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Edit Profile fields
  const [editNama, setEditNama] = useState('');
  const [editNoHp, setEditNoHp] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');

  // Password fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadUserProfileAndStats = useCallback(async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) return;

      const email = session.user.email;
      if (!email) return;

      // Fetch user profile
      const { data: dbUser, error: dbUserError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (dbUserError || !dbUser) return;
      
      setUser(dbUser);
      setEditNama(dbUser.nama_lengkap || '');
      setEditNoHp(dbUser.no_hp || '');
      setEditAvatarUrl(dbUser.avatar_url || '');

      // Load statistics based on activeRole
      if (activeRole === 'pengampu') {
        const { data: halaqahData } = await supabase
          .from('halaqah')
          .select('id, nama')
          .eq('pengampu_id', dbUser.id)
          .eq('is_active', true)
          .maybeSingle();

        if (halaqahData) {
          const { count } = await supabase
            .from('santri')
            .select('*', { count: 'exact', head: true })
            .eq('halaqah_id', halaqahData.id);

          setStats({
            halaqahNama: halaqahData.nama,
            jumlahSantri: count || 0
          });
        } else {
          setStats({
            halaqahNama: 'Tidak ada halaqah aktif',
            jumlahSantri: 0
          });
        }
      } else if (activeRole === 'orangtua') {
        const { data: kidsData } = await supabase
          .from('santri')
          .select('nama, grade')
          .eq('parent_user_id', dbUser.id);

        setStats({
          anakList: kidsData || []
        });
      } else if (activeRole === 'koordinator') {
        const { count: totalSantri } = await supabase
          .from('santri')
          .select('*', { count: 'exact', head: true });

        const { count: totalHalaqah } = await supabase
          .from('halaqah')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);

        const { count: totalStagnant } = await supabase
          .from('santri')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'stagnant');

        setStats({
          totalSantri: totalSantri || 0,
          totalHalaqah: totalHalaqah || 0,
          totalStagnant: totalStagnant || 0
        });
      } else if (activeRole === 'kepalasekolah') {
        const { count: totalSantri } = await supabase
          .from('santri')
          .select('*', { count: 'exact', head: true });

        const { count: totalUkjLulus } = await supabase
          .from('ujian_juz')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'lulus');

        setStats({
          totalSantri: totalSantri || 0,
          totalUkjLulus: totalUkjLulus || 0
        });
      } else if (activeRole === 'stafftu') {
        const { count: totalAkun } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true });

        const { count: totalHalaqah } = await supabase
          .from('halaqah')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);

        // Get last backup date from localStorage or use yesterday's auto-backup date
        const lastBackup = localStorage.getItem('last_backup_timestamp') || (() => {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          return yesterday.toISOString().split('T')[0] + ' 23:00:02';
        })();

        setStats({
          totalAkun: totalAkun || 0,
          totalHalaqah: totalHalaqah || 0,
          tanggalBackup: lastBackup
        });
      }

    } catch (err) {
      console.error('Error loading profile/stats:', err);
    }
  }, [activeRole]);

  useEffect(() => {
    // Check if the sb-access-token cookie exists
    const hasToken = document.cookie.split(';').some((item) => item.trim().startsWith('sb-access-token='));
    setIsLoggedIn(hasToken);
    
    if (hasToken) {
      loadUserProfileAndStats();
    }
  }, [activeRole, loadUserProfileAndStats]);

  const handleEditProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          nama_lengkap: editNama.trim(),
          no_hp: editNoHp.trim() || null,
          avatar_url: editAvatarUrl.trim() || null
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Profil berhasil diperbarui!');
      setIsEditModalOpen(false);
      await loadUserProfileAndStats();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui profil';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Password baru dan konfirmasi password tidak cocok.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password minimal 6 karakter.');
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success('Password berhasil diperbarui!');
      setIsPasswordModalOpen(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui password';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    if (confirm('Apakah Anda yakin ingin keluar dari sistem?')) {
      // Clear cookies
      document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      document.cookie = 'sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      document.cookie = 'sb-user-role=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.error('Sign out error', e);
      }
      
      alert('Anda telah keluar.');
      window.location.href = '/login';
    }
  };

  const getInitials = (name: string) => {
    if (!name) return '??';
    const cleanName = name.replace(/ustadz(ah)?|bapak|ibu|wali/gi, '').trim();
    const parts = cleanName.split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const roleBgStyles: Record<string, string> = {
    pengampu: 'bg-emerald-500 text-white',
    orangtua: 'bg-teal-500 text-white',
    koordinator: 'bg-indigo-500 text-white',
    kepalasekolah: 'bg-amber-500 text-white',
    stafftu: 'bg-violet-500 text-white',
  };

  const badgeStyles: Record<string, string> = {
    pengampu: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
    orangtua: 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800',
    koordinator: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800',
    kepalasekolah: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
    stafftu: 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800',
  };

  return (
    <>
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Link href="/" className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-bold text-lg hover:opacity-90 transition-opacity">
                <BookOpen className="h-6 w-6" />
                <span className="hidden md:inline font-extrabold tracking-tight">SI-TAHFIZ</span>
              </Link>
              <div className="flex items-center space-x-2">
                <span className="text-slate-400 text-sm hidden md:inline">|</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeStyles[activeRole] || 'bg-slate-100 text-slate-800 border-slate-200'}`}>
                  {roleName}
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              {isLoggedIn && (
                <>
                  {/* Existing Keluar button */}
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5 mr-1 text-red-500" />
                    <span>Keluar</span>
                  </button>

                  {/* Avatar & Profile Dropdown Container */}
                  <div className="relative">
                    <button
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className="flex items-center space-x-1 focus:outline-none hover:opacity-90 transition-opacity p-0.5"
                    >
                      {user?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                          src={user.avatar_url} 
                          alt={user.nama_lengkap || 'Avatar'} 
                          className="h-8 w-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-sm"
                        />
                      ) : (
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${roleBgStyles[activeRole] || 'bg-slate-300'}`}>
                          {getInitials(user?.nama_lengkap || '')}
                        </div>
                      )}
                      <ChevronDown className="h-3 w-3 text-slate-400 dark:text-slate-505" />
                    </button>

                    {/* Dropdown Card */}
                    {dropdownOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-40 cursor-default" 
                          onClick={() => setDropdownOpen(false)}
                        />
                        <div className="absolute right-0 mt-2.5 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-150">
                          {/* Profile Info Header */}
                          <div className="flex items-center space-x-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                            {user?.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img 
                                src={user.avatar_url} 
                                alt={user.nama_lengkap || 'Avatar'} 
                                className="h-10 w-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow"
                              />
                            ) : (
                              <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-extrabold shadow ${roleBgStyles[activeRole] || 'bg-slate-300'}`}>
                                {getInitials(user?.nama_lengkap || '')}
                              </div>
                            )}
                            <div className="text-left">
                              <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-100 line-clamp-1">
                                {user?.nama_lengkap || 'Loading...'}
                              </h4>
                              <p className="text-[10px] text-slate-450 font-semibold uppercase">
                                {roleName}
                              </p>
                              <p className="text-[9px] text-slate-400 font-mono">
                                {user?.no_hp || '-'}
                              </p>
                            </div>
                          </div>

                          {/* Specific Role Stats */}
                          <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-150/40 dark:border-slate-850/60 text-left">
                            <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                              Statistik Peran
                            </h5>
                            {activeRole === 'pengampu' && (
                              <div className="text-[11px] space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-slate-450">Halaqah:</span>
                                  <span className="font-semibold text-slate-700 dark:text-slate-350">{stats?.halaqahNama || '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-450">Jumlah Santri:</span>
                                  <span className="font-semibold text-slate-700 dark:text-slate-350">{stats?.jumlahSantri ?? 0} Anak</span>
                                </div>
                              </div>
                            )}
                            {activeRole === 'orangtua' && (
                              <div className="text-[11px] space-y-1.5">
                                {stats?.anakList && stats.anakList.length > 0 ? (
                                  <div className="space-y-1">
                                    {stats.anakList.map((kid: { nama: string; grade: string }, index: number) => (
                                      <div key={index} className="flex justify-between bg-white dark:bg-slate-900/60 px-2 py-1 rounded border border-slate-100 dark:border-slate-800/80">
                                        <span className="font-bold text-slate-750 dark:text-slate-350">{kid.nama}</span>
                                        <span className="text-slate-450 text-[10px]">{kid.grade}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-slate-450 italic text-[10px]">Belum ada anak terhubung</span>
                                )}
                              </div>
                            )}
                            {activeRole === 'koordinator' && (
                              <div className="text-[11px] space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-slate-450">Total Santri:</span>
                                  <span className="font-semibold text-slate-700 dark:text-slate-350">{stats?.totalSantri ?? 0}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-455">Total Halaqah:</span>
                                  <span className="font-semibold text-slate-700 dark:text-slate-350">{stats?.totalHalaqah ?? 0}</span>
                                </div>
                                <div className="flex justify-between text-amber-600 dark:text-amber-400">
                                  <span>Stagnasi:</span>
                                  <span className="font-semibold">{stats?.totalStagnant ?? 0} Santri</span>
                                </div>
                              </div>
                            )}
                            {activeRole === 'kepalasekolah' && (
                              <div className="text-[11px] space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-slate-450">Total Santri:</span>
                                  <span className="font-semibold text-slate-700 dark:text-slate-350">{stats?.totalSantri ?? 0}</span>
                                </div>
                                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                                  <span>UKJ Lulus:</span>
                                  <span className="font-semibold">{stats?.totalUkjLulus ?? 0} Juz</span>
                                </div>
                              </div>
                            )}
                            {activeRole === 'stafftu' && (
                              <div className="text-[11px] space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-slate-450">Total Akun:</span>
                                  <span className="font-semibold text-slate-700 dark:text-slate-350">{stats?.totalAkun ?? 0}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-455">Total Halaqah:</span>
                                  <span className="font-semibold text-slate-700 dark:text-slate-350">{stats?.totalHalaqah ?? 0}</span>
                                </div>
                                <div className="flex justify-between text-slate-500">
                                  <span>Backup Terakhir:</span>
                                  <span className="font-mono text-[9px]">{stats?.tanggalBackup || '-'}</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="space-y-1 text-xs">
                            <button
                              onClick={() => {
                                setDropdownOpen(false);
                                setIsEditModalOpen(true);
                              }}
                              className="w-full text-left flex items-center space-x-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg text-slate-700 dark:text-slate-300 font-semibold transition-colors"
                            >
                              <Settings className="h-3.5 w-3.5 text-slate-405" />
                              <span>Edit Profil</span>
                            </button>
                            <button
                              onClick={() => {
                                setDropdownOpen(false);
                                setIsPasswordModalOpen(true);
                              }}
                              className="w-full text-left flex items-center space-x-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg text-slate-700 dark:text-slate-300 font-semibold transition-colors"
                            >
                              <Key className="h-3.5 w-3.5 text-slate-405" />
                              <span>Ganti Password</span>
                            </button>
                            <button
                              onClick={() => {
                                setDropdownOpen(false);
                                handleLogout();
                              }}
                              className="w-full text-left flex items-center space-x-2 p-2 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 dark:hover:text-red-400 rounded-lg text-slate-700 dark:text-slate-300 font-semibold transition-colors"
                            >
                              <LogOut className="h-3.5 w-3.5 text-red-500" />
                              <span>Keluar</span>
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200 text-left">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                Edit Profil
              </h3>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-405 hover:text-slate-500 focus:outline-none"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEditProfile} className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  value={editNama}
                  onChange={e => setEditNama(e.target.value)}
                  required
                  className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Nomor HP
                </label>
                <input
                  type="tel"
                  value={editNoHp}
                  onChange={e => setEditNoHp(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Avatar URL (Foto Profil)
                </label>
                <input
                  type="text"
                  value={editAvatarUrl}
                  placeholder="https://example.com/avatar.jpg"
                  onChange={e => setEditAvatarUrl(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-55 dark:bg-slate-800 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-350 font-bold py-2 rounded-xl text-xs transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs transition-colors disabled:opacity-60"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200 text-left">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                Ganti Password
              </h3>
              <button 
                onClick={() => setIsPasswordModalOpen(false)}
                className="text-slate-405 hover:text-slate-500 focus:outline-none"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Password Baru
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  placeholder="Min. 6 karakter"
                  className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Konfirmasi Password Baru
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="flex-1 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-855 text-slate-700 dark:text-slate-350 font-bold py-2 rounded-xl text-xs transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-xl text-xs transition-colors disabled:opacity-60"
                >
                  {isSubmitting ? 'Memperbarui...' : 'Perbarui Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
