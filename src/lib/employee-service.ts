// ============================================================
// Employee Service - MyShopBook
// Manages employees (nokar) under owner accounts
// Data is stored in Firestore: users/{ownerEmail}/employees/{empId}
// Activity logs: users/{ownerEmail}/activityLog/{logId}
// ============================================================

import { db, auth } from '@/firebase/config';
import {
    collection,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    getDocs,
    addDoc,
    query,
    orderBy,
    limit,
    serverTimestamp,
    Timestamp,
} from 'firebase/firestore';

// ─── Types ─────────────────────────────────────────────────────────────────

export type EmployeeRole = 'manager' | 'cashier' | 'viewer';

export interface Employee {
    id: string;
    name: string;
    phone: string;
    role: EmployeeRole;
    pin: string; // 4-digit PIN (hashed/plain — kept simple for MVP)
    isActive: boolean;
    createdAt: string;
    ownerEmail: string;
}

export interface ActivityLog {
    id: string;
    action: 'bill_created' | 'payment_added' | 'customer_added' | 'customer_deleted' | 'item_updated';
    performedBy: {
        uid: string;
        name: string;
        role: 'owner' | EmployeeRole;
    };
    details: string;           // Human-readable description
    entityId?: string | null;  // e.g. transactionId or customerId
    createdAt: string;
}

export interface EmployeeSession {
    ownerEmail: string;
    employeeId: string;
    employeeName: string;
    role: EmployeeRole;
}

// ─── Role Permissions ───────────────────────────────────────────────────────

export const ROLE_PERMISSIONS: Record<EmployeeRole | 'owner', Record<string, boolean>> = {
    owner: {
        createBill: true,
        addPayment: true,
        addCustomer: true,
        deleteCustomer: true,
        editItems: true,
        viewReports: true,
        viewSettings: true,
        manageEmployees: true,
        viewActivityLog: true,
    },
    manager: {
        createBill: true,
        addPayment: true,
        addCustomer: true,
        deleteCustomer: true,
        editItems: true,
        viewReports: true,
        viewSettings: false,
        manageEmployees: false,
        viewActivityLog: true,
    },
    cashier: {
        createBill: true,
        addPayment: true,
        addCustomer: true,
        deleteCustomer: false,
        editItems: false,
        viewReports: false,
        viewSettings: false,
        manageEmployees: false,
        viewActivityLog: false,
    },
    viewer: {
        createBill: false,
        addPayment: false,
        addCustomer: false,
        deleteCustomer: false,
        editItems: false,
        viewReports: true,
        viewSettings: false,
        manageEmployees: false,
        viewActivityLog: false,
    },
};

// ─── LocalStorage Keys ──────────────────────────────────────────────────────

const EMPLOYEE_SESSION_KEY = 'msb_employee_session';

// ─── Session Management ─────────────────────────────────────────────────────

export function getEmployeeSession(): EmployeeSession | null {
    if (typeof window === 'undefined') return null;
    // If an owner is logged in via Firebase Auth, staff session is invalid
    if (auth.currentUser?.email) {
        localStorage.removeItem(EMPLOYEE_SESSION_KEY);
        return null;
    }
    const raw = localStorage.getItem(EMPLOYEE_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
}

export function isStaffMember(): boolean {
    return !!getEmployeeSession();
}

export function setEmployeeSession(session: EmployeeSession | null): void {
    if (typeof window === 'undefined') return;
    if (session) {
        localStorage.setItem(EMPLOYEE_SESSION_KEY, JSON.stringify(session));
    } else {
        localStorage.removeItem(EMPLOYEE_SESSION_KEY);
    }
}

export function clearEmployeeSession(): void {
    setEmployeeSession(null);
}

// Returns current session: who is acting (owner or employee)
export function getCurrentActor(): {
    uid: string;
    name: string;
    role: 'owner' | EmployeeRole;
    id: string;
} | null {
    const empSession = getEmployeeSession();
    if (empSession) {
        return {
            uid: empSession.employeeId,
            name: empSession.employeeName,
            role: empSession.role,
            id: empSession.employeeId,
        };
    }
    // Owner is acting
    if (typeof window !== 'undefined') {
        const ownerRaw = localStorage.getItem('cashbookpro_activeUser');
        if (ownerRaw) {
            const owner = JSON.parse(ownerRaw);
            return {
                uid: owner.email,
                name: owner.name || 'Owner',
                role: 'owner',
                id: owner.email,
            };
        }
    }
    return null;
}

export function canDo(permission: string): boolean {
    const actor = getCurrentActor();
    if (!actor) return false;
    const perms = ROLE_PERMISSIONS[actor.role];
    return perms?.[permission] ?? false;
}

// ─── Employee CRUD ──────────────────────────────────────────────────────────

export function normalizeStaffId(id: string): string {
    return (id || '').toLowerCase().trim().replace(/[^a-z0-9@._-]/g, '');
}

export async function getEmployees(ownerEmail: string): Promise<Employee[]> {
    const cleanEmail = ownerEmail.toLowerCase().trim();
    const empCol = collection(db, 'users', cleanEmail, 'employees');
    const snap = await getDocs(empCol);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Employee));
}

