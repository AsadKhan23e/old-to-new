'use client';

import { useState, useEffect } from 'react';
import { db } from '@/firebase/config';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { getActiveUser } from '@/lib/data-layer';
import { AlertCircle, X, Info } from 'lucide-react';

export function UserNotifications() {
    const [notification, setNotification] = useState<{ id: string; type: 'rejection' | 'warning'; message: string } | null>(null);
    const [dismissed, setDismissed] = useState<string[]>([]);

    useEffect(() => {
        // Load dismissed list
        const d = localStorage.getItem('cashbookpro_dismissed_notifs');
        if (d) setDismissed(JSON.parse(d));

        const user = getActiveUser();
        if (!user) return;

        const unsub = onSnapshot(doc(db, 'users', user.email), (snap) => {
            if (snap.exists()) {
                const data = snap.data();

                // 1. Check for Rejection
                if (!data.pendingRequest && data.requestHistory?.length > 0) {
                    const last = data.requestHistory[data.requestHistory.length - 1];
                    if (last.status === 'rejected' && last.note && last.id) {
                        setNotification({ id: last.id, type: 'rejection', message: `Premium Request Rejected: ${last.note}` });
                        return;
                    }
                }

                // 2. Check for Warning
                if (data.warning) {
                    setNotification({ id: 'warning_' + user.email, type: 'warning', message: data.warning });
                    return;
                }

                setNotification(null);
            }
        });

        return () => unsub();
    }, []);

    const handleDismiss = () => {
        if (!notification) return;
        const newDismissed = [...dismissed, notification.id];
        setDismissed(newDismissed);
        localStorage.setItem('cashbookpro_dismissed_notifs', JSON.stringify(newDismissed));
        setNotification(null);
    };

    if (!notification || dismissed.includes(notification.id)) return null;

    return (
        <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mb-4 animate-in slide-in-from-top duration-500`}>
            <div className={`flex items-center justify-between p-4 rounded-xl border ${notification.type === 'rejection'
                    ? 'bg-red-500/10 border-red-500/30 text-red-200'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                }`}>
                <div className="flex items-center gap-3">
                    {notification.type === 'rejection' ? <AlertCircle className="w-5 h-5 text-red-500" /> : <Info className="w-5 h-5 text-amber-500" />}
                    <div className="text-sm">
                        <span className="font-bold block">{notification.type === 'rejection' ? 'Premium Rejected' : 'System Warning'}</span>
                        <p className="opacity-90">{notification.message}</p>
                    </div>
                </div>
                <button onClick={handleDismiss} className="p-1 hover:bg-black/20 rounded-lg transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
