import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '../state/AuthContext';

// 分屏佈局：右/上為引路人展示區，左/下為內容功能區。全域頂部導航含首頁與登出。
export function SplitLayout({
  children,
  showLogout = false,
  showBack = true,
}: {
  children: ReactNode;
  showLogout?: boolean;
  showBack?: boolean;
}) {
  const nav = useNavigate();
  const { signOut } = useAuth();

  const logout = async () => {
    await signOut();
    nav('/');
  };

  return (
    <div className="h-[100dvh] w-full bg-[#050508] text-slate-200 font-sans selection:bg-[#A89882]/30 overflow-hidden flex flex-col md:flex-row relative">
      {/* 全域頂部導航 */}
      <header className="absolute top-0 left-0 w-full p-6 z-50 flex justify-between items-center pointer-events-none">
        <div
          className="flex items-center gap-3 cursor-pointer pointer-events-auto"
          onClick={() => nav('/')}
        >
          <h1 className="text-lg font-light tracking-[0.4em] text-white drop-shadow-md flex items-center gap-2">
            MYSTIC
            <span className="text-[9px] text-white/50 tracking-widest mt-1">首頁 HOME</span>
          </h1>
        </div>
        <div className="flex items-center gap-4 pointer-events-auto">
          {showLogout && (
            <button
              onClick={() => void logout()}
              className="text-white/60 hover:text-[#A89882] tracking-[0.2em] text-[10px] transition-colors flex items-center gap-2 border border-white/10 px-4 py-2 rounded-full backdrop-blur-md bg-black/20"
            >
              登出 LOGOUT
            </button>
          )}
          <div className="w-10 h-10 rounded-full flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:opacity-70 transition-opacity">
            <div className="h-px w-6 bg-white shadow-sm"></div>
            <div className="h-px w-4 bg-white shadow-sm"></div>
          </div>
        </div>
      </header>

      {/* 右半部 / 手機上半部：引路人展示區 */}
      <div className="w-full h-[45dvh] md:h-full md:w-[45%] lg:w-[50%] relative flex items-end justify-center pointer-events-none z-10 md:order-2 shrink-0 bg-gradient-to-b from-transparent to-[#050508]/50 md:bg-none">
        <div className="absolute bottom-10 w-[70%] h-[60%] bg-amber-500/20 blur-[80px] rounded-full animate-[pulse-gold_4s_ease-in-out_infinite] z-0"></div>
        <img
          src="/guide.png"
          alt="引路人"
          onError={(e) => {
            const img = e.currentTarget;
            if (!img.src.endsWith('/guide.svg')) img.src = '/guide.svg';
          }}
          className="w-full h-[90%] md:h-[85%] object-contain object-bottom animate-[floatY_5s_ease-in-out_infinite] relative z-10 drop-shadow-2xl"
        />
        <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-[#050508] to-transparent md:hidden z-20"></div>
      </div>

      {/* 左半部 / 手機下半部：內容功能區 */}
      <div className="w-full h-[55dvh] md:h-full md:w-[55%] lg:w-[50%] overflow-y-auto z-20 md:order-1 relative custom-scrollbar">
        {showBack && (
          <button
            onClick={() => nav(-1)}
            className="absolute top-20 left-6 z-30 w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 hover:bg-white/10 hover:text-[#A89882] transition-colors group"
            aria-label="回到上一頁"
          >
            <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          </button>
        )}
        <div className="min-h-full flex flex-col justify-center p-6 md:p-12 lg:p-16 pt-4 md:pt-24 pb-20">
          {children}
        </div>
      </div>
    </div>
  );
}
