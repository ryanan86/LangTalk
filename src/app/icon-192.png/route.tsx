import { ImageResponse } from 'next/og';


export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 192,
          height: 192,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f5f5f5 0%, #e5e5e5 100%)',
          borderRadius: 32,
        }}
      >
        <svg viewBox="0 0 64 64" width="128" height="128">
          <defs>
            <linearGradient id="g" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8"/>
              <stop offset="100%" stopColor="#818cf8"/>
            </linearGradient>
          </defs>
          <rect x="10" y="20" width="10" height="24" rx="5" fill="url(#g)"/>
          <rect x="27" y="12" width="10" height="40" rx="5" fill="url(#g)"/>
          <rect x="44" y="20" width="10" height="24" rx="5" fill="url(#g)"/>
        </svg>
      </div>
    ),
    {
      width: 192,
      height: 192,
    }
  );
}
