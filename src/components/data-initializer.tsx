"use client"

import { useEffect } from 'react';
import { auth } from '@/firebase/config';
import { initializeDataCache, getActiveUser } from '@/lib/data-layer';
import { validateEmployeeSession, isStaffMember } from '@/lib/employee-service';

export function DataInitializer() {
    useEffect(() => {
        // Start global authentication and sync listeners
        const unsub = auth.onAuthStateChanged(async (user) => {
            const activeUser = getActiveUser();
            if (user?.email) {
                console.log('DataInitializer: Firebase User detected, initializing sync engine...');
                initializeDataCache(user.email);
            } else if (activeUser?.email) {
                console.log('DataInitializer: Staff active user detected, initializing sync engine...');
                // Live check: If staff member was deleted/disabled, revoke session
                if (isStaffMember()) {
                    const valid = await validateEmployeeSession();
                    if (!valid) return;
                }
                initializeDataCache(activeUser.email);
            }
        });

        // When device comes online (e.g. evening Wi-Fi connection), re-verify staff status
        const handleOnline = async () => {
            if (isStaffMember()) {
                await validateEmployeeSession();
            }
        };

        window.addEventListener('online', handleOnline);

        return () => {
            unsub();
            window.removeEventListener('online', handleOnline);
        };
    }, []);

    return null;
}
