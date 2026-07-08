import { usePwaInstallStatus } from '../hooks/usePwaInstallStatus';

// Android: uses beforeinstallprompt. iOS: shows manual Add-to-Home-Screen guide.
// Hidden entirely when already running standalone.
export function InstallBanner() {
  const pwa = usePwaInstallStatus();

  if (pwa.isStandalone) return null;
  if (!pwa.shouldShowInstallBanner) return null;

  const isIosGuide = pwa.isIos && !pwa.canShowNativePrompt;

  return (
    <div className="banner">
      <div className="glass-card" role="dialog" aria-live="polite">
        {isIosGuide ? (
          <>
            <h4 style={{ margin: '0 0 8px' }}>加入 iPhone 主畫面</h4>
            <p className="muted" style={{ margin: '0 0 14px' }}>
              請點 Safari 下方分享按鈕，選擇「加入主畫面」，即可像 App 一樣開啟 MYSTIC。
            </p>
            <button className="btn" onClick={pwa.dismissInstallBanner}>
              我知道了
            </button>
          </>
        ) : (
          <>
            <h4 style={{ margin: '0 0 8px' }}>安裝 MYSTIC 到手機桌面</h4>
            <p className="muted" style={{ margin: '0 0 14px' }}>
              下次可以像 App 一樣快速開啟，不需要重新搜尋網址。
            </p>
            <div className="row">
              <button className="btn" onClick={() => void pwa.promptInstall()}>
                安裝
              </button>
              <button className="btn ghost" onClick={pwa.dismissInstallBanner}>
                稍後再說
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
