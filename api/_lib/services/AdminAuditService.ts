import { getSupabaseAdmin } from '../supabaseAdmin';

// Every admin mutation must be recorded here for accountability.
export async function writeAuditLog(params: {
  adminUserId: string;
  targetUserId?: string | null;
  action: string;
  before?: unknown;
  after?: unknown;
  note?: string | null;
}): Promise<void> {
  const admin = getSupabaseAdmin();
  await admin.from('admin_audit_logs').insert({
    admin_user_id: params.adminUserId,
    target_user_id: params.targetUserId ?? null,
    action: params.action,
    before_json: params.before ?? null,
    after_json: params.after ?? null,
    note: params.note ?? null,
  });
}
