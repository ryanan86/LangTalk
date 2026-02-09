'use client';

export default function MockupTypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      <div className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-white/40 animate-[mockup-dot_1.4s_ease-in-out_infinite]" />
        <span className="w-2 h-2 rounded-full bg-white/40 animate-[mockup-dot_1.4s_ease-in-out_0.2s_infinite]" />
        <span className="w-2 h-2 rounded-full bg-white/40 animate-[mockup-dot_1.4s_ease-in-out_0.4s_infinite]" />
      </div>
    </div>
  );
}
