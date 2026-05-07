import { BillDesignSettings, Transaction } from "@/lib/data-layer";
import { Camera } from "lucide-react";
import Image from "next/image";

type BillRendererProps = {
    bill: Transaction;
    settings: BillDesignSettings;
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

export const BillRenderer = ({ bill, settings, runningBalance, onViewImage }: BillRendererProps) => {
    const isPurchase = bill.type === 'purchase';
    const title = isPurchase ? 'SUPPLIER BILL' : 'CUSTOMER BILL';
    const partyLabel = isPurchase ? 'Supplier' : 'Customer';
    const totalPaid = (bill.amountPaid || 0) + (bill.additionalPayments?.reduce((sum, p) => sum + p.amount, 0) || 0);

    // Use the provided runningBalance if available, otherwise fall back to the stored remainingBalance.
    // The runningBalance is the more accurate, up-to-date value.
    const finalBalance = runningBalance !== undefined ? runningBalance : bill.remainingBalance;

    return (
        <div className={`p-4 bg-white text-black font-sans text-sm bill-template-${settings.template}`}>
            <header className="text-center mb-4 border-b pb-4">
                {settings.logo && (
                    <Image src={settings.logo} alt="Shop Logo" width={80} height={80} className="mx-auto rounded-full mb-2 object-cover" />
                )}
                <h1 className="text-xl font-bold">{settings.shopName}</h1>
                <p className="text-xs">{settings.address}</p>
                <div className="text-xs mt-1">
                    {settings.contacts.map(c => <span key={c.id} className="inline-block mx-2">{c.label}: {c.phone}</span>)}
                </div>
            </header>
            <div className="my-4">
                <div className="flex justify-between">
                    <span>Bill #: {bill.billNumber}</span>
                    <span>Date: {formatDateTime(bill.date)}</span>
                </div>
                <p className="mt-1">{partyLabel}: {bill.customerName}</p>
            </div>
            <div className="border-y py-2 my-2">
                <table className="w-full">
                    <thead>
                        <tr className="border-b">
                            <th className="text-left pb-1 font-semibold">Item</th>
                            <th className="text-center pb-1 font-semibold">Qty</th>
                            <th className="text-right pb-1 font-semibold">Rate</th>
                            <th className="text-right pb-1 font-semibold">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(bill.items || []).map((item, index) => (
                            <tr key={index} className="border-b border-gray-50">
                                <td className="py-1">
                                    <div className="font-medium">{item.itemName}</div>
                                    {item.notes && <div className="text-[10px] text-gray-500 italic leading-tight">{item.notes}</div>}
                                </td>
                                <td className="text-center">{item.quantity}</td>
                                <td className="text-right">{item.unitPrice.toLocaleString()}</td>
                                <td className="text-right">{(item.quantity * item.unitPrice).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="mt-2 text-right space-y-1">
                <p>Bill Total: <span className="font-semibold">{bill.totalAmount.toLocaleString()}</span></p>
                <p>Previous Balance: <span className="font-semibold">{(bill.previousBalance || 0).toLocaleString()}</span></p>
                <p className="font-bold text-base">Grand Total: <span className="font-bold">{(bill.grandTotal || 0).toLocaleString()}</span></p>
            </div>

            {(bill.amountPaid > 0 || (bill.additionalPayments && bill.additionalPayments.length > 0)) && (
                <div className="mt-4 border-t pt-2">
                    <h3 className="font-semibold text-left mb-2">Payments</h3>
                    <div className="space-y-1 text-xs">
                        {bill.amountPaid > 0 && (
                            <div className="flex justify-between">
                                <span>Initial Payment on {formatPaymentDateTime(bill.date)}</span>
                                <span className="font-medium">{bill.amountPaid.toLocaleString()}</span>
                            </div>
                        )}
                        {bill.additionalPayments?.map(p => (
                            <div key={p.id} className="flex justify-between items-center">
                                <span>
                                    Payment on {formatPaymentDateTime(p.date)}
                                    {p.notes && <span className="text-gray-500"> ({p.notes})</span>}
                                </span>
                                <div className="flex items-center gap-2">
                                    {p.image && onViewImage && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onViewImage!(p.image!); }}
                                            className="text-orange-500 hover:text-orange-600 transition-colors"
                                            title="View Payment Proof"
                                        >
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

            <div className="mt-2 text-right space-y-1 border-t pt-2">
                <p>Total Paid: <span className="font-semibold text-green-600">{totalPaid.toLocaleString()}</span></p>
                <p className="font-bold text-base">Remaining Balance: <span className="font-bold text-red-600">{finalBalance.toLocaleString()}</span></p>
            </div>

            {bill.notes && (
                <div className="mt-4 text-xs">
                    <p className="font-semibold">Notes:</p>
                    <p>{bill.notes}</p>
                </div>
            )}
            {settings.footer && (
                <footer className="text-center text-xs mt-4 pt-2 border-t">
                    <p>{settings.footer}</p>
                </footer>
            )}
        </div>
    );
};
