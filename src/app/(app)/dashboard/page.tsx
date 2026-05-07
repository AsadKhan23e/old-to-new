'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Script from 'next/script';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Package, Receipt, UserPlus, Users, Bell, FileText, Send, Building, Star, ShieldCheck, Download } from 'lucide-react';
import { getActiveUser, getUserData, initializeDataCache, User, Reminder, getViewMode, Customer, Transaction, getIsPremium } from '@/lib/data-layer';
import { getAppUpdate, AppUpdate } from '@/lib/admin-service';
import { auth } from '@/firebase/config';
import { useTranslation } from '@/hooks/use-translation';
import { SyncStatusIndicator } from '@/components/sync-status-indicator';

type QuickAction = {
  href: string;
  labelKey: string;
  icon: React.ElementType;
  userViewOnly?: boolean;
};

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const { t } = useTranslation();
  const isUserView = getViewMode() === 'user';
  const [isPremiumMode, setIsPremiumMode] = useState(true);
  const [adRefreshKey, setAdRefreshKey] = useState(0);
  const [appUpdate, setAppUpdate] = useState<AppUpdate | null>(null);

  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setIsPremiumMode(getIsPremium());

    // Standard Firebase auth listener
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {

      if (!firebaseUser) {
        // Redirect to login if not authenticated
        router.replace('/login');
        return;
      }

      const activeUser = {
        name: firebaseUser.displayName || 'User',
        email: firebaseUser.email || ''
      };
      setUser(activeUser);

      try {
        const data = await initializeDataCache(activeUser.email);
        setReminders(data.reminders || []);
        setCustomers(data.customers || []);
        setTransactions(data.transactions || []);
      } catch (e) {
        console.error("Error loading dashboard data:", e);
      } finally {
        setLoading(false);
      }

      // Check for app update
      getAppUpdate().then((update) => {
        if (update && update.isActive) setAppUpdate(update);
      });
    });

    const handleUpdate = () => {
      const active = getActiveUser();
      if (active) setUser(active);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('cashbookpro_data_updated', handleUpdate);
    }

    return () => {
      unsubscribe();
      // Cleanup
      if (typeof window !== 'undefined') {
        window.removeEventListener('cashbookpro_data_updated', handleUpdate);
      }
    };
  }, [router]);

  const handleSendReminder = (reminder: Reminder) => {
    const message = reminder.message;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile) {
      window.location.href = `sms:?body=${encodeURIComponent(message)}`;
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    }
  };

  const upcomingReminders = useMemo(() => {
    return reminders
      .filter(r => r.status !== 'completed' && new Date(r.dueDate) >= new Date())
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 5);
  }, [reminders]);

  const { totalJama, totalUdhar, netBalance } = useMemo(() => {
    let jama = 0;
    let udhar = 0;

    // Filter transactions for customers (non-suppliers)
    const customerIds = new Set(customers.filter(c => !c.isSupplier).map(c => c.id));
    const customerTxs = transactions.filter(tx => customerIds.has(tx.customerId));

    customerTxs.forEach(tx => {
      // Jama (Money Received)
      if (tx.type === 'debit') {
        jama += tx.totalAmount;
      } else {
        jama += (tx.amountPaid || 0);
        if (tx.additionalPayments) {
          jama += tx.additionalPayments.reduce((sum, p) => sum + p.amount, 0);
        }
      }
    });

    // Calculate Udhar correctly: sum of all customer balances
    customers.filter(c => !c.isSupplier).forEach(customer => {
      const customerTxs = transactions.filter(t => t.customerId === customer.id);
      if (customerTxs.length > 0) {
        const sortedTxs = [...customerTxs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const latestTx = sortedTxs[0];
        if (latestTx.remainingBalance > 0) {
          udhar += latestTx.remainingBalance;
        }
      }
    });

    return {
      totalJama: jama,
      totalUdhar: udhar,
      netBalance: udhar
    };
  }, [transactions, customers]);

  const quickActions: QuickAction[] = [
    { href: '/items', labelKey: 'quick_items', icon: Package },
    { href: '/transactions', labelKey: 'quick_transactions', icon: Receipt },
    { href: '/customers/new', labelKey: 'quick_addCustomer', icon: UserPlus },
    { href: '/customers', labelKey: 'quick_customers', icon: Users },
    { href: '/suppliers', labelKey: 'quick_suppliers', icon: Building, userViewOnly: true },
    { href: '/reminders', labelKey: 'quick_reminders', icon: Bell },
    { href: '/reports/customers', labelKey: 'quick_reports', icon: FileText },
    { href: '/premium', labelKey: 'premiumTitle', icon: Star },
  ];

  if (user && user.email === 'king.khan648k@gmail.com') {
    quickActions.push({ href: '/admin', labelKey: 'adminPanel', icon: ShieldCheck } as any);
  }

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FAF8F3] dark:bg-[#121212] transition-colors duration-300">
        <p className="text-muted-foreground dark:text-[#A68A73] font-serif italic">Loading Ledger...</p>
      </div>
    );
  }

  return (
    <div className="bg-[#FAF8F3] dark:bg-[#121212] min-h-screen transition-colors duration-300">
      <div className="container mx-auto p-4 sm:p-6 md:p-8">
        <header className="mb-8 border-b border-[#CFCAC0] dark:border-[#333333] pb-4 text-center sm:text-left">
          <h2 className="text-3xl font-serif font-bold text-[#2F2F2F] dark:text-[#E0E0E0] flex items-center gap-3">
            {t('greeting')}, {user.name}
            <SyncStatusIndicator className="mt-1" />
          </h2>
          <p className="text-sm italic font-serif text-muted-foreground dark:text-[#A68A73] mt-1">Daily Business Journal</p>
        </header>

        {/* App Update Notification for Mobile & Desktop */}
        {appUpdate && (
          <div className="mb-8 rounded-2xl bg-orange-500/10 border border-orange-500/30 p-4 shadow-sm animate-in fade-in slide-in-from-top duration-500">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center shrink-0">
                <Download className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-orange-600 dark:text-orange-400">Update Available! (v{appUpdate.version})</h4>
                <p className="text-sm text-orange-800/80 dark:text-orange-200/80 mt-1">{appUpdate.message}</p>
                {appUpdate.apkUrl && (
                  <a
                    href={appUpdate.apkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold transition-all active:scale-95 shadow-md shadow-orange-500/20"
                  >
                    <Download className="w-4 h-4" /> Download New Version
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {upcomingReminders.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-serif font-bold mb-4 border-l-4 border-[#6B7A50] pl-2 dark:text-[#E0E0E0]">{t('upcomingReminders')}</h3>
            <div className="space-y-3">
              {upcomingReminders.map(reminder => (
                <Card key={reminder.id} className="bg-white dark:bg-[#1E1E1E] border-[#D3D3D3] dark:border-[#333333] shadow-sm">
                  <CardContent className="p-3 flex justify-between items-center">
                    <div>
                      <p className="font-bold font-serif text-sm dark:text-[#E0E0E0]">{reminder.customerName}</p>
                      <p className="text-xs font-sans text-muted-foreground dark:text-gray-400">
                        Due: {new Date(reminder.dueDate).toLocaleDateString()} - {reminder.dueAmount.toLocaleString()}
                      </p>
                    </div>
                    <button className="bg-[#6B7A50] text-white px-4 py-1.5 rounded-md text-sm flex items-center hover:opacity-90 transition-opacity" onClick={() => handleSendReminder(reminder)}>
                      <Send className="mr-2 h-4 w-4" />{t('send')}
                    </button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-4 mb-8">
          {quickActions.map(action => {
            if (action.userViewOnly && !isUserView) return null;
            return (
              <Link href={action.href} key={action.href}>
                <Card className="bg-white dark:bg-[#1E1E1E] hover:bg-[#E5E2DA] dark:hover:bg-[#333333] transition-colors text-center flex flex-col items-center justify-center p-4 h-28 border-[#CFCAC0] dark:border-[#333333]">
                  <action.icon className="w-8 h-8 mb-2 text-[#8C6A4F] dark:text-[#A68A73]" />
                  <p className="font-bold font-serif text-[10px] sm:text-xs text-center leading-tight dark:text-[#E0E0E0]">{t(action.labelKey)}</p>
                </Card>
              </Link>
            );
          })}
        </div>

        <Separator className="my-8 border-[#E5E2DA] dark:border-[#333333]" />

        <div>
          <h3 className="text-xl font-serif font-bold mb-4 border-l-4 border-[#8C6A4F] dark:border-[#A68A73] pl-2 dark:text-[#E0E0E0]">{t('summary_title')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-white dark:bg-[#1E1E1E] border-[#CFCAC0] dark:border-[#333333]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-serif uppercase tracking-wider dark:text-[#A68A73]">{t('summary_totalJama')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-sans font-bold text-green-700 dark:text-green-500">{totalJama.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-[#1E1E1E] border-[#CFCAC0] dark:border-[#333333]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-serif uppercase tracking-wider dark:text-[#A68A73]">{t('summary_totalUdhar')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-sans font-bold text-red-700 dark:text-red-500">{totalUdhar.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-[#1E1E1E] border-[#CFCAC0] dark:border-[#333333]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-serif uppercase tracking-wider dark:text-[#A68A73]">{t('summary_netBalance')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-sans font-bold dark:text-white">{netBalance.toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    </div>
  );
}
