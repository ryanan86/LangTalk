import { ImageResponse } from 'next/og';


export const alt = 'TapTalk - AI English Conversation Practice';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 30%, #4338ca 60%, #6366f1 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
        }}
      >
        {/* Background pattern */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.1,
            display: 'flex',
            background: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(255,255,255,0.2) 0%, transparent 50%)',
          }}
        />

        {/* Logo icon */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '12px',
            marginBottom: '32px',
          }}
        >
          <div
            style={{
              width: '24px',
              height: '60px',
              borderRadius: '12px',
              background: 'linear-gradient(180deg, #38bdf8, #818cf8)',
            }}
          />
          <div
            style={{
              width: '24px',
              height: '96px',
              borderRadius: '12px',
              background: 'linear-gradient(180deg, #38bdf8, #818cf8)',
            }}
          />
          <div
            style={{
              width: '24px',
              height: '60px',
              borderRadius: '12px',
              background: 'linear-gradient(180deg, #38bdf8, #818cf8)',
            }}
          />
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: 'white',
            letterSpacing: '-2px',
            marginBottom: '16px',
            display: 'flex',
          }}
        >
          TapTalk
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 32,
            color: 'rgba(255, 255, 255, 0.85)',
            fontWeight: 500,
            display: 'flex',
          }}
        >
          AI English Conversation Practice
        </div>

        {/* Domain */}
        <div
          style={{
            position: 'absolute',
            bottom: '32px',
            right: '40px',
            fontSize: 20,
            color: 'rgba(255, 255, 255, 0.5)',
            display: 'flex',
          }}
        >
          taptalk.xyz
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
