'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Send, CheckCircle2, Clock, MessageSquare, Search, UserCircle, Share2, X } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getActiveUser, getUserData, saveUserData, User, Customer, Transaction, Reminder } from '@/lib/data-layer';
import { useTranslation } from '@/hooks/use-translation';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { WhatsAppSelectModal } from '@/components/whatsapp-select-modal';

// Calculate correct net balance for a customer
function calcBalance(transactions: Transaction[], customerId: string): number {
  return transactions
    .filter(t => t.customerId === customerId)
    .reduce((acc, tx) => {
      // Use remainingBalance from last transaction if available
      return tx.remainingBalance !== undefined ? tx.remainingBalance : acc;
    }, 0);
}

// Get oldest unpaid transaction date for a customer
function getOldestUnpaidDate(transactions: Transaction[], customerId: string): Date | null {
  const unpaid = transactions
    .filter(t => t.customerId === customerId && !t.paid && t.remainingBalance > 0)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return unpaid.length > 0 ? new Date(unpaid[0].date) : null;
}

// Format days overdue
function getDaysOverdue(date: Date | null): { text: string; color: string } {
  if (!date) return { text: '', color: '' };
  const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 7) return { text: `${days} days ago`, color: 'text-yellow-500' };
  if (days <= 30) return { text: `${days} days ago`, color: 'text-orange-500' };
  return { text: `${days} days ago`, color: 'text-red-500' };
}

// Helper to format WhatsApp numbers correctly (adds Pakistan code 92 if number starts with 0)
const formatPhoneForWhatsApp = (phoneNumber: string) => {
  let cleaned = phoneNumber.replace(/\D/g, '');
  if (cleaned.startsWith('0') && !cleaned.startsWith('00')) {
    cleaned = '92' + cleaned.substring(1);
  }
  return cleaned;
};

