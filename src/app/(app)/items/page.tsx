'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Package, Edit, Trash2, Tag, DollarSign, Building, Phone as PhoneIcon, Info, ShoppingCart, RefreshCcw, XIcon, UserPlus, Camera, Upload, X, ChevronDown, ChevronUp, MoreVertical, Eye, FileDown, FileText, BookUser } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { getActiveUser, getUserData, saveUserData, getViewMode, User, Item, Customer, Transaction, SoldItem, PurchaseItem } from '@/lib/data-layer';
import { useTranslation } from '@/hooks/use-translation';
import { Capacitor } from '@capacitor/core';
import { Haptics, NotificationType } from '@capacitor/haptics';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogFooter } from '@/components/ui/alert-dialog';
import Image from 'next/image';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { BillRenderer } from '@/components/billing/BillRenderer';
import { generateSingleBillPDF } from '@/lib/pdf-service';
import { getBillDesignSettings, BillDesignSettings } from '@/lib/data-layer';
import { pickContact } from '@/lib/contact-service';

type ViewMode = 'user' | 'customer';

type SaleItem = {
  id: string; // This is the Item.id or custom-...
  name: string;
  quantity: number;
  unitPrice: number;
  stock?: number;
  supplierName?: string;
  notes?: string;
  picture?: string | null;
};

type GroupedSaleItem = {
  itemName: string;
  totalStock: number;
  sellingPrice: number;
  batches: { id: string; stock: number; supplierName?: string }[];
};


type DisplayItem = Item & {
  isGrouped?: boolean;
  supplierStock?: { id: string, name: string; quantity: number, purchasePrice: number, sellingPrice: number }[];
};

type ItemDetailsState = {
  item: DisplayItem;
  sellingPrice: string;
  purchasePrice: string;
  notes: string;
  picture: string | null;
  itemName: string;
} | null;



