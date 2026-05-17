import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction, Customer, Item, BillDesignSettings, getIsPremium } from './data-layer';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

// --- Rewarded Ads Credit System ---
const PDF_CREDITS_KEY = 'cashbookpro_pdf_credits';

export function getPDFCredits(): number {
    if (typeof window === 'undefined') return 0;
    return parseInt(localStorage.getItem(PDF_CREDITS_KEY) || '0', 10);
}

export function usePDFCredit() {
    if (typeof window === 'undefined') return false;
    const current = getPDFCredits();
    if (current > 0) {
        localStorage.setItem(PDF_CREDITS_KEY, (current - 1).toString());
        window.dispatchEvent(new Event('cashbookpro_data_updated'));
        return true;
    }
    return false;
}

export function addPDFCredits(count: number) {
    if (typeof window === 'undefined') return;
    const current = getPDFCredits();
    localStorage.setItem(PDF_CREDITS_KEY, (current + count).toString());
    window.dispatchEvent(new Event('cashbookpro_data_updated'));
}

const saveOrSharePDF = async (doc: jsPDF, filename: string) => {
    if (Capacitor.isNativePlatform()) {
        try {
            const base64Data = doc.output('datauristring').split(',')[1];
            const result = await Filesystem.writeFile({
                path: filename,
                data: base64Data,
                directory: Directory.Cache
            });
            await Share.share({
                title: filename,
                text: 'PDF generated from MyShopBook',
                url: result.uri,
                dialogTitle: 'Share PDF'
            });
        } catch (e) {
            console.error('Native PDF share failed:', e);
            alert("Native PDF Engine Error. Please check permissions.");
        }
    } else {
        doc.save(filename);
    }
};

const formatDateTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    }).replace(',', '');
};

