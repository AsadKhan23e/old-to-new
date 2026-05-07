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
    const backButtonHandler = App.addListener('backButton', () => {
      // Check for open dialogs/modals
      const openDialog = document.querySelector('[role="dialog"][data-state="open"]');
      const closeButton = document.querySelector('button[aria-label="Close"]');

      if (openDialog || closeButton) {
        // If there's a close button, click it
        if (closeButton instanceof HTMLButtonElement) {
          closeButton.click();
          return;
        }
        // Otherwise, send Escape key event to close the modal
        const escEvent = new KeyboardEvent('keydown', {
          key: 'Escape',
          code: 'Escape',
          keyCode: 27,
          which: 27,
          bubbles: true,
          cancelable: true
        });
        document.dispatchEvent(escEvent);
        return;
      }

      // Special case for root paths
      if (pathname === '/dashboard' || pathname === '/login' || pathname === '/') {
        App.exitApp();
      } else {
        // Normal navigation back
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
      backButtonHandler.then(h => h.remove());
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
