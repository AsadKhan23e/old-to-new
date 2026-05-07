'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Building, Phone, Package, DollarSign, User, CreditCard, FileDown, Lock, MoreVertical, Edit, Trash2, PlusCircle, Share2, X, Camera, Upload } from 'lucide-react';
import { getActiveUser, getUserData, saveUserData, getViewMode, Item, Customer, Transaction, getIsPremium, SoldItem, Payment, BillDesignSettings, User as AppUser } from '@/lib/data-layer';
import { useTranslation } from '@/hooks/use-translation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogFooter, AlertDialogDescription } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import Image from 'next/image';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { BillRenderer } from '@/components/billing/BillRenderer';
import { generateSingleBillPDF, generateFullKhataPDF } from '@/lib/pdf-service';


type Supplier = Customer & {
  balance: number;
  totalPurchases: number;
};

const PaySupplierModal = ({
  isOpen,
  onClose,
  onSave,
  supplierName
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (amount: number, date: string, notes: string, image: string | null) => void;
  supplierName: string;
}) => {
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    const paymentAmount = parseFloat(amount);
    if (!isNaN(paymentAmount) && paymentAmount > 0) {
      onSave(paymentAmount, date, notes, image);
      onClose();
      setAmount('');
      setNotes('');
      setImage(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new (window as any).Image();
        img.src = reader.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6); // Compress to 60% quality
          setImage(compressedBase64);
        };
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('addPayment')} to {supplierName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="payment-amount">{t('amount')}</Label>
            <Input
              id="payment-amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment-date">{t('date')}</Label>
            <Input
              id="payment-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment-notes">{t('notesLabel')} (Optional)</Label>
            <Textarea
              id="payment-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Attach Proof/Photo (Optional)</Label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => cameraInputRef.current?.click()}
                className="flex-1 px-1"
              >
                <Camera className="mr-1 h-4 w-4" /> Camera
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => galleryInputRef.current?.click()}
                className="flex-1 px-1"
              >
                <Upload className="mr-1 h-4 w-4" /> Gallery
              </Button>
              <input
                type="file"
                ref={cameraInputRef}
                className="hidden"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
              />
              <input
                type="file"
                ref={galleryInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
              {image && (
                <div className="relative w-10 h-10 border rounded overflow-hidden">
                  <img src={image} className="w-full h-full object-cover" alt="Preview" />
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute inset-0 opacity-0 hover:opacity-100 h-full w-full"
                    onClick={() => setImage(null)}
                  >
                    X
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button onClick={handleSave}>{t('savePayment')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const EditPurchaseModal = ({
  isOpen,
  onClose,
  purchase,
  allItems,
  onPurchaseUpdated
}: {
  isOpen: boolean;
  onClose: () => void;
  purchase: Transaction | null;
  allItems: Item[];
  onPurchaseUpdated: () => void;
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [products, setProducts] = useState<SoldItem[]>([]);
  const [originalProducts, setOriginalProducts] = useState<SoldItem[]>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (purchase) {
      const purchaseProducts = purchase.items || [];
      // Create a deep copy to avoid direct mutation
      const initialProducts = purchaseProducts.map(p => ({ ...p }));
      setProducts(initialProducts);
      // Store the original state for diff calculation
      setOriginalProducts(JSON.parse(JSON.stringify(initialProducts)));
      setNotes(purchase.notes || '');
    }
  }, [purchase]);

  const handleProductChange = (index: number, field: keyof SoldItem, value: string | number) => {
    const updatedProducts = [...products];
    const product = { ...updatedProducts[index] };

    if (field === 'itemId') {
      const selectedItem = allItems.find(item => item.id === value);
      if (selectedItem) {
        product.itemId = selectedItem.id;
        product.itemName = selectedItem.itemName;
        product.unitPrice = selectedItem.purchasePrice;
      }
    } else {
      (product as any)[field] = value;
    }

    updatedProducts[index] = product;
    setProducts(updatedProducts);
  };

  const handleAddProduct = () => {
    setProducts([...products, { itemId: '', itemName: '', quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveProduct = (index: number) => {
    setProducts(products.filter((_, i) => i !== index));
  };

  if (!purchase) return null;

  const newTotalAmount = products.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const grandTotal = (purchase.previousBalance || 0) + newTotalAmount;
  const remainingBalance = grandTotal - (purchase.amountPaid || 0) - (purchase.additionalPayments?.reduce((sum, p) => sum + p.amount, 0) || 0);

  const handleSaveChanges = () => {
    const activeUser = getActiveUser();
    if (!activeUser || !purchase) return;


    const data = getUserData(activeUser.email);

    // --- START: STOCK ADJUSTMENT LOGIC ---
    const stockUpdates = new Map<string, number>();

    // Create a map of old quantities (how much to subtract)
    originalProducts.forEach(op => {
      stockUpdates.set(op.itemId, (stockUpdates.get(op.itemId) || 0) - op.quantity);
    });

    // Create a map of new quantities (how much to add)
    products.forEach(np => {
      stockUpdates.set(np.itemId, (stockUpdates.get(np.itemId) || 0) + np.quantity);
    });

    // Apply the calculated differences to stock
    stockUpdates.forEach((quantityChange, itemId) => {
      const itemIndex = data.items.findIndex(i => i.id === itemId);
      if (itemIndex > -1) {
        data.items[itemIndex].quantity += quantityChange;
      }
    });
    // --- END: STOCK ADJUSTMENT LOGIC ---

    const updatedPurchase: Transaction = {
      ...purchase,
      items: products,
      notes,
      totalAmount: newTotalAmount,
      grandTotal: grandTotal,
      remainingBalance: remainingBalance,
      isEdited: true,
      modifiedAt: new Date().toISOString(),
    };

    const updatedTransactions = data.transactions.map(tx => tx.id === purchase.id ? updatedPurchase : tx);

    saveUserData(activeUser.email, { ...data, items: data.items, transactions: updatedTransactions });

    toast({ title: "Purchase updated successfully!" });
    onPurchaseUpdated();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Purchase #{purchase?.id.slice(-6)}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-4 p-1">
          <Card>
            <CardHeader><CardTitle>Products</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {products.map((product, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_80px_100px_auto] gap-2 items-center">
                  <Select
                    value={product.itemId}
                    onValueChange={(value) => handleProductChange(index, 'itemId', value)}
                  >
                    <SelectTrigger><SelectValue placeholder="Select Product" /></SelectTrigger>
                    <SelectContent>
                      {allItems.map(item => (
                        <SelectItem key={item.id} value={item.id}>{item.itemName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input type="number" placeholder="Qty" value={product.quantity} onChange={(e) => handleProductChange(index, 'quantity', parseInt(e.target.value, 10))} />
                  <Input type="number" placeholder="Price" value={product.unitPrice} onChange={(e) => handleProductChange(index, 'unitPrice', parseFloat(e.target.value))} />
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveProduct(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={handleAddProduct} className="mt-2"><CreditCard className="mr-2 h-4 w-4" /> Add Product</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
            <CardContent><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></CardContent>
          </Card>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button onClick={handleSaveChanges}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const AddEditSupplierModal = ({
  isOpen,
  onClose,
  supplier,
  onSupplierSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  supplier: Customer | null;
  onSupplierSaved: () => void;
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [picture, setPicture] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

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

        setPicture(dataUrl);
      }
      setIsCameraOpen(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new (window as any).Image();
        img.src = reader.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
          setPicture(compressedBase64);
        };
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (isCameraOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCameraOpen]);

  useEffect(() => {
    if (supplier) {
      setName(supplier.name);
      setPhone(supplier.phone);
      setAddress(supplier.address || '');
      setPicture(supplier.picture || null);
    } else {
      setName('');
      setPhone('');
      setAddress('');
      setPicture(null);
    }
  }, [supplier]);

  const handleSave = () => {
    const activeUser = getActiveUser();
    if (!activeUser || !name) {
      toast({ variant: 'destructive', title: 'Supplier name is required.' });
      return;
    }

    const data = getUserData(activeUser.email);

    if (supplier) { // Editing existing supplier
      const updatedCustomers = data.customers.map(c =>
        c.id === supplier.id ? { ...c, name, phone, address, picture } : c
      );
      saveUserData(activeUser.email, { ...data, customers: updatedCustomers });
      toast({ title: 'Supplier updated successfully!' });
    } else { // Adding new supplier
      const newSupplier: Customer = {
        id: new Date().toISOString(),
        name,
        phone,
        address,
        picture,
        dateAdded: new Date().toISOString(),
        isSupplier: true,
      };
      data.customers.push(newSupplier);
      saveUserData(activeUser.email, data);
      toast({ title: 'Supplier added successfully!' });
    }

    onSupplierSaved();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{supplier ? 'Edit Supplier' : 'Add New Supplier'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="supplier-name">Supplier Name</Label>
            <Input id="supplier-name" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="supplier-phone">Phone (Optional)</Label>
            <Input id="supplier-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="supplier-address">Address (Optional)</Label>
            <Textarea id="supplier-address" value={address} onChange={e => setAddress(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Supplier Photo (Optional)</Label>
            <div className="flex items-center gap-4">
              {picture ? (
                <div className="relative w-24 h-24">
                  <Image src={picture} alt="Supplier" layout="fill" className="rounded-md object-cover" />
                  <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full" onClick={() => setPicture(null)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="w-24 h-24 bg-muted rounded-md flex items-center justify-center">
                  <Camera className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              <div className="flex flex-col gap-2">
                <AlertDialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" type="button"><Camera className="mr-2" /> Take Picture</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Camera</AlertDialogTitle></AlertDialogHeader>
                    <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay playsInline muted />
                    <canvas ref={canvasRef} className="hidden" />
                    {hasCameraPermission === false && (
                      <Alert variant="destructive">
                        <AlertTitle>Camera Access Required</AlertTitle>
                        <AlertDescription>
                          Please allow camera access.
                        </AlertDescription>
                      </Alert>
                    )}
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleCapture} disabled={!hasCameraPermission}>Capture</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button variant="outline" type="button" onClick={() => fileInputRef.current?.click()}><Upload className="mr-2" /> Upload Photo</Button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button onClick={handleSave}>Save Supplier</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


const SupplierDetailsModal = ({
  supplier,
  transactions,
  isOpen,
  onClose,
  onPaymentAdded,
  onPurchaseUpdated,
  isPremium,
  allItems,
  billDesignSettings
}: {
  supplier: (Supplier & { purchaseHistory: Transaction[] }) | null;
  transactions: Transaction[];
  isOpen: boolean;
  onClose: () => void;
  onPaymentAdded: () => void;
  onPurchaseUpdated: () => void;
  isPremium: boolean;
  allItems: Item[];
  billDesignSettings: BillDesignSettings;
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const router = useRouter();
  const [showPayModal, setShowPayModal] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Transaction | null>(null);
  const [selectedPurchases, setSelectedPurchases] = useState<string[]>([]);
  const [viewImages, setViewImages] = useState<string[]>([]);

  const supplierAllTransactions = useMemo(() => {
    if (!supplier) return [];

    const allTxs = transactions.filter(tx => tx.customerId === supplier.id);

    const purchasesWithBillNumbers = allTxs
      .filter(tx => tx.type === 'purchase')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((tx, index) => ({ ...tx, billNumber: index + 1 }));

    const payments = allTxs.filter(tx => tx.type === 'debit');

    return [...purchasesWithBillNumbers, ...payments].sort((a, b) => {
      const dateA = new Date(a.modifiedAt || a.date).getTime();
      const dateB = new Date(b.modifiedAt || b.date).getTime();
      return dateB - dateA;
    });

  }, [transactions, supplier]);

  const paymentHistory = useMemo(() => supplierAllTransactions.filter(tx => tx.type === 'debit'), [supplierAllTransactions]);
  const purchaseHistory = useMemo(() => supplierAllTransactions.filter(tx => tx.type === 'purchase'), [supplierAllTransactions]);
  const totalPaid = useMemo(() => paymentHistory.reduce((acc, tx) => acc + tx.totalAmount, 0) + purchaseHistory.reduce((acc, tx) => acc + (tx.amountPaid || 0) + (tx.additionalPayments?.reduce((s, p) => s + p.amount, 0) || 0), 0), [paymentHistory, purchaseHistory]);
  const totalPurchaseValue = useMemo(() => purchaseHistory.reduce((acc, tx) => acc + tx.totalAmount, 0), [purchaseHistory]);

  const lastPaymentDate = useMemo(() => {
    if (!supplier) return 'N/A';
    const allPayments = [
      ...paymentHistory.map(tx => ({ date: tx.date, amount: tx.totalAmount })),
      ...purchaseHistory.flatMap(tx => [
        ...(tx.amountPaid > 0 ? [{ date: tx.date, amount: tx.amountPaid }] : []),
        ...(tx.additionalPayments?.map(p => ({ date: p.date, amount: p.amount })) || [])
      ])
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return allPayments.length > 0 ? new Date(allPayments[0].date).toLocaleDateString() : 'N/A';
  }, [paymentHistory, purchaseHistory, supplier]);

  if (!supplier) return null;

  const handleExport = async () => {
    if (!supplier) return;
    if (!isPremium) {
      toast({
        variant: 'destructive',
        title: t('premiumFeature'),
        description: t('pleaseUpgrade'),
      });
      router.push('/premium');
      return;
    }

    toast({ title: "Generating Khata...", description: "Preparing full statement PDF." });
    await generateFullKhataPDF(supplier, supplierAllTransactions, billDesignSettings);
  };


  const handleSavePayment = (amount: number, date: string, notes: string, image: string | null) => {
    const activeUser = getActiveUser();
    if (!activeUser || !supplier) return;


    const data = getUserData(activeUser.email);
    const supplierTransactions = data.transactions
      .filter(tx => tx.customerId === supplier.id && tx.type === 'purchase')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Fix: Find the LATEST purchase instead of the OLDEST
    const targetPurchase = supplierTransactions[supplierTransactions.length - 1];

    if (!targetPurchase) {
      toast({ variant: 'destructive', title: "No purchase found", description: "Cannot add payment without a purchase." });
      return;
    }

    const targetPurchaseIndex = data.transactions.findIndex(tx => tx.id === targetPurchase.id);

    const newPayment: Payment = {
      id: new Date().toISOString(),
      amount,
      date: new Date(date + 'T' + new Date().toTimeString().split(' ')[0]).toISOString(),
      notes: notes || null,
      image: image || null
    };

    if (targetPurchaseIndex > -1) {
      if (!data.transactions[targetPurchaseIndex].additionalPayments) {
        data.transactions[targetPurchaseIndex].additionalPayments = [];
      }
      data.transactions[targetPurchaseIndex].additionalPayments!.push(newPayment);
      data.transactions[targetPurchaseIndex].remainingBalance -= amount;
      data.transactions[targetPurchaseIndex].modifiedAt = new Date().toISOString();
    }

    saveUserData(activeUser.email, data);
    toast({ title: t('paymentSuccess') });
    onPaymentAdded();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  };

  const handleDeletePurchase = (txId: string) => {
    const activeUser = getActiveUser();
    if (!activeUser) return;
    const data = getUserData(activeUser.email);

    data.transactions = data.transactions.filter(t => t.id !== txId);
    saveUserData(activeUser.email, data);
    toast({ title: "Purchase deleted successfully. Stock was not affected." });
    onPurchaseUpdated();
  }

  const handleBulkDelete = () => {
    const activeUser = getActiveUser();
    if (!activeUser || selectedPurchases.length === 0) return;
    const data = getUserData(activeUser.email);

    // Filter out the selected bills without affecting stock
    data.transactions = data.transactions.filter(tx => !selectedPurchases.includes(tx.id));

    saveUserData(activeUser.email, data);
    toast({ title: `${selectedPurchases.length} purchase(s) deleted successfully. Stock was not affected.` });
    setSelectedPurchases([]);
    onPurchaseUpdated();
  };

  const handleSelectPurchase = (purchaseId: string) => {
    setSelectedPurchases(prev =>
      prev.includes(purchaseId)
        ? prev.filter(id => id !== purchaseId)
        : [...prev, purchaseId]
    );
  };

  const handleSelectAllPurchases = (checked: boolean) => {
    if (checked) {
      setSelectedPurchases(purchaseHistory.map(tx => tx.id));
    } else {
      setSelectedPurchases([]);
    }
  };

  const generateBillText = (bill: Transaction) => {
    const itemsText = (bill.items || [])
      .map(item => `${item.itemName} (${item.quantity} x ${item.unitPrice}) = ${(item.quantity * item.unitPrice).toLocaleString()}`)
      .join('\n');

    const totalPaid = (bill.amountPaid || 0) + (bill.additionalPayments?.reduce((sum, p) => sum + p.amount, 0) || 0);

    const paymentsText = [
      ...(bill.amountPaid > 0 ? [`- Initial: ${bill.amountPaid.toLocaleString()} on ${new Date(bill.date).toLocaleDateString()}`] : []),
      ...(bill.additionalPayments || []).map(p => `- ${p.amount.toLocaleString()} on ${new Date(p.date).toLocaleDateString()}${p.notes ? ` (${p.notes})` : ''}`)
    ].join('\n');

    return `
--- SUPPLIER BILL ---
Shop: ${billDesignSettings.shopName}
${billDesignSettings.contacts.map(c => `${c.label}: ${c.phone}`).join('\n')}

Purchase #: ${bill.billNumber}
Date: ${formatDateTime(bill.date)}
Supplier: ${bill.customerName}
--------------------
ITEMS:
${itemsText}
--------------------
Purchase Total: ${bill.totalAmount.toLocaleString()}
Previous Balance: ${(bill.previousBalance || 0).toLocaleString()}
Grand Total: ${(bill.grandTotal || bill.totalAmount + (bill.previousBalance || 0)).toLocaleString()}
--------------------
PAYMENTS:
${paymentsText}
Total Paid: ${totalPaid.toLocaleString()}
--------------------
Remaining Balance: ${bill.remainingBalance.toLocaleString()}
${bill.notes ? `\nNotes: ${bill.notes}` : ''}
--------------------
${billDesignSettings.footer}
        `.trim();
  };

  const handleShare = async (bills: Transaction[]) => {
    const combinedText = bills.map(generateBillText).join('\n\n====================\n\n');

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Purchase Details',
          text: combinedText,
        });
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          // Fallback to clipboard without triggering overlay console errors
          navigator.clipboard.writeText(combinedText);
          toast({ title: "Copied to clipboard!", description: "Share dialog was blocked or unavailable." });
        }
      }
    } else {
      navigator.clipboard.writeText(combinedText);
      toast({ title: "Copied to clipboard!" });
    }
  };

  const handleBulkShare = () => {
    const billsToShare = purchaseHistory.filter(tx => selectedPurchases.includes(tx.id));
    if (billsToShare.length > 0) {
      handleShare(billsToShare);
    }
  };

  const handleSharePdf = async (bills: Transaction[]) => {
    if (!supplier) return;
    window.dispatchEvent(new Event('show_popunder_ad'));


    // For single bills, use our new service
    if (bills.length === 1) {
      await generateSingleBillPDF(bills[0], supplier, billDesignSettings);
      return;
    }

    // For multiple bills
    toast({ title: "Generating PDF...", description: "Please wait while we prepare your bills." });
    for (const bill of bills) {
      await generateSingleBillPDF(bill, supplier, billDesignSettings);
    }
  };

  const handleBulkPdfShare = () => {
    const billsToShare = purchaseHistory.filter(tx => selectedPurchases.includes(tx.id));
    if (billsToShare.length > 0) {
      handleSharePdf(billsToShare);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-lg h-[90vh] flex flex-col">
          <DialogHeader>
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle>{supplier.name}</DialogTitle>
                <DialogDescription className="flex items-center gap-2 pt-1">
                  <Phone className="h-4 w-4" /> {supplier.phone}
                </DialogDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all-purchases"
                  onCheckedChange={(checkedState: boolean | 'indeterminate') => {
                    const isChecked = !!checkedState;
                    handleSelectAllPurchases(isChecked);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  checked={purchaseHistory.length > 0 && selectedPurchases.length === purchaseHistory.length}
                  disabled={purchaseHistory.length === 0}
                />
                <Label htmlFor="select-all-purchases" className="text-sm font-medium" onClick={(e) => e.stopPropagation()}>Select All</Label>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-6 pr-4 -mr-4">
            <Card className="shadow-md rounded-lg">
              <CardHeader><CardTitle className="text-lg">Payment Report</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-3">
                <div className="flex justify-between items-center"><span className="text-muted-foreground">Total Amount Purchased</span><span className="font-bold">{totalPurchaseValue.toLocaleString()}</span></div>
                <div className="flex justify-between items-center"><span className="text-muted-foreground">Total Amount Paid</span><span className="font-bold text-green-600">{totalPaid.toLocaleString()}</span></div>
                <div className="flex justify-between items-center font-bold text-base border-t pt-2"><span className="text-muted-foreground">Remaining Balance</span><span className={supplier.balance > 0 ? 'text-red-600' : 'text-green-600'}>{Math.abs(supplier.balance).toLocaleString()}</span></div>
                <div className="flex justify-between items-center text-xs text-muted-foreground"><span >Last Payment Date</span><span >{lastPaymentDate}</span></div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h3 className="text-md font-semibold">Transaction History</h3>
              {supplierAllTransactions.map(tx => (
                <Card key={tx.id} className={selectedPurchases.includes(tx.id) ? 'border-primary' : ''}>
                  <CardHeader className="bg-muted/50 p-3 rounded-t-lg">
                    <div className="flex justify-between items-center text-sm font-semibold">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`purchase-${tx.id}`}
                          checked={selectedPurchases.includes(tx.id)}
                          onCheckedChange={(checkedState) => {
                            const isChecked = !!checkedState;
                            handleSelectPurchase(tx.id)
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <label htmlFor={`purchase-${tx.id}`} className="flex items-center gap-2 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                          <span>Purchase #{tx.billNumber || tx.id.slice(-4)}</span>
                          {tx.isEdited && <Badge variant="secondary" className="text-xs">Edited</Badge>}
                        </label>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>{formatDateTime(tx.date)}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-600" onClick={(e) => { e.stopPropagation(); handleSharePdf([tx]); }}>
                          <FileDown className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => e.stopPropagation()}><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onSelect={() => setEditingPurchase(tx)}><Edit className="mr-2 h-4 w-4" /> Edit Purchase</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleShare([tx])}><Share2 className="mr-2 h-4 w-4" /> Share (Text)</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleSharePdf([tx])}><FileDown className="mr-2 h-4 w-4" /> Download Bill (PDF)</DropdownMenuItem>
                            <AlertDialog>
                              <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10 focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete Purchase</DropdownMenuItem></AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this purchase record. This action does not change item stock and cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeletePurchase(tx.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3 text-sm">
                    <BillRenderer
                      bill={tx}
                      settings={billDesignSettings}
                      onViewImage={(img) => setViewImages([img])}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>

          </div>
          {selectedPurchases.length > 0 && (
            <div className="border-t pt-4 grid grid-cols-3 gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete ({selectedPurchases.length})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the {selectedPurchases.length} selected purchases. This action does not change item stock and cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive hover:bg-destructive/90">
                      Delete Purchases
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button variant="secondary" className="w-full" onClick={handleBulkShare}>
                <Share2 className="mr-2 h-4 w-4" /> Share ({selectedPurchases.length})
              </Button>
              <Button variant="secondary" className="w-full" onClick={handleBulkPdfShare}>
                <FileDown className="mr-2 h-4 w-4" /> Share PDF ({selectedPurchases.length})
              </Button>
            </div>
          )}
          <DialogFooter className="border-t pt-4 flex-col gap-2">
            <div className="flex gap-2 mt-2">
              <Button variant="outline" className="w-full" onClick={onClose}>{t('cancel')}</Button>
              <Button className="w-full" onClick={() => setShowPayModal(true)}>
                <CreditCard className="mr-2 h-4 w-4" />{t('addPayment')}
              </Button>
            </div>
            <Button onClick={handleExport} disabled={!isPremium} variant="secondary" size="sm">
              {isPremium ? <FileDown className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />} Download Report (PDF)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden elements for PDF generation */}
      <div className="hidden">
        {purchaseHistory.map(tx => (
          <div key={`pdf-${tx.id}`} id={`bill-preview-${tx.id}`}>
            <BillRenderer bill={tx} settings={billDesignSettings} />
          </div>
        ))}
      </div>

      {/* View Image Dialog */}
      <Dialog open={viewImages.length > 0} onOpenChange={() => setViewImages([])}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden bg-black border-none">
          <DialogHeader className="sr-only">
            <DialogTitle>View Attachments</DialogTitle>
          </DialogHeader>
          <div className="relative w-full h-[80vh] flex flex-col items-center justify-center p-4">
            <div className="flex-1 w-full flex items-center justify-center overflow-auto gap-4 snap-x">
              {viewImages.map((img, i) => (
                <div key={i} className="min-w-full h-full flex flex-col items-center justify-center snap-center relative">
                  <img src={img} className="max-w-full max-h-[70vh] object-contain" alt={`Attachment ${i + 1}`} />
                  <p className="text-white mt-2 font-semibold">Photo #{i + 1}</p>
                </div>
              ))}
            </div>
            <Button
              onClick={() => setViewImages([])}
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 rounded-full h-8 w-8 z-10 bg-white/20 hover:bg-white/40 text-white"
            >
              <X className="h-5 w-5" />
            </Button>
            {viewImages.length > 1 && (
              <p className="text-white/60 text-xs mt-2 text-center">Scroll to see all {viewImages.length} photos</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {supplier && (
        <PaySupplierModal
          isOpen={showPayModal}
          onClose={() => setShowPayModal(false)}
          onSave={handleSavePayment}
          supplierName={supplier.name}
        />
      )}
      <EditPurchaseModal
        isOpen={!!editingPurchase}
        onClose={() => setEditingPurchase(null)}
        purchase={editingPurchase}
        allItems={allItems}
        onPurchaseUpdated={() => {
          onPurchaseUpdated();
          setEditingPurchase(null);
        }}
      />
    </>
  );
};


export default function SuppliersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [activeUser, setActiveUser] = useState<AppUser | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [viewMode, setViewMode] = useState<'user' | 'customer'>('user');
  const [isPremium, setIsPremium] = useState(false);
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Customer | null>(null);
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [billDesignSettings, setBillDesignSettings] = useState<BillDesignSettings | null>(null);

  const [selectedSupplierForDetails, setSelectedSupplierForDetails] = useState<(Supplier & { purchaseHistory: Transaction[] }) | null>(null);


  const loadData = useCallback(() => {
    const user = getActiveUser();
    if (user) {
      setActiveUser(user);
      const data = getUserData(user.email);
      setItems(data.items);
      setCustomers(data.customers);
      setTransactions(data.transactions);
      setIsPremium(getIsPremium());
      setBillDesignSettings(data.settings.billDesign);
    } else {
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    loadData();
    setViewMode(getViewMode());

    // Listen for data updates (from SQLite load or Firestore sync)
    window.addEventListener('cashbookpro_data_updated', loadData);
    window.addEventListener('storage', loadData);

    return () => {
      window.removeEventListener('cashbookpro_data_updated', loadData);
      window.removeEventListener('storage', loadData);
    };
  }, [loadData]);

  const suppliers = useMemo((): Supplier[] => {
    if (viewMode !== 'user') return [];

    const supplierList = customers.filter(c => c.isSupplier);

    return supplierList.map(supplier => {
      const supplierTransactions = transactions
        .filter(tx => tx.customerId === supplier.id)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const finalBalance = supplierTransactions.reduce((balance, tx) => {
        if (tx.type === 'purchase') {
          return tx.remainingBalance;
        } else if (tx.type === 'debit') {
          return balance - tx.totalAmount;
        }
        return balance;
      }, 0);

      const totalPurchases = transactions.filter(tx => tx.customerId === supplier.id && tx.type === 'purchase').length;

      return {
        ...supplier,
        balance: finalBalance,
        totalPurchases: totalPurchases
      }
    }).sort((a, b) => a.name.localeCompare(b.name));

  }, [customers, transactions, viewMode]);

  const handleSupplierClick = (supplier: Supplier) => {
    const purchaseHistory = transactions
      .filter(tx => tx.customerId === supplier.id && tx.type === 'purchase')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    setSelectedSupplierForDetails({ ...supplier, purchaseHistory });
  };

  const handleDetailsClosed = () => {
    setSelectedSupplierForDetails(null);
    loadData(); // Refresh data when closing details modal
  };

  const handleEditSupplier = (e: React.MouseEvent, supplier: Customer) => {
    e.stopPropagation();
    setEditingSupplier(supplier);
    setShowAddEditModal(true);
  };

  const handleAddNewSupplier = () => {
    setEditingSupplier(null);
    setShowAddEditModal(true);
  };

  const handleDeleteSupplier = async (e: React.MouseEvent, supplierId: string) => {
    e.stopPropagation();
    const activeUser = getActiveUser();
    if (!activeUser) return;

    const data = getUserData(activeUser.email);
    // Important: Product stock is NOT adjusted
    data.customers = data.customers.filter(c => c.id !== supplierId);
    data.transactions = data.transactions.filter(tx => tx.customerId !== supplierId);

    await saveUserData(activeUser.email, data);
    toast({ title: "Supplier Deleted", description: "The supplier and their transaction history have been removed. Stock was not affected." });
    loadData();
  };

  if (viewMode !== 'user') {
    return (
      <div className="container mx-auto p-4 sm:p-6 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>{t('accessDenied')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{t('userViewOnly')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!billDesignSettings) return null;

  return (
    <>
      <div className="container mx-auto p-4 sm:p-6 md:p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">{t('suppliers')}</h2>
          <div className="flex gap-2">
            <Button onClick={handleAddNewSupplier}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Supplier
            </Button>
          </div>
        </div>

        {suppliers.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted bg-card p-12 text-center h-96">
            <Building className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t('noSuppliers')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {suppliers.map((supplier) => (
              <Card key={supplier.id} onClick={() => handleSupplierClick(supplier)} className="hover:bg-muted cursor-pointer transition-colors">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <div
                        className="relative w-12 h-12 rounded-full bg-muted flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={(e) => {
                          if (supplier.picture) {
                            e.stopPropagation();
                            setViewImage(supplier.picture);
                          }
                        }}
                      >
                        {supplier.picture ? (
                          <img src={supplier.picture} alt={supplier.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <Building className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="flex items-center gap-2 mb-1">
                          {supplier.name}
                        </CardTitle>
                        {supplier.phone && <p className="text-sm text-muted-foreground flex items-center gap-2"><Phone className="h-4 w-4" /> {supplier.phone}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={(e) => handleEditSupplier(e, supplier)}><Edit className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete {supplier.name} and all their associated purchase history. Product stock levels will NOT be changed. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={(e) => handleDeleteSupplier(e, supplier.id)} className="bg-destructive hover:bg-destructive/90">Delete Supplier</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  <div className="border-t mt-4 pt-4 flex justify-around items-center text-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Remaining Balance</p>
                      <p className={`font-bold text-lg ${supplier.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {Math.abs(supplier.balance).toLocaleString()}
                      </p>
                    </div>
                    <div className="border-l h-10"></div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Purchases</p>
                      <p className="font-bold text-lg">{supplier.totalPurchases}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <SupplierDetailsModal
        isOpen={!!selectedSupplierForDetails}
        onClose={handleDetailsClosed}
        supplier={selectedSupplierForDetails}
        transactions={transactions}
        onPaymentAdded={loadData}
        onPurchaseUpdated={loadData}
        isPremium={isPremium}
        allItems={items}
        billDesignSettings={billDesignSettings}
      />
      <AddEditSupplierModal
        isOpen={showAddEditModal}
        onClose={() => setShowAddEditModal(false)}
        supplier={editingSupplier}
        onSupplierSaved={loadData}
      />
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
    </>
  );
}
