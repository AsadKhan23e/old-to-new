class BillDesignContact {
  final String id;
  final String label;
  final String phone;

  BillDesignContact({
    required this.id,
    required this.label,
    required this.phone,
  });

  Map<String, dynamic> toMap() => {'id': id, 'label': label, 'phone': phone};

  factory BillDesignContact.fromMap(Map<String, dynamic> map) =>
      BillDesignContact(
        id: map['id'] ?? '',
        label: map['label'] ?? '',
        phone: map['phone'] ?? '',
      );
}

class BillDesignSettings {
  final String shopName;
  final List<BillDesignContact> contacts;
  final String address;
  final String logo;
  final String template;
  final String footer;

  BillDesignSettings({
    required this.shopName,
    required this.contacts,
    required this.address,
    required this.logo,
    required this.template,
    required this.footer,
  });

  Map<String, dynamic> toMap() => {
    'shopName': shopName,
    'contacts': contacts.map((c) => c.toMap()).toList(),
    'address': address,
    'logo': logo,
    'template': template,
    'footer': footer,
  };

  factory BillDesignSettings.fromMap(Map<String, dynamic> map) =>
      BillDesignSettings(
        shopName: map['shopName'] ?? '',
        contacts:
            (map['contacts'] as List<dynamic>?)
                ?.map(
                  (c) => BillDesignContact.fromMap(c as Map<String, dynamic>),
                )
                .toList() ??
            [],
        address: map['address'] ?? '',
        logo: map['logo'] ?? '',
        template: map['template'] ?? 'classic',
        footer: map['footer'] ?? '',
      );

  static BillDesignSettings get defaultSettings => BillDesignSettings(
    shopName: 'Your Ledger Shop',
    contacts: [
      BillDesignContact(id: '1', label: 'Office', phone: '000-000-0000'),
    ],
    address: 'Main Street, Business District',
    logo: '',
    template: 'classic',
    footer: 'Account Managed by CashbookPro',
  );
}
