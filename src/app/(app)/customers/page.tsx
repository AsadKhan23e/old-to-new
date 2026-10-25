'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { UserPlus, Search, User, Phone, Home, Calendar, CreditCard, X, Edit, Camera, Upload, Trash2, MoreVertical, Info, Plus, Package, Share2, FileDown, Lock, MessageSquare, Eye, EyeOff, PlusCircle } from 'lucide-react';
import { getActiveUser, getUserData, saveUserData, Customer, Transaction, SoldItem, Payment, User as AppUser, Item, BillDesignSettings } from '@/lib/data-layer';
import { WhatsAppSelectModal } from '@/components/whatsapp-select-modal';
import { useTranslation } from '@/hooks/use-translation';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { BillRenderer } from '@/components/billing/BillRenderer';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { generateSingleBillPDF, generateFullKhataPDF } from '@/lib/pdf-service';
import { getIsPremium } from '@/lib/data-layer';
import { isStaffMember, getEmployeeSession } from '@/lib/employee-service';
import { formatAppDateTime, formatAppDate, getLocalDateString } from '@/lib/date-utils';

type CustomerWithBalance = Customer & { balance: number };

const AddPaymentModal = ({
  isOpen,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (amount: number, date: string, notes: string, image: string | null) => void;
}) => {
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getLocalDateString());
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
          <DialogTitle>{t('addPayment')}</DialogTitle>
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
            <Label htmlFor="payment-notes">{t('notesLabel')} ({t('optional')})</Label>
            <Textarea
              id="payment-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Attach Proof/Photo ({t('optional')})</Label>
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
          <DialogClose asChild>
            <Button variant="outline">{t('cancel')}</Button>
          </DialogClose>
          <Button onClick={handleSave}>{t('savePayment')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const EditCustomerModal = ({
  isOpen,
  onClose,
  customer,
  onCustomerUpdated
}: {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onCustomerUpdated: () => void;
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
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

  useEffect(() => {
    if (customer) {
      setName(customer.name);
      setPhone(customer.phone);
      setAddress(customer.address || '');
      setNotes(customer.notes || '');
      setPicture(customer.picture || null);
    }
  }, [customer]);

  useEffect(() => {
    if (isCameraOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCameraOpen]);

  if (!customer) return null;

  const handleUpdate = () => {
    const activeUser = getActiveUser();
    if (!activeUser) return;
    if (!name || !phone) {
      toast({ variant: 'destructive', title: t('requiredError') });
      return;
    }

    const data = getUserData(activeUser.email);

    // Allow "00" as phone - multiple walk-in contacts can use 00
    if (phone !== '00' && phone !== customer.phone && data.customers.some(c => c.phone === phone)) {
      toast({ variant: 'destructive', title: t('phoneExistsError') });
      return;
    }

    const updatedCustomers = data.customers.map(c => {
      if (c.id === customer.id) {
        return { ...c, name, phone, address, notes, picture: picture || undefined };
      }
      return c;
    });

    saveUserData(activeUser.email, { ...data, customers: updatedCustomers });
    toast({ title: "Customer updated successfully!" });
    onCustomerUpdated();
    onClose();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new (window as any).Image();
        img.src = reader.result as string;
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
          setPicture(compressed);
        };
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit Customer</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor="edit-name">{t('nameLabel')}</Label>
            <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-phone">{t('phoneLabel')}</Label>
            <Input id="edit-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-address">{t('addressLabel')}</Label>
            <Textarea id="edit-address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t('pictureLabel')}</Label>
            <div className="flex items-center gap-4">
              {picture ? (
                <div className="relative w-24 h-24">
                  <Image src={picture} alt="Customer" layout="fill" className="rounded-md object-cover" />
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
                    <Button variant="outline"><Camera className="mr-2" /> {t('takePicture')}</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Camera</AlertDialogTitle></AlertDialogHeader>
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
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}><Upload className="mr-2" /> {t('uploadPicture')}</Button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-notes">{t('notesLabel')}</Label>
            <Textarea id="edit-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">{t('cancel')}</Button></DialogClose>
          <Button onClick={handleUpdate}>Update Customer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type EditBillProduct = SoldItem & {
  isCustom?: boolean;
};

const EditBillModal = ({
  isOpen,
  onClose,
  bill,
  allItems,
  onBillUpdated
}: {
  isOpen: boolean;
  onClose: () => void;
  bill: Transaction | null;
  allItems: Item[];
  onBillUpdated: () => void;
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [products, setProducts] = useState<EditBillProduct[]>([]);
  const [originalProducts, setOriginalProducts] = useState<SoldItem[]>([]);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [additionalPayments, setAdditionalPayments] = useState<Payment[]>([]);
  const [showEditedBadge, setShowEditedBadge] = useState<boolean>(true);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (bill) {
      const billProducts = bill.items || [];
      const initialProducts: EditBillProduct[] = billProducts.map(p => {
        const itemExists = allItems.some(i => i.id === p.itemId);
        return {
          ...p,
          isCustom: !itemExists && (!p.itemId || p.itemId.startsWith('custom_')),
        };
      });
      setProducts(initialProducts);
      setOriginalProducts(billProducts.map(p => ({ ...p })));
      setAmountPaid(bill.amountPaid || 0);
      setAdditionalPayments((bill.additionalPayments || []).map(p => ({ ...p })));
      setShowEditedBadge(bill.hideEditedBadge !== true);
      setNotes(bill.notes || '');
    }
  }, [bill, allItems]);

  const handleProductChange = (index: number, field: keyof EditBillProduct, value: any) => {
    const updatedProducts = [...products];
    const product = { ...updatedProducts[index] };

    if (field === 'itemId') {
      const selectedItem = allItems.find(item => item.id === value);
      if (selectedItem) {
        product.itemId = selectedItem.id;
        product.itemName = selectedItem.itemName;
        product.unitPrice = selectedItem.sellingPrice;
        product.isCustom = false;
      }
    } else {
      (product as any)[field] = value;
    }

    updatedProducts[index] = product;
    setProducts(updatedProducts);
  };

  const handleProductModeChange = (index: number, isCustom: boolean) => {
    const updatedProducts = [...products];
    const product = { ...updatedProducts[index] };
    product.isCustom = isCustom;
    if (isCustom) {
      product.itemId = `custom_${Date.now()}_${index}`;
    } else {
      product.itemId = '';
    }
    updatedProducts[index] = product;
    setProducts(updatedProducts);
  };

  const handleAddInventoryProduct = () => {
    setProducts(prev => [
      ...prev,
      {
        itemId: '',
        itemName: '',
        quantity: 1,
        unitPrice: 0,
        isCustom: false,
      }
    ]);
  };

  const handleAddCustomProduct = () => {
    setProducts(prev => [
      ...prev,
      {
        itemId: `custom_${Date.now()}_${prev.length}`,
        itemName: '',
        quantity: 1,
        unitPrice: 0,
        isCustom: true,
      }
    ]);
  };

  const handleRemoveProduct = (index: number) => {
    setProducts(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddNewPayment = () => {
    setAdditionalPayments(prev => [
      ...prev,
      {
        id: `pay_${Date.now()}_${prev.length}`,
        amount: 0,
        date: getLocalDateString(),
        notes: ''
      }
    ]);
  };

  const handlePaymentChange = (index: number, field: keyof Payment, value: any) => {
    setAdditionalPayments(prev =>
      prev.map((payment, i) =>
        i === index ? { ...payment, [field]: value } : payment
      )
    );
  };

  const handleRemovePayment = (index: number) => {
    setAdditionalPayments(prev => prev.filter((_, i) => i !== index));
  };

  const billTotal = useMemo(() => {
    return products.reduce((total, p) => total + (Number(p.quantity) || 0) * (Number(p.unitPrice) || 0), 0);
  }, [products]);

  if (!bill) return null;

  const grandTotal = (bill.previousBalance || 0) + billTotal;
  const totalAdditionalPayments = additionalPayments.reduce((sum: number, p: Payment) => sum + (Number(p.amount) || 0), 0);
  const totalPaid = (Number(amountPaid) || 0) + totalAdditionalPayments;
  const remainingAfterBill = grandTotal - totalPaid;

  const handleSaveChanges = () => {
    const activeUser = getActiveUser();
    if (!activeUser || !bill) return;

    if (products.length === 0) {
      toast({ variant: 'destructive', title: "Koyi product shamil nahi hai." });
      return;
    }

    if (products.some(p => !p.itemName || !p.itemName.trim() || (Number(p.quantity) || 0) <= 0 || (Number(p.unitPrice) || 0) < 0)) {
      toast({
        variant: 'destructive',
        title: "Invalid Product Details",
        description: "Barahe karam har item ka naam, tadaad aur qeemat darj karein."
      });
      return;
    }

    const data = getUserData(activeUser.email);

    // --- START: STOCK ADJUSTMENT LOGIC ---
    // Only inventory items (not custom items) adjust stock and check stock
    const stockUpdates = new Map<string, number>();

    // 1. Add back original inventory quantities to stock
    originalProducts.forEach(op => {
      if (op.itemId && !op.itemId.startsWith('custom_') && data.items.some(i => i.id === op.itemId)) {
        stockUpdates.set(op.itemId, (stockUpdates.get(op.itemId) || 0) + (Number(op.quantity) || 0));
      }
    });

    // 2. Subtract new quantities for inventory items; custom items skip stock check
    const cleanedProducts: SoldItem[] = [];

    for (let idx = 0; idx < products.length; idx++) {
      const np = products[idx];
      const trimmedName = np.itemName.trim();
      const isCustom = np.isCustom || !np.itemId || np.itemId.startsWith('custom_') || !data.items.some(i => i.id === np.itemId);

      let resolvedItemId = np.itemId;

      if (isCustom) {
        if (!resolvedItemId || !resolvedItemId.startsWith('custom_')) {
          resolvedItemId = `custom_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`;
        }
      } else {
        const originalQtyInBill = originalProducts.find(op => op.itemId === resolvedItemId)?.quantity || 0;
        const currentItemInStock = data.items.find(i => i.id === resolvedItemId)?.quantity || 0;
        const availableStockForEdit = currentItemInStock + originalQtyInBill;

        if ((Number(np.quantity) || 0) > availableStockForEdit) {
          toast({
            variant: 'destructive',
            title: `Not enough stock for ${np.itemName}`,
            description: `Only ${availableStockForEdit} available in stock. Agar stock me nahi hai to is item ko "Custom / Non-Stock Item" ke tor par add karein.`
          });
          return;
        }

        stockUpdates.set(resolvedItemId, (stockUpdates.get(resolvedItemId) || 0) - (Number(np.quantity) || 0));
      }

      cleanedProducts.push({
        itemId: resolvedItemId,
        itemName: trimmedName,
        quantity: Number(np.quantity) || 0,
        unitPrice: Number(np.unitPrice) || 0,
        notes: np.notes || null,
        picture: np.picture || null,
      });
    }

    // 3. Apply calculated stock changes to data.items
    stockUpdates.forEach((quantityChange, itemId) => {
      const itemIndex = data.items.findIndex(i => i.id === itemId);
      if (itemIndex > -1) {
        data.items[itemIndex].quantity = (data.items[itemIndex].quantity || 0) + quantityChange;
      }
    });
    // --- END: STOCK ADJUSTMENT LOGIC ---

    // Calculate exact item differences
    const changeLogs: string[] = [];
    const detailedChanges: { type: 'added' | 'removed' | 'modified'; itemName: string; description: string }[] = [];

    // 1. Added or modified items
    cleanedProducts.forEach(np => {
      const op = originalProducts.find(o =>
        (o.itemId && np.itemId && o.itemId === np.itemId) ||
        (o.itemName && np.itemName && o.itemName.toLowerCase().trim() === np.itemName.toLowerCase().trim())
      );
      if (!op) {
        const itemLineTotal = (Number(np.quantity) || 0) * (Number(np.unitPrice) || 0);
        const desc = `Qty: ${np.quantity} × Rs. ${(Number(np.unitPrice) || 0).toLocaleString()} = +Rs. ${itemLineTotal.toLocaleString()}`;
        changeLogs.push(`➕ شامل کیا (Added): ${np.itemName} (${desc})`);
        detailedChanges.push({ type: 'added', itemName: np.itemName, description: desc });
      } else {
        const opQty = Number(op.quantity) || 0;
        const npQty = Number(np.quantity) || 0;
        const opPrice = Number(op.unitPrice) || 0;
        const npPrice = Number(np.unitPrice) || 0;
        if (opQty !== npQty || opPrice !== npPrice) {
          const parts: string[] = [];
          if (opQty !== npQty) parts.push(`Qty ${opQty} → ${npQty}`);
          if (opPrice !== npPrice) parts.push(`Price Rs. ${opPrice.toLocaleString()} → Rs. ${npPrice.toLocaleString()}`);
          const desc = parts.join(', ');
          changeLogs.push(`🔄 تبدیل کیا (Modified): ${np.itemName} (${desc})`);
          detailedChanges.push({ type: 'modified', itemName: np.itemName, description: desc });
        }
      }
    });

    // 2. Removed items
    originalProducts.forEach(op => {
      const stillPresent = cleanedProducts.some(np =>
        (np.itemId && op.itemId && np.itemId === op.itemId) ||
        (np.itemName && op.itemName && np.itemName.toLowerCase().trim() === op.itemName.toLowerCase().trim())
      );
      if (!stillPresent) {
        const itemLineTotal = (Number(op.quantity) || 0) * (Number(op.unitPrice) || 0);
        const desc = `Qty: ${op.quantity} × Rs. ${(Number(op.unitPrice) || 0).toLocaleString()} = -Rs. ${itemLineTotal.toLocaleString()}`;
        changeLogs.push(`❌ حذف کیا (Removed): ${op.itemName} (${desc})`);
        detailedChanges.push({ type: 'removed', itemName: op.itemName, description: desc });
      }
    });

    const newBillAdjustments = bill.billAdjustments ? [...bill.billAdjustments] : [];
    const previousGrandTotal = bill.grandTotal || 0;
    if (grandTotal !== previousGrandTotal || changeLogs.length > 0) {
      newBillAdjustments.push({
        previousGrandTotal: previousGrandTotal,
        newGrandTotal: grandTotal,
        difference: grandTotal - previousGrandTotal,
        editedAt: new Date().toISOString(),
        itemsSummary: changeLogs.join('\n'),
        changes: detailedChanges,
      });
    }

    const updatedBill: Transaction = {
      ...bill,
      items: cleanedProducts,
      amountPaid: Number(amountPaid) || 0,
      additionalPayments,
      notes,
      totalAmount: billTotal,
      remainingBalance: remainingAfterBill,
      isEdited: true,
      hideEditedBadge: !showEditedBadge,
      modifiedAt: new Date().toISOString(),
      grandTotal: grandTotal,
      billAdjustments: newBillAdjustments
    };

    let updatedTransactions = data.transactions.map(tx => tx.id === bill.id ? updatedBill : tx);

    // Sync subsequent bills of this customer so their running balance chain remains unbroken
    const custSales = updatedTransactions
      .filter(tx => tx.customerId === bill.customerId && tx.type !== 'debit')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let running = 0;
    custSales.forEach((s, idx) => {
      const isTarget = s.id === bill.id;
      const targetObj = isTarget ? updatedBill : s;
      const prev = idx === 0 ? (targetObj.previousBalance || 0) : running;
      const grand = prev + targetObj.totalAmount;
      const paid = (targetObj.amountPaid || 0) + (targetObj.additionalPayments?.reduce((sum: number, p: Payment) => sum + Number(p.amount || 0), 0) || 0);
      const rem = grand - paid;
      running = rem;

      const mainIdx = updatedTransactions.findIndex(tx => tx.id === s.id);
      if (mainIdx > -1) {
        updatedTransactions[mainIdx] = {
          ...updatedTransactions[mainIdx],
          previousBalance: prev,
          grandTotal: grand,
          remainingBalance: rem
        };
      }
    });

    // Save updated data
    saveUserData(activeUser.email, { ...data, items: data.items, transactions: updatedTransactions });

    toast({ title: "Bill updated successfully!" });
    onBillUpdated();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Edit Bill #{bill?.billNumber || bill?.id.slice(-6)}</DialogTitle>
          <DialogDescription>
            Is bill me items select karein ya naye/custom items (jo stock me na hon) likhein, aur payment details edit karein.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Products Section */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Products / Items ({products.length})</CardTitle>
                <div className="text-xs text-muted-foreground">
                  Kul Rakam: <span className="font-bold text-primary">Rs. {billTotal.toLocaleString()}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {products.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
                  Koyi product add nahi hai. Niche diye gaye buttons se item shamil karein.
                </div>
              ) : (
                products.map((product, index) => (
                  <div key={index} className="p-3 rounded-lg border bg-card/60 space-y-2.5">
                    {/* Header: Mode selector tabs + Line Total + Delete */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="inline-flex items-center bg-muted/80 p-0.5 rounded-md text-xs">
                        <button
                          type="button"
                          onClick={() => handleProductModeChange(index, false)}
                          className={`px-2.5 py-1 rounded transition-colors text-xs ${!product.isCustom ? 'bg-background shadow-xs font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                          Select from Inventory
                        </button>
                        <button
                          type="button"
                          onClick={() => handleProductModeChange(index, true)}
                          className={`px-2.5 py-1 rounded transition-colors text-xs ${product.isCustom ? 'bg-primary text-primary-foreground font-semibold shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                          + Custom Item (No Stock)
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-primary">
                          Rs. {((Number(product.unitPrice) || 0) * (Number(product.quantity) || 0)).toLocaleString()}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveProduct(index)}
                          title="Remove Item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Product Selection or Text Input */}
                    {!product.isCustom ? (
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Select Product from Inventory</Label>
                        <Select
                          value={product.itemId}
                          onValueChange={(value) => {
                            if (value === '__CUSTOM__') {
                              handleProductModeChange(index, true);
                            } else {
                              handleProductChange(index, 'itemId', value);
                            }
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select Product" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__CUSTOM__" className="text-primary font-semibold">
                              ➕ [ + Custom / Non-Inventory Item Likhein ]
                            </SelectItem>
                            {allItems.map(item => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.itemName} (Stock: {item.quantity}) - Rs. {item.sellingPrice}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold text-primary">Item / Product Name (Jo Stock Me Na Ho)</Label>
                          <span className="text-[10px] text-muted-foreground">Non-inventory (Stock check nahi hoga)</span>
                        </div>
                        <Input
                          placeholder="e.g. Service charge, custom goods, repair..."
                          value={product.itemName}
                          onChange={(e) => handleProductChange(index, 'itemName', e.target.value)}
                          className="border-primary/40 focus:border-primary"
                        />
                      </div>
                    )}

                    {/* Quantities & Prices Grid */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <Label className="text-[11px] text-muted-foreground">Qty (Tadaad)</Label>
                        <Input
                          type="number"
                          min="1"
                          placeholder="Qty"
                          value={product.quantity || ''}
                          onChange={(e) => handleProductChange(index, 'quantity', parseInt(e.target.value, 10) || 0)}
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] text-muted-foreground">Sale Price (Qeemat)</Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="Price"
                          value={product.unitPrice || ''}
                          onChange={(e) => handleProductChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}

              {/* Action Buttons: Add Existing or Add Custom Product */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={handleAddInventoryProduct} className="w-full">
                  <Package className="mr-2 h-4 w-4" /> Select Inventory Product
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={handleAddCustomProduct} className="w-full border-primary/50 text-primary hover:bg-primary/10">
                  <PlusCircle className="mr-2 h-4 w-4" /> + Add Custom / Non-Stock Item
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Payments Card: Initial Paid + Additional Payments */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Payments / Adaigi</CardTitle>
                <div className="text-xs text-muted-foreground">
                  Kul Jama: <span className="font-bold text-green-600 dark:text-green-400">Rs. {totalPaid.toLocaleString()}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Initial Payment (Bill Bante Waqt Adaigi)</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={amountPaid || ''}
                  onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Additional Payments ({additionalPayments.length})</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddNewPayment}
                    className="h-7 text-xs"
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> + Add Payment
                  </Button>
                </div>

                {additionalPayments.map((payment, pIndex) => (
                  <div key={payment.id || pIndex} className="p-2.5 rounded-md border bg-muted/30 space-y-2">
                    <div className="grid grid-cols-[1fr_130px_auto] gap-2 items-center">
                      <Input
                        type="number"
                        min="0"
                        placeholder="Amount"
                        value={payment.amount || ''}
                        onChange={(e) => handlePaymentChange(pIndex, 'amount', parseFloat(e.target.value) || 0)}
                      />
                      <Input
                        type="date"
                        value={(payment.date || '').split('T')[0]}
                        onChange={(e) => handlePaymentChange(pIndex, 'date', e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemovePayment(pIndex)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <Textarea
                      placeholder="Payment note / wazaahat (optional)"
                      value={payment.notes || ''}
                      onChange={(e) => handlePaymentChange(pIndex, 'notes', e.target.value)}
                      className="text-xs"
                      rows={1}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Toggle "Edited / تبدیل شدہ" Badge */}
          <div className="flex items-center space-x-2 p-3 rounded-lg border bg-muted/40">
            <Checkbox
              id="bill-show-edited-badge"
              checked={showEditedBadge}
              onCheckedChange={(checked) => setShowEditedBadge(!!checked)}
            />
            <Label htmlFor="bill-show-edited-badge" className="text-xs font-medium cursor-pointer">
              Bill par &quot;Edited / تبدیل شدہ&quot; ka nishan dikhayein
            </Label>
          </div>

          {/* Notes Card */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Notes / Wazaahat (Optional)</CardTitle></CardHeader>
            <CardContent>
              <Textarea
                placeholder="Bill ke hawale se koyi note likhein..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </CardContent>
          </Card>

          {/* Summary Card */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Summary</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Bill Total:</span> <span>Rs. {billTotal.toLocaleString()}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Previous Balance:</span> <span>Rs. {(bill.previousBalance || 0).toLocaleString()}</span></div>
              <div className="flex justify-between font-bold border-t pt-1"><span>Grand Total:</span> <span>Rs. {grandTotal.toLocaleString()}</span></div>
              <div className="flex justify-between text-green-600 dark:text-green-400"><span>Paid at Bill Time:</span> <span>Rs. {(Number(amountPaid) || 0).toLocaleString()}</span></div>
              <div className="flex justify-between text-green-600 dark:text-green-400">
                <span>Additional Payments:</span>
                <span>Rs. {totalAdditionalPayments.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t pt-2">
                <span>Remaining Balance:</span>
                <span className={remainingAfterBill > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                  Rs. {remainingAfterBill.toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="pt-3 border-t mt-2 flex flex-row justify-end gap-2">
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button onClick={handleSaveChanges}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const CustomerDetailsModal = ({
  customer,
  transactions,
  isOpen,
  onClose,
  onPaymentAdded,
  onDataChange,
  allItems,
  billDesignSettings
}: {
  customer: CustomerWithBalance | null;
  transactions: Transaction[];
  isOpen: boolean;
  onClose: () => void;
  onPaymentAdded: () => void;
  onDataChange: () => void;
  allItems: Item[];
  billDesignSettings: BillDesignSettings;
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const router = useRouter();
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [editingBill, setEditingBill] = useState<Transaction | null>(null);
  const [selectedBills, setSelectedBills] = useState<string[]>([]);
  const [showBillPreview, setShowBillPreview] = useState<Transaction | null>(null);
  const [viewImages, setViewImages] = useState<string[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsAppMessage, setWhatsAppMessage] = useState('');
  const [whatsAppModalTitle, setWhatsAppModalTitle] = useState('Send Khata via WhatsApp');
  useEffect(() => {
    const checkPremium = () => setIsPremium(getIsPremium());
    checkPremium();
    window.addEventListener('cashbookpro_data_updated', checkPremium);
    return () => window.removeEventListener('cashbookpro_data_updated', checkPremium);
  }, []);


  const saleTransactions = useMemo(() => {
    if (!customer) return [];

    // Get all transactions for this customer, sorted by date
    const customerTransactions = transactions
      .filter(tx => tx.customerId === customer.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Assign bill numbers to sales/credit transactions
    const salesWithBillNumbers = customerTransactions
      .filter(tx => tx.type !== 'debit')
      .map((tx, index) => ({ ...tx, billNumber: tx.billNumber || (index + 1) }));

    // Combine with debit transactions and re-sort by date for display
    const allTxsForDisplay = [
      ...salesWithBillNumbers,
      ...customerTransactions.filter(tx => tx.type === 'debit')
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return allTxsForDisplay;

  }, [customer, transactions]);

  const { totalSalesValue, totalPaid, lastPaymentDate, totalAdjustments } = useMemo(() => {
    if (!customer) return { totalSalesValue: 0, totalPaid: 0, lastPaymentDate: 'N/A', totalAdjustments: 0 };

    let totalSales = 0;
    let paid = 0;
    let adjustments = 0;
    const paymentDates: Date[] = [];

    transactions.filter(tx => tx.customerId === customer.id).forEach(tx => {
      if (tx.type !== 'debit') { // Sales and Purchases
        totalSales += tx.totalAmount;

        if (tx.billAdjustments && tx.billAdjustments.length > 0) {
          adjustments += tx.billAdjustments.reduce((acc, adj) => acc + adj.difference, 0);
        }
      }

      if (tx.amountPaid > 0) {
        paid += tx.amountPaid;
        paymentDates.push(new Date(tx.date));
      }
      if (tx.additionalPayments) {
        tx.additionalPayments.forEach(p => {
          paid += p.amount;
          paymentDates.push(new Date(p.date));
        });
      }
      if (tx.type === 'debit') {
        paid += tx.totalAmount;
        paymentDates.push(new Date(tx.date));
      }
    });

    const latestPayment = paymentDates.length > 0
      ? formatAppDate(new Date(Math.max(...paymentDates.map(d => d.getTime()))))
      : 'N/A';

    return {
      totalSalesValue: totalSales,
      totalPaid: paid,
      lastPaymentDate: latestPayment,
      totalAdjustments: adjustments
    };
  }, [customer, transactions]);

  const customerAdjustments = useMemo(() => {
    if (!customer) return [];
    const list: Array<{
      billNumber: number | string;
      date: string;
      difference: number;
      label: string;
      editedAt: string;
      itemsSummary?: string | null;
      changes?: Array<{ type: 'added' | 'removed' | 'modified'; itemName: string; description: string }> | null;
    }> = [];

    transactions
      .filter(tx => tx.customerId === customer.id)
      .forEach(tx => {
        // If user hid the edited badge, hide it from adjustments history as requested
        if (tx.hideEditedBadge) return;

        if (tx.billAdjustments && tx.billAdjustments.length > 0) {
          tx.billAdjustments.forEach(adj => {
            let itemChanges = adj.changes;
            // Legacy fallback: detect added item if difference matches an item total
            if ((!itemChanges || itemChanges.length === 0) && !adj.itemsSummary && adj.difference > 0 && tx.items) {
              const match = tx.items.find(it => (it.quantity * it.unitPrice) === adj.difference);
              if (match) {
                itemChanges = [{
                  type: 'added',
                  itemName: match.itemName,
                  description: `Qty: ${match.quantity} × Rs. ${match.unitPrice.toLocaleString()} = +Rs. ${adj.difference.toLocaleString()}`
                }];
              }
            }

            list.push({
              billNumber: tx.billNumber || 'Ref',
              date: adj.editedAt,
              editedAt: adj.editedAt,
              difference: adj.difference,
              label: `Bill #${tx.billNumber || 'Ref'} edited (${adj.previousGrandTotal?.toLocaleString() || 0} → ${adj.newGrandTotal?.toLocaleString() || 0})`,
              itemsSummary: adj.itemsSummary,
              changes: itemChanges,
            });
          });
        } else if (tx.isEdited) {
          list.push({
            billNumber: tx.billNumber || 'Ref',
            date: tx.modifiedAt || tx.date,
            editedAt: tx.modifiedAt || tx.date,
            difference: 0,
            label: `Bill #${tx.billNumber || 'Ref'} modified / تبدیل شدہ`
          });
        }
      });

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, customer]);

  const editedBills = customerAdjustments;

  if (!customer) return null;


  const handleSavePayment = (amount: number, date: string, notes: string, image: string | null) => {
    const activeUser = getActiveUser();
    if (!activeUser || !customer) return;


    const data = getUserData(activeUser.email);
    const customerTransactions = data.transactions
      .filter(tx => tx.customerId === customer.id && tx.type !== 'debit')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Fix: Find the LATEST bill instead of the OLDEST ([0])
    const targetBill = customerTransactions[customerTransactions.length - 1];

    if (!targetBill) {
      toast({ variant: 'destructive', title: "No outstanding bill found", description: "A payment can only be applied to a customer with at least one sale." });
      return;
    }

    const empSession = getEmployeeSession();
    const newPayment: Payment = {
      id: new Date().toISOString(),
      amount: amount,
      date: new Date(`${date}T${new Date().toTimeString().split(' ')[0]}`).toISOString(),
      notes: notes || null,
      image: image || null,
      createdByName: empSession?.employeeName || null,
    };

    const targetBillIndex = data.transactions.findIndex(tx => tx.id === targetBill.id);

    if (targetBillIndex > -1) {
      if (!data.transactions[targetBillIndex].additionalPayments) {
        data.transactions[targetBillIndex].additionalPayments = [];
      }
      data.transactions[targetBillIndex].additionalPayments!.push(newPayment);
      data.transactions[targetBillIndex].remainingBalance -= amount;
      data.transactions[targetBillIndex].modifiedAt = new Date().toISOString();
    }

    saveUserData(activeUser.email, data);

    toast({ title: t('paymentSuccess') });
    onPaymentAdded();
  };

  const handleEditBill = (tx: Transaction) => {
    if (isStaffMember()) {
      toast({ variant: 'destructive', title: "Action Not Allowed", description: "Staff members cannot edit bills." });
      return;
    }
    setEditingBill(tx);
  }

  const handleDeleteBill = (txId: string) => {
    if (isStaffMember()) {
      toast({ variant: 'destructive', title: "Action Not Allowed", description: "Staff members cannot delete bills." });
      return;
    }
    const activeUser = getActiveUser();
    if (!activeUser) return;
    const data = getUserData(activeUser.email);

    const targetTx = data.transactions.find(t => t.id === txId);
    if (!targetTx) return;

    data.transactions = data.transactions.filter(t => t.id !== txId);

    // Resync remaining sales of this customer so their ledger chain remains continuous
    if (targetTx.customerId && targetTx.type !== 'debit') {
      const custSales = data.transactions
        .filter(t => t.customerId === targetTx.customerId && t.type !== 'debit')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      let running = 0;
      custSales.forEach((s, idx) => {
        const prev = idx === 0 ? (s.previousBalance || 0) : running;
        const grand = prev + s.totalAmount;
        const paid = (s.amountPaid || 0) + (s.additionalPayments?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0);
        const rem = grand - paid;
        running = rem;

        const mainIdx = data.transactions.findIndex(t => t.id === s.id);
        if (mainIdx > -1) {
          data.transactions[mainIdx] = {
            ...data.transactions[mainIdx],
            previousBalance: prev,
            grandTotal: grand,
            remainingBalance: rem
          };
        }
      });
    }

    saveUserData(activeUser.email, data);
    toast({ title: "Bill deleted successfully." });
    onDataChange();
  };

  const handleToggleEditedBadge = (txId: string) => {
    const activeUser = getActiveUser();
    if (!activeUser) return;
    const data = getUserData(activeUser.email);
    const tx = data.transactions.find(t => t.id === txId);
    if (tx) {
      tx.hideEditedBadge = !tx.hideEditedBadge;
      saveUserData(activeUser.email, data);
      toast({
        title: tx.hideEditedBadge ? "Badge Hidden / نشان چھپا دیا گیا" : "Badge Shown / نشان لگا دیا گیا",
      });
      onDataChange();
    }
  };

  const handleBulkDelete = () => {
    if (isStaffMember()) {
      toast({ variant: 'destructive', title: "Action Not Allowed", description: "Staff members cannot delete bills." });
      return;
    }
    const activeUser = getActiveUser();
    if (!activeUser || selectedBills.length === 0) return;
    const data = getUserData(activeUser.email);

    const affectedCustomerId = customer?.id;
    data.transactions = data.transactions.filter(tx => !selectedBills.includes(tx.id));

    // Resync remaining sales of this customer
    if (affectedCustomerId) {
      const custSales = data.transactions
        .filter(t => t.customerId === affectedCustomerId && t.type !== 'debit')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      let running = 0;
      custSales.forEach((s, idx) => {
        const prev = idx === 0 ? (s.previousBalance || 0) : running;
        const grand = prev + s.totalAmount;
        const paid = (s.amountPaid || 0) + (s.additionalPayments?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0);
        const rem = grand - paid;
        running = rem;

        const mainIdx = data.transactions.findIndex(t => t.id === s.id);
        if (mainIdx > -1) {
          data.transactions[mainIdx] = {
            ...data.transactions[mainIdx],
            previousBalance: prev,
            grandTotal: grand,
            remainingBalance: rem
          };
        }
      });
    }

    saveUserData(activeUser.email, data);
    toast({ title: `${selectedBills.length} bill(s) deleted successfully.` });
    setSelectedBills([]);
    onDataChange();
  };

  const handleSelectBill = (billId: string) => {
    setSelectedBills(prev =>
      prev.includes(billId)
        ? prev.filter(id => id !== billId)
        : [...prev, billId]
    );
  };

  const handleSelectAllBills = (checked: boolean) => {
    if (checked) {
      setSelectedBills(saleTransactions.map(tx => tx.id));
    } else {
      setSelectedBills([]);
    }
  };

  const formatDateTime = (dateString: string) => {
    return formatAppDateTime(dateString);
  }

  const generateBillText = (bill: Transaction) => {
    const itemsText = (bill.items || [])
      .map(item => `${item.itemName} (${item.quantity} x ${item.unitPrice}) = ${(item.quantity * item.unitPrice).toLocaleString()}`)
      .join('\n');

    const totalPaid = (bill.amountPaid || 0) + (bill.additionalPayments?.reduce((sum, p) => sum + p.amount, 0) || 0);

    const paymentsText = [
      ...(bill.amountPaid > 0 ? [`- Initial: ${bill.amountPaid.toLocaleString()} on ${formatAppDate(bill.date)}`] : []),
      ...(bill.additionalPayments || []).map(p => `- ${p.amount.toLocaleString()} on ${formatAppDate(p.date)}${p.notes ? ` (${p.notes})` : ''}`)
    ].join('\n');

    return `
--- CUSTOMER BILL ---
Shop: ${billDesignSettings.shopName}
${billDesignSettings.contacts.map(c => `${c.label}: ${c.phone}`).join('\n')}

Bill #: ${bill.billNumber}
Date: ${formatDateTime(bill.date)}
Customer: ${bill.customerName}
--------------------
ITEMS:
${itemsText}
--------------------
Bill Total: ${bill.totalAmount.toLocaleString()}
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
          title: 'Bill Details',
          text: combinedText,
        });
      } catch (error: any) {
        // If it's not a user-cancellation, attempt fallback to clipboard and notify
        if (error.name !== 'AbortError') {
          // Not logging error to console to prevent triggering Next.js error overlay
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
    const billsToShare = saleTransactions.filter(tx => selectedBills.includes(tx.id));
    if (billsToShare.length > 0) {
      handleShare(billsToShare);
    }
  };

  const handleSharePdf = async (bills: Transaction[]) => {
    if (!customer) return;
    window.dispatchEvent(new Event('show_interstitial_ad'));


    // For single bills, use our new service
    if (bills.length === 1) {
      await generateSingleBillPDF(bills[0], customer, billDesignSettings);
      return;
    }

    // For multiple bills
    toast({ title: "Generating PDF...", description: "Please wait while we prepare your bills." });
    for (const bill of bills) {
      await generateSingleBillPDF(bill, customer, billDesignSettings);
    }
  };

  const handleDownloadKhata = async () => {
    if (!customer) return;
    toast({ title: "Generating Khata...", description: "Preparing full statement PDF with all bills & adjustments." });
    await generateFullKhataPDF(customer, saleTransactions, billDesignSettings);
  };

  const handleBulkPdfShare = () => {
    const billsToShare = saleTransactions.filter(tx => selectedBills.includes(tx.id));
    if (billsToShare.length > 0) {
      handleSharePdf(billsToShare);
    }
  };

  const handleOpenKhataWhatsApp = () => {
    if (!customer) return;
    const shop = billDesignSettings.shopName || 'MyShopBook';
    
    // Bills sorted from newest to oldest
    const sortedSales = [...saleTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const maxBillsToShow = 10;
    const billsToShow = sortedSales.length <= maxBillsToShow
      ? [...sortedSales].reverse()
      : sortedSales.slice(-maxBillsToShow).reverse();

    const olderBillsCount = sortedSales.length > maxBillsToShow ? sortedSales.length - maxBillsToShow : 0;
    const olderBillsNote = olderBillsCount > 0 ? `\n• (+${olderBillsCount} مزید پرانے بلز - مکمل کھاتہ PDF میں دیکھیں)` : '';

    const recentBillsText = billsToShow.map(tx => {
      const editLabel = tx.isEdited ? ' (Edited / تبدیل شدہ)' : '';
      return `• Bill #${tx.billNumber}${editLabel}: Rs. ${tx.totalAmount.toLocaleString()} (Due: Rs. ${tx.remainingBalance.toLocaleString()}) - ${formatAppDate(tx.date)}`;
    }).join('\n') + olderBillsNote;

    const calculatedBalance = totalSalesValue - totalPaid;
    const balanceAdjustment = customer.balance - calculatedBalance;

    const adjustmentsList: string[] = [];
    sortedSales.forEach(tx => {
      if (tx.billAdjustments && tx.billAdjustments.length > 0) {
        tx.billAdjustments.forEach(adj => {
          adjustmentsList.push(`• Bill #${tx.billNumber}: ${adj.difference > 0 ? '+' : ''}Rs. ${adj.difference.toLocaleString()} (${formatAppDate(adj.editedAt)})`);
        });
      } else if (tx.isEdited) {
        adjustmentsList.push(`• Bill #${tx.billNumber}: تبدیل شدہ / Edited (${formatAppDate(tx.modifiedAt || tx.date)})`);
      }
    });

    const adjustmentBreakdownText = balanceAdjustment !== 0
      ? `*Khata Adjustment / رعایت:* ${balanceAdjustment > 0 ? '+' : ''}Rs. ${balanceAdjustment.toLocaleString()}\n`
      : '';

    const adjustmentsSection = adjustmentsList.length > 0
      ? `*Adjustments / ایڈجسٹمنٹس:*\n${adjustmentsList.slice(0, 4).join('\n')}\n━━━━━━━━━━━━━━━━━━━━\n`
      : '';

    const msg = `*${shop} - کھاتہ تفصیل (Khata Statement)*
━━━━━━━━━━━━━━━━━━━━
*Customer:* ${customer.name}
*Phone:* ${customer.phone}
*Date:* ${formatAppDate(new Date())}
━━━━━━━━━━━━━━━━━━━━
*Total Sales:* Rs. ${totalSalesValue.toLocaleString()}
*Total Paid:* Rs. ${totalPaid.toLocaleString()}
${adjustmentBreakdownText}*Remaining Balance:* Rs. ${customer.balance.toLocaleString()}
━━━━━━━━━━━━━━━━━━━━
${adjustmentsSection}${recentBillsText ? `*Recent Bills:*\n${recentBillsText}\n━━━━━━━━━━━━━━━━━━━━\n` : ''}براہ کرم بقایا رقم Rs. ${customer.balance.toLocaleString()} جلد از جلد ادا فرمائیں۔ شکریہ!
(${shop})`;

    setWhatsAppMessage(msg);
    setWhatsAppModalTitle("Send Full Khata / مکمل کھاتہ واٹس ایپ کریں");
    setShowWhatsAppModal(true);
  };

  const handleShareBillWhatsApp = (tx: Transaction) => {
    if (!customer) return;
    const billText = generateBillText(tx);
    setWhatsAppMessage(billText);
    setWhatsAppModalTitle(`Send Bill #${tx.billNumber} via WhatsApp`);
    setShowWhatsAppModal(true);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-lg h-[90vh] flex flex-col">
          <DialogHeader className="flex flex-col sm:flex-row justify-between items-start gap-2 border-b pb-3">
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                <span>{customer.name}</span>
                {customer.balance > 0 ? (
                  <Badge variant="destructive" className="text-xs">Rs. {customer.balance.toLocaleString()} Due</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">Paid</Badge>
                )}
              </DialogTitle>
              <CardDescription className="text-sm font-medium mt-0.5">{customer.phone}</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto justify-between sm:justify-end">
              <Button
                type="button"
                onClick={handleOpenKhataWhatsApp}
                className="bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold text-xs h-8 px-2.5 rounded-lg flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform"
                title="Send full Khata via WhatsApp"
              >
                <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                </svg>
                <span>WhatsApp Khata</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleDownloadKhata}
                className="h-8 px-2.5 rounded-lg flex items-center gap-1 border-blue-200 text-blue-600 hover:bg-blue-50 text-xs"
                title="Share full Khata as PDF"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Share PDF</span>
              </Button>
              <div className="flex items-center space-x-1.5 pl-2 border-l">
                <Checkbox
                  id="select-all-bills"
                  onCheckedChange={(checkedState: boolean | 'indeterminate') => {
                    const isChecked = !!checkedState;
                    handleSelectAllBills(isChecked);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  checked={saleTransactions.length > 0 && selectedBills.length === saleTransactions.length}
                  disabled={saleTransactions.length === 0}
                />
                <Label htmlFor="select-all-bills" className="text-xs font-medium cursor-pointer" onClick={(e) => e.stopPropagation()}>All</Label>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-4 -mr-4 space-y-4">
            <Card className="shadow-md rounded-lg">
              <CardHeader className="pb-2"><CardTitle className="text-lg">Sales Report</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-3">
                <div className="flex justify-between items-center"><span className="text-muted-foreground">Adjusted Total Sales</span><span className="font-bold">{totalSalesValue.toLocaleString()}</span></div>
                <div className="flex justify-between items-center"><span className="text-muted-foreground">Total Amount Paid</span><span className="font-bold text-green-600">{totalPaid.toLocaleString()}</span></div>
                {customer.balance !== (totalSalesValue - totalPaid) && (
                  <div className="flex justify-between items-center text-amber-700 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded">
                    <span>Khata Adjustments / رعایت</span>
                    <span className="font-bold">
                      {customer.balance - (totalSalesValue - totalPaid) > 0 ? '+' : ''}
                      {(customer.balance - (totalSalesValue - totalPaid)).toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center font-bold text-base border-t pt-2"><span className="text-muted-foreground">Remaining Balance</span><span className={customer.balance > 0 ? 'text-red-600' : 'text-green-600'}>{customer.balance.toLocaleString()}</span></div>
                <div className="flex justify-between items-center text-xs text-muted-foreground"><span>Last Payment Date</span><span>{lastPaymentDate}</span></div>
              </CardContent>
            </Card>

            {customerAdjustments.length > 0 && (
              <Card className="border-amber-200 bg-amber-50/20">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-amber-900 dark:text-amber-300">
                    <span>⚠️</span> Edit & Adjustment History / کھاتہ تبدیلیاں
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3 pt-0 text-sm space-y-2">
                  {customerAdjustments.map((adj, index) => (
                    <div key={index} className="flex flex-col text-xs py-1.5 border-b border-amber-100 dark:border-amber-900/30 last:border-none gap-1">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-800 dark:text-gray-200">{adj.label}</p>
                          <p className="text-[10px] text-muted-foreground">{formatDateTime(adj.date)}</p>
                        </div>
                        {adj.difference !== 0 && (
                          <p className={`font-bold ${adj.difference > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {adj.difference > 0 ? '+' : ''}{adj.difference.toLocaleString()}
                          </p>
                        )}
                      </div>
                      {adj.changes && adj.changes.length > 0 ? (
                        <div className="mt-0.5 pl-2 space-y-0.5 text-[11px] bg-amber-100/50 dark:bg-amber-900/20 p-1.5 rounded">
                          {adj.changes.map((ch, idx) => (
                            <div key={idx} className="flex flex-wrap items-center gap-1">
                              {ch.type === 'added' && <span className="text-green-700 dark:text-green-400 font-bold">➕ شامل کیا (Added):</span>}
                              {ch.type === 'removed' && <span className="text-red-700 dark:text-red-400 font-bold">❌ حذف کیا (Removed):</span>}
                              {ch.type === 'modified' && <span className="text-blue-700 dark:text-blue-400 font-bold">🔄 تبدیل کیا (Changed):</span>}
                              <span className="font-semibold text-gray-900 dark:text-gray-100">{ch.itemName}</span>
                              <span className="text-gray-600 dark:text-gray-400">({ch.description})</span>
                            </div>
                          ))}
                        </div>
                      ) : adj.itemsSummary ? (
                        <div className="mt-0.5 pl-2 text-[10px] text-muted-foreground whitespace-pre-line bg-amber-100/40 p-1 rounded font-medium">
                          {adj.itemsSummary}
                        </div>
                      ) : null}
                    </div>
                  ))}
                  {customer.balance !== (totalSalesValue - totalPaid) && (
                    <div className="flex justify-between items-center font-bold border-t border-amber-200 dark:border-amber-800 pt-2 mt-1 text-xs">
                      <span>Net Khata Difference</span>
                      <span className="text-amber-800 dark:text-amber-300 font-bold">
                        {customer.balance - (totalSalesValue - totalPaid) > 0 ? '+' : ''}
                        {(customer.balance - (totalSalesValue - totalPaid)).toLocaleString()}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {saleTransactions.map((tx, index) => (
              <Card key={tx.id} className={`shadow-md ${selectedBills.includes(tx.id) ? 'border-primary' : ''}`} onClick={() => setShowBillPreview(tx)}>
                <CardHeader className="bg-muted/50 p-3 rounded-t-lg">
                  <div className="flex justify-between items-center text-sm font-semibold">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`bill-${tx.id}`}
                        checked={selectedBills.includes(tx.id)}
                        onCheckedChange={(checkedState) => {
                          const isChecked = !!checkedState;
                          handleSelectBill(tx.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <label htmlFor={`bill-${tx.id}`} className="flex items-center gap-2 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                        <span>Bill #{tx.billNumber}</span>
                        {tx.isEdited && !tx.hideEditedBadge && <Badge variant="secondary" className="text-xs">Edited</Badge>}
                      </label>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>{formatDateTime(tx.date)}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-600" onClick={(e) => { e.stopPropagation(); handleSharePdf([tx]); }}>
                        <FileDown className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => e.stopPropagation()}><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          {!isStaffMember() && (
                            <DropdownMenuItem onSelect={() => handleEditBill(tx)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit Bill
                            </DropdownMenuItem>
                          )}
                          {tx.isEdited && (
                            <DropdownMenuItem onSelect={() => handleToggleEditedBadge(tx.id)}>
                              {tx.hideEditedBadge ? (
                                <>
                                  <Eye className="mr-2 h-4 w-4 text-primary" /> Show &quot;Edited&quot; Badge / نشان لگائیں
                                </>
                              ) : (
                                <>
                                  <EyeOff className="mr-2 h-4 w-4 text-muted-foreground" /> Hide &quot;Edited&quot; Badge / نشان ہٹائیں
                                </>
                              )}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onSelect={() => handleShareBillWhatsApp(tx)}>
                            <MessageSquare className="mr-2 h-4 w-4 text-green-600" /> Share (WhatsApp)
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleShare([tx])}>
                            <Share2 className="mr-2 h-4 w-4" /> Share (Text)
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleSharePdf([tx])}>
                            <FileDown className="mr-2 h-4 w-4 text-blue-600" /> Share (PDF)
                          </DropdownMenuItem>
                          {!isStaffMember() && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete Bill
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>This will permanently delete this bill. This action does not change item stock and cannot be undone.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteBill(tx.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <BillRenderer
                    bill={tx}
                    settings={billDesignSettings}
                    customer={customer}
                    runningBalance={index === 0 ? customer.balance : tx.remainingBalance}
                    onViewImage={(img) => setViewImages([img])}
                  />
                </CardContent>
              </Card>
            ))}

          </div>
          {!isStaffMember() && selectedBills.length > 0 && (
            <div className="border-t pt-4 grid grid-cols-3 gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete ({selectedBills.length})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the {selectedBills.length} selected bills. This action does not change item stock and cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive hover:bg-destructive/90">
                      Delete Bills
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button variant="secondary" className="w-full" onClick={handleBulkShare}>
                <Share2 className="mr-2 h-4 w-4" /> Share ({selectedBills.length})
              </Button>
              <Button variant="secondary" className="w-full" onClick={handleBulkPdfShare}>
                <FileDown className="mr-2 h-4 w-4" /> Share PDF ({selectedBills.length})
              </Button>
            </div>
          )}
          <DialogFooter className="border-t pt-4 flex-col gap-2">
            <div className="flex justify-between items-center font-bold text-2xl">
              <p>Total Remaining Balance</p>
              <p className={customer.balance > 0 ? 'text-red-600' : 'text-green-600'}>
                {customer.balance.toLocaleString()}
              </p>
            </div>
            <div className="flex flex-col gap-2 mt-2">
              <div className="flex gap-2">
                <Button variant="outline" className="w-full" onClick={onClose}>{t('cancel')}</Button>
                <Button className="w-full" onClick={() => setShowAddPayment(true)}>
                  <CreditCard className="mr-2" />{t('addPayment')}
                </Button>
              </div>
              <Button
                variant="secondary"
                className="w-full h-12 text-base shadow-sm"
                onClick={handleDownloadKhata}
              >
                {isPremium ? <FileDown className="mr-2 h-5 w-5 text-blue-600" /> : <Lock className="mr-2 h-5 w-5 text-muted-foreground" />}
                Download Full Khata (PDF)
              </Button>
            </div>
          </DialogFooter>

          {showWhatsAppModal && (
            <WhatsAppSelectModal
              isOpen={showWhatsAppModal}
              onClose={() => setShowWhatsAppModal(false)}
              customerName={customer.name}
              customerPhone={customer.phone}
              message={whatsAppMessage}
              title={whatsAppModalTitle}
            />
          )}
        </DialogContent>
      </Dialog>

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
              <p className="text-white/60 text-xs mt-2">Scroll to see all {viewImages.length} photos</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Bill Preview Modal for PDF Generation */}
      {showBillPreview && (
        <Dialog open={!!showBillPreview} onOpenChange={() => setShowBillPreview(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
            <Button
              onClick={() => setShowBillPreview(null)}
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 rounded-full h-8 w-8 z-[60] bg-background/50 hover:bg-background"
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </Button>
            <DialogHeader className="p-4 border-b shrink-0">
              <DialogTitle>Bill Preview</DialogTitle>
            </DialogHeader>
            <div id={`bill-preview-${showBillPreview.id}`} className="p-4 flex-1 overflow-y-auto">
              <div className="border rounded-md relative z-0">
                <BillRenderer bill={showBillPreview} settings={billDesignSettings} customer={customer} runningBalance={showBillPreview.remainingBalance} />
              </div>
            </div>
            <DialogFooter className="p-4 border-t shrink-0 flex flex-wrap items-center justify-between gap-2">
              {showBillPreview.isEdited && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleToggleEditedBadge(showBillPreview.id);
                    setShowBillPreview(prev => prev ? { ...prev, hideEditedBadge: !prev.hideEditedBadge } : null);
                  }}
                  className="text-xs flex items-center gap-1.5"
                >
                  {showBillPreview.hideEditedBadge ? (
                    <>
                      <Eye className="h-4 w-4 text-primary" /> Show &quot;Edited&quot; Badge / نشان لگائیں
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-4 w-4 text-muted-foreground" /> Hide &quot;Edited&quot; Badge / نشان ہٹائیں
                    </>
                  )}
                </Button>
              )}
              <Button variant="outline" onClick={() => setShowBillPreview(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Hidden elements for PDF generation */}
      <div className="hidden">
        {saleTransactions.map(tx => (
          <div key={`pdf-${tx.id}`} id={`bill-preview-${tx.id}`}>
            <BillRenderer bill={tx} settings={billDesignSettings} customer={customer} runningBalance={tx.remainingBalance} />
          </div>
        ))}
      </div>

      <AddPaymentModal
        isOpen={showAddPayment}
        onClose={() => setShowAddPayment(false)}
        onSave={handleSavePayment}
      />
      <EditBillModal
        isOpen={!!editingBill}
        onClose={() => setEditingBill(null)}
        bill={editingBill}
        allItems={allItems}
        onBillUpdated={onDataChange}
      />
    </>
  );
};


export default function CustomersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [activeUser, setActiveUser] = useState<AppUser | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithBalance | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [billDesignSettings, setBillDesignSettings] = useState<BillDesignSettings | null>(null);

  const loadData = useCallback(async () => {
    const user = getActiveUser();
    if (user) {
      const data = await getUserData(user.email);

      setCustomers(data.customers.filter(c => !c.isSupplier).sort((a: Customer, b: Customer) => a.name.localeCompare(b.name)));
      setTransactions(data.transactions);
      setItems(data.items);
      setActiveUser(user);
      setBillDesignSettings(data.settings.billDesign);

    } else {
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    loadData();

    // Listen for data updates (from SQLite load or Firestore sync)
    window.addEventListener('cashbookpro_data_updated', loadData);
    window.addEventListener('storage', loadData);

    return () => {
      window.removeEventListener('cashbookpro_data_updated', loadData);
      window.removeEventListener('storage', loadData);
    };
  }, [loadData]);

  const [activeTab, setActiveTab] = useState<'regular' | 'random'>('regular');

  const customersWithBalance: CustomerWithBalance[] = useMemo(() => {
    return customers.map(customer => {
      const customerTransactions = transactions
        .filter(t => t.customerId === customer.id)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const finalBalance = customerTransactions.length > 0 ? customerTransactions[customerTransactions.length - 1].remainingBalance : 0;

      return { ...customer, balance: finalBalance };
    });
  }, [customers, transactions]);

  const filteredCustomers = useMemo(() => {
    const cleanSearch = searchTerm.trim().toLowerCase();

    // Select customers according to active tab
    const baseCustomers = customersWithBalance.filter(c =>
      activeTab === 'random' ? c.phone === '00' : c.phone !== '00'
    );

    if (!cleanSearch) {
      return baseCustomers;
    }

    const scored = baseCustomers.map(customer => {
      let matchedByName = customer.name.toLowerCase().includes(cleanSearch);
      let matchedByPhone = customer.phone.includes(cleanSearch);
      let matchedByBillNumber = false;

      // Get transactions to check for bill number matches
      const customerTransactions = transactions
        .filter(t => t.customerId === customer.id)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Assign bill numbers to sales for match checking
      const salesWithBillNumbers = customerTransactions
        .filter(tx => tx.type !== 'debit')
        .map((tx, index) => ({ ...tx, billNumber: tx.billNumber || (index + 1) }));

      const foundTx = salesWithBillNumbers.find(tx => {
        return tx.billNumber.toString() === cleanSearch || tx.id.toLowerCase().includes(cleanSearch);
      });

      if (foundTx) {
        matchedByBillNumber = true;
      }

      let score = 0;
      if (matchedByBillNumber) score += 100;
      if (matchedByName) score += 10;
      if (matchedByPhone) score += 1;

      return { customer, score };
    });

    return scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.customer);
  }, [customersWithBalance, transactions, searchTerm, activeTab]);

  const handleCustomerUpdated = () => {
    loadData();
    if (selectedCustomer) {
      const user = getActiveUser();
      if (user) {
        const data = getUserData(user.email);
        const updatedCustomer = data.customers.find(c => c.id === selectedCustomer.id);
        if (updatedCustomer) {
          const customerTransactions = data.transactions
            .filter(t => t.customerId === updatedCustomer.id);

          const balance = customerTransactions.reduce((acc, tx) => tx.remainingBalance, 0);

          setSelectedCustomer({ ...updatedCustomer, balance });
        } else {
          setSelectedCustomer(null);
        }
      }
    }
  };


  const handleCustomerClick = (customer: CustomerWithBalance) => {
    setSelectedCustomer(customer);
  };

  const handleEditClick = (e: React.MouseEvent, customer: Customer) => {
    e.stopPropagation();
    setEditingCustomer(customer);
  };

  const handleDeleteCustomer = (e: React.MouseEvent, customerId: string) => {
    e.stopPropagation();
    if (isStaffMember()) {
      toast({ variant: 'destructive', title: "Action Not Allowed", description: "Staff members cannot delete customers." });
      return;
    }
    const activeUser = getActiveUser();
    if (!activeUser) return;

    const data = getUserData(activeUser.email);

    // Filter out the customer and their transactions
    data.customers = data.customers.filter(c => c.id !== customerId);
    data.transactions = data.transactions.filter(tx => tx.customerId !== customerId);

    saveUserData(activeUser.email, data);
    toast({ title: "Customer Deleted", description: "The customer and their transaction history have been removed. Item stock was not changed." });
    loadData(); // Reload data to update the UI
  };

  if (!billDesignSettings) return null;

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">{t('customers')}</h2>
        <Button onClick={() => router.push('/customers/new')}>
          <UserPlus className="mr-2 h-4 w-4" /> {t('addNewCustomer')}
        </Button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder={t('searchCustomersPlaceholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 w-full"
        />
      </div>

      <div className="flex border-b border-[#CFCAC0] dark:border-[#333333] mb-6">
        <button
          onClick={() => setActiveTab('regular')}
          className={`pb-2.5 px-4 text-sm font-bold transition-all relative ${activeTab === 'regular'
            ? 'text-[#6B7A50] border-b-2 border-[#6B7A50]'
            : 'text-muted-foreground hover:text-foreground border-b-2 border-transparent'
            }`}
        >
          {t('regularCustomers') || 'Regular Customers'}
        </button>
        <button
          onClick={() => setActiveTab('random')}
          className={`pb-2.5 px-4 text-sm font-bold transition-all relative ${activeTab === 'random'
            ? 'text-[#6B7A50] border-b-2 border-[#6B7A50]'
            : 'text-muted-foreground hover:text-foreground border-b-2 border-transparent'
            }`}
        >
          Random / Walk-in (00)
          {customersWithBalance.filter(c => c.phone === '00').length > 0 && (
            <span className="ml-2 bg-[#6B7A50]/15 text-[#6B7A50] text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {customersWithBalance.filter(c => c.phone === '00').length}
            </span>
          )}
        </button>
      </div>

      {filteredCustomers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted bg-card p-12 text-center h-96">
          <User className="h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {searchTerm
              ? t('noCustomersMatch')
              : (activeTab === 'random' ? 'No Random / Walk-in customers yet' : t('noCustomers'))}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCustomers.map((customer) => (
            <Card key={customer.id} onClick={() => handleCustomerClick(customer)} className="hover:bg-muted transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center justify-between space-x-4">
                <div className="flex items-center space-x-4 flex-1">
                  <div
                    className="relative w-12 h-12 rounded-full bg-muted flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={(e) => {
                      if (customer.picture) {
                        e.stopPropagation();
                        setViewImage(customer.picture);
                      }
                    }}
                  >
                    {customer.picture ? (
                      <Image
                        src={customer.picture}
                        alt={customer.name}
                        layout="fill"
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold">{customer.name}</p>
                    <p className="text-sm text-muted-foreground">{customer.phone}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">{t('balance')}</p>
                  <p className={`font-bold text-lg ${customer.balance > 0 ? 'text-red-600' : customer.balance < 0 ? 'text-green-600' : ''}`}>
                    {Math.abs(customer.balance).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center">
                  <Button variant="ghost" size="icon" onClick={(e) => handleEditClick(e, customer)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  {!isStaffMember() && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete {customer.name} and all their transactions. This action does not change item stock and cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={(e) => handleDeleteCustomer(e, customer.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CustomerDetailsModal
        isOpen={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        customer={selectedCustomer}
        transactions={transactions}
        onPaymentAdded={loadData}
        onDataChange={loadData}
        allItems={items}
        billDesignSettings={billDesignSettings}
      />
      <EditCustomerModal
        isOpen={!!editingCustomer}
        onClose={() => setEditingCustomer(null)}
        customer={editingCustomer}
        onCustomerUpdated={() => {
          loadData();
          setEditingCustomer(null);
        }}
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
    </div>
  );
}
