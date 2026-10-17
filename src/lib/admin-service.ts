import { db } from '@/firebase/config';
import {
    collection,
    getDocs,
    doc,
    setDoc,
    getDoc,
} from 'firebase/firestore';

export const ADMIN_EMAIL = 'king.khan648k@gmail.com';

// ─── Interfaces ────────────────────────────────────────────
export interface AdminUserRecord {
    email: string;
    name: string;
    createdAt: string;
    isPremium: boolean;
    premiumActivatedAt?: string | null;
    premiumExpiresAt?: string | null;
    premiumActivatedBy?: string | null;
    premiumNote?: string | null;
    pendingRequest?: PremiumRequest | null;
    warning?: string | null;
    complaints?: Complaint[];
}

export interface Complaint {
    id: string;
    text: string;
    createdAt: string;
    status: 'pending' | 'resolved';
    reply?: string | null;
}

export type PlanDuration = '1_month' | '4_months' | '6_months' | '1_year';

export interface PremiumRequest {
    id: string;
    userEmail: string;
    userName: string;
    paymentMethod: string;
    paymentScreenshot?: string | null;
    transactionId?: string | null;
    amount: string;
    planDuration: PlanDuration;
    status: 'pending' | 'approved' | 'rejected';
    requestedAt: string;
    reviewedAt?: string | null;
    reviewedBy?: string | null;
    note?: string | null;
    expiryDate?: string | null;
}

export interface PaymentSettings {
    jazzcash: string;
    easypaisa: string;
    bank: string;
    price1Month: string;
    price4Months: string;
    price6Months: string;
    price1Year: string;
    lastUpdatedBy?: string;
    lastUpdatedAt?: string;
}

export interface AdminAnnouncement {
    id: string;
    message: string;
    createdAt: string;
    createdBy: string;
    isActive: boolean;
}

export interface AppUpdate {
    version: string;
    message: string;
    apkUrl: string;
    isActive: boolean;
    isForceUpdate?: boolean;
    createdAt: string;
    createdBy: string;
}

// ─── Admin Auth Check ──────────────────────────────────────
export function isAdmin(email: string): boolean {
    return email === ADMIN_EMAIL;
}

// ─── Get Payment Settings (read by users & admin) ─────────
export async function getPaymentSettings(): Promise<PaymentSettings> {
    try {
        const snap = await getDoc(doc(db, 'appConfig', 'paymentSettings'));
        if (snap.exists()) {
            return snap.data() as PaymentSettings;
        }
    } catch (e) {
        console.warn('Could not load payment settings:', e);
    }
    // Defaults
    return {
        jazzcash: '0300-0000000',
        easypaisa: '0300-0000000',
        bank: 'IBAN: PK00XXXX0000000000000000',
        price1Month: '500',
        price4Months: '1800',
        price6Months: '2500',
        price1Year: '4500',
    };
}

// ─── Save Payment Settings (admin only) ───────────────────
export async function savePaymentSettings(
    settings: PaymentSettings,
    adminEmail: string
): Promise<void> {
    await setDoc(doc(db, 'appConfig', 'paymentSettings'), {
        ...settings,
        lastUpdatedBy: adminEmail,
        lastUpdatedAt: new Date().toISOString(),
    });
}

// ─── Get Active Announcement ───────────────────────────────
export async function getActiveAnnouncement(): Promise<AdminAnnouncement | null> {
    try {
        const snap = await getDoc(doc(db, 'appConfig', 'announcement'));
        if (snap.exists()) {
            const data = snap.data() as AdminAnnouncement;
            if (data.isActive) return data;
        }
    } catch (e) {
        console.warn('Could not load announcement:', e);
    }
    return null;
}

// ─── Post Announcement (admin only) ───────────────────────
export async function postAnnouncement(
    message: string,
    adminEmail: string,
    isActive: boolean
): Promise<void> {
    await setDoc(doc(db, 'appConfig', 'announcement'), {
        id: 'announcement',
        message,
        createdAt: new Date().toISOString(),
        createdBy: adminEmail,
        isActive,
    });
}

