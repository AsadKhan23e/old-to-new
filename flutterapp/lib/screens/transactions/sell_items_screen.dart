import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/app_provider.dart';
import '../../models/app_models.dart';
import '../../services/translation_service.dart';

class SellItemsScreen extends StatefulWidget {
  final String? initialCustomerId;
  const SellItemsScreen({super.key, this.initialCustomerId});

  @override
  State<SellItemsScreen> createState() => _SellItemsScreenState();
}

class _SellItemsScreenState extends State<SellItemsScreen> {
  String? _selectedCustomerId;
  String _date = DateTime.now().toIso8601String().split('T')[0];
  final TextEditingController _paymentCtrl = TextEditingController();
  final TextEditingController _notesCtrl = TextEditingController();

  final Map<String, int> _selectedItemsWithQty = {};
  final Map<String, double> _customPrices = {};

  @override
  void initState() {
    super.initState();
    _selectedCustomerId = widget.initialCustomerId;
  }

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<AppProvider>(context);
    final lang = provider.appData?.settings.language ?? 'en';
    final customers =
        provider.appData?.customers.where((c) => !c.isSupplier).toList() ?? [];
    customers.sort((a, b) => a.name.compareTo(b.name));

    // Group items by name to match web app logic
    final Map<String, List<Item>> groupedItems = {};
    for (var item in provider.appData?.items ?? []) {
      if (item.quantity > 0) {
        groupedItems.putIfAbsent(item.itemName, () => []).add(item);
      }
    }

    double currentBill = 0;
    _selectedItemsWithQty.forEach((itemName, qty) {
      double price =
          _customPrices[itemName] ?? groupedItems[itemName]![0].sellingPrice;
      currentBill += qty * price;
    });

    double previousBalance = 0;
    if (_selectedCustomerId != null) {
      final customerTxs =
          provider.appData?.transactions
              .where((t) => t.customerId == _selectedCustomerId)
              .toList() ??
          [];
      customerTxs.sort((a, b) => b.date.compareTo(a.date));
      if (customerTxs.isNotEmpty) {
        previousBalance = customerTxs.first.remainingBalance;
      }
    }

    double grandTotal = previousBalance + currentBill;

