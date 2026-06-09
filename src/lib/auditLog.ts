import { supabase } from '@/lib/supabase';

interface AuditParams {
  userId: string;
  namaUser: string;
  aksi: string;
  targetTabel?: string;
  targetId?: string;
  detail?: Record<string, string | number | boolean | null | undefined>;
}

export async function logAudit(params: AuditParams) {
  try {
    await supabase.from('audit_log').insert({
      user_id: params.userId,
      nama_user: params.namaUser,
      aksi: params.aksi,
      target_tabel: params.targetTabel || null,
      target_id: params.targetId || null,
      detail: params.detail || null
    });
  } catch (err) {
    // Jangan throw error — audit log gagal
    // tidak boleh mengganggu operasi utama
    console.error('Audit log gagal:', err);
  }
}
