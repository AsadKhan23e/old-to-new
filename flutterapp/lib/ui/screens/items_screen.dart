import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../logic/providers/app_data_provider.dart';
import '../../models/app_models.dart';
import 'create_sale_screen.dart';
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
            _buildRecentBills(),
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

  Widget _buildRecentBills() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 24),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: const [
              Icon(Icons.description_outlined, size: 16, color: Colors.grey),
              SizedBox(width: 8),
              Text(
                'RECENT BILLS',
                style: TextStyle(
                  color: Color(0xFF64748B),
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [1, 2, 3, 4, 5]
                .map(
                  (idx) => Container(
                    margin: const EdgeInsets.only(right: 12),
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.red.shade100),
                    ),
                    child: Center(
                      child: Text(
                        '$idx',
                        style: const TextStyle(
                          color: Colors.red,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                )
                .toList(),
          ),
        ],
      ),
    );
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
