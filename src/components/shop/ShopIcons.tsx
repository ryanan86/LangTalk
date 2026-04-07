import type { ShopIcon } from '@/lib/shopItems';

interface IconProps {
  className?: string;
  strokeWidth?: number;
}

export function CoinIcon({ className = 'w-4 h-4', strokeWidth = 2 }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={strokeWidth}>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6M12 9v6" />
    </svg>
  );
}

function Lightbulb({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={strokeWidth}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v3m-3-3h6M8.5 14.5A5.5 5.5 0 1 1 17 11c0 1.7-.7 3.2-1.9 4.3-.7.6-1.1 1.5-1.1 2.4v0H10v0c0-.9-.4-1.8-1.1-2.4A5.5 5.5 0 0 1 8.5 14.5Z" />
    </svg>
  );
}

function Bolt({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={strokeWidth}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
    </svg>
  );
}

function Snowflake({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={strokeWidth}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4M9 6l3 3 3-3M9 18l3-3 3 3M6 9l3 3-3 3M18 9l-3 3 3 3" />
    </svg>
  );
}

function Target({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={strokeWidth}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

function GraduationCap({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={strokeWidth}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m3 9 9-4 9 4-9 4-9-4Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 9v6M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5" />
    </svg>
  );
}

const ICON_MAP: Record<ShopIcon, (p: IconProps) => JSX.Element> = {
  lightbulb: Lightbulb,
  bolt: Bolt,
  snowflake: Snowflake,
  target: Target,
  'graduation-cap': GraduationCap,
};

interface ShopItemIconProps {
  icon: ShopIcon;
  className?: string;
}

export function ShopItemIcon({ icon, className = 'w-6 h-6' }: ShopItemIconProps) {
  const Component = ICON_MAP[icon];
  return <Component className={className} />;
}
