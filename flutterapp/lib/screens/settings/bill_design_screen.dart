import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import '../../providers/app_provider.dart';
import '../../models/app_models.dart';

class BillDesignScreen extends StatefulWidget {
  const BillDesignScreen({super.key});

  @override
  State<BillDesignScreen> createState() => _BillDesignScreenState();
}

class _BillDesignScreenState extends State<BillDesignScreen> {
  late TextEditingController _shopNameCtrl;
  late TextEditingController _addressCtrl;
  late TextEditingController _footerCtrl;
  late List<BillDesignContact> _contacts;
  String _logo = '';
  String _template = 'classic';

  final ImagePicker _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    final provider = Provider.of<AppProvider>(context, listen: false);
    final settings = provider.appData!.settings.billDesign;

    _shopNameCtrl = TextEditingController(text: settings.shopName);
    _addressCtrl = TextEditingController(text: settings.address);
    _footerCtrl = TextEditingController(text: settings.footer);
    _contacts = List.from(settings.contacts);
    _logo = settings.logo;
    _template = settings.template;
  }

  Future<void> _pickLogo() async {
    final XFile? image = await _picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 512,
      maxHeight: 512,
      imageQuality: 85,
    );
    if (image != null) {
      final bytes = await image.readAsBytes();
      setState(() {
        _logo = base64Encode(bytes);
      });
    }
  }

  void _addContact() {
    setState(() {
      _contacts.add(
        BillDesignContact(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          label: '',
          phone: '',
        ),
      );
    });
  }

  void _removeContact(String id) {
    setState(() {
      _contacts.removeWhere((c) => c.id == id);
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<AppProvider>(context);

    return Scaffold(
      backgroundColor: const Color(0xFFFAF8F3),
      appBar: AppBar(
        title: const Text(
          'Bill Design Settings',
          style: TextStyle(fontFamily: 'serif', fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.save),
            onPressed: () {
              final newDesign = BillDesignSettings(
                shopName: _shopNameCtrl.text,
                address: _addressCtrl.text,
                footer: _footerCtrl.text,
                contacts: _contacts,
                logo: _logo,
                template: _template,
              );
              provider.updateBillDesign(newDesign);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Bill design saved successfully!'),
                ),
              );
              Navigator.pop(context);
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _SectionCard(
              title: 'General Info',
              children: [
                TextField(
                  controller: _shopNameCtrl,
                  decoration: const InputDecoration(labelText: 'Shop Name'),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    _buildLogoPreview(),
                    const SizedBox(width: 16),
                    ElevatedButton.icon(
                      onPressed: _pickLogo,
                      icon: const Icon(Icons.upload),
                      label: const Text('Upload Logo'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF8C6A4F),
                        foregroundColor: Colors.white,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _addressCtrl,
                  decoration: const InputDecoration(labelText: 'Shop Address'),
                  maxLines: 2,
                ),
              ],
            ),
            const SizedBox(height: 16),
            _SectionCard(
              title: 'Contacts',
              children: [
                ..._contacts.asMap().entries.map((entry) {
                  int idx = entry.key;
                  BillDesignContact c = entry.value;
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 8.0),
                    child: Row(
                      children: [
                        Expanded(
                          flex: 2,
                          child: TextField(
                            onChanged: (val) {
                              _contacts[idx] = BillDesignContact(
                                id: c.id,
                                label: val,
                                phone: c.phone,
                              );
                            },
                            decoration: const InputDecoration(
                              hintText: 'Label (e.g. Sales)',
                            ),
                            controller: TextEditingController(text: c.label)
                              ..selection = TextSelection.fromPosition(
                                TextPosition(offset: c.label.length),
                              ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          flex: 3,
                          child: TextField(
                            onChanged: (val) {
                              _contacts[idx] = BillDesignContact(
                                id: c.id,
                                label: c.label,
                                phone: val,
                              );
                            },
                            decoration: const InputDecoration(
                              hintText: 'Phone Number',
                            ),
                            keyboardType: TextInputType.phone,
                            controller: TextEditingController(text: c.phone)
                              ..selection = TextSelection.fromPosition(
                                TextPosition(offset: c.phone.length),
                              ),
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.delete, color: Colors.red),
                          onPressed: () => _removeContact(c.id),
                        ),
                      ],
                    ),
                  );
                }),
                TextButton.icon(
                  onPressed: _addContact,
                  icon: const Icon(Icons.add),
                  label: const Text('Add Contact'),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _SectionCard(
              title: 'Bill Style',
              children: [
                const Text(
                  'Template',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                // ignore: deprecated_member_use
                RadioListTile<String>(
                  title: const Text('Simple'),
                  value: 'simple',
                  // ignore: deprecated_member_use
                  groupValue: _template,
                  // ignore: deprecated_member_use
                  onChanged: (v) => setState(() => _template = v!),
                ),
                // ignore: deprecated_member_use
                RadioListTile<String>(
                  title: const Text('Classic'),
                  value: 'classic',
                  // ignore: deprecated_member_use
                  groupValue: _template,
                  // ignore: deprecated_member_use
                  onChanged: (v) => setState(() => _template = v!),
                ),
                // ignore: deprecated_member_use
                RadioListTile<String>(
                  title: const Text('Modern'),
                  value: 'modern',
                  // ignore: deprecated_member_use
                  groupValue: _template,
                  // ignore: deprecated_member_use
                  onChanged: (v) => setState(() => _template = v!),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _footerCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Footer Message',
                    hintText: 'Thank you for your business!',
                  ),
                  maxLines: 2,
                ),
              ],
            ),
            const SizedBox(height: 24),
            const Text(
              'LIVE PREVIEW',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 12,
                letterSpacing: 1.2,
                color: Colors.brown,
              ),
            ),
            const SizedBox(height: 8),
            _BillPreview(
              shopName: _shopNameCtrl.text,
              address: _addressCtrl.text,
              contacts: _contacts,
              logo: _logo,
              footer: _footerCtrl.text,
              template: _template,
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildLogoPreview() {
    if (_logo.isEmpty) {
      return Container(
        width: 64,
        height: 64,
        decoration: BoxDecoration(
          color: Colors.grey[200],
          shape: BoxShape.circle,
        ),
        child: const Icon(Icons.image, color: Colors.grey),
      );
    }
    return ClipOval(
      child: Image.memory(
        base64Decode(_logo),
        width: 64,
        height: 64,
        fit: BoxFit.cover,
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  final String title;
  final List<Widget> children;
  const _SectionCard({required this.title, required this.children});

  @override
  Widget build(BuildContext context) {
    return Card(
      color: Colors.white,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: Color(0xFFCFCAC0)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontFamily: 'serif',
                fontSize: 18,
              ),
            ),
            const Divider(),
            ...children,
          ],
        ),
      ),
    );
  }
}

class _BillPreview extends StatelessWidget {
  final String shopName;
  final String address;
  final List<BillDesignContact> contacts;
  final String logo;
  final String footer;
  final String template;

  const _BillPreview({
    required this.shopName,
    required this.address,
    required this.contacts,
    required this.logo,
    required this.footer,
    required this.template,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 10,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Column(
        children: [
          if (logo.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(bottom: 8.0),
              child: ClipOval(
                child: Image.memory(
                  base64Decode(logo),
                  width: 50,
                  height: 50,
                  fit: BoxFit.cover,
                ),
              ),
            ),
          Text(
            shopName.isEmpty ? 'Your Shop Name' : shopName,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          if (address.isNotEmpty)
            Text(
              address,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 10, color: Colors.grey),
            ),
          const SizedBox(height: 4),
          Wrap(
            spacing: 8,
            children: contacts
                .where((c) => c.label.isNotEmpty && c.phone.isNotEmpty)
                .map(
                  (c) => Text(
                    '${c.label}: ${c.phone}',
                    style: const TextStyle(fontSize: 8, color: Colors.grey),
                  ),
                )
                .toList(),
          ),
          const Divider(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Bill #: 123', style: const TextStyle(fontSize: 10)),
              Text('Date: 03/04/2026', style: const TextStyle(fontSize: 10)),
            ],
          ),
          const SizedBox(height: 16),
          Table(
            children: [
              TableRow(
                children: [
                  Text(
                    'Item',
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    'Qty',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    'Total',
                    textAlign: TextAlign.right,
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              TableRow(
                children: [
                  Text('Sample Item', style: const TextStyle(fontSize: 10)),
                  Text(
                    '2',
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 10),
                  ),
                  Text(
                    '200',
                    textAlign: TextAlign.right,
                    style: const TextStyle(fontSize: 10),
                  ),
                ],
              ),
            ],
          ),
          const Divider(height: 24),
          const Align(
            alignment: Alignment.centerRight,
            child: Text(
              'Total: 200',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
          if (footer.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 16.0),
              child: Text(
                footer,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 10,
                  fontStyle: FontStyle.italic,
                  color: Colors.grey,
                ),
              ),
            ),
        ],
      ),
    );
  }
}
