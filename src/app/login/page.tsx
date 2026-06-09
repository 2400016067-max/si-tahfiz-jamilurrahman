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
  CheckCircle
} from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState<number>(0);

  // Check if session already exists and manage lockout timer on page mount.
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

    // Check and handle lockout timer
    const checkLockout = () => {
      const lockedUntil = Number(localStorage.getItem('login_locked_until') || '0');
      const now = Date.now();
      if (lockedUntil > now) {
        const secondsLeft = Math.ceil((lockedUntil - now) / 1000);
        setLockoutTimeLeft(secondsLeft);
      } else {
        setLockoutTimeLeft(0);
        if (lockedUntil > 0) {
          // Lockout has passed, reset attempts
          localStorage.setItem('login_attempts', '0');
          localStorage.removeItem('login_locked_until');
        }
      }
    };

    checkLockout();

    const interval = setInterval(() => {
      const lockedUntil = Number(localStorage.getItem('login_locked_until') || '0');
      const now = Date.now();
      if (lockedUntil > now) {
        const secondsLeft = Math.ceil((lockedUntil - now) / 1000);
        setLockoutTimeLeft(secondsLeft);
      } else {
        setLockoutTimeLeft(0);
        if (localStorage.getItem('login_locked_until')) {
          localStorage.setItem('login_attempts', '0');
          localStorage.removeItem('login_locked_until');
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    const lockedUntil = Number(localStorage.getItem('login_locked_until') || '0');
    if (lockedUntil > Date.now()) {
      setError('Terlalu banyak percobaan. Silakan coba lagi nanti.');
      setIsLoading(false);
      return;
    }

    try {
      if (!email || !password) {
        throw new Error('Email dan kata sandi harus diisi.');
      }

      // 1. Attempt login
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      if (!data || !data.session) {
        throw new Error('Gagal memproses sesi login.');
      }

      // 2. Fetch user details from public.users
      const { data: dbUser, error: roleError } = await supabase
        .from('users')
        .select('role')
        .eq('email', email)
        .single();

      if (roleError || !dbUser) {
        throw new Error('Pengguna tidak memiliki peran (role) yang terdaftar di database.');
      }

      const role = dbUser.role;

      // 3. Set session cookies manually for middleware
      const maxAge = data.session.expires_in || 3600;
      const isSecure = window.location.protocol === 'https:';
      document.cookie = `sb-access-token=${data.session.access_token}; path=/; max-age=${maxAge}; SameSite=Lax${isSecure ? '; Secure' : ''}`;
      document.cookie = `sb-refresh-token=${data.session.refresh_token}; path=/; max-age=604800; SameSite=Lax${isSecure ? '; Secure' : ''}`;
      document.cookie = `sb-user-role=${role}; path=/; max-age=${maxAge}; SameSite=Lax${isSecure ? '; Secure' : ''}`;

      // Reset login attempts on success
      localStorage.removeItem('login_attempts');
      localStorage.removeItem('login_locked_until');

      // 4. Redirect to proper dashboard
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
      // Record failed attempt in localStorage
      const attempts = Number(localStorage.getItem('login_attempts') || '0') + 1;
      localStorage.setItem('login_attempts', attempts.toString());

      if (attempts % 3 === 0) {
        const cycle = Math.floor(attempts / 3);
        const waitSeconds = cycle <= 2 
          ? 30 
          : 30 * Math.pow(2, cycle - 2);

        const lockTime = Date.now() + waitSeconds * 1000;
        localStorage.setItem('login_locked_until', lockTime.toString());
        setLockoutTimeLeft(waitSeconds);
        setError(`Terlalu banyak percobaan. Coba lagi dalam ${waitSeconds} detik.`);
      } else {
        const errMsg = err instanceof Error ? err.message : 'Terjadi kesalahan saat masuk.';
        setError(errMsg);
      }
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

            {lockoutTimeLeft > 0 && (
              <div className="mb-6 p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-850 rounded-xl flex items-center space-x-2 text-orange-750 dark:text-orange-400 text-xs font-semibold animate-pulse">
                <AlertTriangle className="h-4 w-4 shrink-0 text-orange-500" />
                <span>Terlalu banyak percobaan. Coba lagi dalam {lockoutTimeLeft}s</span>
              </div>
            )}

            {/* Login Form */}
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
                    disabled={isLoading || lockoutTimeLeft > 0}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:focus:ring-emerald-400/20 transition-all text-slate-800 dark:text-slate-100 disabled:opacity-60"
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
                    disabled={isLoading || lockoutTimeLeft > 0}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:focus:ring-emerald-400/20 transition-all text-slate-800 dark:text-slate-100 disabled:opacity-60"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || lockoutTimeLeft > 0}
                className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/40 active:scale-98 transition-all flex justify-center items-center space-x-2 disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Memproses Masuk...</span>
                  </>
                ) : lockoutTimeLeft > 0 ? (
                  <>
                    <span>Terkunci... Coba lagi dalam {lockoutTimeLeft}s</span>
                  </>
                ) : (
                  <>
                    <span>Masuk ke Dashboard</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* Footer Text */}
            <p className="text-slate-400 dark:text-slate-500 text-[11px] text-center mt-6">
              Belum punya akun? Hubungi Staff Tata Usaha untuk mendaftarkan akun Anda.
            </p>

          </div>
        </div>

      </div>
    </main>
  );
}
