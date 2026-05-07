import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/bill_model.dart';
import '../../logic/providers/bill_provider.dart';
import 'package:intl/intl.dart';

class BillCard extends ConsumerWidget {
  final BillModel bill;
  final VoidCallback onTap;

  const BillCard({super.key, required this.bill, required this.onTap});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final totalAsync = ref.watch(billTotalProvider(bill.id));

    return Card(
      child: ListTile(
        onTap: onTap,
        leading: CircleAvatar(
          backgroundColor: bill.status == 'open' ? Colors.green : Colors.grey,
          child: Icon(
            bill.status == 'open' ? Icons.lock_open : Icons.lock,
            color: Colors.white,
            size: 16,
          ),
        ),
        title: Text(
          'Bill #${bill.id.substring(bill.id.length - 4).toUpperCase()}',
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Text(
          DateFormat('dd MMM yyyy, hh:mm a').format(bill.createdAt),
        ),
        trailing: totalAsync.when(
          data: (total) => Text(
            'Rs. ${total.toStringAsFixed(0)}',
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
          ),
          loading: () => const SizedBox(
            width: 16,
            height: 16,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
          error: (_, _) => const Text('Error'),
        ),
      ),
    );
  }
}
