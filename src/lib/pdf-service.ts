import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction, Customer, Item, BillDesignSettings } from './data-layer';
import { Capacitor } from '@capacitor/core';

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

function getIsPremiumLocal(): boolean {
    if (typeof window === 'undefined') return false;

    // Check if premium bought
    if (localStorage.getItem('cashbookpro_isPremium') === 'true') return true;

    // Check 3-day trial
    const createdAtStr = localStorage.getItem('cashbookpro_createdAt');
    if (createdAtStr) {
        const signupDate = new Date(createdAtStr);
        const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
        const trialExpiry = new Date(signupDate.getTime() + threeDaysInMs);
        return new Date() < trialExpiry;
    }
    return false;
}

import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

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

export const generateSingleBillPDF = async (
    transaction: Transaction,
    customer: Customer,
    billSettings: BillDesignSettings
) => {
    // Credits check removed to ensure PDF generation works while ads are handled via popunders in UI

    const doc = new jsPDF();
    const margin = 15;
    let currentY = 20;

    // Header: Shop Name
    doc.setFontSize(24);
    doc.setTextColor(47, 47, 47);
    doc.text(billSettings.shopName || 'Business Ledger', 105, currentY, { align: 'center' });
    currentY += 10;

    // Address & Contacts
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    if (billSettings.address) {
        doc.text(billSettings.address, 105, currentY, { align: 'center' });
        currentY += 5;
    }
    const contactText = billSettings.contacts.map(c => `${c.label}: ${c.phone}`).join(' | ');
    doc.text(contactText, 105, currentY, { align: 'center' });
    currentY += 15;

    // Divider
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, currentY, 210 - margin, currentY);
    currentY += 10;

    // Bill Info & Customer Info
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Bill To: ${customer.name}`, margin, currentY);
    doc.text(`Date: ${new Date(transaction.date).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`, 210 - margin, currentY, { align: 'right' });
    currentY += 7;
    doc.text(`Phone: ${customer.phone}`, margin, currentY);
    currentY += 7;
    doc.text(`Bill #: ${transaction.billNumber || 'N/A'}`, margin, currentY);
    currentY += 15;

    // Items Table
    const tableData = (transaction.items || []).map((item, index) => [
        index + 1,
        item.itemName,
        item.quantity,
        item.unitPrice.toLocaleString(),
        (item.quantity * item.unitPrice).toLocaleString()
    ]);

    if (transaction.itemName) {
        tableData.push([
            1,
            transaction.itemName,
            transaction.quantity || 1,
            (transaction.unitPrice || 0).toLocaleString(),
            (transaction.totalAmount || 0).toLocaleString()
        ]);
    }

    autoTable(doc, {
        startY: currentY,
        head: [['#', 'Item Name', 'Qty', 'Unit Price', 'Total']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [107, 122, 80] }, // Match the app's green
        margin: { left: margin, right: margin }
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;

    // Pre-calculate totals for summary
    const totalPaid = (transaction.amountPaid || 0) + (transaction.additionalPayments?.reduce((sum, p) => sum + p.amount, 0) || 0);
    const rightAlignX = 210 - margin;

    // Summary Section
    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);
    doc.text(`Bill Total: ${transaction.totalAmount.toLocaleString()}`, rightAlignX, currentY, { align: 'right' });
    currentY += 6;
    doc.text(`Previous Balance: ${(transaction.previousBalance || 0).toLocaleString()}`, rightAlignX, currentY, { align: 'right' });
    currentY += 8;

    doc.setFontSize(13);
    doc.setTextColor(0);
    doc.text(`Grand Total: ${(transaction.grandTotal || transaction.totalAmount + (transaction.previousBalance || 0)).toLocaleString()}`, rightAlignX, currentY, { align: 'right' });
    currentY += 10;

    // Payments Section
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("Payments", margin, currentY);
    currentY += 10;

    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);

    const formatDateFull = (dateStr: string) => {
        return new Date(dateStr).toLocaleString([], {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }).replace(',', '');
    };

    if (transaction.amountPaid > 0) {
        doc.text(`Initial Payment on ${formatDateFull(transaction.date)}`, margin + 5, currentY);
        doc.text(`${transaction.amountPaid.toLocaleString()}`, rightAlignX, currentY, { align: 'right' });
        currentY += 6;
    }

    (transaction.additionalPayments || []).forEach(p => {
        const pDateText = formatDateFull(p.date);
        const pNotesText = p.notes ? ` (${p.notes})` : '';
        doc.text(`Payment on ${pDateText}${pNotesText}`, margin + 5, currentY);
        doc.text(`${p.amount.toLocaleString()}`, rightAlignX, currentY, { align: 'right' });
        currentY += 6;
    });

    // Divider for Totals
    currentY += 4;
    doc.setDrawColor(230, 230, 230);
    doc.line(margin + 50, currentY, rightAlignX, currentY);
    currentY += 8;

    doc.setFontSize(11);
    doc.setTextColor(22, 163, 74); // Green for total paid
    doc.text(`Total Paid:`, rightAlignX - 40, currentY, { align: 'right' });
    doc.text(`${totalPaid.toLocaleString()}`, rightAlignX, currentY, { align: 'right' });
    currentY += 8;

    doc.setFontSize(14);
    doc.setTextColor(180, 0, 0); // Red for balance
    doc.text(`Remaining Balance: PS. ${transaction.remainingBalance.toLocaleString()}`, rightAlignX, currentY, { align: 'right' });

    // Notes
    if (transaction.notes) {
        currentY += 15;
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text("Notes:", margin, currentY);
        currentY += 5;
        doc.text(transaction.notes, margin, currentY, { maxWidth: 180 });
    }

    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(billSettings.footer || 'Generated by MyShopBook', 105, pageHeight - 15, { align: 'center' });

    await saveOrSharePDF(doc, `Bill_${transaction.billNumber || 'Ref'}_${customer.name}.pdf`);
};