export const generateSingleBillPDF = async (
    transaction: Transaction,
    customer: Customer,
    billSettings: BillDesignSettings
) => {
    const doc = new jsPDF();
    const margin = 15;
    let currentY = 20;

    // --- Premium Background Banner Support ---
    if (billSettings.backgroundBanner && getIsPremium()) {
        try {
            const img = await new Promise<HTMLImageElement>((resolve, reject) => {
                const i = new window.Image();
                i.crossOrigin = "anonymous";
                i.onload = () => resolve(i);
                i.onerror = () => reject('Load failed');
                i.src = billSettings.backgroundBanner!;
            });

            const opacity = billSettings.backgroundOpacity ?? 0.15;
            const scale = billSettings.backgroundScale ?? 1;
            const size = billSettings.backgroundSize || 'cover';
            const position = billSettings.backgroundPosition || 'center';

            let w = 210 * scale;
            let h = 297 * scale;

            if (size === 'contain' || size === 'auto') {
                const imgRatio = img.width / img.height;
                const pageRatio = 210 / 297;
                if (imgRatio > pageRatio) {
                    w = 210 * scale;
                    h = (210 / imgRatio) * scale;
                } else {
                    h = 297 * scale;
                    w = (297 * imgRatio) * scale;
                }
            }

            let x = (210 - w) / 2;
            let y = (297 - h) / 2;

            if (position === 'top') { x = (210 - w) / 2; y = 0; }
            if (position === 'bottom') { x = (210 - w) / 2; y = 297 - h; }
            if (position === 'left') { x = 0; y = (297 - h) / 2; }
            if (position === 'right') { x = 210 - w; y = (297 - h) / 2; }

            doc.setGState(new (doc as any).GState({ opacity }));
            doc.addImage(img, 'JPEG', x, y, w, h, undefined, 'FAST');
            doc.setGState(new (doc as any).GState({ opacity: 1.0 }));
        } catch (e) {
            console.warn('PDF Background load error ignored');
        }
    }

    // Header: Shop Name (Olive Green)
    doc.setFontSize(24);
    doc.setTextColor(107, 122, 80);
    doc.text(billSettings.shopName || 'Business Ledger', 105, currentY, { align: 'center' });
    currentY += 10;

    // Address & Contacts
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    if (billSettings.address) {
        doc.text(billSettings.address, 105, currentY, { align: 'center' });
        currentY += 5;
    }
    const contactText = billSettings.contacts.map(c => `${c.label}: ${c.phone}`).join(' | ');
    doc.text(contactText, 105, currentY, { align: 'center' });
    currentY += 6;

    // Watermark under contacts
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    doc.text("Generated by myshopbook.vercel.app", 105, currentY, { align: 'center' });
    currentY += 10;

    // Divider
    doc.setDrawColor(107, 122, 80);
    doc.setLineWidth(0.5);
    doc.line(margin, currentY - 5, 210 - margin, currentY - 5);
    currentY += 10;

    // Bill Info & Customer Info (Matching Image 1)
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text(`Bill To: ${customer.name}`, margin, currentY);
    doc.setFont("helvetica", "normal");
    doc.text(`Date: ${formatDateTime(transaction.date)}`, 210 - margin, currentY, { align: 'right' });
    currentY += 6;

    // Customer Phone (Missing in Image 2, restored here)
    if (customer.phone) {
        doc.text(`Phone: ${customer.phone}`, margin, currentY);
        currentY += 6;
    }
    doc.text(`Bill #: ${transaction.billNumber || 'Ref'}`, margin, currentY);
    currentY += 12;

    // Items Table
    const tableData = (transaction.items || []).map((item, index) => [
        index + 1,
        item.itemName,
        item.quantity,
        item.unitPrice.toLocaleString(),
        (item.quantity * item.unitPrice).toLocaleString()
    ]);

    autoTable(doc, {
        startY: currentY,
        head: [[
            { content: '#', styles: { halign: 'center' } },
            { content: 'Item Name', styles: { halign: 'left' } },
            { content: 'Qty', styles: { halign: 'center' } },
            { content: 'Unit Price', styles: { halign: 'right' } },
            { content: 'Total', styles: { halign: 'right' } }
        ]],
        body: tableData,
        theme: 'striped',
        headStyles: {
            fillColor: false,
            textColor: [107, 122, 80],
            fontStyle: 'bold',
            lineWidth: { bottom: 0.5, top: 0.5 },
            lineColor: [107, 122, 80]
        },
        styles: { fontSize: 10, cellPadding: 3, textColor: 0, fontStyle: 'bold' },
        bodyStyles: {
            fillColor: false,
            lineWidth: { bottom: 0.1 },
            lineColor: [107, 122, 80]
        },
        alternateRowStyles: {
            fillColor: false,
            lineWidth: { bottom: 0.1 },
            lineColor: [107, 122, 80]
        },
        columnStyles: { 0: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'right' }, 4: { halign: 'right' } }
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;

    // Summary
    const totalPaid = (transaction.amountPaid || 0) + (transaction.additionalPayments?.reduce((sum, p) => sum + p.amount, 0) || 0);
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text(`Bill Total: ${transaction.totalAmount.toLocaleString()}`, 210 - margin, currentY, { align: 'right' });
    currentY += 5;
    if (transaction.previousBalance) {
        doc.text(`Previous Balance: ${transaction.previousBalance.toLocaleString()}`, 210 - margin, currentY, { align: 'right' });
        currentY += 5;
    }
    doc.setFontSize(14);
    doc.setTextColor(107, 122, 80);
    doc.setFont("helvetica", "bold");
    doc.text(`Grand Total: ${(transaction.grandTotal || (transaction.totalAmount + (transaction.previousBalance || 0))).toLocaleString()}`, 210 - margin, currentY, { align: 'right' });
    currentY += 15;

    // Payments Section (Restoring Date/Time and Notes from Image 1)
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text("Payments", margin, currentY);
    currentY += 8;

    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");

    if (transaction.amountPaid > 0) {
        const initialDate = formatDateTime(transaction.date);
        doc.text(`Initial Payment on ${initialDate}`, margin + 5, currentY);
        doc.text(transaction.amountPaid.toLocaleString(), 210 - margin, currentY, { align: 'right' });
        currentY += 6;
    }

    transaction.additionalPayments?.forEach(p => {
        const pDate = formatDateTime(p.date);
        const notePart = p.notes ? ` (${p.notes})` : '';
        doc.text(`Payment on ${pDate}${notePart}`, margin + 5, currentY);
        doc.text(p.amount.toLocaleString(), 210 - margin, currentY, { align: 'right' });
        currentY += 6;
    });

    currentY += 10;

    // Final Totals
    doc.line(210 - margin - 40, currentY - 5, 210 - margin, currentY - 5);
    doc.setFontSize(11);
    doc.setTextColor(22, 163, 74);
    doc.setFont("helvetica", "bold");
    doc.text(`Total Paid: ${totalPaid.toLocaleString()}`, 210 - margin, currentY, { align: 'right' });
    currentY += 8;

    doc.setFontSize(16);
    doc.setTextColor(180, 0, 0);
    doc.text(`Remaining Balance: PS. ${transaction.remainingBalance.toLocaleString()}`, 210 - margin, currentY, { align: 'right' });

    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.setFont("helvetica", "normal");

    // Central Footer
    doc.text("Account Managed by CashbookPro", 105, pageHeight - 15, { align: 'center' });
    if (billSettings.footer) {
        doc.text(billSettings.footer, 105, pageHeight - 10, { align: 'center' });
    }

    await saveOrSharePDF(doc, `Bill_${transaction.billNumber || 'Ref'}.pdf`);
};

export const generateFullKhataPDF = async (
    customer: Customer,
    transactions: Transaction[],
    billSettings: BillDesignSettings
) => {
    const doc = new jsPDF();
    const margin = 15;
    let currentY = 20;

    doc.setFontSize(22);
    doc.setTextColor(107, 122, 80);
    doc.text(billSettings.shopName || 'Business Ledger', 105, currentY, { align: 'center' });
    currentY += 15;
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text(`Khata Statement: ${customer.name}`, 105, currentY, { align: 'center' });
    currentY += 15;

    const tableData = transactions.map((tx) => [
        new Date(tx.date).toLocaleDateString(),
        tx.notes || (tx.type === 'debit' ? 'Payment' : 'Sale'),
        tx.totalAmount.toLocaleString(),
        (tx.amountPaid + (tx.additionalPayments?.reduce((s, p) => s + p.amount, 0) || 0)).toLocaleString(),
        tx.remainingBalance.toLocaleString()
    ]);

    autoTable(doc, {
        startY: currentY,
        head: [['Date', 'Description', 'Amount', 'Paid', 'Balance']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [107, 122, 80] }
    });

    await saveOrSharePDF(doc, `Khata_${customer.name}.pdf`);
};

export const generateTransactionsReportPDF = async (
    transactions: Transaction[],
    billSettings: BillDesignSettings,
    title: string = 'Transactions Report'
) => {
    const doc = new jsPDF();
    const margin = 15;
    let currentY = 20;

    doc.setFontSize(22);
    doc.setTextColor(107, 122, 80);
    doc.text(billSettings.shopName || 'Business Ledger', 105, currentY, { align: 'center' });
    currentY += 15;
    doc.text(title, 105, currentY, { align: 'center' });
    currentY += 15;

    const tableData = transactions.map((tx) => [
        new Date(tx.date).toLocaleDateString(),
        tx.customerName || 'N/A',
        tx.totalAmount.toLocaleString(),
        tx.remainingBalance.toLocaleString()
    ]);

    autoTable(doc, {
        startY: currentY,
        head: [['Date', 'Customer', 'Amount', 'Balance']],
        body: tableData,
        theme: 'grid'
    });

    await saveOrSharePDF(doc, `Report.pdf`);
};
