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
          if (reportData.topItems.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 20),
              child: Center(
                child: Text(
                  'No sales data available',
                  style: TextStyle(color: Colors.grey),
                ),
              ),
            )
          else
            ...reportData.topItems
                .take(5)
                .map((item) => _buildTopItemRow(item)),

          const SizedBox(height: 32),

          _buildSectionTitle('Overdue Customers', Colors.red),
          const SizedBox(height: 12),
          if (reportData.overdueCustomers.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 20),
              child: Center(
                child: Text(
                  'No overdue customers',
                  style: TextStyle(color: Colors.grey),
                ),
              ),
            )
          else
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
      padding: const EdgeInsets.only(left: 12),
      child: Text(
        title,
        style: GoogleFonts.outfit(
          fontSize: 18,
          fontWeight: FontWeight.bold,
          color: const Color(0xFF1E293B),
        ),
      ),
    );
  }

  Widget _buildQuickStats(_ReportData data) {
    return Row(
      children: [
        Expanded(
          child: _statCard(
            'TODAY SALE',
            'Rs. ${data.todaySales.toStringAsFixed(0)}',
            const Color(0xFF2563EB),
            Icons.trending_up,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _statCard(
            'TOTAL PROFIT',
            'Rs. ${data.totalProfit.toStringAsFixed(0)}',
            const Color(0xFF059669),
            Icons.account_balance_wallet,
          ),
        ),
      ],
    );
  }

  Widget _statCard(String label, String val, Color color, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                label,
                style: GoogleFonts.outfit(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF64748B),
                  letterSpacing: 0.5,
                ),
              ),
              Icon(icon, size: 16, color: color.withValues(alpha: 0.5)),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            val,
            style: GoogleFonts.outfit(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryBox(_ReportData data) {
    final net = data.totalUdhar - data.totalJama;
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Colors.white, Colors.blueGrey.shade50],
        ),
      ),
      child: Column(
        children: [
          _summaryItem(
            'TOTAL RECEIVABLE (UDHAR)',
            data.totalUdhar,
            const Color(0xFFDC2626),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 20),
            child: Divider(color: Colors.blueGrey.shade100),
          ),
          _summaryItem(
            'TOTAL DEPOSITS (JAMA)',
            data.totalJama,
            const Color(0xFF16A34A),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 20),
            child: Divider(color: Colors.blueGrey.shade100),
          ),
          Column(
            children: [
              Text(
                'NET RECOVERY VALUE',
                style: GoogleFonts.outfit(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF64748B),
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Rs. ${net.abs().toStringAsFixed(0)}',
                style: GoogleFonts.outfit(
                  fontSize: 36,
                  fontWeight: FontWeight.bold,
                  color: net >= 0
                      ? const Color(0xFF1E293B)
                      : const Color(0xFF16A34A),
                ),
              ),
              Text(
                net >= 0 ? 'To be collected' : 'Advance received',
                style: TextStyle(
                  fontSize: 10,
                  color: net >= 0 ? Colors.red.shade400 : Colors.green.shade400,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
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
          style: GoogleFonts.outfit(
            fontSize: 11,
            fontWeight: FontWeight.bold,
            color: const Color(0xFF64748B),
            letterSpacing: 0.5,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          'Rs. ${value.toStringAsFixed(0)}',
          style: GoogleFonts.outfit(
            fontSize: 26,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
      ],
    );
  }

  Widget _buildTopItemRow(_TopItem item) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: Colors.orange.shade50,
            borderRadius: BorderRadius.circular(8),
          ),
          child: const Icon(Icons.star, color: Colors.orange, size: 20),
        ),
        title: Text(
          item.name,
          style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 15),
        ),
        subtitle: Text(
          '${item.quantity.toStringAsFixed(0)} units sold',
          style: const TextStyle(fontSize: 12),
        ),
        trailing: Text(
          'Rs. ${item.revenue.toStringAsFixed(0)}',
          style: GoogleFonts.outfit(
            fontWeight: FontWeight.bold,
            fontSize: 15,
            color: const Color(0xFF2563EB),
          ),
        ),
      ),
    );
  }

  Widget _buildOverdueRow(_OverdueCustomer c) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        c.name,
                        style: GoogleFonts.outfit(
                          fontWeight: FontWeight.bold,
                          fontSize: 17,
                          color: const Color(0xFF1E293B),
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        c.phone,
                        style: const TextStyle(
                          color: Color(0xFF64748B),
                          fontSize: 13,
                        ),
                      ),
                      if (c.daysOverdue > 7)
                        Container(
                          margin: const EdgeInsets.only(top: 6),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.red.shade50,
                            borderRadius: BorderRadius.circular(100),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                Icons.warning_amber_rounded,
                                size: 10,
                                color: Colors.red.shade700,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                'OVERDUE ${c.daysOverdue} DAYS',
                                style: TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.red.shade700,
                                ),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      'Rs. ${c.balance.toStringAsFixed(0)}',
                      style: GoogleFonts.outfit(
                        fontWeight: FontWeight.bold,
                        fontSize: 20,
                        color: const Color(0xFFDC2626),
                      ),
                    ),
                    Text(
                      'Oldest: ${c.oldestDate}',
                      style: const TextStyle(
                        fontSize: 10,
                        color: Color(0xFF64748B),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Container(
            decoration: BoxDecoration(
              border: Border(top: BorderSide(color: Colors.blueGrey.shade100)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextButton.icon(
                    onPressed: () => _sendReminder(c),
                    icon: const Icon(Icons.send_rounded, size: 16),
                    label: const Text(
                      'SEND REMINDER',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    style: TextButton.styleFrom(
                      foregroundColor: const Color(0xFF2563EB),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: const RoundedRectangleBorder(
                        borderRadius: BorderRadius.only(
                          bottomLeft: Radius.circular(16),
                        ),
                      ),
                    ),
                  ),
                ),
                Container(width: 1, height: 24, color: Colors.blueGrey.shade50),
                Expanded(
                  child: TextButton.icon(
                    onPressed: () {
                      // Navigate to details if needed
                    },
                    icon: const Icon(Icons.visibility_outlined, size: 16),
                    label: const Text(
                      'VIEW DETAILS',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    style: TextButton.styleFrom(
                      foregroundColor: const Color(0xFF64748B),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: const RoundedRectangleBorder(
                        borderRadius: BorderRadius.only(
                          bottomRight: Radius.circular(16),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _sendReminder(_OverdueCustomer customer) async {
    final message = Uri.encodeComponent(
      "Hello ${customer.name}, this is a friendly reminder that you have an outstanding balance of ${customer.balance.toStringAsFixed(0)}. Thank you.",
    );
    final cleanPhone = customer.phone.replaceAll(RegExp(r'\D'), '');
    final url = Uri.parse("https://wa.me/$cleanPhone?text=$message");
    try {
      if (await canLaunchUrl(url)) {
        await launchUrl(url, mode: LaunchMode.externalApplication);
      } else {
        final smsUrl = Uri.parse("sms:${customer.phone}?body=$message");
        if (await canLaunchUrl(smsUrl)) {
          await launchUrl(smsUrl);
        }
      }
    } catch (e) {
      debugPrint('Error launching URL: $e');
    }
  }

  _ReportData _calculateDetailedReport(AppData data) {
    double totalJama = 0;
    double totalUdhar = 0;
    double todaySales = 0;
    double totalProfit = 0;
    final Map<String, _TopItem> itemStats = {};
    final List<_OverdueCustomer> overdue = [];
    final now = DateTime.now();
    final todayStr = DateFormat('yyyy-MM-dd').format(now);

    // 1. Calculate Udhar/Jama and Overdue (Logic from reports/customers/page.tsx)
    for (var customer in data.customers.where((c) => !c.isSupplier)) {
      final txs = data.transactions
          .where((t) => t.customerId == customer.id)
          .toList();
      if (txs.isEmpty) continue;

      // Sort chronologically for calculation
      txs.sort((a, b) => a.date.compareTo(b.date));

      double currentBalance = 0;
      Transaction? oldestUnpaidTx;

      for (var tx in txs) {
        // Logic mirror from reports/customers/page.tsx
        if (tx.type == 'credit' ||
            (tx.items != null &&
                tx.items!.isNotEmpty &&
                tx.remainingBalance > 0)) {
          currentBalance += tx.remainingBalance > 0
              ? tx.remainingBalance
              : tx.totalAmount;
          oldestUnpaidTx ??= tx;
        } else if (tx.type == 'debit') {
          currentBalance -= tx.totalAmount;
        } else if (tx.items != null) {
          // Paid sale
          currentBalance -= (tx.totalAmount - tx.remainingBalance);
        }

        if (currentBalance <= 0) {
          oldestUnpaidTx = null;
        }
      }

      if (currentBalance > 0) {
        totalUdhar += currentBalance;
        final oldestDate = oldestUnpaidTx != null
            ? DateTime.parse(oldestUnpaidTx.date)
            : now;
        overdue.add(
          _OverdueCustomer(
            name: customer.name,
            phone: customer.phone,
            balance: currentBalance,
            oldestDate: DateFormat('dd MMM yy').format(oldestDate),
            daysOverdue: now.difference(oldestDate).inDays,
          ),
        );
      } else if (currentBalance < 0) {
        totalJama += currentBalance.abs();
      }
    }

    // 2. Calculate Profit, Today Sales, Top Items
    for (var tx in data.transactions) {
      final txDate = DateTime.parse(tx.date);
      final txDateStr = DateFormat('yyyy-MM-dd').format(txDate);

      // Today Stats
      if (txDateStr == todayStr &&
          tx.type != 'debit' &&
          tx.type != 'purchase') {
        todaySales += tx.totalAmount;
      }

      // Items & Profit
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

          // Profit Calculation: (Selling Price - Purchase Price) * Qty
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
  final int daysOverdue;
  _OverdueCustomer({
    required this.name,
    required this.phone,
    required this.balance,
    required this.oldestDate,
    required this.daysOverdue,
  });
}
