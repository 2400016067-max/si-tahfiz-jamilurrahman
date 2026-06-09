import React from 'react';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { Cog, ShieldAlert, ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function MaintenancePage() {
  const cookieStore = cookies();
  const userRole = cookieStore.get('sb-user-role')?.value;
  const isStaffTU = userRole === 'tata_usaha';

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/25 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/15 flex flex-col items-center justify-center p-4 text-center">
      <div className="max-w-md w-full bg-white dark:bg-slate-900/65 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl shadow-xl backdrop-blur-md flex flex-col items-center">
        
        {/* Animated Icon */}
        <div className="p-4 rounded-3xl bg-emerald-500/10 dark:bg-emerald-400/10 mb-6 relative">
          <Cog 
            className="h-12 w-12 text-emerald-600 dark:text-emerald-400 animate-spin" 
            style={{ animationDuration: '8s' }}
          />
          <ShieldAlert className="h-5 w-5 text-emerald-500 dark:text-emerald-400 absolute -bottom-1 -right-1 bg-white dark:bg-slate-905 rounded-full" />
        </div>

        {/* School Name */}
        <p className="text-xs font-bold tracking-widest text-emerald-650 dark:text-emerald-400 uppercase mb-2">
          MTs TQ Jamilurrahman
        </p>

        {/* Title */}
        <h1 className="text-xl font-extrabold text-slate-850 dark:text-slate-100 tracking-tight mb-3">
          Sistem Sedang dalam Pemeliharaan
        </h1>

        {/* Subtitle */}
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
          Mohon tunggu, kami sedang melakukan peningkatan sistem. Silakan coba beberapa saat lagi.
        </p>

        {/* Conditional button for Staff TU */}
        {isStaffTU ? (
          <Link
            href="/stafftu"
            className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-750 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-lg shadow-emerald-500/10 transition-all mb-4"
          >
            <span>Kembali ke Dashboard</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <div className="w-full h-px bg-slate-150 dark:bg-slate-800 mb-6" />
        )}

        {/* Footer Contact Info */}
        <p className="text-[10px] text-slate-400 dark:text-slate-550">
          Hubungi Tata Usaha jika membutuhkan bantuan segera.
        </p>
      </div>

      <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-6">
        SI-TAHFIZ MTs TQ Jamilurrahman © 2026
      </p>
    </main>
  );
}
