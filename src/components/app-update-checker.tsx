'use client';

import { useState, useEffect } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { getAppUpdate, AppUpdate } from '@/lib/admin-service';
import { Download, X, AlertTriangle } from 'lucide-react';

export function AppUpdateChecker() {
    const [update, setUpdate] = useState<AppUpdate | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [currentVersion, setCurrentVersion] = useState<string>('');

    useEffect(() => {
        // Only run on native platforms (Android/iOS)
        if (!Capacitor.isNativePlatform()) return;

        const checkUpdate = async () => {
            try {
                // 1. Get current app info
                const info = await App.getInfo();
                setCurrentVersion(info.version);

                // 2. Fetch latest update info from Firestore
                const remoteUpdate = await getAppUpdate();

                if (remoteUpdate && remoteUpdate.isActive) {
                    // 3. Simple version comparison (e.g., "1.0.5" vs "1.0.4")
                    if (isVersionHigher(remoteUpdate.version, info.version)) {
                        setUpdate(remoteUpdate);
                        setIsVisible(true);
                    }
                }
            } catch (error) {
                console.error('Error checking for updates:', error);
            }
        };

        checkUpdate();
    }, []);

    // Helper to compare version strings
    const isVersionHigher = (remote: string, local: string) => {
        const remoteParts = remote.split('.').map(Number);
        const localParts = local.split('.').map(Number);

        for (let i = 0; i < Math.max(remoteParts.length, localParts.length); i++) {
            const r = remoteParts[i] || 0;
            const l = localParts[i] || 0;
            if (r > l) return true;
            if (r < l) return false;
        }
        return false;
    };

    if (!isVisible || !update) return null;

    const isForceUpdate = update.isForceUpdate === true;

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-gray-900 border border-purple-500/30 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl shadow-purple-500/20 animate-in zoom-in-95 duration-300">
                {/* Header Image/Icon */}
                <div className="h-32 bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center relative">
                    {!isForceUpdate && (
                        <button
                            onClick={() => setIsVisible(false)}
                            className="absolute top-3 right-3 p-1.5 bg-black/20 hover:bg-black/40 rounded-full text-white/80 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-inner">
                        <Download className="w-8 h-8 text-white animate-bounce" />
                    </div>
                </div>

                <div className="p-6 text-center">
                    <h3 className="text-xl font-bold text-white mb-2">New Update Available!</h3>
                    <div className="inline-block px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-[10px] font-bold text-purple-400 mb-4 uppercase tracking-wider">
                        v{currentVersion} → v{update.version}
                    </div>

                    <p className="text-gray-400 text-sm leading-relaxed mb-6">
                        {update.message || "We've added new features and improved performance for a better experience."}
                    </p>

                    {isForceUpdate && (
                        <div className="flex items-center gap-2 justify-center mb-6 text-amber-400 text-[11px] font-medium bg-amber-400/10 p-2 rounded-lg border border-amber-400/20">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            This is a mandatory update to continue using the app.
                        </div>
                    )}

                    <div className="space-y-3">
                        <a
                            href={update.apkUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-center gap-2 w-full py-3.5 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-bold text-sm transition-all active:scale-[0.98] shadow-lg shadow-purple-600/20"
                        >
                            <Download className="w-4 h-4" /> Download & Install
                        </a>

                        {!isForceUpdate && (
                            <button
                                onClick={() => setIsVisible(false)}
                                className="w-full py-3 text-gray-500 hover:text-gray-300 text-sm font-medium transition-colors"
                            >
                                Not now
                            </button>
                        )}
                    </div>
                </div>

                <div className="px-6 py-4 bg-gray-950/50 border-t border-gray-800 text-center">
                    <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold">ShopBook Pro Ecosystem</p>
                </div>
            </div>
        </div>
    );
}
