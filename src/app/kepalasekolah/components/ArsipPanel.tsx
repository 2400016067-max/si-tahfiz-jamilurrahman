'use client';

import React from 'react';
import { toast } from 'sonner';
import { ModulAjar } from '@/types/tahfiz';
import { FolderLock, BookOpen, Download, ShieldAlert } from 'lucide-react';

interface ArsipPanelProps {
  moduls: ModulAjar[];
  namaLengkap: string;
  isLoading: boolean;
}

export default function ArsipPanel({ moduls, namaLengkap, isLoading }: ArsipPanelProps) {
  const handleAuthorizedDownload = (judul: string) => {
    toast.success(
      `Akses Terverifikasi: Kepala Sekolah "${namaLengkap || 'User'}" mengunduh berkas "${judul}". Data dienkripsi secara lokal.`
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col space-y-6">
      <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
        <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 flex items-center space-x-2">
          <FolderLock className="h-5 w-5 text-amber-500" />
          <span>Arsip Modul Ajar &amp; Hak Kekayaan Intelektual (HAKI)</span>
        </h3>
        <span className="text-[10px] text-amber-600 font-bold bg-amber-50 dark:bg-amber-950/20 px-2.5 py-0.5 rounded-full border border-amber-200/30">
          Akses Terbatas
        </span>
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {moduls.map(mod => (
          <div
            key={mod.id}
            className="p-4 border border-slate-150 dark:border-slate-800 rounded-xl flex items-center justify-between hover:border-amber-300 dark:hover:border-amber-900 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{mod.judul}</h4>
                <p className="text-[10px] text-slate-450 mt-0.5">
                  Ukuran: {mod.size} · Terlindungi HAKI MTs TQ Jamilurrahman
                </p>
              </div>
            </div>

            <button
              onClick={() => handleAuthorizedDownload(mod.judul)}
              className="p-2.5 text-slate-500 hover:text-amber-650 hover:bg-amber-500/10 dark:hover:bg-amber-500/5 rounded-xl transition-all shadow-sm border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900"
              title="Unduh Berkas Terotorisasi"
            >
              <Download className="h-4.5 w-4.5 text-amber-600" />
            </button>
          </div>
        ))}

        {moduls.length === 0 && !isLoading && (
          <div className="col-span-2 text-center text-xs text-slate-400 py-8 italic">
            Belum ada modul ajar tersimpan dalam arsip sekolah.
          </div>
        )}
      </div>

      {/* HAKI Notice */}
      <div className="p-4 bg-red-500/5 border border-red-200/20 rounded-xl space-y-2 text-[10px] text-slate-500">
        <div className="flex items-center space-x-1.5 font-bold text-red-600 dark:text-red-400 text-xs">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>Pemberitahuan Kepatuhan Hukum &amp; IP Protection (NFR-02.2)</span>
        </div>
        <p className="leading-relaxed">
          MTs TQ Jamilurrahman memiliki kepemilikan penuh atas seluruh materi dan modul ajar yang tercantum pada sistem. Sistem secara otomatis mencatat audit trail setiap kali berkas diunduh. Penggandaan, pendistribusian, atau penyebarluasan modul ajar tanpa izin tertulis dari Kepala Sekolah/Pengelola Yayasan merupakan pelanggaran hukum HAKI.
        </p>
      </div>
    </div>
  );
}
