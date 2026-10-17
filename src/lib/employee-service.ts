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
    return ref.id;
}

export async function updateEmployee(
    ownerEmail: string,
    employeeId: string,
    data: Partial<Omit<Employee, 'id' | 'ownerEmail' | 'createdAt'>>
): Promise<void> {
    const cleanEmail = ownerEmail.toLowerCase().trim();
    const empRef = doc(db, 'users', cleanEmail, 'employees', employeeId);
    await updateDoc(empRef, data as any);
}

export async function deleteEmployee(ownerEmail: string, employeeId: string): Promise<void> {
    const cleanEmail = ownerEmail.toLowerCase().trim();
    const empRef = doc(db, 'users', cleanEmail, 'employees', employeeId);
    await deleteDoc(empRef);
}

// ─── Employee Login (PIN-based) ─────────────────────────────────────────────

export async function loginAsEmployee(
    ownerEmail: string,
    pin: string
): Promise<EmployeeSession | null> {
    const cleanEmail = ownerEmail.toLowerCase().trim();
    const employees = await getEmployees(cleanEmail);
    const match = employees.find((e) => e.pin.trim() === pin.trim() && e.isActive);
    if (!match) return null;

    const session: EmployeeSession = {
        ownerEmail: cleanEmail,
        employeeId: match.id,
        employeeName: match.name,
        role: match.role,
    };
    setEmployeeSession(session);
    return session;
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
