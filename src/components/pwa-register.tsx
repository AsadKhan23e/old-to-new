'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export function PWARegister() {
    useEffect(() => {
        // Only register service worker in standard browser web-view, not in native Capacitor apps
        if (
            typeof window !== 'undefined' &&
            'serviceWorker' in navigator &&
            !Capacitor.isNativePlatform()
        ) {
            // Check if already registered or if loading
            const registerSW = () => {
                navigator.serviceWorker
                    .register('/sw.js')
                    .then((reg) => {
                        console.log('PWA Service Worker registered successfully:', reg.scope);
                    })
                    .catch((err) => {
                        console.error('PWA Service Worker registration failed:', err);
                    });
            };

            if (document.readyState === 'complete') {
                registerSW();
            } else {
                window.addEventListener('load', registerSW);
                return () => window.removeEventListener('load', registerSW);
            }
        }
    }, []);

    return null;
}
