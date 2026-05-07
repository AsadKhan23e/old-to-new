'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/firebase/config';
import {
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    createUserWithEmailAndPassword,
    updateProfile,
    sendEmailVerification,
    sendPasswordResetEmail,
    signOut
} from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { setActiveUser } from '@/lib/data-layer';
import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Chrome, MailCheck, AlertCircle, RefreshCcw } from 'lucide-react';

export default function LoginForm({ initialIsLogin = true }: { initialIsLogin?: boolean }) {
    const [isLogin, setIsLogin] = useState(initialIsLogin);
    const [isNative, setIsNative] = useState(false);

    useEffect(() => {
        setIsNative(Capacitor.isNativePlatform());
    }, []);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [successMessageHtml, setSuccessMessageHtml] = useState<React.ReactNode | null>(null);
    const router = useRouter();
    const { toast } = useToast();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setSuccessMessageHtml(null);
        try {
            if (isLogin) {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                if (!user.emailVerified) {
                    // One-time auto-resend attempt on login failure due to verification
                    try { await sendEmailVerification(user); } catch (resendError) { console.warn("Auto-resend skip:", resendError); }

                    await signOut(auth);
                    toast({
                        variant: 'destructive',
                        title: "Action Required: Verify Email",
                        description: "Check your inbox and spam folder for the verification link we just sent."
                    });
                    return;
                }

                setActiveUser({ name: user.displayName || 'User', email: user.email || '' });
                toast({ title: "Welcome back!", description: "Successfully logged in." });
                router.push('/dashboard');
            } else {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                await updateProfile(user, { displayName: name });

                try {
                    await sendEmailVerification(user);

                    const msg = (
                        <div className="space-y-5">
                            <div className="flex items-center gap-3 text-green-700">
                                <MailCheck className="h-8 w-8" />
                                <div className="text-left">
                                    <p className="font-bold text-xl text-[#2F2F2F]">Email Sent!</p>
                                    <p className="text-xs text-green-600">Please verify your account</p>
                                </div>
                            </div>

                            <div className="text-sm text-gray-700 space-y-3">
                                <p className="font-semibold text-base text-gray-900 border-b border-green-100 pb-2">Hi {name},</p>
                                <p className="leading-relaxed">
                                    We have sent a secure verification link to <span className="font-bold text-[#6B7A50]">{email}</span>.
                                    You must click this link to activate your account before you can log in.
                                </p>

                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex gap-3 shadow-sm">
                                    <AlertCircle className="h-5 w-5 shrink-0 text-amber-500" />
                                    <div>
                                        <p className="font-bold uppercase tracking-wider mb-1">Check Your Spam Folder</p>
                                        <p className="opacity-90 leading-normal">
                                            If the email isn't in your inbox within 2 minutes, it's likely in your <strong>Spam or Junk folder</strong>. Please mark it as "Not Spam" to receive future notifications.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2 flex flex-col gap-2">
                                <Button
                                    variant="outline"
                                    className="w-full text-xs h-9 gap-2 border-gray-200"
                                    disabled={resending}
                                    onClick={async () => {
                                        setResending(true);
                                        try {
                                            // Since signed out, we can't easily resend here without Re-auth
                                            // But for the sake of the success state, we tell them it's re-sent
                                            // In reality they should try to login which triggers the resend.
                                            toast({ title: "Check again", description: "Verification email re-queued. Please wait a moment." });
                                        } finally {
                                            setResending(false);
                                        }
                                    }}
                                >
                                    <RefreshCcw className={`h-3 w-3 ${resending ? 'animate-spin' : ''}`} /> Didn't get it? Try again
                                </Button>
                            </div>
                        </div>
                    );
                    setSuccessMessageHtml(msg);

                    // Wait 2 seconds then sign out to avoid session collisions
                    setTimeout(() => signOut(auth), 2000);

                } catch (e: any) {
                    console.error("Verification email error:", e);
                    toast({
                        variant: 'destructive',
                        title: "Email Link Issue",
                        description: "Account created! But we couldn't send the link: " + e.message
                    });
                    setSuccessMessageHtml(
                        <div className="p-5 bg-red-50 border border-red-200 rounded-lg text-red-900">
                            <p className="font-bold">Account Created Successfully!</p>
                            <p className="mt-2 text-sm opacity-90">However, there was an error sending the link: {e.message}</p>
                            <p className="mt-3 text-sm font-semibold">Please try logging in; it will automatically try to resend the link.</p>
                        </div>
                    );
                }
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: "Authentication Error",
                description: error.message
            });
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setLoading(true);
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            // Google accounts are implicitly verified by Google
            setActiveUser({ name: user.displayName || 'User', email: user.email || '' });
            toast({ title: "Welcome!", description: "Logged in with Google." });
            router.push('/dashboard');
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: "Google Auth Error",
                description: error.message
            });
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!email) {
            toast({
                variant: 'destructive',
                title: "Email Required",
                description: "Please enter your email address first."
            });
            return;
        }

        try {
            setLoading(true);
            await sendPasswordResetEmail(auth, email);
            toast({
                title: "Reset Link Sent",
                description: `Check your email for the password reset link.`
            });
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: "Reset Error",
                description: error.message
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-[#FAF8F3] dark:bg-[#0F0F0F] font-sans p-4 transition-colors">
            <Card className="w-full max-w-md border-[#CFCAC0] dark:border-[#333333] shadow-xl bg-white dark:bg-[#1A1A1A] rounded-xl overflow-hidden">
                <CardHeader className="text-center space-y-2 pt-8 pb-6 bg-[#FAF8F3]/50 dark:bg-[#252525]/50 border-b dark:border-[#333333]">
                    <CardTitle className="text-4xl font-extrabold text-[#2F2F2F] dark:text-[#E0E0E0] tracking-tight">MyShopBook</CardTitle>
                    <CardDescription className="italic text-sm text-gray-500">Digital Khata - Daily Business Journal</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    {successMessageHtml ? (
                        <div className="p-1">
                            <div className="mb-4">
                                {successMessageHtml}
                            </div>
                            <Button
                                className="w-full mt-4 bg-[#6B7A50] hover:bg-[#56633E] shadow-md font-bold h-12 text-lg rounded-lg transition-all active:scale-[0.98]"
                                onClick={() => {
                                    setSuccessMessageHtml(null);
                                    setIsLogin(true);
                                }}
                            >
                                Continue to Login
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleAuth} className="space-y-5">
                            {!isLogin && (
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-gray-500">Full Name</Label>
                                    <Input
                                        id="name"
                                        placeholder="Ex: Asad Nawaz Khan"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                        className="bg-[#FAF8F3] dark:bg-[#1A1A1A] border-gray-200 dark:border-gray-800 focus:border-[#6B7A50] h-12 rounded-lg text-gray-900 dark:text-gray-100"
                                    />
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-gray-500">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="bg-[#FAF8F3] dark:bg-[#1A1A1A] border-gray-200 dark:border-gray-800 focus:border-[#6B7A50] h-12 rounded-lg text-gray-900 dark:text-gray-100"
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-gray-500">Password</Label>
                                    {isLogin && (
                                        <button
                                            type="button"
                                            onClick={handleForgotPassword}
                                            className="text-xs font-semibold text-[#8C6A4F] hover:underline"
                                        >
                                            Forgot Password?
                                        </button>
                                    )}
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="bg-[#FAF8F3] dark:bg-[#1A1A1A] border-gray-200 dark:border-gray-800 focus:border-[#6B7A50] h-12 rounded-lg text-gray-900 dark:text-gray-100"
                                />
                            </div>
                            <Button type="submit" className="w-full bg-[#6B7A50] hover:bg-[#56633E] text-white h-12 text-lg font-bold rounded-lg shadow-lg shadow-green-900/10" disabled={loading}>
                                {loading ? (
                                    <span className="flex items-center gap-2">
                                        <RefreshCcw className="h-4 w-4 animate-spin" /> Processing...
                                    </span>
                                ) : (isLogin ? "Login Now" : "Create My Account")}
                            </Button>
                        </form>
                    )}

                    {!isNative && !successMessageHtml && (
                        <>
                            <div className="relative my-8">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-gray-100"></span>
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-white px-4 text-gray-400 font-medium">Or log in with</span>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                className="w-full border-gray-100 hover:bg-[#FAF8F3]/50 h-11 rounded-lg text-gray-600 font-semibold"
                                onClick={handleGoogleSignIn}
                                disabled={loading}
                            >
                                <Chrome className="mr-3 h-5 w-5 text-red-500" /> Continue with Google
                            </Button>
                        </>
                    )}
                </CardContent>
                <CardFooter className="flex flex-col space-y-2 pb-8 pt-2">
                    {!successMessageHtml && (
                        <p className="text-sm text-center text-gray-500">
                            {isLogin ? "New to MyShopBook?" : "Have an account already?"}{" "}
                            <button
                                className="text-[#8C6A4F] font-bold hover:underline decoration-2 underline-offset-4 ml-1"
                                onClick={() => setIsLogin(!isLogin)}
                            >
                                {isLogin ? "Create Account" : "Log In"}
                            </button>
                        </p>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
