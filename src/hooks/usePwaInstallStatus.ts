import { useEffect, useState, useCallback } from 'react';
import {
  hasNativePrompt,
  isAndroid,
  isIos,
  isStandalone,
  onPromptChange,
  triggerInstall,
  wasInstalled,
} from '../pwa/pwaInstallPrompt';

const IOS_DISMISS_KEY = 'mystic.iosInstallDismissed';
const BANNER_DISMISS_KEY = 'mystic.installBannerDismissed';

export interface PwaInstallStatus {
  isStandalone: boolean;
  isIos: boolean;
  isAndroid: boolean;
  canShowNativePrompt: boolean;
  shouldShowIosInstallGuide: boolean;
  shouldShowInstallBanner: boolean;
  promptInstall: () => Promise<boolean>;
  dismissInstallBanner: () => void;
}

export function usePwaInstallStatus(): PwaInstallStatus {
  const [, force] = useState(0);
  const rerender = useCallback(() => force((n) => n + 1), []);

  useEffect(() => onPromptChange(rerender), [rerender]);

  const standalone = isStandalone();
  const ios = isIos();
  const android = isAndroid();
  const canNative = hasNativePrompt();

  const iosDismissed = readFlag(IOS_DISMISS_KEY);
  const bannerDismissed = readFlag(BANNER_DISMISS_KEY);

  const shouldShowIosInstallGuide = !standalone && ios && !iosDismissed;
  const shouldShowInstallBanner =
    !standalone &&
    !wasInstalled() &&
    !bannerDismissed &&
    (canNative || (ios && !iosDismissed));

  const promptInstall = useCallback(async () => {
    const accepted = await triggerInstall();
    if (!accepted) writeFlag(BANNER_DISMISS_KEY);
    rerender();
    return accepted;
  }, [rerender]);

  const dismissInstallBanner = useCallback(() => {
    writeFlag(BANNER_DISMISS_KEY);
    if (ios) writeFlag(IOS_DISMISS_KEY);
    rerender();
  }, [ios, rerender]);

  return {
    isStandalone: standalone,
    isIos: ios,
    isAndroid: android,
    canShowNativePrompt: canNative,
    shouldShowIosInstallGuide,
    shouldShowInstallBanner,
    promptInstall,
    dismissInstallBanner,
  };
}

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}
function writeFlag(key: string): void {
  try {
    localStorage.setItem(key, '1');
  } catch {
    /* ignore */
  }
}