// ─── Get App Update Notification ───────────────────────────
export async function getAppUpdate(): Promise<AppUpdate | null> {
    try {
        const snap = await getDoc(doc(db, 'appConfig', 'appUpdate'));
        if (snap.exists()) {
            const data = snap.data() as AppUpdate;
            if (data.isActive) return data;
        }
    } catch (e) {
        console.warn('Could not load app update:', e);
    }
    return null;
}

// ─── Save App Update Notification (admin only) ─────────────
export async function saveAppUpdate(
    update: Omit<AppUpdate, 'createdAt' | 'createdBy'>,
    adminEmail: string
): Promise<void> {
    await setDoc(doc(db, 'appConfig', 'appUpdate'), {
        ...update,
        createdAt: new Date().toISOString(),
        createdBy: adminEmail,
    });
}

// ─── Get All Users (with pending requests) ─────────────────
export async function getAllUsers(): Promise<AdminUserRecord[]> {
    try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const users: AdminUserRecord[] = [];
        usersSnap.forEach((docSnap) => {
            const data = docSnap.data();
            const expiresAt = data.premiumExpiresAt || null;
            let isPremium = data.isPremium === true;

            // Lazy Check: If marked premium but expiry date is in the past
            if (isPremium && expiresAt && new Date() > new Date(expiresAt)) {
                isPremium = false;
            }

            users.push({
                email: docSnap.id,
                name: data.name || 'Unknown',
                createdAt: data.createdAt || '',
                isPremium,
                premiumActivatedAt: data.premiumActivatedAt || null,
                premiumExpiresAt: expiresAt,
                premiumActivatedBy: data.premiumActivatedBy || null,
                premiumNote: data.premiumNote || null,
                pendingRequest: data.pendingRequest || null,
                warning: data.warning || null,
                complaints: data.complaints || [],
            });
        });
        return users.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
    } catch (error) {
        console.error('Error fetching users:', error);
        return [];
    }
}

// ─── Get User App Data (for admin inspection) ──────────────
export async function getUserAppData(userEmail: string): Promise<any | null> {
    try {
        const rootSnap = await getDoc(doc(db, 'users', userEmail));
        if (!rootSnap.exists()) return null;

        const firestoreData = rootSnap.data();
        let result: any = {
            customers: [],
            items: [],
            transactions: [],
            reminders: [],
            settings: firestoreData.settings || null
        };

        // Fetch sub-collections
        try {
            const [custSnap, itemSnap, transSnap, remSnap] = await Promise.all([
                getDocs(collection(db, 'users', userEmail, 'customers')),
                getDocs(collection(db, 'users', userEmail, 'items')),
                getDocs(collection(db, 'users', userEmail, 'transactions')),
                getDocs(collection(db, 'users', userEmail, 'reminders'))
            ]);

            result.customers = custSnap.docs.map(d => d.data());
            result.items = itemSnap.docs.map(d => d.data());
            result.transactions = transSnap.docs.map(d => d.data());
            result.reminders = remSnap.docs.map(d => d.data());

            // Legacy Fallback
            if (result.customers.length === 0 && firestoreData.customers?.length > 0) {
                result.customers = firestoreData.customers;
                result.items = firestoreData.items || [];
                result.transactions = firestoreData.transactions || [];
                result.reminders = firestoreData.reminders || [];
            }
        } catch (subErr) {
            console.warn('Admin: Error fetching sub-collections, using legacy data:', subErr);
            result.customers = firestoreData.customers || [];
            result.items = firestoreData.items || [];
            result.transactions = firestoreData.transactions || [];
            result.reminders = firestoreData.reminders || [];
        }

        return result;
    } catch (e) {
        console.error('Error fetching user app data:', e);
    }
    return null;
}

