'use client';

import { useState, useEffect } from 'react';
import { db } from '@/firebase/config';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { getActiveUser, dismissNotification as cloudDismiss } from '@/lib/data-layer';
import { AlertCircle, X, Info } from 'lucide-react';

export function UserNotifications() {
    const [notification, setNotification] = useState<{ id: string; type: 'rejection' | 'warning'; message: string } | null>(null);
    const [dismissed, setDismissed] = useState<string[]>([]);

    useEffect(() => {
        const localDismissed = typeof window !== 'undefined' ? localStorage.getItem('cashbookpro_dismissed_notifications') : null;
        if (localDismissed) {
            try {
                setDismissed(JSON.parse(localDismissed));
            } catch (e) {
                console.error("Error parsing local dismissed notifications:", e);
            }
        } else {
            const user = getActiveUser();
            if (user?.dismissedNotifications) {
                setDismissed(user.dismissedNotifications);
            }
        }

        // --- Real-time sync for dismissed notifications ---
        let unsubUser = () => { };
        const user = getActiveUser();
        if (user) {
            unsubUser = onSnapshot(doc(db, 'users', user.email), (snap) => {
                if (snap.exists()) {
                    const data = snap.data();

                    // Update cloud-synced dismissed list merged with local
                    if (data.dismissedNotifications) {
                        setDismissed(prev => {
                            const merged = Array.from(new Set([...prev, ...data.dismissedNotifications]));
                            if (typeof window !== 'undefined') {
                                localStorage.setItem('cashbookpro_dismissed_notifications', JSON.stringify(merged));
                            }
                            return merged;
                        });
                    }

                    // Priority 1: Rejection
                    if (!data.pendingRequest && data.requestHistory?.length > 0) {
                        const last = data.requestHistory[data.requestHistory.length - 1];
                        if (last.status === 'rejected' && last.note && last.id) {
                            setNotification({ id: `rejection_${last.id}`, type: 'rejection', message: `Premium Request Rejected: ${last.note}` });
                            return;
                        }
                    }

                    // Priority 2: Personal Warning
                    if (data.warning) {
                        const msgHash = data.warning.split('').reduce((a: number, b: string) => {
                            const res = ((a << 5) - a) + b.charCodeAt(0);
                            return res & res;
                        }, 0);
                        setNotification({ id: `warning_${user.email}_${msgHash}`, type: 'warning', message: data.warning });
                        return;
                    }

                    setNotification(null);
                }
            });
        }

        // 2. Listen for Global Announcements (For all users)
        const unsubGlobal = onSnapshot(doc(db, 'appConfig', 'announcement'), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                if (data.isActive && data.message) {
                    const msgHash = data.message.split('').reduce((a: number, b: string) => {
                        const res = ((a << 5) - a) + b.charCodeAt(0);
                        return res & res;
                    }, 0);

                    // Only show global if no personal notification is active
                    setNotification(prev => {
                        if (prev && !prev.id.startsWith('global_')) return prev;
                        return { id: `global_${msgHash}`, type: 'warning', message: data.message };
                    });
                } else {
                    setNotification(prev => (prev?.id.startsWith('global_') ? null : prev));
                }
            }
        });

        return () => {
            unsubUser();
            unsubGlobal();
        };
    }, []);

    const handleDismiss = async () => {
        if (!notification) return;
        const noteId = notification.id;

        // 1. Instant local visual feedback and cache save
        const nextDismissed = Array.from(new Set([...dismissed, noteId]));
        setDismissed(nextDismissed);
        if (typeof window !== 'undefined') {
            localStorage.setItem('cashbookpro_dismissed_notifications', JSON.stringify(nextDismissed));
        }
        setNotification(null);

        // 2. Persistent cloud dismissal
        try {
            await cloudDismiss(noteId);
        } catch (err) {
            console.warn("Could not save dismissal to cloud immediately (offline):", err);
        }
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
