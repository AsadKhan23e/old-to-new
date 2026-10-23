import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/app_provider.dart';
import '../../services/translation_service.dart';
import '../../models/app_models.dart';

class RemindersScreen extends StatefulWidget {
  const RemindersScreen({super.key});

  @override
  State<RemindersScreen> createState() => _RemindersScreenState();
}

class _RemindersScreenState extends State<RemindersScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
  }

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<AppProvider>(context);
    final lang = provider.appData?.settings.language ?? 'en';
    final reminders = provider.appData?.reminders ?? [];

    return Scaffold(
      backgroundColor: const Color(0xFFFAF8F3),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showAddReminderDialog(context, provider, lang),
        backgroundColor: const Color(0xFF8C6A4F),
        child: const Icon(Icons.add_alert_outlined, color: Colors.white),
      ),
      body: Column(
        children: [
          TabBar(
            controller: _tabController,
            labelColor: const Color(0xFF8C6A4F),
            indicatorColor: const Color(0xFF8C6A4F),
            tabs: [
              Tab(text: TranslationService.t('pending', lang)),
              Tab(text: TranslationService.t('sent', lang)),
              Tab(text: TranslationService.t('completed', lang)),
              Tab(text: TranslationService.t('all', lang)),
            ],
          ),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildReminderList(
                  reminders.where((r) => r.status == 'pending').toList(),
                  lang,
                  provider,
                ),
                _buildReminderList(
                  reminders.where((r) => r.status == 'sent').toList(),
                  lang,
                  provider,
                ),
                _buildReminderList(
                  reminders.where((r) => r.status == 'completed').toList(),
                  lang,
                  provider,
                ),
                _buildReminderList(reminders.toList(), lang, provider),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReminderList(
    List<Reminder> list,
    String lang,
    AppProvider provider,
  ) {
    if (list.isEmpty) {
      return Center(
        child: Text(
          TranslationService.t('noReminders', lang),
          style: const TextStyle(
            fontStyle: FontStyle.italic,
            fontFamily: 'serif',
          ),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: list.length,
      itemBuilder: (context, index) {
        final r = list[index];
        return Card(
          color: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
            side: const BorderSide(color: Color(0xFFCFCAC0)),
          ),
          margin: const EdgeInsets.only(bottom: 12),
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      r.customerName,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                        fontFamily: 'serif',
                      ),
                    ),
                    Text(
                      '${r.dueAmount}',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF8C6A4F),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  'Due: ${r.dueDate}',
                  style: const TextStyle(fontSize: 12, color: Colors.grey),
                ),
                const SizedBox(height: 12),
                if (r.status != 'completed')
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      TextButton.icon(
                        onPressed: () {},
                        icon: const Icon(Icons.send, size: 16),
                        label: Text(TranslationService.t('send', lang)),
                        style: TextButton.styleFrom(
                          foregroundColor: const Color(0xFF6B7A50),
                        ),
                      ),
                      const SizedBox(width: 8),
                      TextButton.icon(
                        onPressed: () {},
                        icon: const Icon(Icons.check_circle_outline, size: 16),
                        label: Text(TranslationService.t('markComplete', lang)),
                        style: TextButton.styleFrom(
                          foregroundColor: Colors.blue,
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

  void _showAddReminderDialog(
    BuildContext context,
    AppProvider provider,
    String lang,
  ) {
    // Basic dialog for adding reminder...
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(TranslationService.t('addReminder', lang)),
        content: const Text('Reminder form goes here...'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(TranslationService.t('cancel', lang)),
          ),
        ],
      ),
    );
  }
}