export const generateFullKhataPDF = async (
    customer: Customer,
    transactions: Transaction[],
    billSettings: BillDesignSettings
) => {
    // Credits check removed

    const doc = new jsPDF();
    const margin = 15;
    let currentY = 20;

    // Header: Shop Name
    doc.setFontSize(24);
    doc.setTextColor(47, 47, 47);
    doc.text(billSettings.shopName || 'Business Ledger', 105, currentY, { align: 'center' });
    currentY += 10;

    // Address & Contacts
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    if (billSettings.address) {
        doc.text(billSettings.address, 105, currentY, { align: 'center' });
        currentY += 5;
    }
    const contactText = billSettings.contacts.map(c => `${c.label}: ${c.phone}`).join(' | ');
    doc.text(contactText, 105, currentY, { align: 'center' });
    currentY += 15;

    // Title
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text(`Full Khata Statement: ${customer.name}`, 105, currentY, { align: 'center' });
    currentY += 12;

    // Customer Summary
    doc.setFontSize(11);
    doc.setTextColor(80);
    doc.text(`Statement Period: All Time`, margin, currentY);
    doc.text(`Generated On: ${new Date().toLocaleString()}`, 210 - margin, currentY, { align: 'right' });
    currentY += 10;

    // Ledger Table
    const tableData = transactions.map((tx) => [
        new Date(tx.date).toLocaleDateString(),
        tx.type === 'debit' ? 'Cash/Other Payment' : (tx.items ? `Purchased (${tx.items.length} items)` : tx.itemName || 'Sale/Transaction'),
        tx.type === 'debit' ? '-' : (tx.grandTotal || tx.totalAmount).toLocaleString(),
        (tx.amountPaid + (tx.additionalPayments?.reduce((s, p) => s + p.amount, 0) || 0) + (tx.type === 'debit' ? tx.totalAmount : 0)).toLocaleString(),
        tx.remainingBalance.toLocaleString()
    ]);

    autoTable(doc, {
        startY: currentY,
        head: [['Date', 'Transaction Details', 'Bill Amount', 'Paid', 'Balance']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [140, 106, 79] }, // Brownish for Khata
        styles: { fontSize: 9 },
        columnStyles: {
            2: { halign: 'right' },
            3: { halign: 'right' },
            4: { halign: 'right', fontStyle: 'bold' }
        }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;

    // Final Balance Summary box
    const totalBalance = transactions.length > 0 ? transactions[0].remainingBalance : 0; // Latest is first in our display logic

    doc.setFillColor(245, 245, 245);
    doc.rect(margin, finalY, 180, 20, 'F');
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Total Outstanding Balance:`, margin + 5, finalY + 12);
    doc.setFontSize(16);
    doc.setTextColor(180, 0, 0);
    doc.text(`PS. ${totalBalance.toLocaleString()}`, 210 - margin - 5, finalY + 12, { align: 'right' });

    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(billSettings.footer || 'Generated by MyShopBook', 105, pageHeight - 15, { align: 'center' });

    await saveOrSharePDF(doc, `Full_Khata_${customer.name}.pdf`);
};

export const generateTransactionsReportPDF = async (
    transactions: Transaction[],
    billSettings: BillDesignSettings,
    title: string = 'Transactions Report'
) => {
    const doc = new jsPDF();
    const margin = 15;
    let currentY = 20;

    // Header: Shop Name
    doc.setFontSize(22);
    doc.setTextColor(47, 47, 47);
    doc.text(billSettings.shopName || 'Business Ledger', 105, currentY, { align: 'center' });
    currentY += 10;

    // Title
    doc.setFontSize(16);
    doc.text(title, 105, currentY, { align: 'center' });
    currentY += 15;

    // Table
    const tableData = transactions.map((tx) => [
        new Date(tx.date).toLocaleDateString(),
        tx.customerName || 'N/A',
        tx.type?.toUpperCase() || 'TX',
        tx.totalAmount.toLocaleString(),
        tx.amountPaid.toLocaleString(),
        tx.remainingBalance.toLocaleString()
    ]);

    autoTable(doc, {
        startY: currentY,
        head: [['Date', 'Customer', 'Type', 'Total', 'Paid', 'Balance']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [75, 85, 99] }, // Grayish for general reports
        styles: { fontSize: 8 },
    });

    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(billSettings.footer || 'Generated by MyShopBook', 105, pageHeight - 15, { align: 'center' });

    await saveOrSharePDF(doc, `Transactions_Report_${new Date().toISOString().split('T')[0]}.pdf`);
};
