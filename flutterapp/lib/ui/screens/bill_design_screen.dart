import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../logic/providers/app_data_provider.dart';
import '../../models/app_models.dart';
import 'package:google_fonts/google_fonts.dart';

class BillDesignScreen extends ConsumerStatefulWidget {
  const BillDesignScreen({super.key});

  @override
  ConsumerState<BillDesignScreen> createState() => _BillDesignScreenState();
}

class _BillDesignScreenState extends ConsumerState<BillDesignScreen> {
  late TextEditingController _shopNameCtrl;
  late TextEditingController _addressCtrl;
  late TextEditingController _footerCtrl;
  late List<BillDesignContact> _contacts;
  String _template = 'classic';
  String _bgBanner = '';
  double _bgOpacity = 0.15;
  double _bgScale = 1.0;
  String _bgSize = 'cover';
  String _bgPosition = 'center';

  @override
  void initState() {
    super.initState();
    final settings = ref.read(appDataProvider).value?.settings.billDesign;
    _shopNameCtrl = TextEditingController(text: settings?.shopName ?? '');
    _addressCtrl = TextEditingController(text: settings?.address ?? '');
    _footerCtrl = TextEditingController(text: settings?.footer ?? '');
    _contacts = settings?.contacts != null ? List.from(settings!.contacts) : [];
    _template = settings?.template ?? 'classic';
    _bgBanner = settings?.backgroundBanner ?? '';
    _bgOpacity = settings?.backgroundOpacity ?? 0.15;
    _bgScale = settings?.backgroundScale ?? 1.0;
    _bgSize = settings?.backgroundSize ?? 'cover';
    _bgPosition = settings?.backgroundPosition ?? 'center';
  }

  void _save() {
    final data = ref.read(appDataProvider).value;
    if (data == null) return;

    final updatedBill = data.settings.billDesign.copyWith(
      shopName: _shopNameCtrl.text,
      address: _addressCtrl.text,
      footer: _footerCtrl.text,
      contacts: _contacts,
      template: _template,
      backgroundBanner: _bgBanner,
      backgroundOpacity: _bgOpacity,
      backgroundScale: _bgScale,
      backgroundSize: _bgSize,
      backgroundPosition: _bgPosition,
    );

    ref
        .read(appDataProvider.notifier)
        .updateSettings(data.settings.copyWith(billDesign: updatedBill));

    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('Bill Design Saved!')));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text(
          'Bill Design',
          style: GoogleFonts.outfit(fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            onPressed: _save,
            icon: const Icon(Icons.check, color: Colors.green),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildSectionCard('Business Info', [
              _input('Shop Name', _shopNameCtrl),
              const SizedBox(height: 12),
              _input('Shop Address', _addressCtrl, lines: 2),
            ]),
            const SizedBox(height: 20),
            _buildSectionCard('Contacts', [
              ..._contacts.map((c) => _buildContactRow(c)),
              TextButton.icon(
                onPressed: () => setState(
                  () => _contacts.add(
                    BillDesignContact(
                      id: DateTime.now().toString(),
                      label: '',
                      phone: '',
                    ),
                  ),
                ),
                icon: const Icon(Icons.add),
                label: const Text('Add Contact'),
              ),
            ]),
            const SizedBox(height: 20),
            _buildSectionCard('Appearance', [
              const Text(
                'Template',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              Row(
                children: ['simple', 'classic', 'modern']
                    .map(
                      (t) => Expanded(
                        child: RadioListTile<String>(
                          title: Text(
                            t[0].toUpperCase() + t.substring(1),
                            style: const TextStyle(fontSize: 10),
                          ),
                          value: t,
                          groupValue: _template,
                          onChanged: (v) =>
                              setState(() => _template = v as String),
                          contentPadding: EdgeInsets.zero,
                        ),
                      ),
                    )
                    .toList(),
              ),
              const Divider(),
              const Text(
                'Background Banner (Premium)',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              _buildBannerGrid(),
              if (_bgBanner.isNotEmpty) ...[
                const SizedBox(height: 12),
                _slider(
                  'Opacity',
                  _bgOpacity,
                  (v) => setState(() => _bgOpacity = v),
                ),
                _slider(
                  'Scale',
                  _bgScale,
                  (v) => setState(() => _bgScale = v),
                  min: 0.1,
                  max: 3.0,
                ),
              ],
            ]),
            const SizedBox(height: 20),
            _buildSectionCard('Footer', [
              _input('Footer Message', _footerCtrl, lines: 2),
            ]),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionCard(String title, List<Widget> children) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: GoogleFonts.outfit(
              fontWeight: FontWeight.bold,
              fontSize: 16,
            ),
          ),
          const SizedBox(height: 16),
          ...children,
        ],
      ),
    );
  }

  Widget _input(String label, TextEditingController ctrl, {int lines = 1}) {
    return TextField(
      controller: ctrl,
      maxLines: lines,
      decoration: InputDecoration(
        labelText: label,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
        contentPadding: const EdgeInsets.all(12),
      ),
    );
  }

  Widget _buildContactRow(BillDesignContact contact) {
    final labelCtrl = TextEditingController(text: contact.label);
    final phoneCtrl = TextEditingController(text: contact.phone);
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Row(
        children: [
          Expanded(child: _input('Label', labelCtrl)),
          const SizedBox(width: 8),
          Expanded(child: _input('Phone', phoneCtrl)),
          IconButton(
            onPressed: () => setState(
              () => _contacts.removeWhere((c) => c.id == contact.id),
            ),
            icon: const Icon(Icons.delete_outline, color: Colors.red),
          ),
        ],
      ),
    );
  }

  Widget _buildBannerGrid() {
    final presets = [
      'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=400&q=80',
    ];
    return Wrap(
      spacing: 8,
      children: [
        GestureDetector(
          onTap: () => setState(() => _bgBanner = ''),
          child: Container(
            width: 50,
            height: 50,
            decoration: BoxDecoration(
              border: Border.all(color: Colors.grey),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(Icons.close),
          ),
        ),
        ...presets.map(
          (url) => GestureDetector(
            onTap: () => setState(() => _bgBanner = url),
            child: Container(
              width: 50,
              height: 50,
              decoration: BoxDecoration(
                border: Border.all(
                  color: _bgBanner == url ? Colors.blue : Colors.grey,
                ),
                borderRadius: BorderRadius.circular(8),
                image: DecorationImage(
                  image: NetworkImage(url),
                  fit: BoxFit.cover,
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _slider(
    String label,
    double val,
    Function(double) onChanged, {
    double min = 0.05,
    double max = 1.0,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '$label: ${val.toStringAsFixed(2)}',
          style: const TextStyle(fontSize: 12),
        ),
        Slider(value: val, min: min, max: max, onChanged: onChanged),
      ],
    );
  }
}
