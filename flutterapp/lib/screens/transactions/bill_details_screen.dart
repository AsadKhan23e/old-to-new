import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/app_provider.dart';
import '../../models/app_models.dart';
import '../../services/translation_service.dart';
import 'edit_bill_screen.dart';

class BillDetailsScreen extends StatefulWidget {
  final Transaction bill;
  const BillDetailsScreen({super.key, required this.bill});

  @override
  State<BillDetailsScreen> createState() => _BillDetailsScreenState();
}

class _BillDetailsScreenState extends State<BillDetailsScreen> {
  final TextEditingController _paymentCtrl = TextEditingController();
  final TextEditingController _paymentNotesCtrl = TextEditingController();

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<AppProvider>(context);
    final lang = provider.appData?.settings.language ?? 'en';
    final isFinalized = widget.bill.status == 'closed';

    // Calculate dynamic values
    double itemsTotal =
        widget.bill.items?.fold(
          0,
          (sum, item) => sum! + (item.quantity * item.unitPrice),
        ) ??
        0;
    double additionalPaymentsTotal =
        widget.bill.additionalPayments?.fold(0, (sum, p) => sum! + p.amount) ??
        0;
    double totalPaidSoFar = widget.bill.amountPaid + additionalPaymentsTotal;
    double grandTotal = (widget.bill.previousBalance ?? 0) + itemsTotal;
    double currentRemaining = grandTotal - totalPaidSoFar;

