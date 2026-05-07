import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/app_provider.dart';
import '../../models/app_models.dart';
import '../../services/translation_service.dart';
import 'new_transaction_screen.dart';

class TransactionListScreen extends StatefulWidget {
  const TransactionListScreen({super.key});

  @override
  State<TransactionListScreen> createState() => _TransactionListScreenState();
}

class _TransactionListScreenState extends State<TransactionListScreen> {
  String _searchTerm = '';
  String _filter = 'all';

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<AppProvider>(context);
    final lang = provider.appData?.settings.language ?? 'en';
    final transactions = provider.appData?.transactions ?? [];

    final filteredTransactions = transactions.where((tx) {
      final customerMatch =
          tx.customerName?.toLowerCase().contains(_searchTerm.toLowerCase()) ??
          false;
      final notesMatch =
          tx.notes?.toLowerCase().contains(_searchTerm.toLowerCase()) ?? false;

      bool dateMatch = true;
      final txDate = DateTime.parse(tx.date);
      final now = DateTime.now();

      if (_filter == 'today') {
        dateMatch =
            txDate.year == now.year &&
            txDate.month == now.month &&
            txDate.day == now.day;
      } else if (_filter == 'week') {
        final weekAgo = now.subtract(const Duration(days: 7));
        dateMatch = txDate.isAfter(weekAgo);
      } else if (_filter == 'month') {
        dateMatch = txDate.year == now.year && txDate.month == now.month;
      }

      return (customerMatch || notesMatch) && dateMatch;
    }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFFAF8F3),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              children: [
                TextField(
                  onChanged: (val) => setState(() => _searchTerm = val),
                  decoration: InputDecoration(
                    hintText: TranslationService.t(
                      'searchTransactionsPlaceholder',
                      lang,
                    ),
                    hintStyle: const TextStyle(
                      fontStyle: FontStyle.italic,
                      fontFamily: 'serif',
                    ),
                    prefixIcon: const Icon(
                      Icons.search,
                      color: Color(0xFF8C6A4F),
                    ),
                    filled: true,
                    fillColor: Colors.white,
                    enabledBorder: OutlineInputBorder(
                      borderSide: const BorderSide(color: Color(0xFFCFCAC0)),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderSide: const BorderSide(
                        color: Color(0xFF8C6A4F),
                        width: 2,
                      ),
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _FilterChip(
                        label: TranslationService.t('all', lang),
                        value: 'all',
                        groupValue: _filter,
                        onSelect: (v) => setState(() => _filter = v),
                      ),
                      const SizedBox(width: 8),
                      _FilterChip(
                        label: TranslationService.t('today', lang),
                        value: 'today',
                        groupValue: _filter,
                        onSelect: (v) => setState(() => _filter = v),
                      ),
                      const SizedBox(width: 8),
                      _FilterChip(
                        label: TranslationService.t('week', lang),
                        value: 'week',
                        groupValue: _filter,
                        onSelect: (v) => setState(() => _filter = v),
                      ),
                      const SizedBox(width: 8),
                      _FilterChip(
                        label: TranslationService.t('month', lang),
                        value: 'month',
                        groupValue: _filter,
                        onSelect: (v) => setState(() => _filter = v),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: filteredTransactions.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.receipt_long,
                          size: 64,
                          color: Color(0xFFCFCAC0),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          TranslationService.t('noTransactions', lang),
                          style: const TextStyle(
                            fontFamily: 'serif',
                            fontStyle: FontStyle.italic,
                            color: Colors.grey,
                          ),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: filteredTransactions.length,
                    itemBuilder: (context, index) {
                      final tx = filteredTransactions[index];
                      return _TransactionCard(tx: tx, lang: lang);
                    },
                  ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => const NewTransactionScreen(),
            ),
          );
        },
        backgroundColor: const Color(0xFF8C6A4F),
        foregroundColor: Colors.white,
        child: const Icon(Icons.add_shopping_cart_outlined),
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final String value;
  final String groupValue;
  final Function(String) onSelect;

  const _FilterChip({
    required this.label,
    required this.value,
    required this.groupValue,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    final isSelected = value == groupValue;
    return ChoiceChip(
      label: Text(
        label,
        style: TextStyle(
          color: isSelected ? Colors.white : const Color(0xFF2F2F2F),
          fontWeight: FontWeight.bold,
          fontFamily: 'serif',
        ),
      ),
      selected: isSelected,
      onSelected: (_) => onSelect(value),
      selectedColor: const Color(0xFF6B7A50),
      backgroundColor: Colors.white,
      side: BorderSide(
        color: isSelected ? Colors.transparent : const Color(0xFFCFCAC0),
      ),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    );
  }
}

class _TransactionCard extends StatelessWidget {
  final Transaction tx;
  final String lang;
  const _TransactionCard({required this.tx, required this.lang});

  @override
  Widget build(BuildContext context) {
    final isDebit = tx.type == 'debit';
    final date = DateTime.parse(tx.date);
    final formattedDate = DateFormat('dd MMM yyyy, hh:mm a').format(date);

    String description = '';
    if (tx.items != null && tx.items!.isNotEmpty) {
      description = tx.items!.length > 1
          ? '${tx.items![0].itemName} + ${tx.items!.length - 1} more'
          : tx.items![0].itemName;
    } else {
      description = isDebit
          ? TranslationService.t('debit_long', lang)
          : TranslationService.t('credit_long', lang);
    }

    return Card(
      color: Colors.white,
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: Color(0xFFCFCAC0)),
      ),
      child: ListTile(
        title: Text(
          tx.customerName ?? '',
          style: const TextStyle(
            fontWeight: FontWeight.bold,
            fontFamily: 'serif',
          ),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              description,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
            ),
            Text(
              formattedDate,
              style: const TextStyle(fontSize: 11, color: Colors.grey),
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
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: isDebit ? Colors.green : Colors.red,
              ),
            ),
            Text(
              isDebit ? 'PAID' : 'DUE',
              style: TextStyle(
                fontSize: 10,
                color: isDebit ? Colors.green : Colors.red,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