// ─── Activate Premium ──────────────────────────────────────
export async function activatePremium(
    userEmail: string,
    adminEmail: string,
    note: string = ''
): Promise<void> {
    const userRef = doc(db, 'users', userEmail);
    await setDoc(
        userRef,
        {
            isPremium: true,
            premiumActivatedAt: new Date().toISOString(),
            premiumActivatedBy: adminEmail,
            premiumNote: note,
            // Clear the pending request after activation
            pendingRequest: null,
        },
        { merge: true }
    );
}

// ─── Set User Warning ──────────────────────────────────────
export async function setUserWarning(userEmail: string, warning: string | null): Promise<void> {
    const userRef = doc(db, 'users', userEmail);
    await setDoc(userRef, { warning }, { merge: true });
}

// ─── Revoke Premium ────────────────────────────────────────
export async function revokePremium(userEmail: string): Promise<void> {
    const userRef = doc(db, 'users', userEmail);
    await setDoc(
        userRef,
        {
            isPremium: false,
            premiumActivatedAt: null,
            premiumActivatedBy: null,
            premiumNote: 'Revoked by admin',
        },
        { merge: true }
    );
}

// ─── Get Premium Requests (from user documents) ────────────
export async function getPremiumRequests(): Promise<PremiumRequest[]> {
    try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const requests: PremiumRequest[] = [];
        usersSnap.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.pendingRequest) {
                requests.push(data.pendingRequest as PremiumRequest);
            }
            // Also include history
            if (data.requestHistory && Array.isArray(data.requestHistory)) {
                requests.push(...data.requestHistory);
            }
        });
        return requests.sort((a, b) => (b.requestedAt > a.requestedAt ? 1 : -1));
    } catch (error) {
        console.error('Error fetching premium requests:', error);
        return [];
    }
}

// ─── Approve Request ───────────────────────────────────────
export async function approvePremiumRequest(
    requestId: string,
    userEmail: string,
    adminEmail: string,
    note: string = ''
): Promise<void> {
    const userRef = doc(db, 'users', userEmail);
    const userSnap = await getDoc(userRef);
    const existingHistory = userSnap.exists() ? (userSnap.data().requestHistory || []) : [];

    // Find the pending request
    const pendingReq = userSnap.exists() ? userSnap.data().pendingRequest : null;
    let expiresAt = null;

    if (pendingReq && pendingReq.planDuration) {
        const date = new Date();
        const duration = pendingReq.planDuration as PlanDuration;
        if (duration === '1_month') date.setMonth(date.getMonth() + 1);
        else if (duration === '4_months') date.setMonth(date.getMonth() + 4);
        else if (duration === '6_months') date.setMonth(date.getMonth() + 6);
        else if (duration === '1_year') date.setFullYear(date.getFullYear() + 1);
        expiresAt = date.toISOString();
    }

    // History entries should NOT contain heavy screenshots
    const strippedHistory = existingHistory.map((h: any) => {
        const { paymentScreenshot, ...rest } = h;
        return rest;
    });

    const approvedReq: PremiumRequest = {
        ...(pendingReq || {}),
        id: requestId,
        userEmail,
        status: 'approved',
        reviewedAt: new Date().toISOString(),
        reviewedBy: adminEmail,
        note,
        expiryDate: expiresAt,
    };

    // Remove screenshot from the record being moved to history
    delete (approvedReq as any).paymentScreenshot;

    await setDoc(userRef, {
        isPremium: true,
        premiumActivatedAt: new Date().toISOString(),
        premiumExpiresAt: expiresAt,
        premiumActivatedBy: adminEmail,
        premiumNote: note,
        pendingRequest: null,
        requestHistory: [...strippedHistory, approvedReq],
    }, { merge: true });
}

