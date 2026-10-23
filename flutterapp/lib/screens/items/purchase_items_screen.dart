import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/app_provider.dart';
import '../../models/app_models.dart';

class PurchaseItemsScreen extends StatefulWidget {
  const PurchaseItemsScreen({super.key});

  @override
  State<PurchaseItemsScreen> createState() => _PurchaseItemsScreenState();
}

class _PurchaseItemsScreenState extends State<PurchaseItemsScreen> {
  String? _selectedSupplierId;
  final String _date = DateTime.now().toIso8601String().split('T')[0];
  final TextEditingController _paymentCtrl = TextEditingController();
  final TextEditingController _notesCtrl = TextEditingController();

  final List<Map<String, dynamic>> _purchaseItems = [
    {
      'id': DateTime.now().millisecondsSinceEpoch.toString(),
      'itemName': TextEditingController(),
      'purchasePrice': TextEditingController(),
      'sellingPrice': TextEditingController(),
      'quantity': TextEditingController(text: '1'),
    },
  ];

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<AppProvider>(context);
    final suppliers =
        provider.appData?.customers.where((c) => c.isSupplier).toList() ?? [];

    double currentBill = 0;
    for (var item in _purchaseItems) {
      double qty = double.tryParse(item['quantity'].text) ?? 0;
      double price = double.tryParse(item['purchasePrice'].text) ?? 0;
      currentBill += qty * price;
    }

    double previousBalance = 0;
    if (_selectedSupplierId != null) {
      final supplierTxs =
          provider.appData?.transactions
              .where((t) => t.customerId == _selectedSupplierId)
              .toList() ??
          [];
      supplierTxs.sort((a, b) => b.date.compareTo(a.date));
      if (supplierTxs.isNotEmpty) {
        previousBalance = supplierTxs.first.remainingBalance;
      }
    }

    double grandTotal = previousBalance + currentBill;

