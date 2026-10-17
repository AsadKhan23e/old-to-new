import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.myshopbook.app',
  appName: 'MyShopBook',
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
    },
    GoogleAuth: {
      scopes: ["profile", "email"],
      serverClientId: "367068109515-a7nsafaelio2jfk9lfe1hhp59g3roerc.apps.googleusercontent.com",
      forceCodeForRefreshToken: true,
    }
  }
};

export default config;
