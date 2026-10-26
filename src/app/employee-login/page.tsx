'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { loginAsEmployee } from '@/lib/employee-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Users, KeyRound, RefreshCcw, ArrowLeft, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function EmployeeLoginPage() {
    const [ownerEmail, setOwnerEmail] = useState('');
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [isRevoked, setIsRevoked] = useState(false);
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('revoked') === 'true') {
                setIsRevoked(true);
            }
        }
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanEmail = ownerEmail.toLowerCase().trim();
        const cleanPin = pin.trim();

        if (!cleanEmail || !cleanPin) {
            toast({ variant: 'destructive', title: 'Please fill all fields' });
            return;
        }

        setLoading(true);
        try {
            await auth.signOut();
            const session = await loginAsEmployee(cleanEmail, cleanPin);
            if (!session) {
                toast({
                    variant: 'destructive',
                    title: 'Login Failed',
                    description: 'Incorrect PIN or staff account is inactive. Ask your shop owner for their exact Shop Owner Email and active PIN.',
                });
                return;
            }

            // Store owner email in localStorage so data-layer loads the right shop
            localStorage.setItem('cashbookpro_activeUser', JSON.stringify({
                name: session.employeeName,
                email: session.ownerEmail, // Load OWNER data
                isEmployee: true,
            }));

            toast({ title: `Welcome, ${session.employeeName}!`, description: `Logged in as ${session.role}` });
            router.push('/dashboard');
        } catch (err: any) {
            console.error('Employee Login Error:', err);
            if (err?.message?.includes('permission') || err?.code === 'permission-denied') {
                toast({
                    variant: 'destructive',
                    title: 'Firestore Permission Error',
                    description: 'Firebase security rules blocked staff login. Updating rules now...',
                });
            } else {
                toast({ variant: 'destructive', title: 'Login Error', description: err?.message || 'Could not connect to server.' });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-[#FAF8F3] dark:bg-[#0F0F0F] font-sans p-4">
            <Card className="w-full max-w-md border-[#CFCAC0] dark:border-[#333333] shadow-xl bg-white dark:bg-[#1A1A1A] rounded-xl overflow-hidden">
                <CardHeader className="text-center space-y-2 pt-8 pb-6 bg-[#FAF8F3]/50 dark:bg-[#252525]/50 border-b dark:border-[#333333]">
                    <div className="w-14 h-14 bg-[#6B7A50]/10 rounded-2xl flex items-center justify-center mx-auto mb-2">
                        <Users className="w-8 h-8 text-[#6B7A50]" />
                    </div>
                    <CardTitle className="text-3xl font-extrabold text-[#2F2F2F] dark:text-[#E0E0E0]">Staff Login</CardTitle>
                    <CardDescription className="text-sm text-gray-500 italic">
                        Login with your shop's email & your staff PIN
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    {isRevoked && (
                        <div className="mb-5 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 flex items-start gap-2 text-red-700 dark:text-red-300 text-xs">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold">Access Revoked</p>
                                <p>Your staff account was deactivated or removed by the shop owner.</p>
                            </div>
                        </div>
                    )}
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="ownerEmail" className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                Staff Login ID (Phone Number or Email)
                            </Label>
                            <Input
                                id="ownerEmail"
                                type="text"
                                placeholder="e.g. 03451234567 or staff@gmail.com"
                                value={ownerEmail}
                                onChange={(e) => setOwnerEmail(e.target.value)}
                                required
                                className="h-12 bg-[#FAF8F3] dark:bg-[#1A1A1A] border-gray-200 dark:border-gray-800 rounded-lg"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="pin" className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                Your PIN
                            </Label>
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <Input
                                    id="pin"
                                    type="password"
                                    inputMode="numeric"
                                    maxLength={6}
                                    placeholder="••••"
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                                    required
                                    className="h-12 pl-10 bg-[#FAF8F3] dark:bg-[#1A1A1A] border-gray-200 dark:border-gray-800 rounded-lg tracking-widest text-xl"
                                />
                            </div>
                        </div>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#6B7A50] hover:bg-[#56633E] text-white h-12 text-base font-bold rounded-lg shadow-lg"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <RefreshCcw className="h-4 w-4 animate-spin" /> Logging in...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <KeyRound className="h-4 w-4" /> Staff Login
                                </span>
                            )}
                        </Button>
                    </form>
                    <div className="mt-6 text-center">
                        <Link href="/login" className="flex items-center justify-center gap-2 text-sm text-[#8C6A4F] hover:underline font-medium">
                            <ArrowLeft className="w-4 h-4" /> Back to Owner Login
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