export async function addEmployee(
    ownerEmail: string,
    data: Omit<Employee, 'id' | 'createdAt' | 'ownerEmail'>
): Promise<string> {
    const cleanEmail = ownerEmail.toLowerCase().trim();
    const empCol = collection(db, 'users', cleanEmail, 'employees');
    const emp: Omit<Employee, 'id'> = {
        ...data,
        ownerEmail: cleanEmail,
        createdAt: new Date().toISOString(),
    };
    const ref = await addDoc(empCol, emp);

    // Also index in staffDirectory so the employee can log in using their own phone or email!
    if (data.phone) {
        const cleanLoginId = normalizeStaffId(data.phone);
        if (cleanLoginId) {
            try {
                await setDoc(doc(db, 'staffDirectory', cleanLoginId), {
                    ownerEmail: cleanEmail,
                    employeeId: ref.id,
                    name: data.name,
                    role: data.role,
                    pin: data.pin.trim(),
                    isActive: data.isActive,
                    loginId: cleanLoginId,
                    updatedAt: new Date().toISOString()
                });
            } catch (e) {
                console.warn('Could not write to staffDirectory index:', e);
            }
        }
    }

    return ref.id;
}

export async function updateEmployee(
    ownerEmail: string,
    employeeId: string,
    data: Partial<Omit<Employee, 'id' | 'ownerEmail' | 'createdAt'>>
): Promise<void> {
    const cleanEmail = ownerEmail.toLowerCase().trim();
    const empRef = doc(db, 'users', cleanEmail, 'employees', employeeId);

    const prevSnap = await getDoc(empRef);
    const prevData = prevSnap.exists() ? prevSnap.data() : null;

    await updateDoc(empRef, data as any);

    // Update staffDirectory index
    if (prevData?.phone) {
        const oldId = normalizeStaffId(prevData.phone);
        const newId = data.phone ? normalizeStaffId(data.phone) : oldId;
        if (oldId && oldId !== newId) {
            try { await deleteDoc(doc(db, 'staffDirectory', oldId)); } catch {}
        }
    }

    const effectivePhone = data.phone !== undefined ? data.phone : prevData?.phone;
    if (effectivePhone) {
        const cleanLoginId = normalizeStaffId(effectivePhone);
        if (cleanLoginId) {
            try {
                await setDoc(doc(db, 'staffDirectory', cleanLoginId), {
                    ownerEmail: cleanEmail,
                    employeeId: employeeId,
                    name: data.name || prevData?.name || '',
                    role: data.role || prevData?.role || 'cashier',
                    pin: (data.pin || prevData?.pin || '').trim(),
                    isActive: data.isActive !== undefined ? data.isActive : (prevData?.isActive ?? true),
                    loginId: cleanLoginId,
                    updatedAt: new Date().toISOString()
                });
            } catch (e) {
                console.warn('Could not update staffDirectory index:', e);
            }
        }
    }
}

export async function deleteEmployee(ownerEmail: string, employeeId: string): Promise<void> {
    const cleanEmail = ownerEmail.toLowerCase().trim();
    const empRef = doc(db, 'users', cleanEmail, 'employees', employeeId);

    try {
        const snap = await getDoc(empRef);
        if (snap.exists()) {
            const phone = snap.data()?.phone;
            if (phone) {
                const cleanLoginId = normalizeStaffId(phone);
                if (cleanLoginId) {
                    await deleteDoc(doc(db, 'staffDirectory', cleanLoginId));
                }
            }
        }
    } catch (e) {
        console.warn('Could not clean up staffDirectory entry on delete:', e);
    }

    await deleteDoc(empRef);
}

