'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Santri, Pesan } from '@/types/tahfiz';

interface PesanPanelProps {
  activeSantri: Santri | null;
  childPesans: Pesan[];
  parentUserIdMap: Record<string, string>;
  isLoading: boolean;
  onDataChanged: () => void;
}

export default function PesanPanel({
  activeSantri,
  childPesans,
  parentUserIdMap,
  isLoading,
  onDataChanged,
}: PesanPanelProps) {
  const [replyInput, setReplyInput] = useState<string>('');

  if (!activeSantri) return null;

  // ---------------------------------------------------------------------------
  // KIRIM PESAN — INSERT ke tabel pesan sebagai orangtua
  // ---------------------------------------------------------------------------
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSantri || !replyInput.trim()) return;

    // pengirim_id harus berisi UUID user valid (NOT NULL di schema)
    const parentUserId = parentUserIdMap[activeSantri.id];
    if (!parentUserId) {
      toast.error('Tidak dapat mengirim pesan: akun orang tua tidak ditemukan di database.');
      return;
    }

    const { error } = await supabase.from('pesan').insert({
      santri_id:     activeSantri.id,
      pengirim_id:   parentUserId,
      tipe_pengirim: 'orangtua',
      konten:        replyInput.trim(),
    });

    if (error) {
      toast.error('Gagal mengirim pesan: ' + error.message);
      return;
    }

    toast.success('Pesan berhasil dikirim.');
    setReplyInput('');
    onDataChanged();
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col h-[450px]">
      <h3 className="font-extrabold text-sm text-slate-805 dark:text-slate-100 border-b border-slate-105 dark:border-slate-800 pb-3 mb-4 flex items-center justify-between">
        <span>💬 Komunikasi Dua Arah dengan Ustadz</span>
        <span className="text-[10px] text-slate-450 font-medium">F2.4</span>
      </h3>

      <div className="flex-grow overflow-y-auto space-y-3 p-3 bg-slate-55 dark:bg-slate-905 rounded-xl border border-slate-150 dark:border-slate-800 mb-3 text-xs">
        {childPesans.length > 0 ? (
          childPesans.map((p) => {
            const isTeacher = p.sender === 'pengampu';
            return (
              <div key={p.id} className={`flex ${isTeacher ? 'justify-start' : 'justify-end'}`}>
                <div
                  className={`max-w-[80%] rounded-xl p-3 shadow-sm ${
                    isTeacher
                      ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-805 dark:text-slate-100 rounded-tl-none'
                      : 'bg-teal-600 text-white rounded-tr-none'
                  }`}
                >
                  <p className="font-semibold text-[8px] opacity-75 uppercase mb-1">
                    {isTeacher ? 'Ustadz' : 'Anda'}
                  </p>
                  <p className="leading-relaxed">{p.content}</p>
                  <span className="text-[7px] opacity-50 block text-right mt-1">
                    {p.timestamp.slice(11, 16)}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="h-full flex items-center justify-center text-slate-450 dark:text-slate-500">
            Belum ada obrolan terkirim. Kirim pesan ke ustadz jika anak memiliki kendala murajaah di rumah.
          </div>
        )}
      </div>

      <form onSubmit={handleSendReply} className="flex items-center space-x-2">
        <input
          type="text"
          placeholder="Laporkan kendala belajar anak di rumah..."
          value={replyInput}
          onChange={(e) => setReplyInput(e.target.value)}
          className="flex-grow text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:border-teal-500"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="bg-teal-650 hover:bg-teal-700 text-white p-2.5 rounded-lg transition-colors disabled:opacity-60"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
