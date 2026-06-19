'use client';
// A simple data layer using localStorage.

// Data Structure Types
export type User = {
  name: string;
  email: string;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  address?: string | null;
  picture?: string | null;
  dateAdded: string;
  notes?: string | null;
  isSupplier?: boolean;
};

export type Item = {
  id: string;
  itemName: string;
  purchasePrice: number;
  supplierName?: string | null;
  supplierPhone?: string | null;
  sellingPrice: number;
  quantity: number;
  notes?: string | null;
  picture?: string | null;
  createdAt: string;
  modifiedAt?: string | null;
};

export type SoldItem = {
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  notes?: string | null;
  picture?: string | null;
};

export type PurchaseItem = {
  id: string;
  itemName: string;
  purchasePrice: number;
  sellingPrice: number;
  quantity: number;
  picture?: string | null;
  notes?: string | null;
}

export type Payment = {
  id: string;
  amount: number;
  date: string;
  notes?: string | null;
  image?: string | null;
};

export type Transaction = {
  id: string;
  customerId: string;
  customerName?: string | null;
  items?: SoldItem[] | null;
  itemId?: string | null;
  itemName?: string | null;
  quantity?: number | null;
  unitPrice?: number | null;
  discount?: number | null;
  totalAmount: number;
  amountPaid: number;
  type?: 'credit' | 'debit' | 'purchase' | null;
  date: string;
  modifiedAt?: string | null;
  notes?: string | null;
  remainingBalance: number;
  previousBalance?: number | null;
  grandTotal?: number | null;
  additionalPayments?: Payment[] | null;
  paid: boolean;
  status?: 'open' | 'closed' | null;
  isEdited?: boolean | null;
  billNumber?: number | null;
  billAdjustments?: {
    previousGrandTotal: number;
    newGrandTotal: number;
    difference: number;
    editedAt: string;
    reason?: string | null;
  }[] | null;
  image?: string | null;
};

export type Reminder = {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  dueAmount: number;
  dueDate: string;
  message: string;
  status: 'pending' | 'sent' | 'completed';
};

export type BillDesignContact = {
  id: string;
  label: string;
  phone: string;
};

export type BillDesignSettings = {
  shopName: string;
  contacts: BillDesignContact[];
  address: string;
  logo: string;
  template: 'simple' | 'classic' | 'modern' | 'vibrant' | 'blue-urdu' | 'professional-maroon' | 'colorful' | 'jewelry' | 'mobile-shop' | 'medical' | 'restaurant' | 'fashion' | 'minimal';
  footer: string;
  backgroundBanner?: string;
  backgroundOpacity?: number;
  backgroundSize?: string;
  backgroundPosition?: string;
  backgroundRepeat?: string;
  backgroundScale?: number;
  recentBanners?: string[];
};

export type AppData = {
  customers: Customer[];
  items: Item[];
  transactions: Transaction[];
  reminders: Reminder[];
  settings: {
    language: 'en' | 'ur';
    viewMode: 'user' | 'customer';
    theme: 'light' | 'dark' | 'system';
    billDesign: BillDesignSettings;
  };
};

const defaultData: AppData = {
  customers: [],
  items: [],
  transactions: [],
  reminders: [],
  settings: {
    language: 'en',
    viewMode: 'user',
    theme: 'system',
    billDesign: {
      shopName: 'Your Ledger Shop',
      contacts: [{ id: '1', label: 'Office', phone: '000-000-0000' }],
      address: 'Main Street, Business District',
      logo: '',
      template: 'classic',
      footer: '',
      backgroundOpacity: 0.15,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundScale: 1
    }
  },
};

import { db, auth } from "@/firebase/config";
import { doc, getDoc, setDoc, collection, getDocs, writeBatch, query, deleteDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged, updateProfile } from "firebase/auth";
import { persistence } from './persistence-engine';
import { Network } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

// --- User Management ---

// --- Global State ---
let cachedData: AppData = JSON.parse(JSON.stringify(defaultData));
let currentCacheEmail: string | null = null;
let syncListeners: ((status: SyncStatus) => void)[] = [];