export default function ItemsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('user');

  const [items, setItems] = useState<Item[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showAddItemModal, setShowAddItemModal] = useState(false);

  // Edit item details modal
  const [itemDetails, setItemDetails] = useState<ItemDetailsState>(null);
  const [showStockView, setShowStockView] = useState<DisplayItem | null>(null);

  // New multi-item purchase state
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [purchaseSupplierId, setPurchaseSupplierId] = useState<string | 'new'>('');
  const [showNewSupplierModal, setShowNewSupplierModal] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');
  const [newSupplierAddress, setNewSupplierAddress] = useState('');
  const [newSupplierPicture, setNewSupplierPicture] = useState<string | null>(null);
  const [purchasePayment, setPurchasePayment] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchaseNotes, setPurchaseNotes] = useState('');


  // Restock state
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [restockItem, setRestockItem] = useState<Item | null>(null);
  const [restockQuantity, setRestockQuantity] = useState('');

  // Multi-item sale state
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [selectedItemsForSale, setSelectedItemsForSale] = useState<SaleItem[]>([]);
  const [saleCustomerId, setSaleCustomerId] = useState('');
  const [saleDate, setSaleDate] = useState('');
  const [saleAmountPaid, setSaleAmountPaid] = useState('');
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');
  const [customItemQuantity, setCustomItemQuantity] = useState('1');
  const [customItemNotes, setCustomItemNotes] = useState('');
  const [customItemPicture, setCustomItemPicture] = useState<string | null>(null);
  const [saleNotes, setSaleNotes] = useState('');
  const [manualPreviousBalance, setManualPreviousBalance] = useState('0');
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [showBillPreview, setShowBillPreview] = useState<Transaction | null>(null);
  const [billDesignSettings, setBillDesignSettings] = useState<BillDesignSettings | null>(null);

  // New customer state (for sales)
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerAddress, setNewCustomerAddress] = useState('');
  const [newCustomerPicture, setNewCustomerPicture] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const [editingPhotoForItemId, setEditingPhotoForItemId] = useState<string | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isPickingContact, setIsPickingContact] = useState(false);
  const [hasContactSupport] = useState(() => {
    if (typeof window === 'undefined') return false;
    return Capacitor.isNativePlatform() || ('contacts' in navigator && 'ContactsManager' in window);
  });

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported by your browser.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
      setHasCameraPermission(true);
    } catch (err: any) {
      setHasCameraPermission(false);
      console.error("Error accessing camera: ", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Camera Error',
          description: err.message || 'Could not access camera. Please check permissions.',
        });
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    streamRef.current = null;
    setEditingPhotoForItemId(null);
    setHasCameraPermission(null);
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

        // --- COMPRESSION LOGIC ---
        const tempCanvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const scale = MAX_WIDTH / video.videoWidth;
        tempCanvas.width = MAX_WIDTH;
        tempCanvas.height = video.videoHeight * scale;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx?.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);
        const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.6); // 60% quality
        // -------------------------

        if (editingPhotoForItemId === 'new-supplier') {
          setNewSupplierPicture(dataUrl);
        } else if (editingPhotoForItemId) {
          handlePurchaseItemChange(editingPhotoForItemId, 'picture', dataUrl);
        } else if (itemDetails) {
          setItemDetails(prev => prev ? { ...prev, picture: dataUrl } : null);
        }
        else {
          setNewCustomerPicture(dataUrl);
        }
      }
      setIsCameraOpen(false);
      setEditingPhotoForItemId(null);
    }
  };

  const loadData = useCallback(() => {
    const user = getActiveUser();
    if (user) {
      const data = getUserData(user.email);
      setItems(data.items);
      setCustomers(data.customers);
      setTransactions(data.transactions);
      setBillDesignSettings(getBillDesignSettings(user.email));
    }
  }, []);

  useEffect(() => {
    const user = getActiveUser();
    if (user) {
      setActiveUser(user);
      loadData();
    } else {
      router.push('/login');
    }
    setViewMode(getViewMode());
    const today = new Date().toISOString().split('T')[0];
    setSaleDate(today);
    setPurchaseDate(today);

    // Listen for data updates (from SQLite load or Firestore sync)
    window.addEventListener('cashbookpro_data_updated', loadData);
    window.addEventListener('storage', loadData);

    return () => {
      window.removeEventListener('cashbookpro_data_updated', loadData);
      window.removeEventListener('storage', loadData);
    };
  }, [router, loadData]);

  useEffect(() => {
    // This logic handles opening and closing the camera stream
    // to avoid leaving it on in the background.
    const isAnyCameraDialogOpen = isCameraOpen || (!!itemDetails && isCameraOpen) || (editingPhotoForItemId && isCameraOpen);
    if (isAnyCameraDialogOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCameraOpen, itemDetails, editingPhotoForItemId]);

  const resetAddItemModal = () => {
    setPurchaseItems([]);
    setPurchaseSupplierId('');
    setNewSupplierName('');
    setNewSupplierPhone('');
    setNewSupplierAddress('');
    setNewSupplierPicture(null);
    setPurchasePayment('');
    setPurchaseNotes('');
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setShowAddItemModal(false);
  };

  const handleAddNewPurchaseItem = () => {
    setPurchaseItems(prev => [...prev, {
      id: new Date().getTime().toString(),
      itemName: '',
      purchasePrice: 0,
      sellingPrice: 0,
      quantity: 1,
      picture: null,
      notes: '',
    }]);
  };

  const handlePurchaseItemChange = (id: string, field: keyof PurchaseItem, value: string | number | null) => {
    setPurchaseItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleRemovePurchaseItem = (id: string) => {
    setPurchaseItems(prev => prev.filter(item => item.id !== id));
  };

  const supplierList = useMemo(() => customers.filter(c => c.isSupplier), [customers]);

  const { supplierPreviousBalance, currentPurchaseBill, grandTotalPurchase } = useMemo(() => {
    if (!purchaseSupplierId || !activeUser) return { supplierPreviousBalance: 0, currentPurchaseBill: 0, grandTotalPurchase: 0 };

    const data = getUserData(activeUser.email);
    if (!data) return { supplierPreviousBalance: 0, currentPurchaseBill: 0, grandTotalPurchase: 0 };

    const supplierTransactions = data.transactions
      .filter(tx => tx.customerId === purchaseSupplierId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const prevBalance = supplierTransactions.reduce((balance, tx) => {
      let newBalance = balance;
      if (tx.type === 'purchase') {
        newBalance += (tx.totalAmount - (tx.amountPaid || 0));
        if (tx.additionalPayments) {
          newBalance -= tx.additionalPayments.reduce((sum, p) => sum + p.amount, 0);
        }
      } else if (tx.type === 'debit') {
        newBalance -= tx.totalAmount;
      }
      return newBalance;
    }, 0);

    const currentBill = purchaseItems.reduce((acc, item) => acc + (item.purchasePrice * item.quantity), 0);
    const grandTotal = prevBalance + currentBill;
    return { supplierPreviousBalance: prevBalance, currentPurchaseBill: currentBill, grandTotalPurchase: grandTotal };
  }, [purchaseSupplierId, purchaseItems, transactions, activeUser, customers]);

  const handleSaveNewSupplier = () => {
    if (!activeUser) return;
    if (!newSupplierName || !newSupplierPhone) {
      toast({ variant: 'destructive', title: "Supplier name and phone are required." });
      return;
    }
    const data = getUserData(activeUser.email);
    if (data.customers.some(c => c.phone === newSupplierPhone)) {
      toast({ variant: 'destructive', title: "A customer/supplier with this phone already exists." });
      return;
    }
    const newSupplier: Customer = {
      id: new Date().toISOString() + '_supplier',
      name: newSupplierName,
      phone: newSupplierPhone,
      address: newSupplierAddress,
      picture: newSupplierPicture || undefined,
      dateAdded: new Date().toISOString(),
      isSupplier: true
    };
    data.customers.push(newSupplier);
    saveUserData(activeUser.email, data);

    setCustomers(data.customers); // Update customer list in state
    setPurchaseSupplierId(newSupplier.id); // Auto-select new supplier
    toast({ title: t('supplierCreated') });

    setShowNewSupplierModal(false); // Close new supplier modal
    setNewSupplierName('');
    setNewSupplierPhone('');
    setNewSupplierAddress('');
    setNewSupplierPicture(null);
  };


  const handleConfirmPurchase = async () => {
    if (!activeUser) return;
    window.dispatchEvent(new Event('show_popunder_ad'));
    if (!purchaseSupplierId) {
      toast({ variant: 'destructive', title: "Supplier is required." });
      return;
    }
    if (purchaseItems.some(p => !p.itemName || p.purchasePrice <= 0 || p.sellingPrice <= 0 || p.quantity <= 0)) {
      toast({ variant: 'destructive', title: "Please fill all item details correctly." });
      return;
    }

    const data = getUserData(activeUser.email);
    const supplier = data.customers.find(c => c.id === purchaseSupplierId);
    if (!supplier) return;

    const transactionItems: SoldItem[] = [];

    purchaseItems.forEach(p => {
      // Always create a new stock entry for each purchased item line
      const newItemEntry: Item = {
        id: new Date().toISOString() + '_' + p.itemName.replace(/\s+/g, '-'),
        itemName: p.itemName,
        purchasePrice: p.purchasePrice,
        sellingPrice: p.sellingPrice,
        quantity: p.quantity,
        supplierName: supplier.name,
        supplierPhone: supplier.phone,
        notes: p.notes || null,
        picture: p.picture || null,
        createdAt: new Date().toISOString(),
      };

      const existingItemWithSameName = data.items.find(i => i.itemName.toLowerCase() === p.itemName.toLowerCase());

      // If new item has a picture, propagate it to all other stock entries of the same item name if they don't have one
      if (newItemEntry.picture) {
        data.items.forEach(item => {
          if (item.itemName.toLowerCase() === p.itemName.toLowerCase() && !item.picture) {
            item.picture = newItemEntry.picture;
          }
        });
        // Also set it on the representative item if it exists
        if (existingItemWithSameName && !existingItemWithSameName.picture) {
          newItemEntry.picture = existingItemWithSameName.picture;
        }
      } else if (existingItemWithSameName?.picture) {
        // If the new entry doesn't have a picture, but an existing one does, use it
        newItemEntry.picture = existingItemWithSameName.picture;
      }

      data.items.push(newItemEntry);

      transactionItems.push({
        itemId: newItemEntry.id,
        itemName: p.itemName,
        quantity: p.quantity,
        unitPrice: p.purchasePrice
      });
    });

    const paymentAmount = parseFloat(purchasePayment) || 0;

    const purchaseTransaction: Transaction = {
      id: new Date().toISOString() + '_purchase',
      customerId: supplier.id,
      customerName: supplier.name,
      type: 'purchase',
      items: transactionItems,
      totalAmount: currentPurchaseBill,
      amountPaid: paymentAmount,
      date: new Date(`${purchaseDate}T${new Date().toTimeString().split(' ')[0]}`).toISOString(),
      previousBalance: supplierPreviousBalance,
      grandTotal: grandTotalPurchase,
      remainingBalance: grandTotalPurchase - paymentAmount,
      notes: purchaseNotes,
      paid: (grandTotalPurchase - paymentAmount) <= 0,
    };

    data.transactions.push(purchaseTransaction);

    await saveUserData(activeUser.email, data);
    if (Capacitor.isNativePlatform()) {
      Haptics.notification({ type: NotificationType.Success }).catch(() => { });
    }
    loadData();
    resetAddItemModal();
  };

  const handleDeleteStockEntry = async (itemIdToDelete: string) => {
    if (!activeUser) return;

    const data = getUserData(activeUser.email);
    data.items = data.items.filter(item => item.id !== itemIdToDelete);

    await saveUserData(activeUser.email, data);
    loadData();
    setShowStockView(null);
    toast({ title: "Stock entry deleted successfully. No bills were affected." });
  };

  const handleRestockClick = (item: Item) => {
    setRestockItem(item);
    setShowRestockModal(true);
  };

  const handleConfirmRestock = () => {
    if (!restockItem || !activeUser || !restockQuantity) return;

    const quantityToAdd = parseInt(restockQuantity, 10);
    if (isNaN(quantityToAdd) || quantityToAdd <= 0) {
      toast({ variant: 'destructive', title: 'Invalid quantity' });
      return;
    }

    const data = getUserData(activeUser.email);
    const itemIndex = data.items.findIndex(i => i.id === restockItem.id);

    if (itemIndex > -1) {
      data.items[itemIndex].quantity = (data.items[itemIndex].quantity || 0) + quantityToAdd;
      saveUserData(activeUser.email, data);
      if (Capacitor.isNativePlatform()) {
        Haptics.notification({ type: NotificationType.Success }).catch(() => { });
      }
      setItems(data.items);
      toast({ title: 'Item restocked successfully!' });
    }

    setShowRestockModal(false);
    setRestockItem(null);
    setRestockQuantity('');
  };

  const handleSellClick = () => {
    setShowSaleModal(true);
  };

  const toggleItemGroupForSale = (groupedItem: GroupedSaleItem) => {
    setSelectedItemsForSale(prev => {
      const isSelected = prev.some(si => si.name === groupedItem.itemName);
      if (isSelected) {
        return prev.filter(si => si.name !== groupedItem.itemName);
      } else {
        const firstBatch = groupedItem.batches[0];
        return [...prev, {
          id: firstBatch.id, // Use first batch id as representative
          name: groupedItem.itemName,
          quantity: 1, // Default to 1
          unitPrice: groupedItem.sellingPrice,
          stock: groupedItem.totalStock, // Combined stock
          supplierName: firstBatch.supplierName,
        }];
      }
    });
  };

  const handleItemDetailChange = (itemName: string, batchId: string, value: string) => {
    const numericValue = parseInt(value, 10) || 0;

    setSelectedItemsForSale(prev => {
      const masterItem = availableItemsForSale.find(i => i.itemName === itemName);
      const batchInfo = masterItem?.batches.find(b => b.id === batchId);

      if (!masterItem || !batchInfo) return prev;

      const cappedValue = Math.min(numericValue, batchInfo.stock);
      if (cappedValue < numericValue) {
        setTimeout(() => {
          toast({
            variant: "destructive",
            title: "Not enough stock",
            description: `Only ${batchInfo.stock} units available from ${batchInfo.supplierName || 'this supplier'}.`,
          });
        }, 0);
      }

      const newItems = [...prev];
      const existingBatchItemIndex = newItems.findIndex(item => item.id === batchId);

      if (existingBatchItemIndex > -1) {
        if (cappedValue > 0) {
          newItems[existingBatchItemIndex].quantity = cappedValue;
          return newItems;
        } else {
          return newItems.filter(item => item.id !== batchId);
        }
      } else {
        if (cappedValue > 0) {
          return [...newItems, {
            id: batchId,
            name: itemName,
            quantity: cappedValue,
            unitPrice: masterItem.sellingPrice,
            stock: batchInfo.stock,
            supplierName: batchInfo.supplierName
          }];
        }
      }

      return newItems;
    });
  };

  const handlePriceChange = (itemName: string, newPrice: string) => {
    const numericPrice = parseFloat(newPrice) || 0;
    setSelectedItemsForSale(prev =>
      prev.map(item => item.name === itemName ? { ...item, unitPrice: numericPrice } : item)
    );
  };

  const handleUpdateCustomItem = (id: string, field: keyof SaleItem, value: any) => {
    setSelectedItemsForSale(prev =>
      prev.map(item => item.id === id ? { ...item, [field]: value } : item)
    );
  };

  const addCustomItemToSale = () => {
    if (!activeUser || !customItemName || !customItemPrice) return;
    const priceNum = parseFloat(customItemPrice) || 0;
    const qtyNum = parseFloat(customItemQuantity) || 1;
    const newItemId = `custom-${Date.now()}`;
    const newItem: SaleItem = {
      id: newItemId,
      name: customItemName,
      quantity: qtyNum,
      unitPrice: priceNum,
      notes: customItemNotes,
      picture: customItemPicture
    };
    setSelectedItemsForSale(prev => [...prev, newItem]);

    // Persist custom item for future use
    const data = getUserData(activeUser.email);
    const existingCustomItem = data.items.find(i => i.itemName.toLowerCase() === customItemName.toLowerCase());
    if (!existingCustomItem) {
      data.items.push({
        id: newItemId,
        itemName: customItemName,
        purchasePrice: 0,
        sellingPrice: priceNum,
        quantity: 0,
        supplierName: 'CUSTOM_ITEM',
        notes: customItemNotes,
        picture: customItemPicture,
        createdAt: new Date().toISOString(),
      });
      saveUserData(activeUser.email, data);
      setItems(data.items);
    }

    setCustomItemName('');
    setCustomItemPrice('');
    setCustomItemQuantity('1');
    setCustomItemNotes('');
    setCustomItemPicture(null);
  };

  const calculatedPreviousBalance = useMemo(() => {
    if (!saleCustomerId || !activeUser) return 0;

    const data = getUserData(activeUser.email);
    if (!data) return 0;

    const customerTransactions = data.transactions.filter(t => t.customerId === saleCustomerId);

    const totalBalance = customerTransactions.reduce((acc, tx) => {
      let balance = acc;
      if (!tx.type || tx.type === 'credit' || tx.type === 'purchase') {
        const billTotal = tx.items?.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) || tx.totalAmount;
        const totalPaid = (tx.amountPaid || 0) + (tx.additionalPayments?.reduce((sum, p) => sum + p.amount, 0) || 0);
        balance += (billTotal - totalPaid);
      } else if (tx.type === 'debit') {
        balance -= tx.totalAmount;
      }
      return balance;
    }, 0);

    return totalBalance;
  }, [saleCustomerId, activeUser, transactions, customers]);

  useEffect(() => {
    setManualPreviousBalance(calculatedPreviousBalance.toString());
  }, [saleCustomerId, calculatedPreviousBalance]);

  const previousBalance = parseFloat(manualPreviousBalance) || 0;

  const { newBillAmount, grandTotal, remainingBalance } = useMemo(() => {
    const newBill = selectedItemsForSale.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
    const total = newBill + previousBalance;
    const paid = parseFloat(saleAmountPaid) || 0;
    return {
      newBillAmount: newBill,
      grandTotal: total,
      remainingBalance: total - paid
    };
  }, [selectedItemsForSale, saleAmountPaid, previousBalance]);

  useEffect(() => {
    if (showSaleModal) {
      setSaleAmountPaid('0');
    }
  }, [showSaleModal]);


  const handleConfirmSale = async () => {
    if (!activeUser) return;
    window.dispatchEvent(new Event('show_popunder_ad'));
    if (!saleCustomerId) {
      toast({ variant: 'destructive', title: t('customerRequired') });
      return;
    }
    if (selectedItemsForSale.length === 0) {
      toast({ variant: 'destructive', title: t('noItemsSelected') });
      return;
    }

    const data = getUserData(activeUser.email);
    const customer = data.customers.find(c => c.id === saleCustomerId);
    if (!customer) return;

    for (const soldItem of selectedItemsForSale) {
      if (soldItem.id.startsWith('custom-')) continue; // Skip stock check for custom (one-off) items

      const stockItem = data.items.find(i => i.id === soldItem.id);
      if (!stockItem || (soldItem.quantity > stockItem.quantity && stockItem.supplierName !== 'CUSTOM_ITEM')) {
        toast({ variant: 'destructive', title: `Not enough stock for ${soldItem.name}` });
        return;
      }
    }

    const amountPaidNum = parseFloat(saleAmountPaid) || 0;

    const billDate = new Date(`${saleDate}T${new Date().toTimeString().split(' ')[0]}`).toISOString();

    const newTransaction: Transaction = {
      id: new Date().toISOString(),
      customerId: saleCustomerId,
      customerName: customer.name,
      items: selectedItemsForSale.map(si => ({
        itemId: si.id,
        itemName: si.name,
        quantity: si.quantity,
        unitPrice: si.unitPrice,
        notes: si.notes,
        picture: si.picture
      })),
      totalAmount: newBillAmount,
      amountPaid: amountPaidNum,
      paid: remainingBalance <= 0,
      remainingBalance: grandTotal - amountPaidNum,
      date: billDate,
      notes: saleNotes,
      previousBalance: previousBalance,
      grandTotal: grandTotal,
    };

    data.transactions.push(newTransaction);

    selectedItemsForSale.forEach(soldItem => {
      const itemIndex = data.items.findIndex(i => i.id === soldItem.id);
      if (itemIndex > -1) {
        if (data.items[itemIndex].supplierName !== 'CUSTOM_ITEM') {
          data.items[itemIndex].quantity -= soldItem.quantity;
        } else {
          // Requirement: If user changes rate during sale, update the master record for next time
          data.items[itemIndex].sellingPrice = soldItem.unitPrice;
          data.items[itemIndex].modifiedAt = new Date().toISOString();
        }
      } else if (soldItem.id.startsWith('custom-')) {
        // fallback check by name for custom items
        const nameIdx = data.items.findIndex(i => i.itemName.toLowerCase() === soldItem.name.toLowerCase() && i.supplierName === 'CUSTOM_ITEM');
        if (nameIdx > -1) {
          data.items[nameIdx].sellingPrice = soldItem.unitPrice;
          data.items[nameIdx].modifiedAt = new Date().toISOString();
        }
      }
    });

    await saveUserData(activeUser.email, data);
    if (Capacitor.isNativePlatform()) {
      Haptics.notification({ type: NotificationType.Success }).catch(() => { });
    }
    toast({ title: t('saleSuccess') });

    setShowSaleModal(false);
    setSelectedItemsForSale([]);
    setSaleCustomerId('');
    setSaleAmountPaid('');
    setSaleNotes('');

    loadData(); // Reload data
  };

  const handlePickContactForNewCustomer = async () => {
    setIsPickingContact(true);
    try {
      const contact = await pickContact();
      if (contact) {
        setNewCustomerName(contact.name);
        setNewCustomerPhone(contact.phone);
        toast({ title: 'Contact selected', description: `${contact.name} - ${contact.phone}` });
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not open contacts.' });
    } finally {
      setIsPickingContact(false);
    }
  };

  const handlePickContactForNewSupplier = async () => {
    setIsPickingContact(true);
    try {
      const contact = await pickContact();
      if (contact) {
        setNewSupplierName(contact.name);
        setNewSupplierPhone(contact.phone);
        toast({ title: 'Contact selected', description: `${contact.name} - ${contact.phone}` });
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not open contacts.' });
    } finally {
      setIsPickingContact(false);
    }
  };

  const resetNewCustomerForm = () => {
    setNewCustomerName('');
    setNewCustomerPhone('');
    setNewCustomerAddress('');
    setNewCustomerPicture(null);
  };

  const handleSaveNewCustomer = () => {
    if (!activeUser) return;
    if (!newCustomerName || !newCustomerPhone) {
      toast({ variant: 'destructive', title: t('requiredError') });
      return;
    }
    const data = getUserData(activeUser.email);
    if (data.customers.some(c => c.phone === newCustomerPhone)) {
      toast({ variant: 'destructive', title: t('phoneExistsError') });
      return;
    }
    const newCustomer: Customer = {
      id: new Date().toISOString(),
      name: newCustomerName,
      phone: newCustomerPhone,
      address: newCustomerAddress,
      picture: newCustomerPicture || undefined,
      dateAdded: new Date().toISOString(),
    };
    data.customers.push(newCustomer);
    saveUserData(activeUser.email, data);

    setCustomers(data.customers);
    setSaleCustomerId(newCustomer.id);
    toast({ title: t('saveSuccess') });

    setShowNewCustomerModal(false);
    resetNewCustomerForm();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new (window as any).Image();
        img.src = reader.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          let width = img.width;
          let height = img.height;
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.6);

          if (editingPhotoForItemId === 'new-supplier') {
            setNewSupplierPicture(compressed);
            setEditingPhotoForItemId(null);
          } else if (editingPhotoForItemId) {
            handlePurchaseItemChange(editingPhotoForItemId, 'picture', compressed);
            setEditingPhotoForItemId(null);
          } else if (showSaleModal) {
            setCustomItemPicture(compressed);
          } else if (itemDetails) {
            setItemDetails(prev => prev ? { ...prev, picture: compressed } : null);
          } else {
            setNewCustomerPicture(compressed);
          }
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const handleItemDetailsClick = (item: DisplayItem) => {
    setItemDetails({
      item: item,
      sellingPrice: item.sellingPrice.toString(),
      purchasePrice: item.purchasePrice.toString(),
      notes: item.notes || '',
      picture: item.picture || null,
      itemName: item.itemName,
    });
  };

  const handleSaveItemDetails = () => {
    if (!activeUser || !itemDetails) return;

    const newSellingPrice = parseFloat(itemDetails.sellingPrice);
    const newPurchasePrice = parseFloat(itemDetails.purchasePrice);

    if (isNaN(newSellingPrice) || isNaN(newPurchasePrice)) {
      toast({ variant: 'destructive', title: "Invalid price format." });
      return;
    }

    const data = getUserData(activeUser.email);

    const itemNameToUpdate = itemDetails.item.itemName.toLowerCase();
    data.items.forEach(item => {
      if (item.itemName.toLowerCase() === itemNameToUpdate) {
        item.itemName = itemDetails.itemName;
        item.sellingPrice = newSellingPrice;
        item.purchasePrice = newPurchasePrice; // This might need more granular control if prices differ per batch
        item.picture = itemDetails.picture; // Sync picture (could be new photo or null)
        item.notes = itemDetails.notes || null;
        item.modifiedAt = new Date().toISOString();
      }
    });

    saveUserData(activeUser.email, data);
    loadData();
    toast({ title: t('itemUpdated') });
    setItemDetails(null);
  };

  const handleDeleteItem = async () => {
    if (!activeUser || !itemDetails) return;
    const nameToDelete = itemDetails.item.itemName.toLowerCase();
    const data = getUserData(activeUser.email);
    data.items = data.items.filter(i => i.itemName.toLowerCase() !== nameToDelete);
    await saveUserData(activeUser.email, data);
    loadData();
    setItemDetails(null);
    toast({ title: t('itemDeleted') });
  };


  const isUserView = viewMode === 'user';

  const handleSellingPriceChange = (itemName: string, newPrice: string) => {
    if (!activeUser) return;
    const price = parseFloat(newPrice);
    if (isNaN(price)) return;

    const data = getUserData(activeUser.email);
    const lowerCaseItemName = itemName.toLowerCase();

    // In customer view, update all items with the same name.
    data.items.forEach(item => {
      if (item.itemName.toLowerCase() === lowerCaseItemName) {
        item.sellingPrice = price;
        item.modifiedAt = new Date().toISOString();
      }
    });

    saveUserData(activeUser.email, data);
    setItems(data.items);
  };

  const displayedItems: DisplayItem[] = useMemo(() => {
    const itemGroups = new Map<string, {
      totalQuantity: number;
      mostRecentItem: Item;
      supplierStock: DisplayItem['supplierStock'];
    }>();

    // Sort items by date to easily find the most recent one
    const sortedByDate = [...items].sort((a, b) =>
      new Date(b.modifiedAt || b.createdAt).getTime() - new Date(a.modifiedAt || a.createdAt).getTime()
    );

    sortedByDate.forEach(item => {
      const key = item.itemName.toLowerCase();
      if (!itemGroups.has(key)) {
        itemGroups.set(key, {
          totalQuantity: 0,
          mostRecentItem: item, // The first one we see is the most recent
          supplierStock: [],
        });
      }

      const group = itemGroups.get(key)!;
      group.totalQuantity += item.quantity;
      group.supplierStock!.push({
        id: item.id,
        name: item.supplierName || 'Unknown',
        quantity: item.quantity,
        purchasePrice: item.purchasePrice,
        sellingPrice: item.sellingPrice,
      });
    });

    const finalDisplayItems = Array.from(itemGroups.values()).map(group => {
      const representativeItem = group.mostRecentItem;
      return {
        ...representativeItem, // This has the latest prices, picture, etc.
        id: isUserView ? representativeItem.itemName : representativeItem.id, // Use name as key for grouped items
        quantity: group.totalQuantity,
        supplierStock: group.supplierStock,
        isGrouped: group.supplierStock!.length > 1,
      };
    });

    // Sort final list: in-stock items first, then by name
    return finalDisplayItems.sort((a, b) => {
      if (a.quantity > 0 && b.quantity === 0) return -1;
      if (a.quantity === 0 && b.quantity > 0) return 1;
      return a.itemName.localeCompare(b.itemName);
    });

  }, [items, isUserView]);

  const availableItemsForSale: GroupedSaleItem[] = useMemo(() => {
    const inStockItems = items.filter(item => item.quantity > 0 || item.supplierName === 'CUSTOM_ITEM');

    const itemGroups = new Map<string, GroupedSaleItem>();

    inStockItems.forEach(item => {
      if (!itemGroups.has(item.itemName)) {
        itemGroups.set(item.itemName, {
          itemName: item.itemName,
          totalStock: 0,
          sellingPrice: 0, // Will be highest
          batches: []
        });
      }

      const group = itemGroups.get(item.itemName)!;
      group.totalStock += item.quantity;
      group.sellingPrice = Math.max(group.sellingPrice, item.sellingPrice);
      group.batches.push({
        id: item.id,
        stock: item.quantity,
        supplierName: item.supplierName || undefined
      });
    });

    return Array.from(itemGroups.values());
  }, [items]);

  const sortedCustomers = useMemo(() => [...customers].filter(c => !c.isSupplier).sort((a, b) => a.name.localeCompare(b.name)), [customers]);

  const handleSaleModalOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedItemsForSale([]);
      setSaleCustomerId('');
      setSaleAmountPaid('');
      setSaleNotes('');
      setSaleDate(new Date().toISOString().split('T')[0]);
    }
    setShowSaleModal(open);
  };


  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">{t('availableItems')}</h2>
          <p className="text-muted-foreground">{t('itemsDescription')}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowAddItemModal(true)}>
            <PlusCircle className="mr-2" /> {t('addNewItem')}
          </Button>
          <Button onClick={handleSellClick} variant="default">
            <ShoppingCart className="mr-2 h-4 w-4" />{t('sell')}
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted bg-card p-12 text-center h-96">
          <Package className="h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{t('noItems')}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Recent Bills Pills Section */}
          <div className="bg-card border rounded-lg p-3 shadow-sm">
            <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-3 h-3" /> Recent Bills
            </p>
            <div className="flex flex-wrap gap-2">
              {(() => {
                const customerSales = transactions
                  .filter(tx => tx.type !== 'purchase' && tx.type !== 'debit')
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 10);

                return customerSales.slice(0, 5).map((tx, i) => {
                  const customerTxs = transactions
                    .filter(ctx => ctx.customerId === tx.customerId && ctx.type !== 'purchase' && ctx.type !== 'debit')
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                  const billNumber = customerTxs.findIndex(ctx => ctx.id === tx.id) + 1;

                  return (
                    <Button
                      key={tx.id}
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs bg-red-50 text-red-600 border-red-200 hover:bg-red-100 rounded-full font-bold"
                      onClick={() => setShowBillPreview({ ...tx, billNumber })}
                    >
                      {i + 1}
                    </Button>
                  );
                });
              })()}
              {transactions.filter(tx => tx.type !== 'purchase' && tx.type !== 'debit').length === 0 && (
                <p className="text-sm text-muted-foreground italic">No recent transactions.</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <TooltipProvider>
              {displayedItems.map(item => (
                <Card key={item.id} className={`transition-shadow hover:shadow-md ${item.quantity === 0 ? 'bg-muted/50' : 'bg-card'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div
                        className="relative w-20 h-20 rounded-md bg-muted flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => item.picture && setViewImage(item.picture)}
                      >
                        {item.picture ? (
                          <Image src={item.picture} alt={item.itemName} layout="fill" className="rounded-md object-cover" />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <Package className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="font-bold text-base line-clamp-2">{item.itemName}</p>
                        {item.notes && <p className="text-xs text-muted-foreground line-clamp-2">{item.notes}</p>}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5 font-semibold">
                            <DollarSign className="w-4 h-4 text-green-500" />
                            {isUserView ? (
                              <span>{item.sellingPrice.toLocaleString()}</span>
                            ) : (
                              <Input
                                type="number"
                                defaultValue={item.sellingPrice}
                                onBlur={(e) => handleSellingPriceChange(item.itemName, e.target.value)}
                                className="h-7 w-24 text-sm"
                                disabled={item.quantity === 0}
                              />
                            )}
                          </div>
                          {isUserView && <div className="flex items-center gap-1.5"><Package className="w-4 h-4" /> <span>{t('quantityLabelShort')}: {item.quantity}</span></div>}
                        </div>
                        {item.quantity === 0 && <p className="text-sm font-bold text-destructive pt-1">{t('outOfStock')}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-2 self-stretch">
                        {isUserView && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 -mr-1">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => setShowStockView(item)}>
                                <Eye className="mr-2 h-4 w-4" />
                                <span>View Supplier Stock</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleItemDetailsClick(item)}>
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Edit Item</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                        <Button variant="outline" size="sm" onClick={handleSellClick} className="mt-auto">
                          <ShoppingCart className="mr-2 h-4 w-4" />{t('sell')}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TooltipProvider>
          </div>
        </div>
      )}

      {/* View Supplier Stock Modal */}
      {showStockView && (
        <Dialog open={!!showStockView} onOpenChange={(open) => !open && setShowStockView(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{showStockView.itemName}</DialogTitle>
              <DialogDescription>Stock breakdown by supplier.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <Card>
                <CardHeader><CardTitle className="text-base">Stock Details</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {showStockView.supplierStock?.map(s => (
                    <div key={s.id} className="flex justify-between items-center p-2 rounded-md hover:bg-muted/50">
                      <div>
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.quantity} units @ {s.purchasePrice.toLocaleString()} each
                        </p>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete this stock entry. This action cannot be undone and will not affect past bills.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteStockEntry(s.id)} className="bg-destructive hover:bg-destructive/90">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                  <div className="flex justify-between items-center font-bold border-t pt-2 mt-2">
                    <span>Total Stock</span>
                    <span>{showStockView.quantity} units</span>
                  </div>
                </CardContent>
              </Card>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Item Modal */}
      {itemDetails && (
        <Dialog open={!!itemDetails} onOpenChange={(open) => !open && setItemDetails(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit: {itemDetails.item.itemName}</DialogTitle>
              <DialogDescription>Edit prices, notes, and photo for this item group.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-2">
                <Label>{t('pictureLabel')}</Label>
                <div className="flex items-center gap-4">
                  {itemDetails.picture ? (
                    <div className="relative w-24 h-24">
                      <Image src={itemDetails.picture} alt="Item" layout="fill" className="rounded-md object-cover" />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                        onClick={() => setItemDetails(prev => prev ? { ...prev, picture: null } : null)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 bg-muted rounded-md flex items-center justify-center">
                      <Camera className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <AlertDialog open={isCameraOpen && !!itemDetails} onOpenChange={setIsCameraOpen}>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline">
                          <Camera className="mr-2" /> {t('takePicture')}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Camera</AlertDialogTitle>
                        </AlertDialogHeader>
                        <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay playsInline muted />
                        <canvas ref={canvasRef} className="hidden" />
                        {hasCameraPermission === false && (
                          <Alert variant="destructive">
                            <AlertTitle>Camera Access Required</AlertTitle>
                            <AlertDescription>
                              Please allow camera access to use this feature. You may need to refresh the page after granting permissions in your browser settings.
                            </AlertDescription>
                          </Alert>
                        )}
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                          <AlertDialogAction onClick={handleCapture} disabled={!hasCameraPermission}>{t('capture')}</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="mr-2" /> {t('uploadPicture')}
                    </Button>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="itemName">Item Name</Label>
                <Input id="itemName" value={itemDetails.itemName} onChange={e => setItemDetails(prev => prev ? { ...prev, itemName: e.target.value } : null)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sellingPrice">Selling Price</Label>
                <Input id="sellingPrice" type="number" value={itemDetails.sellingPrice} onChange={e => setItemDetails(prev => prev ? { ...prev, sellingPrice: e.target.value } : null)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="purchasePrice">Purchase Price (most recent)</Label>
                <Input id="purchasePrice" type="number" value={itemDetails.purchasePrice} onChange={e => setItemDetails(prev => prev ? { ...prev, purchasePrice: e.target.value } : null)} />
                <p className="text-xs text-muted-foreground">Applies to all stock entries for '{itemDetails.item.itemName}'. This will not affect historical supplier balances.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">{t('notesLabel')}</Label>
                <Textarea id="notes" value={itemDetails.notes} onChange={e => setItemDetails(prev => prev ? { ...prev, notes: e.target.value } : null)} />
              </div>
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 w-full sm:w-auto">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full sm:w-auto">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete Item
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Item Group?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete all stock entries for "{itemDetails.item.itemName}"? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteItem} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <DialogClose asChild className="flex-1 sm:flex-none">
                  <Button variant="outline" className="w-full">Close</Button>
                </DialogClose>
                <Button onClick={handleSaveItemDetails} className="flex-1 sm:flex-none">Save Changes</Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}


      {/* Multi-item ADD Modal */}
      <Dialog open={showAddItemModal} onOpenChange={setShowAddItemModal}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader><DialogTitle>Add New Purchase</DialogTitle></DialogHeader>
          <div className="flex-1 overflow-y-auto p-1">
            {/* Supplier Selection */}
            <Card className="mb-4">
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label>Select Supplier</Label>
                  <div className="flex gap-2">
                    <Select value={purchaseSupplierId} onValueChange={(val) => setPurchaseSupplierId(val)}>
                      <SelectTrigger><SelectValue placeholder="Select a supplier" /></SelectTrigger>
                      <SelectContent>
                        {supplierList.map(s => <SelectItem key={s.id} value={s.id}>{s.name} - {s.phone}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={() => setShowNewSupplierModal(true)}>Add New Supplier</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Items List */}
            <div className="space-y-2">
              {purchaseItems.map((item, index) => (
                <Card key={item.id}>
                  <CardContent className="p-3 grid grid-cols-1 md:grid-cols-[1fr_repeat(4,100px)_auto] gap-2 items-start">
                    <div className='flex flex-col gap-2'>
                      <Input placeholder={`Item Name ${index + 1}`} value={item.itemName} onChange={e => handlePurchaseItemChange(item.id, 'itemName', e.target.value)} />
                      <div className="flex items-center gap-4">
                        {item.picture ? (
                          <div className="relative w-24 h-24">
                            <Image src={item.picture} alt="Item" layout="fill" className="rounded-md object-cover" />
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                              onClick={() => handlePurchaseItemChange(item.id, 'picture', null)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="w-24 h-24 bg-muted rounded-md flex items-center justify-center">
                            <Camera className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex flex-col gap-2">
                          <AlertDialog open={isCameraOpen && editingPhotoForItemId === item.id} onOpenChange={setIsCameraOpen}>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" onClick={() => { setEditingPhotoForItemId(item.id); setIsCameraOpen(true); }}>
                                <Camera className="mr-2" /> {t('takePicture')}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Camera</AlertDialogTitle>
                              </AlertDialogHeader>
                              <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay playsInline muted />
                              <canvas ref={canvasRef} className="hidden" />
                              {hasCameraPermission === false && (
                                <Alert variant="destructive">
                                  <AlertTitle>Camera Access Required</AlertTitle>
                                  <AlertDescription>
                                    Please allow camera access to use this feature. You may need to refresh the page after granting permissions in your browser settings.
                                  </AlertDescription>
                                </Alert>
                              )}
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                                <AlertDialogAction onClick={handleCapture} disabled={!hasCameraPermission}>{t('capture')}</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          <Button variant="outline" onClick={() => { fileInputRef.current?.click(); setEditingPhotoForItemId(item.id); }}>
                            <Upload className="mr-2" /> {t('uploadPicture')}
                          </Button>
                        </div>
                      </div>
                    </div>
                    <Input type="number" placeholder="P. Price" value={item.purchasePrice || ''} onChange={e => handlePurchaseItemChange(item.id, 'purchasePrice', parseFloat(e.target.value))} />
                    <Input type="number" placeholder="S. Price" value={item.sellingPrice || ''} onChange={e => handlePurchaseItemChange(item.id, 'sellingPrice', parseFloat(e.target.value))} />
                    <Input type="number" placeholder="Qty" value={item.quantity || ''} onChange={e => handlePurchaseItemChange(item.id, 'quantity', parseInt(e.target.value, 10))} />
                    <p className="text-sm font-medium text-right pr-2">{(item.purchasePrice * item.quantity).toLocaleString()}</p>
                    <Button variant="ghost" size="icon" onClick={() => handleRemovePurchaseItem(item.id)}><X className="h-4 w-4 text-destructive" /></Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4" onClick={handleAddNewPurchaseItem}>Add Another Item</Button>

            <div className="mt-4">
              <Label htmlFor="purchaseDate">Purchase Date</Label>
              <Input id="purchaseDate" type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} required />
            </div>

            <div className="mt-4">
              <Label htmlFor="purchaseNotes">Notes (Optional)</Label>
              <Textarea id="purchaseNotes" value={purchaseNotes} onChange={(e) => setPurchaseNotes(e.target.value)} />
            </div>


            {/* Billing Summary */}
            {purchaseItems.length > 0 && purchaseSupplierId && (
              <Card className="mt-6">
                <CardHeader><CardTitle>Billing Summary</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between"><span>Total Purchase Bill</span> <span className="font-medium">{currentPurchaseBill.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Previous Balance</span> <span className="font-medium">{supplierPreviousBalance.toLocaleString()}</span></div>
                  <div className="flex justify-between font-bold text-base border-t pt-2"><span>Grand Total</span> <span>{grandTotalPurchase.toLocaleString()}</span></div>
                  <div className="pt-4">
                    <Label>Payment Made Now</Label>
                    <Input type="number" placeholder="Enter amount paid to supplier" value={purchasePayment} onChange={e => setPurchasePayment(e.target.value)} />
                  </div>
                  <div className="flex justify-between font-bold text-base text-red-600 border-t pt-2 mt-4">
                    <span>Remaining Balance</span>
                    <span>{(grandTotalPurchase - (parseFloat(purchasePayment) || 0)).toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetAddItemModal}>Cancel</Button>
            <Button onClick={handleConfirmPurchase}>Save Purchase</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* This input is used by multiple modals for file uploads */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
      />


      {/* New Supplier Modal */}
      <Dialog open={showNewSupplierModal} onOpenChange={setShowNewSupplierModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Add New Supplier</span>
              {hasContactSupport && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePickContactForNewSupplier}
                  disabled={isPickingContact}
                  className="flex items-center gap-1.5 text-xs text-primary border-primary/40"
                >
                  <BookUser className="h-3.5 w-3.5" />
                  {isPickingContact ? '...' : t('pickFromContacts')}
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-supplier-name">Supplier Name</Label>
              <Input id="new-supplier-name" value={newSupplierName} onChange={(e) => setNewSupplierName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-supplier-phone">Supplier Phone</Label>
              <Input id="new-supplier-phone" type="tel" value={newSupplierPhone} onChange={(e) => setNewSupplierPhone(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-supplier-address">Address (Optional)</Label>
              <Textarea id="new-supplier-address" value={newSupplierAddress} onChange={(e) => setNewSupplierAddress(e.target.value)} />
            </div>

            <div className="space-y-2 pt-2">
              <Label>Supplier Photo (Optional)</Label>
              <div className="flex items-center gap-4">
                {newSupplierPicture ? (
                  <div className="relative w-24 h-24">
                    <Image src={newSupplierPicture} alt="Supplier" layout="fill" className="rounded-md object-cover" />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                      onClick={() => setNewSupplierPicture(null)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="w-24 h-24 bg-muted rounded-md flex items-center justify-center">
                    <Camera className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <AlertDialog open={isCameraOpen && editingPhotoForItemId === 'new-supplier'} onOpenChange={setIsCameraOpen}>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" onClick={() => { setEditingPhotoForItemId('new-supplier'); setIsCameraOpen(true); }}>
                        <Camera className="mr-2" /> Take Photo
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Camera</AlertDialogTitle></AlertDialogHeader>
                      <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay playsInline muted />
                      <canvas ref={canvasRef} className="hidden" />
                      {hasCameraPermission === false && (
                        <Alert variant="destructive">
                          <AlertTitle>Camera Access Required</AlertTitle>
                          <AlertDescription>Please allow camera access.</AlertDescription>
                        </Alert>
                      )}
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setEditingPhotoForItemId(null)}>{t('cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCapture} disabled={!hasCameraPermission}>{t('capture')}</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <Button variant="outline" onClick={() => { setEditingPhotoForItemId('new-supplier'); fileInputRef.current?.click(); }}>
                    <Upload className="mr-2" /> Upload Photo
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewSupplierModal(false)}>Cancel</Button>
            <Button onClick={handleSaveNewSupplier}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restock Modal */}
      <Dialog open={showRestockModal} onOpenChange={(open) => !open && (setRestockItem(null), setRestockQuantity(''))}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader><DialogTitle>{t('restock')}: {restockItem?.itemName}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="restock-quantity">{t('quantityToAdd')}</Label>
              <Input
                id="restock-quantity"
                type="number"
                value={restockQuantity}
                onChange={e => setRestockQuantity(e.target.value)}
                placeholder="e.g., 20"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">{t('cancel')}</Button></DialogClose>
            <Button onClick={handleConfirmRestock}>{t('confirmRestock')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Multi-item Sale Modal */}
      <Dialog open={showSaleModal} onOpenChange={handleSaleModalOpenChange}>
        <DialogContent className="max-w-3xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('createSale')}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6 pr-2">
            {/* Left: Item Selection */}
            <div className="flex flex-col gap-4">
              <h3 className="font-semibold">{t('availableItems')}</h3>
              <div className="space-y-2">
                {availableItemsForSale.map(item => (
                  <div key={item.itemName} className="flex items-center gap-2 p-2 border rounded-md">
                    <Checkbox
                      id={`item-group-${item.itemName}`}
                      onCheckedChange={() => toggleItemGroupForSale(item)}
                      checked={selectedItemsForSale.some(si => si.name === item.itemName)}
                    />
                    <label htmlFor={`item-group-${item.itemName}`} className="flex-1">
                      <p className="font-medium">{item.itemName}</p>
                      <p className="text-sm text-muted-foreground">{t('sellingPriceLabel')}: {item.sellingPrice.toLocaleString()} | {t('quantityLabelShort')}: {item.batches.some(b => b.supplierName === 'CUSTOM_ITEM') ? '∞' : item.totalStock}</p>
                    </label>
                  </div>
                ))}
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-semibold text-sm">Add Custom Item (Not in Stock)</h3>
                <div className="space-y-3 p-3 border rounded-lg bg-muted/20">
                  <div className="grid grid-cols-1 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Item Name</Label>
                      <Input
                        placeholder="e.g. Special Service"
                        value={customItemName}
                        onChange={e => setCustomItemName(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Quantity</Label>
                        <Input
                          placeholder="1"
                          type="number"
                          value={customItemQuantity}
                          onChange={e => setCustomItemQuantity(e.target.value)}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Price</Label>
                        <Input
                          placeholder="Price"
                          type="number"
                          value={customItemPrice}
                          onChange={e => setCustomItemPrice(e.target.value)}
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Notes/Details</Label>
                      <Textarea
                        placeholder="Add details about this custom item..."
                        value={customItemNotes}
                        onChange={e => setCustomItemNotes(e.target.value)}
                        className="text-xs min-h-[60px]"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative w-12 h-12 rounded border bg-card flex-shrink-0">
                        {customItemPicture ? (
                          <Image src={customItemPicture} alt="Custom" layout="fill" className="object-cover rounded" />
                        ) : (
                          <div className="flex items-center justify-center h-full text-muted-foreground"><Camera size={16} /></div>
                        )}
                        {customItemPicture && (
                          <button
                            onClick={() => setCustomItemPicture(null)}
                            className="absolute -top-1 -right-1 bg-destructive text-white rounded-full p-0.5"
                          >
                            <X size={10} />
                          </button>
                        )}
                      </div>
                      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="mr-1 h-3 w-3" /> Photo
                      </Button>
                      <Button size="sm" className="h-8 text-xs ml-auto" onClick={addCustomItemToSale} type="button">
                        <PlusCircle className="mr-1 h-3 w-3" /> Add Item
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Sale Details */}
            <div className="flex flex-col gap-4">
              <h3 className="font-semibold">{t('saleDetails')}</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>{t('selectCustomer')}</Label>
                  <Button variant="link" className="h-auto p-0" onClick={() => setShowNewCustomerModal(true)}>
                    <UserPlus className="mr-2" />{t('addNewCustomer')}
                  </Button>
                </div>
                <Select value={saleCustomerId} onValueChange={setSaleCustomerId}>
                  <SelectTrigger><SelectValue placeholder={t('selectCustomer')} /></SelectTrigger>
                  <SelectContent>
                    {sortedCustomers.map(c => <SelectItem key={c.id} value={c.id}>{c.name} - {c.phone}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="saledate">{t('date')}</Label>
                <Input id="saledate" type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="previousBalanceManual">{t('previousBalance')}</Label>
                <Input
                  id="previousBalanceManual"
                  type="number"
                  value={manualPreviousBalance}
                  onChange={(e) => setManualPreviousBalance(e.target.value)}
                  placeholder="0"
                />
              </div>

              {selectedItemsForSale.length > 0 ? (
                <div className="space-y-4 border-t pt-4">
                  {/* Inventory Items Section */}
                  {availableItemsForSale.filter(gi => selectedItemsForSale.some(si => si.name === gi.itemName && !si.id.startsWith('custom-'))).map(groupedItem => (
                    <Collapsible key={groupedItem.itemName} className="space-y-2 border-b pb-2">
                      <div className="flex justify-between items-center px-1">
                        <p className="font-medium truncate text-sm flex-1" title={groupedItem.itemName}>{groupedItem.itemName}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold">
                            {selectedItemsForSale.filter(i => i.name === groupedItem.itemName).reduce((sum, i) => sum + i.quantity, 0)}
                          </p>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </CollapsibleTrigger>
                        </div>
                      </div>
                      <CollapsibleContent className="space-y-2 pl-4 border-l-2 ml-2 pb-2">
                        <div className="grid grid-cols-[1fr_80px] items-center gap-2 mt-1">
                          <Label className="text-[11px] font-semibold text-muted-foreground">Adjust Selling Price</Label>
                          <Input
                            type="number"
                            value={selectedItemsForSale.find(i => i.name === groupedItem.itemName && !i.id.startsWith('custom-'))?.unitPrice || ''}
                            onChange={(e) => handlePriceChange(groupedItem.itemName, e.target.value)}
                            className="h-8 text-sm font-bold"
                          />
                        </div>
                        <div className="space-y-2 mt-2">
                          <p className="text-[10px] uppercase text-muted-foreground font-bold">Qty per Supplier Batch:</p>
                          {groupedItem.batches.map(batch => (
                            <div key={batch.id} className="grid grid-cols-[1fr_80px] items-center gap-2">
                              <Label className="text-[11px] truncate text-primary/80">{batch.supplierName || 'Unknown'} (Stock: {batch.stock})</Label>
                              <Input
                                type="number"
                                value={selectedItemsForSale.find(i => i.id === batch.id)?.quantity || ''}
                                onChange={(e) => handleItemDetailChange(groupedItem.itemName, batch.id, e.target.value)}
                                className="h-8 text-sm"
                                min="0"
                                max={batch.stock}
                              />
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}

                  {/* Custom Items Section */}
                  {selectedItemsForSale.filter(si => si.id.startsWith('custom-')).map(customItem => (
                    <div key={customItem.id} className="space-y-3 border border-dashed border-primary/20 pb-3 bg-primary/5 p-3 rounded-lg relative">
                      <div className="flex justify-between items-center pr-6">
                        <Label className="text-[10px] uppercase text-primary/70 font-bold tracking-tight">Custom Item Details</Label>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 absolute top-1 right-1 text-muted-foreground hover:text-destructive z-10"
                          onClick={() => setSelectedItemsForSale(prev => prev.filter(i => i.id !== customItem.id))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="space-y-2.5">
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase text-muted-foreground pl-0.5">Item Name</Label>
                          <Input
                            placeholder="e.g. Special Service"
                            value={customItem.name}
                            onChange={e => handleUpdateCustomItem(customItem.id, 'name', e.target.value)}
                            className="h-8 text-sm font-bold"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase text-muted-foreground pl-0.5 font-bold">Qty (Quantity)</Label>
                            <Input
                              type="number"
                              value={customItem.quantity === 0 ? '' : customItem.quantity}
                              onChange={e => handleUpdateCustomItem(customItem.id, 'quantity', parseFloat(e.target.value) || 0)}
                              className="h-8 text-sm"
                              placeholder="0"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase text-muted-foreground pl-0.5 font-bold">Rate (Price)</Label>
                            <Input
                              type="number"
                              value={customItem.unitPrice === 0 ? '' : customItem.unitPrice}
                              onChange={e => handleUpdateCustomItem(customItem.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                              className="h-8 text-sm font-semibold"
                              placeholder="0"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase text-muted-foreground pl-0.5 font-bold">Notes / Extra Info</Label>
                          <Textarea
                            value={customItem.notes || ''}
                            onChange={e => handleUpdateCustomItem(customItem.id, 'notes', e.target.value)}
                            className="text-xs min-h-[50px] px-2 py-1.5"
                            placeholder="Add specific details about this sale..."
                          />
                        </div>

                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-primary/10">
                          <div className="flex items-center gap-3">
                            <div className="relative h-12 w-12 rounded-md border shadow-sm overflow-hidden flex items-center justify-center">
                              {customItem.picture ? (
                                <>
                                  <Image src={customItem.picture} alt="item" layout="fill" className="object-cover" />
                                  <Button
                                    variant="destructive"
                                    size="icon"
                                    className="h-5 w-5 absolute top-0.5 right-0.5 p-0 rounded-full"
                                    onClick={() => handleUpdateCustomItem(customItem.id, 'picture', null)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </>
                              ) : (
                                <Camera size={20} className="text-muted-foreground" />
                              )}
                            </div>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-8 text-[11px] px-3 font-medium"
                              onClick={() => {
                                setEditingPhotoForItemId(customItem.id);
                                fileInputRef.current?.click();
                              }}
                            >
                              <Upload className="mr-1 h-3.5 w-3.5" /> Photo
                            </Button>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] uppercase text-muted-foreground">Item Subtotal</p>
                            <p className="text-base font-bold text-primary">{(customItem.quantity * customItem.unitPrice).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg flex-1 flex items-center justify-center">
                  <p>{t('noItemsSelected')}</p>
                </div>
              )}

              {selectedItemsForSale.length > 0 && (
                <div className="space-y-3 border-t pt-4 mt-auto">
                  <div className="flex justify-between items-center text-sm">
                    <span>{t('total')}</span>
                    <span>{newBillAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-medium text-muted-foreground">
                    <span>{t('previousBalance')} (Adjusted)</span>
                    <span>{previousBalance.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center font-bold text-lg">
                    <span>{t('grandTotal')}</span>
                    <span>{grandTotal.toLocaleString()}</span>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amountPaid">{t('amountPaid')}</Label>
                    <Input id="amountPaid" type="number" value={saleAmountPaid} onChange={e => setSaleAmountPaid(e.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="saleNotes">{t('notesLabel')}</Label>
                    <Textarea id="saleNotes" value={saleNotes} onChange={(e) => setSaleNotes(e.target.value)} />
                  </div>
                  <div className="flex justify-between items-center font-bold text-lg">
                    <span>{t('remaining')}</span>
                    <span className={remainingBalance > 0 ? 'text-destructive' : 'text-green-600'}>
                      {remainingBalance.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">{t('cancel')}</Button></DialogClose>
            <Button onClick={handleConfirmSale} disabled={selectedItemsForSale.length === 0 || !saleCustomerId}>{t('confirmSale')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Customer Modal */}
      <Dialog open={showNewCustomerModal} onOpenChange={setShowNewCustomerModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{t('addNewCustomer')}</span>
              {hasContactSupport && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePickContactForNewCustomer}
                  disabled={isPickingContact}
                  className="flex items-center gap-1.5 text-xs text-primary border-primary/40"
                >
                  <BookUser className="h-3.5 w-3.5" />
                  {isPickingContact ? '...' : t('pickFromContacts')}
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-customer-name">{t('nameLabel')}</Label>
              <Input id="new-customer-name" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-customer-phone">{t('phoneLabel')}</Label>
              <Input id="new-customer-phone" type="tel" value={newCustomerPhone} onChange={(e) => setNewCustomerPhone(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-customer-address">{t('addressLabel')}</Label>
              <Textarea id="new-customer-address" value={newCustomerAddress} onChange={(e) => setNewCustomerAddress(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('pictureLabel')}</Label>
              <div className="flex items-center gap-4">
                {newCustomerPicture ? (
                  <div className="relative w-24 h-24">
                    <Image src={newCustomerPicture} alt="Customer" layout="fill" className="rounded-md object-cover" />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                      onClick={() => setNewCustomerPicture(null)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="w-24 h-24 bg-muted rounded-md flex items-center justify-center">
                    <Camera className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <AlertDialog open={isCameraOpen && !editingPhotoForItemId && !itemDetails} onOpenChange={setIsCameraOpen}>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" onClick={() => setIsCameraOpen(true)}>
                        <Camera className="mr-2" /> {t('takePicture')}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Camera</AlertDialogTitle>
                      </AlertDialogHeader>
                      <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay playsInline muted />
                      <canvas ref={canvasRef} className="hidden" />
                      {hasCameraPermission === false && (
                        <Alert variant="destructive">
                          <AlertTitle>Camera Access Required</AlertTitle>
                          <AlertDescription>
                            Please allow camera access to use this feature. You may need to refresh the page after granting permissions in your browser settings.
                          </AlertDescription>
                        </Alert>
                      )}
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCapture} disabled={!hasCameraPermission}>{t('capture')}</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="mr-2" /> {t('uploadPicture')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">{t('cancel')}</Button></DialogClose>
            <Button onClick={handleSaveNewCustomer}>{t('saveCustomer')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bill Preview Modal */}
      <Dialog open={!!showBillPreview} onOpenChange={() => setShowBillPreview(null)}>
        <DialogContent className="max-w-2xl h-[90vh] flex flex-col p-4 bg-white">
          <DialogHeader className="border-b pb-2">
            <div className="flex justify-between items-center pr-8">
              <DialogTitle>Bill Preview</DialogTitle>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-orange-600 border-orange-200 hover:bg-orange-50"
                  onClick={async () => {
                    window.dispatchEvent(new Event('show_popunder_ad'));
                    if (showBillPreview && billDesignSettings) {
                      const customer = customers.find(c => c.id === showBillPreview.customerId) || customers.find(c => c.name === showBillPreview.customerName);
                      await generateSingleBillPDF(showBillPreview, customer || ({} as any), billDesignSettings);
                    }
                  }}
                >
                  <FileDown className="h-4 w-4 mr-1" /> PDF
                </Button>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pt-4 bg-muted/10 rounded-lg p-2">
            {showBillPreview && billDesignSettings && (
              <div id={`bill-preview-${showBillPreview.id}`}>
                <BillRenderer
                  bill={showBillPreview}
                  settings={billDesignSettings}
                  onViewImage={(img) => setViewImage(img)}
                />
              </div>
            )}
          </div>
          <DialogFooter className="mt-4 border-t pt-4">
            <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white" onClick={() => setShowBillPreview(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Image Dialog */}
      <Dialog open={!!viewImage} onOpenChange={() => setViewImage(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden bg-black border-none">
          <DialogHeader className="sr-only">
            <DialogTitle>View Item Photo</DialogTitle>
          </DialogHeader>
          <div className="relative w-full h-[80vh] flex items-center justify-center p-4">
            {viewImage && <img src={viewImage} className="max-w-full max-h-full object-contain" alt="Item Preview" />}
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

    </div>
  );
}