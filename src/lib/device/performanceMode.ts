// Detects whether the low-performance mode should be active. Used to disable
// expensive animations / blur on old / low-memory / slow-network devices.

export type PerfPreference = 'auto' | 'on' | 'off';

const STORAGE_KEY = 'mystic.perfMode';

export function getPerfPreference(): PerfPreference {
  const v = (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY)) || 'auto';
  return v === 'on' || v === 'off' ? v : 'auto';
}

export function setPerfPreference(pref: PerfPreference): void {
  if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, pref);
}

function detectLowEndDevice(): boolean {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;

  const reducedMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) return true;

  const deviceMemory = (navigator as any).deviceMemory;
  if (typeof deviceMemory === 'number' && deviceMemory <= 4) return true;

  const cores = navigator.hardwareConcurrency;
  if (typeof cores === 'number' && cores <= 4) return true;

  const connection = (navigator as any).connection;
  const effectiveType: string | undefined = connection?.effectiveType;
  if (effectiveType && ['slow-2g', '2g', '3g'].includes(effectiveType)) return true;

  // Rough old-iOS heuristic (iPhone 8 / SE2 era and earlier).
  const ua = navigator.userAgent || '';
  const iosMatch = ua.match(/OS (\d+)_/);
  if (/iPhone|iPad/.test(ua) && iosMatch && Number(iosMatch[1]) < 15) return true;

  return false;
}

// Resolves the effective low-performance state given the user preference.
export function isLowPerformance(pref: PerfPreference = getPerfPreference()): boolean {
  if (pref === 'on') return true;
  if (pref === 'off') return false;
  return detectLowEndDevice();
}

// Applies / removes the `perf-low` class on <html> so CSS can react.
export function applyPerfClass(pref: PerfPreference = getPerfPreference()): boolean {
  const low = isLowPerformance(pref);
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('perf-low', low);
  }
  return low;
}
