'use client';

import MockupChat from './MockupChat';

export default function PhoneMockup() {
  return (
    <div className="relative animate-[phone-float_6s_ease-in-out_infinite]">
      {/* Glow effect behind phone */}
      <div className="absolute -inset-8 bg-gradient-to-br from-purple-500/20 via-pink-500/10 to-indigo-500/20 rounded-[3rem] blur-3xl" />

      {/* Phone frame */}
      <div className="relative w-[240px] md:w-[260px] lg:w-[300px] aspect-[9/19.5] bg-[#0a0a0a] rounded-[2.5rem] border-[3px] border-zinc-700/60 shadow-2xl overflow-hidden">
        {/* Dynamic Island notch */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 w-[90px] h-[28px] bg-black rounded-full" />

        {/* Status bar */}
        <div className="relative z-10 flex items-center justify-between px-6 pt-2 pb-0 h-[52px]">
          <span className="text-[11px] text-white/70 font-semibold">9:41</span>
          <div className="flex items-center gap-1">
            {/* Signal bars */}
            <div className="flex items-end gap-[2px]">
              <div className="w-[3px] h-[4px] bg-white/70 rounded-sm" />
              <div className="w-[3px] h-[6px] bg-white/70 rounded-sm" />
              <div className="w-[3px] h-[8px] bg-white/70 rounded-sm" />
              <div className="w-[3px] h-[10px] bg-white/50 rounded-sm" />
            </div>
            {/* WiFi */}
            <svg className="w-3.5 h-3.5 text-white/70 ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM6 14c0-1.1.9-2 2-2h8c1.1 0 2 .9 2 2H6zM2 10c0-1.1.9-2 2-2h16c1.1 0 2 .9 2 2H2z" />
            </svg>
            {/* Battery */}
            <div className="flex items-center ml-1">
              <div className="w-[22px] h-[11px] border border-white/50 rounded-[3px] p-[1.5px]">
                <div className="w-3/4 h-full bg-white/70 rounded-[1px]" />
              </div>
              <div className="w-[1.5px] h-[4px] bg-white/50 rounded-r-sm ml-[0.5px]" />
            </div>
          </div>
        </div>

        {/* Chat content area - always dark theme */}
        <div className="absolute inset-0 top-[52px] bottom-0 bg-[#0a0a0a]">
          <MockupChat />
        </div>

        {/* Home indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[100px] h-[4px] bg-white/20 rounded-full z-20" />
      </div>
    </div>
  );
}
