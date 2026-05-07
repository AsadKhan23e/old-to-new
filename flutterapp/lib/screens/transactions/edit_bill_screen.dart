import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/app_provider.dart';
import '../../models/app_models.dart';

class EditBillScreen extends StatefulWidget {
  final Transaction bill;
  const EditBillScreen({super.key, required this.bill});

  @override
  State<EditBillScreen> createState() => _EditBillScreenState();
}

class _EditBillScreenState extends State<EditBillScreen> {
  late List<SoldItem> _items;
  final TextEditingController _notesCtrl = TextEditingController();
  final TextEditingController _reasonCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _items = List.from(widget.bill.items ?? []);
    _notesCtrl.text = widget.bill.notes ?? '';
  }

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<AppProvider>(context);

    double itemsTotal = _items.fold(
      0,
      (sum, i) => sum + (i.quantity * i.unitPrice),
    );
    double grandTotal = (widget.bill.previousBalance ?? 0) + itemsTotal;

    return Scaffold(
      backgroundColor: const Color(0xFFFAF8F3),
      appBar: AppBar(
        title: const Text(
          'Edit Bill',
          style: TextStyle(fontFamily: 'serif', fontWeight: FontWeight.bold),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'ITEMS',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: Colors.brown,
              ),
            ),
            const Divider(),
            ..._items.asMap().entries.map((entry) {
              int idx = entry.key;
              SoldItem item = entry.value;
              return ListTile(
                title: Text(item.itemName),
                subtitle: Text(
                  'Qty: ${item.quantity} × ${item.unitPrice.toStringAsFixed(0)}',
                ),
                trailing: IconButton(
                  icon: const Icon(
                    Icons.remove_circle_outline,
                    color: Colors.red,
                  ),
                  onPressed: () => setState(() => _items.removeAt(idx)),
                ),
              );
            }),

            const SizedBox(height: 24),
            const Text(
              'BILL ADJUSTMENT REASON',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: Colors.brown,
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _reasonCtrl,
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                hintText: 'e.g., Typo in quantity, price change...',
              ),
            ),

            const SizedBox(height: 32),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border.all(color: const Color(0xFFCFCAC0)),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                children: [
                  _Row(
                    label: 'Previous Total:',
                    value: widget.bill.totalAmount,
                  ),
                  _Row(
                    label: 'New Items Total:',
                    value: itemsTotal,
                    isBold: true,
                  ),
                  const Divider(),
                  _Row(
                    label: 'Difference:',
                    value: itemsTotal - widget.bill.totalAmount,
                    color: (itemsTotal - widget.bill.totalAmount) > 0
                        ? Colors.red
                        : Colors.green,
                  ),
                ],
              ),
            ),

            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: () => _handleSave(provider, itemsTotal, grandTotal),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF8C6A4F),
                foregroundColor: Colors.white,
                minimumSize: const Size(double.infinity, 50),
              ),
              child: const Text('SAVE EDITS & LOG HISTORY'),
            ),
          ],
        ),
      ),
    );
  }

  void _handleSave(
    AppProvider provider,
    double newItemsTotal,
    double newGrandTotal,
  ) {
    if (_reasonCtrl.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please provide a reason for the edit.')),
      );
      return;
    }

    final adjustment = BillAdjustment(
      previousGrandTotal:
          widget.bill.grandTotal ??
          widget.bill.totalAmount, // Assuming grandTotal was set
      newGrandTotal: newGrandTotal,
      difference:
          newGrandTotal - (widget.bill.grandTotal ?? widget.bill.totalAmount),
      editedAt: DateTime.now().toIso8601String(),
      reason: _reasonCtrl.text,
    );

    List<BillAdjustment> updatedAdjs = List.from(
      widget.bill.billAdjustments ?? [],
    );
    updatedAdjs.add(adjustment);

    final updatedBill = Transaction(
      id: widget.bill.id,
      customerId: widget.bill.customerId,
      customerName: widget.bill.customerName,
      items: _items,
      totalAmount: newItemsTotal,
      amountPaid: widget.bill.amountPaid,
      type: widget.bill.type,
      date: widget.bill.date,
      modifiedAt: DateTime.now().toIso8601String(),
      notes: _notesCtrl.text,
      remainingBalance:
          newGrandTotal -
          (widget.bill.amountPaid +
              (widget.bill.additionalPayments?.fold(
                    0,
                    (sum, p) => sum! + p.amount,
                  ) ??
                  0)),
      previousBalance: widget.bill.previousBalance,
      grandTotal: newGrandTotal,
      additionalPayments: widget.bill.additionalPayments,
      paid:
          (newGrandTotal -
              (widget.bill.amountPaid +
                  (widget.bill.additionalPayments?.fold(
                        0,
                        (sum, p) => sum! + p.amount,
                      ) ??
                      0))) <=
          0,
      status: widget.bill.status,
      billNumber: widget.bill.billNumber,
      image: widget.bill.image,
      billAdjustments: updatedAdjs,
      isEdited: true,
    );

    provider.updateTransaction(updatedBill);
    Navigator.pop(context);
    Navigator.pop(context); // Go back to details
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Bill updated and adjustment logged!')),
    );
  }
}

class _Row extends StatelessWidget {
  final String label;
  final double value;
  final bool isBold;
  final Color? color;
  const _Row({
    required this.label,
    required this.value,
    this.isBold = false,
    this.color,
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
            ),
          ),
          Text(
            value.toStringAsFixed(0),
            style: TextStyle(
              fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}
