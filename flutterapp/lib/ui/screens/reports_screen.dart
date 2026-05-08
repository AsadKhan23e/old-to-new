import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../logic/providers/app_data_provider.dart';
import '../../models/app_models.dart';
import 'package:intl/intl.dart';

class ReportsScreen extends ConsumerStatefulWidget {
  const ReportsScreen({super.key});

  @override
  ConsumerState<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends ConsumerState<ReportsScreen> {
  @override
  Widget build(BuildContext context) {
    final appDataAsync = ref.watch(appDataProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFFAF8F3),
      appBar: AppBar(
        title: Text(
          'Financial Reports',
          style: GoogleFonts.outfit(fontWeight: FontWeight.bold),
        ),
        backgroundColor: const Color(0xFFFAF8F3),
        elevation: 0,
      ),
      body: appDataAsync.when(
        data: (data) => _buildContent(data),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
      ),
    );
  }

  Widget _buildContent(AppData data) {
    final reportData = _calculateDetailedReport(data);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildQuickStats(reportData),
          const SizedBox(height: 24),
          _buildSummaryBox(reportData),
          const SizedBox(height: 32),

          _buildSectionTitle('Top Selling Items', Colors.orange),
          const SizedBox(height: 12),
          ...reportData.topItems.take(5).map((item) => _buildTopItemRow(item)),
          const SizedBox(height: 32),

          _buildSectionTitle('Overdue Customers', Colors.red),
          const SizedBox(height: 12),
          ...reportData.overdueCustomers
              .take(10)
              .map((c) => _buildOverdueRow(c)),

          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title, Color color) {
    return Container(
      decoration: BoxDecoration(
        border: Border(left: BorderSide(color: color, width: 4)),
      ),
      padding: const EdgeInsets.only(left: 8),
      child: Text(
        title,
        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
      ),
    );
  }

