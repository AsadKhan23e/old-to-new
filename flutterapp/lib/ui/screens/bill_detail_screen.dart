import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../data/models/bill_model.dart';
import '../../data/models/item_model.dart';
import '../../data/models/payment_model.dart';
import '../../logic/providers/customer_provider.dart';
import '../../logic/providers/bill_provider.dart';
import '../../logic/providers/payment_provider.dart';

class BillDetailScreen extends ConsumerWidget {
  final BillModel bill;
  const BillDetailScreen({super.key, required this.bill});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final itemsAsync = ref.watch(billItemsProvider(bill.id));
    final paymentsAsync = ref.watch(billPaymentsProvider(bill.id));
    final totalAsync = ref.watch(billTotalProvider(bill.id));
    final paidAsync = ref.watch(billPaidProvider(bill.id));

    return Scaffold(
      backgroundColor: const Color(0xFFFAF8F3),
      appBar: AppBar(
        title: Text(
          'Bill #${bill.id.substring(bill.id.length - 4).toUpperCase()}',
          style: const TextStyle(),
        ),
        actions: [
          if (bill.status == 'open')
            TextButton.icon(
              onPressed: () => _finalizeBill(context, ref),
              icon: const Icon(Icons.check_circle, color: Colors.green),
              label: const Text(
                'Finalize',
                style: TextStyle(color: Colors.green),
              ),
            ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    _summaryRow('Total Amount', totalAsync.value ?? 0.0),
                    _summaryRow('Total Paid', paidAsync.value ?? 0.0),
                    const Divider(),
                    _summaryRow(
                      'Remaining',
                      (totalAsync.value ?? 0.0) - (paidAsync.value ?? 0.0),
                      isTotal: true,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            _sectionTitle('Items'),
            itemsAsync.when(
              data: (items) =>
                  Column(children: items.map((i) => _itemTile(i)).toList()),
              loading: () => const CircularProgressIndicator(),
              error: (e, _) => Text('Error: $e'),
            ),
            const SizedBox(height: 16),
            _sectionTitle('Payments'),
            paymentsAsync.when(
              data: (payments) => Column(
                children: payments.map((p) => _paymentTile(p)).toList(),
              ),
              loading: () => const CircularProgressIndicator(),
              error: (e, _) => Text('Error: $e'),
            ),
          ],
        ),
      ),
      floatingActionButton: bill.status == 'open'
          ? FloatingActionButton.extended(
              onPressed: () => _addPayment(context, ref),
              label: const Text('Add Payment'),
              icon: const Icon(Icons.payment),
              backgroundColor: const Color(0xFF8C6A4F),
            )
          : null,
    );
  }

  void _finalizeBill(BuildContext context, WidgetRef ref) async {
    final confirm =
        await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Finalize Bill?'),
            content: const Text(
              'This will make the bill immutable. No more items or payments can be added.',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: const Text('Cancel'),
              ),
              TextButton(
                onPressed: () => Navigator.pop(context, true),
                child: const Text('Finalize'),
              ),
            ],
          ),
        ) ??
        false;

    if (confirm) {
      await ref.read(firestoreServiceProvider).finalizeBill(bill.id);
      if (context.mounted) Navigator.pop(context);
    }
  }

  void _addPayment(BuildContext context, WidgetRef ref) {
    final amountCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Add Payment'),
        content: TextField(
          controller: amountCtrl,
          decoration: const InputDecoration(labelText: 'Amount (Rs.)'),
          keyboardType: TextInputType.number,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              final amt = double.tryParse(amountCtrl.text) ?? 0.0;
              if (amt > 0) {
                ref.read(firestoreServiceProvider).addBillPayment(bill.id, amt);
              }
              Navigator.pop(context);
            },
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }

  Widget _sectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        children: [
          Text(
            title,
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 18,
              
            ),
          ),
          const Expanded(child: Divider(indent: 16)),
        ],
      ),
    );
  }

  Widget _summaryRow(String title, double amount, {bool isTotal = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            title,
            style: TextStyle(
              fontSize: isTotal ? 18 : 14,
              fontWeight: isTotal ? FontWeight.bold : FontWeight.normal,
            ),
          ),
          Text(
            'Rs. ${amount.toStringAsFixed(0)}',
            style: TextStyle(
              fontSize: isTotal ? 18 : 14,
              fontWeight: FontWeight.bold,
              color: isTotal ? Colors.red : Colors.black,
            ),
          ),
        ],
      ),
    );
  }

  Widget _itemTile(BillItemModel item) {
    return ListTile(
      title: Text(item.name),
      subtitle: Text('${item.quantity} x Rs. ${item.price.toStringAsFixed(0)}'),
      trailing: Text(
        'Rs. ${(item.price * item.quantity).toStringAsFixed(0)}',
        style: const TextStyle(fontWeight: FontWeight.bold),
      ),
    );
  }

  Widget _paymentTile(PaymentModel p) {
    return ListTile(
      leading: const Icon(Icons.arrow_downward, color: Colors.green),
      title: Text('Payment Received'),
      subtitle: Text(DateFormat('dd MMM yy, hh:mm a').format(p.createdAt)),
      trailing: Text(
        'Rs. ${p.amount.toStringAsFixed(0)}',
        style: const TextStyle(
          fontWeight: FontWeight.bold,
          color: Colors.green,
        ),
      ),
    );
  }
}
