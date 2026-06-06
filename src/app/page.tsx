'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  BookOpen, 
  GraduationCap, 
  Users, 
  Home, 
  UserCheck, 
  ShieldAlert, 
  BarChart3, 
  Settings, 
  CheckCircle,
  AlertTriangle,
  FolderLock
} from 'lucide-react';
import { getSantriList, getHalaqahList, getSetoranList } from '@/lib/store';

export default function PortalPage() {
  const [stats, setStats] = useState({
    totalSantri: 0,
    totalHalaqah: 0,
    setoranHariIni: 0,
    stagnantSantri: 0
  });

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load fresh statistics from localStorage
    const updateStats = () => {
      const santri = getSantriList();
      const halaqahs = getHalaqahList();
      const setorans = getSetoranList();
      
      const todayStr = new Date().toISOString().split('T')[0];
      const todaySetorans = setorans.filter(s => s.date === todayStr).length;
      const stagnant = santri.filter(s => s.status === 'stagnant').length;

      setStats({
        totalSantri: santri.length,
        totalHalaqah: halaqahs.length,
        setoranHariIni: todaySetorans,
        stagnantSantri: stagnant
      });
    };

    updateStats();
    
    // Listen for custom store updates
    window.addEventListener('tahfiz_storage_update', updateStats);
    return () => window.removeEventListener('tahfiz_storage_update', updateStats);
  }, []);

  const roles = [
    {
      title: 'Pengampu / Murobbi',
      desc: 'Pencatatan setoran harian (Sabak & Sabki) langsung di halaqah (10-12 santri) dan input evaluasi harian.',
      href: '/pengampu',
      icon: UserCheck,
      color: 'from-emerald-500 to-green-600',
      shadow: 'hover:shadow-emerald-500/20',
      badge: 'Ustadz / Ustadzah'
    },
    {
      title: 'Orang Tua / Wali',
      desc: 'Pantau setoran harian anak, beri persetujuan digital program Manzil (murojaah rumah), dan bertukar pesan.',
      href: '/orangtua',
      icon: Home,
      color: 'from-teal-500 to-cyan-600',
      shadow: 'hover:shadow-teal-500/20',
      badge: 'Orang Tua'
    },
    {
      title: 'Koordinator Tahfiz',
      desc: 'Kelola klasifikasi grade (Tahsin, Takmil, Tahfiz), intervensi santri stuck/stagnan, dan verifikasi UKJ.',
      href: '/koordinator',
      icon: ShieldAlert,
      color: 'from-indigo-500 to-blue-600',
      shadow: 'hover:shadow-indigo-500/20',
      badge: 'Supervisor'
    },
    {
      title: 'Kepala & Komite Sekolah',
      desc: 'Pantau grafik perkembangan program makro, bandingkan performa grade, dan akses modul ajar ber-HAKI.',
      href: '/kepalasekolah',
      icon: BarChart3,
      color: 'from-amber-500 to-orange-600',
      shadow: 'hover:shadow-amber-500/20',
      badge: 'Manajerial'
    },
    {
      title: 'Staf Tata Usaha (TU)',
      desc: 'Kelola hak akses/personel, sinkronisasi format pelaporan harian, pencarian cepat, dan backup database.',
      href: '/stafftu',
      icon: Settings,
      color: 'from-violet-500 to-purple-600',
      shadow: 'hover:shadow-violet-500/20',
      badge: 'Administratif'
    }
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/10 text-slate-800 dark:text-slate-100 flex flex-col justify-between">
      
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-grow flex flex-col justify-center">
        
        {/* Brand / Title */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/55 border border-emerald-200 dark:border-emerald-800/60 rounded-full text-emerald-700 dark:text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-4 animate-pulse">
            <GraduationCap className="h-4 w-4" />
            <span>Prototype / Simulasi Interaktif</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 dark:from-emerald-400 dark:via-teal-400 dark:to-indigo-400">
            Sistem Informasi Tahfiz
          </h1>
          <p className="text-xl md:text-2xl font-bold mt-2 text-slate-700 dark:text-slate-300">
            MTs TQ Jamilurrahman
          </p>
          <p className="max-w-2xl mx-auto text-slate-500 dark:text-slate-400 text-sm md:text-base mt-4 leading-relaxed">
            Silakan pilih salah satu peran (role) di bawah ini untuk mengakses dashboard prototype. Semua data disimpan di localStorage browser Anda secara real-time dan tersinkronisasi antar-role.
          </p>
        </div>

        {/* Live Stats */}
        {mounted && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto w-full mb-12">
            <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-center space-x-4 shadow-sm backdrop-blur-sm">
              <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Santri</p>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{stats.totalSantri}</p>
              </div>
            </div>

            <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-center space-x-4 shadow-sm backdrop-blur-sm">
              <div className="p-3 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Kelompok Halaqah</p>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{stats.totalHalaqah}</p>
              </div>
            </div>

            <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-center space-x-4 shadow-sm backdrop-blur-sm">
              <div className="p-3 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Setoran Hari Ini</p>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{stats.setoranHariIni}</p>
              </div>
            </div>

            <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-center space-x-4 shadow-sm backdrop-blur-sm">
              <div className="p-3 rounded-lg bg-red-500/10 text-red-650 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Santri Stagnan</p>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{stats.stagnantSantri}</p>
              </div>
            </div>
          </div>
        )}

        {/* Roles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto w-full">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <Link
                key={role.title}
                href={role.href}
                className={`group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${role.shadow} flex flex-col justify-between`}
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${role.color} text-white shadow-md`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md border border-slate-200 dark:border-slate-700">
                      {role.badge}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {role.title}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-2 leading-relaxed">
                    {role.desc}
                  </p>
                </div>
                <div className="mt-6 flex items-center text-xs font-bold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform">
                  <span>Masuk Dashboard &rarr;</span>
                </div>
              </Link>
            );
          })}
          
          {/* Direct File Link Card for Reference */}
          <div className="bg-slate-150/40 dark:bg-slate-950/40 border border-dashed border-slate-300 dark:border-slate-850 p-6 rounded-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 text-slate-400 mb-4">
                <FolderLock className="h-6 w-6" />
                <span className="text-[10px] uppercase font-bold tracking-wider bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">Dokumen</span>
              </div>
              <h3 className="text-lg font-bold text-slate-450">
                Dokumen Proyek
              </h3>
              <p className="text-slate-450 text-xs mt-2 leading-relaxed">
                Rujukan spesifikasi asli dapat diakses langsung pada file BRIEF.md dan dokumen analisis kebutuhan.
              </p>
            </div>
            <div className="mt-6 flex items-center space-x-2 text-xs font-semibold text-slate-450">
              <Link href="/BRIEF.md" className="hover:underline">BRIEF.md</Link>
              <span>·</span>
              <Link href="/Laporan_Fase1.pdf" className="hover:underline">Laporan</Link>
            </div>
          </div>
        </div>

      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-400 bg-white/50 dark:bg-slate-950/50">
        <p>Sistem Informasi Tahfiz MTs TQ Jamilurrahman &copy; 2026 — Kelompok 6 Praktikum Desain & Pengembangan SI</p>
      </footer>
    </main>
  );
}
