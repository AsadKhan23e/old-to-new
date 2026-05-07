import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
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
        title: const Text(
          'Financial Reports',
          style: TextStyle( fontWeight: FontWeight.bold),
        ),
        backgroundColor: const Color(0xFFFAF8F3),
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
          const Text(
            'Customer Ledger Breakdown',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 12),
          ...reportData.customerSummaries
              .take(10)
              .map((s) => _buildCustomerRow(s)),
          if (reportData.customerSummaries.length > 10)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(8.0),
                child: Text(
                  '...view more in transactions',
                  style: TextStyle(fontSize: 10, color: Colors.grey),
                ),
              ),
            ),
          const SizedBox(height: 40),
        ],
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
            'EST. PROFIT',
            data.totalProfit.toStringAsFixed(0),
            Colors.orange.shade800,
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
              fontSize: 9,
              fontWeight: FontWeight.bold,
              color: Colors.grey,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            val,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryBox(_ReportData data) {
    return Card(
      color: Colors.white,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Color(0xFFCFCAC0)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            _summaryItem(
              'TOTAL MONEY RECEIVABLE (UDHAR)',
              data.totalUdhar,
              Colors.red.shade700,
            ),
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: Divider(),
            ),
            _summaryItem(
              'TOTAL ADVANCE DEPOSITS (JAMA)',
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
            letterSpacing: 0.8,
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

  Widget _buildCustomerRow(_CustomerRow s) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(10),
        side: BorderSide(color: Colors.grey.shade100),
      ),
      child: ListTile(
        dense: true,
        title: Text(
          s.name,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        trailing: Text(
          s.balance.abs().toStringAsFixed(0),
          style: TextStyle(
            fontWeight: FontWeight.bold,
            color: s.balance > 0 ? Colors.red : Colors.green,
          ),
        ),
      ),
    );
  }

  _ReportData _calculateDetailedReport(AppData data) {
    double totalJama = 0;
    double totalUdhar = 0;
    double todaySales = 0;
    double totalProfit = 0;
    final List<_CustomerRow> summaries = [];
    final today = DateFormat('yyyy-MM-dd').format(DateTime.now());

    // Calculate Udhar/Jama
    for (var customer in data.customers.where((c) => !c.isSupplier)) {
      final txs = data.transactions
          .where((t) => t.customerId == customer.id)
          .toList();
      if (txs.isNotEmpty) {
        txs.sort((a, b) => b.date.compareTo(a.date));
        final balance = txs.first.remainingBalance;
        if (balance > 0) totalUdhar += balance;
        if (balance < 0) totalJama += balance.abs();
        summaries.add(_CustomerRow(name: customer.name, balance: balance));
      }
    }

    // Calculate Profit & Sales
    for (var tx in data.transactions) {
      final txDate = DateFormat('yyyy-MM-dd').format(DateTime.parse(tx.date));
      if (txDate == today && tx.type != 'debit') {
        todaySales += tx.totalAmount;
      }

      if (tx.items != null) {
        for (var soldItem in tx.items!) {
          // Find the original item to get purchase price
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

    summaries.sort((a, b) => b.balance.abs().compareTo(a.balance.abs()));

    return _ReportData(
      totalJama: totalJama,
      totalUdhar: totalUdhar,
      todaySales: todaySales,
      totalProfit: totalProfit,
      customerSummaries: summaries,
    );
  }
}

class _ReportData {
  final double totalJama;
  final double totalUdhar;
  final double todaySales;
  final double totalProfit;
  final List<_CustomerRow> customerSummaries;
  _ReportData({
    required this.totalJama,
    required this.totalUdhar,
    required this.todaySales,
    required this.totalProfit,
    required this.customerSummaries,
  });
}

class _CustomerRow {
  final String name;
  final double balance;
  _CustomerRow({required this.name, required this.balance});
}
