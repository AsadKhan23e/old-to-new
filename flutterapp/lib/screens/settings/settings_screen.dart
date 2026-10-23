import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/app_provider.dart';
import '../../services/translation_service.dart';
import '../../services/auth_service.dart';
import 'bill_design_screen.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  late Timer _timer;
  String _currentTime = '';
  String _timezone = '';

  @override
  void initState() {
    super.initState();
    _updateTime();
    _timer = Timer.periodic(
      const Duration(seconds: 1),
      (timer) => _updateTime(),
    );
  }

  void _updateTime() {
    setState(() {
      final now = DateTime.now();
      _currentTime = DateFormat('hh:mm:ss a').format(now);
      _timezone = now.timeZoneName;
    });
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<AppProvider>(context);
    final authService = Provider.of<AuthService>(context, listen: false);
    final lang = provider.appData?.settings.language ?? 'en';
    final viewMode = provider.appData?.settings.viewMode ?? 'user';
    final theme = provider.appData?.settings.theme ?? 'system';

    return Scaffold(
      backgroundColor: const Color(0xFFFAF8F3),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Card(
              color: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
                side: const BorderSide(color: Color(0xFFCFCAC0)),
              ),
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      TranslationService.t('settingsTitle', lang),
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        fontFamily: 'serif',
                      ),
                    ),
                    Text(
                      TranslationService.t('settingsDescription', lang),
                      style: const TextStyle(
                        fontSize: 14,
                        color: Colors.grey,
                        fontStyle: FontStyle.italic,
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Clock & Timezone
                    const Text(
                      'Clock & Timezone',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontFamily: 'serif',
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFAF8F3),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFFD3D3D3)),
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.access_time_filled,
                            color: Color(0xFF8C6A4F),
                            size: 32,
                          ),
                          const SizedBox(width: 16),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _currentTime,
                                style: const TextStyle(
                                  fontSize: 22,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              Text(
                                _timezone,
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Language Toggle
                    const Text(
                      'Language',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontFamily: 'serif',
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 8),
                    SegmentedButton<String>(
                      segments: const [
                        ButtonSegment(value: 'en', label: Text('English')),
                        ButtonSegment(value: 'ur', label: Text('اردو')),
                      ],
                      selected: {lang},
                      onSelectionChanged: (newSelection) =>
                          provider.setLanguage(newSelection.first),
                      style: _segmentedButtonStyle(const Color(0xFF8C6A4F)),
                    ),
                    const SizedBox(height: 24),

                    // View Mode
                    Text(
                      TranslationService.t('viewMode', lang),
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontFamily: 'serif',
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 8),
                    SegmentedButton<String>(
                      segments: [
                        ButtonSegment(
                          value: 'user',
                          label: Text(TranslationService.t('userView', lang)),
                        ),
                        ButtonSegment(
                          value: 'customer',
                          label: Text(
                            TranslationService.t('customerView', lang),
                          ),
                        ),
                      ],
                      selected: {viewMode},
                      onSelectionChanged: (newSelection) =>
                          provider.setViewMode(newSelection.first),
                      style: _segmentedButtonStyle(const Color(0xFF6B7A50)),
                    ),
                    const SizedBox(height: 24),

                    // App Theme
                    const Text(
                      'App Theme',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontFamily: 'serif',
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 8),
                    SegmentedButton<String>(
                      segments: const [
                        ButtonSegment(
                          value: 'light',
                          label: Icon(Icons.sunny, size: 20),
                        ),
                        ButtonSegment(
                          value: 'dark',
                          label: Icon(Icons.nightlight_round, size: 20),
                        ),
                        ButtonSegment(
                          value: 'system',
                          label: Icon(Icons.settings_suggest, size: 20),
                        ),
                      ],
                      selected: {theme},
                      onSelectionChanged: (newSelection) =>
                          provider.setTheme(newSelection.first),
                      style: _segmentedButtonStyle(const Color(0xFF2F2F2F)),
                    ),
                    const SizedBox(height: 24),

                    // Bill Design Link
                    OutlinedButton.icon(
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => const BillDesignScreen(),
                          ),
                        );
                      },
                      icon: const Icon(Icons.file_present_outlined),
                      label: const Text('Bill Design Settings'),
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size(double.infinity, 50),
                        side: const BorderSide(color: Color(0xFFCFCAC0)),
                        foregroundColor: const Color(0xFF2F2F2F),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Sync & Premium
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFFCFCAC0)),
                      ),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                TranslationService.t('syncNow', lang),
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontFamily: 'serif',
                                ),
                              ),
                              ElevatedButton.icon(
                                onPressed: () {}, // Premium only
                                icon: const Icon(
                                  Icons.cloud_upload_outlined,
                                  size: 16,
                                ),
                                label: Text(
                                  TranslationService.t('syncNow', lang),
                                ),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF6B7A50),
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            TranslationService.t('syncDescription', lang),
                            style: const TextStyle(
                              fontSize: 12,
                              fontStyle: FontStyle.italic,
                              color: Colors.grey,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton.icon(
                      onPressed: () {},
                      icon: const Icon(Icons.star, color: Colors.yellow),
                      label: Text(TranslationService.t('upgradePremium', lang)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF8C6A4F),
                        foregroundColor: Colors.white,
                        minimumSize: const Size(double.infinity, 50),
                      ),
                    ),
                    const SizedBox(height: 32),

                    // Logout
                    ElevatedButton.icon(
                      onPressed: () => authService.signOut(),
                      icon: const Icon(Icons.logout),
                      label: const Text('Logout / Sign Out'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.red.shade700,
                        foregroundColor: Colors.white,
                        minimumSize: const Size(double.infinity, 50),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  ButtonStyle _segmentedButtonStyle(Color selectedColor) {
    return ButtonStyle(
      backgroundColor: WidgetStateProperty.resolveWith<Color?>((states) {
        if (states.contains(WidgetState.selected)) return selectedColor;
        return Colors.white;
      }),
      foregroundColor: WidgetStateProperty.resolveWith<Color?>((states) {
        if (states.contains(WidgetState.selected)) return Colors.white;
        return const Color(0xFF2F2F2F);
      }),
    );
  }
}
