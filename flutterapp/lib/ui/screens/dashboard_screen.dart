import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
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
    final upcomingReminders =
        data.reminders
            .where(
              (r) =>
                  r.status != 'completed' &&
                  DateTime.parse(
                    r.dueDate,
                  ).isAfter(DateTime.now().subtract(const Duration(days: 1))),
            )
            .toList()
          ..sort((a, b) => a.dueDate.compareTo(b.dueDate));

    final displayReminders = upcomingReminders.take(5).toList();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildHeader(userName),
          const SizedBox(height: 24),

          // App Update Placeholder (matching Next.js UI logic)
          // _buildUpdateNotification(context),
          if (displayReminders.isNotEmpty) ...[
            _buildSectionTitle('Upcoming Reminders', const Color(0xFF6B7A50)),
            const SizedBox(height: 12),
            ...displayReminders.map((r) => _buildReminderCard(context, r)),
            const SizedBox(height: 24),
          ],

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
          Row(
            children: [
              Text(
                'Assalam-o-Alaikum, $name',
                style: GoogleFonts.outfit(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF2F2F2F),
                ),
              ),
              const Spacer(),
              const Icon(Icons.sync, size: 16, color: Colors.green),
            ],
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

  Widget _buildReminderCard(BuildContext context, Reminder reminder) {
    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: Color(0xFFCFCAC0)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    reminder.customerName,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                  ),
                  Text(
                    'Due: ${reminder.dueDate} - Rs. ${reminder.dueAmount.toStringAsFixed(0)}',
                    style: const TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                ],
              ),
            ),
            ElevatedButton.icon(
              onPressed: () => _sendReminder(reminder),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF6B7A50),
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 8,
                ),
                minimumSize: Size.zero,
              ),
              icon: const Icon(Icons.send, size: 14),
              label: const Text('Send', style: TextStyle(fontSize: 12)),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _sendReminder(Reminder reminder) async {
    final message = Uri.encodeComponent(reminder.message);
    final phone = reminder.customerPhone;
    final url = Uri.parse("https://wa.me/$phone?text=$message");

    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    } else {
      // Fallback to SMS
      final smsUrl = Uri.parse("sms:$phone?body=$message");
      if (await canLaunchUrl(smsUrl)) {
        await launchUrl(smsUrl);
      }
    }
  }

  Widget _buildQuickActions(BuildContext context) {
    final actions = [
      {'label': 'Items', 'icon': Icons.inventory_2, 'route': 'items'},
      {'label': 'History', 'icon': Icons.receipt_long, 'route': 'transactions'},
      {'label': 'Add Cust', 'icon': Icons.person_add, 'route': 'add_customer'},
      {'label': 'Customers', 'icon': Icons.people, 'route': 'customers'},
      {'label': 'Suppliers', 'icon': Icons.business, 'route': 'suppliers'},
      {'label': 'Reminders', 'icon': Icons.notifications, 'route': 'reminders'},
      {'label': 'Reports', 'icon': Icons.description, 'route': 'reports'},
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
          elevation: 0,
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
                  color: const Color(0xFF8C6A4F),
                  size: 30,
                ),
                const SizedBox(height: 8),
                Text(
                  a['label'] as String,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 11,
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
          summary.totalJama.toStringAsFixed(0),
          Colors.green.shade700,
        ),
        const SizedBox(height: 12),
        _buildSummaryCard(
          'TOTAL UDHAR',
          summary.totalUdhar.toStringAsFixed(0),
          Colors.red.shade700,
        ),
        const SizedBox(height: 12),
        _buildSummaryCard(
          'NET BALANCE',
          summary.netBalance.toStringAsFixed(0),
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
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFCFCAC0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: Colors.grey,
              letterSpacing: 1,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              fontSize: 28,
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
        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
      ),
    );
  }

  _Summary _calculateSummary(AppData data) {
    double jama = 0;
    double udhar = 0;

    final customers = data.customers.where((c) => !c.isSupplier).toList();
    final customerIds = customers.map((c) => c.id).toSet();
    final customerTxs = data.transactions
        .where((tx) => customerIds.contains(tx.customerId))
        .toList();

    for (var tx in customerTxs) {
      if (tx.type == 'debit') {
        jama += tx.totalAmount;
      } else {
        jama += (tx.amountPaid);
        if (tx.additionalPayments != null) {
          for (var p in tx.additionalPayments!) {
            jama += p.amount;
          }
        }
      }
    }

    for (var customer in customers) {
      final txs =
          data.transactions.where((t) => t.customerId == customer.id).toList()
            ..sort((a, b) => b.date.compareTo(a.date));

      if (txs.isNotEmpty) {
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
