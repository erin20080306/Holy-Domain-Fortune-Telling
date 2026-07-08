import { getSupabaseAdmin } from './supabaseAdmin';
import { serverEnv } from './env';
import { getHeader, type ApiRequest } from './http';
import type { UserRole } from './types';

export interface AuthedUser {
  userId: string;
  email: string;
  role: UserRole;
}

// Verifies the Supabase JWT from the Authorization header. NEVER trusts a
// user_id sent in the body/query. Returns null when unauthenticated.
export async function getAuthedUser(req: ApiRequest): Promise<AuthedUser | null> {
  const authHeader = getHeader(req, 'authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;

  const email = (data.user.email ?? '').toLowerCase();

  // Ensure a profile exists and resolve role. ADMIN_EMAILS are promoted to
  // super_admin on the server side - never via a frontend check.
  const { data: profile } = await admin
    .from('user_profiles')
    .select('role')
    .eq('user_id', data.user.id)
    .maybeSingle();

  let role: UserRole = (profile?.role as UserRole) ?? 'user';
  if (serverEnv.adminEmails.includes(email) && role !== 'super_admin') {
    role = 'super_admin';
    await admin
      .from('user_profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('user_id', data.user.id);
  }

  return { userId: data.user.id, email, role };
}

export function isAdmin(user: AuthedUser | null): user is AuthedUser {
  return !!user && (user.role === 'admin' || user.role === 'super_admin');
}

export function isSuperAdmin(user: AuthedUser | null): user is AuthedUser {
  return !!user && user.role === 'super_admin';
}
