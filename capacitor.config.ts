import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.taptalk.app',
  appName: 'TapTalk',
  webDir: 'out',
  server: {
    url: 'https://taptalk.xyz',
    androidScheme: 'https',
    allowNavigation: ['taptalk.xyz', '*.taptalk.xyz', '*.google.com', '*.googleapis.com'],
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 0,
      backgroundColor: '#1a1a2e',
      showSpinner: false,
    },
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
