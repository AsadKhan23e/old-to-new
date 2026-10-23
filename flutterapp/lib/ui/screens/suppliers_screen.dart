import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../logic/providers/app_data_provider.dart';
import '../../models/app_models.dart';
import 'customer_detail_screen.dart';

class SuppliersScreen extends ConsumerStatefulWidget {
  const SuppliersScreen({super.key});

  @override
  ConsumerState<SuppliersScreen> createState() => _SuppliersScreenState();
}

class _SuppliersScreenState extends ConsumerState<SuppliersScreen> {
  final _searchCtrl = TextEditingController();
  String _searchQuery = '';

  @override
  Widget build(BuildContext context) {
    final appDataAsync = ref.watch(appDataProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFFAF8F3),
      appBar: AppBar(
        title: const Text(
          'Suppliers List',
          style: TextStyle(
            
            fontWeight: FontWeight.bold,
            color: Color(0xFF2F2F2F),
          ),
        ),
        backgroundColor: const Color(0xFFFAF8F3),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(70),
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: TextField(
              controller: _searchCtrl,
              onChanged: (val) =>
                  setState(() => _searchQuery = val.toLowerCase()),
              decoration: InputDecoration(
                hintText: 'Search Suppliers / Companies...',
                prefixIcon: const Icon(
                  Icons.business,
                  color: Color(0xFF6B7955),
                ),
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Color(0xFFCFCAC0)),
                ),
              ),
            ),
          ),
        ),
      ),
      body: appDataAsync.when(
        data: (data) {
          final suppliers = data.customers
              .where(
                (c) =>
                    c.isSupplier && c.name.toLowerCase().contains(_searchQuery),
              )
              .toList();

          if (suppliers.isEmpty) {
            return const Center(
              child: Text(
                'No suppliers found.',
                style: TextStyle(color: Colors.grey, ),
              ),
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.only(bottom: 80),
            itemCount: suppliers.length,
            itemBuilder: (context, index) {
              final supplier = suppliers[index];
              final balance = _calculateBalance(supplier.id, data.transactions);
              return _buildSupplierItem(supplier, balance);
            },
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAddSupplierDialog(context),
        backgroundColor: const Color(0xFF6B7955),
        icon: const Icon(Icons.add_business, color: Colors.white),
        label: const Text(
          'NEW SUPPLIER',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
      ),
    );
  }

  Widget _buildSupplierItem(Customer supplier, double balance) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      elevation: 0,
      color: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: Color(0xFFCFCAC0)),
      ),
      child: ListTile(
        onTap: () => Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => CustomerDetailScreen(customerId: supplier.id),
          ),
        ),
        leading: Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: const Color(0xFF6B7955).withAlpha(15),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Center(
            child: Text(
              supplier.name[0].toUpperCase(),
              style: const TextStyle(
                color: Color(0xFF6B7955),
                fontWeight: FontWeight.bold,
                fontSize: 20,
              ),
            ),
          ),
        ),
        title: Text(
          supplier.name,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
        ),
        subtitle: Text(
          'ID: ${supplier.id.substring(supplier.id.length - 4)} | ${supplier.phone}',
          style: const TextStyle(fontSize: 11),
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              balance.abs().toStringAsFixed(0),
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 18,
                color: balance > 0 ? Colors.red : Colors.green,
              ),
            ),
            Text(
              balance > 0 ? 'PAYABLE' : 'ADJUSTED',
              style: TextStyle(
                fontSize: 9,
                fontWeight: FontWeight.bold,
                color: balance > 0 ? Colors.red : Colors.green,
              ),
            ),
          ],
        ),
      ),
    );
  }

  double _calculateBalance(String supplierId, List<Transaction> transactions) {
    final txs = transactions.where((t) => t.customerId == supplierId).toList();
    if (txs.isEmpty) return 0;
    txs.sort((a, b) => b.date.compareTo(a.date));
    return txs.first.remainingBalance;
  }

  void _showAddSupplierDialog(BuildContext context) {
    final nameCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    final addrCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text(
          'Register New Supplier',
          style: TextStyle( fontWeight: FontWeight.bold),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameCtrl,
              decoration: const InputDecoration(
                labelText: 'Company / Name',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: phoneCtrl,
              decoration: const InputDecoration(
                labelText: 'Phone',
                border: OutlineInputBorder(),
              ),
              keyboardType: TextInputType.phone,
            ),
            const SizedBox(height: 8),
            TextField(
              controller: addrCtrl,
              decoration: const InputDecoration(
                labelText: 'Office Address',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('CANCEL'),
          ),
          ElevatedButton(
            onPressed: () {
              if (nameCtrl.text.isNotEmpty && phoneCtrl.text.isNotEmpty) {
                ref
                    .read(appDataProvider.notifier)
                    .addCustomer(
                      Customer(
                        id: DateTime.now().millisecondsSinceEpoch.toString(),
                        name: nameCtrl.text,
                        phone: phoneCtrl.text,
                        address: addrCtrl.text,
                        isSupplier: true,
                        dateAdded: DateTime.now().toIso8601String(),
                      ),
                    );
                Navigator.pop(context);
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF6B7955),
              foregroundColor: Colors.white,
            ),
            child: const Text('SAVE SUPPLIER'),
          ),
        ],
      ),
    );
  }
}
