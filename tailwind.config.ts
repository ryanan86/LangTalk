import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary Purple - Vibrant & Premium
        primary: {
          50: '#FAF5FF',
          100: '#F3E8FF',
          200: '#E9D5FF',
          300: '#D8B4FE',
          400: '#C084FC',
          500: '#A855F7',
          600: '#9333EA',
          700: '#7C3AED',  // Main brand color (dark)
          800: '#6B21A8',
          900: '#581C87',
        },
        // Brand color for light mode
        brand: {
          light: '#4F46E5',
          dark: '#7C3AED',
        },
        // Neutral - Refined zinc scale
        neutral: {
          50: '#FAFAFA',
          100: '#F4F4F5',
          200: '#E4E4E7',
          300: '#D4D4D8',
          400: '#A1A1AA',
          500: '#71717A',
          600: '#52525B',
          700: '#3F3F46',
          800: '#27272A',
          900: '#18181B',
          950: '#09090B',
        },
        // Accent colors for UI elements
        accent: {
          coral: '#FF6B6B',
          mint: '#10B981',
          amber: '#F59E0B',
          sky: '#0EA5E9',
          pink: '#EC4899',
        },
        // Dark mode specific
        dark: {
          bg: '#09090B',
          surface: '#18181B',
          elevated: '#27272A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Pretendard', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Outfit', 'Inter', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
        'display-lg': ['4.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display-md': ['3.5rem', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
        'display-sm': ['2.5rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        // Display scale tuned for mixed Korean + Latin headings — tighter tracking,
        // compact leading so mixed-script titles read as one confident block.
        'display-1': ['2rem', { lineHeight: '1.15', letterSpacing: '-0.025em', fontWeight: '800' }],
        'display-2': ['1.5rem', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '700' }],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
        // Card scale bump — cards feel modern at 20–24px.
        'card': '1.25rem',   // 20px
        'card-lg': '1.5rem', // 24px
      },
      animation: {
        'pulse-ring': 'pulse-ring 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fade-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in-up': 'fade-in-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in-delay-1': 'fade-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both',
        'fade-in-delay-2': 'fade-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both',
        'fade-in-delay-3': 'fade-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both',
        'slide-up': 'slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-down': 'slide-down 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in': 'scale-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'slide-in-left': 'slide-in-left 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-in-right': 'slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
        'bounce-soft': 'bounce-soft 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'phone-float': 'phone-float 6s ease-in-out infinite',
        // ── Design-system motion (Phase A) ──────────────────────────────────
        'fade-up': 'fade-up 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'ds-scale-in': 'ds-scale-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'skeleton-shimmer': 'skeleton-shimmer 1.6s ease-in-out infinite',
        'count-pop': 'count-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'progress-fill': 'progress-fill 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'gentle-bounce': 'gentle-bounce 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      },
      keyframes: {
        'pulse-ring': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.1)', opacity: '0.7' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          '0%': { opacity: '0', transform: 'translateY(-30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'bounce-soft': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'glow': {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        'slide-in-left': {
          '0%': { opacity: '0', transform: 'translateX(-16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        // ── Design-system keyframes (Phase A) ───────────────────────────────
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'ds-scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.94)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'skeleton-shimmer': {
          '0%': { opacity: '0.55' },
          '50%': { opacity: '1' },
          '100%': { opacity: '0.55' },
        },
        'count-pop': {
          '0%': { opacity: '0', transform: 'translateY(8px) scale(0.9)' },
          '60%': { transform: 'translateY(0) scale(1.06)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'progress-fill': {
          '0%': { transform: 'scaleX(0)' },
          '100%': { transform: 'scaleX(1)' },
        },
        'gentle-bounce': {
          '0%': { transform: 'scale(0.6)', opacity: '0' },
          '45%': { transform: 'scale(1.12)', opacity: '1' },
          '70%': { transform: 'scale(0.94)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      boxShadow: {
        'glow-sm': '0 0 20px rgba(124, 58, 237, 0.15)',
        'glow-md': '0 0 40px rgba(124, 58, 237, 0.2)',
        'glow-lg': '0 0 60px rgba(124, 58, 237, 0.25)',
        'premium': '0 8px 32px rgba(0, 0, 0, 0.12)',
        'premium-lg': '0 16px 48px rgba(0, 0, 0, 0.16)',
        // ── Elevation system — layered soft shadows tinted with the brand hue
        //    (violet 124,58,237) at low alpha so cards feel lifted, not muddy.
        'card': '0 1px 2px rgba(24, 24, 27, 0.04), 0 4px 12px -2px rgba(124, 58, 237, 0.06)',
        'card-hover': '0 2px 4px rgba(24, 24, 27, 0.05), 0 12px 32px -6px rgba(124, 58, 237, 0.14)',
        'float': '0 8px 16px -4px rgba(24, 24, 27, 0.06), 0 20px 48px -12px rgba(124, 58, 237, 0.22)',
        // Dark-mode equivalents — deeper black base, stronger brand glow.
        'card-dark': '0 1px 2px rgba(0, 0, 0, 0.4), 0 4px 12px -2px rgba(124, 58, 237, 0.10)',
        'card-hover-dark': '0 2px 6px rgba(0, 0, 0, 0.5), 0 14px 36px -6px rgba(124, 58, 237, 0.28)',
        'float-dark': '0 10px 20px -4px rgba(0, 0, 0, 0.55), 0 24px 56px -12px rgba(124, 58, 237, 0.4)',
        'soft': '0 2px 8px rgba(0, 0, 0, 0.06)',
        'soft-lg': '0 4px 20px rgba(0, 0, 0, 0.08)',
      },
      backgroundImage: {
        // Sparingly-used brand gradient — hero CTAs and progress fills only.
        'brand-gradient': 'linear-gradient(135deg, #7C3AED 0%, #9333EA 55%, #6366F1 100%)',
        'brand-gradient-soft': 'linear-gradient(135deg, #A855F7 0%, #818CF8 100%)',
      },
      backdropBlur: {
        'xs': '2px',
      },
    },
  },
  plugins: [],
};
export default config;
