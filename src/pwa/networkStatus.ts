// Simple online/offline observer for the UI (offline banner, disabling actions).
export function subscribeNetworkStatus(cb: (online: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const on = () => cb(true);
  const off = () => cb(false);
  window.addEventListener('online', on);
  window.addEventListener('offline', off);
  cb(navigator.onLine);
  return () => {
    window.removeEventListener('online', on);
    window.removeEventListener('offline', off);
  };
}

export function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}
