'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { UserPlus, Search, User, Phone, Home, Calendar, CreditCard, X, Edit, Camera, Upload, Trash2, MoreVertical, Info, Plus, Package, Share2, FileDown, Lock } from 'lucide-react';
import { getActiveUser, getUserData, saveUserData, Customer, Transaction, SoldItem, Payment, User as AppUser, Item, BillDesignSettings } from '@/lib/data-layer';
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

    if (phone !== customer.phone && data.customers.some(c => c.phone === phone)) {
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
  const [products, setProducts] = useState<SoldItem[]>([]);
  const [originalProducts, setOriginalProducts] = useState<SoldItem[]>([]);
  const [additionalPayments, setAdditionalPayments] = useState<Payment[]>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (bill) {
      const billProducts = bill.items || [];
      setProducts(billProducts.map(p => ({ ...p }))); // Deep copy
      setOriginalProducts(billProducts.map(p => ({ ...p }))); // Deep copy
      setAdditionalPayments((bill.additionalPayments || []).map(p => ({ ...p })));
      setNotes(bill.notes || '');
    }
  }, [bill]);

  const handleProductChange = (index: number, field: keyof SoldItem, value: string | number) => {
    const updatedProducts = [...products];
    const product = { ...updatedProducts[index] };

    if (field === 'itemId') {
      const selectedItem = allItems.find(item => item.id === value);
      if (selectedItem) {
        product.itemId = selectedItem.id;
        product.itemName = selectedItem.itemName;
        product.unitPrice = selectedItem.sellingPrice;
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

  const handleAddNewPayment = () => {
    setAdditionalPayments(prev => [...prev, {
      id: new Date().toISOString(),
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      notes: ''
    }]);
  };

  const handleRemoveProduct = (index: number) => {
    setProducts(products.filter((_, i) => i !== index));
  };

  const handlePaymentChange = (index: number, field: keyof Payment, value: string | number) => {
    setAdditionalPayments(prev =>
      prev.map((payment, i) =>
        i === index ? { ...payment, [field]: value } : payment
      )
    );
  };

  const handleRemovePayment = (index: number) => {
    setAdditionalPayments(additionalPayments.filter((_, i) => i !== index));
  };

  const billTotal = useMemo(() => {
    return products.reduce((total, p) => total + (p.quantity || 0) * (p.unitPrice || 0), 0);
  }, [products]);

  if (!bill) return null;

  const grandTotal = (bill.previousBalance || 0) + billTotal;
  const totalAdditionalPayments = additionalPayments.reduce((sum: number, p: Payment) => sum + Number(p.amount), 0);
  const remainingAfterBill = grandTotal - (bill.amountPaid || 0) - totalAdditionalPayments;

  const handleSaveChanges = () => {
    const activeUser = getActiveUser();
    if (!activeUser || !bill) return;

    if (products.some(p => !p.itemName || p.quantity <= 0 || p.unitPrice < 0)) {
      toast({ variant: 'destructive', title: "Invalid Product Details", description: "Please ensure all products have a name, and quantity/price are positive." });
      return;
    }

    const data = getUserData(activeUser.email);

    // --- START: STOCK ADJUSTMENT LOGIC ---
    const stockUpdates = new Map<string, number>();

    // 1. Create a map of original quantities
    originalProducts.forEach(op => {
      stockUpdates.set(op.itemId, (stockUpdates.get(op.itemId) || 0) + op.quantity);
    });

    // 2. Subtract new quantities and check for stock availability
    for (const np of products) {
      const originalQtyInBill = originalProducts.find(op => op.itemId === np.itemId)?.quantity || 0;
      const currentItemInStock = data.items.find(i => i.id === np.itemId)?.quantity || 0;

      // Available stock for this edit is current stock + what was originally in the bill
      const availableStockForEdit = currentItemInStock + originalQtyInBill;

      if (np.quantity > availableStockForEdit) {
        toast({ variant: 'destructive', title: `Not enough stock for ${np.itemName}`, description: `Only ${availableStockForEdit} available.` });
        return;
      }
      // Calculate the difference to update stock later
      stockUpdates.set(np.itemId, (stockUpdates.get(np.itemId) || 0) - np.quantity);
    }

    // 3. Apply the calculated stock changes
    stockUpdates.forEach((quantityChange, itemId) => {
      const itemIndex = data.items.findIndex(i => i.id === itemId);
      if (itemIndex > -1) {
        data.items[itemIndex].quantity += quantityChange;
      }
    });
    // --- END: STOCK ADJUSTMENT LOGIC ---

    const newBillAdjustments = bill.billAdjustments || [];
    const previousGrandTotal = bill.grandTotal || 0;
    if (grandTotal !== previousGrandTotal) {
      newBillAdjustments.push({
        previousGrandTotal: previousGrandTotal,
        newGrandTotal: grandTotal,
        difference: grandTotal - previousGrandTotal,
        editedAt: new Date().toISOString()
      });
    }


    const updatedBill: Transaction = {
      ...bill,
      items: products,
      additionalPayments,
      notes,
      totalAmount: billTotal,
      remainingBalance: remainingAfterBill,
      isEdited: true,
      modifiedAt: new Date().toISOString(),
      grandTotal: grandTotal,
      billAdjustments: newBillAdjustments
    };

    const updatedTransactions = data.transactions.map(tx => tx.id === bill.id ? updatedBill : tx);

    // Save updated data
    saveUserData(activeUser.email, { ...data, items: data.items, transactions: updatedTransactions });

    toast({ title: "Bill updated successfully!" });
    onBillUpdated();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Bill #{bill?.billNumber || bill?.id.slice(-6)}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-4 p-1">
          <Card>
            <CardHeader><CardTitle>Products</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {products.map((product, index) => (
                <div key={index} className="grid grid-cols-[1fr_80px_100px_auto] gap-2 items-center">
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
                  <Input
                    type="number"
                    placeholder="Qty"
                    value={product.quantity}
                    onChange={(e) => handleProductChange(index, 'quantity', parseInt(e.target.value, 10))}
                  />
                  <Input
                    type="number"
                    placeholder="Price"
                    value={product.unitPrice}
                    onChange={(e) => handleProductChange(index, 'unitPrice', parseFloat(e.target.value))}
                  />
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveProduct(index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={handleAddProduct} className="mt-2">
                <Plus className="mr-2 h-4 w-4" /> Add Product
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Additional Payments</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {additionalPayments.map((payment, index) => (
                <div key={payment.id || index} className="grid grid-cols-1 gap-2 border p-2 rounded-md">
                  <div className="grid grid-cols-[1fr_120px] gap-2 items-center">
                    <Input
                      type="number"
                      placeholder="Amount"
                      value={Number(payment.amount) || ''}
                      onChange={(e) => handlePaymentChange(index, 'amount', parseFloat(e.target.value))}
                    />
                    <Input
                      type="date"
                      value={(payment.date || '').split('T')[0]}
                      onChange={(e) => handlePaymentChange(index, 'date', e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Textarea
                      placeholder="Notes for this payment"
                      value={payment.notes || ''}
                      onChange={(e) => handlePaymentChange(index, 'notes', e.target.value)}
                      className="flex-grow"
                      rows={1}
                    />
                    <Button variant="ghost" size="icon" onClick={() => handleRemovePayment(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              {additionalPayments.length === 0 && <p className="text-sm text-muted-foreground">No additional payments.</p>}
              <Button variant="outline" size="sm" onClick={handleAddNewPayment} className="mt-2">
                <Plus className="mr-2 h-4 w-4" /> Add Payment
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
            <CardContent>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Bill Total:</span> <span>{billTotal.toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Previous Balance:</span> <span>{(bill.previousBalance || 0).toLocaleString()}</span></div>
              <div className="flex justify-between font-bold"><span>Grand Total:</span> <span>{grandTotal.toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Paid at Bill Time:</span> <span>{(bill.amountPaid || 0).toLocaleString()}</span></div>
              <div className="flex justify-between">
                <span>Additional Payments:</span>
                <span>{totalAdditionalPayments.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-semibold text-base border-t pt-2">
                <span>Remaining Balance:</span>
                <span className={remainingAfterBill > 0 ? 'text-red-600' : 'text-green-600'}>{remainingAfterBill.toLocaleString()}</span>
              </div>
            </CardContent>
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
  const isPremium = useMemo(() => getIsPremium(), []);


  const saleTransactions = useMemo(() => {
    if (!customer) return [];

    // Get all transactions for this customer, sorted by date
    const customerTransactions = transactions
      .filter(tx => tx.customerId === customer.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Assign bill numbers to sales/credit transactions
    const salesWithBillNumbers = customerTransactions
      .filter(tx => tx.type !== 'debit')
      .map((tx, index) => ({ ...tx, billNumber: index + 1 }));

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
      ? new Date(Math.max(...paymentDates.map(d => d.getTime()))).toLocaleDateString()
      : 'N/A';

    return {
      totalSalesValue: totalSales,
      totalPaid: paid,
      lastPaymentDate: latestPayment,
      totalAdjustments: adjustments
    };
  }, [customer, transactions]);

  const editedBills = useMemo(() => {
    return transactions
      .filter(tx => tx.customerId === customer?.id && tx.billAdjustments && tx.billAdjustments.length > 0)
      .flatMap(tx => tx.billAdjustments!.map(adj => ({ ...adj, billNumber: tx.billNumber })))
      .sort((a, b) => new Date(b.editedAt).getTime() - new Date(a.editedAt).getTime());
  }, [transactions, customer]);

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

    const newPayment: Payment = {
      id: new Date().toISOString(),
      amount: amount,
      date: new Date(`${date}T${new Date().toTimeString().split(' ')[0]}`).toISOString(),
      notes: notes || null,
      image: image || null
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
    setEditingBill(tx);
  }

  const handleDeleteBill = (txId: string) => {
    const activeUser = getActiveUser();
    if (!activeUser) return;
    const data = getUserData(activeUser.email);

    data.transactions = data.transactions.filter(t => t.id !== txId);
    saveUserData(activeUser.email, data);
    toast({ title: "Bill deleted successfully." });
    onDataChange();
  }

  const handleBulkDelete = () => {
    const activeUser = getActiveUser();
    if (!activeUser || selectedBills.length === 0) return;
    const data = getUserData(activeUser.email);

    // Filter out the selected bills without affecting stock
    data.transactions = data.transactions.filter(tx => !selectedBills.includes(tx.id));

    saveUserData(activeUser.email, data);
    toast({ title: `${selectedBills.length} bill(s) deleted successfully. Stock was not affected.` });
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
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

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
    window.dispatchEvent(new Event('show_popunder_ad'));


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
    if (!isPremium) {
      toast({
        variant: 'destructive',
        title: "Premium Feature",
        description: "Full Khata download is only available for premium users. Please upgrade to continue.",
      });
      router.push('/premium');
      return;
    }

    toast({ title: "Generating Khata...", description: "Preparing full statement PDF." });
    await generateFullKhataPDF(customer, saleTransactions, billDesignSettings);
  };

  const handleBulkPdfShare = () => {
    const billsToShare = saleTransactions.filter(tx => selectedBills.includes(tx.id));
    if (billsToShare.length > 0) {
      handleSharePdf(billsToShare);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-lg h-[90vh] flex flex-col">
          <DialogHeader className="flex-row justify-between items-start">
            <div>
              <DialogTitle className="text-2xl">{customer.name}</DialogTitle>
              <CardDescription>{customer.phone}</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
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
              <Label htmlFor="select-all-bills" className="text-sm font-medium" onClick={(e) => e.stopPropagation()}>Select All</Label>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-4 -mr-4 space-y-4">
            <Card className="shadow-md rounded-lg">
              <CardHeader><CardTitle className="text-lg">Sales Report</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-3">
                <div className="flex justify-between items-center"><span className="text-muted-foreground">Adjusted Total Sales</span><span className="font-bold">{totalSalesValue.toLocaleString()}</span></div>
                <div className="flex justify-between items-center"><span className="text-muted-foreground">Total Amount Paid</span><span className="font-bold text-green-600">{totalPaid.toLocaleString()}</span></div>
                <div className="flex justify-between items-center font-bold text-base border-t pt-2"><span className="text-muted-foreground">Remaining Balance</span><span className={customer.balance > 0 ? 'text-red-600' : 'text-green-600'}>{customer.balance.toLocaleString()}</span></div>
                <div className="flex justify-between items-center text-xs text-muted-foreground"><span >Last Payment Date</span><span >{lastPaymentDate}</span></div>
              </CardContent>
            </Card>

            {editedBills.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Edit/Adjustment History</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  {editedBills.map((adj, index) => (
                    <div key={index} className="flex justify-between items-center text-xs">
                      <div>
                        <p>Bill #{adj.billNumber} edited on {formatDateTime(adj.editedAt)}</p>
                      </div>
                      <p className={`font-semibold ${adj.difference > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {adj.difference > 0 ? '+' : ''}{adj.difference.toLocaleString()}
                      </p>
                    </div>
                  ))}
                  <div className="flex justify-between items-center font-bold border-t pt-2 mt-2">
                    <span>Net Adjustment</span>
                    <span>{totalAdjustments.toLocaleString()}</span>
                  </div>
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
                        {tx.isEdited && <Badge variant="secondary" className="text-xs">Edited</Badge>}
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
                          <DropdownMenuItem onSelect={() => handleEditBill(tx)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit Bill
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleShare([tx])}>
                            <Share2 className="mr-2 h-4 w-4" /> Share (Text)
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleSharePdf([tx])}>
                            <FileDown className="mr-2 h-4 w-4" /> Download Bill (PDF)
                          </DropdownMenuItem>
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
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <BillRenderer
                    bill={tx}
                    settings={billDesignSettings}
                    runningBalance={index === 0 ? customer.balance : tx.remainingBalance}
                    onViewImage={(img) => setViewImages([img])}
                  />
                </CardContent>
              </Card>
            ))}

          </div>
          {selectedBills.length > 0 && (
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
          <DialogContent className="max-w-2xl">
            <Button
              onClick={() => setShowBillPreview(null)}
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 rounded-full h-8 w-8 z-10 bg-background/50 hover:bg-background"
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </Button>
            <DialogHeader>
              <DialogTitle>Bill Preview</DialogTitle>
            </DialogHeader>
            <div id={`bill-preview-${showBillPreview.id}`} className="p-4 border rounded-md">
              <BillRenderer bill={showBillPreview} settings={billDesignSettings} runningBalance={showBillPreview.remainingBalance} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBillPreview(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Hidden elements for PDF generation */}
      <div className="hidden">
        {saleTransactions.map(tx => (
          <div key={`pdf-${tx.id}`} id={`bill-preview-${tx.id}`}>
            <BillRenderer bill={tx} settings={billDesignSettings} runningBalance={tx.remainingBalance} />
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

  const customersWithBalance: CustomerWithBalance[] = useMemo(() => {
    return customers.map(customer => {
      const customerTransactions = transactions
        .filter(t => t.customerId === customer.id)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const finalBalance = customerTransactions.length > 0 ? customerTransactions[customerTransactions.length - 1].remainingBalance : 0;

      return { ...customer, balance: finalBalance };
    });
  }, [customers, transactions]);

  const filteredCustomers = customersWithBalance.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm)
  );

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

      {customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted bg-card p-12 text-center h-96">
          <User className="h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{t('noCustomers')}</p>
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
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredCustomers.length === 0 && searchTerm && (
            <p className="text-center text-muted-foreground">{t('noCustomersMatch')}</p>
          )}
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