export default function RemindersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'customers' | 'reminders'>('customers');
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [whatsAppModalData, setWhatsAppModalData] = useState<{
    customerName: string;
    customerPhone: string;
    message: string;
    reminderId?: string;
    customerId?: string;
  } | null>(null);

  const loadData = useCallback((userEmail: string) => {
    const data = getUserData(userEmail);
    setReminders(data.reminders);
    setCustomers(data.customers.filter(c => !c.isSupplier));
    setTransactions(data.transactions);
  }, []);

  useEffect(() => {
    const user = getActiveUser();
    if (user) {
      setActiveUser(user);
      loadData(user.email);
    } else {
      router.push('/login');
    }

    const onUpdate = () => {
      const u = getActiveUser();
      if (u) loadData(u.email);
    };
    window.addEventListener('cashbookpro_data_updated', onUpdate);
    return () => window.removeEventListener('cashbookpro_data_updated', onUpdate);
  }, [router, loadData]);

  // Customers with a positive due balance
  const customersWithDue = useMemo(() => {
    return customers
      .map(c => {
        // Use the last transaction's remainingBalance for accuracy
        const customerTxs = transactions
          .filter(t => t.customerId === c.id)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // The true balance = last transaction's remainingBalance
        const balance = customerTxs.length > 0 ? (customerTxs[0].remainingBalance ?? 0) : 0;
        const oldestDate = getOldestUnpaidDate(transactions, c.id);
        return { ...c, balance, oldestDate };
      })
      .filter(c => c.balance > 0)
      .sort((a, b) => b.balance - a.balance);
  }, [customers, transactions]);

  const filteredCustomers = useMemo(() => {
    if (!search) return customersWithDue;
    const q = search.toLowerCase();
    return customersWithDue.filter(c =>
      c.name.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }, [customersWithDue, search]);

  const handleSendWhatsApp = (customer: { id: string; name: string; phone: string; balance: number }, reminderMsg?: string) => {
    const msg = reminderMsg || `السلام علیکم ${customer.name}، آپ کے بقایا جات Rs. ${customer.balance.toLocaleString()} ادا طلب ہیں۔ براہ کرم جلد از جلد ادائیگی فرمائیں۔ شکریہ!`;
    setWhatsAppModalData({
      customerName: customer.name,
      customerPhone: customer.phone,
      message: msg,
      customerId: customer.id
    });
  };

  const handleShareReminder = async (customer: { id: string; name: string; phone: string; balance: number }, reminderMsg?: string) => {
    const msg = reminderMsg || `Hello ${customer.name}, your payment of Rs. ${customer.balance.toLocaleString()} is due. Please pay as soon as possible. Thank you.`;

    // Also mark reminder as sent if exists
    if (activeUser) {
      const data = getUserData(activeUser.email);
      const existing = data.reminders.find(r => r.customerPhone === customer.phone || r.customerId === customer.id);
      if (existing) {
        data.reminders = data.reminders.map(r =>
          (r.customerPhone === customer.phone || r.customerId === customer.id) ? { ...r, status: 'sent' as const } : r
        );
        saveUserData(activeUser.email, data);
        setReminders(data.reminders);
      }
    }

    if (Capacitor.isNativePlatform()) {
      try {
        await Share.share({
          title: 'Payment Reminder',
          text: msg,
          dialogTitle: 'Share Reminder'
        });
      } catch (e) {
        console.error('Native share failed:', e);
      }
    } else if (navigator.share) {
      try {
        await navigator.share({
          title: 'Payment Reminder',
          text: msg,
        });
      } catch (e) {
        console.error('Web share failed:', e);
      }
    } else {
      try {
        await navigator.clipboard.writeText(msg);
        toast({ title: 'Reminder copied to clipboard!' });
      } catch (err) {
        console.error('Clipboard copy failed:', err);
      }
    }
  };

  const updateReminderStatus = (reminderId: string, status: 'sent' | 'completed') => {
    if (!activeUser) return;
    const data = getUserData(activeUser.email);
    data.reminders = data.reminders.map(r => r.id === reminderId ? { ...r, status } : r);
    saveUserData(activeUser.email, data);
    setReminders(data.reminders);
    if (status === 'sent') toast({ title: t('reminderSent') });
    if (status === 'completed') toast({ title: t('reminderCompleted') });
  };

  const handleSendFromReminder = (reminder: Reminder) => {
    setWhatsAppModalData({
      customerName: reminder.customerName,
      customerPhone: reminder.customerPhone,
      message: reminder.message,
      reminderId: reminder.id,
      customerId: reminder.customerId
    });
  };

  const handleShareFromReminder = async (reminder: Reminder) => {
    updateReminderStatus(reminder.id, 'sent');
    if (Capacitor.isNativePlatform()) {
      try {
        await Share.share({
          title: 'Payment Reminder',
          text: reminder.message,
          dialogTitle: 'Share Reminder'
        });
      } catch (e) {
        console.error('Native share failed:', e);
      }
    } else if (navigator.share) {
      try {
        await navigator.share({
          title: 'Payment Reminder',
          text: reminder.message,
        });
      } catch (e) {
        console.error('Web share failed:', e);
      }
    } else {
      try {
        await navigator.clipboard.writeText(reminder.message);
        toast({ title: 'Reminder copied to clipboard!' });
      } catch (err) {
        console.error('Clipboard copy failed:', err);
      }
    }
  };

  const sortedReminders = useMemo(() =>
    [...reminders].sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()),
    [reminders]
  );
  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8 max-w-3xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          {t('remindersTitle')}
        </h2>
      </div>

      {/* Tabs: Customers with Due | Saved Reminders */}
      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="customers">
            Customers with Due ({customersWithDue.length})
          </TabsTrigger>
          <TabsTrigger value="reminders">
            Saved Reminders ({reminders.length})
          </TabsTrigger>
        </TabsList>

        {/* ---- TAB 1: Customers with Due Balance ---- */}
        <TabsContent value="customers">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {filteredCustomers.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted p-12 text-center mt-4">
              <CheckCircle2 className="h-14 w-14 text-green-500 mb-3" />
              <p className="font-semibold text-lg">All Clear!</p>
              <p className="text-muted-foreground text-sm">No customers with outstanding dues.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCustomers.map(customer => {
                const ageing = getDaysOverdue(customer.oldestDate);
                return (
                  <Card key={customer.id} className="overflow-hidden border dark:border-gray-700 hover:shadow-md transition-shadow">
                    <CardContent className="p-0">
                      <div className="flex items-center gap-3 p-4">
                        {/* Avatar (Click to Zoom) */}
                        <div
                          className="h-12 w-12 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center shrink-0 border-2 border-primary/20 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={(e) => {
                            if (customer.picture) {
                              e.stopPropagation();
                              setViewImage(customer.picture);
                            }
                          }}
                        >
                          {customer.picture ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={customer.picture} alt={customer.name} className="h-full w-full object-cover" />
                          ) : (
                            <span className="font-bold text-primary text-lg">
                              {customer.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-base truncate dark:text-white">{customer.name}</p>
                          <p className="text-sm text-muted-foreground">{customer.phone}</p>
                          {ageing.text && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Clock className={`h-3 w-3 ${ageing.color}`} />
                              <span className={`text-xs font-medium ${ageing.color}`}>
                                Oldest due: {ageing.text}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Balance + Send & Share */}
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Due Balance</p>
                            <p className="text-lg font-bold text-red-500">
                              Rs. {customer.balance.toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
                              onClick={() => handleSendWhatsApp(customer)}
                            >
                              <Send className="h-3.5 w-3.5" />
                              Send WhatsApp
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleShareReminder(customer)}
                              className="gap-1.5"
                              title="Share to other apps"
                            >
                              <Share2 className="h-3.5 w-3.5 text-muted-foreground hover:text-black dark:hover:text-white" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ---- TAB 2: Saved Reminders (old system) ---- */}
        <TabsContent value="reminders">
          <Tabs defaultValue="pending">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="pending">{t('pending')}</TabsTrigger>
              <TabsTrigger value="sent">{t('sent')}</TabsTrigger>
              <TabsTrigger value="completed">{t('completed')}</TabsTrigger>
              <TabsTrigger value="all">{t('all')}</TabsTrigger>
            </TabsList>
            {(['pending', 'sent', 'completed', 'all'] as const).map(filter => (
              <TabsContent key={filter} value={filter}>
                {(() => {
                  const list = filter === 'all' ? sortedReminders : sortedReminders.filter(r => r.status === filter);
                  if (list.length === 0) return (
                    <p className="text-muted-foreground text-center p-8">{t('noReminders')}</p>
                  );
                  return (
                    <div className="space-y-3">
                      {list.map(reminder => (
                        <Card key={reminder.id} className="border dark:border-gray-700">
                          <CardContent className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                            <div className="flex-1">
                              <p className="font-bold">{reminder.customerName}</p>
                              <p className="text-sm text-muted-foreground">{reminder.customerPhone}</p>
                              <p className="text-sm text-muted-foreground">Due: {new Date(reminder.dueDate).toLocaleDateString()}</p>
                              <p className="font-semibold text-red-500 mt-1">Rs. {reminder.dueAmount.toLocaleString()}</p>
                              {reminder.status !== 'pending' && (
                                <p className={`text-xs font-semibold capitalize mt-1 ${reminder.status === 'completed' ? 'text-green-600' : 'text-blue-600'}`}>
                                  {reminder.status === 'completed' ? t('completed') : t('sent')}
                                </p>
                              )}
                            </div>
                            {reminder.status !== 'completed' && (
                              <div className="flex flex-col sm:flex-row gap-2">
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white gap-1"
                                  onClick={() => handleSendFromReminder(reminder)}
                                >
                                  <Send className="h-3.5 w-3.5" /> WhatsApp
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleShareFromReminder(reminder)}
                                  className="gap-1"
                                  title="Share to other apps"
                                >
                                  <Share2 className="h-3.5 w-3.5" /> Share
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateReminderStatus(reminder.id, 'completed')}
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> {t('markComplete')}
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  );
                })()}
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* View Image Dialog */}
      <Dialog open={!!viewImage} onOpenChange={() => setViewImage(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden bg-black border-none">
          <DialogHeader className="sr-only">
            <DialogTitle>View Photo</DialogTitle>
          </DialogHeader>
          <div className="relative w-full h-[80vh] flex items-center justify-center p-4">
            {viewImage && <img src={viewImage} className="max-w-full max-h-full object-contain" alt="Preview" />}
            <Button
              onClick={() => setViewImage(null)}
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 rounded-full h-8 w-8 z-10 bg-white/20 hover:bg-white/40 text-white"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {whatsAppModalData && (
        <WhatsAppSelectModal
          isOpen={!!whatsAppModalData}
          onClose={() => setWhatsAppModalData(null)}
          customerName={whatsAppModalData.customerName}
          customerPhone={whatsAppModalData.customerPhone}
          message={whatsAppModalData.message}
          title="Send Reminder via WhatsApp / واٹس ایپ ریمائنڈر"
          onSent={() => {
            if (whatsAppModalData.reminderId) {
              updateReminderStatus(whatsAppModalData.reminderId, 'sent');
            } else if (activeUser) {
              const data = getUserData(activeUser.email);
              const existing = data.reminders.find(r => r.customerPhone === whatsAppModalData.customerPhone || r.customerId === whatsAppModalData.customerId);
              if (existing) {
                data.reminders = data.reminders.map(r =>
                  (r.customerPhone === whatsAppModalData.customerPhone || r.customerId === whatsAppModalData.customerId) ? { ...r, status: 'sent' as const } : r
                );
                saveUserData(activeUser.email, data);
                setReminders(data.reminders);
              }
            }
          }}
        />
      )}
    </div>
  );
}
