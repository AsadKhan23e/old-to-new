import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.myshopbook.app',
  appName: 'CashbookPro',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#121212",
      showSpinner: true,
      spinnerColor: "#F97316",
      androidScaleType: "CENTER_CROP",
    },
    Keyboard: {
      resize: "body" as any,
      style: "dark" as any,
    },
    StatusBar: {
      overlaysWebView: false,
    }
  }
};

export default config;
