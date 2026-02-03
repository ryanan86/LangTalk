'use client';

interface IconProps {
  className?: string;
  size?: number;
}

// US Flag SVG
export function USFlag({ className = '', size = 20 }: IconProps) {
  return (
    <svg
      viewBox="0 0 60 30"
      width={size}
      height={size * 0.5}
      className={className}
      aria-label="US"
    >
      <clipPath id="us-clip">
        <rect width="60" height="30" rx="2" />
      </clipPath>
      <g clipPath="url(#us-clip)">
        <rect width="60" height="30" fill="#B22234" />
        <g fill="#fff">
          <rect y="2.31" width="60" height="2.31" />
          <rect y="6.92" width="60" height="2.31" />
          <rect y="11.54" width="60" height="2.31" />
          <rect y="16.15" width="60" height="2.31" />
          <rect y="20.77" width="60" height="2.31" />
          <rect y="25.38" width="60" height="2.31" />
        </g>
        <rect width="24" height="16.15" fill="#3C3B6E" />
        <g fill="#fff">
          {[...Array(5)].map((_, row) => (
            [...Array(6)].map((_, col) => (
              <circle
                key={`star-${row}-${col}`}
                cx={2 + col * 4}
                cy={1.6 + row * 3.2}
                r="0.8"
              />
            ))
          ))}
          {[...Array(4)].map((_, row) => (
            [...Array(5)].map((_, col) => (
              <circle
                key={`star2-${row}-${col}`}
                cx={4 + col * 4}
                cy={3.2 + row * 3.2}
                r="0.8"
              />
            ))
          ))}
        </g>
      </g>
    </svg>
  );
}

// UK Flag SVG
export function UKFlag({ className = '', size = 20 }: IconProps) {
  return (
    <svg
      viewBox="0 0 60 30"
      width={size}
      height={size * 0.5}
      className={className}
      aria-label="UK"
    >
      <clipPath id="uk-clip">
        <rect width="60" height="30" rx="2" />
      </clipPath>
      <g clipPath="url(#uk-clip)">
        <rect width="60" height="30" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4" />
        <path d="M30,0 V30 M0,15 H60" stroke="#fff" strokeWidth="10" />
        <path d="M30,0 V30 M0,15 H60" stroke="#C8102E" strokeWidth="6" />
      </g>
    </svg>
  );
}

// Flag component that renders based on country code
export function Flag({ country, className = '', size = 20 }: { country: 'US' | 'UK'; className?: string; size?: number }) {
  if (country === 'US') {
    return <USFlag className={className} size={size} />;
  }
  return <UKFlag className={className} size={size} />;
}

// Profile type icons
export function StudentIcon({ className = '' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  );
}

export function BriefcaseIcon({ className = '' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}

export function PlaneIcon({ className = '' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
    </svg>
  );
}

export function UsersIcon({ className = '' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function BookIcon({ className = '' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

export function GraduationCapIcon({ className = '' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  );
}
