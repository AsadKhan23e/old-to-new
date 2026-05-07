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
import { PlusCircle, Trash2, Camera, Upload, Building, Phone, MapPin } from 'lucide-react';
import { getActiveUser, getUserData, saveUserData, BillDesignSettings, BillDesignContact, AppData } from '@/lib/data-layer';
import Image from 'next/image';

const BillPreview = ({ settings }: { settings: BillDesignSettings }) => {
    return (
        <Card className="shadow-lg">
            <CardContent className="p-6">
                <div className={`bill-template-${settings.template}`}>
                    <header className="text-center mb-4 border-b pb-4">
                        {settings.logo && (
                            <Image src={settings.logo} alt="Shop Logo" width={80} height={80} className="mx-auto rounded-full mb-2 object-cover" />
                        )}
                        <h1 className="text-2xl font-bold">{settings.shopName || 'Shop Name'}</h1>
                        {settings.address && <p className="text-sm text-muted-foreground">{settings.address}</p>}
                        <div className="text-xs text-muted-foreground mt-1">
                            {settings.contacts.map(c => <span key={c.id} className="inline-block mx-2">{c.label}: {c.phone}</span>)}
                        </div>
                    </header>
                    <div className="my-4 text-sm">
                        <div className="flex justify-between">
                            <span>Bill #: 123</span>
                            <span>Date: {new Date().toLocaleDateString()}</span>
                        </div>
                        <p className="mt-1">Customer: John Doe</p>
                    </div>
                    <div className="border-y py-4 my-4">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left pb-2">Item</th>
                                    <th className="text-center pb-2">Qty</th>
                                    <th className="text-right pb-2">Price</th>
                                    <th className="text-right pb-2">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Sample Item 1</td>
                                    <td className="text-center">2</td>
                                    <td className="text-right">50</td>
                                    <td className="text-right">100</td>
                                </tr>
                                 <tr>
                                    <td>Sample Item 2</td>
                                    <td className="text-center">1</td>
                                    <td className="text-right">150</td>
                                    <td className="text-right">150</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="text-right font-bold text-lg">
                        <p>Total: 250</p>
                    </div>
                    {settings.footer && (
                        <footer className="text-center text-xs text-muted-foreground mt-6 pt-4 border-t">
                            <p>{settings.footer}</p>
                        </footer>
                    )}
                </div>
            </CardContent>
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
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                toast({ variant: 'destructive', title: 'File too large', description: 'Please upload an image smaller than 2MB.' });
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                handleInputChange('logo', reader.result as string);
            };
            reader.onerror = () => {
                toast({ variant: 'destructive', title: 'Logo upload failed', description: 'Could not read the file. Try again.' });
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
                                     <Image
                                        src={settings.logo || '/placeholder.svg'}
                                        alt="Shop Logo"
                                        width={64}
                                        height={64}
                                        className="rounded-full bg-muted object-cover h-16 w-16"
                                        onError={(e) => { e.currentTarget.src = 'https://placehold.co/64x64?text=Logo'; }}
                                    />
                                    <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                                        <Upload className="mr-2 h-4 w-4" /> Upload Logo
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
                             <div className="space-y-2">
                                <Label>Bill Template</Label>
                                <RadioGroup value={settings.template} onValueChange={(v) => handleInputChange('template', v)} className="flex gap-4">
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="simple" id="simple"/>
                                        <Label htmlFor="simple">Simple</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="classic" id="classic"/>
                                        <Label htmlFor="classic">Classic</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="modern" id="modern"/>
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
