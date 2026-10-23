import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../logic/providers/app_data_provider.dart';
import '../../models/app_models.dart';
import 'create_sale_screen.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../core/services/pdf_service.dart';
import 'package:url_launcher/url_launcher.dart';
import 'dart:io';

class ItemsScreen extends ConsumerWidget {
  const ItemsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final appData = ref.watch(appDataProvider).value;
    if (appData == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final items = appData.items;

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader(context, ref),
            _buildRecentBills(ref, appData),
            _buildItemsList(context, ref, items),
          ],
        ),
      ),
    );
  }

  void _showItemDialog(BuildContext context, WidgetRef ref, {Item? item}) {
    final nameCtrl = TextEditingController(text: item?.itemName ?? '');
    final pPriceCtrl = TextEditingController(
      text: item?.purchasePrice.toString() ?? '',
    );
    final sPriceCtrl = TextEditingController(
      text: item?.sellingPrice.toString() ?? '',
    );
    final qtyCtrl = TextEditingController(
      text: item?.quantity.toString() ?? '1',
    );

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(item == null ? 'Add New Item' : 'Edit Item'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameCtrl,
                decoration: const InputDecoration(labelText: 'Item Name'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: pPriceCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Purchase Price'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: sPriceCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Selling Price'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: qtyCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Stock Quantity'),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              final newItem = Item(
                id: item?.id ?? DateTime.now().toIso8601String(),
                itemName: nameCtrl.text,
                purchasePrice: double.tryParse(pPriceCtrl.text) ?? 0,
                sellingPrice: double.tryParse(sPriceCtrl.text) ?? 0,
                quantity: int.tryParse(qtyCtrl.text) ?? 1,
                createdAt: item?.createdAt ?? DateTime.now().toIso8601String(),
              );
              if (item == null) {
                ref.read(appDataProvider.notifier).addItem(newItem);
              } else {
                ref.read(appDataProvider.notifier).updateItem(newItem);
              }
              Navigator.pop(context);
            },
            child: const Text('Save Item'),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context, WidgetRef ref) {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: const [
              Text(
                'Available Items',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF1E293B),
                ),
              ),
              SizedBox(height: 4),
              Text(
                'Manage your items and services.',
                style: TextStyle(color: Colors.grey, fontSize: 14),
              ),
            ],
          ),
          Row(
            children: [
              ElevatedButton.icon(
                onPressed: () => _showItemDialog(context, ref),
                icon: const Icon(Icons.add_circle_outline, size: 18),
                label: const Text('Add New Item'),
              ),
              const SizedBox(width: 12),
              ElevatedButton.icon(
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const CreateSaleScreen(),
                  ),
                ),
                icon: const Icon(Icons.shopping_cart_outlined, size: 18),
                label: const Text('Sell'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildRecentBills(WidgetRef ref, AppData appData) {
    final transactions = appData.transactions;
    // Filter only customer sales (no purchases, no direct debits)
    final recentSales =
        transactions
            .where((tx) => tx.type != 'purchase' && tx.type != 'debit')
            .toList()
          ..sort((a, b) => b.date.compareTo(a.date));

    final displaySales = recentSales.take(5).toList();

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 24),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFCFCAC0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.description_outlined,
                size: 14,
                color: Colors.grey,
              ),
              const SizedBox(width: 8),
              Text(
                'RECENT BILLS',
                style: GoogleFonts.outfit(
                  color: const Color(0xFF64748B),
                  fontWeight: FontWeight.bold,
                  fontSize: 11,
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (displaySales.isEmpty)
            const Text(
              'No recent bills found.',
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey,
                fontStyle: FontStyle.italic,
              ),
            )
          else
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: List.generate(displaySales.length, (index) {
                  final tx = displaySales[index];

                  // Calculate relative bill number for this customer
                  final customerTxs =
                      transactions
                          .where(
                            (ctx) =>
                                ctx.customerId == tx.customerId &&
                                ctx.type != 'purchase' &&
                                ctx.type != 'debit',
                          )
                          .toList()
                        ..sort((a, b) => a.date.compareTo(b.date));

                  final billNum =
                      customerTxs.indexWhere((ctx) => ctx.id == tx.id) + 1;

                  return Padding(
                    padding: const EdgeInsets.only(right: 10),
                    child: InkWell(
                      onTap: () {
                        // Open bill detail screen
                        // For now we show the index label like Next.js but pass actual billNum
                        _showBillPreview(ref.context, tx, billNum, appData);
                      },
                      child: Container(
                        width: 38,
                        height: 38,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: const Color(0xFFFEF2F2),
                          border: Border.all(color: const Color(0xFFFEE2E2)),
                        ),
                        child: Center(
                          child: Text(
                            '${index + 1}',
                            style: GoogleFonts.outfit(
                              color: const Color(0xFFDC2626),
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                          ),
                        ),
                      ),
                    ),
                  );
                }),
              ),
            ),
        ],
      ),
    );
  }

  void _showBillPreview(
    BuildContext context,
    Transaction tx,
    int billNum,
    AppData appData,
  ) {
    final customer = appData.customers.firstWhere((c) => c.id == tx.customerId);
    final dateStr = DateFormat(
      'dd MMM yyyy, hh:mm a',
    ).format(DateTime.parse(tx.date));

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.85,
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          children: [
            Container(
              margin: const EdgeInsets.only(top: 12),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(24.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Bill #$billNum',
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        dateStr,
                        style: const TextStyle(
                          color: Colors.grey,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
            ),
            const Divider(),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Customer: ${customer.name}',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 24),
                    const Text(
                      'ITEMS',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: Colors.grey,
                        letterSpacing: 1,
                      ),
                    ),
                    const SizedBox(height: 8),
                    if (tx.items != null)
                      ...tx.items!.map(
                        (i) => Padding(
                          padding: const EdgeInsets.symmetric(vertical: 4),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                '${i.itemName} x ${i.quantity}',
                                style: const TextStyle(fontSize: 14),
                              ),
                              Text(
                                'Rs. ${(i.unitPrice * i.quantity).toStringAsFixed(0)}',
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    const Divider(height: 32),
                    _summaryRow('Bill Total', tx.totalAmount),
                    _summaryRow(
                      'Paid',
                      tx.amountPaid +
                          (tx.additionalPayments?.fold(
                                0.0,
                                (sum, p) => sum! + p.amount,
                              ) ??
                              0.0),
                    ),
                    _summaryRow(
                      'Remaining',
                      tx.remainingBalance,
                      isBold: true,
                      color: Colors.red,
                    ),
                    const SizedBox(height: 40),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(24.0),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => PdfService.generateAndShareBill(
                        tx,
                        customer,
                        appData.settings.billDesign,
                      ),
                      icon: const Icon(Icons.picture_as_pdf),
                      label: const Text('PDF'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => _shareOnWhatsApp(customer, tx),
                      icon: const Icon(Icons.share),
                      label: const Text('WhatsApp'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green,
                        foregroundColor: Colors.white,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
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
              fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
            ),
          ),
          Text(
            val.toStringAsFixed(0),
            style: TextStyle(fontWeight: FontWeight.bold, color: color),
          ),
        ],
      ),
    );
  }

  void _shareOnWhatsApp(Customer c, Transaction tx) async {
    final msg =
        "Bill Receipt for ${c.name}\nDate: ${tx.date}\nTotal: ${tx.totalAmount}\nRemaining: ${tx.remainingBalance}";
    final url = "https://wa.me/${c.phone}?text=${Uri.encodeComponent(msg)}";
    await launchUrl(Uri.parse(url));
  }

  Widget _buildItemsList(
    BuildContext context,
    WidgetRef ref,
    List<Item> items,
  ) {
    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.all(24),
      itemCount: items.length,
      itemBuilder: (context, index) {
        final item = items[index];
        return Card(
          margin: const EdgeInsets.only(bottom: 16),
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: const BorderSide(color: Color(0xFFE2E8F0)),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(8),
                    image: item.picture != null
                        ? DecorationImage(
                            image: FileImage(File(item.picture!)),
                            fit: BoxFit.cover,
                          )
                        : null,
                  ),
                  child: item.picture == null
                      ? const Icon(Icons.image_outlined, color: Colors.grey)
                      : null,
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.itemName,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 18,
                          color: Color(0xFF1E293B),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Icon(
                            Icons.attach_money,
                            size: 14,
                            color: Colors.green,
                          ),
                          Text(
                            item.sellingPrice.toStringAsFixed(0),
                            style: const TextStyle(
                              color: Colors.green,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(width: 16),
                          const Icon(
                            Icons.inventory_2_outlined,
                            size: 14,
                            color: Colors.grey,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            'Qty: ${item.quantity}',
                            style: const TextStyle(color: Color(0xFF64748B)),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                OutlinedButton.icon(
                  onPressed: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const CreateSaleScreen(),
                    ),
                  ),
                  icon: const Icon(Icons.shopping_cart_outlined, size: 14),
                  label: const Text('Sell'),
                ),
                const SizedBox(width: 8),
                PopupMenuButton<String>(
                  onSelected: (value) {
                    if (value == 'edit') {
                      _showItemDialog(context, ref, item: item);
                    } else if (value == 'delete') {
                      ref.read(appDataProvider.notifier).deleteItem(item.id);
                    }
                  },
                  itemBuilder: (BuildContext context) =>
                      <PopupMenuEntry<String>>[
                        const PopupMenuItem<String>(
                          value: 'edit',
                          child: Text('Edit Item'),
                        ),
                        const PopupMenuItem<String>(
                          value: 'delete',
                          child: Text(
                            'Delete Item',
                            style: TextStyle(color: Colors.red),
                          ),
                        ),
                      ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
