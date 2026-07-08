import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

// 引導對話區：專屬引路人，進入功能區前的過場。
export function GuideScreen() {
  const nav = useNavigate();
  return (
    <div className="flex flex-col items-center md:items-start text-center md:text-left animate-[fadeIn_0.8s_ease-out]">
      <p className="text-[#A89882] tracking-[0.3em] text-[10px] mb-6 flex flex-col md:flex-row gap-2 items-center md:items-start">
        <span>專屬引路人</span>
        <span className="opacity-50">EXCLUSIVE GUIDE</span>
      </p>
      <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif text-white tracking-widest leading-relaxed mb-10 drop-shadow-lg">
        「命運的羅盤已啟動，
        <br />
        請隨我進入未知的星軌。」
      </h2>
      <button
        onClick={() => nav('/auth?mode=login')}
        className="px-8 py-4 bg-transparent border border-[#A89882]/50 text-white rounded-full hover:bg-[#A89882] hover:text-[#050508] transition-all duration-500 flex items-center gap-3 group"
      >
        <span className="tracking-[0.2em] text-sm flex flex-col items-start leading-tight">
          <span>進入功能區</span>
          <span className="text-[8px] opacity-70">ENTER MENU</span>
        </span>
        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
}
