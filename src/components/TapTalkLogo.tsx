'use client';

interface TapTalkLogoProps {
  variant?: 'icon-text' | 'text-icon';
  size?: 'sm' | 'md' | 'lg';
  theme?: 'dark' | 'light' | 'auto';
  className?: string;
  iconOnly?: boolean;
}

const sizeConfig = {
  sm: { icon: 28, text: 'text-base', gap: 'gap-2' },
  md: { icon: 36, text: 'text-xl', gap: 'gap-2.5' },
  lg: { icon: 48, text: 'text-3xl', gap: 'gap-3' },
};

function WaveIcon({ size }: { size: number }) {
  const id = `grad-${size}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>
      </defs>
      <rect x="10" y="20" width="10" height="24" rx="5" fill={`url(#${id})`} />
      <rect x="27" y="12" width="10" height="40" rx="5" fill={`url(#${id})`} />
      <rect x="44" y="20" width="10" height="24" rx="5" fill={`url(#${id})`} />
    </svg>
  );
}

export default function TapTalkLogo({
  variant = 'icon-text',
  size = 'md',
  theme = 'auto',
  className = '',
  iconOnly = false,
}: TapTalkLogoProps) {
  const config = sizeConfig[size];
  // 'auto' follows the global theme via CSS
  const textColor = theme === 'auto'
    ? 'text-neutral-900 dark:text-white'
    : theme === 'dark'
      ? 'text-white'
      : 'text-[#1e293b]';

  if (iconOnly) {
    return (
      <div className={`inline-flex items-center ${className}`}>
        <WaveIcon size={config.icon} />
      </div>
    );
  }

  const icon = <WaveIcon size={config.icon} />;
  const text = (
    <span
      className={`${config.text} font-bold ${textColor}`}
      style={{ fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif" }}
    >
      TapTalk
    </span>
  );

  return (
    <div className={`inline-flex items-center ${config.gap} ${className}`}>
      {variant === 'icon-text' ? (
        <>
          {icon}
          {text}
        </>
      ) : (
        <>
          {text}
          {icon}
        </>
      )}
    </div>
  );
}
