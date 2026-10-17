'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/firebase/config';
import { getActivityLog, ActivityLog } from '@/lib/employee-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Receipt,
    CreditCard,
    UserPlus,
    UserMinus,
    Package,
    Activity,
    RefreshCcw,
    Clock,
} from 'lucide-react';

const ACTION_CONFIG: Record<
    ActivityLog['action'],
    { label: string; icon: React.ElementType; color: string }
> = {
    bill_created: { label: 'Bill Banaya', icon: Receipt, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
    payment_added: { label: 'Payment Add Kia', icon: CreditCard, color: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
    customer_added: { label: 'Customer Add Kia', icon: UserPlus, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
    customer_deleted: { label: 'Customer Delete Kia', icon: UserMinus, color: 'text-red-600 bg-red-50 dark:bg-red-900/20' },
    item_updated: { label: 'Item Update Kia', icon: Package, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
};

function timeAgo(dateStr: string): string {
    const now = Date.now();
    const diff = now - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'abhi';
    if (minutes < 60) return `${minutes} min pehle`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ghante pehle`;
    const days = Math.floor(hours / 24);
    return `${days} din pehle`;
}

export default function ActivityLogPage() {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const loadLogs = useCallback(async (email: string) => {
        setLoading(true);
        try {
            const data = await getActivityLog(email, 100);
            setLogs(data);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const unsub = auth.onAuthStateChanged((user) => {
            if (!user?.email) { router.replace('/login'); return; }
            loadLogs(user.email);
        });
        return () => unsub();
    }, [loadLogs, router]);

    return (
        <div className="container mx-auto p-4 sm:p-6 md:p-8 bg-[#FAF8F3] dark:bg-[#121212] min-h-screen">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-serif font-bold text-[#2F2F2F] dark:text-[#E0E0E0] flex items-center gap-2">
                        <Activity className="w-6 h-6 text-[#6B7A50]" /> Activity Log
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">Staff aur Owner ki tamam karkargi (actions)</p>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <RefreshCcw className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
            ) : logs.length === 0 ? (
                <Card className="bg-white dark:bg-[#1E1E1E]">
                    <CardContent className="flex flex-col items-center py-16 gap-3">
                        <Activity className="w-12 h-12 text-muted-foreground/30" />
                        <p className="text-muted-foreground font-serif italic">Abhi tak koi activity nahi.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {logs.map((log) => {
                        const cfg = ACTION_CONFIG[log.action];
                        const Icon = cfg.icon;
                        return (
                            <Card key={log.id} className="bg-white dark:bg-[#1E1E1E] border-[#CFCAC0] dark:border-[#333333]">
                                <CardContent className="p-4 flex items-start gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.color}`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <span className="font-bold text-sm dark:text-white">{log.performedBy.name}</span>
                                            <Badge
                                                variant="outline"
                                                className="text-[10px] px-1.5 py-0 capitalize border-gray-200 dark:border-gray-700"
                                            >
                                                {log.performedBy.role}
                                            </Badge>
                                            <span className="text-xs font-semibold text-muted-foreground">{cfg.label}</span>
                                        </div>
                                        <p className="text-sm text-gray-700 dark:text-gray-300 break-words">{log.details}</p>
                                        <div className="flex items-center gap-1 mt-1.5 text-[11px] text-muted-foreground">
                                            <Clock className="w-3 h-3" />
                                            <span>{timeAgo(log.createdAt)}</span>
                                            <span className="mx-1">·</span>
                                            <span>{new Date(log.createdAt).toLocaleDateString('en-PK')}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
