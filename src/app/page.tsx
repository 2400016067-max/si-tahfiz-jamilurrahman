'use client';

import React, { useEffect } from 'react';
import { GraduationCap, Loader2 } from 'lucide-react';

const ROLE_REDIRECT_MAP: Record<string, string> = {
  pengampu: '/pengampu',
  orangtua: '/orangtua',
  koordinator: '/koordinator',
  kepala_sekolah: '/kepalasekolah',
  tata_usaha: '/stafftu',
};

export default function PortalPage() {
  useEffect(() => {
    // Read role cookie set by the login page
    const roleCookie = document.cookie
      .split(';')
      .find(row => row.trim().startsWith('sb-user-role='));
    const role = roleCookie?.split('=')?.[1]?.trim();

    // Also check if there's an access token — if no token at all, go to /login
    const tokenCookie = document.cookie
      .split(';')
      .find(row => row.trim().startsWith('sb-access-token='));
    const hasToken = !!tokenCookie?.split('=')?.[1]?.trim();

    if (!hasToken || !role) {
      window.location.replace('/login');
      return;
    }

    const destination = ROLE_REDIRECT_MAP[role];
    if (destination) {
      window.location.replace(destination);
    } else {
      // Unknown role — clear cookies and send to login
      document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      document.cookie = 'sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      document.cookie = 'sb-user-role=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      window.location.replace('/login');
    }
  }, []);

  // Render a fullscreen loading splash while the redirect is in progress
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/10 flex flex-col items-center justify-center gap-4 text-slate-600 dark:text-slate-400">
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <div className="p-4 rounded-2xl bg-emerald-500/10 dark:bg-emerald-400/10">
          <GraduationCap className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="text-xl font-extrabold tracking-tight text-slate-700 dark:text-slate-200">
          SI-TAHFIZ
        </h1>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Memeriksa sesi login…</span>
        </div>
      </div>
      <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-4">
        MTs TQ Jamilurrahman © 2026
      </p>
    </main>
  );
}
