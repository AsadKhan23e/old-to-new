'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Bell, Send, CheckCircle2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { getActiveUser, getUserData, saveUserData, User, Customer, Transaction, Reminder } from '@/lib/data-layer';
import { useTranslation } from '@/hooks/use-translation';


export default function RemindersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [customerId, setCustomerId] = useState('');
  const [dueAmount, setDueAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [message, setMessage] = useState('');
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);

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
    setDueDate(new Date().toISOString().split('T')[0]);
  }, [router, loadData]);

  const customerBalances = useMemo(() => {
    const balances = new Map<string, number>();
    customers.forEach(customer => {
      const customerTransactions = transactions.filter(t => t.customerId === customer.id);
      const balance = customerTransactions.reduce((acc, tx) => {
        if (tx.type === 'credit' || (tx.type === undefined && !tx.paid)) {
          return acc + tx.totalAmount;
        }
        if (tx.type === 'debit' || (tx.type === undefined && tx.paid)) {
          return acc - tx.totalAmount;
        }
        return acc;
      }, 0);
      balances.set(customer.id, balance);
    });
    return balances;
  }, [customers, transactions]);

  useEffect(() => {
    if (customerId) {
      const balance = customerBalances.get(customerId);
      if (balance && balance > 0) {
        setDueAmount(balance.toString());
        const customer = customers.find(c => c.id === customerId);
        setMessage(`${t('hello')} ${customer?.name}, your payment of ${balance.toLocaleString()} is due. Please pay by ${new Date(dueDate).toLocaleDateString()}. Thank you.`);
      } else {
        setDueAmount('');
        setMessage('');
      }
    }
  }, [customerId, customers, customerBalances, dueDate, t]);

  const resetForm = () => {
    setEditingReminder(null);
    setCustomerId('');
    setDueAmount('');
    setDueDate(new Date().toISOString().split('T')[0]);
    setMessage('');
    setShowForm(false);
  };

  const handleSaveReminder = () => {
    if (!activeUser) return;
    if (!customerId || !dueAmount || !dueDate) {
      toast({ variant: 'destructive', title: t('reminderRequiredError') });
      return;
    }

    const data = getUserData(activeUser.email);
    const customer = data.customers.find(c => c.id === customerId);
    if (!customer) return;

    const newReminder: Reminder = {
      id: editingReminder ? editingReminder.id : new Date().toISOString(),
      customerId,
      customerName: customer.name,
      customerPhone: customer.phone,
      dueAmount: parseFloat(dueAmount),
      dueDate,
      message,
      status: editingReminder ? editingReminder.status : 'pending',
    };

    if (editingReminder) {
      data.reminders = data.reminders.map(r => r.id === editingReminder.id ? newReminder : r);
      toast({ title: t('reminderUpdateSuccess') });
    } else {
      data.reminders.push(newReminder);
      toast({ title: t('reminderSaveSuccess') });
    }

    saveUserData(activeUser.email, data);
    setReminders(data.reminders);
    resetForm();
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

  const handleSendReminder = (reminder: Reminder) => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = `sms:${reminder.customerPhone}?body=${encodeURIComponent(reminder.message)}`;
    } else {
      window.open(`https://wa.me/${reminder.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(reminder.message)}`, '_blank');
    }
    updateReminderStatus(reminder.id, 'sent');
  }

  const sortedReminders = useMemo(() => {
    return [...reminders].sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
  }, [reminders]);

  const renderReminderList = (filter: 'pending' | 'sent' | 'completed' | 'all') => {
    const filtered = filter === 'all' ? sortedReminders : sortedReminders.filter(r => r.status === filter);
    if (filtered.length === 0) {
      return <p className="text-muted-foreground text-center p-8">{t('noReminders')}</p>;
    }
    return (
      <div className="space-y-4">
        {filtered.map(reminder => (
          <Card key={reminder.id}>
            <CardContent className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div className="flex-1">
                <p className="font-bold">{reminder.customerName}</p>
                <p className="text-sm text-muted-foreground">Due: {new Date(reminder.dueDate).toLocaleDateString()}</p>
                <p className="font-semibold">Amount: {reminder.dueAmount.toLocaleString()}</p>
                {reminder.status !== 'pending' && (
                  <p className={`text-xs font-semibold capitalize mt-1 ${reminder.status === 'completed' ? 'text-green-600' : 'text-blue-600'}`}>
                    {reminder.status === 'completed' ? t('completed') : t('sent')}
                  </p>
                )}
              </div>
              {reminder.status !== 'completed' && (
                <div className="flex gap-2 self-end sm:self-center">
                  <Button size="sm" onClick={() => handleSendReminder(reminder)}>
                    <Send className="mr-2 h-4 w-4" /> {t('send')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => updateReminderStatus(reminder.id, 'completed')}>
                    <CheckCircle2 className="mr-2 h-4 w-4" /> {t('markComplete')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">{t('remindersTitle')}</h2>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <PlusCircle className="mr-2" /> {t('addReminder')}
        </Button>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending">{t('pending')}</TabsTrigger>
          <TabsTrigger value="sent">{t('sent')}</TabsTrigger>
          <TabsTrigger value="completed">{t('completed')}</TabsTrigger>
          <TabsTrigger value="all">{t('all')}</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4">{renderReminderList('pending')}</TabsContent>
        <TabsContent value="sent" className="mt-4">{renderReminderList('sent')}</TabsContent>
        <TabsContent value="completed" className="mt-4">{renderReminderList('completed')}</TabsContent>
        <TabsContent value="all" className="mt-4">{renderReminderList('all')}</TabsContent>
      </Tabs>


      {reminders.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted bg-card p-12 text-center h-96 mt-6">
          <Bell className="h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{t('noReminders')}</p>
        </div>
      )}

      {/* Add/Edit Reminder Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingReminder ? t('updateReminder') : t('addReminder')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('selectCustomer')}</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger><SelectValue placeholder={t('selectCustomer')} /></SelectTrigger>
                <SelectContent>
                  {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueAmount">{t('dueAmount')}</Label>
              <Input id="dueAmount" type="number" value={dueAmount} onChange={e => setDueAmount(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">{t('dueDate')}</Label>
              <Input id="dueDate" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">{t('messageTemplate')}</Label>
              <Textarea id="message" value={message} onChange={e => setMessage(e.target.value)} rows={4} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">{t('cancel')}</Button></DialogClose>
            <Button onClick={handleSaveReminder}>{editingReminder ? t('updateReminder') : t('saveReminder')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
