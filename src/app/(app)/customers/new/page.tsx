'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Camera, Trash2, Upload, BookUser } from 'lucide-react';
import Image from 'next/image';
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
import { getActiveUser, getUserData, saveUserData, User, Customer } from '@/lib/data-layer';
import { useTranslation } from '@/hooks/use-translation';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Capacitor } from '@capacitor/core';
import { pickContact } from '@/lib/contact-service';

export default function NewCustomerPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [picture, setPicture] = useState<string | null>(null);
  const [dateAdded, setDateAdded] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isNative] = useState(() => Capacitor.isNativePlatform());
  const [hasContactSupport] = useState(() => {
    if (typeof window === 'undefined') return false;
    return Capacitor.isNativePlatform() || ('contacts' in navigator && 'ContactsManager' in window);
  });
  const [isPickingContact, setIsPickingContact] = useState(false);

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
    const activeUser = getActiveUser();
    if (activeUser) {
      setUser(activeUser);
    } else {
      router.push('/login');
    }

    setDateAdded(new Date().toISOString().split('T')[0]);
  }, [router]);

  useEffect(() => {
    if (isCameraOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCameraOpen]);

  const handleSave = async () => {
    if (!name || !phone) {
      toast({ variant: 'destructive', title: t('requiredError') });
      return;
    }
    if (!user) return;

    const data = getUserData(user.email);

    const phoneExists = data.customers.some(c => c.phone === phone);
    if (phoneExists) {
      toast({ variant: 'destructive', title: t('phoneExistsError') });
      return;
    }

    const newCustomer: Customer = {
      id: new Date().toISOString(),
      name,
      phone,
      address,
      picture: picture || undefined,
      dateAdded,
      notes,
    };

    data.customers.push(newCustomer);
    await saveUserData(user.email, data);

    toast({ title: t('saveSuccess') });
    router.replace('/customers'); // Use replace to ensure fresh mounting
  };

  const handlePickContact = async () => {
    setIsPickingContact(true);
    try {
      const contact = await pickContact();
      if (contact) {
        setName(contact.name);
        setPhone(contact.phone);
        toast({ title: 'Contact selected', description: `${contact.name} - ${contact.phone}` });
      } else {
        toast({ variant: 'destructive', title: 'No contact selected or permission denied.' });
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not open contacts.' });
    } finally {
      setIsPickingContact(false);
    }
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
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t('addNewCustomer')}</span>
            {hasContactSupport && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePickContact}
                disabled={isPickingContact}
                className="flex items-center gap-2 text-primary border-primary/40"
              >
                <BookUser className="h-4 w-4" />
                {isPickingContact ? 'Opening...' : t('pickFromContacts')}
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">{t('nameLabel')}</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">{t('phoneLabel')}</Label>
            <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">{t('addressLabel')}</Label>
            <Textarea id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>{t('pictureLabel')}</Label>
            <div className="flex items-center gap-4">
              {picture ? (
                <div className="relative w-24 h-24">
                  <Image src={picture} alt="Customer" layout="fill" className="rounded-md object-cover" />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                    onClick={() => setPicture(null)}
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
                <AlertDialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
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
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*"
                />
              </div>
            </div>
          </div>


          <div className="space-y-2">
            <Label htmlFor="notes">{t('notesLabel')}</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date-added">{t('dateAdded')}</Label>
            <Input id="date-added" type="date" value={dateAdded} disabled />
          </div>

          <Button onClick={handleSave} className="w-full">
            {t('saveCustomer')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
