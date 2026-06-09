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
  CheckCircle,
  Calendar,
  Megaphone,
  ChevronLeft
} from 'lucide-react';

interface Berita {
  id: string;
  judul: string;
  isi: string;
  is_aktif: boolean;
  dibuat_oleh: string | null;
  created_at: string;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState<number>(0);

  // Forgot Password States
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [beritaList, setBeritaList] = useState<Berita[]>([]);

  // Check if session already exists, manage lockout timer, and fetch news on page mount.
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) return; // No active session — stay on /login

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

    // Fetch Berita (public/anon)
    const fetchBerita = async () => {
      try {
        const { data } = await supabase
          .from('berita')
          .select('*')
          .eq('is_aktif', true)
          .order('created_at', { ascending: false })
          .limit(5);
        if (data) {
          setBeritaList(data);
        }
      } catch (err) {
        console.error('Error fetching berita:', err);
      }
    };
    fetchBerita();

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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setError(null);
    try {
      if (!forgotEmail) {
        throw new Error('Email harus diisi.');
      }
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: 'https://si-tahfiz-jamilurrahman.vercel.app/reset-password',
      });
      if (resetError) throw resetError;
      setForgotSent(true);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Gagal mengirim link reset password.';
      setError(errMsg);
    } finally {
      setForgotLoading(false);
    }
  };

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
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
      
      {/* LEFT COLUMN: NEWS & INFO */}
      <div className="hidden lg:flex lg:w-3/4 bg-gradient-to-br from-green-900 to-green-700 p-8 lg:p-12 flex-col justify-between text-white relative overflow-hidden">
        {/* Background decorative blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full filter blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full filter blur-3xl translate-y-1/3 -translate-x-1/3" />
        
        {/* Top Header */}
        <div>
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3.5 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
              <GraduationCap className="h-8 w-8 text-emerald-300" />
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-black tracking-tight">
                Selamat Datang di Layanan Tahfidz
              </h1>
              <p className="text-xs text-emerald-300 font-extrabold tracking-widest uppercase mt-0.5">
                MTs TQ Jamilurrahman Yogyakarta
              </p>
            </div>
          </div>

          {/* News section */}
          <div className="mt-8 space-y-6 flex-1 overflow-y-auto max-h-[65vh] pr-2">
            <h3 className="text-sm font-black uppercase tracking-wider border-b border-white/15 pb-2.5 flex items-center space-x-2 text-white/90">
              <Megaphone className="h-4 w-4 text-emerald-300 shrink-0 animate-pulse" />
              <span>Pengumuman &amp; Berita Terbaru</span>
            </h3>
            {beritaList.length === 0 ? (
              <p className="text-xs text-white/55 italic">Belum ada pengumuman saat ini.</p>
            ) : (
              <div className="space-y-4">
                {beritaList.map((berita) => (
                  <div key={berita.id} className="p-5 bg-white/10 backdrop-blur-md border border-white/5 rounded-2xl shadow-sm hover:bg-white/15 transition-all duration-300">
                    <h4 className="font-extrabold text-sm text-white mb-1.5">{berita.judul}</h4>
                    <p className="text-xs text-white/80 leading-relaxed line-clamp-4 mb-3">{berita.isi}</p>
                    <div className="flex items-center space-x-1.5 text-[9px] text-white/45 font-semibold">
                      <Calendar className="h-3 w-3 text-emerald-350" />
                      <span>
                        {new Date(berita.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-[10px] text-white/40 border-t border-white/10 pt-4 flex justify-between items-center">
          <span>SI-TAHFIZ MTs TQ Jamilurrahman</span>
          <span>Yogyakarta, Indonesia © 2026</span>
        </div>
      </div>

      {/* RIGHT COLUMN: LOGIN FORM / FORGOT PASSWORD */}
      <div className="w-full lg:w-1/4 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col justify-center p-6 lg:p-8 relative">
        
        {/* Brand header on mobile only */}
        <div className="lg:hidden text-center mb-8">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/55 border border-emerald-200 dark:border-emerald-800/60 rounded-full text-emerald-700 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-wider mb-2">
            <GraduationCap className="h-3.5 w-3.5" />
            <span>Sistem Informasi Tahfiz</span>
          </div>
          <h2 className="text-xl font-black tracking-tight text-slate-850 dark:text-slate-100">
            MTs TQ Jamilurrahman
          </h2>
        </div>

        <div className="w-full max-w-sm mx-auto space-y-6">
          
          {/* Status Messages */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start space-x-2 text-red-700 dark:text-red-400 text-xs font-semibold">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-start space-x-2 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-550 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {lockoutTimeLeft > 0 && !showForgotPassword && (
            <div className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-850 rounded-xl flex items-start space-x-2 text-orange-750 dark:text-orange-400 text-xs font-semibold animate-pulse">
              <AlertTriangle className="h-4 w-4 shrink-0 text-orange-500 mt-0.5" />
              <span>Terlalu banyak percobaan. Coba lagi dalam {lockoutTimeLeft}s</span>
            </div>
          )}

          {/* FORGOT PASSWORD FORM */}
          {showForgotPassword ? (
            <div className="space-y-4">
              <div className="mb-2">
                <h3 className="text-lg font-black text-slate-850 dark:text-slate-100">Reset Password</h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Masukkan email terdaftar untuk menerima tautan reset password.
                </p>
              </div>

              {forgotSent ? (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-3">
                  <p className="text-xs text-emerald-800 dark:text-emerald-350 leading-relaxed font-medium">
                    Link reset password telah dikirim ke email Anda. Silakan cek inbox atau folder spam.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setForgotSent(false);
                      setForgotEmail('');
                    }}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center space-x-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Kembali ke Halaman Login</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1.5">Email Akun</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                        <Mail className="h-4 w-4" />
                      </span>
                      <input
                        type="email"
                        required
                        placeholder="nama@contoh.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        disabled={forgotLoading}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:focus:ring-emerald-400/20 transition-all text-slate-800 dark:text-slate-100 disabled:opacity-60"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md hover:shadow-lg focus:outline-none transition-all flex justify-center items-center space-x-2 disabled:opacity-60"
                  >
                    {forgotLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Mengirim Link...</span>
                      </>
                    ) : (
                      <span>Kirim Link Reset</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setError(null);
                    }}
                    className="w-full py-2.5 text-center text-xs font-bold text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-350 transition-colors"
                  >
                    Kembali ke Login
                  </button>
                </form>
              )}
            </div>
          ) : (
            /* LOGIN FORM */
            <div className="space-y-4">
              <div className="mb-2">
                <h3 className="text-lg font-black text-slate-850 dark:text-slate-100">Silakan Masuk</h3>
                <p className="text-[11px] text-slate-450 dark:text-slate-500 mt-0.5">
                  Masukkan detail kredensial Anda untuk mengakses dashboard.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1.5">Email</label>
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
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Kata Sandi</label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPassword(true);
                        setError(null);
                      }}
                      className="text-[10px] font-extrabold text-emerald-650 hover:text-emerald-750 dark:text-emerald-400 transition-colors"
                    >
                      Lupa Password?
                    </button>
                  </div>
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
                  className="w-full mt-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md hover:shadow-lg focus:outline-none transition-all flex justify-center items-center space-x-2 disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Memproses Masuk...</span>
                    </>
                  ) : lockoutTimeLeft > 0 ? (
                    <span>Terkunci... Coba lagi dalam {lockoutTimeLeft}s</span>
                  ) : (
                    <>
                      <span>Masuk ke Dashboard</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Footer text */}
              <p className="text-slate-400 dark:text-slate-500 text-[10px] text-center mt-6 leading-relaxed">
                Belum punya akun? <br />
                <span className="font-semibold text-slate-500 dark:text-slate-450">Hubungi Staff Tata Usaha.</span>
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
