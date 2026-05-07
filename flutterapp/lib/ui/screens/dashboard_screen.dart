import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../logic/providers/app_data_provider.dart';
import '../../logic/providers/auth_provider.dart';
import '../../models/app_models.dart';
import 'home_screen.dart';
import 'suppliers_screen.dart';
import 'transactions_screen.dart';
import 'items_screen.dart';
import 'reports_screen.dart';
import 'reminders_screen.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final appDataAsync = ref.watch(appDataProvider);
    final user = ref.watch(authServiceProvider).currentUser;

    return Scaffold(
      backgroundColor: const Color(0xFFFAF8F3),
      body: appDataAsync.when(
        data: (data) =>
            _buildContent(context, ref, data, user?.displayName ?? 'User'),
        loading: () => const Center(
          child: Text(
            'Loading Ledger...',
            style: TextStyle(fontStyle: FontStyle.italic),
          ),
        ),
        error: (e, _) => Center(child: Text('Error: $e')),
      ),
    );
  }

  Widget _buildContent(
    BuildContext context,
    WidgetRef ref,
    AppData data,
    String userName,
  ) {
    final summary = _calculateSummary(data);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildHeader(userName),
          const SizedBox(height: 24),
          _buildQuickActions(context),
          const SizedBox(height: 32),
          const Divider(color: Color(0xFFCFCAC0)),
          const SizedBox(height: 24),
          _buildSummarySection(summary),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildHeader(String name) {
    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: Color(0xFFCFCAC0))),
      ),
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Assalam-o-Alaikum, $name',
            style: const TextStyle(
              fontSize: 28,

              fontWeight: FontWeight.bold,
              color: Color(0xFF2F2F2F),
            ),
          ),
          const Text(
            'Daily Business Journal',
            style: TextStyle(
              fontSize: 14,

              fontStyle: FontStyle.italic,
              color: Colors.grey,
            ),
          ),
        ],
      ),
    );
  }

  // Reminders section removed as requested by the user.

  Widget _buildQuickActions(BuildContext context) {
    final actions = [
      {
        'label': 'Items',
        'icon': Icons.inventory_2,
        'color': const Color(0xFF8C6A4F),
        'route': 'items',
      },
      {
        'label': 'History',
        'icon': Icons.receipt_long,
        'color': const Color(0xFF8C6A4F),
        'route': 'transactions',
      },
      {
        'label': 'Add Cust',
        'icon': Icons.person_add,
        'color': const Color(0xFF8C6A4F),
        'route': 'add_customer',
      },
      {
        'label': 'Customers',
        'icon': Icons.people,
        'color': const Color(0xFF8C6A4F),
        'route': 'customers',
      },
      {
        'label': 'Suppliers',
        'icon': Icons.business,
        'color': const Color(0xFF8C6A4F),
        'route': 'suppliers',
      },
      {
        'label': 'Reminders',
        'icon': Icons.notifications,
        'color': const Color(0xFF8C6A4F),
        'route': 'reminders',
      },
      {
        'label': 'Reports',
        'icon': Icons.description,
        'color': const Color(0xFF8C6A4F),
        'route': 'reports',
      },
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 1.0,
      ),
      itemCount: actions.length,
      itemBuilder: (context, index) {
        final a = actions[index];
        return Card(
          elevation: 1,
          color: Colors.white,
          margin: EdgeInsets.zero,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
            side: const BorderSide(color: Color(0xFFCFCAC0)),
          ),
          child: InkWell(
            borderRadius: BorderRadius.circular(10),
            onTap: () => _navigate(context, a['route'] as String),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  a['icon'] as IconData,
                  color: a['color'] as Color,
                  size: 32,
                ),
                const SizedBox(height: 8),
                Text(
                  a['label'] as String,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _navigate(BuildContext context, String route) {
    switch (route) {
      case 'add_customer':
        // Instead of a route, we launch the home screen and maybe could open a dialog
        // For simplicity now, just push HomeScreen where they can click '+'
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => const HomeScreen()),
        );
        break;
      case 'items':
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => const ItemsScreen()),
        );
        break;
      case 'transactions':
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => const TransactionsScreen()),
        );
        break;
      case 'customers':
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => const HomeScreen()),
        );
        break;
      case 'suppliers':
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => const SuppliersScreen()),
        );
        break;
      case 'reminders':
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => const RemindersScreen()),
        );
        break;
      case 'reports':
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => const ReportsScreen()),
        );
        break;
      default:
        break;
    }
  }

  Widget _buildSummarySection(_Summary summary) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionTitle('Business Summary', const Color(0xFF8C6A4F)),
        const SizedBox(height: 16),
        _buildSummaryCard(
          'TOTAL JAMA',
          summary.totalJama.toString(),
          Colors.green.shade700,
        ),
        const SizedBox(height: 12),
        _buildSummaryCard(
          'TOTAL UDHAR',
          summary.totalUdhar.toString(),
          Colors.red.shade700,
        ),
        const SizedBox(height: 12),
        _buildSummaryCard(
          'NET BALANCE',
          summary.netBalance.toString(),
          Colors.black87,
        ),
      ],
    );
  }

  Widget _buildSummaryCard(String title, String value, Color color) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: const [
          BoxShadow(color: Colors.black12, blurRadius: 4, offset: Offset(0, 2)),
        ],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFCFCAC0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              letterSpacing: 1.1,
              color: Colors.grey,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title, Color borderColor) {
    return Container(
      decoration: BoxDecoration(
        border: Border(left: BorderSide(color: borderColor, width: 4)),
      ),
      padding: const EdgeInsets.only(left: 8),
      child: Text(
        title,
        style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
      ),
    );
  }

  _Summary _calculateSummary(AppData data) {
    double jama = 0;
    double udhar = 0;

    final customerIds = data.customers
        .where((c) => !c.isSupplier)
        .map((c) => c.id)
        .toSet();
    final customerTxs = data.transactions
        .where((tx) => customerIds.contains(tx.customerId))
        .toList();

    for (var tx in customerTxs) {
      jama += tx.amountPaid;
      if (tx.additionalPayments != null) {
        for (var p in tx.additionalPayments!) {
          jama += p.amount;
        }
      }
      if (tx.type == 'debit') {
        // In case direct payments were saved in totalAmount for some reason
        if (tx.amountPaid == 0) jama += tx.totalAmount;
      }
    }

    for (var customer in data.customers.where((c) => !c.isSupplier)) {
      final txs = data.transactions
          .where((t) => t.customerId == customer.id)
          .toList();
      if (txs.isNotEmpty) {
        txs.sort((a, b) => b.date.compareTo(a.date));
        final latest = txs.first;
        if (latest.remainingBalance > 0) {
          udhar += latest.remainingBalance;
        }
      }
    }

    return _Summary(totalJama: jama, totalUdhar: udhar, netBalance: udhar);
  }
}

class _Summary {
  final double totalJama;
  final double totalUdhar;
  final double netBalance;
  _Summary({
    required this.totalJama,
    required this.totalUdhar,
    required this.netBalance,
  });
}