// ─── Employee Login (PIN-based) ─────────────────────────────────────────────
// Supports login by Staff's OWN Phone or Email, OR Shop Owner Email
export async function loginAsEmployee(
    loginIdOrOwnerEmail: string,
    pin: string
): Promise<EmployeeSession | null> {
    const cleanInput = (loginIdOrOwnerEmail || '').trim();
    const cleanPin = (pin || '').trim();
    const cleanId = normalizeStaffId(cleanInput);

    if (!cleanId || !cleanPin) return null;

    // 1. Direct Staff Directory Lookup (Staff logs in with their OWN Phone or Email!)
    try {
        const dirRef = doc(db, 'staffDirectory', cleanId);
        const dirSnap = await getDoc(dirRef);
        if (dirSnap.exists()) {
            const d = dirSnap.data();
            if (!d.isActive) return null;
            if (String(d.pin).trim() !== cleanPin) return null;

            // Re-verify against owner's employee collection
            const empRef = doc(db, 'users', d.ownerEmail, 'employees', d.employeeId);
            const empSnap = await getDoc(empRef);
            if (!empSnap.exists() || !empSnap.data()?.isActive) {
                try { await deleteDoc(dirRef); } catch {}
                return null;
            }

            const session: EmployeeSession = {
                ownerEmail: d.ownerEmail,
                employeeId: d.employeeId,
                employeeName: d.name,
                role: d.role,
            };
            setEmployeeSession(session);
            return session;
        }
    } catch (e) {
        console.warn('staffDirectory lookup error:', e);
    }

    // 2. Fallback: Owner Email Lookup
    if (cleanInput.includes('@')) {
        const cleanOwner = cleanInput.toLowerCase().trim();
        const employees = await getEmployees(cleanOwner);
        const match = employees.find((e) => String(e.pin).trim() === cleanPin && e.isActive);
        if (match) {
            const session: EmployeeSession = {
                ownerEmail: cleanOwner,
                employeeId: match.id,
                employeeName: match.name,
                role: match.role,
            };
            setEmployeeSession(session);
            return session;
        }
    }

    return null;
}

// ─── Real-Time Session Validation & Kill Switch ─────────────────────────────
// Checks if the staff account was deleted or disabled by the owner.
// If offline, permits local offline work. As soon as internet connects, re-validates.
export async function validateEmployeeSession(): Promise<boolean> {
    if (typeof window === 'undefined') return true;
    const session = getEmployeeSession();
    if (!session) return true;

    // Offline check: If offline, allow cashier to continue offline work
    if (!navigator.onLine) {
        return true;
    }

    try {
        const empRef = doc(db, 'users', session.ownerEmail, 'employees', session.employeeId);
        const snap = await getDoc(empRef);
        if (!snap.exists() || !snap.data()?.isActive) {
            console.warn('Staff session revoked or deleted by owner.');
            clearEmployeeSession();
            localStorage.removeItem('cashbookpro_activeUser');
            window.location.href = '/employee-login?revoked=true';
            return false;
        }
        return true;
    } catch {
        // Transient network glitch - keep session to prevent disruption
        return true;
    }
}

// ─── Activity Logging ────────────────────────────────────────────────────────

export async function logActivity(
    ownerEmail: string,
    action: ActivityLog['action'],
    details: string,
    entityId?: string
): Promise<void> {
    try {
        const actor = getCurrentActor();
        if (!actor) return;

        const logCol = collection(db, 'users', ownerEmail, 'activityLog');
        const log: Omit<ActivityLog, 'id'> = {
            action,
            performedBy: actor,
            details,
            entityId: entityId || null,
            createdAt: new Date().toISOString(),
        };
        await addDoc(logCol, log);
    } catch (e) {
        console.error('Activity log failed:', e);
    }
}

export async function getActivityLog(
    ownerEmail: string,
    maxItems: number = 50
): Promise<ActivityLog[]> {
    try {
        const logCol = collection(db, 'users', ownerEmail, 'activityLog');
        const q = query(logCol, orderBy('createdAt', 'desc'), limit(maxItems));
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ActivityLog));
    } catch (e) {
        console.error('Failed to fetch activity log:', e);
        return [];
    }
}
