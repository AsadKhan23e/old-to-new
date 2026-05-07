import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../logic/providers/app_data_provider.dart';
import '../../models/app_models.dart';
import 'package:intl/intl.dart';

class TransactionsScreen extends ConsumerStatefulWidget {
  const TransactionsScreen({super.key});

  @override
  ConsumerState<TransactionsScreen> createState() => _TransactionsScreenState();
}

class _TransactionsScreenState extends ConsumerState<TransactionsScreen> {
  final _searchCtrl = TextEditingController();
  String _searchQuery = '';

  @override
  Widget build(BuildContext context) {
    final appDataAsync = ref.watch(appDataProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFFAF8F3),
      body: appDataAsync.when(
        data: (data) => _buildContent(data),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
      ),
    );
  }

  Widget _buildContent(AppData data) {
    final filtered = data.transactions.where((tx) {
      final customerName = data.customers
          .firstWhere(
            (c) => c.id == tx.customerId,
            orElse: () =>
                Customer(id: '', name: 'Unknown', phone: '', dateAdded: ''),
          )
          .name;
      return customerName.toLowerCase().contains(_searchQuery);
    }).toList();
    filtered.sort((a, b) => b.date.compareTo(a.date));

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: TextField(
            controller: _searchCtrl,
            onChanged: (val) =>
                setState(() => _searchQuery = val.toLowerCase()),
            decoration: InputDecoration(
              hintText: 'Search Transactions by Customer...',
              prefixIcon: const Icon(Icons.search, color: Color(0xFF8C6A4F)),
              filled: true,
              fillColor: Colors.white,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFFCFCAC0)),
              ),
            ),
          ),
        ),
        Expanded(
          child: filtered.isEmpty
              ? const Center(
                  child: Text(
                    'No transactions Found.',
                    style: TextStyle( color: Colors.grey),
                  ),
                )
              : ListView.builder(
                  itemCount: filtered.length,
                  itemBuilder: (context, index) {
                    final tx = filtered[index];
                    final customer = data.customers.firstWhere(
                      (c) => c.id == tx.customerId,
                      orElse: () => Customer(
                        id: '',
                        name: 'Unknown',
                        phone: '',
                        dateAdded: '',
                      ),
                    );
                    return _buildTransactionItem(tx, customer);
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildTransactionItem(Transaction tx, Customer customer) {
    bool isJama = tx.type == 'debit' || (tx.amountPaid > 0 && tx.items == null);

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFCFCAC0)),
      ),
      child: ListTile(
        title: Row(
          children: [
            Expanded(
              child: Text(
                customer.name,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  
                ),
              ),
            ),
            Text(
              DateFormat('dd MMM yy').format(DateTime.parse(tx.date)),
              style: const TextStyle(fontSize: 10, color: Colors.grey),
            ),
          ],
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              tx.items != null
                  ? 'Bill #${tx.id.substring(tx.id.length - 4)}'
                  : (tx.type ?? 'Payment'),
              style: const TextStyle(fontSize: 12),
            ),
            if (tx.notes != null && tx.notes!.isNotEmpty)
              Text(
                tx.notes!,
                style: const TextStyle(
                  fontSize: 10,
                  fontStyle: FontStyle.italic,
                  color: Colors.blueGrey,
                ),
              ),
          ],
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              tx.totalAmount.toStringAsFixed(0),
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: isJama ? Colors.green : Colors.red,
              ),
            ),
            const Text(
              'Amount',
              style: TextStyle(fontSize: 8, color: Colors.grey),
            ),
          ],
        ),
      ),
    );
  }
}
