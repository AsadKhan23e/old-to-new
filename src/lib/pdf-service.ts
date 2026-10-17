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
        // Support Web Share API with files if available on mobile browser
        if (typeof navigator !== 'undefined' && navigator.canShare) {
            try {
                const blob = doc.output('blob');
                const file = new File([blob], filename, { type: 'application/pdf' });
                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        title: filename,
                        text: 'PDF generated from MyShopBook',
                        files: [file]
                    });
                    return;
                }
            } catch (err: any) {
                if (err.name === 'AbortError') return; // User cancelled share sheet
                console.log('Web share fallback to save:', err);
            }
        }
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

    // --- Background Banner Support ---
    if (billSettings.backgroundBanner) {
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
    const billNumStr = `Bill #: ${transaction.billNumber || 'Ref'}${transaction.isEdited && !transaction.hideEditedBadge ? ' (Edited / تبدیل شدہ)' : ''}`;
    doc.text(billNumStr, margin, currentY);
    currentY += 12;

    // Items Table - build rows; if an item has notes, add a sub-row
    const tableBody: any[] = [];
    (transaction.items || []).forEach((item, index) => {
        tableBody.push([
            index + 1,
            item.itemName,
            item.quantity,
            item.unitPrice.toLocaleString(),
            (item.quantity * item.unitPrice).toLocaleString()
        ]);
        if (item.notes && item.notes.trim()) {
            tableBody.push([
                { content: '', styles: { fontStyle: 'italic' } },
                { content: `  ↳ ${item.notes.trim()}`, colSpan: 4, styles: { fontStyle: 'italic', textColor: [100, 100, 100], fontSize: 8.5, cellPadding: { top: 0, bottom: 2, left: 6, right: 3 } } }
            ]);
        }
    });

    autoTable(doc, {
        startY: currentY,
        head: [[
            { content: '#', styles: { halign: 'center' } },
            { content: 'Item Name', styles: { halign: 'left' } },
            { content: 'Qty', styles: { halign: 'center' } },
            { content: 'Unit Price', styles: { halign: 'right' } },
            { content: 'Total', styles: { halign: 'right' } }
        ]],
        body: tableBody,
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

    if (!transaction.hideEditedBadge && transaction.billAdjustments && transaction.billAdjustments.length > 0) {
        currentY += 2;
        doc.setTextColor(180, 83, 9);
        transaction.billAdjustments.forEach(adj => {
            const adjDate = formatDateTime(adj.editedAt);
            const diffText = `${adj.difference > 0 ? '+' : ''}${adj.difference.toLocaleString()}`;
            doc.text(`Adjustment on ${adjDate} (${adj.previousGrandTotal?.toLocaleString() || 0} -> ${adj.newGrandTotal?.toLocaleString() || 0})`, margin + 5, currentY);
            doc.text(diffText, 210 - margin, currentY, { align: 'right' });
            currentY += 5;

            // Print item changes if available or deduce legacy added item
            let itemChanges = adj.changes;
            if ((!itemChanges || itemChanges.length === 0) && !adj.itemsSummary && adj.difference > 0 && transaction.items) {
                const match = transaction.items.find(it => (it.quantity * it.unitPrice) === adj.difference);
                if (match) {
                    itemChanges = [{
                        type: 'added',
                        itemName: match.itemName,
                        description: `Qty: ${match.quantity} × Rs. ${match.unitPrice.toLocaleString()} = +Rs. ${adj.difference.toLocaleString()}`
                    }];
                }
            }

            if (itemChanges && itemChanges.length > 0) {
                doc.setFontSize(8);
                itemChanges.forEach(ch => {
                    const tag = ch.type === 'added' ? '+ Added:' : ch.type === 'removed' ? '- Removed:' : '~ Changed:';
                    doc.text(`   ${tag} ${ch.itemName} (${ch.description})`, margin + 5, currentY);
                    currentY += 4;
                });
                doc.setFontSize(9);
            } else if (adj.itemsSummary) {
                doc.setFontSize(8);
                const sumLines = adj.itemsSummary.split('\n');
                sumLines.forEach(l => {
                    doc.text(`   ${l}`, margin + 5, currentY);
                    currentY += 4;
                });
                doc.setFontSize(9);
            }
            currentY += 1;
        });
        doc.setTextColor(0);
    }

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
    doc.text(`Remaining Balance: Rs. ${transaction.remainingBalance.toLocaleString()}`, 210 - margin, currentY, { align: 'right' });

    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.setFont("helvetica", "normal");

    // Central Footer removed as per user request
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
    const margin = 14;
    const pageWidth = 210;
    const pageHeight = 297;
    let currentY = 16;

    // --- Background Banner Support ---
    if (billSettings.backgroundBanner) {
        try {
            const img = await new Promise<HTMLImageElement>((resolve, reject) => {
                const i = new window.Image();
                i.crossOrigin = "anonymous";
                i.onload = () => resolve(i);
                i.onerror = () => reject('Load failed');
                i.src = billSettings.backgroundBanner!;
            });

            const opacity = billSettings.backgroundOpacity ?? 0.12;
            const scale = billSettings.backgroundScale ?? 1;
            let w = pageWidth * scale;
            let h = pageHeight * scale;
            let x = (pageWidth - w) / 2;
            let y = (pageHeight - h) / 2;

            doc.setGState(new (doc as any).GState({ opacity }));
            doc.addImage(img, 'JPEG', x, y, w, h, undefined, 'FAST');
            doc.setGState(new (doc as any).GState({ opacity: 1.0 }));
        } catch (e) {
            console.warn('PDF Background load error ignored');
        }
    }

    // --- Header: Shop Info ---
    doc.setFontSize(22);
    doc.setTextColor(107, 122, 80);
    doc.setFont("helvetica", "bold");
    doc.text(billSettings.shopName || 'Business Ledger', pageWidth / 2, currentY, { align: 'center' });
    currentY += 6;

    doc.setFontSize(9);
    doc.setTextColor(80);
    doc.setFont("helvetica", "normal");
    if (billSettings.address) {
        doc.text(billSettings.address, pageWidth / 2, currentY, { align: 'center' });
        currentY += 4.5;
    }
    const contactText = billSettings.contacts?.filter(c => c.phone).map(c => `${c.label}: ${c.phone}`).join(' | ');
    if (contactText) {
        doc.text(contactText, pageWidth / 2, currentY, { align: 'center' });
        currentY += 4.5;
    }
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text("Generated by myshopbook.vercel.app", pageWidth / 2, currentY, { align: 'center' });
    currentY += 5;

    // Header Divider
    doc.setDrawColor(107, 122, 80);
    doc.setLineWidth(0.6);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 7;

    // --- Customer Info & Statement Header ---
    doc.setFontSize(13);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text(`Khata Statement / کھاتہ تفصیل: ${customer.name}`, margin, currentY);
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60);
    doc.text(`Statement Date: ${new Date().toLocaleDateString('en-GB')}`, pageWidth - margin, currentY, { align: 'right' });
    currentY += 5.5;

    if (customer.phone) {
        doc.text(`Phone: ${customer.phone}`, margin, currentY);
        currentY += 5;
    }
    if (customer.address) {
        doc.text(`Address: ${customer.address}`, margin, currentY);
        currentY += 5;
    }

    // Sort transactions chronologically
    const sortedTxs = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const saleBills = sortedTxs.filter(tx => tx.type !== 'debit');

    // Calculate Financials
    let totalSales = 0;
    let totalPaid = 0;
    const adjustmentsList: Array<{ billNumber: string | number; date: string; diff: number; note: string }> = [];

    sortedTxs.forEach(tx => {
        if (tx.type !== 'debit') {
            totalSales += tx.totalAmount;
        }
        const paidThisTx = (tx.amountPaid || 0) + (tx.additionalPayments?.reduce((s, p) => s + p.amount, 0) || 0) + (tx.type === 'debit' ? tx.totalAmount : 0);
        totalPaid += paidThisTx;

        if (!tx.hideEditedBadge && tx.billAdjustments && tx.billAdjustments.length > 0) {
            tx.billAdjustments.forEach(adj => {
                let itemChanges = adj.changes;
                if ((!itemChanges || itemChanges.length === 0) && !adj.itemsSummary && adj.difference > 0 && tx.items) {
                    const match = tx.items.find(it => (it.quantity * it.unitPrice) === adj.difference);
                    if (match) {
                        itemChanges = [{
                            type: 'added',
                            itemName: match.itemName,
                            description: `Qty: ${match.quantity} × Rs. ${match.unitPrice.toLocaleString()} = +Rs. ${adj.difference.toLocaleString()}`
                        }];
                    }
                }
                let changeStr = '';
                if (itemChanges && itemChanges.length > 0) {
                    changeStr = ' (' + itemChanges.map(c => `${c.type === 'added' ? '+ Added: ' : c.type === 'removed' ? '- Removed: ' : '~ Changed: '}${c.itemName}`).join(', ') + ')';
                }

                adjustmentsList.push({
                    billNumber: tx.billNumber || 'Ref',
                    date: new Date(adj.editedAt).toLocaleDateString('en-GB'),
                    diff: adj.difference,
                    note: `Bill #${tx.billNumber || 'Ref'} edited (${(adj.previousGrandTotal || 0).toLocaleString()} -> ${(adj.newGrandTotal || 0).toLocaleString()})${changeStr}`
                });
            });
        } else if (tx.isEdited && !tx.hideEditedBadge) {
            adjustmentsList.push({
                billNumber: tx.billNumber || 'Ref',
                date: new Date(tx.modifiedAt || tx.date).toLocaleDateString('en-GB'),
                diff: 0,
                note: `Bill #${tx.billNumber || 'Ref'} modified / تبدیل شدہ`
            });
        }
    });

    const finalBalance = customer.balance !== undefined ? customer.balance : (sortedTxs.length > 0 ? sortedTxs[sortedTxs.length - 1].remainingBalance : 0);
    const netAdjustment = finalBalance - (totalSales - totalPaid);

    // Summary Card Box
    doc.setFillColor(248, 249, 250);
    doc.setDrawColor(220, 224, 228);
    doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 22, 2, 2, 'FD');

    const colW = (pageWidth - (margin * 2)) / 4;
    const boxY = currentY + 6;

    // Box Col 1: Total Sales
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    doc.text("Adjusted Total Sales", margin + (colW * 0.5), boxY, { align: 'center' });
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text(`Rs. ${totalSales.toLocaleString()}`, margin + (colW * 0.5), boxY + 8, { align: 'center' });

    // Box Col 2: Total Paid
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    doc.text("Total Amount Paid", margin + (colW * 1.5), boxY, { align: 'center' });
    doc.setFontSize(11);
    doc.setTextColor(22, 163, 74);
    doc.setFont("helvetica", "bold");
    doc.text(`Rs. ${totalPaid.toLocaleString()}`, margin + (colW * 1.5), boxY + 8, { align: 'center' });

    // Box Col 3: Adjustments / Net Diff
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    doc.text("Khata Adjustments", margin + (colW * 2.5), boxY, { align: 'center' });
    doc.setFontSize(11);
    doc.setTextColor(netAdjustment !== 0 ? 180 : 100, netAdjustment !== 0 ? 83 : 100, netAdjustment !== 0 ? 9 : 100);
    doc.setFont("helvetica", "bold");
    doc.text(`${netAdjustment > 0 ? '+' : ''}${netAdjustment.toLocaleString()}`, margin + (colW * 2.5), boxY + 8, { align: 'center' });

    // Box Col 4: Remaining Balance
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    doc.text("Remaining Balance", margin + (colW * 3.5), boxY, { align: 'center' });
    doc.setFontSize(12);
    doc.setTextColor(finalBalance > 0 ? 190 : 22, finalBalance > 0 ? 0 : 163, finalBalance > 0 ? 0 : 74);
    doc.setFont("helvetica", "bold");
    doc.text(`Rs. ${finalBalance.toLocaleString()}`, margin + (colW * 3.5), boxY + 8, { align: 'center' });

    currentY += 28;

    // --- Section 1: Running Balance Overview Table ---
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text("1. Khata Summary & Running Balance / کھاتہ کا خلاصہ", margin, currentY);
    currentY += 4;

    const summaryTableData = sortedTxs.map((tx) => {
        const isSale = tx.type !== 'debit';
        const billLabel = isSale
            ? `Bill #${tx.billNumber || 'Ref'}${tx.isEdited && !tx.hideEditedBadge ? ' (Edited / تبدیل شدہ)' : ''}`
            : (tx.notes || 'Direct Payment / Jama');
        const paidAmount = (tx.amountPaid || 0) + (tx.additionalPayments?.reduce((s, p) => s + p.amount, 0) || 0) + (tx.type === 'debit' ? tx.totalAmount : 0);
        return [
            formatDateTime(tx.date) || new Date(tx.date).toLocaleDateString('en-GB'),
            billLabel,
            isSale ? `Rs. ${tx.totalAmount.toLocaleString()}` : '-',
            paidAmount > 0 ? `Rs. ${paidAmount.toLocaleString()}` : '0',
            `Rs. ${tx.remainingBalance.toLocaleString()}`
        ];
    });

    autoTable(doc, {
        startY: currentY,
        head: [['Date & Time', 'Bill / Description', 'Sales Amount', 'Paid (Jama)', 'Running Balance']],
        body: summaryTableData,
        theme: 'striped',
        headStyles: {
            fillColor: [107, 122, 80],
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 9
        },
        styles: { fontSize: 8.5, cellPadding: 2.5 },
        columnStyles: {
            0: { halign: 'left', cellWidth: 38 },
            1: { halign: 'left' },
            2: { halign: 'right', cellWidth: 30 },
            3: { halign: 'right', cellWidth: 28 },
            4: { halign: 'right', cellWidth: 34 }
        }
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;

    // --- Section 2: Complete Itemized Bills Breakdown (All Bills) ---
    if (saleBills.length > 0) {
        if (currentY > pageHeight - 50) {
            doc.addPage();
            currentY = 18;
        }

        doc.setFontSize(12);
        doc.setTextColor(107, 122, 80);
        doc.setFont("helvetica", "bold");
        doc.text(`2. Complete Itemized Bills Breakdown (${saleBills.length} Bills) / تمام بلز کی مکمل تفصیل`, margin, currentY);
        currentY += 6;

        for (const bill of saleBills) {
            // Check if page needs to break before starting a bill
            if (currentY > pageHeight - 55) {
                doc.addPage();
                currentY = 18;
            }

            // Bill Header Bar
            doc.setFillColor(240, 243, 235);
            doc.setDrawColor(107, 122, 80);
            doc.rect(margin, currentY, pageWidth - (margin * 2), 7, 'FD');

            doc.setFontSize(9.5);
            doc.setTextColor(107, 122, 80);
            doc.setFont("helvetica", "bold");
            const billTitle = `Bill #${bill.billNumber || 'Ref'}${bill.isEdited && !bill.hideEditedBadge ? '  [Edited / تبدیل شدہ]' : ''}`;
            doc.text(billTitle, margin + 3, currentY + 4.8);

            doc.setFontSize(8.5);
            doc.setTextColor(70);
            doc.setFont("helvetica", "normal");
            doc.text(`Date: ${formatDateTime(bill.date)}`, pageWidth - margin - 3, currentY + 4.8, { align: 'right' });

            currentY += 9;

            // Items Table for this Bill
            const itemsRows: any[] = [];
            (bill.items || []).forEach((item, idx) => {
                itemsRows.push([
                    idx + 1,
                    item.itemName,
                    item.quantity,
                    `Rs. ${item.unitPrice.toLocaleString()}`,
                    `Rs. ${(item.quantity * item.unitPrice).toLocaleString()}`
                ]);
                if (item.notes && item.notes.trim()) {
                    itemsRows.push([
                        { content: '', styles: { fontStyle: 'italic' } },
                        { content: `  ↳ Note: ${item.notes.trim()}`, colSpan: 4, styles: { fontStyle: 'italic', textColor: [100, 100, 100], fontSize: 8, cellPadding: { top: 0, bottom: 2, left: 6, right: 3 } } }
                    ]);
                }
            });

            if (itemsRows.length > 0) {
                autoTable(doc, {
                    startY: currentY,
                    head: [['#', 'Item Description', 'Qty', 'Unit Price', 'Total']],
                    body: itemsRows,
                    theme: 'grid',
                    headStyles: {
                        fillColor: [230, 235, 225],
                        textColor: [40, 50, 30],
                        fontStyle: 'bold',
                        fontSize: 8.5
                    },
                    styles: { fontSize: 8, cellPadding: 2 },
                    columnStyles: {
                        0: { halign: 'center', cellWidth: 10 },
                        1: { halign: 'left' },
                        2: { halign: 'center', cellWidth: 15 },
                        3: { halign: 'right', cellWidth: 28 },
                        4: { halign: 'right', cellWidth: 32 }
                    }
                });
                currentY = (doc as any).lastAutoTable.finalY + 3;
            }

            // Financial Calculations for this bill
            const billPaid = (bill.amountPaid || 0) + (bill.additionalPayments?.reduce((s, p) => s + p.amount, 0) || 0);
            const prevBal = bill.previousBalance || 0;
            const grandTot = bill.grandTotal || (bill.totalAmount + prevBal);

            if (currentY > pageHeight - 40) {
                doc.addPage();
                currentY = 18;
            }

            doc.setFontSize(8.5);
            doc.setTextColor(50);
            doc.setFont("helvetica", "normal");

            // Line 1: Items Total, Previous Balance, Grand Total
            doc.text(`Items Total: Rs. ${bill.totalAmount.toLocaleString()}`, margin + 3, currentY);
            if (prevBal > 0) {
                doc.text(`Previous Balance: Rs. ${prevBal.toLocaleString()}`, margin + 55, currentY);
            }
            doc.setFont("helvetica", "bold");
            doc.setTextColor(107, 122, 80);
            doc.text(`Grand Total: Rs. ${grandTot.toLocaleString()}`, pageWidth - margin - 3, currentY, { align: 'right' });
            currentY += 4.5;

            // Payments List for this bill
            doc.setFont("helvetica", "normal");
            doc.setTextColor(60);
            if (bill.amountPaid > 0) {
                doc.text(`• Initial Payment (${formatDateTime(bill.date)}): Rs. ${bill.amountPaid.toLocaleString()}`, margin + 5, currentY);
                currentY += 4;
            }
            bill.additionalPayments?.forEach(p => {
                const noteStr = p.notes ? ` (${p.notes})` : '';
                doc.text(`• Payment (${formatDateTime(p.date)})${noteStr}: Rs. ${p.amount.toLocaleString()}`, margin + 5, currentY);
                currentY += 4;
            });

            // Adjustments on this bill
            if (!bill.hideEditedBadge && bill.billAdjustments && bill.billAdjustments.length > 0) {
                doc.setTextColor(180, 83, 9);
                bill.billAdjustments.forEach(adj => {
                    const diffStr = `${adj.difference > 0 ? '+' : ''}${adj.difference.toLocaleString()}`;
                    doc.text(`• Adjustment on ${formatDateTime(adj.editedAt)}: Grand Total ${(adj.previousGrandTotal || 0).toLocaleString()} -> ${(adj.newGrandTotal || 0).toLocaleString()} (Diff: Rs. ${diffStr})`, margin + 5, currentY);
                    currentY += 4;

                    let itemChanges = adj.changes;
                    if ((!itemChanges || itemChanges.length === 0) && !adj.itemsSummary && adj.difference > 0 && bill.items) {
                        const match = bill.items.find(it => (it.quantity * it.unitPrice) === adj.difference);
                        if (match) {
                            itemChanges = [{
                                type: 'added',
                                itemName: match.itemName,
                                description: `Qty: ${match.quantity} × Rs. ${match.unitPrice.toLocaleString()} = +Rs. ${adj.difference.toLocaleString()}`
                            }];
                        }
                    }
                    if (itemChanges && itemChanges.length > 0) {
                        doc.setFontSize(8);
                        itemChanges.forEach(ch => {
                            const tag = ch.type === 'added' ? '+ Added:' : ch.type === 'removed' ? '- Removed:' : '~ Changed:';
                            doc.text(`    ${tag} ${ch.itemName} (${ch.description})`, margin + 5, currentY);
                            currentY += 4;
                        });
                        doc.setFontSize(9);
                    }
                });
                doc.setTextColor(60);
            }

            // Summary of this bill: Total Paid & Remaining Balance
            doc.setFont("helvetica", "bold");
            doc.setTextColor(22, 163, 74);
            doc.text(`Total Paid: Rs. ${billPaid.toLocaleString()}`, margin + 5, currentY);

            doc.setTextColor(bill.remainingBalance > 0 ? 190 : 22, bill.remainingBalance > 0 ? 0 : 163, bill.remainingBalance > 0 ? 0 : 74);
            doc.text(`Remaining Balance: Rs. ${bill.remainingBalance.toLocaleString()}`, pageWidth - margin - 3, currentY, { align: 'right' });
            currentY += 6;

            // Thin separation line between bills
            doc.setDrawColor(220, 220, 220);
            doc.setLineWidth(0.3);
            doc.line(margin, currentY, pageWidth - margin, currentY);
            currentY += 6;
        }
    }

    // --- Section 3: Adjustments Transparency Section ---
    if (adjustmentsList.length > 0 || netAdjustment !== 0) {
        if (currentY > pageHeight - 35) {
            doc.addPage();
            currentY = 18;
        }

        doc.setFontSize(10.5);
        doc.setTextColor(180, 83, 9);
        doc.setFont("helvetica", "bold");
        doc.text("3. Adjustments & Discounts Audit / ایڈجسٹمنٹس اور رعایت کی تفصیل:", margin, currentY);
        currentY += 5;

        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(70);

        adjustmentsList.forEach(adj => {
            doc.text(`• ${adj.date}: ${adj.note}${adj.diff !== 0 ? ` (Diff: ${adj.diff > 0 ? '+' : ''}Rs. ${adj.diff.toLocaleString()})` : ''}`, margin + 3, currentY);
            currentY += 4.5;
        });

        if (netAdjustment !== 0) {
            doc.text(`• Overall Khata Balance Settlement: ${netAdjustment > 0 ? '+' : ''}Rs. ${netAdjustment.toLocaleString()}`, margin + 3, currentY);
            currentY += 4.5;
        }
        currentY += 4;
    }

    // --- Add Page Numbers & Standard Courteous Footer to All Pages ---
    const totalPages = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setDrawColor(200);
        doc.setLineWidth(0.3);
        doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);

        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.setFont("helvetica", "normal");
        doc.text(`Page ${i} of ${totalPages}`, margin, pageHeight - 9);

        doc.setTextColor(107, 122, 80);
        doc.setFont("helvetica", "bold");
        doc.text(
            finalBalance > 0
                ? `براہ کرم بقایا رقم Rs. ${finalBalance.toLocaleString()} جلد از جلد ادا فرمائیں۔ شکریہ! (${billSettings.shopName || 'Shop'})`
                : `Thank you for your business! (${billSettings.shopName || 'Shop'})`,
            pageWidth - margin,
            pageHeight - 9,
            { align: 'right' }
        );
    }

    const safeCustomerName = (customer.name || 'Customer').replace(/[^a-zA-Z0-9_-]/g, '_');
    await saveOrSharePDF(doc, `Khata_${safeCustomerName}.pdf`);
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
