'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  GraduationCap, 
  Mail, 
  Lock, 
  ArrowRight, 
  AlertTriangle,
  Loader2,
  Info,
  CheckCircle,
  Sparkles
} from 'lucide-react';

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [namaLengkap, setNamaLengkap] = useState('');
  const [roleSelection, setRoleSelection] = useState('orangtua'); // default for new signups
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Check if session already exists on page mount.
  // IMPORTANT: must set cookies BEFORE redirecting so middleware can allow the route.
  // Without cookies, middleware sends user back to /login → infinite loop.
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return; // No active session — stay on /login

      try {
        const { data: dbUser } = await supabase
          .from('users')
          .select('role')
          .eq('email', session.user.email)
          .single();

        if (!dbUser?.role) return; // Role not found — stay on /login

        const redirectMap: Record<string, string> = {
          pengampu: '/pengampu',
          orangtua: '/orangtua',
          koordinator: '/koordinator',
          kepala_sekolah: '/kepalasekolah',
          tata_usaha: '/stafftu',
        };

        const redirectPath = redirectMap[dbUser.role];
        if (!redirectPath) return; // Unknown role — stay on /login

        // Set cookies so middleware recognises the session and allows the redirect
        const maxAge = session.expires_in || 3600;
        const isSecure = window.location.protocol === 'https:';
        document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=${maxAge}; SameSite=Lax${isSecure ? '; Secure' : ''}`;
        document.cookie = `sb-refresh-token=${session.refresh_token ?? ''}; path=/; max-age=604800; SameSite=Lax${isSecure ? '; Secure' : ''}`;
        document.cookie = `sb-user-role=${dbUser.role}; path=/; max-age=${maxAge}; SameSite=Lax${isSecure ? '; Secure' : ''}`;

        window.location.href = redirectPath;
      } catch (e) {
        // Session check failed — stay on /login, do nothing
        console.error('[login] checkSession error:', e);
      }
    };
    checkSession();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (!email || !password) {
        throw new Error('Email dan kata sandi harus diisi.');
      }

      // 1. Attempt login
      let { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // 2. Auto-register seed user if not found in Auth but exists in public.users
      if (signInError && (
        signInError.message.includes('Invalid login credentials') || 
        signInError.message.includes('Email not confirmed')
      )) {
        const { data: dbUser } = await supabase
          .from('users')
          .select('email, role')
          .eq('email', email)
          .single();

        if (dbUser) {
          // Register the seed user in Supabase Auth using the entered credentials
          const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                role: dbUser.role
              }
            }
          });

          if (signUpError) {
            throw new Error(`Pendaftaran otomatis gagal: ${signUpError.message}`);
          }

          // Retry sign in
          const retry = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (retry.error) {
            throw new Error(`Login gagal setelah registrasi otomatis: ${retry.error.message}`);
          }

          data = retry.data;
          signInError = null;
        } else {
          throw new Error('Email tidak terdaftar dalam sistem SI-TAHFIZ.');
        }
      } else if (signInError) {
        throw signInError;
      }

      if (!data || !data.session) {
        throw new Error('Gagal memproses sesi login.');
      }

      // 3. Fetch user details from public.users
      const { data: dbUser, error: roleError } = await supabase
        .from('users')
        .select('role')
        .eq('email', email)
        .single();

      if (roleError || !dbUser) {
        throw new Error('Pengguna tidak memiliki peran (role) yang terdaftar di database.');
      }

      const role = dbUser.role;

      // 4. Set session cookies manually for middleware
      const maxAge = data.session.expires_in || 3600;
      const isSecure = window.location.protocol === 'https:';
      document.cookie = `sb-access-token=${data.session.access_token}; path=/; max-age=${maxAge}; SameSite=Lax${isSecure ? '; Secure' : ''}`;
      document.cookie = `sb-refresh-token=${data.session.refresh_token}; path=/; max-age=604800; SameSite=Lax${isSecure ? '; Secure' : ''}`;
      document.cookie = `sb-user-role=${role}; path=/; max-age=${maxAge}; SameSite=Lax${isSecure ? '; Secure' : ''}`;

      // 5. Redirect to proper dashboard
      const redirectMap: Record<string, string> = {
        pengampu: '/pengampu',
        orangtua: '/orangtua',
        koordinator: '/koordinator',
        kepala_sekolah: '/kepalasekolah',
        tata_usaha: '/stafftu',
      };

      const redirectPath = redirectMap[role];
      if (redirectPath) {
        setSuccessMsg('Masuk berhasil! Mengalihkan...');
        window.location.href = redirectPath;
      } else {
        throw new Error('Peran akun tidak dikenali oleh sistem.');
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Terjadi kesalahan saat masuk.';
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (!email || !password || !namaLengkap) {
        throw new Error('Semua bidang formulir pendaftaran wajib diisi.');
      }

      if (password.length < 6) {
        throw new Error('Kata sandi minimal harus terdiri dari 6 karakter.');
      }

      // 1. Sign up in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            fullName: namaLengkap,
            role: roleSelection
          }
        }
      });

      if (authError) throw authError;

      if (!authData || !authData.user) {
        throw new Error('Gagal membuat pengguna di sistem autentikasi.');
      }

      // 2. Create profile in public.users table
      // We generate a UUID or let Supabase default it.
      // We map roles properly. For DB users, kepala_sekolah maps to 'kepala_sekolah' and tata_usaha to 'tata_usaha'.
      const roleMap: Record<string, string> = {
        pengampu: 'pengampu',
        orangtua: 'orangtua',
        koordinator: 'koordinator',
        kepalasekolah: 'kepala_sekolah',
        stafftu: 'tata_usaha'
      };

      const dbRole = roleMap[roleSelection] || roleSelection;

      const { error: dbError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email,
          nama_lengkap: namaLengkap,
          role: dbRole,
          password_hash: '$2b$10$placeholderHashForDevOnly.NewRegisteredUser',
          is_active: true
        });

      if (dbError) {
        // If DB insertion fails, we attempt to clean up or show warning
        throw new Error(`Pendaftaran DB gagal: ${dbError.message}`);
      }

      setSuccessMsg('Akun berhasil dibuat! Silakan pindah ke tab Masuk untuk login.');
      setActiveTab('signin');
      setPassword('');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Terjadi kesalahan saat mendaftar.';
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/10 text-slate-800 dark:text-slate-100 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        
        {/* Brand Header */}
        <div className="text-center mb-8 animate-fadeIn">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/55 border border-emerald-200 dark:border-emerald-800/60 rounded-full text-emerald-700 dark:text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-3">
            <GraduationCap className="h-4 w-4" />
            <span>Sistem Informasi Tahfiz</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-indigo-600 dark:from-emerald-400 dark:to-indigo-400">
            MTs TQ Jamilurrahman
          </h2>
          <p className="text-slate-450 dark:text-slate-400 text-xs mt-1">
            Gunakan kredensial Anda untuk masuk ke sistem dashboard
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl overflow-hidden backdrop-blur-md transition-all duration-300">
          
          {/* Tab Switcher */}
          <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
            <button
              onClick={() => { setActiveTab('signin'); setError(null); setSuccessMsg(null); }}
              className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider text-center transition-all ${activeTab === 'signin' ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500 bg-white dark:bg-slate-900' : 'text-slate-400 hover:text-slate-650 dark:hover:text-slate-300'}`}
            >
              Masuk
            </button>
            <button
              onClick={() => { setActiveTab('signup'); setError(null); setSuccessMsg(null); }}
              className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider text-center transition-all ${activeTab === 'signup' ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500 bg-white dark:bg-slate-900' : 'text-slate-400 hover:text-slate-650 dark:hover:text-slate-300'}`}
            >
              Daftar Baru
            </button>
          </div>

          <div className="p-6 md:p-8">
            
            {/* Status Messages */}
            {error && (
              <div className="mb-6 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center space-x-2 text-red-700 dark:text-red-400 text-xs font-semibold">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-6 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center space-x-2 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
                <CheckCircle className="h-4 w-4 shrink-0 text-emerald-550" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Login Form */}
            {activeTab === 'signin' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1.5">Email</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <Mail className="h-4 w-4" />
                    </span>
                    <input
                      type="email"
                      required
                      placeholder="nama@contoh.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:focus:ring-emerald-400/20 transition-all text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1.5">Kata Sandi</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <Lock className="h-4 w-4" />
                    </span>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:focus:ring-emerald-400/20 transition-all text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/40 active:scale-98 transition-all flex justify-center items-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Memproses Masuk...</span>
                    </>
                  ) : (
                    <>
                      <span>Masuk ke Dashboard</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Sign Up Form */}
            {activeTab === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1.5">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    placeholder="Nama Lengkap Anda"
                    value={namaLengkap}
                    onChange={(e) => setNamaLengkap(e.target.value)}
                    disabled={isLoading}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:focus:ring-emerald-400/20 transition-all text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1.5">Email</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <Mail className="h-4 w-4" />
                    </span>
                    <input
                      type="email"
                      required
                      placeholder="nama@contoh.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:focus:ring-emerald-400/20 transition-all text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1.5">Peran (Role)</label>
                  <select
                    value={roleSelection}
                    onChange={(e) => setRoleSelection(e.target.value)}
                    disabled={isLoading}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:focus:ring-emerald-400/20 transition-all text-slate-850 dark:text-slate-100"
                  >
                    <option value="pengampu">Pengampu / Murobbi</option>
                    <option value="orangtua">Orang Tua / Wali</option>
                    <option value="koordinator">Koordinator Tahfiz</option>
                    <option value="kepalasekolah">Kepala Sekolah / Komite</option>
                    <option value="stafftu">Staf Tata Usaha</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1.5">Kata Sandi</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <Lock className="h-4 w-4" />
                    </span>
                    <input
                      type="password"
                      required
                      placeholder="Minimal 6 karakter"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:focus:ring-emerald-400/20 transition-all text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/40 active:scale-98 transition-all flex justify-center items-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Memproses Pendaftaran...</span>
                    </>
                  ) : (
                    <>
                      <span>Daftar Sekarang</span>
                      <Sparkles className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Dev Helper Tips */}
            <div className="mt-8 pt-6 border-t border-slate-150 dark:border-slate-800/80">
              <div className="p-3.5 bg-emerald-500/5 dark:bg-emerald-400/5 border border-emerald-550/15 rounded-xl text-[11px] leading-relaxed text-emerald-800 dark:text-emerald-300">
                <div className="flex items-center space-x-1.5 font-bold mb-1">
                  <Info className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>💡 Tip Simulasi Dev / Uji Coba:</span>
                </div>
                <span>Semua email dari database awal (*seed*) di bawah ini didukung <strong>Registrasi Otomatis</strong>. Cukup masukkan email & password apa saja di tab <strong>Masuk</strong> untuk mendaftarkan akun di Supabase Auth dan login secara instan:</span>
                <ul className="mt-2 space-y-1 list-disc pl-4 font-mono text-[10px]">
                  <li>ahmad.fauzi@mts-tq.sch.id (Pengampu)</li>
                  <li>salman@parent.mts-tq.sch.id (Orang Tua)</li>
                  <li>aminah@mts-tq.sch.id (Pengampu)</li>
                </ul>
              </div>
            </div>

          </div>
        </div>

      </div>
    </main>
  );
}
