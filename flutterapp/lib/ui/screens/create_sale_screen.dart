import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../logic/providers/app_data_provider.dart';
import '../../models/app_models.dart';
import 'package:uuid/uuid.dart';
import 'package:intl/intl.dart';

class CreateSaleScreen extends ConsumerStatefulWidget {
  final String? customerId;
  const CreateSaleScreen({super.key, this.customerId});

  @override
  ConsumerState<CreateSaleScreen> createState() => _CreateSaleScreenState();
}

class _CreateSaleScreenState extends ConsumerState<CreateSaleScreen> {
  String? _selectedCustomerId;
  final List<SoldItem> _cart = [];
  final _customNameCtrl = TextEditingController();
  final _customQtyCtrl = TextEditingController(text: '1');
  final _customPriceCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();
  final _paymentCtrl = TextEditingController(text: '0');
  DateTime _saleDate = DateTime.now();
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _selectedCustomerId = widget.customerId;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9),
      appBar: AppBar(
        title: const Text(
          'Create Sale',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          onPressed: () => Navigator.pop(context),
          icon: const Icon(Icons.close),
        ),
      ),
      body: LayoutBuilder(
        builder: (context, constraints) {
          if (constraints.maxWidth > 900) {
            return Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  flex: 3,
                  child: SingleChildScrollView(child: _buildLeftColumn()),
                ),
                const VerticalDivider(
                  width: 1,
                  thickness: 1,
                  color: Color(0xFFE2E8F0),
                ),
                Expanded(
                  flex: 2,
                  child: SingleChildScrollView(child: _buildRightColumn()),
                ),
              ],
            );
          } else {
            return SingleChildScrollView(
              child: Column(
                children: [_buildLeftColumn(), _buildRightColumn()],
              ),
            );
          }
        },
      ),
    );
  }

  Widget _buildLeftColumn() {
    final data = ref.watch(appDataProvider).value;
    final items = data?.items ?? [];

    return Padding(
      padding: const EdgeInsets.all(20.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Available Items',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
          ),
          const SizedBox(height: 12),
          ...items.map((it) => _buildItemTile(it)),
          const SizedBox(height: 32),
          const Text(
            'Add Custom Item (Not in Stock)',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
          ),
          const SizedBox(height: 12),
          _buildCustomItemCard(),
        ],
      ),
    );
  }

  Widget _buildItemTile(Item it) {
    bool isSelected = _cart.any((ci) => ci.itemId == it.id);
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: isSelected ? const Color(0xFF8C6A4F) : const Color(0xFFE2E8F0),
        ),
      ),
      child: CheckboxListTile(
        value: isSelected,
        onChanged: (val) => _toggleCart(it, val == true),
        title: Text(
          it.itemName,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
        ),
        subtitle: Text(
          'Selling Price: ${it.sellingPrice.toStringAsFixed(0)} | Qty: ${it.quantity}',
          style: const TextStyle(fontSize: 12, color: Colors.grey),
        ),
        activeColor: const Color(0xFF8C6A4F),
        controlAffinity: ListTileControlAffinity.leading,
      ),
    );
  }

  void _toggleCart(Item it, bool add) {
    setState(() {
      if (add) {
        _cart.add(
          SoldItem(
            itemId: it.id,
            itemName: it.itemName,
            quantity: 1,
            unitPrice: it.sellingPrice,
          ),
        );
      } else {
        _cart.removeWhere((ci) => ci.itemId == it.id);
      }
    });
  }

  Widget _buildCustomItemCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        children: [
          _input('Item Name', 'e.g. Special Service', _customNameCtrl),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _input('Quantity', '1', _customQtyCtrl, isNum: true),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _input('Price', 'Price', _customPriceCtrl, isNum: true),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _input(
            'Notes/Details',
            'Add details about this custom item...',
            _notesCtrl,
            lines: 2,
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: const Icon(
                  Icons.photo_camera_outlined,
                  color: Colors.grey,
                  size: 20,
                ),
              ),
              const SizedBox(width: 8),
              const Text(
                'Photo',
                style: TextStyle(color: Colors.grey, fontSize: 12),
              ),
              const Spacer(),
              ElevatedButton(
                onPressed: _addCustomToCart,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF8C6A4F),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: const Text('Add Item'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _addCustomToCart() {
    if (_customNameCtrl.text.isEmpty || _customPriceCtrl.text.isEmpty) return;
    setState(() {
      _cart.add(
        SoldItem(
          itemId: 'custom_${const Uuid().v4()}',
          itemName: _customNameCtrl.text,
          quantity: int.tryParse(_customQtyCtrl.text) ?? 1,
          unitPrice: double.tryParse(_customPriceCtrl.text) ?? 0,
        ),
      );
      _customNameCtrl.clear();
      _customPriceCtrl.clear();
      _customQtyCtrl.text = '1';
    });
  }

  Widget _buildRightColumn() {
    final data = ref.watch(appDataProvider).value;
    final customers =
        data?.customers.where((c) => !c.isSupplier).toList() ?? [];

    double prevBal = 0;
    if (_selectedCustomerId != null) {
      final txs = (data?.transactions ?? [])
          .where((t) => t.customerId == _selectedCustomerId)
          .toList();
      txs.sort((a, b) => b.date.compareTo(a.date));
      prevBal = txs.isNotEmpty ? txs.first.remainingBalance : 0;
    }

    final billTotal = _cart.fold(
      0.0,
      (sum, ci) => sum + (ci.unitPrice * ci.quantity),
    );

    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Sale Details',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 20),
              ),
              TextButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.person_add_alt, size: 18),
                label: const Text('Add New Customer'),
              ),
            ],
          ),
          const SizedBox(height: 16),
          DropdownButtonFormField<String>(
            initialValue: _selectedCustomerId,
            decoration: const InputDecoration(
              labelText: 'Select Customer',
              border: OutlineInputBorder(),
            ),
            items: customers
                .map((c) => DropdownMenuItem(value: c.id, child: Text(c.name)))
                .toList(),
            onChanged: (val) => setState(() => _selectedCustomerId = val),
          ),
          const SizedBox(height: 16),
          _buildDatePicker(),
          const SizedBox(height: 24),
          ..._cart.asMap().entries.map((e) => _buildCartItem(e.key)),
          const SizedBox(height: 24),
          _buildSummaryTable(billTotal, prevBal),
          const SizedBox(height: 32),
          _buildFinalActions(),
        ],
      ),
    );
  }

  Widget _buildCartItem(int idx) {
    final item = _cart[idx];
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Text(
              item.itemName,
              style: const TextStyle(fontWeight: FontWeight.w500),
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              border: Border.all(color: const Color(0xFFE2E8F0)),
              borderRadius: BorderRadius.circular(4),
            ),
            child: DropdownButton<int>(
              value: item.quantity,
              items: List.generate(20, (i) => i + 1)
                  .map(
                    (qty) => DropdownMenuItem(value: qty, child: Text('$qty')),
                  )
                  .toList(),
              onChanged: (val) => setState(
                () => _cart[idx] = SoldItem(
                  itemId: item.itemId,
                  itemName: item.itemName,
                  quantity: val!,
                  unitPrice: item.unitPrice,
                ),
              ),
              underline: const SizedBox(),
            ),
          ),
          const SizedBox(width: 12),
          IconButton(
            onPressed: () => setState(() => _cart.removeAt(idx)),
            icon: const Icon(Icons.close, size: 18, color: Colors.grey),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryTable(double total, double prev) {
    final grand = total + prev;
    final paid = double.tryParse(_paymentCtrl.text) ?? 0;
    final rem = grand - paid;

    return Column(
      children: [
        _sumRow('Total', total),
        _sumRow('Previous Balance', prev),
        const Divider(height: 32),
        _sumRow('Grand Total', grand, isBold: true, fontSize: 18),
        const SizedBox(height: 16),
        _input('Amount Paid', '0', _paymentCtrl, isNum: true),
        const SizedBox(height: 12),
        const TextField(
          decoration: InputDecoration(
            labelText: 'Notes',
            border: OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 12),
        _sumRow(
          'Remaining',
          rem,
          color: const Color(0xFF8C6A4F),
          isBold: true,
          fontSize: 18,
        ),
      ],
    );
  }

  Widget _sumRow(
    String label,
    double val, {
    bool isBold = false,
    double fontSize = 14,
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
              fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
              fontSize: fontSize,
              color: isBold ? const Color(0xFF1E293B) : const Color(0xFF64748B),
            ),
          ),
          Text(
            val.toStringAsFixed(0),
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: fontSize,
              color: color ?? const Color(0xFF1E293B),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFinalActions() {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton(
            onPressed: () => Navigator.pop(context),
            style: OutlinedButton.styleFrom(minimumSize: const Size(0, 50)),
            child: const Text('Cancel'),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: ElevatedButton(
            onPressed: _isSaving ? null : _confirmSale,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF8C6A4F),
              foregroundColor: Colors.white,
              minimumSize: const Size(0, 50),
            ),
            child: _isSaving
                ? const CircularProgressIndicator(color: Colors.white)
                : const Text('Confirm Sale'),
          ),
        ),
      ],
    );
  }

  void _confirmSale() async {
    if (_selectedCustomerId == null || _cart.isEmpty) return;
    setState(() => _isSaving = true);
    final data = ref.read(appDataProvider).value;
    final customer = data!.customers.firstWhere(
      (c) => c.id == _selectedCustomerId,
    );

    final billTotal = _cart.fold(
      0.0,
      (sum, ci) => sum + (ci.unitPrice * ci.quantity),
    );
    final txs = data.transactions
        .where((t) => t.customerId == customer.id)
        .toList();
    txs.sort((a, b) => b.date.compareTo(a.date));
    final prevBal = txs.isNotEmpty ? txs.first.remainingBalance : 0;
    final paid = double.tryParse(_paymentCtrl.text) ?? 0;

    final newTx = Transaction(
      id: const Uuid().v4(),
      customerId: customer.id,
      customerName: customer.name,
      items: _cart,
      totalAmount: billTotal,
      amountPaid: paid,
      type: 'credit',
      date: _saleDate.toIso8601String(),
      remainingBalance: (prevBal + billTotal) - paid,
      previousBalance: prevBal.toDouble(),
      grandTotal: prevBal + billTotal,
      paid: ((prevBal + billTotal) - paid) <= 0,
    );

    ref.read(appDataProvider.notifier).addTransaction(newTx);
    setState(() => _isSaving = false);
    Navigator.pop(context);
  }

  Widget _input(
    String label,
    String hint,
    TextEditingController ctrl, {
    bool isNum = false,
    int lines = 1,
  }) {
    return TextField(
      controller: ctrl,
      maxLines: lines,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        border: const OutlineInputBorder(),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 12,
          vertical: 12,
        ),
      ),
      keyboardType: isNum ? TextInputType.number : TextInputType.text,
      onChanged: (v) => setState(() {}),
    );
  }

  Widget _buildDatePicker() {
    return InkWell(
      onTap: () async {
        final d = await showDatePicker(
          context: context,
          initialDate: _saleDate,
          firstDate: DateTime(2000),
          lastDate: DateTime(2100),
        );
        if (d != null) setState(() => _saleDate = d);
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
                  'Date',
                  style: TextStyle(fontSize: 10, color: Colors.grey),
                ),
                Text(DateFormat('dd/MM/yyyy').format(_saleDate)),
              ],
            ),
            const Icon(Icons.calendar_today, size: 16, color: Colors.grey),
          ],
        ),
      ),
    );
  }
}
