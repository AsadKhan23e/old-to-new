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
    BillDesignSettings settings, {
    int? billNum,
  }) async {
    final pdf = pw.Document();

    // Fallback if billNum is not provided
    final calculatedBillNum = billNum ?? tx.billNumber ?? 0;

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
              pw.SizedBox(height: 10),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(
                        "BILL TO:",
                        style: pw.TextStyle(
                          fontWeight: pw.FontWeight.bold,
                          fontSize: 10,
                        ),
                      ),
                      pw.Text(
                        customer.name,
                        style: pw.TextStyle(
                          fontSize: 12,
                          fontWeight: pw.FontWeight.bold,
                        ),
                      ),
                      pw.Text(
                        "Phone: ${customer.phone}",
                        style: const pw.TextStyle(fontSize: 10),
                      ),
                      pw.SizedBox(height: 4),
                      pw.Text(
                        "Bill #: $calculatedBillNum",
                        style: pw.TextStyle(
                          fontWeight: pw.FontWeight.bold,
                          fontSize: 10,
                          color: PdfColors.blue800,
                        ),
                      ),
                    ],
                  ),
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.end,
                    children: [
                      pw.Text(
                        "Date: ${DateFormat('dd MMM yyyy, hh:mm a').format(DateTime.parse(tx.date))}",
                        style: const pw.TextStyle(fontSize: 10),
                      ),
                    ],
                  ),
                ],
              ),
              pw.SizedBox(height: 20),
              pw.TableHelper.fromTextArray(
                headerStyle: pw.TextStyle(
                  fontWeight: pw.FontWeight.bold,
                  color: PdfColors.white,
                  fontSize: 10,
                ),
                headerDecoration: const pw.BoxDecoration(
                  color: PdfColors.brown,
                ),
                cellStyle: const pw.TextStyle(fontSize: 9),
                headers: ['#', 'Item Description', 'Qty', 'Rate', 'Total'],
                columnWidths: {
                  0: const pw.FixedColumnWidth(20),
                  1: const pw.FlexColumnWidth(),
                  2: const pw.FixedColumnWidth(40),
                  3: const pw.FixedColumnWidth(60),
                  4: const pw.FixedColumnWidth(60),
                },
                data: List.generate((tx.items ?? []).length, (index) {
                  final item = tx.items![index];
                  return [
                    index + 1,
                    item.itemName,
                    item.quantity.toString(),
                    item.unitPrice.toStringAsFixed(0),
                    (item.quantity * item.unitPrice).toStringAsFixed(0),
                  ];
                }),
              ),
              pw.SizedBox(height: 20),
              // Payment Summary Section
              pw.Row(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  // Left Side: Payments Detail List
                  pw.Expanded(
                    flex: 2,
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Text(
                          "Payments",
                          style: pw.TextStyle(
                            fontWeight: pw.FontWeight.bold,
                            fontSize: 11,
                          ),
                        ),
                        pw.Divider(thickness: 0.5),
                        // Initial Payment
                        if (tx.amountPaid > 0)
                          _buildPaymentRow(
                            "Initial Payment on ${DateFormat('dd MMM yyyy').format(DateTime.parse(tx.date))}",
                            tx.amountPaid,
                          ),
                        // Additional Payments
                        ...(tx.additionalPayments ?? []).map(
                          (p) => _buildPaymentRow(
                            "Payment on ${DateFormat('dd MMM yyyy').format(DateTime.parse(p.date))}${p.notes != null ? ' (${p.notes})' : ''}",
                            p.amount,
                          ),
                        ),
                      ],
                    ),
                  ),
                  pw.SizedBox(width: 40),
                  // Right Side: Financial Summary
                  pw.Expanded(
                    flex: 1,
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.end,
                      children: [
                        _buildSummaryLine("Bill Total:", tx.totalAmount),
                        _buildSummaryLine(
                          "Prev. Balance:",
                          tx.previousBalance ?? 0,
                        ),
                        pw.Divider(),
                        _buildSummaryLine(
                          "Grand Total:",
                          (tx.previousBalance ?? 0) + tx.totalAmount,
                          isBold: true,
                        ),
                        pw.SizedBox(height: 10),
                        _buildSummaryLine(
                          "Total Paid:",
                          (tx.amountPaid +
                              (tx.additionalPayments?.fold(
                                    0.0,
                                    (sum, p) => sum! + p.amount,
                                  ) ??
                                  0)),
                          color: PdfColors.green700,
                        ),
                        _buildSummaryLine(
                          "Remaining:",
                          tx.remainingBalance,
                          isBold: true,
                          fontSize: 14,
                          color: PdfColors.red700,
                          prefix: "PS. ",
                        ),
                      ],
                    ),
                  ),
                ],
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

    await _saveAndShare(pdf, "Bill_${customer.name}_$calculatedBillNum.pdf");
  }

  static pw.Widget _buildPaymentRow(String label, double amount) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 2),
      child: pw.Row(
        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
        children: [
          pw.Text(
            label,
            style: const pw.TextStyle(fontSize: 9, color: PdfColors.grey700),
          ),
          pw.Text(
            amount.toStringAsFixed(0),
            style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold),
          ),
        ],
      ),
    );
  }

  static pw.Widget _buildSummaryLine(
    String label,
    double amount, {
    bool isBold = false,
    double fontSize = 10,
    PdfColor? color,
    String prefix = "",
  }) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 1),
      child: pw.Row(
        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
        children: [
          pw.Text(
            label,
            style: pw.TextStyle(
              fontSize: fontSize - 1,
              color: PdfColors.grey700,
            ),
          ),
          pw.Text(
            "$prefix${amount.toStringAsFixed(0)}",
            style: pw.TextStyle(
              fontSize: fontSize,
              fontWeight: isBold ? pw.FontWeight.bold : pw.FontWeight.normal,
              color: color ?? PdfColors.black,
            ),
          ),
        ],
      ),
    );
  }

  static Future<void> generateAndShareKhata(
    Customer customer,
    List<Transaction> transactions,
    BillDesignSettings settings,
  ) async {
    final pdf = pw.Document();

    // Sort transactions by date ASC to calculate bill numbers correctly (parity with Next.js)
    final sortedForNumbering = [...transactions]
      ..sort((a, b) => a.date.compareTo(b.date));

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
                fontSize: 10,
              ),
              headerDecoration: const pw.BoxDecoration(
                color: PdfColors.brown800,
              ),
              cellStyle: const pw.TextStyle(fontSize: 9),
              headers: [
                'Date',
                'Transaction Details',
                'Bill Amt',
                'Paid',
                'Balance',
              ],
              data: transactions.map((tx) {
                bool isPayment = tx.type == 'debit';

                // Calculate Bill Number for parity
                String billInfo = "";
                if (tx.type != 'purchase' && tx.type != 'debit') {
                  final salesTxs = sortedForNumbering
                      .where((t) => t.type != 'purchase' && t.type != 'debit')
                      .toList();
                  final bNum = salesTxs.indexWhere((t) => t.id == tx.id) + 1;
                  billInfo = "Bill #$bNum: ";
                }

                String details = isPayment
                    ? "Cash/Other Payment"
                    : (tx.items != null
                          ? "Purchased (${tx.items!.length} items)"
                          : tx.notes ?? "Sale");

                return [
                  DateFormat('dd/MM/yyyy').format(DateTime.parse(tx.date)),
                  billInfo + details,
                  isPayment ? "-" : tx.totalAmount.toStringAsFixed(0),
                  (tx.amountPaid +
                          (tx.additionalPayments?.fold(
                                0.0,
                                (sum, p) => sum! + p.amount,
                              ) ??
                              0))
                      .toStringAsFixed(0),
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
                    "PS. ${transactions.first.remainingBalance.toStringAsFixed(0)}",
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
    // ignore: deprecated_member_use
    await Share.shareXFiles([
      XFile(file.path),
    ], text: 'Sending Ledger document...');
  }
}
