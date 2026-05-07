import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../logic/providers/app_data_provider.dart';
import '../../models/app_models.dart';

class BillDesignScreen extends ConsumerStatefulWidget {
  const BillDesignScreen({super.key});

  @override
  ConsumerState<BillDesignScreen> createState() => _BillDesignScreenState();
}

class _BillDesignScreenState extends ConsumerState<BillDesignScreen> {
  final _shopNameCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();
  final _footerCtrl = TextEditingController();
  List<BillDesignContact> _contacts = [];
  String _template = 'classic';
  bool _initialized = false;

  void _initializeFields(BillDesignSettings settings) {
    if (_initialized) return;
    _shopNameCtrl.text = settings.shopName;
    _addressCtrl.text = settings.address;
    _footerCtrl.text = settings.footer;
    _contacts = List.from(settings.contacts);
    _template = settings.template;
    _initialized = true;
  }

  Future<void> _handleSave() async {
    final data = ref.read(appDataProvider).value;
    if (data == null) return;

    final updatedBillSettings = BillDesignSettings(
      shopName: _shopNameCtrl.text,
      address: _addressCtrl.text,
      footer: _footerCtrl.text,
      contacts: _contacts,
      template: _template,
      logo: '', // Placeholder
    );

    final updatedSettings = AppSettings(
      language: data.settings.language,
      viewMode: data.settings.viewMode,
      theme: data.settings.theme,
      billDesign: updatedBillSettings,
    );

    final updatedData = AppData(
      customers: data.customers,
      items: data.items,
      transactions: data.transactions,
      reminders: data.reminders,
      settings: updatedSettings,
    );

    try {
      await ref.read(appDataProvider.notifier).saveData(updatedData);
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Bill Design Saved!')));
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  void _addContact() {
    setState(() {
      _contacts.add(
        BillDesignContact(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          label: 'New',
          phone: '',
        ),
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final appDataAsync = ref.watch(appDataProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFFAF8F3),
      appBar: AppBar(
        title: const Text(
          'Bill Design Settings',
          style: TextStyle(),
        ),
        backgroundColor: const Color(0xFFFAF8F3),
        actions: [
          IconButton(
            onPressed: _handleSave,
            icon: const Icon(Icons.check, color: Color(0xFF8C6A4F)),
          ),
        ],
      ),
      body: appDataAsync.when(
        data: (data) {
          _initializeFields(data.settings.billDesign);
          return _buildForm();
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
      ),
    );
  }

  Widget _buildForm() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildCard(
            title: 'Shop Identity',
            children: [
              _buildTextField('Shop Name', _shopNameCtrl, Icons.store),
              const SizedBox(height: 16),
              _buildTextField('Address', _addressCtrl, Icons.location_on),
            ],
          ),
          const SizedBox(height: 16),
          _buildCard(
            title: 'Invoice Style',
            children: [
              const Text(
                'Template Style',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
              ),
              const SizedBox(height: 8),
              _buildTemplateSelector(),
              const SizedBox(height: 16),
              _buildTextField(
                'Footer (Thank you message)',
                _footerCtrl,
                Icons.short_text,
              ),
            ],
          ),
          const SizedBox(height: 16),
          _buildCard(
            title: 'Contact Details',
            children: [
              for (int i = 0; i < _contacts.length; i++) ...[
                _buildContactFields(i),
                const SizedBox(height: 8),
              ],
              TextButton.icon(
                onPressed: _addContact,
                icon: const Icon(Icons.add),
                label: const Text('Add Contact Line'),
              ),
            ],
          ),
          const SizedBox(height: 32),
          ElevatedButton(
            onPressed: _handleSave,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF8C6A4F),
              minimumSize: const Size(double.infinity, 50),
            ),
            child: const Text(
              'SAVE SETTINGS',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCard({required String title, required List<Widget> children}) {
    return Card(
      elevation: 0,
      color: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: Color(0xFFCFCAC0)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                
                color: Color(0xFF8C6A4F),
              ),
            ),
            const SizedBox(height: 16),
            ...children,
          ],
        ),
      ),
    );
  }

  Widget _buildTextField(
    String label,
    TextEditingController ctrl,
    IconData icon,
  ) {
    return TextField(
      controller: ctrl,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon, color: const Color(0xFF8C6A4F), size: 20),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      ),
    );
  }

  Widget _buildContactFields(int index) {
    return Row(
      children: [
        Expanded(
          flex: 2,
          child: TextField(
            onChanged: (v) => setState(
              () => _contacts[index] = BillDesignContact(
                id: _contacts[index].id,
                label: v,
                phone: _contacts[index].phone,
              ),
            ),
            controller: TextEditingController(text: _contacts[index].label),
            decoration: const InputDecoration(hintText: 'Label (e.g. Office)'),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          flex: 3,
          child: TextField(
            onChanged: (v) => setState(
              () => _contacts[index] = BillDesignContact(
                id: _contacts[index].id,
                label: _contacts[index].label,
                phone: v,
              ),
            ),
            controller: TextEditingController(text: _contacts[index].phone),
            decoration: const InputDecoration(hintText: 'Phone Number'),
            keyboardType: TextInputType.phone,
          ),
        ),
        IconButton(
          onPressed: () => setState(() => _contacts.removeAt(index)),
          icon: const Icon(Icons.remove_circle, color: Colors.red),
        ),
      ],
    );
  }

  Widget _buildTemplateSelector() {
    return Wrap(
      spacing: 8,
      children: ['classic', 'simple', 'modern'].map((t) {
        final isSelected = _template == t;
        return ChoiceChip(
          label: Text(t.toUpperCase()),
          selected: isSelected,
          onSelected: (val) => setState(() => _template = t),
          selectedColor: const Color(0xFF8C6A4F),
          labelStyle: TextStyle(
            color: isSelected ? Colors.white : Colors.black,
          ),
        );
      }).toList(),
    );
  }
}
