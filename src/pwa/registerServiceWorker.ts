import { registerSW } from 'virtual:pwa-register';
import { clientEnv } from '../lib/env';

export interface SwHandlers {
  onNeedRefresh?: () => void;
  onOfflineReady?: () => void;
  autoReloadOnUpdate?: boolean | (() => boolean);
}

// Registers the service worker in production only. In dev we never force SW
// registration so hot-reload and API calls are never intercepted/cached.
export function registerServiceWorker(handlers: SwHandlers = {}): (() => void) | undefined {
  if (!clientEnv.pwa.enabled) return undefined;
  if (import.meta.env.DEV) return undefined;
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return undefined;

  let updateStarted = false;
  const applyUpdate = () => {
    if (updateStarted) return;
    updateStarted = true;
    void updateSW(true);
  };

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh: () => {
      handlers.onNeedRefresh?.();
      const shouldAutoReload =
        typeof handlers.autoReloadOnUpdate === 'function'
          ? handlers.autoReloadOnUpdate()
          : handlers.autoReloadOnUpdate !== false;
      if (shouldAutoReload) {
        window.setTimeout(applyUpdate, 250);
      }
    },
    onOfflineReady: () => handlers.onOfflineReady?.(),
  });

  // Returns a function that activates the waiting SW and reloads.
  return applyUpdate;
}
