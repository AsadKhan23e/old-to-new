'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, Star, Zap, Upload, CreditCard, Send, Clock, ShieldCheck, X, Megaphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getIsPremium, setIsPremium, getActiveUser, getIsActuallyPremium } from '@/lib/data-layer';
import { useTranslation } from '@/hooks/use-translation';
import {
  submitPremiumRequest,
  getPaymentSettings,
  getActiveAnnouncement,
  PaymentSettings,
  AdminAnnouncement,
  PlanDuration,
} from '@/lib/admin-service';
import { db } from '@/firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';

export default function PremiumPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isPremium, setPremium] = useState(false);
  const [isPaidPremium, setPaidPremium] = useState(false);
  const [activeUser, setActiveUser] = useState<{ name: string; email: string } | null>(null);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [selectedMethod, setSelectedMethod] = useState('jazzcash');
  const [selectedPlan, setSelectedPlan] = useState<PlanDuration>('1_month');
  const [transactionId, setTransactionId] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [announcement, setAnnouncement] = useState<AdminAnnouncement | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const user = getActiveUser();
    if (!user) { router.push('/login'); return; }
    setActiveUser(user);
    setPremium(getIsPremium());
    setPaidPremium(getIsActuallyPremium());

    // Calculate trial days (15 day trial)
    const createdAtStr = localStorage.getItem('cashbookpro_createdAt');
    if (createdAtStr) {
      const signupDate = new Date(createdAtStr);
      const trialExpiry = new Date(signupDate.getTime() + 15 * 24 * 60 * 60 * 1000);
      const diff = trialExpiry.getTime() - new Date().getTime();
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      if (days > 0 && days <= 15 && !getIsPremium()) {
        setTrialDaysLeft(days);
      }
    }

    // Load payment settings + announcement from Firestore
    const init = async () => {
      setLoadingSettings(true);
      const [ps, ann] = await Promise.all([getPaymentSettings(), getActiveAnnouncement()]);
      setPaymentSettings(ps);
      setAnnouncement(ann);
      setLoadingSettings(false);
    };
    init();

    // Listen for real-time premium activation by admin
    const userRef = doc(db, 'users', user.email);
    const unsub = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setUserData(data);

        // If admin activated premium
        if (data.isPremium === true) {
          setIsPremium(true);
          setPremium(true);
          setPaidPremium(true);
        }

        // If user HAS a pending request on server, show submitted state
        if (data.pendingRequest) {
          setSubmitted(true);
        }

        // Check if pending request was recently rejected
        if (!data.pendingRequest && data.requestHistory?.length > 0) {
          const last = data.requestHistory[data.requestHistory.length - 1];
          if (last.status === 'rejected') {
            setSubmitted(false); // Allow re-submission
          }
        }
      }
    });
    return () => unsub();
  }, [router]);

  const PAYMENT_METHODS = [
    { id: 'jazzcash', label: 'JazzCash', icon: '📱', number: paymentSettings?.jazzcash || '...' },
    { id: 'easypaisa', label: 'Easypaisa', icon: '💚', number: paymentSettings?.easypaisa || '...' },
    { id: 'bank', label: 'Bank Transfer', icon: '🏦', number: paymentSettings?.bank || '...' },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      // Compress large images
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new (window as any).Image();
        img.src = reader.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX = 800;
          let w = img.width, h = img.height;
          if (w > MAX) { h = h * MAX / w; w = MAX; }
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
          setScreenshot(canvas.toDataURL('image/jpeg', 0.6));
        };
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onloadend = () => setScreenshot(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const PLAN_OPTIONS: { id: PlanDuration; label: string; priceKey: keyof PaymentSettings; months: number }[] = [
    { id: '1_month', label: '1 Month', priceKey: 'price1Month', months: 1 },
    { id: '4_months', label: '4 Months', priceKey: 'price4Months', months: 4 },
    { id: '6_months', label: '6 Months', priceKey: 'price6Months', months: 6 },
    { id: '1_year', label: '1 Year', priceKey: 'price1Year', months: 12 },
  ];

  const handleSubmit = async () => {
    if (!activeUser) return;
    if (!transactionId.trim()) {
      toast({ variant: 'destructive', title: 'Transaction ID required' });
      return;
    }

    const plan = PLAN_OPTIONS.find(p => p.id === selectedPlan);
    const amount = paymentSettings ? (paymentSettings[plan?.priceKey || 'price1Month'] as string) : '500';

    setSubmitting(true);
    try {
      await submitPremiumRequest(
        activeUser.email,
        activeUser.name,
        selectedMethod,
        amount,
        transactionId,
        selectedPlan,
        screenshot || undefined
      );
      setSubmitted(true);
      toast({ title: '✅ Request Submitted!', description: 'We will verify within 24 hours.' });
    } catch (err: any) {
      console.error('Submit error:', err);
      toast({ variant: 'destructive', title: 'Error', description: err?.message || 'Could not submit. Check internet.' });
    } finally {
      setSubmitting(false);
    }
  };

  const features = [
    { icon: '📄', name: 'Full Khata PDF Download' },
    { icon: '☁️', name: 'Cloud Sync & Backup' },
    { icon: '📊', name: 'Advanced Analytics & Reports' },
    { icon: '🔒', name: 'Secure Multi-Device Access' },
  ];

  const selectedPaymentMethod = PAYMENT_METHODS.find((m) => m.id === selectedMethod);

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-2xl">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg shadow-yellow-500/30">
          <Star className="w-8 h-8 text-white fill-white" />
        </div>
        <h1 className="text-3xl font-bold">{t('premiumTitle')}</h1>
        <p className="text-muted-foreground mt-2">{t('premiumDescription')}</p>
      </div>

      {/* Admin Announcement Banner */}
      {announcement && announcement.isActive && (
        <div className="mb-6 flex items-start gap-3 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
          <Megaphone className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
          <p className="text-sm text-blue-200">{announcement.message}</p>
        </div>
      )}

      {/* Trial Notification */}
      {trialDaysLeft !== null && !isPremium && !submitted && (
        <div className="mb-6 bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-green-400">Welcome! You are in Free Trial</p>
            <p className="text-xs text-muted-foreground">Enjoy all premium features for <strong>{trialDaysLeft} more days</strong>. Upgrade anytime to keep them forever.</p>
          </div>
        </div>
      )}

      {/* Premium Active State (Paid) */}
      {isPaidPremium ? (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="p-8 text-center space-y-3">
            <ShieldCheck className="w-16 h-16 mx-auto text-green-500" />
            <h2 className="text-2xl font-bold text-green-600">{t('premiumActive')} ✨</h2>
            <p className="text-muted-foreground">All premium features are unlocked for you.</p>
            <div className="grid grid-cols-2 gap-3 mt-4">
              {features.map((f) => (
                <div key={f.name} className="flex items-center gap-2 text-sm bg-green-500/10 rounded-lg p-3">
                  <span>{f.icon}</span> {f.name}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : submitted ? (
        /* Submitted State */
        <div className="space-y-6">
          {/* Rejection Notification if any */}
          {(() => {
            const lastRequest = activeUser ? (userData as any)?.requestHistory?.slice(-1)[0] : null;
            if (lastRequest && lastRequest.status === 'rejected' && lastRequest.note) {
              return (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
                  <X className="w-5 h-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-red-500">Your previous request was rejected</p>
                    <p className="text-xs text-red-200 mt-1"><strong>Reason:</strong> {lastRequest.note}</p>
                    <p className="text-[10px] text-gray-400 mt-2">Please correct the issue and submit again.</p>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          <Card className="border-blue-500/30 bg-blue-500/5">
            <CardContent className="p-8 text-center space-y-4">
              <Clock className="w-16 h-16 mx-auto text-blue-500 animate-pulse" />
              <h2 className="text-2xl font-bold">Request Under Review</h2>
              <p className="text-muted-foreground">
                Your payment request is submitted. We will verify and activate premium within <strong>24 hours</strong>.
              </p>
              <div className="bg-blue-500/10 rounded-xl p-4 text-sm text-left space-y-1">
                <p>📧 <strong>Account:</strong> {activeUser?.email}</p>
                <p>💳 <strong>Method:</strong> {selectedMethod}</p>
                <p>🔢 <strong>TXN ID:</strong> {transactionId}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Features */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" /> What you get
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {features.map((f) => (
                  <li key={f.name} className="flex items-center gap-3 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    <span>{f.icon} {f.name}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Payment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-500" /> Subscription Plan & Payment
              </CardTitle>
              <CardDescription>
                Select a plan and pay via any method below, then submit transaction details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Plan Selection */}
              <div className="space-y-3">
                <Label>Choose Your Plan</Label>
                <div className="grid grid-cols-2 gap-2">
                  {PLAN_OPTIONS.map((p) => {
                    const price = paymentSettings ? (paymentSettings[p.priceKey] as string) : '...';
                    return (
                      <button
                        key={p.id}
                        onClick={() => setSelectedPlan(p.id)}
                        className={`p-4 rounded-xl border text-left transition-all ${selectedPlan === p.id
                          ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500'
                          : 'border-muted hover:border-blue-500/50'
                          }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className={`text-xs font-bold uppercase tracking-wider ${selectedPlan === p.id ? 'text-blue-500' : 'text-muted-foreground'}`}>
                            {p.label}
                          </span>
                          {selectedPlan === p.id && <CheckCircle className="w-3 h-3 text-blue-500" />}
                        </div>
                        <div className="text-lg font-bold">Rs. {price}</div>
                        <div className="text-[10px] text-muted-foreground">Valid for {p.months} month{p.months > 1 ? 's' : ''}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Payment Method Selection */}
              <div className="space-y-3">
                <Label>Select Payment Method</Label>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMethod(m.id)}
                      className={`p-3 rounded-xl border text-center transition-all text-sm ${selectedMethod === m.id
                        ? 'border-primary bg-primary/10 text-primary font-semibold'
                        : 'border-muted hover:border-primary/50'
                        }`}
                    >
                      <div className="text-2xl mb-1">{m.icon}</div>
                      {m.label}
                    </button>
                  ))}
                </div>
                {/* Payment Number - from admin settings */}
                <div className="mt-3 bg-muted rounded-xl px-4 py-4 text-sm border border-muted-foreground/10">
                  <div className="flex justify-between items-center mb-2 pb-2 border-b border-muted-foreground/10">
                    <span className="text-xs text-muted-foreground italic">Send payment to ({selectedPaymentMethod?.label}):</span>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                      Rs. {paymentSettings ? paymentSettings[PLAN_OPTIONS.find(p => p.id === selectedPlan)?.priceKey || 'price1Month'] : '...'}
                    </span>
                  </div>
                  {loadingSettings ? (
                    <div className="h-5 w-32 bg-muted-foreground/20 rounded animate-pulse" />
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-primary font-mono text-lg tracking-wider">{selectedPaymentMethod?.number}</p>
                      <button
                        onClick={() => {
                          if (selectedPaymentMethod?.number) {
                            navigator.clipboard.writeText(selectedPaymentMethod.number);
                            toast({ title: 'Copied!', description: 'Number copied to clipboard' });
                          }
                        }}
                        className="text-[10px] uppercase font-bold text-blue-500 hover:underline"
                      >
                        Copy
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Gmail Account for Activation */}
              <div className="space-y-2">
                <Label htmlFor="txn-id">Enter Gmail Account (To Activate Premium) *</Label>
                <Input
                  id="txn-id"
                  placeholder="e.g. yourname@gmail.com"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                />
              </div>

              {/* Screenshot Upload */}
              <div className="space-y-2">
                <Label>Payment Screenshot (Optional but recommended)</Label>
                {screenshot ? (
                  <div className="relative">
                    <img src={screenshot} alt="Screenshot" className="w-full max-h-48 object-contain rounded-xl border" />
                    <button
                      onClick={() => setScreenshot(null)}
                      className="absolute top-2 right-2 bg-destructive text-white rounded-full p-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="w-full border-2 border-dashed border-muted hover:border-primary/50 rounded-xl p-6 text-center transition-colors"
                  >
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Click to upload screenshot</p>
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </div>

              {/* Submit */}
              <Button
                onClick={handleSubmit}
                disabled={submitting || !transactionId.trim() || loadingSettings}
                className="w-full h-12 text-base bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white font-bold shadow-lg shadow-orange-500/30"
                size="lg"
              >
                <Send className="mr-2 w-5 h-5" />
                {submitting ? 'Submitting...' : 'Submit for Verification'}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                ⏱ Premium will be activated within 24 hours after verification.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}