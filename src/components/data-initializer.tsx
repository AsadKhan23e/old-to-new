"use client"

import { useEffect } from 'react';
import { auth } from '@/firebase/config';
import { initializeDataCache } from '@/lib/data-layer';

export function DataInitializer() {
    useEffect(() => {
        // Start global authentication and sync listeners
        const unsub = auth.onAuthStateChanged((user) => {
            if (user?.email) {
                console.log('DataInitializer: User detected, initializing sync engine...');
                initializeDataCache(user.email);
            }
        });

        return () => unsub();
    }, []);

    return null;
}
