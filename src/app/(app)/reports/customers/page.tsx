'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileWarning, MessageSquare, User, ExternalLink } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { getActiveUser, getUserData, Customer, Transaction, User as AppUser } from '@/lib/data-layer';
import { useTranslation } from '@/hooks/use-translation';


type OverdueCustomer = Customer & {
  balance: number;
  oldestUnpaidDate: string;
  daysOverdue: number;
};

export default function CustomerReportsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [activeUser, setActiveUser] = useState<AppUser | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const loadData = useCallback((userEmail: string) => {
    const data = getUserData(userEmail);
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
  }, [router, loadData]);

  const overdueCustomers = useMemo(() => {
    const report: OverdueCustomer[] = [];

    const customerBalances = new Map<string, { balance: number, oldestUnpaidTx: Transaction | null }>();

    // Initialize balances
    customers.forEach(c => {
      customerBalances.set(c.id, { balance: 0, oldestUnpaidTx: null });
    });

    // Process transactions chronologically
    const sortedTransactions = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sortedTransactions.forEach(tx => {
      const customerInfo = customerBalances.get(tx.customerId);
      if (!customerInfo) return;

      let currentBalance = customerInfo.balance;

      if (tx.type === 'credit' || (tx.items && tx.remainingBalance > 0)) {
        currentBalance += tx.remainingBalance > 0 ? tx.remainingBalance : tx.totalAmount;
        if (!customerInfo.oldestUnpaidTx) {
          customerInfo.oldestUnpaidTx = tx;
        }
      } else if (tx.type === 'debit') {
        currentBalance -= tx.totalAmount;
      } else if (tx.items || tx.itemId) { // Paid sale
        currentBalance -= (tx.totalAmount - tx.remainingBalance);
      }

      customerInfo.balance = currentBalance;

      // If balance is paid off, find next oldest unpaid transaction
      if (currentBalance <= 0) {
        customerInfo.oldestUnpaidTx = null; // Reset and find next
        // This is a simplification; a more robust solution would track individual invoices
      }
    });

    customers.forEach(customer => {
      const info = customerBalances.get(customer.id);
      if (info && info.balance > 0) {
        const oldestDate = info.oldestUnpaidTx ? new Date(info.oldestUnpaidTx.date) : new Date();
        report.push({
          ...customer,
          balance: info.balance,
          oldestUnpaidDate: oldestDate.toLocaleDateString(),
          daysOverdue: differenceInDays(new Date(), oldestDate),
        });
      }
    });

    return report.sort((a, b) => b.balance - a.balance);
  }, [customers, transactions]);

  const handleSendMessage = (customer: OverdueCustomer) => {
    const message = `${t('hello')} ${customer.name}, this is a friendly reminder that you have an outstanding balance of ${customer.balance.toLocaleString()}. Thank you.`;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = `sms:${customer.phone}?body=${encodeURIComponent(message)}`;
    } else {
      window.open(`https://wa.me/${customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>{t('reports_title')}</CardTitle>
          <CardDescription>{t('reports_description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {overdueCustomers.length > 0 ? (
            <div className="space-y-4">
              {overdueCustomers.map(customer => (
                <Card key={customer.id} className="shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">{customer.name}</h3>
                        <p className="text-sm text-muted-foreground">{customer.phone}</p>
                        {customer.daysOverdue > 7 && (
                          <span className="mt-1 inline-flex items-center text-xs font-semibold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
                            <FileWarning className="w-3 h-3 mr-1" />
                            {t('overdueLabel')}
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">{t('outstandingBalance')}</p>
                        <p className="font-bold text-xl text-red-600">{customer.balance.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground mt-1">{t('oldestUnpaid')}: {customer.oldestUnpaidDate}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2 justify-end border-t pt-3">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/customers`}>
                          <ExternalLink className="mr-2 h-4 w-4" /> {t('viewCustomer')}
                        </Link>
                      </Button>
                      <Button size="sm" onClick={() => handleSendMessage(customer)}>
                        <MessageSquare className="mr-2 h-4 w-4" /> {t('sendReminder')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted bg-transparent p-12 text-center h-80">
              <User className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t('noOverdueCustomers')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
