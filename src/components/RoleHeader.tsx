'use client';

import React from 'react';
import Link from 'next/link';
import { BookOpen, RefreshCw, ArrowLeft } from 'lucide-react';
import { resetAllData } from '@/lib/store';

interface RoleHeaderProps {
  roleName: string;
  activeRole: 'pengampu' | 'orangtua' | 'koordinator' | 'kepalasekolah' | 'stafftu';
}

export default function RoleHeader({ roleName, activeRole }: RoleHeaderProps) {
  const handleReset = () => {
    if (confirm('Apakah Anda yakin ingin mereset semua data localStorage ke data awal mock?')) {
      resetAllData();
      alert('Data telah direset. Halaman akan dimuat ulang.');
      window.location.reload();
    }
  };

  const badgeStyles: Record<string, string> = {
    pengampu: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
    orangtua: 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800',
    koordinator: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800',
    kepalasekolah: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
    stafftu: 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800',
  };

  return (
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
            <Link 
              href="/"
              className="inline-flex items-center px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Kembali ke Portal
            </Link>
            <button
              onClick={handleReset}
              title="Reset data ke bawaan"
              className="inline-flex items-center p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-xs font-semibold ml-1.5">Reset Data</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
