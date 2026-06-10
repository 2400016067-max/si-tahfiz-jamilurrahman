'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Send, MessageSquare } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Santri, Pesan } from '@/types/tahfiz';

interface PesanPanelProps {
  pesans: Pesan[];
  activeStudents: Santri[];
  selectedSantri: Santri | null;
  pengampuDbId: string;
  isLoading: boolean;
  onSelectSantri: (student: Santri) => void;
  onDataChanged: () => void;
}

export default function PesanPanel({
  pesans,
  activeStudents,
  selectedSantri,
  pengampuDbId,
  isLoading,
  onSelectSantri,
  onDataChanged,
}: PesanPanelProps) {
  const [chatInput, setChatInput] = useState<string>('');

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSantri || !chatInput.trim()) return;

    const { error } = await supabase.from('pesan').insert({
      santri_id:     selectedSantri.id,
      pengirim_id:   pengampuDbId,
      tipe_pengirim: 'pengampu',
      konten:        chatInput.trim(),
    });

    if (error) {
      toast.error('Gagal mengirim pesan: ' + error.message);
      return;
    }

    setChatInput('');
    onDataChanged();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col h-[600px]">
        <h3 className="font-bold text-slate-805 dark:text-slate-100 border-b border-slate-150 dark:border-slate-800 pb-3 mb-3">Pilih Chat Orang Tua</h3>
        <div className="overflow-y-auto flex-grow divide-y divide-slate-100 dark:divide-slate-800/50 pr-1">
          {activeStudents.map(student => {
            const isSelected = selectedSantri?.id === student.id;
            const parentMsgCount = pesans.filter(p => p.santriId === student.id && p.sender === 'orangtua' && !p.sudahDibaca).length;
            const studentMsgs = pesans.filter(p => p.santriId === student.id);
            const lastMsg = studentMsgs.length > 0 ? studentMsgs[studentMsgs.length - 1] : null;
            return (
              <button
                key={student.id}
                onClick={() => onSelectSantri(student)}
                className={`w-full text-left p-3 my-1 rounded-xl transition-all flex items-center justify-between ${isSelected ? 'bg-emerald-50 dark:bg-emerald-950/20 border-l-4 border-emerald-500' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'}`}
              >
                <div className="flex-1 min-w-0 pr-2">
                  <h4 className="font-bold text-sm text-slate-850 dark:text-slate-200 truncate">{student.nama}</h4>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">Wali: {student.parentName || 'Orang Tua'}</p>
                  {lastMsg && <p className="text-[10px] text-slate-450 dark:text-slate-500 truncate mt-1 italic">{lastMsg.sender === 'pengampu' ? 'Anda: ' : 'Wali: '}{lastMsg.content}</p>}
                </div>
                {parentMsgCount > 0 && <span className="bg-emerald-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold">{parentMsgCount}</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="lg:col-span-8 flex flex-col h-[600px]">
        {selectedSantri ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col h-full shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-b border-slate-150 dark:border-slate-800 p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-9 w-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-extrabold shadow-md">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-805 dark:text-slate-105">Wali dari {selectedSantri.nama}</h3>
                  <p className="text-[10px] text-slate-500">No. HP: {selectedSantri.parentPhone || '-'} · Wali: {selectedSantri.parentName || '-'}</p>
                </div>
              </div>
            </div>

            <div className="flex-grow overflow-y-auto p-4 space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
              {pesans.filter(p => p.santriId === selectedSantri.id).length > 0 ? (
                pesans.filter(p => p.santriId === selectedSantri.id).map(p => {
                  const isMe = p.sender === 'pengampu';
                  return (
                    <div key={p.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl p-3 text-xs shadow-sm ${isMe ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100'}`}>
                        <p className="font-semibold text-[9px] opacity-75 uppercase mb-1">{isMe ? 'Anda' : 'Orang Tua'}</p>
                        <p className="leading-relaxed">{p.content}</p>
                        <span className="text-[8px] opacity-50 block text-right mt-1">{p.timestamp.slice(11, 16)}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">Belum ada pesan terkirim. Kirim pesan pertama untuk memulai komunikasi.</div>
              )}
            </div>

            <form onSubmit={handleSendMessage} className="p-4 flex items-center space-x-2 bg-slate-50 dark:bg-slate-900">
              <input
                type="text"
                placeholder="Ketik catatan atau saran perbaikan untuk orang tua..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                className="flex-grow text-xs p-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-905 rounded-lg focus:outline-none focus:border-emerald-500"
              />
              <button type="submit" disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-lg transition-colors">
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center h-full shadow-sm">
            <MessageSquare className="h-12 w-12 text-slate-350 mb-3" />
            <h4 className="font-bold text-slate-705 dark:text-slate-200">Silakan pilih chat</h4>
            <p className="text-xs text-slate-450 dark:text-slate-400 mt-1 max-w-sm">Pilih salah satu profil santri di sebelah kiri untuk membuka percakapan.</p>
          </div>
        )}
      </div>
    </div>
  );
}
