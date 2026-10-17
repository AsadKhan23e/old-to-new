'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PlusCircle, Search, Edit, Trash2, FileDown, Lock, Receipt } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { format, subDays } from 'date-fns';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getActiveUser, getUserData, saveUserData, getViewMode, getIsPremium, User, Item, Transaction, BillDesignSettings } from '@/lib/data-layer';
import { useTranslation } from '@/hooks/use-translation';
import { generateTransactionsReportPDF } from '@/lib/pdf-service';
import { isStaffMember } from '@/lib/employee-service';


type ViewMode = 'user' | 'customer';

export default function TransactionsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('user');
  const [isPremium, setIsPremium] = useState(false);
  const [billDesignSettings, setBillDesignSettings] = useState<BillDesignSettings | null>(null);

  const [filter, setFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const loadData = useCallback((userEmail: string) => {
    const data = getUserData(userEmail);
    setTransactions(data.transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setItems(data.items);
    setBillDesignSettings(data.settings.billDesign);
  }, []);

  useEffect(() => {
    const user = getActiveUser();
    if (user) {
      setActiveUser(user);
      loadData(user.email);
    } else {
      router.push('/login');
    }

    setViewMode(getViewMode());

    const checkPremium = () => setIsPremium(getIsPremium());
    checkPremium();

    window.addEventListener('cashbookpro_data_updated', checkPremium);
    return () => {
      window.removeEventListener('cashbookpro_data_updated', checkPremium);
    };
  }, [router, loadData]);

  const handleDeleteTransaction = (txId: string) => {
    if (isStaffMember()) {
      toast({ variant: 'destructive', title: "Action Not Allowed", description: "Staff members cannot delete bills." });
      return;
    }
    if (!activeUser) return;
    const data = getUserData(activeUser.email);
    data.transactions = data.transactions.filter(tx => tx.id !== txId);
    saveUserData(activeUser.email, data);
    setTransactions(data.transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    toast({ title: t('transactionDeleted') });
  };

  const getTransactionDescription = (tx: Transaction) => {
    if (tx.items && tx.items.length > 0) {
      return tx.items.length > 1 ? `${tx.items[0].itemName} + ${tx.items.length - 1} more` : tx.items[0].itemName;
    }
    if (tx.itemName) {
      return `${tx.itemName} (x${tx.quantity})`;
    }
    return tx.type === 'credit' ? t('manualCredit') : t('manualDebit');
  }

  const getTransactionStatus = (tx: Transaction) => {
    if (tx.type === 'credit') return t('credit');
    if (tx.type === 'debit') return t('debit');
    if (tx.paid) return t('paid');
    if (tx.amountPaid > 0) return t('partiallyPaid');
    return t('credit');
  }

  const getProfit = (tx: Transaction) => {
    if (viewMode !== 'user') return null;

    if (tx.items) { // Multi-item sale
      return tx.items.reduce((totalProfit, soldItem) => {
        const item = items.find(i => i.id === soldItem.itemId);
        if (item && item.purchasePrice) {
          const cost = item.purchasePrice * soldItem.quantity;
          const revenue = soldItem.unitPrice * soldItem.quantity;
          return totalProfit + (revenue - cost);
        }
        return totalProfit;
      }, 0);
    }

    if (tx.itemId && tx.quantity) { // Single-item sale
      const item = items.find(i => i.id === tx.itemId);
      if (item && item.purchasePrice) {
        const cost = item.purchasePrice * tx.quantity;
        const revenue = tx.totalAmount;
        return revenue - cost;
      }
    }
    return null;
  };

  const filteredTransactions = useMemo(() => {
    let dateFiltered = transactions;

    if (filter !== 'all' || dateRange) {
      let fromDate: Date | null = null;
      let toDate: Date = new Date(); // Today, end of day
      toDate.setHours(23, 59, 59, 999);

      if (filter === 'today') {
        fromDate = new Date();
        fromDate.setHours(0, 0, 0, 0);
      } else if (filter === 'week') {
        fromDate = subDays(new Date(), new Date().getDay());
        fromDate.setHours(0, 0, 0, 0);
      } else if (filter === 'month') {
        fromDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      } else if (filter === 'custom' && dateRange?.from) {
        fromDate = dateRange.from;
        fromDate.setHours(0, 0, 0, 0);
        if (dateRange.to) {
          toDate = dateRange.to;
          toDate.setHours(23, 59, 59, 999);
        } else {
          toDate = new Date(fromDate);
          toDate.setHours(23, 59, 59, 999);
        }
      }

      if (fromDate) {
        dateFiltered = transactions.filter(tx => {
          const txDate = new Date(tx.date);
          return txDate >= fromDate! && txDate <= toDate;
        });
      }
    }

    if (!searchTerm) {
      return dateFiltered;
    }

    return dateFiltered.filter(tx => {
      const searchTermLower = searchTerm.toLowerCase();
      const customerNameMatch = tx.customerName?.toLowerCase().includes(searchTermLower);
      const itemNameMatch = tx.itemName?.toLowerCase().includes(searchTermLower) || tx.items?.some(i => i.itemName.toLowerCase().includes(searchTermLower));
      const notesMatch = tx.notes?.toLowerCase().includes(searchTermLower);
      return customerNameMatch || itemNameMatch || notesMatch;
    });
  }, [transactions, searchTerm, filter, dateRange]);

  const handleExport = () => {
    if (!isPremium) {
      toast({
        variant: 'destructive',
        title: t('premiumFeature'),
        description: t('pleaseUpgrade'),
      });
      router.push('/premium');
      return;
    }

    if (billDesignSettings) {
      toast({ title: "Generating Report...", description: "Please wait..." });
      generateTransactionsReportPDF(filteredTransactions, billDesignSettings, `Transactions Report (${filter})`);
    } else {
      toast({ variant: 'destructive', title: "Could not load settings" });
    }
  };

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    if (newFilter !== 'custom') {
      setDateRange(undefined);
    }
  };


  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <div className="flex justify-between items-center mb-6 gap-2">
        <h2 className="text-2xl font-bold">{t('allTransactions')}</h2>
        <div className="flex gap-2">
          <Button onClick={handleExport} variant="outline" size="sm">
            {isPremium ? <FileDown className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
            {t('exportPDF')}
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t('searchTransactionsPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
        <Tabs value={filter} onValueChange={handleFilterChange} className="w-full sm:w-auto">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">{t('all')}</TabsTrigger>
            <TabsTrigger value="today">{t('today')}</TabsTrigger>
            <TabsTrigger value="week">{t('week')}</TabsTrigger>
            <TabsTrigger value="month">{t('month')}</TabsTrigger>
            <Popover>
              <PopoverTrigger asChild>
                <TabsTrigger value="custom" className={filter === 'custom' ? 'bg-background text-foreground' : ''}>{t('custom')}</TabsTrigger>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={(range) => { setDateRange(range); setFilter('custom'); }}
                  numberOfMonths={1}
                />
              </PopoverContent>
            </Popover>
          </TabsList>
        </Tabs>
      </div>

      {dateRange && filter === 'custom' && (
        <div className="text-center text-sm text-muted-foreground mb-4">
          {t('displayingTransactionsFrom')} {dateRange.from ? format(dateRange.from, 'LLL dd, y') : ''}
          {dateRange.to ? ` to ${format(dateRange.to, 'LLL dd, y')}` : ''}
        </div>
      )}


      {transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted bg-card p-12 text-center h-96">
          <Receipt className="h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{t('noTransactions')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTransactions.map(tx => (
            <Card key={tx.id}>
              <CardContent className="p-4 flex justify-between items-center">
                <div className="flex-1 space-y-1">
                  <p className="font-bold">{tx.customerName}</p>
                  <p className="font-semibold text-sm">{getTransactionDescription(tx)}</p>
                  <p className="text-sm text-muted-foreground">{new Date(tx.date).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className={`font-bold text-lg ${tx.type === 'debit' || tx.paid ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.totalAmount.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">{getTransactionStatus(tx)}</p>
                    {getProfit(tx) !== null && viewMode === 'user' && (
                      <p className="text-xs text-blue-600">{t('profit')}: {getProfit(tx)?.toLocaleString()}</p>
                    )}
                  </div>
                  <div className='flex flex-col'>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        if (isStaffMember()) {
                          toast({ variant: 'destructive', title: "Action Not Allowed", description: "Staff members cannot edit bills." });
                          return;
                        }
                        router.push(`/transactions/new?customerId=${tx.customerId}&txId=${tx.id}`);
                      }}
                      disabled={!!tx.itemId || !!tx.items || isStaffMember()}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {!isStaffMember() && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t('delete')}</AlertDialogTitle>
                            <AlertDialogDescription>{t('deleteConfirmation')}</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteTransaction(tx.id)}>{t('confirm')}</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredTransactions.length === 0 && (transactions.length > 0) && (
            <p className="text-center text-muted-foreground">{t('noTransactionsMatch')}</p>
          )}
        </div>
      )}
    </div>
  );
}
