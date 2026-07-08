import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { serverEnv } from './env.js';

let cached: SupabaseClient | null = null;

// Service-role client. RLS-bypassing; MUST only ever run on the server.
export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  if (!serverEnv.supabaseUrl || !serverEnv.supabaseServiceRoleKey) {
    throw new Error('Supabase server credentials are not configured.');
  }
  cached = createClient(
    serverEnv.supabaseUrl,
    serverEnv.supabaseServiceRoleKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return cached;
}
