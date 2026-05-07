import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../logic/providers/app_data_provider.dart';
import '../../models/app_models.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import 'package:uuid/uuid.dart';
import 'package:intl/intl.dart';

class PurchaseScreen extends ConsumerStatefulWidget {
  const PurchaseScreen({super.key});

  @override
  ConsumerState<PurchaseScreen> createState() => _PurchaseScreenState();
}

class _PurchaseScreenState extends ConsumerState<PurchaseScreen> {
  String? _selectedSupplierId;
  final List<_PurchaseItemEntry> _items = [];
  final _paymentCtrl = TextEditingController(text: '0');
  final _notesCtrl = TextEditingController();
  DateTime _purchaseDate = DateTime.now();
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _addNewRow();
  }

  void _addNewRow() {
    setState(() => _items.add(_PurchaseItemEntry(id: const Uuid().v4())));
  }

  void _removeRow(int index) {
    if (_items.length > 1) {
      setState(() => _items.removeAt(index));
    }
  }

  double get _totalBill => _items.fold(
    0,
    (sum, item) =>
        sum +
        (double.tryParse(item.buyPriceCtrl.text) ?? 0) *
            (int.tryParse(item.qtyCtrl.text) ?? 0),
  );

  @override
  Widget build(BuildContext context) {
    final data = ref.watch(appDataProvider).value;
    final suppliers = data?.customers.where((c) => c.isSupplier).toList() ?? [];

    double prevBalance = 0;
    if (_selectedSupplierId != null) {
      final sTxs = (data?.transactions ?? [])
          .where((t) => t.customerId == _selectedSupplierId)
          .toList();
      sTxs.sort((a, b) => b.date.compareTo(a.date));
      prevBalance = sTxs.isNotEmpty ? sTxs.first.remainingBalance : 0;
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9),
      appBar: AppBar(
        title: const Text(
          'Add New Purchase',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          onPressed: () => Navigator.pop(context),
          icon: const Icon(Icons.close, color: Colors.grey),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            _buildSupplierSelection(suppliers),
            const SizedBox(height: 16),
            ..._items
                .asMap()
                .entries
                .map((e) => _buildItemCard(e.key))
                ,
            const SizedBox(height: 12),
            _buildAddMoreButton(),
            const SizedBox(height: 16),
            _buildFooterFields(),
            const SizedBox(height: 16),
            _buildBillingSummary(prevBalance),
            const SizedBox(height: 24),
            _buildActionButtons(),
          ],
        ),
      ),
    );
  }

  Widget _buildSupplierSelection(List<Customer> suppliers) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          Expanded(
            child: DropdownButtonFormField<String>(
              initialValue: _selectedSupplierId,
              decoration: const InputDecoration(
                labelText: 'Select Supplier',
                border: OutlineInputBorder(
                  borderSide: BorderSide(color: Color(0xFFE2E8F0)),
                ),
              ),
              items: suppliers
                  .map(
                    (s) => DropdownMenuItem(value: s.id, child: Text(s.name)),
                  )
                  .toList(),
              onChanged: (val) => setState(() => _selectedSupplierId = val),
            ),
          ),
          const SizedBox(width: 8),
          ElevatedButton(
            onPressed: _showAddSupplierDialog,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFF1F5F9),
              foregroundColor: Colors.black87,
              elevation: 0,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            child: const Text(
              'Add New Supplier',
              style: TextStyle(fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildItemCard(int index) {
    final entry = _items[index];
    final rowTotal =
        (double.tryParse(entry.buyPriceCtrl.text) ?? 0) *
        (int.tryParse(entry.qtyCtrl.text) ?? 0);

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                flex: 3,
                child: _compactField(entry.nameCtrl, 'Item Name'),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _compactField(entry.buyPriceCtrl, 'Buy', isNum: true),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _compactField(entry.sellPriceCtrl, 'Sell', isNum: true),
              ),
              const SizedBox(width: 8),
              Expanded(child: _compactField(entry.qtyCtrl, 'Qty', isNum: true)),
              const SizedBox(width: 12),
              Text(
                rowTotal.toStringAsFixed(0),
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
              const SizedBox(width: 8),
              IconButton(
                onPressed: () => _removeRow(index),
                icon: const Icon(Icons.close, color: Colors.red, size: 20),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                  image: entry.image != null
                      ? DecorationImage(
                          image: FileImage(entry.image!),
                          fit: BoxFit.cover,
                        )
                      : null,
                ),
                child: entry.image == null
                    ? const Icon(Icons.camera_alt_outlined, color: Colors.grey)
                    : null,
              ),
              const SizedBox(width: 16),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  OutlinedButton.icon(
                    onPressed: () => _pickImage(entry, ImageSource.camera),
                    icon: const Icon(Icons.camera_alt, size: 16),
                    label: const Text('Use Back Camera'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF64748B),
                      side: const BorderSide(color: Color(0xFFE2E8F0)),
                    ),
                  ),
                  const SizedBox(height: 8),
                  OutlinedButton.icon(
                    onPressed: () => _pickImage(entry, ImageSource.gallery),
                    icon: const Icon(Icons.upload, size: 16),
                    label: const Text('Upload Picture'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF64748B),
                      side: const BorderSide(color: Color(0xFFE2E8F0)),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _compactField(
    TextEditingController ctrl,
    String label, {
    bool isNum = false,
  }) {
    return TextField(
      controller: ctrl,
      decoration: InputDecoration(
        labelText: label,
        border: const OutlineInputBorder(
          borderSide: BorderSide(color: Color(0xFFE2E8F0)),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 0),
      ),
      keyboardType: isNum ? TextInputType.number : TextInputType.text,
      onChanged: (v) => setState(() {}),
    );
  }

  Widget _buildAddMoreButton() {
    return Center(
      child: TextButton.icon(
        onPressed: _addNewRow,
        icon: const Icon(Icons.add_circle_outline),
        label: const Text('Add Another Item'),
        style: TextButton.styleFrom(foregroundColor: Color(0xFF64748B)),
      ),
    );
  }

  Widget _buildFooterFields() {
    return Column(
      children: [
        _buildDatePicker(),
        const SizedBox(height: 12),
        TextField(
          controller: _notesCtrl,
          decoration: const InputDecoration(
            labelText: 'Notes (Optional)',
            border: OutlineInputBorder(),
            fillColor: Colors.white,
            filled: true,
          ),
          maxLines: 2,
        ),
      ],
    );
  }

  Widget _buildDatePicker() {
    return InkWell(
      onTap: () async {
        final d = await showDatePicker(
          context: context,
          initialDate: _purchaseDate,
          firstDate: DateTime(2000),
          lastDate: DateTime(2100),
        );
        if (d != null) setState(() => _purchaseDate = d);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Purchase Date',
                  style: TextStyle(fontSize: 10, color: Colors.grey),
                ),
                Text(DateFormat('dd/MM/yyyy').format(_purchaseDate)),
              ],
            ),
            const Icon(Icons.calendar_today, size: 16, color: Colors.grey),
          ],
        ),
      ),
    );
  }

  Widget _buildBillingSummary(double prevBalance) {
    final grandTotal = prevBalance + _totalBill;
    final paid = double.tryParse(_paymentCtrl.text) ?? 0;
    final remaining = grandTotal - paid;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Billing Summary',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
          ),
          const SizedBox(height: 16),
          _summaryRow('Total Purchase Bill', _totalBill),
          _summaryRow('Previous Balance', prevBalance),
          const Divider(height: 24),
          _summaryRow('Grand Total', grandTotal, isBold: true),
          const SizedBox(height: 16),
          _numField(
            _paymentCtrl,
            'Payment Made Now',
            'Enter amount paid to supplier',
          ),
          const SizedBox(height: 12),
          _summaryRow(
            'Remaining Balance',
            remaining,
            color: const Color(0xFF8C6A4F),
            isBold: true,
          ),
        ],
      ),
    );
  }

  Widget _summaryRow(
    String label,
    double val, {
    bool isBold = false,
    Color? color,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: isBold ? 14 : 13,
              fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
              color: isBold ? const Color(0xFF1E293B) : const Color(0xFF64748B),
            ),
          ),
          Text(
            val.toStringAsFixed(0),
            style: TextStyle(
              fontSize: isBold ? 16 : 14,
              fontWeight: FontWeight.bold,
              color: color ?? const Color(0xFF1E293B),
            ),
          ),
        ],
      ),
    );
  }

  Widget _numField(TextEditingController ctrl, String label, String hint) {
    return TextField(
      controller: ctrl,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        border: const OutlineInputBorder(),
      ),
      keyboardType: TextInputType.number,
      onChanged: (v) => setState(() {}),
    );
  }

  Widget _buildActionButtons() {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton(
            onPressed: () => Navigator.pop(context),
            style: OutlinedButton.styleFrom(
              minimumSize: const Size(0, 50),
              side: const BorderSide(color: Color(0xFFE2E8F0)),
            ),
            child: const Text(
              'Cancel',
              style: TextStyle(color: Color(0xFF64748B)),
            ),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: ElevatedButton(
            onPressed: _isSaving ? null : _savePurchase,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF8C6A4F),
              foregroundColor: Colors.white,
              minimumSize: const Size(0, 50),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            child: _isSaving
                ? const CircularProgressIndicator(color: Colors.white)
                : const Text(
                    'Save Purchase',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
          ),
        ),
      ],
    );
  }

  Future<void> _pickImage(_PurchaseItemEntry entry, ImageSource src) async {
    final picked = await ImagePicker().pickImage(source: src);
    if (picked != null) setState(() => entry.image = File(picked.path));
  }

  void _savePurchase() async {
    if (_selectedSupplierId == null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Please select a supplier')));
      return;
    }
    setState(() => _isSaving = true);
    final data = ref.read(appDataProvider).value;
    final supplier = data!.customers.firstWhere(
      (c) => c.id == _selectedSupplierId,
    );

    final List<Item> newInventoryItems = [];
    final List<SoldItem> billItems = [];
    for (var entry in _items) {
      if (entry.nameCtrl.text.isNotEmpty &&
          (int.tryParse(entry.qtyCtrl.text) ?? 0) > 0) {
        newInventoryItems.add(
          Item(
            id: const Uuid().v4(),
            itemName: entry.nameCtrl.text,
            purchasePrice: double.tryParse(entry.buyPriceCtrl.text) ?? 0,
            sellingPrice: double.tryParse(entry.sellPriceCtrl.text) ?? 0,
            quantity: int.tryParse(entry.qtyCtrl.text) ?? 0,
            supplierName: supplier.name,
            createdAt: _purchaseDate.toIso8601String(),
            picture: entry.image?.path,
          ),
        );
        billItems.add(
          SoldItem(
            itemId: entry.nameCtrl.text,
            itemName: entry.nameCtrl.text,
            quantity: int.tryParse(entry.qtyCtrl.text) ?? 0,
            unitPrice: double.tryParse(entry.buyPriceCtrl.text) ?? 0,
          ),
        );
      }
    }

    final txs = data.transactions
        .where((t) => t.customerId == supplier.id)
        .toList();
    txs.sort((a, b) => b.date.compareTo(a.date));
    final prevBal = txs.isNotEmpty ? txs.first.remainingBalance : 0;
    final paid = double.tryParse(_paymentCtrl.text) ?? 0;

    final newTx = Transaction(
      id: const Uuid().v4(),
      customerId: supplier.id,
      customerName: supplier.name,
      items: billItems,
      totalAmount: _totalBill,
      amountPaid: paid,
      type: 'purchase',
      date: _purchaseDate.toIso8601String(),
      remainingBalance: (prevBal + _totalBill) - paid,
      previousBalance: prevBal.toDouble(),
      paid: ((prevBal + _totalBill) - paid) <= 0,
    );

    for (var item in newInventoryItems) {
      ref.read(appDataProvider.notifier).addItem(item);
    }
    ref.read(appDataProvider.notifier).addTransaction(newTx);

    setState(() => _isSaving = false);
    Navigator.pop(context);
  }

  void _showAddSupplierDialog() {
    final nameCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Add New Supplier'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameCtrl,
              decoration: const InputDecoration(labelText: 'Supplier Name'),
            ),
            TextField(
              controller: phoneCtrl,
              decoration: const InputDecoration(labelText: 'Phone'),
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
              if (nameCtrl.text.isNotEmpty) {
                ref
                    .read(appDataProvider.notifier)
                    .addCustomer(
                      Customer(
                        id: const Uuid().v4(),
                        name: nameCtrl.text,
                        phone: phoneCtrl.text,
                        isSupplier: true,
                        dateAdded: DateTime.now().toIso8601String(),
                      ),
                    );
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

class _PurchaseItemEntry {
  final String id;
  final nameCtrl = TextEditingController();
  final buyPriceCtrl = TextEditingController(text: '0');
  final sellPriceCtrl = TextEditingController(text: '0');
  final qtyCtrl = TextEditingController(text: '0');
  File? image;
  _PurchaseItemEntry({required this.id});
}
