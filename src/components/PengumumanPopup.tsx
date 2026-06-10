'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Megaphone, Check } from 'lucide-react';

import { Announcement } from '@/types/tahfiz';

export default function PengumumanPopup() {
  const [publicUserId, setPublicUserId] = useState<string | null>(null);
  const [unreadList, setUnreadList] = useState<Announcement[]>([]);
  const currentIdx = 0;
  const [loading, setLoading] = useState(true);
  const [senderNames, setSenderNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setLoading(false);
          return;
        }

        // Read user's role from sb-user-role cookie
        const getCookie = (name: string): string | null => {
          if (typeof window === 'undefined') return null;
          const value = `; ${window.document.cookie}`;
          const parts = value.split(`; ${name}=`);
          if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
          return null;
        };
        const userRole = getCookie('sb-user-role');

        if (!userRole) {
          setLoading(false);
          return;
        }

        // Query public user UUID by email
        const { data: dbUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', session.user.email)
          .single();

        if (!dbUser) {
          setLoading(false);
          return;
        }
        setPublicUserId(dbUser.id);

        // Fetch all announcements
        const { data: annData } = await supabase
          .from('pengumuman')
          .select('*')
          .order('created_at', { ascending: true });

        // Fetch already read logs for this user using public users UUID
        const { data: readData } = await supabase
          .from('pengumuman_dibaca')
          .select('pengumuman_id')
          .eq('user_id', dbUser.id);

        // Fetch all users to map sender names
        const { data: usersData } = await supabase
          .from('users')
          .select('id, nama_lengkap');

        const nameMap: Record<string, string> = {};
        if (usersData) {
          usersData.forEach(u => {
            nameMap[u.id] = u.nama_lengkap;
          });
        }
        setSenderNames(nameMap);

        if (annData) {
          // Filter announcements targeted to user role
          const targeted = annData.filter(ann => ann.target_role && ann.target_role.includes(userRole));
          // Filter out read ones
          const readIds = new Set((readData ?? []).map(r => r.pengumuman_id));
          const unread = targeted.filter(ann => !readIds.has(ann.id));
          setUnreadList(unread);
        }
      } catch (err) {
        console.error('Gagal menginisialisasi pengumuman:', err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const handleMarkAsRead = async () => {
    if (unreadList.length === 0 || !publicUserId) return;
    const currentAnn = unreadList[currentIdx];

    try {
      const { error } = await supabase
        .from('pengumuman_dibaca')
        .insert({
          pengumuman_id: currentAnn.id,
          user_id: publicUserId,
        });

      if (error) throw error;

      // Filter out the current read announcement from the state list
      setUnreadList(prev => prev.filter(item => item.id !== currentAnn.id));
    } catch (err) {
      console.error('Gagal menandai pengumuman dibaca:', err);
    }
  };

  if (loading || unreadList.length === 0) return null;

  const currentAnn = unreadList[0]; // always show the first unread announcement

  // Human-readable sender role
  const roleLabelMap: Record<string, string> = {
    koordinator: 'Koordinator Tahfiz',
    kepala_sekolah: 'Kepala Sekolah / Komite',
    tata_usaha: 'Staf Tata Usaha',
  };
  const senderRoleLabel = roleLabelMap[currentAnn.pengirim_role] || currentAnn.pengirim_role;
  const senderName = senderNames[currentAnn.pengirim_id] || 'Staf';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col space-y-4 animate-in zoom-in-95 duration-200">
        
        {/* Background glow design */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -z-10 animate-pulse" />
        
        {/* Header */}
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-950/45 text-emerald-600 dark:text-emerald-400 rounded-2xl animate-bounce">
            <Megaphone className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
              <span>Pengumuman Baru</span>
            </h3>
            {unreadList.length > 1 && (
              <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full font-bold">
                1 dari {unreadList.length} pengumuman
              </span>
            )}
          </div>
        </div>

        {/* Content Box */}
        <div className="space-y-2 py-1">
          <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 border-l-2 border-emerald-500 pl-2">
            {currentAnn.judul}
          </h4>
          <div className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed max-h-[180px] overflow-y-auto pr-1 bg-slate-50/50 dark:bg-slate-950/30 p-3 rounded-xl border border-slate-100 dark:border-slate-850">
            {currentAnn.isi}
          </div>
        </div>

        {/* Metadata Footer */}
        <div className="flex flex-col space-y-0.5 border-t border-slate-100 dark:border-slate-850 pt-3 text-[10px] text-slate-400">
          <p>
            Pengirim: <strong className="text-slate-650 dark:text-slate-200">{senderName}</strong> <span className="italic">({senderRoleLabel})</span>
          </p>
          <p>
            Diterbitkan: {new Date(currentAnn.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={handleMarkAsRead}
          className="w-full py-2.5 bg-gradient-to-r from-emerald-650 to-teal-600 hover:from-emerald-550 hover:to-teal-500 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all shadow-md active:scale-98"
        >
          <Check className="h-4 w-4" />
          <span>Saya Mengerti</span>
        </button>

      </div>
    </div>
  );
}
