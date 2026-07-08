import { UPDATE_COPY } from '../pwa/pwaUpdatePrompt';

// Shown when a new service worker version is waiting. Non-intrusive; does not
// interrupt any form the user is filling in.
export function UpdateBanner({
  visible,
  onUpdate,
}: {
  visible: boolean;
  onUpdate: () => void;
}) {
  if (!visible) return null;
  return (
    <div className="banner">
      <div className="glass-card" role="alert">
        <h4 style={{ margin: '0 0 8px' }}>{UPDATE_COPY.title}</h4>
        <p className="muted" style={{ margin: '0 0 14px' }}>
          {UPDATE_COPY.body}
        </p>
        <button className="btn" onClick={onUpdate}>
          {UPDATE_COPY.button}
        </button>
      </div>
    </div>
  );
}
