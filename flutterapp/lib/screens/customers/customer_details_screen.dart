import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/app_provider.dart';
import '../../models/app_models.dart';
import '../../services/translation_service.dart';
import '../transactions/new_transaction_screen.dart';
import '../transactions/bill_details_screen.dart';
import '../transactions/sell_items_screen.dart';

class CustomerDetailsScreen extends StatefulWidget {
  final Customer customer;
  const CustomerDetailsScreen({super.key, required this.customer});

  @override
  State<CustomerDetailsScreen> createState() => _CustomerDetailsScreenState();
}

class _CustomerDetailsScreenState extends State<CustomerDetailsScreen> {
  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<AppProvider>(context);
    final lang = provider.appData?.settings.language ?? 'en';
    final transactions =
        provider.appData?.transactions
            .where((t) => t.customerId == widget.customer.id)
            .toList() ??
        [];

    // Derived Logic for Summary
    double totalAdjustedSales = 0;
    double totalPaid = 0;
    List<DateTime> paymentDates = [];
    List<BillAdjustment> allAdjustments = [];

    for (var tx in transactions) {
      if (tx.type != 'debit') {
        totalAdjustedSales += tx.totalAmount;
        if (tx.billAdjustments != null) {
          allAdjustments.addAll(tx.billAdjustments!);
        }
      }

      if (tx.amountPaid > 0) {
        totalPaid += tx.amountPaid;
        paymentDates.add(DateTime.parse(tx.date));
      }
      if (tx.additionalPayments != null) {
        for (var p in tx.additionalPayments!) {
          totalPaid += p.amount;
          paymentDates.add(DateTime.parse(p.date));
        }
      }
      if (tx.type == 'debit') {
        totalPaid += tx.totalAmount;
        paymentDates.add(DateTime.parse(tx.date));
      }
    }

    final lastPaymentStr = paymentDates.isNotEmpty
        ? DateFormat(
            'dd/MM/yyyy',
          ).format(paymentDates.reduce((a, b) => a.isAfter(b) ? a : b))
        : 'N/A';

    final latestBalance = transactions.isNotEmpty
        ? transactions
              .reduce((a, b) => a.date.compareTo(b.date) > 0 ? a : b)
              .remainingBalance
        : 0.0;

    // Display List (Latest first)
    final displayTxs = List<Transaction>.from(transactions);
    displayTxs.sort((a, b) => b.date.compareTo(a.date));

    // Display Adjustments (Latest first)
    final displayAdjs = List<BillAdjustment>.from(allAdjustments);
    displayAdjs.sort((a, b) => b.editedAt.compareTo(a.editedAt));

    return Scaffold(
      backgroundColor: const Color(0xFFFAF8F3),
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.customer.name,
              style: const TextStyle(
                fontFamily: 'serif',
                fontWeight: FontWeight.bold,
              ),
            ),
            Text(
              widget.customer.phone,
              style: const TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // SECTION A: SUMMARY
          Card(
            color: Colors.white,
            elevation: 2,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: const BorderSide(color: Color(0xFFCFCAC0)),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'SALES REPORT',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF8C6A4F),
                      letterSpacing: 1.2,
                    ),
                  ),
                  const SizedBox(height: 16),
                  _SummaryRow(
                    label: 'Adjusted Total Sales',
                    value: totalAdjustedSales,
                    color: Colors.black87,
                  ),
                  _SummaryRow(
                    label: 'Total Amount Paid',
                    value: totalPaid,
                    color: Colors.green[700]!,
                  ),
                  const Divider(height: 24),
                  _SummaryRow(
                    label: 'Remaining Balance',
                    value: latestBalance,
                    isBold: true,
                    color: latestBalance > 0 ? Colors.red : Colors.green[700]!,
                    fontSize: 20,
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Last Payment Date',
                        style: TextStyle(color: Colors.grey, fontSize: 12),
                      ),
                      Text(
                        lastPaymentStr,
                        style: const TextStyle(
                          color: Colors.grey,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),

          if (displayAdjs.isNotEmpty) ...[
            const SizedBox(height: 24),
            // SECTION B: EDIT HISTORY
            const Text(
              'EDIT HISTORY',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: Colors.brown,
                letterSpacing: 1.2,
              ),
            ),
            const SizedBox(height: 8),
            Card(
              color: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
                side: const BorderSide(color: Color(0xFFCFCAC0)),
              ),
              child: Column(
                children: [
                  ...displayAdjs.map((adj) {
                    return ListTile(
                      dense: true,
                      title: Text(
                        'Adjustment on ${DateFormat('dd MMM hh:mm a').format(DateTime.parse(adj.editedAt))}',
                        style: const TextStyle(fontSize: 12),
                      ),
                      subtitle: Text(
                        adj.reason ?? 'Bill modified',
                        style: const TextStyle(fontSize: 10),
                      ),
                      trailing: Text(
                        '${adj.difference > 0 ? "+" : ""}${adj.difference.toStringAsFixed(0)}',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: adj.difference > 0 ? Colors.green : Colors.red,
                        ),
                      ),
                    );
                  }),
                ],
              ),
            ),
          ],

          const SizedBox(height: 24),
          // SECTION C: BILLS LIST
          const Text(
            'BILLS LIST',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: Colors.brown,
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(height: 8),
          ...displayTxs.map((bill) {
            return Card(
              color: Colors.white,
              margin: const EdgeInsets.only(bottom: 12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
                side: const BorderSide(color: Color(0xFFCFCAC0)),
              ),
              child: ListTile(
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => BillDetailsScreen(bill: bill),
                    ),
                  );
                },
                title: Text(
                  'Bill #${bill.billNumber ?? bill.id.substring(bill.id.length - 6)}',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontFamily: 'serif',
                  ),
                ),
                subtitle: Text(
                  DateFormat('dd MMMM yyyy').format(DateTime.parse(bill.date)),
                ),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      bill.totalAmount.toStringAsFixed(0),
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    const Icon(Icons.chevron_right),
                  ],
                ),
              ),
            );
          }),
          const SizedBox(height: 80),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showTransactionOptions(context),
        backgroundColor: const Color(0xFF8C6A4F),
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: Text(TranslationService.t('addTransaction', lang)),
      ),
    );
  }

  void _showTransactionOptions(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFFFAF8F3),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const CircleAvatar(
                backgroundColor: Color(0xFF6B7A50),
                child: Icon(Icons.shopping_cart, color: Colors.white),
              ),
              title: const Text(
                'New Sale / Update Bill',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              subtitle: const Text('Add items or update your open bill'),
              onTap: () {
                Navigator.pop(context);
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) =>
                        SellItemsScreen(initialCustomerId: widget.customer.id),
                  ),
                );
              },
            ),
            const Divider(),
            ListTile(
              leading: const CircleAvatar(
                backgroundColor: Color(0xFF8C6A4F),
                child: Icon(Icons.edit_note, color: Colors.white),
              ),
              title: const Text(
                'Manual Entry (Jama/Udhar)',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              subtitle: const Text('Quick manual entry without items'),
              onTap: () {
                Navigator.pop(context);
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) =>
                        NewTransactionScreen(customerId: widget.customer.id),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  final String label;
  final double value;
  final Color color;
  final bool isBold;
  final double fontSize;

  const _SummaryRow({
    required this.label,
    required this.value,
    required this.color,
    this.isBold = false,
    this.fontSize = 14,
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
              color: isBold ? Colors.black87 : Colors.grey[700],
              fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
            ),
          ),
          Text(
            value.toStringAsFixed(0),
            style: TextStyle(
              fontSize: fontSize,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}