// ─── Reject Request ────────────────────────────────────────
export async function rejectPremiumRequest(
    requestId: string,
    adminEmail: string,
    note: string = '',
    userEmail: string = ''
): Promise<void> {
    if (!userEmail) return;
    const userRef = doc(db, 'users', userEmail);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;

    // History entries should NOT contain heavy screenshots
    const strippedHistory = (userSnap.data().requestHistory || []).map((h: any) => {
        const { paymentScreenshot, ...rest } = h;
        return rest;
    });

    const rejectedReq: PremiumRequest = {
        ...(userSnap.data().pendingRequest || {}),
        id: requestId,
        userEmail,
        status: 'rejected',
        reviewedAt: new Date().toISOString(),
        reviewedBy: adminEmail,
        note,
    };

    // Remove screenshot from the record being moved to history
    delete (rejectedReq as any).paymentScreenshot;

    await setDoc(userRef, {
        pendingRequest: null,
        requestHistory: [...strippedHistory, rejectedReq],
    }, { merge: true });
}

// ─── Submit Premium Request (writes to user's OWN document) 
// This works because Firestore rules allow users to write their own doc
export async function submitPremiumRequest(
    userEmail: string,
    userName: string,
    paymentMethod: string,
    amount: string,
    transactionId: string,
    planDuration: PlanDuration,
    screenshotBase64?: string
): Promise<void> {
    const reqId = `${userEmail}_${Date.now()}`;
    const request: PremiumRequest = {
        id: reqId,
        userEmail,
        userName,
        paymentMethod,
        amount,
        planDuration,
        transactionId,
        paymentScreenshot: screenshotBase64 || null,
        status: 'pending',
        requestedAt: new Date().toISOString(),
        reviewedAt: null,
        reviewedBy: null,
        note: null,
    };

    // Write to user's own document (allowed by Firestore rules)
    const userRef = doc(db, 'users', userEmail);
    await setDoc(userRef, { pendingRequest: request }, { merge: true });
}

// ─── Get Stats ─────────────────────────────────────────────
export async function getAdminStats(): Promise<{
    totalUsers: number;
    premiumUsers: number;
    pendingRequests: number;
}> {
    try {
        const usersSnap = await getDocs(collection(db, 'users'));
        let premiumCount = 0;
        let pendingCount = 0;
        usersSnap.forEach((d) => {
            const data = d.data();
            const expiresAt = data.premiumExpiresAt || null;
            let isPremium = data.isPremium === true;

            if (isPremium && expiresAt && new Date() > new Date(expiresAt)) {
                isPremium = false;
            }

            if (isPremium) premiumCount++;
            if (data.pendingRequest && data.pendingRequest.status === 'pending') pendingCount++;
        });
        return { totalUsers: usersSnap.size, premiumUsers: premiumCount, pendingRequests: pendingCount };
    } catch {
        return { totalUsers: 0, premiumUsers: 0, pendingRequests: 0 };
    }
}

// ─── Complaints Management ───────────────────────────────────
export async function submitComplaint(userEmail: string, text: string): Promise<void> {
    const userRef = doc(db, 'users', userEmail);
    const userSnap = await getDoc(userRef);
    let existingComplaints: Complaint[] = [];
    if (userSnap.exists()) {
        existingComplaints = userSnap.data().complaints || [];
    }
    const newComplaint: Complaint = {
        id: `${userEmail}_${Date.now()}`,
        text,
        createdAt: new Date().toISOString(),
        status: 'pending',
        reply: null
    };
    await setDoc(userRef, {
        complaints: [...existingComplaints, newComplaint]
    }, { merge: true });
}

export async function replyToComplaint(userEmail: string, complaintId: string, reply: string): Promise<void> {
    const userRef = doc(db, 'users', userEmail);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;
    const complaints: Complaint[] = userSnap.data().complaints || [];
    const updated = complaints.map((c) => {
        if (c.id === complaintId) {
            return { ...c, reply, status: 'resolved' as const };
        }
        return c;
    });
    await setDoc(userRef, { complaints: updated }, { merge: true });
}
