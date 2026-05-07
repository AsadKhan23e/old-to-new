import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../providers/app_provider.dart';
import '../customers/customer_details_screen.dart';

class ReportsScreen extends StatelessWidget {
  const ReportsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<AppProvider>(context);
    final lang = provider.appData?.settings.language ?? 'en';
    final customers =
        provider.appData?.customers.where((c) => !c.isSupplier).toList() ?? [];
    final transactions = provider.appData?.transactions ?? [];

    // Logic to calculate overdue customers (Derived Balance > 0)
    final overdueCustomers = <Map<String, dynamic>>[];

    for (var customer in customers) {
      final customerTxs = transactions
          .where((t) => t.customerId == customer.id)
          .toList();
      if (customerTxs.isEmpty) continue;

      double totalSales = 0;
      double totalPaid = 0;
      DateTime? oldestUnpaidDate;

      // Sort chronological to find oldest unpaid
      customerTxs.sort((a, b) => a.date.compareTo(b.date));

      for (var tx in customerTxs) {
        if (tx.type != 'debit') {
          totalSales += tx.totalAmount;
          if (tx.billAdjustments != null) {
            for (var adj in tx.billAdjustments!) {
              totalSales += adj.difference;
            }
          }
        }

        totalPaid += tx.amountPaid;
        if (tx.additionalPayments != null) {
          for (var p in tx.additionalPayments!) {
            totalPaid += p.amount;
          }
        }
        if (tx.type == 'debit') {
          totalPaid += tx.totalAmount;
        }

        double currentBalance = totalSales - totalPaid;
        if (currentBalance > 0 && oldestUnpaidDate == null) {
          oldestUnpaidDate = DateTime.parse(tx.date);
        } else if (currentBalance <= 0) {
          oldestUnpaidDate = null;
        }
      }

      final balance = totalSales - totalPaid;
      if (balance > 0) {
        overdueCustomers.add({
          'customer': customer,
          'balance': balance,
          'oldestUnpaidDate':
              oldestUnpaidDate ?? DateTime.parse(customer.dateAdded),
          'daysOverdue': DateTime.now()
              .difference(oldestUnpaidDate ?? DateTime.now())
              .inDays,
        });
      }
    }

    overdueCustomers.sort((a, b) => b['balance'].compareTo(a['balance']));

    double totalDebt = overdueCustomers.fold(
      0.0,
      (sum, item) => sum + item['balance'],
    );

    return Scaffold(
      backgroundColor: const Color(0xFFFAF8F3),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // SUMMARY CARD
          Card(
            color: const Color(0xFF8C6A4F),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            child: Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                children: [
                  const Text(
                    'TOTAL OUTSTANDING DEBT',
                    style: TextStyle(
                      color: Colors.white70,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.2,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Rs. ${totalDebt.toStringAsFixed(0)}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                      fontFamily: 'serif',
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'From ${overdueCustomers.length} Customers',
                    style: const TextStyle(color: Colors.white60, fontSize: 14),
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 24),
          const Text(
            'OVERDUE CUSTOMERS',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: Colors.brown,
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(height: 12),

          if (overdueCustomers.isEmpty)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(40.0),
                child: Text(
                  'No overdue customers found.',
                  style: TextStyle(
                    fontStyle: FontStyle.italic,
                    color: Colors.grey,
                  ),
                ),
              ),
            )
          else
            ...overdueCustomers.map((data) {
              final customer = data['customer'];
              final balance = data['balance'];
              final days = data['daysOverdue'];

              return Card(
                color: Colors.white,
                margin: const EdgeInsets.only(bottom: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: const BorderSide(color: Color(0xFFCFCAC0)),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  customer.name,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 18,
                                    fontFamily: 'serif',
                                  ),
                                ),
                                Text(
                                  customer.phone,
                                  style: const TextStyle(
                                    color: Colors.grey,
                                    fontSize: 14,
                                  ),
                                ),
                                if (days > 7)
                                  Container(
                                    margin: const EdgeInsets.only(top: 8),
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 8,
                                      vertical: 2,
                                    ),
                                    decoration: BoxDecoration(
                                      color: Colors.red[50],
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(
                                        color: Colors.red[200]!,
                                      ),
                                    ),
                                    child: const Text(
                                      'OVERDUE',
                                      style: TextStyle(
                                        color: Colors.red,
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              const Text(
                                'Balance Due',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey,
                                ),
                              ),
                              Text(
                                balance.toStringAsFixed(0),
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 20,
                                  color: Colors.red,
                                ),
                              ),
                              Text(
                                DateFormat(
                                  'dd MMM yy',
                                ).format(data['oldestUnpaidDate']),
                                style: const TextStyle(
                                  fontSize: 10,
                                  color: Colors.grey,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) => CustomerDetailsScreen(
                                      customer: customer,
                                    ),
                                  ),
                                );
                              },
                              icon: const Icon(Icons.person, size: 18),
                              label: const Text('View Profile'),
                              style: OutlinedButton.styleFrom(
                                side: const BorderSide(
                                  color: Color(0xFFCFCAC0),
                                ),
                                foregroundColor: Colors.brown,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: () =>
                                  _sendReminder(customer, balance, lang),
                              icon: const Icon(Icons.message, size: 18),
                              label: const Text('Reminder'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF6B7A50),
                                foregroundColor: Colors.white,
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
        ],
      ),
    );
  }

  void _sendReminder(dynamic customer, double balance, String lang) async {
    final message =
        "Hello ${customer.name}, this is a friendly reminder that you have an outstanding balance of ${balance.toStringAsFixed(0)}. Thank you.";
    final uri = Uri.parse(
      'https://wa.me/${customer.phone.replaceAll(RegExp(r'\D'), '')}?text=${Uri.encodeComponent(message)}',
    );
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }
}
