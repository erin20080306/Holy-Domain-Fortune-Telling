import { useNavigate } from 'react-router-dom';
import shiya from '../assets/shiya.svg';

// 命理探索開場 / 進入聖域 / 專屬引路人
export function OpeningScreen() {
  const nav = useNavigate();
  return (
    <div className="app-shell">
      <h1 className="brand-title">MYSTIC</h1>
      <p className="brand-sub">命理探索．進入聖域</p>

      <img
        className="hero-img hero-zoom"
        src={shiya}
        width={320}
        height={400}
        alt="AI 命理引路人司夜 Shiya"
        loading="eager"
        decoding="async"
      />

      <div className="glass-card">
        <h3 style={{ marginTop: 0, color: 'var(--gold-bright)' }}>專屬引路人：司夜</h3>
        <p className="muted">
          塔羅、八字、紫微、星座與 AI 命理老師，陪你整理每日方向與人生節奏。
        </p>
        <div className="spacer" />
        <button className="btn" onClick={() => nav('/auth?mode=register')}>
          進入聖域
        </button>
        <div className="spacer" />
        <button className="btn ghost" onClick={() => nav('/auth?mode=login')}>
          登入星域
        </button>
      </div>
    </div>
  );
}
