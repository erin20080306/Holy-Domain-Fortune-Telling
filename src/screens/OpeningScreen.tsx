import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function OpeningScreen() {
  const nav = useNavigate();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div className="absolute inset-0 z-50 bg-[#050508] overflow-hidden flex flex-col items-center justify-center animate-[fadeIn_0.5s_ease-out]">
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2000&auto=format&fit=crop"
          alt="Abstract Dark Fluid"
          className={`w-full h-full object-cover opacity-40 transition-transform duration-[20s] ease-out ${isLoaded ? 'scale-110' : 'scale-100'}`}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#050508]/30 via-transparent to-[#050508]"></div>
      </div>
      <div className="relative z-10 text-center flex flex-col items-center mt-[-10vh]">
        <div className={`overflow-hidden transition-all duration-1000 delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="text-[#A89882] tracking-[0.4em] text-[10px] md:text-xs mb-6 uppercase font-light">
            解鎖命運 UNLOCK YOUR DESTINY
          </p>
        </div>
        <div className={`overflow-hidden transition-all duration-1000 delay-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
          <h1 className="text-6xl md:text-8xl lg:text-[10rem] font-extralight text-white font-serif tracking-[0.1em] md:tracking-[0.2em] leading-none drop-shadow-2xl mix-blend-overlay">
            MYSTIC
          </h1>
        </div>
        <div className={`overflow-hidden transition-all duration-1000 delay-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8'}`}>
          <h2 className="text-3xl md:text-5xl font-light text-white/90 font-serif tracking-[0.3em] mt-4">
            命理探索
          </h2>
        </div>
      </div>
      <div
        onClick={() => nav('/guide')}
        className={`absolute bottom-16 z-20 flex flex-col items-center cursor-pointer group transition-opacity duration-1000 delay-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
      >
        <span className="text-white/70 tracking-[0.4em] uppercase mb-5 group-hover:text-white transition-colors duration-300 flex flex-col items-center gap-2">
          <span className="text-lg md:text-xl font-medium tracking-[0.5em] ml-2 drop-shadow-md">進入聖域</span>
          <span className="text-[10px] md:text-xs opacity-60">ENTER SANCTUARY</span>
        </span>
        <div className="w-[1px] h-16 bg-white/10 relative overflow-hidden">
          <div className="w-full h-full bg-gradient-to-b from-transparent via-[#A89882] to-transparent absolute top-[-100%] left-0 animate-[scrollDown_2s_ease-in-out_infinite]"></div>
        </div>
      </div>
    </div>
  );
}
