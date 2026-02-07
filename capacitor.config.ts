import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.taptalk.app',
  appName: 'TapTalk',
  webDir: 'out',
  server: {
    url: 'https://taptalk.xyz',
    androidScheme: 'https',
    // Allow Google domains for OAuth within WebView (User-Agent modified to bypass restriction)
    allowNavigation: ['taptalk.xyz', '*.taptalk.xyz', 'accounts.google.com', '*.google.com', '*.googleapis.com', '*.gstatic.com'],
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 0,
      backgroundColor: '#1a1a2e',
      showSpinner: false,
    },
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '670234764770-sib307dj55oj4pg2d5cu1k27i7u5hith.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true, // Enable for debugging
    appendUserAgent: 'TapTalkNative', // For detecting native app in web code
  },
};

export default config;
