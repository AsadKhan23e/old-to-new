import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../logic/providers/app_data_provider.dart';
import '../../models/app_models.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:intl/intl.dart';

class RemindersScreen extends ConsumerWidget {
  const RemindersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final appData = ref.watch(appDataProvider).value;
    if (appData == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    // Filter customers with balance > 0
    final List<Map<String, dynamic>> debtors = [];
    final shopName = appData.settings.billDesign.shopName;

    for (var customer in appData.customers) {
      if (customer.isSupplier) continue;
      final txs = appData.transactions
          .where((t) => t.customerId == customer.id)
          .toList();
      txs.sort((a, b) => b.date.compareTo(a.date));
      final balance = txs.isNotEmpty ? txs.first.remainingBalance : 0.0;

      if (balance > 0) {
        debtors.add({
          'customer': customer,
          'balance': balance,
          'lastDate': txs.isNotEmpty ? txs.first.date : customer.dateAdded,
        });
      }
    }

    return Scaffold(
      backgroundColor: const Color(0xFFFAF8F3),
      appBar: AppBar(
        title: const Text(
          'Payment Reminders',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: const Color(0xFFFAF8F3),
      ),
      body: debtors.isEmpty
          ? const Center(child: Text('No outstanding payments found.'))
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: debtors.length,
              itemBuilder: (context, index) {
                final debtor = debtors[index];
                final Customer customer = debtor['customer'];
                final double balance = debtor['balance'];
                final String date = DateFormat(
                  'dd MMM yyyy',
                ).format(DateTime.parse(debtor['lastDate']));

                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: const BorderSide(color: Color(0xFFCFCAC0)),
                  ),
                  child: ListTile(
                    contentPadding: const EdgeInsets.all(16),
                    title: Text(
                      customer.name,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 18,
                      ),
                    ),
                    subtitle: Text(
                      'Last Activity: $date',
                      style: const TextStyle(color: Colors.grey, fontSize: 12),
                    ),
                    trailing: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          'RS ${balance.toStringAsFixed(0)}',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Colors.red,
                            fontSize: 16,
                          ),
                        ),
                        const SizedBox(height: 4),
                        _sendButton(context, customer, balance, shopName, date),
                      ],
                    ),
                  ),
                );
              },
            ),
    );
  }

  Widget _sendButton(
    BuildContext context,
    Customer customer,
    double balance,
    String shopName,
    String date,
  ) {
    return ElevatedButton.icon(
      onPressed: () =>
          _sendMessage(context, customer.phone, balance, shopName, date),
      icon: const Icon(Icons.send, size: 14),
      label: const Text('SEND', style: TextStyle(fontSize: 10)),
      style: ElevatedButton.styleFrom(
        backgroundColor: Colors.green,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      ),
    );
  }

  Future<void> _sendMessage(
    BuildContext context,
    String phone,
    double amount,
    String shopName,
    String date,
  ) async {
    final message =
        "Dear Customer,\nAap par $shopName ka $amount qarza hai ($date).\nBaraye meherbani payment karein.\n\nYe message MyShopBook App ki taraf se bheja gaya hai.";

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Send Reminder'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Message Preview:',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 12,
                color: Colors.grey,
              ),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(message, style: const TextStyle(fontSize: 14)),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton.icon(
            onPressed: () async {
              Navigator.pop(context);
              final uri = Uri.parse(
                "whatsapp://send?phone=$phone&text=${Uri.encodeComponent(message)}",
              );
              if (await canLaunchUrl(uri)) {
                await launchUrl(uri);
              } else {
                final smsUri = Uri.parse(
                  "sms:$phone?body=${Uri.encodeComponent(message)}",
                );
                await launchUrl(smsUri);
              }
            },
            icon: const Icon(Icons.send, size: 16),
            label: const Text('Send'),
          ),
        ],
      ),
    );
  }
}