    return Scaffold(
      backgroundColor: const Color(0xFFFAF8F3), // Vintage Surface
      appBar: AppBar(
        title: const Text(
          'Add Purchase',
          style: TextStyle(fontFamily: 'serif', fontWeight: FontWeight.bold),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Supplier Selection
            const Text(
              'Supplier',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontFamily: 'serif',
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<String>(
                    isExpanded: true,
                    initialValue: _selectedSupplierId,
                    items: suppliers
                        .map(
                          (c) => DropdownMenuItem(
                            value: c.id,
                            child: Text(c.name),
                          ),
                        )
                        .toList(),
                    onChanged: (val) =>
                        setState(() => _selectedSupplierId = val),
                    decoration: const InputDecoration(
                      border: OutlineInputBorder(),
                      hintText: 'Select Supplier',
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton.filled(
                  onPressed: () => _showAddSupplierDialog(context, provider),
                  icon: const Icon(Icons.person_add),
                  style: IconButton.styleFrom(
                    backgroundColor: const Color(0xFF8C6A4F),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Item List
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Items',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontFamily: 'serif',
                    fontSize: 18,
                  ),
                ),
                TextButton.icon(
                  onPressed: () {
                    setState(() {
                      _purchaseItems.add({
                        'id': DateTime.now().millisecondsSinceEpoch.toString(),
                        'itemName': TextEditingController(),
                        'purchasePrice': TextEditingController(),
                        'sellingPrice': TextEditingController(),
                        'quantity': TextEditingController(text: '1'),
                      });
                    });
                  },
                  icon: const Icon(Icons.add, size: 16),
                  label: const Text('Add Item'),
                ),
              ],
            ),
            const SizedBox(height: 8),
            ..._purchaseItems.asMap().entries.map((entry) {
              int index = entry.key;
              var item = entry.value;
              return Card(
                color: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                  side: const BorderSide(color: Color(0xFFCFCAC0)),
                ),
                elevation: 0,
                margin: const EdgeInsets.only(bottom: 12),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Text(
                            'Item #${index + 1}',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          const Spacer(),
                          if (_purchaseItems.length > 1)
                            IconButton(
                              icon: const Icon(
                                Icons.delete,
                                color: Colors.red,
                                size: 20,
                              ),
                              onPressed: () => setState(
                                () => _purchaseItems.removeAt(index),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      TextField(
                        controller: item['itemName'],
                        decoration: const InputDecoration(
                          labelText: 'Item Name',
                          isDense: true,
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: item['purchasePrice'],
                              keyboardType: TextInputType.number,
                              onChanged: (_) => setState(() {}),
                              decoration: const InputDecoration(
                                labelText: 'Purchase Price',
                                isDense: true,
                                border: OutlineInputBorder(),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: TextField(
                              controller: item['sellingPrice'],
                              keyboardType: TextInputType.number,
                              decoration: const InputDecoration(
                                labelText: 'Selling Price',
                                isDense: true,
                                border: OutlineInputBorder(),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: TextField(
                              controller: item['quantity'],
                              keyboardType: TextInputType.number,
                              onChanged: (_) => setState(() {}),
                              decoration: const InputDecoration(
                                labelText: 'Qty',
                                isDense: true,
                                border: OutlineInputBorder(),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            }),
            const SizedBox(height: 16),

            // Summary
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border.all(color: const Color(0xFFCFCAC0)),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                children: [
                  _SummaryRow(label: 'Total Bill:', value: currentBill),
                  _SummaryRow(
                    label: 'Previous Balance:',
                    value: previousBalance,
                  ),
                  const Divider(),
                  _SummaryRow(
                    label: 'Grand Total:',
                    value: grandTotal,
                    isBold: true,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Payment & Details
            TextField(
              controller: _paymentCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Amount Paid',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.attach_money),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _notesCtrl,
              decoration: const InputDecoration(
                labelText: 'Notes/Receipt Details',
                border: OutlineInputBorder(),
              ),
              maxLines: 2,
            ),
            const SizedBox(height: 32),

            // Save Button
            ElevatedButton(
              onPressed: () {
                if (_selectedSupplierId == null) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Please select a supplier')),
                  );
                  return;
                }
                final supplier = suppliers.firstWhere(
                  (s) => s.id == _selectedSupplierId,
                );

                List<SoldItem> transactionItems = [];
                for (var item in _purchaseItems) {
                  if (item['itemName'].text.isEmpty) continue;
                  double pPrice =
                      double.tryParse(item['purchasePrice'].text) ?? 0;
                  double sPrice =
                      double.tryParse(item['sellingPrice'].text) ?? 0;
                  int qty = int.tryParse(item['quantity'].text) ?? 1;

                  final id =
                      '${DateTime.now().millisecondsSinceEpoch}_${item['itemName'].text}';
                  provider.addItem(
                    Item(
                      id: id,
                      itemName: item['itemName'].text,
                      purchasePrice: pPrice,
                      sellingPrice: sPrice,
                      quantity: qty,
                      supplierName: supplier.name,
                      supplierPhone: supplier.phone,
                      createdAt: DateTime.now().toIso8601String(),
                    ),
                  );

                  transactionItems.add(
                    SoldItem(
                      itemId: id,
                      itemName: item['itemName'].text,
                      quantity: qty,
                      unitPrice: pPrice,
                    ),
                  );
                }

                double paidAmount = double.tryParse(_paymentCtrl.text) ?? 0;

                provider.addTransaction(
                  Transaction(
                    id: '${DateTime.now().millisecondsSinceEpoch}_purchase',
                    customerId: supplier.id,
                    customerName: supplier.name,
                    type: 'purchase', // Exactly as web
                    items: transactionItems,
                    totalAmount: currentBill,
                    amountPaid: paidAmount,
                    date: '${_date}T12:00:00Z',
                    previousBalance: previousBalance,
                    grandTotal: grandTotal,
                    remainingBalance: grandTotal - paidAmount,
                    notes: _notesCtrl.text,
                    paid: (grandTotal - paidAmount) <= 0,
                  ),
                );

                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Purchase added successfully!')),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF8C6A4F),
                foregroundColor: Colors.white,
                minimumSize: const Size(double.infinity, 50),
              ),
              child: const Text(
                'CONFIRM PURCHASE',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  void _showAddSupplierDialog(BuildContext context, AppProvider provider) {
    final nameController = TextEditingController();
    final phoneController = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Add New Supplier'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameController,
              decoration: const InputDecoration(labelText: 'Supplier Name'),
            ),
            TextField(
              controller: phoneController,
              decoration: const InputDecoration(labelText: 'Phone Number'),
              keyboardType: TextInputType.phone,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              if (nameController.text.isNotEmpty &&
                  phoneController.text.isNotEmpty) {
                final newSupplier = Customer(
                  id: DateTime.now().millisecondsSinceEpoch.toString(),
                  name: nameController.text,
                  phone: phoneController.text,
                  dateAdded: DateTime.now().toIso8601String(),
                  isSupplier: true,
                );
                provider.addCustomer(newSupplier);
                setState(() => _selectedSupplierId = newSupplier.id);
                Navigator.pop(context);
              }
            },
            child: const Text('Add'),
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

  const _SummaryRow({
    required this.label,
    required this.value,
    this.isBold = false,
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
              color: isBold ? const Color(0xFF8C6A4F) : null,
            ),
          ),
        ],
      ),
    );
  }
}