    return Scaffold(
      backgroundColor: const Color(0xFFFAF8F3),
      appBar: AppBar(
        title: Text(
          'Bill #${widget.bill.billNumber ?? widget.bill.id.substring(widget.bill.id.length - 6)}',
          style: const TextStyle(
            fontFamily: 'serif',
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => EditBillScreen(bill: widget.bill),
                ),
              );
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Status Badge
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  DateFormat(
                    'dd MMMM yyyy',
                  ).format(DateTime.parse(widget.bill.date)),
                  style: const TextStyle(
                    color: Colors.grey,
                    fontStyle: FontStyle.italic,
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: isFinalized
                        ? Colors.grey[200]
                        : const Color(0xFFE8F5E9),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: isFinalized ? Colors.grey : Colors.green,
                    ),
                  ),
                  child: Text(
                    isFinalized
                        ? TranslationService.t(
                            'billFinalized',
                            lang,
                          ).toUpperCase()
                        : TranslationService.t('billOpen', lang).toUpperCase(),
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: isFinalized ? Colors.grey[700] : Colors.green[700],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Items List
            const Text(
              'ITEMS',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 12,
                letterSpacing: 1.2,
                color: Colors.brown,
              ),
            ),
            const Divider(color: Color(0xFFCFCAC0)),
            if (widget.bill.items == null || widget.bill.items!.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 8.0),
                child: Text(
                  'No items in this bill.',
                  style: TextStyle(
                    fontStyle: FontStyle.italic,
                    color: Colors.grey,
                  ),
                ),
              )
            else
              ...widget.bill.items!.map(
                (item) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item.itemName,
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                              ),
                            ),
                            Text(
                              '${item.quantity} x ${item.unitPrice.toStringAsFixed(0)}',
                              style: const TextStyle(
                                fontSize: 12,
                                color: Colors.grey,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Text(
                        (item.quantity * item.unitPrice).toStringAsFixed(0),
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

            const SizedBox(height: 24),

            // Payments List
            const Text(
              'PAYMENTS',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 12,
                letterSpacing: 1.2,
                color: Colors.brown,
              ),
            ),
            const Divider(color: Color(0xFFCFCAC0)),
            // Initial Payment
            _PaymentRow(
              amount: widget.bill.amountPaid,
              date: widget.bill.date,
              note: 'Initial Payment',
            ),
            // Additional Payments
            if (widget.bill.additionalPayments != null)
              ...widget.bill.additionalPayments!.map(
                (p) =>
                    _PaymentRow(amount: p.amount, date: p.date, note: p.notes),
              ),

            const SizedBox(height: 24),

            // Summary Table
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFCFCAC0)),
              ),
              child: Column(
                children: [
                  _SummaryRow(label: 'Items Total:', value: itemsTotal),
                  _SummaryRow(
                    label: 'Previous Balance:',
                    value: widget.bill.previousBalance ?? 0,
                  ),
                  const Divider(),
                  _SummaryRow(
                    label: 'Grand Total:',
                    value: grandTotal,
                    isBold: true,
                  ),
                  _SummaryRow(
                    label: 'Total Paid:',
                    value: totalPaidSoFar,
                    color: Colors.green,
                  ),
                  const Divider(),
                  _SummaryRow(
                    label: 'Remaining Balance:',
                    value: currentRemaining,
                    isBold: true,
                    color: Colors.red,
                  ),
                ],
              ),
            ),

            const SizedBox(height: 32),

            // Actions for Open Bills
            if (!isFinalized) ...[
              const Text(
                'ADD PAYMENT',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                  letterSpacing: 1.2,
                  color: Colors.brown,
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _paymentCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Payment Amount',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.attach_money),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _paymentNotesCtrl,
                decoration: const InputDecoration(
                  labelText: 'Payment Notes',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () {
                        double? amount = double.tryParse(_paymentCtrl.text);
                        if (amount == null || amount <= 0) return;

                        final newPayment = Payment(
                          id: DateTime.now().millisecondsSinceEpoch.toString(),
                          amount: amount,
                          date: DateTime.now().toIso8601String().split('T')[0],
                          notes: _paymentNotesCtrl.text,
                        );

                        List<Payment> updatedPayments = List.from(
                          widget.bill.additionalPayments ?? [],
                        );
                        updatedPayments.add(newPayment);

                        final updatedBill = Transaction(
                          id: widget.bill.id,
                          customerId: widget.bill.customerId,
                          customerName: widget.bill.customerName,
                          items: widget.bill.items,
                          totalAmount: widget.bill.totalAmount,
                          amountPaid: widget.bill.amountPaid,
                          type: widget.bill.type,
                          date: widget.bill.date,
                          modifiedAt: DateTime.now().toIso8601String(),
                          notes: widget.bill.notes,
                          remainingBalance: currentRemaining - amount,
                          previousBalance: widget.bill.previousBalance,
                          grandTotal: widget.bill.grandTotal,
                          additionalPayments: updatedPayments,
                          paid: (currentRemaining - amount) <= 0,
                          status: 'open',
                          billNumber: widget.bill.billNumber,
                          image: widget.bill.image,
                        );

                        provider.updateTransaction(updatedBill);

                        setState(() {
                          _paymentCtrl.clear();
                          _paymentNotesCtrl.clear();
                        });

                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Payment added!')),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF6B7A50),
                        foregroundColor: Colors.white,
                      ),
                      child: const Text('SAVE PAYMENT'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () {
                        final updatedBill = Transaction(
                          id: widget.bill.id,
                          customerId: widget.bill.customerId,
                          customerName: widget.bill.customerName,
                          items: widget.bill.items,
                          totalAmount: widget.bill.totalAmount,
                          amountPaid: widget.bill.amountPaid,
                          type: widget.bill.type,
                          date: widget.bill.date,
                          modifiedAt: DateTime.now().toIso8601String(),
                          notes: widget.bill.notes,
                          remainingBalance: currentRemaining,
                          previousBalance: widget.bill.previousBalance,
                          grandTotal: widget.bill.grandTotal,
                          additionalPayments: widget.bill.additionalPayments,
                          paid: currentRemaining <= 0,
                          status: 'closed',
                          billNumber: widget.bill.billNumber,
                          image: widget.bill.image,
                        );

                        provider.updateTransaction(updatedBill);
                        Navigator.pop(context);
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Bill finalized successfully!'),
                          ),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF8C6A4F),
                        foregroundColor: Colors.white,
                      ),
                      child: const Text('FINALIZE BILL'),
                    ),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }
}

class _PaymentRow extends StatelessWidget {
  final double amount;
  final String date;
  final String? note;

  const _PaymentRow({required this.amount, required this.date, this.note});

  @override
  Widget build(BuildContext context) {
    if (amount <= 0) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          const Icon(Icons.check_circle, size: 16, color: Colors.green),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Paid: ${amount.toStringAsFixed(0)}',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                Text(
                  '${DateFormat('dd MMM').format(DateTime.parse(date))} ${note != null && note!.isNotEmpty ? "- $note" : ""}',
                  style: const TextStyle(fontSize: 10, color: Colors.grey),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  final String label;
  final double value;
  final bool isBold;
  final Color? color;

  const _SummaryRow({
    required this.label,
    required this.value,
    this.isBold = false,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
              fontFamily: 'serif',
            ),
          ),
          Text(
            value.toStringAsFixed(0),
            style: TextStyle(
              fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
              color: color ?? (isBold ? const Color(0xFF8C6A4F) : null),
              fontSize: isBold ? 18 : 14,
            ),
          ),
        ],
      ),
    );
  }
}
