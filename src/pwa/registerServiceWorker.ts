import { registerSW } from 'virtual:pwa-register';
import { clientEnv } from '../lib/env';

export interface SwHandlers {
  onNeedRefresh?: () => void;
  onOfflineReady?: () => void;
}

// Registers the service worker in production only. In dev we never force SW
// registration so hot-reload and API calls are never intercepted/cached.
export function registerServiceWorker(handlers: SwHandlers = {}): (() => void) | undefined {
  if (!clientEnv.pwa.enabled) return undefined;
  if (import.meta.env.DEV) return undefined;
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return undefined;

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh: () => handlers.onNeedRefresh?.(),
    onOfflineReady: () => handlers.onOfflineReady?.(),
  });

  // Returns a function that activates the waiting SW and reloads.
  return () => {
    void updateSW(true);
  };
}
