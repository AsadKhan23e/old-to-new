'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Camera, Upload, Building, Phone, MapPin, Star, X, Check } from 'lucide-react';
import { getActiveUser, getUserData, saveUserData, BillDesignSettings, BillDesignContact, AppData, getIsPremium, Transaction } from '@/lib/data-layer';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { BillRenderer } from '@/components/billing/BillRenderer';

const dummyBill: Transaction = {
    id: 'preview-123',
    customerId: 'preview-cust',
    customerName: 'John Doe',
    billNumber: 123,
    date: new Date().toISOString(),
    items: [
        { itemId: 'item-1', itemName: 'Sample Item 1', quantity: 2, unitPrice: 50 },
        { itemId: 'item-2', itemName: 'Sample Item 2', quantity: 1, unitPrice: 150 }
    ],
    totalAmount: 250,
    amountPaid: 0,
    remainingBalance: 250,
    paid: false,
    status: 'open'
};

const BillPreview = ({ settings }: { settings: BillDesignSettings }) => {
    return (
        <Card className="shadow-lg overflow-hidden">
            <div className="p-0 border rounded-md overflow-hidden bg-white">
                <BillRenderer
                    bill={dummyBill}
                    settings={settings}
                    customer={{ id: 'c', name: 'John Doe', phone: '03325518648', dateAdded: '' }}
                />
            </div>
        </Card>
    );
};


