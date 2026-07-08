export type UserRole = 'user' | 'admin' | 'super_admin';

export interface ProfileRow {
  user_id: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  role: UserRole;
  created_at: string;
  last_login_at: string | null;
  login_count: number;
  last_login_ip: string | null;
  last_login_user_agent: string | null;
}
