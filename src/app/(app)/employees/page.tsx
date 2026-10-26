'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/firebase/config';
import {
    getEmployees,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    Employee,
    EmployeeRole,
} from '@/lib/employee-service';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    UserPlus,
    Users,
    Trash2,
    Pencil,
    ShieldCheck,
    Eye,
    EyeOff,
    RefreshCcw,
    ToggleLeft,
    ToggleRight,
    Copy,
    Check,
    Share2,
    Key,
} from 'lucide-react';

const ROLE_LABELS: Record<EmployeeRole, string> = {
    manager: '🧑‍💼 Manager',
    cashier: '💰 Cashier',
    viewer: '👁️ Viewer',
};

const ROLE_COLORS: Record<EmployeeRole, string> = {
    manager: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    cashier: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    viewer: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

const emptyForm = {
    name: '',
    phone: '',
    pin: '',
    role: 'cashier' as EmployeeRole,
    isActive: true,
};

export default function ManageEmployeesPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [ownerEmail, setOwnerEmail] = useState('');
    const [showDialog, setShowDialog] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({ ...emptyForm });
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [copiedEmail, setCopiedEmail] = useState(false);
    const [visiblePins, setVisiblePins] = useState<Record<string, boolean>>({});
    const router = useRouter();
    const { toast } = useToast();

    const copyOwnerEmail = () => {
        if (!ownerEmail) return;
        navigator.clipboard.writeText(ownerEmail);
        setCopiedEmail(true);
        toast({ title: 'Shop Owner Email copied!', description: 'Share this email with your staff members.' });
        setTimeout(() => setCopiedEmail(false), 2000);
    };

    const togglePinVisibility = (id: string) => {
        setVisiblePins(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const shareStaffCredentials = async (emp: Employee) => {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const loginUrl = `${origin}/employee-login`;
        const text = `*Staff Login Details*\n` +
            `Assalam-o-Alaikum ${emp.name}!\n` +
            `Aap ka staff login account tayyar hai:\n\n` +
            `📱 *Staff Login ID:* ${emp.phone || 'Apna Mobile/Email'}\n` +
            `🔑 *Aap Ka PIN:* ${emp.pin}\n` +
            `👤 *Role:* ${ROLE_LABELS[emp.role] || emp.role}\n` +
            `🔗 *Login Link:* ${loginUrl}\n\n` +
            `Apne mobile par link khol kar apna Login ID aur PIN darj karein.`;

        // Universal Share API: Opens app chooser (WhatsApp, BWhatsApp, SMS, Telegram, etc.)
        if (typeof navigator !== 'undefined' && navigator.share) {
            try {
                await navigator.share({
                    title: `${emp.name} - Staff Login`,
                    text: text,
                });
                return;
            } catch (err: any) {
                if (err?.name === 'AbortError') return;
            }
        }

        // Fallback: Copy to clipboard and open WhatsApp
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(text);
            toast({ title: 'Login details copied!', description: 'Paste into WhatsApp, SMS, or any messaging app.' });
        }
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    };

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (!user?.email) {
                router.replace('/login');
                return;
            }
            setOwnerEmail(user.email);
            await loadEmployees(user.email);
        });
        return () => unsubscribe();
    }, [router]);

    const loadEmployees = async (email: string) => {
        setLoading(true);
        try {
            const list = await getEmployees(email);
            setEmployees(list.sort((a, b) => a.name.localeCompare(b.name)));
        } catch (e) {
            toast({ variant: 'destructive', title: 'Failed to load employees' });
        } finally {
            setLoading(false);
        }
    };

    const openAddDialog = () => {
        setForm({ ...emptyForm });
        setEditingId(null);
        setShowDialog(true);
    };

    const openEditDialog = (emp: Employee) => {
        setForm({
            name: emp.name,
            phone: emp.phone,
            pin: emp.pin,
            role: emp.role,
            isActive: emp.isActive,
        });
        setEditingId(emp.id);
        setShowDialog(true);
    };

    const handleSave = async () => {
        if (!form.name.trim() || !form.phone.trim() || !form.pin.trim() || form.pin.length < 4) {
            toast({ variant: 'destructive', title: 'Name, Staff Login ID (Phone or Email), and 4+ digit PIN are required' });
            return;
        }
        setSaving(true);
        try {
            if (editingId) {
                await updateEmployee(ownerEmail, editingId, {
                    name: form.name.trim(),
                    phone: form.phone.trim(),
                    pin: form.pin.trim(),
                    role: form.role,
                    isActive: form.isActive,
                });
                toast({ title: '✅ Employee updated!' });
            } else {
                await addEmployee(ownerEmail, {
                    name: form.name.trim(),
                    phone: form.phone.trim(),
                    pin: form.pin.trim(),
                    role: form.role,
                    isActive: form.isActive,
                });
                toast({ title: '✅ Employee added!' });
            }
            setShowDialog(false);
            await loadEmployees(ownerEmail);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteEmployee(ownerEmail, id);
            toast({ title: 'Employee removed.' });
            setDeleteConfirmId(null);
            await loadEmployees(ownerEmail);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        }
    };

    const toggleActive = async (emp: Employee) => {
        await updateEmployee(ownerEmail, emp.id, { isActive: !emp.isActive });
        await loadEmployees(ownerEmail);
    };

    return (
        <div className="container mx-auto p-4 sm:p-6 md:p-8 bg-[#FAF8F3] dark:bg-[#121212] min-h-screen">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-serif font-bold text-[#2F2F2F] dark:text-[#E0E0E0] flex items-center gap-2">
                        <Users className="w-6 h-6 text-[#6B7A50]" /> Manage Staff
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">Add, edit, or disable your shop employees (nokar)</p>
                </div>
                <Button onClick={openAddDialog} className="bg-[#6B7A50] hover:bg-[#5A6940] text-white gap-2">
                    <UserPlus className="w-4 h-4" /> Add Staff
                </Button>
            </div>

            {/* Staff Login Link Card */}
            <Card className="mb-6 bg-[#FAF8F3] dark:bg-[#1A1A1A] border-[#6B7A50]/30 shadow-sm">
                <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#6B7A50]/15 flex items-center justify-center shrink-0">
                            <ShieldCheck className="w-6 h-6 text-[#6B7A50]" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-[#2F2F2F] dark:text-[#E0E0E0]">Staff Portal & Mobile Login</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Staff members log in directly using their assigned <span className="font-semibold text-foreground">Phone Number or Email</span> + their <span className="font-semibold text-foreground">4-digit PIN</span>.
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Staff login page: <span className="font-mono font-bold text-[#6B7A50]">/employee-login</span>
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <RefreshCcw className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
            ) : employees.length === 0 ? (
                <Card className="bg-white dark:bg-[#1E1E1E] border-[#CFCAC0] dark:border-[#333333]">
                    <CardContent className="flex flex-col items-center py-16 gap-4">
                        <Users className="w-14 h-14 text-muted-foreground/30" />
                        <p className="text-muted-foreground font-serif italic">No staff added yet.</p>
                        <Button onClick={openAddDialog} className="bg-[#6B7A50] hover:bg-[#5A6940] text-white gap-2">
                            <UserPlus className="w-4 h-4" /> Add First Staff Member
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {employees.map((emp) => (
                        <Card key={emp.id} className="bg-white dark:bg-[#1E1E1E] border-[#CFCAC0] dark:border-[#333333] shadow-sm">
                            <CardContent className="p-4 space-y-3">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="font-bold text-lg dark:text-white">{emp.name}</p>
                                        <p className="text-xs text-muted-foreground">{emp.phone || 'No contact phone'}</p>
                                    </div>
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${ROLE_COLORS[emp.role]}`}>
                                        {ROLE_LABELS[emp.role]}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between bg-muted/30 p-2 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${emp.isActive ? 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'}`}>
                                            {emp.isActive ? '🟢 Active' : '🔴 Inactive'}
                                        </span>
                                        <div className="flex items-center gap-1 text-xs font-mono font-bold">
                                            <Key className="w-3.5 h-3.5 text-muted-foreground" />
                                            <span>PIN: {visiblePins[emp.id] ? emp.pin : '••••'}</span>
                                        </div>
                                    </div>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-6 w-6"
                                        onClick={() => togglePinVisibility(emp.id)}
                                        title={visiblePins[emp.id] ? "Hide PIN" : "Show PIN"}
                                    >
                                        {visiblePins[emp.id] ? <EyeOff className="w-3.5 h-3.5 text-muted-foreground" /> : <Eye className="w-3.5 h-3.5 text-muted-foreground" />}
                                    </Button>
                                </div>

                                {/* WhatsApp & Universal Share Button */}
                                <Button
                                    size="sm"
                                    onClick={() => shareStaffCredentials(emp)}
                                    className="w-full bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs gap-1.5 h-8 shadow-sm"
                                >
                                    <Share2 className="w-3.5 h-3.5" /> Share Credentials (WhatsApp, SMS, etc.)
                                </Button>

                                <div className="flex gap-2 pt-1 border-t border-border/40">
                                    <Button size="sm" variant="outline" onClick={() => openEditDialog(emp)} className="flex-1 gap-1 text-xs">
                                        <Pencil className="w-3 h-3" /> Edit
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => toggleActive(emp)}
                                        className={`flex-1 gap-1 text-xs ${emp.isActive ? 'border-orange-300 text-orange-600' : 'border-green-300 text-green-600'}`}
                                    >
                                        {emp.isActive ? <ToggleLeft className="w-3 h-3" /> : <ToggleRight className="w-3 h-3" />}
                                        {emp.isActive ? 'Disable' : 'Enable'}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setDeleteConfirmId(emp.id)}
                                        className="border-red-200 text-red-500 hover:bg-red-50 dark:border-red-900 dark:text-red-400"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Add / Edit Dialog */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Edit Staff Member' : 'Add New Staff Member'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1">
                            <Label>Full Name *</Label>
                            <Input
                                placeholder="e.g. Raza Khan"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>Staff Login ID (Phone Number or Email) *</Label>
                            <Input
                                placeholder="e.g. 03001234567 or staff@gmail.com"
                                value={form.phone}
                                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            />
                            <p className="text-[11px] text-muted-foreground">Staff will enter this Phone Number or Email on their mobile to log in.</p>
                        </div>
                        <div className="space-y-1">
                            <Label>PIN (4–6 digits) *</Label>
                            <Input
                                type="password"
                                inputMode="numeric"
                                maxLength={6}
                                placeholder="e.g. 1234"
                                value={form.pin}
                                onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '') })}
                                className="tracking-widest text-xl"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>Role *</Label>
                            <div className="flex gap-2 flex-wrap">
                                {(['manager', 'cashier', 'viewer'] as EmployeeRole[]).map((r) => (
                                    <button
                                        key={r}
                                        type="button"
                                        onClick={() => setForm({ ...form, role: r })}
                                        className={`px-4 py-2 rounded-xl border text-sm font-bold transition-all ${form.role === r
                                                ? 'bg-[#6B7A50] text-white border-[#6B7A50]'
                                                : 'bg-white dark:bg-[#252525] border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                                            }`}
                                    >
                                        {ROLE_LABELS[r]}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Manager: full access | Cashier: add bills/payments | Viewer: read-only
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Label>Status</Label>
                            <button
                                type="button"
                                onClick={() => setForm({ ...form, isActive: !form.isActive })}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${form.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                            >
                                {form.isActive ? '🟢 Active' : '🔴 Inactive'}
                            </button>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={saving} className="bg-[#6B7A50] text-white">
                            {saving ? <RefreshCcw className="w-4 h-4 animate-spin mr-2" /> : null}
                            {editingId ? 'Save Changes' : 'Add Staff Member'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirm Dialog */}
            <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-red-600">Remove Staff Member?</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        This will permanently remove this staff member. They will no longer be able to log in.
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
                        >
                            <Trash2 className="w-4 h-4 mr-2" /> Yes, Remove
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
