import 'dart:io';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import '../../models/app_models.dart';
import 'package:intl/intl.dart';

class PdfService {
  static Future<void> generateAndShareBill(
    Transaction tx,
    Customer customer,
    BillDesignSettings settings,
  ) async {
    final pdf = pw.Document();

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        build: (context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Header(
                level: 0,
                child: pw.Column(
                  children: [
                    pw.Text(
                      settings.shopName,
                      style: pw.TextStyle(
                        fontSize: 24,
                        fontWeight: pw.FontWeight.bold,
                      ),
                    ),
                    pw.Text(
                      settings.address,
                      style: const pw.TextStyle(fontSize: 10),
                    ),
                    pw.Text(
                      settings.contacts
                          .map((c) => "${c.label}: ${c.phone}")
                          .join(" | "),
                      style: const pw.TextStyle(fontSize: 10),
                    ),
                    pw.Divider(thickness: 1),
                  ],
                ),
              ),
              pw.SizedBox(height: 20),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(
                        "BILL TO:",
                        style: pw.TextStyle(fontWeight: pw.FontWeight.bold),
                      ),
                      pw.Text(customer.name),
                      pw.Text("Phone: ${customer.phone}"),
                    ],
                  ),
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.end,
                    children: [
                      pw.Text(
                        "Bill #: ${tx.billNumber ?? tx.id.substring(tx.id.length - 6)}",
                      ),
                      pw.Text(
                        "Date: ${DateFormat('dd MMM yyyy').format(DateTime.parse(tx.date))}",
                      ),
                    ],
                  ),
                ],
              ),
              pw.SizedBox(height: 30),
              pw.TableHelper.fromTextArray(
                headerStyle: pw.TextStyle(
                  fontWeight: pw.FontWeight.bold,
                  color: PdfColors.white,
                ),
                headerDecoration: const pw.BoxDecoration(
                  color: PdfColors.brown,
                ),
                headers: [
                  '#',
                  'Item Description',
                  'Qty',
                  'Unit Price',
                  'Total',
                ],
                data: List.generate((tx.items ?? []).length, (index) {
                  final item = tx.items![index];
                  return [
                    index + 1,
                    item.itemName,
                    item.quantity,
                    item.unitPrice.toStringAsFixed(0),
                    (item.quantity * item.unitPrice).toStringAsFixed(0),
                  ];
                }),
              ),
              pw.SizedBox(height: 20),
              pw.Align(
                alignment: pw.Alignment.centerRight,
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.end,
                  children: [
                    pw.Text(
                      "Total Amount: ${tx.totalAmount.toStringAsFixed(0)}",
                    ),
                    pw.Text(
                      "Previous Balance: ${tx.previousBalance?.toStringAsFixed(0) ?? '0'}",
                    ),
                    pw.Text(
                      "Grand Total: ${((tx.previousBalance ?? 0) + tx.totalAmount).toStringAsFixed(0)}",
                      style: pw.TextStyle(
                        fontWeight: pw.FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                    pw.SizedBox(width: 150, child: pw.Divider()),
                    pw.Text(
                      "Paid: ${tx.amountPaid.toStringAsFixed(0)}",
                      style: pw.TextStyle(color: PdfColors.green700),
                    ),
                    pw.Text(
                      "Remaining Balance: RS ${tx.remainingBalance.toStringAsFixed(0)}",
                      style: pw.TextStyle(
                        fontWeight: pw.FontWeight.bold,
                        fontSize: 16,
                        color: PdfColors.red700,
                      ),
                    ),
                  ],
                ),
              ),
              pw.Spacer(),
              pw.Divider(),
              pw.Center(
                child: pw.Text(
                  settings.footer,
                  style: const pw.TextStyle(
                    fontSize: 10,
                    color: PdfColors.grey,
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );

    await _saveAndShare(pdf, "Bill_${customer.name}_${tx.billNumber}.pdf");
  }

  static Future<void> generateAndShareKhata(
    Customer customer,
    List<Transaction> transactions,
    BillDesignSettings settings,
  ) async {
    final pdf = pw.Document();

    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        build: (context) {
          return [
            pw.Header(
              level: 0,
              child: pw.Column(
                children: [
                  pw.Text(
                    settings.shopName,
                    style: pw.TextStyle(
                      fontSize: 24,
                      fontWeight: pw.FontWeight.bold,
                    ),
                  ),
                  pw.Text(
                    settings.address,
                    style: const pw.TextStyle(fontSize: 10),
                  ),
                  pw.Divider(thickness: 1),
                ],
              ),
            ),
            pw.SizedBox(height: 20),
            pw.Center(
              child: pw.Text(
                "STATEMENT OF ACCOUNT",
                style: pw.TextStyle(
                  fontSize: 18,
                  fontWeight: pw.FontWeight.bold,
                ),
              ),
            ),
            pw.SizedBox(height: 10),
            pw.Text(
              "Customer: ${customer.name}",
              style: pw.TextStyle(fontWeight: pw.FontWeight.bold),
            ),
            pw.SizedBox(height: 20),
            pw.TableHelper.fromTextArray(
              headerStyle: pw.TextStyle(
                fontWeight: pw.FontWeight.bold,
                color: PdfColors.white,
              ),
              headerDecoration: const pw.BoxDecoration(
                color: PdfColors.brown800,
              ),
              headers: ['Date', 'Description', 'Bill Amt', 'Paid', 'Balance'],
              data: transactions.map((tx) {
                bool isPayment = tx.type == 'debit';
                return [
                  DateFormat('dd MMM yy').format(DateTime.parse(tx.date)),
                  isPayment
                      ? "Payment"
                      : (tx.items != null ? "Bill #${tx.billNumber}" : "Sale"),
                  isPayment ? "-" : tx.totalAmount.toStringAsFixed(0),
                  tx.amountPaid.toStringAsFixed(0),
                  tx.remainingBalance.toStringAsFixed(0),
                ];
              }).toList(),
            ),
            pw.SizedBox(height: 30),
            pw.Container(
              padding: const pw.EdgeInsets.all(10),
              decoration: const pw.BoxDecoration(color: PdfColors.grey100),
              child: pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text(
                    "FINAL OUTSTANDING BALANCE:",
                    style: pw.TextStyle(fontWeight: pw.FontWeight.bold),
                  ),
                  pw.Text(
                    "RS ${transactions.first.remainingBalance.toStringAsFixed(0)}",
                    style: pw.TextStyle(
                      fontWeight: pw.FontWeight.bold,
                      fontSize: 18,
                      color: PdfColors.red700,
                    ),
                  ),
                ],
              ),
            ),
          ];
        },
      ),
    );

    await _saveAndShare(pdf, "Khata_${customer.name}.pdf");
  }

  static Future<void> _saveAndShare(pw.Document pdf, String fileName) async {
    final output = await getTemporaryDirectory();
    final file = File("${output.path}/$fileName");
    await file.writeAsBytes(await pdf.save());
    await file.writeAsBytes(await pdf.save());
    // ignore: deprecated_member_use
    await Share.shareXFiles([
      XFile(file.path),
    ], text: 'Sending Ledger document...');
  }
}
