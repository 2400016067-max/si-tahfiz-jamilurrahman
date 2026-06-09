'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  GraduationCap, 
  Lock, 
  Loader2, 
  CheckCircle, 
  AlertTriangle 
} from 'lucide-react';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [checking, setChecking] = useState(true);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // 1. Listen for Supabase PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setIsValidSession(true);
        }
      }
    );

    // 2. Set timeout of 3 seconds for checking indicator
    const timer = setTimeout(() => {
      setChecking(false);
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Password tidak cocok');
      return;
    }
    if (password.length < 8) {
      setError('Password minimal 8 karakter');
      return;
    }

    setLoading(true);
    setError('');
    const { error: resetError } = await supabase.auth.updateUser({ password });
    if (resetError) {
      setError(resetError.message);
    } else {
      setDone(true);
      setTimeout(() => {
        window.location.href = '/login';
      }, 3000);
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/10 text-slate-800 dark:text-slate-100 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/55 border border-emerald-200 dark:border-emerald-800/60 rounded-full text-emerald-700 dark:text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-3">
            <GraduationCap className="h-4 w-4" />
            <span>Sistem Informasi Tahfiz</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-indigo-600 dark:from-emerald-400 dark:to-indigo-400">
            MTs TQ Jamilurrahman
          </h2>
          <p className="text-slate-450 dark:text-slate-400 text-xs mt-1">
            Silakan atur ulang kata sandi akun Anda
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl overflow-hidden p-6 md:p-8">
          
          {/* View 1: Done state */}
          {done ? (
            <div className="text-center py-6 space-y-4">
              <div className="inline-flex p-3 bg-emerald-100 dark:bg-emerald-950/35 text-emerald-600 dark:text-emerald-400 rounded-full">
                <CheckCircle className="h-10 w-10 animate-bounce" />
              </div>
              <h3 className="text-base font-bold text-slate-850 dark:text-slate-100">Password Berhasil Diubah!</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Kata sandi baru telah disimpan. Mengalihkan ke halaman login...
              </p>
              <div className="flex justify-center pt-2">
                <Loader2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 animate-spin" />
              </div>
            </div>
          ) : (
            <>
              {/* View 2: Checking state (loading) */}
              {checking && !isValidSession ? (
                <div className="text-center py-8 space-y-4">
                  <Loader2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400 animate-spin mx-auto" />
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Memverifikasi sesi pemulihan kata sandi...
                  </p>
                </div>
              ) : (
                <>
                  {/* View 3: Invalid session state */}
                  {!isValidSession ? (
                    <div className="text-center py-6 space-y-4">
                      <div className="inline-flex p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-full">
                        <AlertTriangle className="h-10 w-10 text-red-500" />
                      </div>
                      <h3 className="text-base font-bold text-slate-850 dark:text-slate-100">Tautan Tidak Valid</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-450 leading-relaxed">
                        Tautan pemulihan kata sandi tidak valid atau sudah kadaluarsa. Silakan minta reset password ulang dari halaman login.
                      </p>
                      <button
                        onClick={() => { window.location.href = '/login'; }}
                        className="w-full mt-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-colors"
                      >
                        Kembali ke Login
                      </button>
                    </div>
                  ) : (
                    /* View 4: Valid form */
                    <form onSubmit={handleReset} className="space-y-4">
                      <div className="mb-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                        <h3 className="text-sm font-extrabold text-slate-850 dark:text-slate-100">Atur Password Baru</h3>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                          Masukkan sandi baru minimal 8 karakter.
                        </p>
                      </div>

                      {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start space-x-2 text-red-700 dark:text-red-400 text-xs font-semibold">
                          <AlertTriangle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                          <span>{error}</span>
                        </div>
                      )}

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1.5">Password Baru</label>
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
                            disabled={loading}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:focus:ring-emerald-400/20 transition-all text-slate-800 dark:text-slate-100"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1.5">Konfirmasi Password</label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                            <Lock className="h-4 w-4" />
                          </span>
                          <input
                            type="password"
                            required
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            disabled={loading}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:focus:ring-emerald-400/20 transition-all text-slate-800 dark:text-slate-100"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md hover:shadow-lg focus:outline-none transition-all flex justify-center items-center space-x-2 disabled:opacity-60"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Menyimpan Password...</span>
                          </>
                        ) : (
                          <span>Simpan Password Baru</span>
                        )}
                      </button>
                    </form>
                  )}
                </>
              )}
            </>
          )}

        </div>

      </div>
    </main>
  );
}
