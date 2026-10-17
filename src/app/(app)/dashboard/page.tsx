'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Script from 'next/script';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Package, Receipt, UserPlus, Users, Bell, FileText, Send, Building, Star, ShieldCheck, Download, MessageSquare, Palette, LogOut, Activity } from 'lucide-react';
import { getActiveUser, getUserData, saveUserData, initializeDataCache, User, Reminder, getViewMode, Customer, Transaction, getIsPremium } from '@/lib/data-layer';
import { WhatsAppSelectModal } from '@/components/whatsapp-select-modal';
import { getAppUpdate, AppUpdate, submitComplaint } from '@/lib/admin-service';
import { auth, db } from '@/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';
import { SyncStatusIndicator } from '@/components/sync-status-indicator';
import { Capacitor } from '@capacitor/core';
import { getEmployeeSession, clearEmployeeSession, EmployeeSession } from '@/lib/employee-service';

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
  const { toast } = useToast();
  const isUserView = getViewMode() === 'user';
  const [isPremiumMode, setIsPremiumMode] = useState(true);
  const [adRefreshKey, setAdRefreshKey] = useState(0);
  const [appUpdate, setAppUpdate] = useState<AppUpdate | null>(null);
  const [employeeSession, setEmployeeSession] = useState<EmployeeSession | null>(null);

  // Complaints states
  const [complaints, setComplaints] = useState<any[]>([]);
  const [submittingComplaint, setSubmittingComplaint] = useState(false);
  const [complaintText, setComplaintText] = useState('');
  const [whatsAppModalData, setWhatsAppModalData] = useState<{
    customerName: string;
    customerPhone: string;
    message: string;
    reminderId?: string;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setIsPremiumMode(getIsPremium());
    // Check if employee is logged in
    const empSess = getEmployeeSession();
    setEmployeeSession(empSess);

    // Auth listener with Employee session support
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      const activeUser = getActiveUser();

      if (!firebaseUser && !activeUser) {
        // Redirect to login if neither firebaseUser nor activeUser exists
        router.replace('/login');
        return;
      }

      if (!activeUser) return;
      setUser(activeUser);

      try {
        const data = await initializeDataCache(activeUser.email);
        setReminders(data.reminders || []);
        setCustomers(data.customers || []);
        setTransactions(data.transactions || []);

        // Fetch complaints
        const docRef = doc(db, 'users', activeUser.email);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setComplaints(docSnap.data().complaints || []);
        }
      } catch (e) {
        console.error("Error loading dashboard data:", e);
      } finally {
        setLoading(false);
      }

      getAppUpdate().then(setAppUpdate);
    });

    const handleUpdate = () => {
      const active = getActiveUser();
      if (active) {
        setUser(active);
        const data = getUserData(active.email);
        setReminders(data.reminders || []);
        setCustomers(data.customers || []);
        setTransactions(data.transactions || []);
        getDoc(doc(db, 'users', active.email)).then(docSnap => {
          if (docSnap.exists()) {
            setComplaints(docSnap.data().complaints || []);
          }
        });
      }
      setIsPremiumMode(getIsPremium());
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
    let phone = reminder.customerPhone || '';
    if (!phone && reminder.customerId) {
      const matched = customers.find(c => c.id === reminder.customerId);
      if (matched) phone = matched.phone;
    }
    setWhatsAppModalData({
      customerName: reminder.customerName || 'Customer',
      customerPhone: phone,
      message: reminder.message,
      reminderId: reminder.id
    });
  };

  const handleSubmitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintText.trim() || !user?.email) return;
    setSubmittingComplaint(true);
    try {
      await submitComplaint(user.email, complaintText);
      toast({ title: '✅ Complaint Submitted', description: 'We have received your complaint and will review it.' });
      setComplaintText('');
      const docRef = doc(db, 'users', user.email);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setComplaints(docSnap.data().complaints || []);
      }
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to submit complaint. Please try again.' });
    } finally {
      setSubmittingComplaint(false);
    }
  };

  const upcomingReminders = useMemo(() => {
    return reminders
      .filter(r => r.status !== 'completed' && new Date(r.dueDate) >= new Date())
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 5);
  }, [reminders]);

  const { totalJama, totalUdhar, netBalance } = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];

    let jama = 0;
    let udhar = 0;

    // Filter transactions for customers (non-suppliers) and only today's entries
    const customerIds = new Set(customers.filter(c => !c.isSupplier).map(c => c.id));
    const customerTxs = transactions
      .filter(tx => customerIds.has(tx.customerId) && tx.date?.startsWith(today));

    customerTxs.forEach(tx => {
      if (tx.type === 'debit') {
        jama += tx.totalAmount;
      } else {
        jama += (tx.amountPaid || 0);
        if (tx.additionalPayments) {
          jama += tx.additionalPayments.reduce((sum, p) => sum + p.amount, 0);
        }
        if (tx.remainingBalance > 0) {
          udhar += tx.remainingBalance;
        }
      }
    });

    return {
      totalJama: jama,
      totalUdhar: udhar,
      netBalance: jama - udhar
    };
  }, [transactions, customers]);

  const quickActions: QuickAction[] = [
    { href: '/items', labelKey: 'quick_items', icon: Package },
    { href: '/customers/new', labelKey: 'quick_addCustomer', icon: UserPlus },
    { href: '/customers', labelKey: 'quick_customers', icon: Users },
    { href: '/suppliers', labelKey: 'quick_suppliers', icon: Building, userViewOnly: true },
    { href: '/reminders', labelKey: 'quick_reminders', icon: Bell },
    { href: '/settings/bill-design', labelKey: 'bill_design_settings', icon: Palette },
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

        {/* Employee Session Banner */}
        {employeeSession && (
          <div className="mb-6 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-amber-700 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-amber-900 dark:text-amber-300 text-sm">
                👤 Staff: {employeeSession.employeeName}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                Shop: {employeeSession.ownerEmail}
              </p>
            </div>
            <button
              onClick={() => {
                clearEmployeeSession();
                localStorage.removeItem('cashbookpro_activeUser');
                window.location.href = '/employee-login';
              }}
              className="flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 px-3 py-1.5 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Staff Logout
            </button>
          </div>
        )}

        {/* Global APK Download Banner for Web Users */}
        {appUpdate && !Capacitor.isNativePlatform() && (
          <div className="mb-8 rounded-2xl bg-gradient-to-r from-purple-600/10 to-blue-600/10 border border-purple-500/20 p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shrink-0 shadow-lg">
                <Download className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-900 dark:text-white">Get the {appUpdate.isActive ? 'Latest' : 'Official'} Android App</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {appUpdate.isActive ? appUpdate.message : 'Enjoy a smoother experience with offline support and faster performance.'}
                </p>
              </div>
              {appUpdate.apkUrl && (
                <a
                  href={appUpdate.apkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-sm font-bold shadow-md hover:scale-105 transition-transform whitespace-nowrap"
                >
                  Download APK
                </a>
              )}
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

        <Separator className="my-8 border-[#E5E2DA] dark:border-[#333333]" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Submit Complaint Card */}
          <Card className="bg-white dark:bg-[#1E1E1E] border-[#CFCAC0] dark:border-[#333333] shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-serif font-bold text-[#2F2F2F] dark:text-[#E0E0E0] flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#8C6A4F] dark:text-[#A68A73]" />
                Feedback & Complaints / رائے اور شکایت
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground dark:text-gray-400 font-sans">
                If you face any issues, have suggestions, or want to report a bug, write to us directly. The admin team will reply here.
              </p>
              <form onSubmit={handleSubmitComplaint} className="space-y-3">
                <textarea
                  className="w-full min-h-[100px] p-3 text-sm rounded-xl border border-[#D3D3D3] dark:border-[#333333] bg-[#FAF8F3] dark:bg-[#121212] dark:text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#8C6A4F] resize-none"
                  placeholder="e.g. Bill print format needs custom fonts..."
                  value={complaintText}
                  onChange={(e) => setComplaintText(e.target.value)}
                  disabled={submittingComplaint}
                  required
                />
                <button
                  type="submit"
                  disabled={submittingComplaint || !complaintText.trim()}
                  className="w-full py-2.5 bg-[#6B7A50] text-white rounded-xl text-sm font-bold shadow-md hover:bg-[#5A6843] transition-all disabled:opacity-50"
                >
                  {submittingComplaint ? 'Submitting...' : 'Submit Feedback / Shikayat Bhejein'}
                </button>
              </form>
            </CardContent>
          </Card>

          {/* History Card */}
          <Card className="bg-white dark:bg-[#1E1E1E] border-[#CFCAC0] dark:border-[#333333] shadow-sm flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-serif font-bold text-[#2F2F2F] dark:text-[#E0E0E0]">
                Previous Ticket History
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto max-h-[260px] space-y-4 pr-1">
              {complaints.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground dark:text-gray-500 py-10">
                  <MessageSquare className="w-8 h-8 opacity-20 mb-2" />
                  <p className="text-xs italic">No tickets submitted yet.</p>
                </div>
              ) : (
                [...complaints].reverse().map((ticket) => (
                  <div key={ticket.id} className="p-3 rounded-xl bg-[#FAF8F3] dark:bg-[#121212] border border-[#E5E2DA] dark:border-[#333333] space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] text-muted-foreground dark:text-gray-500">
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ticket.status === 'resolved' ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'}`}>
                        {ticket.status === 'resolved' ? 'Resolved' : 'Pending'}
                      </span>
                    </div>
                    <p className="text-sm dark:text-white break-words">{ticket.text}</p>
                    {ticket.reply && (
                      <div className="mt-2 p-2.5 rounded-lg bg-green-500/5 border-l-2 border-green-500 text-xs text-green-800 dark:text-green-300">
                        <span className="font-bold block mb-0.5">Admin Reply:</span>
                        {ticket.reply}
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

      </div>

      {whatsAppModalData && (
        <WhatsAppSelectModal
          isOpen={!!whatsAppModalData}
          onClose={() => setWhatsAppModalData(null)}
          customerName={whatsAppModalData.customerName}
          customerPhone={whatsAppModalData.customerPhone}
          message={whatsAppModalData.message}
          title="Send Reminder via WhatsApp / واٹس ایپ ریمائنڈر"
          onSent={() => {
            if (whatsAppModalData.reminderId && user?.email) {
              const data = getUserData(user.email);
              data.reminders = data.reminders.map(r =>
                r.id === whatsAppModalData.reminderId ? { ...r, status: 'sent' as const } : r
              );
              saveUserData(user.email, data);
              setReminders(data.reminders);
              toast({ title: t('reminderSent') || 'Reminder sent successfully' });
            }
          }}
        />
      )}
    </div>
  );
}
