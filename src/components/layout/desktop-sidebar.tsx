'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, Receipt, Building, Settings, Bell, LogOut, Download, Star, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/use-translation';
import { useEffect, useState } from 'react';
import { getViewMode, getActiveUser, User } from '@/lib/data-layer';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { auth } from '@/firebase/config';
import { signOut } from 'firebase/auth';
import { getAppUpdate, AppUpdate, isAdmin } from '@/lib/admin-service';
import { SyncStatusIndicator } from '@/components/sync-status-indicator';
import { Capacitor } from '@capacitor/core';

export function DesktopSidebar({ className }: { className?: string }) {
    const pathname = usePathname();
    const router = useRouter();
    const { t } = useTranslation();
    const [isUserView, setIsUserView] = useState(true);
    // Fix hydration: load user only in useEffect (client-side only)
    const [activeUser, setActiveUser] = useState<User | null>(null);
    const [appUpdate, setAppUpdate] = useState<AppUpdate | null>(null);

    useEffect(() => {
        const updateUI = () => {
            setIsUserView(getViewMode() === 'user');
            setActiveUser(getActiveUser());
        };
        updateUI();

        // Check for app development info
        getAppUpdate().then((update) => {
            if (update) setAppUpdate(update);
        });

        if (typeof window !== 'undefined') {
            window.addEventListener('cashbookpro_data_updated', updateUI);
            return () => window.removeEventListener('cashbookpro_data_updated', updateUI);
        }
    }, []);

    const navLinks = [
        { href: '/dashboard', label: t('dashboard'), icon: LayoutDashboard },
        { href: '/customers', label: t('customers'), icon: Users },
        { href: '/suppliers', label: t('suppliers'), icon: Building, userViewOnly: true },
        { href: '/transactions', label: t('transactions'), icon: Receipt },
        { href: '/reminders', label: t('reminders'), icon: Bell },
        { href: '/settings', label: t('settings'), icon: Settings },
        { href: '/premium', label: 'Premium', icon: Star },
    ];

    // Add Admin Panel link if the user is an admin
    if (activeUser && isAdmin(activeUser.email)) {
        navLinks.push({ href: '/admin', label: 'Admin Panel', icon: ShieldCheck });
    }

    const filteredNavLinks = navLinks.filter(link => !link.userViewOnly || isUserView);

    const handleLogout = async () => {
        await signOut(auth);
        setActiveUser(null); // Clear local session and data cache
        router.push('/login');
    };

    return (
        <aside className={cn("hidden md:flex flex-col w-64 h-screen border-r bg-card/50 backdrop-blur-sm sticky top-0 transition-all", className)}>
            <div className="flex flex-col h-full py-6">
                {/* Brand Header */}
                <div className="px-6 mb-8 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <LayoutDashboard className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold tracking-tight">MyShopBook</h1>
                        <div className="flex items-center gap-2">
                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Business Ledger</p>
                            <span className="text-muted-foreground/30">•</span>
                            <SyncStatusIndicator />
                        </div>
                    </div>
                </div>

                {/* APK Update / Download Banner */}
                {appUpdate && !Capacitor.isNativePlatform() && (
                    <div className="mx-4 mb-4 rounded-xl bg-orange-500/10 border border-orange-500/30 p-3">
                        <p className="text-xs font-bold text-orange-400 mb-1">🔔 {appUpdate.isActive ? 'Update Available!' : 'Get Android App'}</p>
                        <p className="text-[11px] text-orange-200/80 mb-2 leading-tight">
                            {appUpdate.isActive ? appUpdate.message : 'For a better management experience, download our Android App.'}
                        </p>
                        {appUpdate.apkUrl && (
                            <a
                                href={appUpdate.apkUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1.5 text-[11px] font-bold text-white bg-orange-500 hover:bg-orange-400 px-3 py-1.5 rounded-lg transition-colors"
                            >
                                <Download className="w-3 h-3" /> Download APK
                            </a>
                        )}
                    </div>
                )}

                {/* Navigation Links */}
                <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
                    {filteredNavLinks.map(({ href, label, icon: Icon }) => {
                        const isActive = (href === '/dashboard' && pathname === href) || (href !== '/dashboard' && pathname.startsWith(href));
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={cn(
                                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative active:scale-95',
                                    isActive
                                        ? 'bg-primary text-primary-foreground shadow-md'
                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                )}
                            >
                                <Icon className={cn("w-5 h-5", isActive ? "" : "group-hover:scale-110 transition-transform")} />
                                {label}
                                {isActive && <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-primary-foreground/50" />}
                            </Link>
                        );
                    })}
                </nav>

                {/* User Card & Logout */}
                <div className="mt-auto px-4 space-y-3 pt-6 border-t border-muted/50">
                    {activeUser && (
                        <div className="flex items-center gap-3 px-2 py-3 bg-muted/40 rounded-xl">
                            <Avatar className="h-9 w-9 border-2 border-background">
                                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                    {activeUser.name.charAt(0)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate leading-tight">{activeUser.name}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{activeUser.email}</p>
                            </div>
                        </div>
                    )}

                    <Button
                        variant="ghost"
                        className="w-full justify-start gap-3 h-11 text-muted-foreground hover:text-destructive active:scale-95"
                        onClick={handleLogout}
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="font-semibold">{t('logout')}</span>
                    </Button>
                </div>
            </div>
        </aside>
    );
}
