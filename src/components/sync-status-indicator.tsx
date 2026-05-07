"use client"

import { useSyncStatus } from '@/lib/data-layer';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SyncStatusIndicator({ className }: { className?: string }) {
    const status = useSyncStatus();

    if (status === 'syncing') {
        return (
            <div className={cn("flex items-center gap-1.5 text-blue-500 animate-pulse", className)}>
                <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
                <span className="text-[10px] font-bold uppercase tracking-tighter">Syncing...</span>
            </div>
        );
    }

    if (status === 'offline') {
        return (
            <div className={cn("flex items-center gap-1.5 text-gray-500", className)}>
                <CloudOff className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-tighter">Offline</span>
            </div>
        );
    }

    return (
        <div className={cn("flex items-center gap-1.5 text-green-500/60", className)}>
            <Cloud className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Synced</span>
        </div>
    );
}