  Widget _buildQuickStats(_ReportData data) {
    return Row(
      children: [
        Expanded(
          child: _statCard(
            'TODAY SALE',
            data.todaySales.toStringAsFixed(0),
            Colors.blue.shade800,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _statCard(
            'TOTAL PROFIT',
            data.totalProfit.toStringAsFixed(0),
            Colors.green.shade800,
          ),
        ),
      ],
    );
  }

  Widget _statCard(String label, String val, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFCFCAC0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: Colors.grey,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            val,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryBox(_ReportData data) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFCFCAC0)),
      ),
      child: Column(
        children: [
          _summaryItem(
            'TOTAL RECEIVABLE (UDHAR)',
            data.totalUdhar,
            Colors.red.shade700,
          ),
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 16),
            child: Divider(),
          ),
          _summaryItem(
            'TOTAL DEPOSITS (JAMA)',
            data.totalJama,
            Colors.green.shade700,
          ),
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 16),
            child: Divider(),
          ),
          _summaryItem(
            'NET RECOVERY VALUE',
            data.totalUdhar - data.totalJama,
            Colors.black87,
          ),
        ],
      ),
    );
  }

  Widget _summaryItem(String label, double value, Color color) {
    return Column(
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.bold,
            color: Colors.grey,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          value.toStringAsFixed(0),
          style: TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
      ],
    );
  }

  Widget _buildTopItemRow(_TopItem item) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(10),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: ListTile(
        title: Text(
          item.name,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Text('Sold: ${item.quantity} units'),
        trailing: Text(
          'Rs. ${item.revenue.toStringAsFixed(0)}',
          style: const TextStyle(
            fontWeight: FontWeight.bold,
            color: Colors.blue,
          ),
        ),
      ),
    );
  }

  Widget _buildOverdueRow(_OverdueCustomer c) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(10),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      c.name,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    Text(
                      c.phone,
                      style: const TextStyle(color: Colors.grey, fontSize: 12),
                    ),
                  ],
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      'Rs. ${c.balance.toStringAsFixed(0)}',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 18,
                        color: Colors.red,
                      ),
                    ),
                    Text(
                      'Oldest: ${c.oldestDate}',
                      style: const TextStyle(fontSize: 10, color: Colors.grey),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton.icon(
                  onPressed: () => _sendReminder(c),
                  icon: const Icon(Icons.message, size: 16),
                  label: const Text('Send Reminder'),
                  style: TextButton.styleFrom(foregroundColor: Colors.blue),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _sendReminder(_OverdueCustomer customer) async {
    final message = Uri.encodeComponent(
      "Hello ${customer.name}, this is a friendly reminder that you have an outstanding balance of ${customer.balance.toStringAsFixed(0)}. Thank you.",
    );
    final url = Uri.parse("https://wa.me/${customer.phone}?text=$message");
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    } else {
      await launchUrl(Uri.parse("sms:${customer.phone}?body=$message"));
    }
  }

  _ReportData _calculateDetailedReport(AppData data) {
    double totalJama = 0;
    double totalUdhar = 0;
    double todaySales = 0;
    double totalProfit = 0;
    final Map<String, _TopItem> itemStats = {};
    final List<_OverdueCustomer> overdue = [];
    final today = DateFormat('yyyy-MM-dd').format(DateTime.now());

    // Udhar/Jama and Overdue Customers
    for (var customer in data.customers.where((c) => !c.isSupplier)) {
      final txs =
          data.transactions.where((t) => t.customerId == customer.id).toList()
            ..sort(
              (a, b) => a.date.compareTo(b.date),
            ); // ASC to find oldest unpaid

      if (txs.isNotEmpty) {
        final latestBalance = txs.last.remainingBalance;
        if (latestBalance > 0) {
          totalUdhar += latestBalance;
          overdue.add(
            _OverdueCustomer(
              name: customer.name,
              phone: customer.phone,
              balance: latestBalance,
              oldestDate: DateFormat(
                'dd MMM yy',
              ).format(DateTime.parse(txs.first.date)),
            ),
          );
        } else if (latestBalance < 0) {
          totalJama += latestBalance.abs();
        }
      }
    }

    // Profit, Sales, and Top Items
    for (var tx in data.transactions) {
      final txDate = DateFormat('yyyy-MM-dd').format(DateTime.parse(tx.date));
      if (txDate == today && tx.type != 'debit' && tx.type != 'purchase') {
        todaySales += tx.totalAmount;
      }

      if (tx.items != null) {
        for (var soldItem in tx.items!) {
          // Track sold items
          final current =
              itemStats[soldItem.itemName] ??
              _TopItem(name: soldItem.itemName, quantity: 0, revenue: 0);
          itemStats[soldItem.itemName] = _TopItem(
            name: soldItem.itemName,
            quantity: current.quantity + soldItem.quantity,
            revenue: current.revenue + (soldItem.unitPrice * soldItem.quantity),
          );

          // Profit Calculation
          final invItem = data.items.cast<Item?>().firstWhere(
            (i) => i?.id == soldItem.itemId || i?.itemName == soldItem.itemName,
            orElse: () => null,
          );
          if (invItem != null) {
            totalProfit +=
                (soldItem.unitPrice - invItem.purchasePrice) *
                soldItem.quantity;
          }
        }
      }
    }

    final topItemsList = itemStats.values.toList()
      ..sort((a, b) => b.quantity.compareTo(a.quantity));
    overdue.sort((a, b) => b.balance.compareTo(a.balance));

    return _ReportData(
      totalJama: totalJama,
      totalUdhar: totalUdhar,
      todaySales: todaySales,
      totalProfit: totalProfit,
      topItems: topItemsList,
      overdueCustomers: overdue,
    );
  }
}

class _ReportData {
  final double totalJama;
  final double totalUdhar;
  final double todaySales;
  final double totalProfit;
  final List<_TopItem> topItems;
  final List<_OverdueCustomer> overdueCustomers;
  _ReportData({
    required this.totalJama,
    required this.totalUdhar,
    required this.todaySales,
    required this.totalProfit,
    required this.topItems,
    required this.overdueCustomers,
  });
}

class _TopItem {
  final String name;
  final double quantity;
  final double revenue;
  _TopItem({required this.name, required this.quantity, required this.revenue});
}

class _OverdueCustomer {
  final String name;
  final String phone;
  final double balance;
  final String oldestDate;
  _OverdueCustomer({
    required this.name,
    required this.phone,
    required this.balance,
    required this.oldestDate,
  });
}
