'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import {
    isAdmin,
    getAllUsers,
    getPremiumRequests,
    getAdminStats,
    activatePremium,
    revokePremium,
    approvePremiumRequest,
    rejectPremiumRequest,
    getPaymentSettings,
    savePaymentSettings,
    postAnnouncement,
    getActiveAnnouncement,
    saveAppUpdate,
    getAppUpdate,
    getUserAppData,
    setUserWarning,
    AdminUserRecord,
    PremiumRequest,
    PaymentSettings,
    AdminAnnouncement,
    AppUpdate,
    replyToComplaint,
} from '@/lib/admin-service';
import { useToast } from '@/hooks/use-toast';
import {
    Shield, Users, Star, Clock, CheckCircle, XCircle, Search,
    RefreshCcw, LogOut, FileText, BarChart3, Inbox,
    Settings2, Megaphone, Save, CreditCard, Smartphone, Download,
    Eye, AlertTriangle, Package, MessageSquare,
} from 'lucide-react';

type Tab = 'dashboard' | 'users' | 'requests' | 'settings' | 'complaints';

export default function AdminPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [adminEmail, setAdminEmail] = useState('');
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('dashboard');
    const [users, setUsers] = useState<AdminUserRecord[]>([]);
    const [requests, setRequests] = useState<PremiumRequest[]>([]);
    const [stats, setStats] = useState({ totalUsers: 0, premiumUsers: 0, pendingRequests: 0 });
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingAction, setLoadingAction] = useState<string | null>(null);
    const [noteInput, setNoteInput] = useState<Record<string, string>>({});
    // Settings
    const [paySettings, setPaySettings] = useState<PaymentSettings>({ jazzcash: '', easypaisa: '', bank: '', price1Month: '500', price4Months: '1800', price6Months: '2500', price1Year: '4500' });
    const [announcement, setAnnouncement] = useState<AdminAnnouncement | null>(null);
    const [announcementText, setAnnouncementText] = useState('');
    const [appUpdate, setAppUpdate] = useState<AppUpdate>({ version: '', message: '', apkUrl: '', isActive: false, isForceUpdate: false, createdAt: '', createdBy: '' });
    const [savingSettings, setSavingSettings] = useState(false);
    // User Inspection
    const [inspectingUser, setInspectingUser] = useState<string | null>(null);
    const [inspectingData, setInspectingData] = useState<any>(null);
    const [showInspector, setShowInspector] = useState(false);
    const [loadingInspector, setLoadingInspector] = useState(false);
    const [viewImage, setViewImage] = useState<string | null>(null);

    // Complaints States
    const [replyText, setReplyText] = useState<Record<string, string>>({});
    const [replyingId, setReplyingId] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        const [usersData, requestsData, statsData, ps, ann] = await Promise.all([
            getAllUsers(),
            getPremiumRequests(),
            getAdminStats(),
            getPaymentSettings(),
            getActiveAnnouncement(),
        ]);
        setUsers(usersData);
        setRequests(requestsData);
        setStats(statsData);
        setPaySettings(ps);
        setAnnouncement(ann);
        setAnnouncementText(ann?.message || '');
        const upd = await getAppUpdate();
        if (upd) setAppUpdate(upd);
        setLoading(false);
    }, []);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (user) => {
            if (!user || !isAdmin(user.email || '')) {
                router.replace('/login');
                return;
            }
            setAdminEmail(user.email || '');
            loadData();
        });
        return () => unsub();
    }, [router, loadData]);

    const allComplaints = useMemo(() => {
        const list: { userEmail: string; userName: string; complaint: any }[] = [];
        users.forEach(u => {
            if (u.complaints) {
                u.complaints.forEach(c => {
                    list.push({
                        userEmail: u.email,
                        userName: u.name,
                        complaint: c
                    });
                });
            }
        });
        return list.sort((a, b) => new Date(b.complaint.createdAt).getTime() - new Date(a.complaint.createdAt).getTime());
    }, [users]);

    const handleReplyToComplaint = async (userEmail: string, complaintId: string) => {
        const text = replyText[complaintId];
        if (!text?.trim()) return;
        setReplyingId(complaintId);
        try {
            await replyToComplaint(userEmail, complaintId, text);
            toast({ title: '✅ Reply Submitted', description: 'Complaint has been marked resolved.' });
            setReplyText(p => { const newP = { ...p }; delete newP[complaintId]; return newP; });
            loadData();
        } catch {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to submit response.' });
        } finally {
            setReplyingId(null);
        }
    };

    const handleActivate = async (userEmail: string) => {
        setLoadingAction(userEmail);
        try {
            await activatePremium(userEmail, adminEmail, 'Manually activated by admin');
            toast({ title: '✅ Premium Activated', description: userEmail });
            loadData();
        } catch { toast({ variant: 'destructive', title: 'Error' }); }
        finally { setLoadingAction(null); }
    };

    const handleRevoke = async (userEmail: string) => {
        setLoadingAction(userEmail + '_revoke');
        try {
            await revokePremium(userEmail);
            toast({ title: '⛔ Premium Revoked', description: userEmail });
            loadData();
        } catch { toast({ variant: 'destructive', title: 'Error' }); }
        finally { setLoadingAction(null); }
    };

    const handleApproveRequest = async (req: PremiumRequest) => {
        setLoadingAction(req.id);
        try {
            await approvePremiumRequest(req.id, req.userEmail, adminEmail, noteInput[req.id] || '');
            toast({ title: '✅ Approved & Premium Activated', description: req.userEmail });
            setNoteInput((p) => { const n = { ...p }; delete n[req.id]; return n; });
            loadData();
        } catch { toast({ variant: 'destructive', title: 'Error approving' }); }
        finally { setLoadingAction(null); }
    };

    const handleRejectRequest = async (req: PremiumRequest) => {
        setLoadingAction(req.id + '_reject');
        try {
            await rejectPremiumRequest(req.id, adminEmail, noteInput[req.id] || '', req.userEmail);
            toast({ title: '❌ Request Rejected', description: req.userEmail });
            setNoteInput((p) => { const n = { ...p }; delete n[req.id]; return n; });
            loadData();
        } catch { toast({ variant: 'destructive', title: 'Error rejecting' }); }
        finally { setLoadingAction(null); }
    };

    const handleSetWarning = async (userEmail: string) => {
        const warning = window.prompt('Enter warning message for this user (leave empty to clear):');
        if (warning === null) return;
        setLoadingAction(userEmail + '_warning');
        try {
            await setUserWarning(userEmail, warning.trim() || null);
            toast({ title: '✅ Status updated for ' + userEmail });
            loadData();
        } catch { toast({ variant: 'destructive', title: 'Error updating warning' }); }
        finally { setLoadingAction(null); }
    };

    const handleSavePaymentSettings = async () => {
        setSavingSettings(true);
        try {
            await savePaymentSettings(paySettings, adminEmail);
            toast({ title: '✅ Payment settings saved! Users will see new numbers instantly.' });
        } catch { toast({ variant: 'destructive', title: 'Error saving settings' }); }
        finally { setSavingSettings(false); }
    };

    const handlePostAnnouncement = async (isActive: boolean) => {
        setSavingSettings(true);
        try {
            await postAnnouncement(announcementText, adminEmail, isActive);
            toast({ title: isActive ? '📢 Announcement published!' : '🔕 Announcement disabled' });
            loadData();
        } catch { toast({ variant: 'destructive', title: 'Error' }); }
        finally { setSavingSettings(false); }
    };

    const handleSaveAppUpdate = async (isActive: boolean) => {
        setSavingSettings(true);
        try {
            await saveAppUpdate({ ...appUpdate, isActive }, adminEmail);
            toast({ title: isActive ? '🚀 Update notification sent to all users!' : '✅ Update notification disabled' });
            loadData();
        } catch { toast({ variant: 'destructive', title: 'Error sending update' }); }
        finally { setSavingSettings(false); }
    };

    const handleInspectUser = async (userEmail: string) => {
        setLoadingInspector(true);
        setInspectingUser(userEmail);
        try {
            const data = await getUserAppData(userEmail);
            setInspectingData(data);
            setShowInspector(true);
        } catch {
            toast({ variant: 'destructive', title: 'Error fetching user data' });
        } finally {
            setLoadingInspector(false);
        }
    };

    const filteredUsers = users.filter(
        (u) => u.email.toLowerCase().includes(searchTerm.toLowerCase()) || u.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const pendingRequests = requests.filter((r) => r.status === 'pending');
    const historyRequests = requests.filter((r) => r.status !== 'pending');
    const fmt = (iso?: string | null) => !iso ? '—' : new Date(iso).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-950">
                <div className="text-center text-white">
                    <Shield className="w-12 h-12 mx-auto mb-4 text-blue-400 animate-pulse" />
                    <p className="text-lg font-semibold">Loading Admin Panel...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 text-white font-sans">
            {/* Top Bar */}
            <header className="bg-gray-900 border-b border-gray-800 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-50 shadow-lg">
                <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-blue-600 flex items-center justify-center">
                        <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="font-bold text-base sm:text-lg leading-none">ShopBook Admin</h1>
                        <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 mt-1 sm:mt-0.5 hidden xs:block">{adminEmail}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                    <button onClick={loadData} className="p-1.5 sm:p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors">
                        <RefreshCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                    <button
                        onClick={() => { auth.signOut(); router.replace('/login'); }}
                        className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-sm bg-red-900/40 hover:bg-red-800/60 text-red-300 rounded-lg transition-colors"
                    >
                        <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Logout</span>
                    </button>
                </div>
            </header>

            <div className="max-w-7xl mx-auto p-4 sm:p-6">
                {/* Tabs */}
                <div className="overflow-x-auto pb-2 mb-6 scrollbar-hide">
                    <nav className="flex gap-1 bg-gray-900 p-1 rounded-xl w-max">
                        {([
                            { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
                            { id: 'users', label: `Users (${stats.totalUsers})`, icon: Users },
                            { id: 'requests', label: 'Requests', icon: Inbox, badge: stats.pendingRequests },
                            { id: 'settings', label: 'Settings', icon: Settings2 },
                            { id: 'complaints', label: 'Complaints', icon: MessageSquare, badge: users.reduce((acc, curr) => acc + (curr.complaints?.filter(c => c.status === 'pending').length || 0), 0) },
                        ] as { id: Tab; label: string; icon: any; badge?: number }[]).map(({ id, label, icon: Icon, badge }) => (
                            <button
                                key={id}
                                onClick={() => setActiveTab(id)}
                                className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all relative ${activeTab === id ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                            >
                                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />{label}
                                {badge != null && badge > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center font-bold">{badge}</span>
                                )}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* ══ DASHBOARD ══ */}
                {activeTab === 'dashboard' && (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                            {[
                                { label: 'Total Users', value: stats.totalUsers, color: 'blue', icon: Users, sub: 'Registered accounts' },
                                { label: 'Premium Users', value: stats.premiumUsers, color: 'yellow', icon: Star, sub: 'Active subscriptions' },
                                { label: 'Pending Requests', value: stats.pendingRequests, color: 'orange', icon: Clock, sub: 'Awaiting review' },
                            ].map(({ label, value, color, icon: Icon, sub }) => (
                                <div key={label} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 sm:p-6">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-[11px] sm:text-sm text-gray-400">{label}</p>
                                            <p className={`text-2xl sm:text-4xl font-bold mt-1 ${color === 'blue' ? 'text-blue-400' : color === 'yellow' ? 'text-yellow-400' : 'text-orange-400'}`}>{value}</p>
                                            <p className="text-[10px] sm:text-xs text-gray-500 mt-1 sm:mt-2">{sub}</p>
                                        </div>
                                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${color === 'blue' ? 'bg-blue-500/10' : color === 'yellow' ? 'bg-yellow-500/10' : 'bg-orange-500/10'}`}>
                                            <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${color === 'blue' ? 'text-blue-400' : color === 'yellow' ? 'text-yellow-400' : 'text-orange-400'}`} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pending Requests Preview */}
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                                <h2 className="font-semibold flex items-center gap-2"><Clock className="w-4 h-4 text-orange-400" /> Pending Requests</h2>
                                <button onClick={() => setActiveTab('requests')} className="text-xs text-blue-400 hover:underline">View all →</button>
                            </div>
                            {pendingRequests.length === 0 ? (
                                <div className="p-10 text-center text-gray-500"><CheckCircle className="w-10 h-10 mx-auto mb-3 text-green-600" /><p>No pending requests!</p></div>
                            ) : (
                                <div className="divide-y divide-gray-800">
                                    {pendingRequests.slice(0, 3).map((req) => (
                                        <div key={req.id} className="px-6 py-4 flex items-center justify-between gap-4">
                                            <div>
                                                <p className="font-medium text-sm">{req.userName}</p>
                                                <p className="text-xs text-gray-400">{req.userEmail} • {fmt(req.requestedAt)}</p>
                                                <p className="text-xs text-blue-300 mt-1">{req.paymentMethod} • Rs. {req.amount} • TXN: {req.transactionId || '—'}</p>
                                            </div>
                                            <button onClick={() => setActiveTab('requests')} className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 rounded-lg font-medium">Review</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ══ USERS ══ */}
                {activeTab === 'users' && (
                    <div className="space-y-5">
                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by name or email..."
                                className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 text-white placeholder:text-gray-500"
                            />
                        </div>
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm min-w-[700px]">
                                    <thead>
                                        <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider">
                                            <th className="px-5 py-3 text-left">User</th>
                                            <th className="px-5 py-3 text-left">Joined</th>
                                            <th className="px-5 py-3 text-left">Status</th>
                                            <th className="px-5 py-3 text-left">Premium Since</th>
                                            <th className="px-5 py-3 text-left text-orange-400">Expiry Date</th>
                                            <th className="px-5 py-3 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800/60">
                                        {filteredUsers.map((u) => (
                                            <tr key={u.email} className="hover:bg-gray-800/30 transition-colors">
                                                <td className="px-5 py-4">
                                                    <p className="font-medium text-white">{u.name}</p>
                                                    <p className="text-xs text-gray-400">{u.email}</p>
                                                    <div className="flex gap-1 mt-1 flex-wrap">
                                                        {u.pendingRequest && <span className="text-[10px] bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded flex items-center gap-1">⏳ Pending Req</span>}
                                                        {u.warning && <span className="text-[10px] bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded flex items-center gap-1"><AlertTriangle className="w-2 h-2" /> {u.warning.length > 20 ? u.warning.slice(0, 20) + '...' : u.warning}</span>}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 text-gray-400 text-xs">{fmt(u.createdAt)}</td>
                                                <td className="px-5 py-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${u.isPremium ? 'bg-yellow-500/15 text-yellow-400' : 'bg-gray-700 text-gray-400'}`}>
                                                        {u.isPremium ? '⭐ Premium' : 'Free'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 text-gray-400 text-xs">{fmt(u.premiumActivatedAt)}</td>
                                                <td className="px-5 py-4 text-xs font-bold text-orange-400">{u.isPremium ? fmt(u.premiumExpiresAt) : '—'}</td>
                                                <td className="px-5 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleInspectUser(u.email)}
                                                            disabled={loadingInspector && inspectingUser === u.email}
                                                            className="p-2 hover:bg-gray-800 rounded-lg text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
                                                            title="Inspect User Data"
                                                        >
                                                            {loadingInspector && inspectingUser === u.email ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                                                        </button>
                                                        <button
                                                            onClick={() => handleSetWarning(u.email)}
                                                            className="p-2 hover:bg-gray-800 rounded-lg text-amber-500 hover:text-amber-400 font-medium"
                                                            title="Send Warning/Message"
                                                        >
                                                            <AlertTriangle className="w-4 h-4" />
                                                        </button>
                                                        {u.isPremium ? (
                                                            <button onClick={() => handleRevoke(u.email)} disabled={loadingAction === u.email + '_revoke'} className="px-3 py-1.5 text-xs bg-red-900/40 hover:bg-red-800/60 text-red-300 rounded-lg font-medium disabled:opacity-50">
                                                                {loadingAction === u.email + '_revoke' ? '...' : 'Revoke'}
                                                            </button>
                                                        ) : (
                                                            <button onClick={() => handleActivate(u.email)} disabled={loadingAction === u.email} className="px-3 py-1.5 text-xs bg-yellow-600/30 hover:bg-yellow-600/50 text-yellow-300 rounded-lg font-medium disabled:opacity-50">
                                                                {loadingAction === u.email ? '...' : '⭐ Activate'}
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredUsers.length === 0 && (
                                            <tr><td colSpan={5} className="px-5 py-12 text-center text-gray-500"><Users className="w-10 h-10 mx-auto mb-3 opacity-30" />No users found</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* ══ REQUESTS ══ */}
                {activeTab === 'requests' && (
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-base font-semibold mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-orange-400" /> Pending ({pendingRequests.length})</h2>
                            {pendingRequests.length === 0 ? (
                                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center text-gray-500"><CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-600" /><p>All reviewed!</p></div>
                            ) : (
                                <div className="space-y-4">
                                    {pendingRequests.map((req) => (
                                        <div key={req.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
                                            <div className="flex items-start justify-between gap-4 flex-wrap">
                                                <div>
                                                    <p className="font-semibold">{req.userName}</p>
                                                    <p className="text-sm text-gray-400">{req.userEmail}</p>
                                                    <p className="text-xs text-gray-500 mt-1">Requested: {fmt(req.requestedAt)}</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-xl font-bold text-green-400">Rs. {req.amount}</span>
                                                    <p className="text-xs text-gray-400">{req.paymentMethod} • {req.planDuration ? req.planDuration.replace('_', ' ').toUpperCase() : 'N/A'}</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                <div className="bg-gray-800 rounded-xl p-3">
                                                    <p className="text-gray-400 text-xs mb-1">Transaction ID</p>
                                                    <p className="font-mono text-blue-300 font-medium break-all">{req.transactionId || '—'}</p>
                                                </div>
                                                <div className="bg-gray-800 rounded-xl p-3">
                                                    <p className="text-gray-400 text-xs mb-1">Method</p>
                                                    <p className="font-medium">{req.paymentMethod}</p>
                                                </div>
                                            </div>
                                            {req.paymentScreenshot && (
                                                <div>
                                                    <p className="text-xs text-gray-400 mb-2">Payment Screenshot:</p>
                                                    <img src={req.paymentScreenshot} alt="Screenshot" className="max-h-56 rounded-xl border border-gray-700 object-contain" />
                                                </div>
                                            )}
                                            <input
                                                placeholder="Add note (optional)..."
                                                value={noteInput[req.id] || ''}
                                                onChange={(e) => setNoteInput((p) => ({ ...p, [req.id]: e.target.value }))}
                                                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
                                            />
                                            <div className="flex gap-3">
                                                <button onClick={() => handleApproveRequest(req)} disabled={loadingAction === req.id} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-700 hover:bg-green-600 rounded-xl font-semibold text-sm disabled:opacity-50">
                                                    <CheckCircle className="w-4 h-4" />{loadingAction === req.id ? 'Processing...' : 'Approve & Activate'}
                                                </button>
                                                <button onClick={() => handleRejectRequest(req)} disabled={loadingAction === req.id + '_reject'} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-900/50 hover:bg-red-800/70 text-red-300 rounded-xl font-semibold text-sm disabled:opacity-50">
                                                    <XCircle className="w-4 h-4" />{loadingAction === req.id + '_reject' ? 'Processing...' : 'Reject'}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {historyRequests.length > 0 && (
                            <div>
                                <h2 className="text-base font-semibold mb-4 flex items-center gap-2 text-gray-400"><FileText className="w-4 h-4" /> History ({historyRequests.length})</h2>
                                <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm min-w-[800px]">
                                            <thead><tr className="border-b border-gray-800 text-gray-400 text-xs uppercase"><th className="px-5 py-3 text-left">User</th><th className="px-5 py-3 text-left">Plan</th><th className="px-5 py-3 text-left">Amount</th><th className="px-5 py-3 text-left">Status</th><th className="px-5 py-3 text-left">Reviewed</th><th className="px-5 py-3 text-left">Expiry</th><th className="px-5 py-3 text-left">Note</th></tr></thead>
                                            <tbody className="divide-y divide-gray-800/60">
                                                {historyRequests.map((req) => (
                                                    <tr key={req.id} className="hover:bg-gray-800/20">
                                                        <td className="px-5 py-4"><p className="font-medium">{req.userName}</p><p className="text-xs text-gray-400">{req.userEmail}</p></td>
                                                        <td className="px-5 py-4 text-xs font-medium text-blue-300 uppercase">{req.planDuration?.replace('_', ' ') || '—'}</td>
                                                        <td className="px-5 py-4 text-green-400 font-semibold">Rs. {req.amount}</td>
                                                        <td className="px-5 py-4"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${req.status === 'approved' ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>{req.status === 'approved' ? '✅ Approved' : '❌ Rejected'}</span></td>
                                                        <td className="px-5 py-4 text-gray-400 text-xs">{fmt(req.reviewedAt)}</td>
                                                        <td className="px-5 py-4 text-xs font-bold text-orange-400">{req.expiryDate ? fmt(req.expiryDate) : '—'}</td>
                                                        <td className="px-5 py-4 text-xs text-gray-400">{req.note || '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ══ SETTINGS ══ */}
                {activeTab === 'settings' && (
                    <div className="space-y-6 max-w-2xl">
                        {/* Payment Numbers */}
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
                            <h2 className="font-semibold flex items-center gap-2"><CreditCard className="w-5 h-5 text-blue-400" /> Payment Numbers (shown to users)</h2>
                            <div className="grid gap-4">
                                {[
                                    { key: 'jazzcash', label: '📱 JazzCash Number' },
                                    { key: 'easypaisa', label: '💚 Easypaisa Number' },
                                    { key: 'bank', label: '🏦 Bank / IBAN' },
                                    { key: 'price1Month', label: '💰 1 Month Price (Rs.)' },
                                    { key: 'price4Months', label: '💰 4 Months Price (Rs.)' },
                                    { key: 'price6Months', label: '💰 6 Months Price (Rs.)' },
                                    { key: 'price1Year', label: '💰 1 Year Price (Rs.)' },
                                ].map(({ key, label }) => (
                                    <div key={key}>
                                        <label className="text-xs text-gray-400 block mb-1">{label}</label>
                                        <input
                                            value={(paySettings as any)[key] || ''}
                                            onChange={(e) => setPaySettings((p) => ({ ...p, [key]: e.target.value }))}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                                            placeholder={label}
                                        />
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={handleSavePaymentSettings}
                                disabled={savingSettings}
                                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold text-sm disabled:opacity-50 transition-colors"
                            >
                                <Save className="w-4 h-4" />{savingSettings ? 'Saving...' : 'Save Payment Settings'}
                            </button>
                            <p className="text-xs text-gray-500">Changes will be reflected instantly in the premium page for all users.</p>
                        </div>

                        {/* Announcement */}
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
                            <h2 className="font-semibold flex items-center gap-2 justify-between">
                                <span className="flex items-center gap-2"><Megaphone className="w-5 h-5 text-yellow-400" /> Announcement Banner</span>
                                {announcement?.isActive && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">● Active</span>}
                            </h2>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Message (shown on Premium page)</label>
                                <textarea
                                    value={announcementText}
                                    onChange={(e) => setAnnouncementText(e.target.value)}
                                    rows={3}
                                    placeholder="e.g. Special Eid offer! 50% off this week only..."
                                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 resize-none"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => handlePostAnnouncement(true)}
                                    disabled={savingSettings || !announcementText.trim()}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-yellow-600 hover:bg-yellow-500 rounded-xl font-semibold text-sm disabled:opacity-50"
                                >
                                    <Megaphone className="w-4 h-4" /> Publish Announcement
                                </button>
                                {announcement?.isActive && (
                                    <button
                                        onClick={() => handlePostAnnouncement(false)}
                                        disabled={savingSettings}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-xl font-semibold text-sm disabled:opacity-50"
                                    >
                                        Disable
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* App Update */}
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
                            <h2 className="font-semibold flex items-center gap-2 justify-between">
                                <span className="flex items-center gap-2"><Smartphone className="w-5 h-5 text-purple-400" /> App Update Notification</span>
                                {appUpdate.isActive && <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full">● Active</span>}
                            </h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">Version Number</label>
                                    <input
                                        value={appUpdate.version}
                                        onChange={(e) => setAppUpdate(p => ({ ...p, version: e.target.value }))}
                                        placeholder="e.g. 1.0.5"
                                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">APK Download URL</label>
                                    <input
                                        value={appUpdate.apkUrl}
                                        onChange={(e) => setAppUpdate(p => ({ ...p, apkUrl: e.target.value }))}
                                        placeholder="https://..."
                                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 bg-gray-800/50 p-3 rounded-xl border border-gray-700">
                                <input
                                    type="checkbox"
                                    id="forceUpdate"
                                    checked={appUpdate.isForceUpdate || false}
                                    onChange={(e) => setAppUpdate(p => ({ ...p, isForceUpdate: e.target.checked }))}
                                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500"
                                />
                                <label htmlFor="forceUpdate" className="text-xs font-medium text-purple-300 cursor-pointer">
                                    Force Update (Users cannot close the notification until updated)
                                </label>
                            </div>

                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Update Message</label>
                                <textarea
                                    value={appUpdate.message}
                                    onChange={(e) => setAppUpdate(p => ({ ...p, message: e.target.value }))}
                                    rows={2}
                                    placeholder="e.g. New features added! Please update for better experience."
                                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 resize-none"
                                />
                            </div>

                            <div className="bg-purple-900/20 border border-purple-500/20 p-3 rounded-lg text-[10px] text-purple-200">
                                <p className="font-bold mb-1">💡 Professional Tip:</p>
                                <p>Upload your APK to <strong>GitHub Releases</strong> and paste the download link above. It's free and professional.</p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => handleSaveAppUpdate(true)}
                                    disabled={savingSettings || !appUpdate.version || !appUpdate.apkUrl}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 rounded-xl font-semibold text-sm disabled:opacity-50"
                                >
                                    <Smartphone className="w-4 h-4" /> Push Update to All
                                </button>
                                {appUpdate.isActive && (
                                    <button
                                        onClick={() => handleSaveAppUpdate(false)}
                                        disabled={savingSettings}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-xl font-semibold text-sm disabled:opacity-50"
                                    >
                                        Disable Notification
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ══ COMPLAINTS ══ */}
                {activeTab === 'complaints' && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-blue-400" />
                            Complaints & Feedback
                        </h2>
                        {allComplaints.length === 0 ? (
                            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center text-gray-500">
                                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>No complaints or feedback received yet.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {allComplaints.map(({ userEmail, userName, complaint }) => (
                                    <div key={complaint.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
                                        <div className="flex justify-between items-start flex-wrap gap-2">
                                            <div>
                                                <p className="font-semibold text-white">{userName}</p>
                                                <p className="text-xs text-gray-400">{userEmail}</p>
                                                <p className="text-[10px] text-gray-500 mt-1">Submitted: {new Date(complaint.createdAt).toLocaleString('en-PK')}</p>
                                            </div>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${complaint.status === 'resolved' ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                                {complaint.status === 'resolved' ? '✅ Resolved' : '⏳ Pending'}
                                            </span>
                                        </div>
                                        <div className="bg-gray-950 p-4 rounded-xl text-sm text-gray-200 border border-gray-800/80">
                                            {complaint.text}
                                        </div>
                                        {complaint.status === 'resolved' ? (
                                            <div className="bg-blue-900/10 border-l-2 border-blue-500 p-3 rounded-lg text-xs text-blue-300">
                                                <span className="font-bold block mb-1">Admin Response:</span>
                                                {complaint.reply}
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <textarea
                                                    placeholder="Write reply & resolve..."
                                                    value={replyText[complaint.id] || ''}
                                                    onChange={e => setReplyText(p => ({ ...p, [complaint.id]: e.target.value }))}
                                                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 resize-none min-h-[60px]"
                                                />
                                                <button
                                                    onClick={() => handleReplyToComplaint(userEmail, complaint.id)}
                                                    disabled={replyingId === complaint.id || !replyText[complaint.id]?.trim()}
                                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold disabled:opacity-50 transition-all flex items-center gap-1.5"
                                                >
                                                    {replyingId === complaint.id ? 'Sending...' : 'Reply & Resolve'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Inspector Modal */}
            {showInspector && inspectingData && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                        <div className="p-6 border-b border-gray-800 flex items-center justify-between sticky top-0 bg-gray-900 z-10 font-sans">
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <Eye className="w-5 h-5 text-blue-400" /> Inspecting User Data
                                </h2>
                                <p className="text-sm text-gray-400">{inspectingUser}</p>
                            </div>
                            <button onClick={() => setShowInspector(false)} className="p-2 hover:bg-gray-800 rounded-full transition-colors">
                                <XCircle className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8 font-sans">
                            {/* Stats Summary */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                                {[
                                    { label: 'Customers', count: (inspectingData.customers?.filter((c: any) => !c.isSupplier).length) || 0, color: 'text-blue-400', id: 'sec-customers' },
                                    { label: 'Suppliers', count: (inspectingData.customers?.filter((c: any) => c.isSupplier).length) || 0, color: 'text-pink-400', id: 'sec-suppliers' },
                                    { label: 'Items', count: inspectingData.items?.length || 0, color: 'text-green-400', id: 'sec-inventory' },
                                    { label: 'Bills', count: inspectingData.transactions?.length || 0, color: 'text-purple-400', id: 'sec-bills' },
                                    { label: 'Dues', count: inspectingData.reminders?.length || 0, color: 'text-orange-400', id: 'sec-dues' },
                                ].map(s => (
                                    <button
                                        key={s.label}
                                        onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' })}
                                        className="bg-gray-800/50 rounded-2xl p-3 sm:p-4 border border-gray-700/50 hover:bg-gray-800 hover:border-gray-600 transition-all text-left"
                                    >
                                        <p className="text-[9px] sm:text-[10px] text-gray-500 uppercase font-bold tracking-wider">{s.label}</p>
                                        <p className={`text-lg sm:text-xl font-bold mt-1 ${s.color}`}>{s.count}</p>
                                    </button>
                                ))}
                            </div>

                            {/* Data Sections */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                                {/* Customers Section */}
                                <div className="space-y-3" id="sec-customers">
                                    <h3 className="font-semibold text-gray-300 flex items-center gap-2 text-sm"><Users className="w-4 h-4" /> Customers</h3>
                                    <div className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden divide-y divide-gray-800 max-h-60 overflow-y-auto">
                                        {inspectingData.customers?.filter((c: any) => !c.isSupplier).length > 0 ? (
                                            inspectingData.customers.filter((c: any) => !c.isSupplier).slice(0, 30).map((c: any) => (
                                                <div key={c.id} className="p-3 text-xs flex items-center justify-between hover:bg-gray-900 transition-colors">
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden border border-gray-700 cursor-pointer"
                                                            onClick={() => c.picture && setViewImage(c.picture)}
                                                        >
                                                            {c.picture ? <img src={c.picture} className="w-full h-full object-cover" /> : <Users className="w-4 h-4 text-gray-600" />}
                                                        </div>
                                                        <span className="text-gray-300 font-medium">{c.name}</span>
                                                    </div>
                                                    <span className="text-gray-500 italic">{c.phone}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-6 text-center text-gray-600 text-xs italic">No customers</div>
                                        )}
                                    </div>
                                </div>

                                {/* Suppliers Section */}
                                <div className="space-y-3" id="sec-suppliers">
                                    <h3 className="font-semibold text-pink-400 flex items-center gap-2 text-sm"><Users className="w-4 h-4" /> Suppliers</h3>
                                    <div className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden divide-y divide-gray-800 max-h-60 overflow-y-auto">
                                        {inspectingData.customers?.filter((c: any) => c.isSupplier).length > 0 ? (
                                            inspectingData.customers.filter((c: any) => c.isSupplier).slice(0, 30).map((c: any) => (
                                                <div key={c.id} className="p-3 text-xs flex items-center justify-between hover:bg-gray-900 transition-colors">
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="w-8 h-8 rounded-md bg-gray-800 flex items-center justify-center overflow-hidden border border-gray-700 cursor-pointer"
                                                            onClick={() => c.picture && setViewImage(c.picture)}
                                                        >
                                                            {c.picture ? <img src={c.picture} className="w-full h-full object-cover" /> : <Shield className="w-4 h-4 text-gray-600" />}
                                                        </div>
                                                        <span className="text-pink-300 font-medium">{c.name}</span>
                                                    </div>
                                                    <span className="text-gray-500 italic">{c.phone}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-6 text-center text-gray-600 text-xs italic">No suppliers</div>
                                        )}
                                    </div>
                                </div>

                                {/* Items Section */}
                                <div className="space-y-3" id="sec-inventory">
                                    <h3 className="font-semibold text-green-400 flex items-center gap-2 text-sm"><Smartphone className="w-4 h-4" /> Inventory</h3>
                                    <div className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden divide-y divide-gray-800 max-h-60 overflow-y-auto">
                                        {inspectingData.items?.length > 0 ? (
                                            inspectingData.items.slice(0, 30).map((i: any) => (
                                                <div key={i.id} className="p-3 text-xs flex items-center justify-between hover:bg-gray-900 transition-colors">
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center overflow-hidden border border-gray-700 cursor-pointer"
                                                            onClick={() => i.picture && setViewImage(i.picture)}
                                                        >
                                                            {i.picture ? <img src={i.picture} className="w-full h-full object-cover" /> : <Package className="w-4 h-4 text-gray-600" />}
                                                        </div>
                                                        <span className="text-gray-300 font-medium">{i.itemName}</span>
                                                    </div>
                                                    <span className="text-green-500">Rs. {i.sellingPrice}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-6 text-center text-gray-600 text-xs italic">No items</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Transactions Section */}
                            <div className="space-y-3 pt-4 border-t border-gray-800" id="sec-bills">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-purple-400 flex items-center gap-2 text-sm"><CreditCard className="w-4 h-4" /> Recent Transactions / Bills</h3>
                                    <span className="text-[10px] text-gray-500 bg-gray-800 px-2 py-0.5 rounded">Showing last 50 transactions</span>
                                </div>
                                <div className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden overflow-x-auto">
                                    <table className="w-full text-xs text-left">
                                        <thead>
                                            <tr className="bg-gray-900 text-gray-400 uppercase tracking-tighter border-b border-gray-800">
                                                <th className="px-4 py-2">Date</th>
                                                <th className="px-4 py-2">Customer</th>
                                                <th className="px-4 py-2">Details</th>
                                                <th className="px-4 py-2">Media</th>
                                                <th className="px-4 py-2 text-right">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-800">
                                            {inspectingData.transactions?.length > 0 ? (
                                                inspectingData.transactions.slice(0, 50).map((t: any) => (
                                                    <tr key={t.id} className="hover:bg-gray-900 transition-colors border-b border-gray-800/30">
                                                        <td className="px-4 py-3 text-gray-400 border-r border-gray-800/30 font-mono text-[10px] whitespace-nowrap">
                                                            {t.date ? new Date(t.date).toLocaleDateString() : '—'}
                                                            <br />
                                                            <span className="opacity-50">{t.date ? new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-200 font-medium border-r border-gray-800/30">
                                                            {t.customerName || 'Direct Sale'}
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-400 border-r border-gray-800/30">
                                                            <div className="space-y-1">
                                                                {t.items ? (
                                                                    t.items.map((it: any, idx: number) => (
                                                                        <div key={idx} className="flex justify-between gap-4 text-[11px]">
                                                                            <span className="text-gray-300">• {it.itemName}</span>
                                                                            <span className="text-gray-500 whitespace-nowrap">{it.quantity} x {it.unitPrice}</span>
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <span className="italic opacity-60 text-[11px]">{t.itemName || 'Manual Entry'} {t.quantity ? `(${t.quantity} unit)` : ''}</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-400 border-r border-gray-800/30">
                                                            <div className="flex gap-2">
                                                                {(t.image || t.picture) && (
                                                                    <button onClick={() => setViewImage(t.image || t.picture)} className="w-8 h-8 rounded bg-blue-500/10 border border-blue-500/20 flex items-center justify-center hover:bg-blue-500/20 flex-shrink-0">
                                                                        <Eye className="w-4 h-4 text-blue-400" />
                                                                    </button>
                                                                )}
                                                                {t.items?.some((it: any) => it.picture) && (
                                                                    <div className="flex -space-x-2">
                                                                        {t.items.filter((it: any) => it.picture).slice(0, 2).map((it: any, idx: number) => (
                                                                            <div
                                                                                key={idx}
                                                                                onClick={() => setViewImage(it.picture)}
                                                                                className="w-8 h-8 rounded border border-gray-700 overflow-hidden cursor-pointer hover:scale-110 transition-transform bg-gray-800 shadow-lg flex-shrink-0"
                                                                            >
                                                                                <img src={it.picture} className="w-full h-full object-cover" />
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <p className="text-green-400 font-bold text-sm">Rs. {t.totalAmount?.toLocaleString()}</p>
                                                            <p className="text-[9px] text-gray-500">Paid: {t.amountPaid || 0}</p>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={5} className="p-12 text-center text-gray-600 text-sm italic">No transactions found</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-800 bg-gray-950/50 flex justify-end font-sans">
                            <button onClick={() => setShowInspector(false)} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-sm shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]">
                                Close Inspector
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Image Dialog for Admin */}
            {viewImage && (
                <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <button
                        onClick={() => setViewImage(null)}
                        className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all hover:rotate-90"
                    >
                        <XCircle className="w-8 h-8" />
                    </button>
                    <div className="max-w-5xl max-h-[90vh] relative">
                        <img
                            src={viewImage}
                            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
                            alt="Preview"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
