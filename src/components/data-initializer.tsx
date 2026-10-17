"use client"

import { useEffect } from 'react';
import { auth } from '@/firebase/config';
import { initializeDataCache, getActiveUser } from '@/lib/data-layer';

export function DataInitializer() {
    useEffect(() => {
        // Start global authentication and sync listeners
        const unsub = auth.onAuthStateChanged((user) => {
            const activeUser = getActiveUser();
            if (user?.email) {
                console.log('DataInitializer: Firebase User detected, initializing sync engine...');
                initializeDataCache(user.email);
            } else if (activeUser?.email) {
                console.log('DataInitializer: Staff active user detected, initializing sync engine...');
                initializeDataCache(activeUser.email);
            }
        });

        return () => unsub();
    }, []);

    return null;
}