export function getActiveUser(): User | null {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    if (typeof window !== 'undefined') {
      const activeUserJson = localStorage.getItem('cashbookpro_activeUser');
      return activeUserJson ? JSON.parse(activeUserJson) : null;
    }
    return null;
  }
  return {
    name: currentUser.displayName || 'User',
    email: currentUser.email || ''
  };
}

export function setActiveUser(user: User | null) {
  if (typeof window === 'undefined') return;
  if (user) {
    localStorage.setItem('cashbookpro_activeUser', JSON.stringify(user));
    // Set trial start date if not exists
    if (!localStorage.getItem('cashbookpro_createdAt')) {
      localStorage.setItem('cashbookpro_createdAt', new Date().toISOString());
    }
  } else {
    localStorage.removeItem('cashbookpro_activeUser');
    localStorage.removeItem('cashbookpro_isPremium');
    clearDataCache();
  }
}

export function clearDataCache() {
  cachedData = JSON.parse(JSON.stringify(defaultData));
  currentCacheEmail = null;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('cashbookpro_data_updated'));
  }
}

export async function updateUserName(newName: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("No user logged in");

  // 1. Update Firebase Auth Profile
  await updateProfile(currentUser, { displayName: newName });

  // 2. Update Firestore User Document
  const userRef = doc(db, "users", currentUser.email!);
  await updateDoc(userRef, { name: newName });

  // 3. Update Local Storage Cache
  const updatedUser: User = { name: newName, email: currentUser.email! };
  setActiveUser(updatedUser);

  // 4. Update in-memory cachedData if it exists
  if (cachedData && cachedData.settings) {
    // You might want to store user info in cachedData too if needed, 
    // but currently it's not and we rely on auth/localStorage.
  }

  // 5. Notify components
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('cashbookpro_data_updated'));
  }
}

// --- App Data Management ---

