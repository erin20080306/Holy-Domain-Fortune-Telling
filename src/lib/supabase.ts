import { createClient } from '@supabase/supabase-js';
import { clientEnv } from './env';

// Public anon client. Never holds service-role keys.
export const supabase = createClient(
  clientEnv.supabaseUrl || 'https://placeholder.supabase.co',
  clientEnv.supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
