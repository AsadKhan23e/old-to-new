import { BillDesignSettings, Transaction, Customer, getIsPremium } from "@/lib/data-layer";
import { Camera } from "lucide-react";
import Image from "next/image";

type BillRendererProps = {
    bill: Transaction;
    settings: BillDesignSettings;
    customer?: Customer;
    runningBalance?: number;
    onViewImage?: (image: string) => void;
};

const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
};

const formatPaymentDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    const datePart = date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    const timePart = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${datePart} at ${timePart}`;
};

export const BillRenderer = ({ bill, settings, customer, runningBalance, onViewImage }: BillRendererProps) => {
    const isPurchase = bill.type === 'purchase';
    const totalPaid = (bill.amountPaid || 0) + (bill.additionalPayments?.reduce((sum, p) => sum + p.amount, 0) || 0);
    const finalBalance = runningBalance !== undefined ? runningBalance : bill.remainingBalance;

    // LEGACY RENDERER (Exactly as per User preference: Image 1 look with Payments)
    const partyLabel = isPurchase ? 'Supplier' : 'Customer';
    return (
        <div className="relative bg-white min-h-[400px]">
            {/* Background Banner Layer (Watermark for Premium) */}
            {settings.backgroundBanner && getIsPremium() && (
                <div className="absolute inset-0 z-0 opacity-[0.3] pointer-events-none">
                    <img
                        src={settings.backgroundBanner}
                        alt=""
                        className="w-full h-full object-cover"
                        crossOrigin="anonymous"
                    />
                </div>
            )}

            <div className={`relative z-10 p-6 ${settings.backgroundBanner ? 'bg-white/70 backdrop-blur-[1px]' : 'bg-white'} text-black font-sans text-sm`}>
                <header className="text-center mb-6">
                    {settings.logo && (
                        <div className="mb-2">
                            <img src={settings.logo} alt="Shop Logo" className="mx-auto h-16 w-16 rounded-full object-cover border" />
                        </div>
                    )}
                    <h1 className="text-2xl font-bold mb-1 text-[#6B7A50]">{settings.shopName}</h1>
                    <p className="text-xs text-muted-foreground">{settings.address}</p>
                    <div className="text-xs mt-1 text-muted-foreground">
                        {settings.contacts.map(c => <span key={c.id} className="inline-block mx-2">{c.label}: {c.phone}</span>)}
                    </div>
                </header>

                <div className="border-t pt-4 my-4 space-y-1">
                    <div className="flex justify-between">
                        <span>Bill #: {bill.billNumber || 'Ref'}</span>
                        <span>Date: {formatDateTime(bill.date)}</span>
                    </div>
                    <div className="flex flex-col">
                        <p>{partyLabel}: {bill.customerName}</p>
                        {customer?.phone && (
                            <p className="text-xs text-muted-foreground">Phone: {customer.phone}</p>
                        )}
                    </div>
                </div>

                <div className="my-6">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b-2 border-[#6B7A50]">
                                <th className="text-left py-2 font-bold uppercase text-[11px] text-[#6B7A50]">Item</th>
                                <th className="text-center py-2 font-bold uppercase text-[11px] text-[#6B7A50]">Qty</th>
                                <th className="text-right py-2 font-bold uppercase text-[11px] text-[#6B7A50]">Price</th>
                                <th className="text-right py-2 font-bold uppercase text-[11px] text-[#6B7A50]">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(bill.items || []).map((item, index) => (
                                <tr key={index} className="border-b border-gray-100">
                                    <td className="py-2">{item.itemName}</td>
                                    <td className="text-center py-2">{item.quantity}</td>
                                    <td className="text-right py-2">{item.unitPrice.toLocaleString()}</td>
                                    <td className="text-right py-2 font-medium">{(item.quantity * item.unitPrice).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-4 text-right space-y-1">
                    <p className="text-sm text-muted-foreground">Items Total: <span className="text-foreground">{bill.totalAmount.toLocaleString()}</span></p>
                    {(bill.previousBalance || 0) !== 0 && (
                        <p className="text-sm text-muted-foreground">Previous Balance: <span className="text-foreground">{(bill.previousBalance || 0).toLocaleString()}</span></p>
                    )}
                    <p className="text-lg font-bold text-[#6B7A50]">Grand Total: {(bill.grandTotal || bill.totalAmount).toLocaleString()}</p>
                </div>

                {/* Payments Section */}
                {(bill.amountPaid > 0 || (bill.additionalPayments && bill.additionalPayments.length > 0)) && (
                    <div className="mt-6 border-t pt-4">
                        <h3 className="font-bold text-[#6B7A50] mb-2 uppercase text-[10px] tracking-wider">Payments</h3>
                        <div className="space-y-1 text-xs">
                            {bill.amountPaid > 0 && (
                                <div className="flex justify-between">
                                    <span>Initial Payment</span>
                                    <span className="font-medium">{bill.amountPaid.toLocaleString()}</span>
                                </div>
                            )}
                            {bill.additionalPayments?.map(p => (
                                <div key={p.id} className="flex justify-between items-center">
                                    <span>
                                        Add. Payment {p.notes ? `(${p.notes})` : ''}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        {p.image && onViewImage && (
                                            <button onClick={(e) => { e.stopPropagation(); onViewImage!(p.image!); }} className="text-orange-500">
                                                <Camera className="h-3 w-3" />
                                            </button>
                                        )}
                                        <span className="font-medium">{p.amount.toLocaleString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="mt-6 border-t pt-4 flex flex-col items-end space-y-1">
                    <div className="flex justify-between w-full max-w-[200px] text-green-600 font-semibold">
                        <span>Total Paid:</span>
                        <span>{totalPaid.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between w-full max-w-[200px] text-red-600 font-bold text-lg">
                        <span>Remaining Balance:</span>
                        <span>{finalBalance.toLocaleString()}</span>
                    </div>
                </div>

                {/* Account Managed by Footer */}
                <div className="mt-12 pt-4 border-t text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Account Managed by CashbookPro</p>
                </div>

                {settings.footer && (
                    <div className="mt-2 text-center text-xs text-muted-foreground italic">
                        {settings.footer}
                    </div>
                )}
            </div>
        </div>
    );
};
