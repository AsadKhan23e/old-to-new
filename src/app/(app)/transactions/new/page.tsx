'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { getActiveUser, getUserData, saveUserData, User, Customer, Transaction } from '@/lib/data-layer';
import { isStaffMember } from '@/lib/employee-service';
import { useTranslation } from '@/hooks/use-translation';

function NewTransactionForm() {
  const router = useRouter();
  const rawSearchParams = useSearchParams();
  const customerIdFromQuery = rawSearchParams.get('customerId');
  const txIdFromQuery = rawSearchParams.get('txId');
  const { toast } = useToast();
  const { t } = useTranslation();

  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Form state
  const [customerId, setCustomerId] = useState('');
  const [type, setType] = useState<'credit' | 'debit'>('credit');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');

  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  useEffect(() => {
    const user = getActiveUser();
    if (user) {
      setActiveUser(user);
    }
    setDate(new Date().toISOString().split('T')[0]);

    if (customerIdFromQuery) {
      setCustomerId(customerIdFromQuery);
    }
  }, [customerIdFromQuery]);

  useEffect(() => {
    if (activeUser) {
      const data = getUserData(activeUser.email);
      setCustomers(data.customers || []);

      if (txIdFromQuery) {
        if (isStaffMember()) {
          toast({ variant: 'destructive', title: "Action Not Allowed", description: "Staff members cannot edit bills." });
          router.push('/transactions');
          return;
        }
        const txToEdit = (data.transactions || []).find(t => t.id === txIdFromQuery);
        if (txToEdit) {
          setEditingTx(txToEdit);
          setCustomerId(txToEdit.customerId);
          if (txToEdit.type) {
            setType(txToEdit.type as 'credit' | 'debit');
          } else {
            setType('credit');
          }
          setAmount(txToEdit.totalAmount.toString());
          setDate(txToEdit.date.split('T')[0]);
          setNotes(txToEdit.notes || '');
        }
      }
    }
  }, [activeUser, txIdFromQuery, router, toast]);

  const handleSave = () => {
    if (editingTx && isStaffMember()) {
      toast({ variant: 'destructive', title: "Action Not Allowed", description: "Staff members cannot edit bills." });
      return;
    }
    if (!customerId || !amount) {
      toast({ variant: 'destructive', title: t('txRequiredError') });
      return;
    }
    const user = activeUser || getActiveUser();

    if (!user) return;
    const data = getUserData(user.email);
    const customer = (data.customers || []).find(c => c.id === customerId);
    if (!customer) return;

    const transactionAmount = parseFloat(amount);
    const isDebit = type === 'debit';

    if (editingTx) {
      const updatedTransaction: Transaction = {
        ...editingTx,
        customerId,
        customerName: customer.name,
        totalAmount: transactionAmount,
        amountPaid: isDebit ? transactionAmount : (editingTx.type ? 0 : editingTx.amountPaid),
        remainingBalance: isDebit ? 0 : (editingTx.type ? transactionAmount : editingTx.totalAmount - (editingTx.amountPaid || 0)),
        paid: isDebit,
        type: editingTx.type ? type : undefined,
        date: new Date(date).toISOString(),
        notes,
      };
      data.transactions = (data.transactions || []).map(tx => tx.id === editingTx.id ? updatedTransaction : tx);
      toast({ title: t('txUpdateSuccess') });
    } else {
      const newTransaction: Transaction = {
        id: new Date().toISOString(),
        customerId,
        customerName: customer.name,
        totalAmount: transactionAmount,
        amountPaid: isDebit ? transactionAmount : 0,
        remainingBalance: isDebit ? 0 : transactionAmount,
        paid: isDebit,
        type,
        date: new Date(date).toISOString(),
        notes,
      };
      if (!data.transactions) data.transactions = [];
      data.transactions.push(newTransaction);
      toast({ title: t('txSaveSuccess') });
    }

    saveUserData(user.email, data);
    router.push(`/customers`);
  };

  const sortedCustomers = useMemo(() => [...customers].sort((a, b) => a.name.localeCompare(b.name)), [customers]);

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>{editingTx ? t('editTransaction') : t('addManualTransaction')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>{t('selectCustomer')}</Label>
            <Select value={customerId} onValueChange={setCustomerId} disabled={!!editingTx}>
              <SelectTrigger>
                <SelectValue placeholder={t('selectCustomer')} />
              </SelectTrigger>
              <SelectContent>
                {sortedCustomers.map(c => <SelectItem key={c.id} value={c.id}>{c.name} - {c.phone}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('transactionType')}</Label>
            <RadioGroup value={type} onValueChange={(v) => setType(v as 'credit' | 'debit')} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="credit" id="credit" />
                <Label htmlFor="credit">{t('credit_long')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="debit" id="debit" />
                <Label htmlFor="debit">{t('debit_long')}</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">{t('amount')}</Label>
            <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">{t('date')}</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t('notesLabel')}</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <Button onClick={handleSave} className="w-full">
            {editingTx ? t('updateTransaction') : t('saveTransaction')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewTransactionPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-vh-100 bg-[#FAF8F3] dark:bg-[#121212]">
      <p className="font-serif italic text-muted-foreground">Loading...</p>
    </div>}>
      <NewTransactionForm />
    </Suspense>
  );
}
