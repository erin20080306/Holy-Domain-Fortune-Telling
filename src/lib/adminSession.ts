// Lightweight admin session flag. The hardcoded super-admin login does not
// create a Supabase session, so we mark admin access here to let RequireAuth
// allow the admin into the function area without a real auth token.
const KEY = 'mystic_admin_session';

export const setAdminSession = () => {
  try {
    sessionStorage.setItem(KEY, '1');
  } catch {
    // ignore storage failures (private mode etc.)
  }
};

export const clearAdminSession = () => {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
};

export const isAdminSession = (): boolean => {
  try {
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
};
