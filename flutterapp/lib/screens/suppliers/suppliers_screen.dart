import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/app_provider.dart';
import '../../services/translation_service.dart';

class SuppliersScreen extends StatelessWidget {
  const SuppliersScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<AppProvider>(context);
    final lang = provider.appData?.settings.language ?? 'en';
    final suppliers =
        provider.appData?.customers.where((c) => c.isSupplier).toList() ?? [];

    return Scaffold(
      backgroundColor: const Color(0xFFFAF8F3),
      body: suppliers.isEmpty
          ? Center(
              child: Text(
                TranslationService.t('noSuppliers', lang),
                style: const TextStyle(
                  fontStyle: FontStyle.italic,
                  fontFamily: 'serif',
                ),
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: suppliers.length,
              itemBuilder: (context, index) {
                final s = suppliers[index];
                return Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    border: Border.all(color: const Color(0xFFCFCAC0)),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: ListTile(
                    leading: const CircleAvatar(
                      backgroundColor: Color(0xFFCFCAC0),
                      child: Icon(Icons.business_outlined, color: Colors.white),
                    ),
                    title: Text(
                      s.name,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontFamily: 'serif',
                      ),
                    ),
                    subtitle: Text(s.phone),
                    trailing: const Icon(
                      Icons.chevron_right,
                      color: Colors.grey,
                    ),
                  ),
                );
              },
            ),
    );
  }
}
