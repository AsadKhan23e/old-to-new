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
                    style: TextStyle(color: Colors.grey),
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
    final status = _getTransactionStatus(tx);
    final description = _getTransactionDescription(tx);
    final isPositive = tx.type == 'debit' || tx.paid;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFCFCAC0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        title: Row(
          children: [
            Expanded(
              child: Text(
                customer.name,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                  color: Color(0xFF2F2F2F),
                ),
              ),
            ),
            Text(
              DateFormat(
                'dd MMM yyyy, hh:mm a',
              ).format(DateTime.parse(tx.date)),
              style: const TextStyle(fontSize: 10, color: Colors.grey),
            ),
          ],
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Text(
              description,
              style: const TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 13,
                color: Colors.black87,
              ),
            ),
            const SizedBox(height: 2),
            Row(
              children: [
                Text(
                  status,
                  style: TextStyle(
                    fontSize: 11,
                    color: Colors.grey.shade600,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                if (tx.notes != null && tx.notes!.isNotEmpty) ...[
                  const SizedBox(width: 8),
                  const Text('•', style: TextStyle(color: Colors.grey)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      tx.notes!,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 11,
                        fontStyle: FontStyle.italic,
                        color: Colors.blueGrey,
                      ),
                    ),
                  ),
                ],
              ],
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
                fontSize: 18,
                color: isPositive ? Colors.green.shade700 : Colors.red.shade700,
              ),
            ),
            Text(
              isPositive ? 'IN' : 'OUT',
              style: TextStyle(
                fontSize: 9,
                fontWeight: FontWeight.bold,
                color: isPositive ? Colors.green : Colors.red,
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _getTransactionStatus(Transaction tx) {
    if (tx.type == 'credit') return 'Credit';
    if (tx.type == 'debit') return 'Debit';
    if (tx.paid) return 'Paid';
    if (tx.amountPaid > 0) return 'Partially Paid';
    return 'Credit';
  }

  String _getTransactionDescription(Transaction tx) {
    if (tx.items != null && tx.items!.isNotEmpty) {
      return tx.items!.length > 1
          ? '${tx.items![0].itemName} + ${tx.items!.length - 1} more'
          : tx.items![0].itemName;
    }
    return tx.type == 'credit' ? 'Manual Credit' : 'Manual Debit';
  }
}
