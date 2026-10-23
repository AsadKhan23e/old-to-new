import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../providers/app_provider.dart';
import '../../services/translation_service.dart';
import '../../services/auth_service.dart';
import '../../widgets/app_drawer.dart';
import '../customers/customer_list_screen.dart';
import '../items/inventory_screen.dart';
import '../transactions/transaction_list_screen.dart';
import '../reminders/reminders_screen.dart';
import '../suppliers/suppliers_screen.dart';
import '../reports/reports_screen.dart';
import '../settings/settings_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _selectedIndex = 0;

  Widget _buildContent(String lang) {
    switch (_selectedIndex) {
      case 0:
        return const CustomerListScreen();
      case 1:
        return _DashboardOverview(
          lang: lang,
          onActionSelected: (index) => setState(() => _selectedIndex = index),
        );
      case 2:
        return const InventoryScreen();
      case 3:
        return const TransactionListScreen();
      case 4:
        return const RemindersScreen();
      case 5:
        return const ReportsScreen();
      case 6:
        return const SuppliersScreen();
      case 7:
        return const SettingsScreen();
      default:
        return Center(
          child: Text(
            'Coming Soon',
            style: const TextStyle(fontFamily: 'serif'),
          ),
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<AppProvider>(context);
    final lang = provider.appData?.settings.language ?? 'en';

    return Directionality(
      textDirection: lang == 'ur' ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        backgroundColor: const Color(0xFFFAF8F3), // Vintage Paper Color
        appBar: AppBar(
          title: Text(
            TranslationService.t(_getTitleKey(_selectedIndex), lang),
            style: const TextStyle(
              fontFamily: 'serif',
              fontWeight: FontWeight.bold,
            ),
          ),
          backgroundColor: Colors.white.withValues(alpha: 0.8),
          elevation: 0,
          scrolledUnderElevation: 0,
        ),
        drawer: AppDrawer(
          selectedIndex: _selectedIndex,
          onItemSelected: (index) => setState(() => _selectedIndex = index),
        ),
        body: _buildContent(lang),
      ),
    );
  }

  String _getTitleKey(int index) {
    switch (index) {
      case 0:
        return 'customers';
      case 1:
        return 'dashboard';
      case 2:
        return 'items';
      case 3:
        return 'transactions';
      case 4:
        return 'reminders';
      case 5:
        return 'reports';
      case 6:
        return 'suppliers';
      case 7:
        return 'settings';
      default:
        return 'dashboard';
    }
  }
}

class _DashboardOverview extends StatelessWidget {
  final String lang;
  final Function(int) onActionSelected;

  const _DashboardOverview({
    required this.lang,
    required this.onActionSelected,
  });

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<AppProvider>(context);
    final upcomingReminders = provider.appData?.reminders.toList() ?? [];

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(width: 4, height: 40, color: const Color(0xFF6B7280)),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${TranslationService.t('greeting', lang)}, ${Provider.of<AuthService>(context).currentUser?.displayName?.isNotEmpty == true ? Provider.of<AuthService>(context).currentUser!.displayName! : (Provider.of<AuthService>(context).currentUser?.email?.split('@')[0] ?? 'User')}',
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      fontFamily: 'serif',
                    ),
                  ),
                  const Text(
                    'Daily Business Journal',
                    style: TextStyle(
                      fontSize: 14,
                      fontStyle: FontStyle.italic,
                      color: Colors.grey,
                      fontFamily: 'serif',
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 32),

          _SectionHeader(
            title: TranslationService.t('upcomingReminders', lang),
            color: const Color(0xFF6B7A50),
          ),
          const SizedBox(height: 12),
          if (upcomingReminders.isEmpty)
            _EmptyLedgerCard(
              text: TranslationService.t('noUpcomingReminders', lang),
            )
          else
            ...upcomingReminders
                .take(5)
                .map((r) => _ReminderCard(reminder: r, lang: lang)),

          const SizedBox(height: 32),
          _QuickActionsGrid(lang: lang, onActionSelected: onActionSelected),

          const SizedBox(height: 32),
          _SectionHeader(
            title: TranslationService.t('summary_title', lang),
            color: const Color(0xFF8C6A4F),
          ),
          const SizedBox(height: 12),
          _SummaryCards(
            totalJama: provider.totalJama,
            totalUdhar: provider.totalUdhar,
            balance: provider.totalUdhar, // As per web logic
            lang: lang,
          ),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  final Color color;
  const _SectionHeader({required this.title, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        border: Border(left: BorderSide(color: color, width: 4)),
      ),
      padding: const EdgeInsets.only(left: 12),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.bold,
          fontFamily: 'serif',
        ),
      ),
    );
  }
}