function getLocalStorageKey(userEmail: string) {
  return `cashbookpro_data_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
}

export async function initializeDataCache(userEmail: string): Promise<AppData> {
  if (!userEmail) {
    clearDataCache();
    return defaultData;
  }

  // Always reset memory cache when switching users or re-initing to prevent data leakage
  cachedData = JSON.parse(JSON.stringify(defaultData));
  currentCacheEmail = userEmail;

  console.log(`DataLayer: Initializing cache for ${userEmail}`);

  // 1. SILENT INIT: Initialize SQLite (Sync if context is initialized)
  if (Capacitor.isNativePlatform()) {
    await persistence.init();
  }

  let hasLocalData = false;

  // 2. FAST CACHE: Try loading from persistence engine (instantly available)
  const localData = await persistence.load(userEmail);
  if (localData) {
    cachedData = localData;
    hasLocalData = true;
    console.log('DataLayer: SUCCESSFULLY Loaded data from SQLite/Local Cache.');
    // Notify components that data is ready
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('cashbookpro_data_updated'));
    }
  } else {
    console.log('DataLayer: No local data found in SQLite.');
  }

  // 3. BACKGROUND FIRESTORE SYNC
  const fetchFromServer = async () => {
    try {
      const isOnline = (await Network.getStatus()).connected;
      if (!isOnline) return; // Do not even attempt if offline

      // CRITICAL FIX: Push pending offline data FIRST before pulling outdated data from Firestore
      const pendingKeys = await persistence.getUnsyncedKeys();
      if (pendingKeys.includes(userEmail)) {
        console.log('DataLayer: Found PENDING offline data. Pushing to Firestore FIRST before pulling...');
        await syncAllPending();
      }

      // Check if user session changed while waiting for pending sync
      if (userEmail !== currentCacheEmail) {
        console.warn('DataLayer: Sync aborted - User changed during pending sync.');
        return;
      }

      const docRef = doc(db, "users", userEmail);
      const docSnap = await getDoc(docRef);

      let isUserPremium = false;
      let userCreatedAt = '';
      let serverData: AppData = { ...defaultData };

      if (docSnap.exists()) {
        const firestoreData = docSnap.data();
        isUserPremium = firestoreData.isPremium === true;
        userCreatedAt = firestoreData.createdAt || '';

        // 1. Load Settings (from root doc)
        if (firestoreData.settings) {
          serverData.settings = firestoreData.settings;
        }

        // 2. Load Collections (from sub-collections)
        try {
          const [custSnap, itemSnap, transSnap, remSnap] = await Promise.all([
            getDocs(collection(db, "users", userEmail, "customers")),
            getDocs(collection(db, "users", userEmail, "items")),
            getDocs(collection(db, "users", userEmail, "transactions")),
            getDocs(collection(db, "users", userEmail, "reminders"))
          ]);

          serverData.customers = custSnap.docs.map(d => d.data() as Customer);
          serverData.items = itemSnap.docs.map(d => d.data() as Item);
          serverData.transactions = transSnap.docs.map(d => d.data() as Transaction);
          serverData.reminders = remSnap.docs.map(d => d.data() as Reminder);

          // Handle Legacy Data: If sub-collections are empty but root doc has data, use root doc data
          if (serverData.customers.length === 0 && firestoreData.customers?.length > 0) {
            serverData.customers = firestoreData.customers;
            serverData.items = firestoreData.items || [];
            serverData.transactions = firestoreData.transactions || [];
            serverData.reminders = firestoreData.reminders || [];
            console.log('DataLayer: Loaded legacy data from root document.');
          }
        } catch (err) {
          console.warn('DataLayer: Error loading sub-collections, falling back to legacy:', err);
          serverData = { ...defaultData, ...(firestoreData as AppData) };
        }

        // PREMIUM/Trial check
        const trialDays = 15;
        const signupDate = new Date(userCreatedAt);
        const trialExpiry = new Date(signupDate.getTime() + trialDays * 24 * 60 * 60 * 1000);
        const inTrial = new Date() < trialExpiry;

        if (isUserPremium || inTrial) {
          // Check if user session changed while waiting for Firestore response
          if (userEmail !== currentCacheEmail) {
            console.warn('DataLayer: Sync aborted - User session changed during Firestore fetch.');
            return;
          }
          cachedData = serverData;
          console.log(`DataLayer: Sync completed (${isUserPremium ? 'Premium' : 'Trial'}).`);
        } else {
          console.log('DataLayer: Free User - Sync blocked.');
        }
      } else {
        // NEW USER: Create document with signup time
        const now = new Date().toISOString();
        userCreatedAt = now;
        await setDoc(docRef, {
          createdAt: now,
          isPremium: false,
          email: userEmail,
          name: getActiveUser()?.name || 'User'
        }, { merge: true });
        console.log('DataLayer: New user document created with createdAt timestamp.');
      }

      // Sync status to localStorage for UI checks (ads, trial, etc)
      if (typeof window !== 'undefined') {
        localStorage.setItem('cashbookpro_isPremium', isUserPremium ? 'true' : 'false');
        if (userCreatedAt) localStorage.setItem('cashbookpro_createdAt', userCreatedAt);
      }

      // Double check before saving and notifying
      if (userEmail !== currentCacheEmail) return;

      // Update local storage/SQLite with whatever we have in memory
      await persistence.save(userEmail, cachedData, false);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('cashbookpro_data_updated'));
      }
    } catch (e) {
      console.warn("Firestore initialization failed:", e);
    }
  };

  if (hasLocalData) {
    // Return instantly, fetch in background without await
    fetchFromServer();
  } else {
    // Await ONLY if we literally have no local data
    await fetchFromServer();
  }

  // 4. Start Sync Engine
  setupSyncEngine();

  return cachedData;
}

function saveToLocalStorage(userEmail: string, data: AppData) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(getLocalStorageKey(userEmail), JSON.stringify(data));
}

export async function saveUserData(userEmail: string, data: AppData): Promise<void> {
  if (!userEmail) return;

  console.log(`DataLayer: SAVING data for ${userEmail}...`);

  // Update in-memory
  cachedData = JSON.parse(JSON.stringify(data));

  // 1. LOCAL PERSISTENCE: Write to SQLite/LocalDB and mark UNSYNCED
  // We MUST await this to ensure native persistence before navigation
  try {
    await persistence.save(userEmail, cachedData, true);
    console.log('DataLayer: SUCCESSFULLY Saved to SQLite.');
  } catch (err) {
    console.error('DataLayer: SQLite Save FAILED:', err);
  }

  // 2. Notify all components to re-fetch from RAM
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('cashbookpro_data_updated'));
    // Also dispatch storage event for standard cross-tab sync if needed
    window.dispatchEvent(new Event('storage'));
  }

  // 3. Attempt Firestore Write (Native Behavior: runs in background)
  triggerFirestoreSync(userEmail, cachedData);
}

async function triggerFirestoreSync(userEmail: string, data: AppData) {
  const isOnline = (await Network.getStatus()).connected;
  if (!isOnline) {
    updateSyncStatus('offline');
    return;
  }

  try {
    pendingWrites++;
    updateSyncStatus('syncing');

    const userRef = doc(db, "users", userEmail);

    // 1. Sync Settings & Status to Root Doc (Remove large collections to save space)
    const { customers, items, transactions, reminders, ...settingsOnly } = data;
    const sanitizedSettings = sanitizeForFirestore(settingsOnly);
    await setDoc(userRef, sanitizedSettings, { merge: true });

    // 2. Sync Sub-collections (Using Batches for efficiency)
    // We use merge: true to avoid overwriting unrelated fields in docs
    const batch = writeBatch(db);

    // Sync Customers
    customers.slice(0, 100).forEach(c => {
      const cRef = doc(db, "users", userEmail, "customers", c.id);
      batch.set(cRef, sanitizeForFirestore(c), { merge: true });
    });

    // Sync Items
    items.slice(0, 100).forEach(i => {
      const iRef = doc(db, "users", userEmail, "items", i.id);
      batch.set(iRef, sanitizeForFirestore(i), { merge: true });
    });

    // Sync Transactions (Most recent 200 to keep it fast)
    transactions.slice(-200).forEach(t => {
      const tRef = doc(db, "users", userEmail, "transactions", t.id);
      batch.set(tRef, sanitizeForFirestore(t), { merge: true });
    });

    // Sync Reminders
    reminders.slice(0, 100).forEach(r => {
      const rRef = doc(db, "users", userEmail, "reminders", r.id);
      batch.set(rRef, sanitizeForFirestore(r), { merge: true });
    });

    await batch.commit();

    // On Success: Mark as Synced in Local DB
    await persistence.setSynced(userEmail);

    pendingWrites--;
    updateSyncStatus(pendingWrites <= 0 ? 'synced' : 'syncing');
  } catch (e) {
    console.error("Firestore sync error:", e);
    pendingWrites--;
    updateSyncStatus('offline');
  }
}

let syncEngineInitialized = false;
function setupSyncEngine() {
  if (syncEngineInitialized) return;
  syncEngineInitialized = true;

  // Listen for network changes
  Network.addListener('networkStatusChange', async (status) => {
    console.log('SyncEngine: Network state changed to', status.connected ? 'online' : 'offline');
    if (status.connected) {
      updateSyncStatus('syncing');
      await syncAllPending();
    } else {
      updateSyncStatus('offline');
    }
  });

  // Listen for App Resume/Foreground
  if (Capacitor.isNativePlatform()) {
    App.addListener('appStateChange', async ({ isActive }) => {
      if (isActive) {
        console.log('SyncEngine: App resumed. Checking for pending sync...');
        await syncAllPending();
      }
    });
  }

  // Fallback for Standard Browser Events
  if (typeof window !== 'undefined') {
    window.addEventListener('online', async () => {
      console.log('SyncEngine: Browser online event fired.');
      updateSyncStatus('syncing');
      await syncAllPending();
    });
    window.addEventListener('offline', () => {
      updateSyncStatus('offline');
    });
  }

  // Periodically check for unsynced data (every 1 minute)
  setInterval(async () => {
    await syncAllPending();
  }, 60000);
}

let isSyncing = false;
export async function syncAllPending() {
  if (isSyncing) return;

  const isOnline = (await Network.getStatus()).connected;
  if (!isOnline) {
    updateSyncStatus('offline');
    return;
  }

  const pendingKeys = await persistence.getUnsyncedKeys();
  if (pendingKeys.length === 0) {
    updateSyncStatus('synced');
    return;
  }

  isSyncing = true;
  updateSyncStatus('syncing');
  console.log(`SyncEngine: Found ${pendingKeys.length} pending records to sync...`);

  try {
    for (const key of pendingKeys) {
      const data = await persistence.load(key);
      if (data) {
        try {
          // Use the new scalable sync logic to avoid 1MB limits and nesting errors
          await triggerFirestoreSync(key, data);
        } catch (e) {
          console.error("SyncEngine error for", key, e);
        }
      }
    }
    updateSyncStatus('synced');
  } finally {
    isSyncing = false;
  }
}

export function getUserData(userEmail: string): AppData {
  if (userEmail !== currentCacheEmail) {
    console.warn(`DataLayer: Data mismatch! Requested: ${userEmail}, Cached: ${currentCacheEmail}. Returning default.`);
    return JSON.parse(JSON.stringify(defaultData));
  }
  // Return a fresh clone to ensure React sees new references for state updates
  return JSON.parse(JSON.stringify(cachedData));
}

function sanitizeForFirestore(obj: any): any {
  // Use stringify and parse to guarantee all objects/arrays are plain and serializable
  // This removes functions, symbols, and fixes proxy issues that cause 'invalid nested entity' errors
  try {
    return JSON.parse(JSON.stringify(obj, (key, value) => {
      if (value === undefined) return null;
      if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) return 0;
      return value;
    }));
  } catch (e) {
    console.error("Sanitization error:", e);
    return obj; // Fallback
  }
}

export type SyncStatus = 'synced' | 'syncing' | 'offline';
let currentSyncStatus: SyncStatus = typeof window !== 'undefined' && !navigator.onLine ? 'offline' : 'synced';
let pendingWrites = 0;

function updateSyncStatus(status: SyncStatus) {
  if (currentSyncStatus !== status) {
    currentSyncStatus = status;
    syncListeners.forEach(l => l(status));
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    updateSyncStatus(pendingWrites > 0 ? 'syncing' : 'synced');
  });
  window.addEventListener('offline', () => {
    updateSyncStatus('offline');
  });
}

import { useState, useEffect } from 'react';
export function useSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>(currentSyncStatus);
  useEffect(() => {
    const listener = (newStatus: SyncStatus) => setStatus(newStatus);
    syncListeners.push(listener);
    return () => {
      syncListeners = syncListeners.filter(l => l !== listener);
    };
  }, []);
  return status;
}


export function getIsPremium(): boolean {
  if (typeof window === 'undefined') return false;

  // 1. Check explicit premium status
  const isPremiumLocal = localStorage.getItem('cashbookpro_isPremium') === 'true';
  if (isPremiumLocal) return true;

  // 2. Check 3-day trial period for new users
  const createdAtStr = localStorage.getItem('cashbookpro_createdAt');
  if (createdAtStr) {
    const signupDate = new Date(createdAtStr);
    const fifteenDaysInMs = 15 * 24 * 60 * 60 * 1000;
    const trialExpiry = new Date(signupDate.getTime() + fifteenDaysInMs);
    const inTrial = new Date() < trialExpiry;
    if (inTrial) return true;
  }

  return false;
}

export function getIsActuallyPremium(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('cashbookpro_isPremium') === 'true';
}

export function setIsPremium(isPremium: boolean) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('cashbookpro_isPremium', isPremium.toString());
}

export function getLanguage(): 'en' | 'ur' {
  if (typeof window === 'undefined') return 'en';
  return (localStorage.getItem('cashbookpro_language') as 'en' | 'ur') || 'en';
}

export function setLanguage(language: 'en' | 'ur') {
  if (typeof window === 'undefined') return;
  localStorage.setItem('cashbookpro_language', language);
  window.dispatchEvent(new Event('storage'));
}

export function getViewMode(): 'user' | 'customer' {
  if (typeof window === 'undefined') return 'user';
  return (localStorage.getItem('cashbookpro_viewMode') as 'user' | 'customer') || 'user';
}

export function setViewMode(viewMode: 'user' | 'customer') {
  if (typeof window === 'undefined') return;
  localStorage.setItem('cashbookpro_viewMode', viewMode);
}

export function getBillDesignSettings(userEmail: string): BillDesignSettings {
  return (cachedData.settings?.billDesign) || defaultData.settings.billDesign;
}

