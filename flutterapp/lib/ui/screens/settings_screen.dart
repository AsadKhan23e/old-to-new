import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../logic/providers/app_data_provider.dart';
import '../../models/app_models.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  late TextEditingController _nameCtrl;
  late TextEditingController _phoneCtrl;
  late TextEditingController _addressCtrl;
  late TextEditingController _footerCtrl;
  File? _logo;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    final settings = ref.read(appDataProvider).value?.settings.billDesign;
    _nameCtrl = TextEditingController(text: settings?.shopName ?? '');
    _phoneCtrl = TextEditingController(
      text: settings?.contacts.isNotEmpty == true
          ? settings!.contacts.first.phone
          : '',
    );
    _addressCtrl = TextEditingController(text: settings?.address ?? '');
    _footerCtrl = TextEditingController(text: settings?.footer ?? '');
    if (settings?.logo != null && settings!.logo.isNotEmpty) {
      _logo = File(settings.logo);
    }
  }

  Future<void> _pickLogo() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: ImageSource.gallery);
    if (pickedFile != null) {
      setState(() => _logo = File(pickedFile.path));
    }
  }

  void _saveSettings() async {
    setState(() => _isLoading = true);
    final currentSettings = ref.read(appDataProvider).value?.settings;
    if (currentSettings == null) return;

    final updatedBillSettings = BillDesignSettings(
      shopName: _nameCtrl.text,
      contacts: [
        BillDesignContact(id: 'main', label: 'Phone', phone: _phoneCtrl.text),
      ],
      address: _addressCtrl.text,
      logo: _logo?.path ?? '',
      template: currentSettings.billDesign.template,
      footer: _footerCtrl.text,
    );

    final updatedSettings = AppSettings(
      language: currentSettings.language,
      viewMode: currentSettings.viewMode,
      theme: currentSettings.theme,
      billDesign: updatedBillSettings,
    );

    ref.read(appDataProvider.notifier).updateSettings(updatedSettings);

    setState(() => _isLoading = false);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Settings Saved Successfully!')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFAF8F3),
      appBar: AppBar(
        title: const Text(
          'Store Settings & Profile',
          style: TextStyle( fontWeight: FontWeight.bold),
        ),
        backgroundColor: const Color(0xFFFAF8F3),
        actions: [
          if (_isLoading)
            const Padding(
              padding: EdgeInsets.all(12),
              child: CircularProgressIndicator(),
            )
          else
            IconButton(
              onPressed: _saveSettings,
              icon: const Icon(Icons.done_all, color: Colors.green, size: 28),
            ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Center(
          child: Container(
            constraints: const BoxConstraints(maxWidth: 500),
            child: Column(
              children: [
                _buildLogoHeader(),
                const SizedBox(height: 32),
                _buildTextField(
                  _nameCtrl,
                  'Shop / Business Name',
                  Icons.store_mall_directory_outlined,
                ),
                const SizedBox(height: 16),
                _buildTextField(
                  _phoneCtrl,
                  'Business Phone',
                  Icons.phone_android,
                ),
                const SizedBox(height: 16),
                _buildTextField(
                  _addressCtrl,
                  'Business Address',
                  Icons.location_on_outlined,
                  lines: 2,
                ),
                const SizedBox(height: 16),
                _buildTextField(
                  _footerCtrl,
                  'Custom Bill Footer Message',
                  Icons.message_outlined,
                  lines: 2,
                ),
                const SizedBox(height: 40),
                const Text(
                  'Settings are saved locally and synced with Firestore.',
                  style: TextStyle(color: Colors.grey, fontSize: 11),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLogoHeader() {
    return Column(
      children: [
        GestureDetector(
          onTap: _pickLogo,
          child: Container(
            width: 100,
            height: 100,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFFCFCAC0)),
              image: _logo != null
                  ? DecorationImage(image: FileImage(_logo!), fit: BoxFit.cover)
                  : null,
            ),
            child: _logo == null
                ? const Icon(
                    Icons.add_a_photo_outlined,
                    color: Color(0xFF8C6A4F),
                    size: 40,
                  )
                : null,
          ),
        ),
        const SizedBox(height: 12),
        const Text(
          'Upload Shop Logo',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
        ),
        const Text(
          'Will appear on all bills and reports',
          style: TextStyle(color: Colors.grey, fontSize: 12),
        ),
      ],
    );
  }

  Widget _buildTextField(
    TextEditingController ctrl,
    String hint,
    IconData icon, {
    int lines = 1,
  }) {
    return TextField(
      controller: ctrl,
      maxLines: lines,
      decoration: InputDecoration(
        labelText: hint,
        prefixIcon: Icon(icon, color: const Color(0xFF8C6A4F)),
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFCFCAC0)),
        ),
      ),
    );
  }
}