export default function BillDesignPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [userData, setUserData] = useState<AppData | null>(null);
    const [settings, setSettings] = useState<BillDesignSettings>({
        shopName: '',
        contacts: [],
        address: '',
        logo: '',
        template: 'classic',
        footer: '',
    });
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const activeUser = getActiveUser();
        if (activeUser) {
            const data = getUserData(activeUser.email);
            setUserData(data);
            setSettings(data.settings.billDesign);
        } else {
            router.push('/login');
        }
    }, [router]);

    const handleInputChange = (field: keyof BillDesignSettings, value: any) => {
        if (field === 'backgroundBanner' && value && value.startsWith('data:image')) {
            setSettings(prev => {
                const history = prev.recentBanners || [];
                // Only add if not already the first one
                if (history[0] !== value) {
                    const newHistory = [value, ...history.filter(v => v !== value)].slice(0, 5);
                    return { ...prev, [field]: value, recentBanners: newHistory };
                }
                return { ...prev, [field]: value };
            });
            return;
        }
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    const handleContactChange = (id: string, field: 'label' | 'phone', value: string) => {
        setSettings(prev => ({
            ...prev,
            contacts: prev.contacts.map(c => c.id === id ? { ...c, [field]: value } : c),
        }));
    };

    const addContact = () => {
        setSettings(prev => ({
            ...prev,
            contacts: [...prev.contacts, { id: new Date().toISOString(), label: '', phone: '' }],
        }));
    };

    const removeContact = (id: string) => {
        setSettings(prev => ({
            ...prev,
            contacts: prev.contacts.filter(c => c.id !== id),
        }));
    };

    const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const img = new (window as any).Image();
                img.src = reader.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_SIZE = 800;
                    let width = img.width;
                    let height = img.height;
                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    const compressed = canvas.toDataURL('image/jpeg', 0.6);
                    handleInputChange('logo', compressed);
                };
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = () => {
        const activeUser = getActiveUser();
        if (!activeUser || !userData) return;

        if (!settings.shopName || !settings.address || settings.contacts.some(c => !c.label || !c.phone)) {
            toast({ variant: 'destructive', title: 'Missing fields', description: 'Please fill all required fields to continue.' });
            return;
        }

        const updatedData = {
            ...userData,
            settings: {
                ...userData.settings,
                billDesign: settings,
            },
        };

        saveUserData(activeUser.email, updatedData);
        toast({ title: 'Success', description: 'Bill design saved successfully.' });
    };

    if (!userData) return null;

    return (
        <>
            <div className="container mx-auto p-4 sm:p-6 md:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Settings Form */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Bill Design Settings</CardTitle>
                                <CardDescription>Customize the look and feel of your printed and shared bills.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="shop-name">Shop Name</Label>
                                    <Input id="shop-name" value={settings.shopName} onChange={e => handleInputChange('shopName', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Shop Logo</Label>
                                    <div className="flex items-center gap-4">
                                        <div className="relative group">
                                            <Image
                                                src={settings.logo || '/placeholder.svg'}
                                                alt="Shop Logo"
                                                width={64}
                                                height={64}
                                                className="rounded-full bg-muted object-cover h-16 w-16"
                                                onError={(e) => { e.currentTarget.src = 'https://placehold.co/64x64?text=Logo'; }}
                                            />
                                            {settings.logo && (
                                                <button
                                                    onClick={() => handleInputChange('logo', '')}
                                                    className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            )}
                                        </div>
                                        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                                            <Upload className="mr-2 h-4 w-4" /> {settings.logo ? 'Change Logo' : 'Upload Logo'}
                                        </Button>
                                        <input type="file" ref={fileInputRef} onChange={handleLogoUpload} className="hidden" accept="image/*" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="shop-address">Shop Address</Label>
                                    <Textarea id="shop-address" value={settings.address} onChange={e => handleInputChange('address', e.target.value)} />
                                </div>
                                <div className="space-y-4">
                                    <Label>Shop Contacts</Label>
                                    {settings.contacts.map((contact) => (
                                        <div key={contact.id} className="flex items-center gap-2">
                                            <Input placeholder="Label (e.g., Sales)" value={contact.label} onChange={e => handleContactChange(contact.id, 'label', e.target.value)} />
                                            <Input placeholder="Phone Number" value={contact.phone} onChange={e => handleContactChange(contact.id, 'phone', e.target.value)} />
                                            <Button variant="ghost" size="icon" onClick={() => removeContact(contact.id)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button variant="outline" size="sm" onClick={addContact}>
                                        <PlusCircle className="mr-2 h-4 w-4" /> Add Contact
                                    </Button>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Label className="text-base font-bold">Background Banner</Label>
                                        {!getIsPremium() && <Badge variant="secondary" className="text-[10px]">PREMIUM</Badge>}
                                    </div>
                                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                        {/* Clear Option */}
                                        <div
                                            onClick={() => handleInputChange('backgroundBanner', '')}
                                            className={`h-12 border-2 rounded-lg flex items-center justify-center cursor-pointer ${!settings.backgroundBanner ? 'border-[#6B7A50] bg-[#6B7A50]/10' : 'border-muted'}`}
                                        >
                                            <X className="h-4 w-4" />
                                        </div>
                                        {/* Presets */}
                                        {[
                                            { id: 'solar', url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=400&q=80', label: 'Solar' },
                                            { id: 'modern', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=400&q=80', label: 'Office' },
                                            { id: 'nature', url: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=400&q=80', label: 'Nature' },
                                            { id: 'luxury', url: 'https://images.unsplash.com/photo-1550684848-fa1c68444c05?auto=format&fit=crop&w=400&q=80', label: 'Luxury' },
                                            { id: 'tech', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80', label: 'Tech' },
                                        ].map((banner) => (
                                            <div
                                                key={banner.id}
                                                onClick={() => {
                                                    if (!getIsPremium()) {
                                                        toast({ title: 'Premium Feature', description: 'Background banners are for premium users only.', variant: 'destructive' });
                                                        return;
                                                    }
                                                    handleInputChange('backgroundBanner', banner.url);
                                                }}
                                                className={`relative h-12 rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${settings.backgroundBanner === banner.url ? 'border-[#6B7A50] ring-2 ring-[#6B7A50]/20' : 'border-transparent'}`}
                                            >
                                                <img src={banner.url} alt={banner.label} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-all"></div>
                                            </div>
                                        ))}

                                        {/* Recent Uploads */}
                                        {settings.recentBanners && settings.recentBanners.length > 0 && settings.recentBanners.map((url, idx) => (
                                            <div
                                                key={`recent-${idx}`}
                                                onClick={() => handleInputChange('backgroundBanner', url)}
                                                className={`relative h-12 rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${settings.backgroundBanner === url ? 'border-[#6B7A50] ring-2 ring-[#6B7A50]/20' : 'border-transparent'}`}
                                            >
                                                <img src={url} alt={`Recent ${idx}`} className="w-full h-full object-cover" />
                                            </div>
                                        ))}
                                        {/* Custom Upload */}
                                        <div
                                            onClick={() => {
                                                if (!getIsPremium()) {
                                                    toast({ title: 'Premium Feature', description: 'Custom backgrounds are for premium users only.', variant: 'destructive' });
                                                    return;
                                                }
                                                document.getElementById('bg-upload')?.click();
                                            }}
                                            className="h-12 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:bg-muted"
                                        >
                                            <Upload className="h-4 w-4" />
                                            <input
                                                id="bg-upload"
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => {
                                                            const img = new (window as any).Image();
                                                            img.src = reader.result as string;
                                                            img.onload = () => {
                                                                const canvas = document.createElement('canvas');
                                                                const MAX_SIZE = 800;
                                                                let width = img.width;
                                                                let height = img.height;
                                                                if (width > height) {
                                                                    if (width > MAX_SIZE) {
                                                                        height *= MAX_SIZE / width;
                                                                        width = MAX_SIZE;
                                                                    }
                                                                } else {
                                                                    if (height > MAX_SIZE) {
                                                                        width *= MAX_SIZE / height;
                                                                        height = MAX_SIZE;
                                                                    }
                                                                }
                                                                canvas.width = width;
                                                                canvas.height = height;
                                                                const ctx = canvas.getContext('2d');
                                                                ctx?.drawImage(img, 0, 0, width, height);
                                                                const compressed = canvas.toDataURL('image/jpeg', 0.6);
                                                                handleInputChange('backgroundBanner', compressed);
                                                            };
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {settings.backgroundBanner && getIsPremium() && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 bg-muted/30 p-4 rounded-lg border">
                                            <div className="space-y-2 flex flex-col justify-center">
                                                <div className="flex justify-between items-center">
                                                    <Label className="text-xs">Opacity</Label>
                                                    <span className="text-xs text-muted-foreground">{Math.round((settings.backgroundOpacity ?? 0.15) * 100)}%</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="0.02" max="1" step="0.01"
                                                    value={settings.backgroundOpacity ?? 0.15}
                                                    onChange={e => handleInputChange('backgroundOpacity', parseFloat(e.target.value))}
                                                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                                                />
                                            </div>
                                            <div className="space-y-2 flex flex-col justify-center">
                                                <div className="flex justify-between items-center">
                                                    <Label className="text-xs">Scale</Label>
                                                    <span className="text-xs text-muted-foreground">{settings.backgroundScale ?? 1}x</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="0.1" max="3" step="0.1"
                                                    value={settings.backgroundScale ?? 1}
                                                    onChange={e => handleInputChange('backgroundScale', parseFloat(e.target.value))}
                                                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs">Size</Label>
                                                <select
                                                    value={settings.backgroundSize || 'cover'}
                                                    onChange={e => handleInputChange('backgroundSize', e.target.value)}
                                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                                >
                                                    <option value="cover">Cover</option>
                                                    <option value="contain">Contain</option>
                                                    <option value="auto">Original</option>
                                                    <option value="100% 100%">Stretch</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs">Position</Label>
                                                <select
                                                    value={settings.backgroundPosition || 'center'}
                                                    onChange={e => handleInputChange('backgroundPosition', e.target.value)}
                                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                                >
                                                    <option value="center">Center</option>
                                                    <option value="top">Top</option>
                                                    <option value="bottom">Bottom</option>
                                                    <option value="left">Left</option>
                                                    <option value="right">Right</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-4">
                                    <Label className="text-base font-bold">Bill Template</Label>
                                    <RadioGroup value={settings.template} onValueChange={(v) => handleInputChange('template', v)} className="flex gap-4">
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="simple" id="simple" />
                                            <Label htmlFor="simple">Simple</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="classic" id="classic" />
                                            <Label htmlFor="classic">Classic</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="modern" id="modern" />
                                            <Label htmlFor="modern">Modern</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="shop-footer">Footer Message</Label>
                                    <Textarea id="shop-footer" placeholder="e.g., Thank you for your business!" value={settings.footer} onChange={e => handleInputChange('footer', e.target.value)} />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Live Preview */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Live Preview</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <BillPreview settings={settings} />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
            <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm p-4 border-t">
                <div className="container mx-auto">
                    <Button onClick={handleSave} className="w-full">Save Bill Design</Button>
                </div>
            </div>
        </>
    );
}