class _EmptyLedgerCard extends StatelessWidget {
  final String text;
  const _EmptyLedgerCard({required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFCFCAC0), width: 1),
      ),
      child: Center(
        child: Text(
          text,
          style: const TextStyle(
            color: Colors.grey,
            fontStyle: FontStyle.italic,
            fontFamily: 'serif',
          ),
        ),
      ),
    );
  }
}

class _ReminderCard extends StatelessWidget {
  final dynamic reminder;
  final String lang;
  const _ReminderCard({required this.reminder, required this.lang});

  @override
  Widget build(BuildContext context) {
    return Card(
      color: Colors.white,
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: const BorderSide(color: Color(0xFFCFCAC0)),
      ),
      child: ListTile(
        title: Text(
          reminder.customerName,
          style: const TextStyle(
            fontWeight: FontWeight.bold,
            fontFamily: 'serif',
          ),
        ),
        subtitle: Text(
          'Due: ${reminder.dueDate} - ${reminder.dueAmount}',
          style: const TextStyle(fontSize: 12),
        ),
        trailing: ElevatedButton.icon(
          onPressed: () {},
          icon: const Icon(Icons.send, size: 14),
          label: Text(TranslationService.t('send', lang)),
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF6B7A50),
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(6),
            ),
          ),
        ),
      ),
    );
  }
}

class _QuickActionsGrid extends StatelessWidget {
  final String lang;
  final Function(int) onActionSelected;

  const _QuickActionsGrid({required this.lang, required this.onActionSelected});

  @override
  Widget build(BuildContext context) {
    final actions = [
      {'key': 'quick_items', 'icon': Icons.inventory_2, 'index': 2},
      {'key': 'quick_transactions', 'icon': Icons.receipt_long, 'index': 3},
      {'key': 'quick_addCustomer', 'icon': Icons.person_add, 'index': 1},
      {'key': 'quick_customers', 'icon': Icons.people, 'index': 1},
      {'key': 'quick_suppliers', 'icon': Icons.business, 'index': 6},
      {'key': 'quick_reminders', 'icon': Icons.notifications, 'index': 4},
      {'key': 'quick_reports', 'icon': Icons.analytics, 'index': 5},
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        crossAxisSpacing: 8,
        mainAxisSpacing: 8,
        childAspectRatio: 1.0,
      ),
      itemCount: actions.length,
      itemBuilder: (context, index) {
        final action = actions[index];
        return InkWell(
          onTap: () => onActionSelected(action['index'] as int),
          child: Container(
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border.all(color: const Color(0xFFCFCAC0)),
              borderRadius: BorderRadius.circular(8),
            ),
            padding: const EdgeInsets.all(8),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  action['icon'] as IconData,
                  color: const Color(0xFF8C6A4F),
                  size: 28,
                ),
                const SizedBox(height: 8),
                Text(
                  TranslationService.t(action['key'] as String, lang),
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    fontFamily: 'serif',
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _SummaryCards extends StatelessWidget {
  final double totalJama;
  final double totalUdhar;
  final double balance;
  final String lang;

  const _SummaryCards({
    required this.totalJama,
    required this.totalUdhar,
    required this.balance,
    required this.lang,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        _SummaryCard(
          title: TranslationService.t('summary_totalJama', lang),
          value: totalJama,
          color: Colors.green,
        ),
        const SizedBox(height: 8),
        _SummaryCard(
          title: TranslationService.t('summary_totalUdhar', lang),
          value: totalUdhar,
          color: Colors.red,
        ),
        const SizedBox(height: 8),
        _SummaryCard(
          title: TranslationService.t('summary_netBalance', lang),
          value: balance,
          color: Colors.black,
        ),
      ],
    );
  }
}

class _SummaryCard extends StatelessWidget {
  final String title;
  final double value;
  final Color color;

  const _SummaryCard({
    required this.title,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: const Color(0xFFCFCAC0)),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              fontFamily: 'serif',
            ),
          ),
          Text(
            value.toStringAsFixed(0),
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}
