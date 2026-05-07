"use client"

import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { Keyboard } from '@capacitor/keyboard';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { usePathname, useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { useTheme } from 'next-themes';

export function CapacitorHandler() {
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useTheme();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // Handle Back Button
    const backButtonListener = App.addListener('backButton', () => {
      if (pathname === '/dashboard' || pathname === '/login') {
        App.exitApp();
      } else {
        window.history.back();
      }
    });

    // Handle Keyboard
    Keyboard.addListener('keyboardWillShow', info => {
      document.body.classList.add('keyboard-open');
    });
    Keyboard.addListener('keyboardWillHide', () => {
      document.body.classList.remove('keyboard-open');
    });

    // Hide Splash Screen
    SplashScreen.hide();

    return () => {
      backButtonListener.remove();
      Keyboard.removeAllListeners();
    };
  }, [pathname, router]);

  // Update Status Bar
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    
    if (theme === 'dark') {
      StatusBar.setStyle({ style: Style.Dark });
      StatusBar.setBackgroundColor({ color: '#121212' });
    } else {
      StatusBar.setStyle({ style: Style.Light });
      StatusBar.setBackgroundColor({ color: '#FAF8F3' });
    }
  }, [theme]);

  return null;
}