    return Scaffold(
      backgroundColor: const Color(0xFFFAF8F3),
      appBar: AppBar(
        title: Text(
          TranslationService.t('createSale', lang),
          style: const TextStyle(
            fontFamily: 'serif',
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Customer Section
            Text(
              TranslationService.t('selectCustomer', lang),
              style: const TextStyle(
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
                    initialValue: _selectedCustomerId,
                    items: customers
                        .map(
                          (c) => DropdownMenuItem(
                            value: c.id,
                            child: Text(c.name),
                          ),
                        )
                        .toList(),
                    onChanged: (val) =>
                        setState(() => _selectedCustomerId = val),
                    decoration: const InputDecoration(
                      border: OutlineInputBorder(),
                      hintText: 'Select Customer',
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton.filled(
                  onPressed: () =>
                      _showAddCustomerDialog(context, provider, lang),
                  icon: const Icon(Icons.person_add),
                  style: IconButton.styleFrom(
                    backgroundColor: const Color(0xFF8C6A4F),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Date Picker
            Text(
              TranslationService.t('date', lang),
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontFamily: 'serif',
              ),
            ),
            const SizedBox(height: 8),
            InkWell(
              onTap: () async {
                final picked = await showDatePicker(
                  context: context,
                  initialDate: DateTime.now(),
                  firstDate: DateTime(2000),
                  lastDate: DateTime(2100),
                );
                if (picked != null) {
                  setState(
                    () => _date = picked.toIso8601String().split('T')[0],
                  );
                }
              },
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 15,
                ),
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey),
                  borderRadius: BorderRadius.circular(4),
                  color: Colors.white,
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.calendar_today,
                      size: 18,
                      color: Colors.grey,
                    ),
                    const SizedBox(width: 10),
                    Text(_date, style: const TextStyle(fontSize: 16)),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 24),

            // Items Section
            Text(
              TranslationService.t('availableItems', lang),
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontFamily: 'serif',
                fontSize: 18,
              ),
            ),
            const SizedBox(height: 8),
            if (groupedItems.isEmpty)
              const Padding(
                padding: EdgeInsets.all(16),
                child: Text(
                  'No items in stock.',
                  style: TextStyle(
                    color: Colors.grey,
                    fontStyle: FontStyle.italic,
                  ),
                ),
              )
            else
              ...groupedItems.keys.map((itemName) {
                final batch = groupedItems[itemName]!;
                final totalStock = batch.fold<int>(
                  0,
                  (sum, i) => sum + i.quantity,
                );
                final defaultPrice = batch[0].sellingPrice;

                int selectedQty = _selectedItemsWithQty[itemName] ?? 0;
                bool isIncluded = selectedQty > 0;

                return Card(
                  color: isIncluded ? const Color(0xFFF0EBE1) : Colors.white,
                  margin: const EdgeInsets.only(bottom: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                    side: BorderSide(
                      color: isIncluded
                          ? const Color(0xFF8C6A4F)
                          : const Color(0xFFCFCAC0),
                    ),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      children: [
                        Row(
                          children: [
                            Checkbox(
                              value: isIncluded,
                              activeColor: const Color(0xFF8C6A4F),
                              onChanged: (val) {
                                setState(() {
                                  if (val == true) {
                                    _selectedItemsWithQty[itemName] = 1;
                                    _customPrices[itemName] = defaultPrice;
                                  } else {
                                    _selectedItemsWithQty.remove(itemName);
                                    _customPrices.remove(itemName);
                                  }
                                });
                              },
                            ),
                            Expanded(
                              child: Text(
                                itemName,
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                ),
                              ),
                            ),
                            Text(
                              'Stock: $totalStock',
                              style: const TextStyle(
                                fontSize: 12,
                                color: Colors.grey,
                              ),
                            ),
                          ],
                        ),
                        if (isIncluded) ...[
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Expanded(
                                flex: 2,
                                child: TextField(
                                  decoration: const InputDecoration(
                                    labelText: 'Selling Price',
                                    prefixText: 'Rs. ',
                                  ),
                                  keyboardType: TextInputType.number,
                                  onChanged: (val) => _customPrices[itemName] =
                                      double.tryParse(val) ?? defaultPrice,
                                  controller: TextEditingController(
                                    text:
                                        (_customPrices[itemName] ??
                                                defaultPrice)
                                            .toStringAsFixed(0),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                flex: 1,
                                child: TextField(
                                  decoration: const InputDecoration(
                                    labelText: 'Quantity',
                                  ),
                                  keyboardType: TextInputType.number,
                                  onChanged: (val) {
                                    int q = int.tryParse(val) ?? 1;
                                    if (q > totalStock) q = totalStock;
                                    setState(
                                      () => _selectedItemsWithQty[itemName] = q,
                                    );
                                  },
                                  controller: TextEditingController(
                                    text: selectedQty.toString(),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                );
              }),

            const SizedBox(height: 24),

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
                  _SummaryRow(label: 'Items Total:', value: currentBill),
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

            // Payment Input
            TextField(
              controller: _paymentCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Amount Paid Now',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.payments),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _notesCtrl,
              decoration: const InputDecoration(
                labelText: 'General Notes',
                border: OutlineInputBorder(),
              ),
              maxLines: 2,
            ),
            const SizedBox(height: 32),

            // Actions
            ElevatedButton(
              onPressed: () => _handleConfirmSale(
                provider,
                groupedItems,
                currentBill,
                previousBalance,
                grandTotal,
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF6B7A50),
                foregroundColor: Colors.white,
                minimumSize: const Size(double.infinity, 54),
              ),
              child: const Text(
                'CONFIRM & SAVE SALE',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  void _handleConfirmSale(
    AppProvider provider,
    Map<String, List<Item>> groupedItems,
    double currentBill,
    double previousBalance,
    double grandTotal,
  ) {
    if (_selectedCustomerId == null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Please select a customer')));
      return;
    }
    if (_selectedItemsWithQty.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select at least one item')),
      );
      return;
    }

    final customers = provider.appData?.customers ?? [];
    final customer = customers.firstWhere((c) => c.id == _selectedCustomerId);

    // Check for existing open bill
    final openBillIndex = provider.appData?.transactions.indexWhere(
      (tx) => tx.customerId == customer.id && tx.status == 'open',
    );

    List<SoldItem> newSoldItems = [];
    _selectedItemsWithQty.forEach((itemName, qty) {
      double price =
          _customPrices[itemName] ?? groupedItems[itemName]![0].sellingPrice;
      // Deduct stock logic (simplified for this chunk, using same as before)
      int remainingToDeduct = qty;
      final sortedBatches = List<Item>.from(groupedItems[itemName]!);
      sortedBatches.sort((a, b) => a.createdAt.compareTo(b.createdAt));

      for (var batch in sortedBatches) {
        if (remainingToDeduct <= 0) break;
        int deductFromThis = remainingToDeduct > batch.quantity
            ? batch.quantity
            : remainingToDeduct;
        final updatedItem = Item(
          id: batch.id,
          itemName: batch.itemName,
          purchasePrice: batch.purchasePrice,
          sellingPrice: batch.sellingPrice,
          quantity: batch.quantity - deductFromThis,
          supplierName: batch.supplierName,
          supplierPhone: batch.supplierPhone,
          createdAt: batch.createdAt,
          notes: batch.notes,
          picture: batch.picture,
        );
        provider.updateItem(updatedItem);
        remainingToDeduct -= deductFromThis;
      }

      newSoldItems.add(
        SoldItem(
          itemId: 'grouped_$itemName',
          itemName: itemName,
          quantity: qty,
          unitPrice: price,
        ),
      );
    });

    double paidAmountNow = double.tryParse(_paymentCtrl.text) ?? 0;

    if (openBillIndex != null && openBillIndex != -1) {
      // RULE: ADD items into existing bill
      final existingBill = provider.appData!.transactions[openBillIndex];
      final List<SoldItem> updatedItems = [
        ...(existingBill.items ?? []),
        ...newSoldItems,
      ];
      final double newTotalAmount = updatedItems.fold(
        0,
        (sum, item) => sum + (item.quantity * item.unitPrice),
      );
      final double newGrandTotal =
          (existingBill.previousBalance ?? 0.0) + newTotalAmount;

      final List<Payment> updatedPayments = [
        ...(existingBill.additionalPayments ?? []),
      ];
      if (paidAmountNow > 0) {
        updatedPayments.add(
          Payment(
            id: DateTime.now().millisecondsSinceEpoch.toString(),
            amount: paidAmountNow,
            date: DateTime.now().toIso8601String(),
            notes: _notesCtrl.text.isNotEmpty ? _notesCtrl.text : 'Sale update',
          ),
        );
      }

      final List<BillAdjustment> updatedAdjustments = [
        ...(existingBill.billAdjustments ?? []),
        BillAdjustment(
          previousGrandTotal: existingBill.grandTotal ?? 0.0,
          newGrandTotal: newGrandTotal,
          difference: newGrandTotal - (existingBill.grandTotal ?? 0.0),
          editedAt: DateTime.now().toIso8601String(),
          reason: 'Added items via Sale screen',
        ),
      ];

      final updatedBill = Transaction(
        id: existingBill.id,
        customerId: existingBill.customerId,
        customerName: existingBill.customerName,
        type: existingBill.type,
        items: updatedItems,
        totalAmount: newTotalAmount,
        amountPaid: existingBill.amountPaid,
        additionalPayments: updatedPayments,
        date: existingBill.date,
        previousBalance: existingBill.previousBalance ?? 0.0,
        grandTotal: newGrandTotal,
        remainingBalance:
            newGrandTotal -
            existingBill.amountPaid -
            updatedPayments.fold(0.0, (s, p) => s + p.amount),
        notes: existingBill.notes,
        paid: false,
        status: 'open',
        billAdjustments: updatedAdjustments,
        billNumber: existingBill.billNumber,
      );

      provider.updateTransaction(updatedBill);
    } else {
      // Create NEW open bill
      String txId = DateTime.now().millisecondsSinceEpoch.toString();
      provider.addTransaction(
        Transaction(
          id: txId,
          customerId: customer.id,
          customerName: customer.name,
          type: 'credit',
          items: newSoldItems,
          totalAmount: currentBill,
          amountPaid: paidAmountNow,
          date: '${_date}T12:00:00Z',
          previousBalance: previousBalance,
          grandTotal: grandTotal,
          remainingBalance: grandTotal - paidAmountNow,
          notes: _notesCtrl.text,
          paid: (grandTotal - paidAmountNow) <= 0,
          status: 'open',
        ),
      );
    }
    Navigator.pop(context);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Sale recorded successfully!')),
    );
  }

  void _showAddCustomerDialog(
    BuildContext context,
    AppProvider provider,
    String lang,
  ) {
    final nameController = TextEditingController();
    final phoneController = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(TranslationService.t('addNewCustomer', lang)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameController,
              decoration: InputDecoration(
                labelText: TranslationService.t('nameLabel', lang),
              ),
            ),
            TextField(
              controller: phoneController,
              decoration: InputDecoration(
                labelText: TranslationService.t('phoneLabel', lang),
              ),
              keyboardType: TextInputType.phone,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(TranslationService.t('cancel', lang)),
          ),
          ElevatedButton(
            onPressed: () {
              if (nameController.text.isNotEmpty &&
                  phoneController.text.isNotEmpty) {
                final newCustomer = Customer(
                  id: DateTime.now().millisecondsSinceEpoch.toString(),
                  name: nameController.text,
                  phone: phoneController.text,
                  dateAdded: DateTime.now().toIso8601String(),
                );
                provider.addCustomer(newCustomer);
                setState(() => _selectedCustomerId = newCustomer.id);
                Navigator.pop(context);
              }
            },
            child: Text(TranslationService.t('add', lang)),
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
              fontSize: isBold ? 18 : 14,
            ),
          ),
        ],
      ),
    );
  }
}
