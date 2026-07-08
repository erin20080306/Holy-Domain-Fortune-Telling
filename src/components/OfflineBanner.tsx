import { USER_MESSAGES } from '@shared/productCopy';

export function OfflineBanner({ online }: { online: boolean }) {
  if (online) return null;
  return (
    <div
      style={{
        background: 'rgba(120,80,40,0.25)',
        border: '1px solid var(--card-border)',
        borderRadius: 14,
        padding: '10px 14px',
        margin: '0 0 14px',
        fontSize: 13,
        color: 'var(--text-dim)',
      }}
    >
      {USER_MESSAGES.offline}
    </div>
  );
}
