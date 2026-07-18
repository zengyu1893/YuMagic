import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';

interface IntroProps {
  onEnter: () => void;
}

const Intro: React.FC<IntroProps> = ({ onEnter }) => {
  const [sliderValue, setSliderValue] = useState(0);
  const [isClosing, setIsClosing] = useState(false);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value);
      setSliderValue(val);
      if (val > 95) {
          setIsClosing(true);
          setTimeout(onEnter, 800); // Wait for animation
      }
  };

  const handleSkip = () => {
      setIsClosing(true);
      setTimeout(onEnter, 800);
  };

  return (
    <div className={`fixed inset-0 z-[100] bg-[#0a0a0f] text-white flex flex-col transition-all duration-1000 ${isClosing ? 'opacity-0 -translate-y-10' : 'opacity-100'}`}>

      {/* Skip Button - 桌面端快捷入口 */}
      <button
        onClick={handleSkip}
        className="absolute top-6 right-6 z-30 px-5 py-2.5 rounded-xl bg-white/10 border border-white/15 text-sm font-medium text-white/70 hover:bg-white/20 hover:text-white transition-all duration-300 backdrop-blur-sm"
      >
        跳过 intro
      </button>

      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(30,30,40,0.5),transparent_70%)] opacity-40 pointer-events-none" />
      {/* 本地 CSS noise 纹理替代外部 URL */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.15'/%3E%3C/svg%3E")`,
        opacity: 0.08,
      }} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row items-center justify-center p-8 md:p-24 gap-12 md:gap-32 relative z-10">
         
         {/* Left: Penguin */}
         <div className="text-center md:text-right space-y-4 group">
            <h1 className="text-6xl md:text-8xl font-thin tracking-tighter text-white group-hover:text-blue-200 transition-colors duration-700 cursor-default">
              Penguin
            </h1>
            <div className="flex flex-col md:items-end gap-1 text-zinc-500 font-light tracking-widest uppercase text-xs md:text-sm">
                <span className="opacity-50">Manchot</span>
                <span className="opacity-50">企鹅</span>
            </div>
            <p className="text-zinc-400 max-w-xs md:ml-auto text-sm leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-700 transform translate-y-2 group-hover:translate-y-0">
               Searching the entire beach for the perfect pebble. A symbol of awkward, yet sincere devotion.
            </p>
         </div>

         {/* Center Divider */}
         <div className="w-px h-32 md:h-64 bg-gradient-to-b from-transparent via-white/20 to-transparent" />

         {/* Right: Pebbling */}
         <div className="text-center md:text-left space-y-4 group">
            <h1 className="text-6xl md:text-8xl font-thin tracking-tighter text-white group-hover:text-purple-200 transition-colors duration-700 cursor-default">
              Pebbling
            </h1>
            <div className="flex flex-col md:items-start gap-1 text-zinc-500 font-light tracking-widest uppercase text-xs md:text-sm">
                <span className="opacity-50">L'acte d'offrir</span>
                <span className="opacity-50">送石行为</span>
            </div>
            <p className="text-zinc-400 max-w-xs text-sm leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-700 transform translate-y-2 group-hover:translate-y-0">
               "I saw this, and I thought of you." The modern act of sharing small digital treasures.
            </p>
         </div>
      </div>

      {/* Bottom Slider Interaction */}
      <div className="pb-20 flex justify-center relative z-20">
          <div className="relative w-72 h-16 group">
             
             {/* Slider Track */}
             <div className="absolute inset-0 bg-white/5 rounded-full border border-white/10 backdrop-blur-md overflow-hidden flex items-center px-2">
                 <div className="absolute left-0 top-0 bottom-0 bg-white/10 transition-all duration-75" style={{ width: `${sliderValue}%` }} />
                 <span className="w-full text-center text-xs font-medium tracking-[0.3em] uppercase text-white/30 pointer-events-none group-hover:text-white/50 transition-colors">
                    Slide to Enter
                 </span>
             </div>

             {/* Slider Thumb */}
             <div 
                className="absolute top-1 bottom-1 w-14 bg-white rounded-full shadow-[0_0_20px_rgba(255,255,255,0.3)] flex items-center justify-center transition-all duration-75 pointer-events-none"
                style={{ left: `calc(${sliderValue}% * 0.8)` }} // 0.8 is a rough factor to keep it inside, proper math is (value / 100) * (width - thumbWidth)
             >
                <Icons.Move className="w-4 h-4 text-black rotate-90" />
             </div>

             {/* Hidden Input */}
             <input 
                type="range" 
                min="0" 
                max="100" 
                value={sliderValue}
                onChange={handleSliderChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-grab active:cursor-grabbing"
             />
          </div>
      </div>
    </div>
  );
};

export default Intro;
