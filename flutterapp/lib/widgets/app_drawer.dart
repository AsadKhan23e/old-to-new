import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../services/translation_service.dart';
import '../providers/app_provider.dart';

class AppDrawer extends StatelessWidget {
  final int selectedIndex;
  final Function(int) onItemSelected;

  const AppDrawer({
    super.key,
    required this.selectedIndex,
    required this.onItemSelected,
  });

  @override
  Widget build(BuildContext context) {
    final authService = Provider.of<AuthService>(context, listen: false);
    final provider = Provider.of<AppProvider>(context);
    final user = authService.currentUser;
    final lang = provider.appData?.settings.language ?? 'en';

    return Drawer(
      backgroundColor: const Color(0xFFFAF8F3),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 20),
            color: const Color(0xFF8C6A4F),
            child: Row(
              children: [
                const CircleAvatar(
                  backgroundColor: Colors.white,
                  child: Icon(Icons.person, color: Color(0xFF8C6A4F)),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        user?.displayName ?? 'User',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontFamily: 'serif',
                        ),
                      ),
                      Text(
                        user?.email ?? '',
                        style: const TextStyle(
                          color: Colors.white70,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView(
              padding: EdgeInsets.zero,
              children: [
                _DrawerItem(
                  icon: Icons.dashboard_outlined,
                  label: TranslationService.t('dashboard', lang),
                  isSelected: selectedIndex == 0,
                  onTap: () => onItemSelected(0),
                ),
                _DrawerItem(
                  icon: Icons.people_outline,
                  label: TranslationService.t('customers', lang),
                  isSelected: selectedIndex == 1,
                  onTap: () => onItemSelected(1),
                ),
                _DrawerItem(
                  icon: Icons.inventory_2_outlined,
                  label: TranslationService.t('items', lang),
                  isSelected: selectedIndex == 2,
                  onTap: () => onItemSelected(2),
                ),
                _DrawerItem(
                  icon: Icons.receipt_long_outlined,
                  label: TranslationService.t('transactions', lang),
                  isSelected: selectedIndex == 3,
                  onTap: () => onItemSelected(3),
                ),
                _DrawerItem(
                  icon: Icons.notifications_none_outlined,
                  label: TranslationService.t('reminders', lang),
                  isSelected: selectedIndex == 4,
                  onTap: () => onItemSelected(4),
                ),
                _DrawerItem(
                  icon: Icons.analytics_outlined,
                  label: TranslationService.t('reports', lang),
                  isSelected: selectedIndex == 5,
                  onTap: () => onItemSelected(5),
                ),
                _DrawerItem(
                  icon: Icons.business_outlined,
                  label: TranslationService.t('suppliers', lang),
                  isSelected: selectedIndex == 6,
                  onTap: () => onItemSelected(6),
                ),
                const Divider(color: Color(0xFFCFCAC0)),
                _DrawerItem(
                  icon: Icons.settings_outlined,
                  label: TranslationService.t('settings', lang),
                  isSelected: selectedIndex == 7,
                  onTap: () => onItemSelected(7),
                ),
              ],
            ),
          ),
          const Divider(color: Color(0xFFCFCAC0)),
          ListTile(
            leading: const Icon(Icons.logout, color: Colors.redAccent),
            title: Text(
              TranslationService.t('logout', lang),
              style: const TextStyle(color: Colors.redAccent),
            ),
            onTap: () => authService.signOut(),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }
}

class _DrawerItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _DrawerItem({
    required this.icon,
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: isSelected
            ? const Color(0xFF8C6A4F).withValues(alpha: 0.1)
            : null,
        borderRadius: BorderRadius.circular(8),
      ),
      child: ListTile(
        leading: Icon(
          icon,
          color: isSelected ? const Color(0xFF8C6A4F) : const Color(0xFF2F2F2F),
        ),
        title: Text(
          label,
          style: TextStyle(
            color: isSelected
                ? const Color(0xFF8C6A4F)
                : const Color(0xFF2F2F2F),
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
            fontFamily: 'serif',
          ),
        ),
        onTap: () {
          onTap();
          Navigator.pop(context);
        },
      ),
    );
  }
}
