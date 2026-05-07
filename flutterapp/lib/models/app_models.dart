class UserProfile {
  final String name;
  final String email;

  UserProfile({required this.name, required this.email});

  Map<String, dynamic> toMap() => {'name': name, 'email': email};
  factory UserProfile.fromMap(Map<String, dynamic> map) =>
      UserProfile(name: map['name'] ?? '', email: map['email'] ?? '');
}

class Customer {
  final String id;
  final String name;
  final String phone;
  final String? address;
  final String? picture;
  final String dateAdded;
  final String? notes;
  final bool isSupplier;

  Customer({
    required this.id,
    required this.name,
    required this.phone,
    this.address,
    this.picture,
    required this.dateAdded,
    this.notes,
    this.isSupplier = false,
  });

  Map<String, dynamic> toMap() => {
    'id': id,
    'name': name,
    'phone': phone,
    'address': address,
    'picture': picture,
    'dateAdded': dateAdded,
    'notes': notes,
    'isSupplier': isSupplier,
  };

  factory Customer.fromMap(Map<String, dynamic> map) => Customer(
    id: map['id'] ?? '',
    name: map['name'] ?? '',
    phone: map['phone'] ?? '',
    address: map['address'],
    picture: map['picture'],
    dateAdded: map['dateAdded'] ?? '',
    notes: map['notes'],
    isSupplier: map['isSupplier'] ?? false,
  );
}

class Item {
  final String id;
  final String itemName;
  final double purchasePrice;
  final String? supplierName;
  final String? supplierPhone;
  final double sellingPrice;
  final int quantity;
  final String? notes;
  final String? picture;
  final String createdAt;
  final String? modifiedAt;

  Item({
    required this.id,
    required this.itemName,
    required this.purchasePrice,
    this.supplierName,
    this.supplierPhone,
    required this.sellingPrice,
    required this.quantity,
    this.notes,
    this.picture,
    required this.createdAt,
    this.modifiedAt,
  });

  Map<String, dynamic> toMap() => {
    'id': id,
    'itemName': itemName,
    'purchasePrice': purchasePrice,
    'supplierName': supplierName,
    'supplierPhone': supplierPhone,
    'sellingPrice': sellingPrice,
    'quantity': quantity,
    'notes': notes,
    'picture': picture,
    'createdAt': createdAt,
    'modifiedAt': modifiedAt,
  };

  factory Item.fromMap(Map<String, dynamic> map) => Item(
    id: map['id'] ?? '',
    itemName: map['itemName'] ?? '',
    purchasePrice: (map['purchasePrice'] as num?)?.toDouble() ?? 0.0,
    supplierName: map['supplierName'],
    supplierPhone: map['supplierPhone'],
    sellingPrice: (map['sellingPrice'] as num?)?.toDouble() ?? 0.0,
    quantity: (map['quantity'] as num?)?.toInt() ?? 0,
    notes: map['notes'],
    picture: map['picture'],
    createdAt: map['createdAt'] ?? '',
    modifiedAt: map['modifiedAt'],
  );
}

class SoldItem {
  final String itemId;
  final String itemName;
  final int quantity;
  final double unitPrice;
  final String? notes;
  final String? picture;

  SoldItem({
    required this.itemId,
    required this.itemName,
    required this.quantity,
    required this.unitPrice,
    this.notes,
    this.picture,
  });

  Map<String, dynamic> toMap() => {
    'itemId': itemId,
    'itemName': itemName,
    'quantity': quantity,
    'unitPrice': unitPrice,
    'notes': notes,
    'picture': picture,
  };

  factory SoldItem.fromMap(Map<String, dynamic> map) => SoldItem(
    itemId: map['itemId'] ?? '',
    itemName: map['itemName'] ?? '',
    quantity: (map['quantity'] as num?)?.toInt() ?? 0,
    unitPrice: (map['unitPrice'] as num?)?.toDouble() ?? 0.0,
    notes: map['notes'],
    picture: map['picture'],
  );
}

class Payment {
  final String id;
  final double amount;
  final String date;
  final String? notes;
  final String? image;

  Payment({
    required this.id,
    required this.amount,
    required this.date,
    this.notes,
    this.image,
  });

  Map<String, dynamic> toMap() => {
    'id': id,
    'amount': amount,
    'date': date,
    'notes': notes,
    'image': image,
  };

  factory Payment.fromMap(Map<String, dynamic> map) => Payment(
    id: map['id'] ?? '',
    amount: (map['amount'] as num?)?.toDouble() ?? 0.0,
    date: map['date'] ?? '',
    notes: map['notes'],
    image: map['image'],
  );
}

class BillAdjustment {
  final double previousGrandTotal;
  final double newGrandTotal;
  final double difference;
  final String editedAt;
  final String? reason;

  BillAdjustment({
    required this.previousGrandTotal,
    required this.newGrandTotal,
    required this.difference,
    required this.editedAt,
    this.reason,
  });

  Map<String, dynamic> toMap() => {
    'previousGrandTotal': previousGrandTotal,
    'newGrandTotal': newGrandTotal,
    'difference': difference,
    'editedAt': editedAt,
    'reason': reason,
  };

  factory BillAdjustment.fromMap(Map<String, dynamic> map) => BillAdjustment(
    previousGrandTotal: (map['previousGrandTotal'] as num?)?.toDouble() ?? 0.0,
    newGrandTotal: (map['newGrandTotal'] as num?)?.toDouble() ?? 0.0,
    difference: (map['difference'] as num?)?.toDouble() ?? 0.0,
    editedAt: map['editedAt'] ?? '',
    reason: map['reason'],
  );
}

class Transaction {
  final String id;
  final String customerId;
  final String? customerName;
  final List<SoldItem>? items;
  final double totalAmount;
  final double amountPaid;
  final String? type; // 'credit', 'debit', 'purchase'
  final String date;
  final String? modifiedAt;
  final String? notes;
  final double remainingBalance;
  final double? previousBalance;
  final double? grandTotal;
  final List<Payment>? additionalPayments;
  final bool paid;
  final String? status; // 'open', 'closed'
  final bool? isEdited;
  final int? billNumber;
  final String? image;
  final List<BillAdjustment>? billAdjustments;

  Transaction({
    required this.id,
    required this.customerId,
    this.customerName,
    this.items,
    required this.totalAmount,
    required this.amountPaid,
    this.type,
    required this.date,
    this.modifiedAt,
    this.notes,
    required this.remainingBalance,
    this.previousBalance,
    this.grandTotal,
    this.additionalPayments,
    required this.paid,
    this.status,
    this.isEdited,
    this.billNumber,
    this.image,
    this.billAdjustments,
  });

  Map<String, dynamic> toMap() => {
    'id': id,
    'customerId': customerId,
    'customerName': customerName,
    'items': items?.map((x) => x.toMap()).toList(),
    'totalAmount': totalAmount,
    'amountPaid': amountPaid,
    'type': type,
    'date': date,
    'modifiedAt': modifiedAt,
    'notes': notes,
    'remainingBalance': remainingBalance,
    'previousBalance': previousBalance,
    'grandTotal': grandTotal,
    'additionalPayments': additionalPayments?.map((x) => x.toMap()).toList(),
    'paid': paid,
    'status': status,
    'isEdited': isEdited,
    'billNumber': billNumber,
    'image': image,
    'billAdjustments': billAdjustments?.map((x) => x.toMap()).toList(),
  };

  factory Transaction.fromMap(Map<String, dynamic> map) => Transaction(
    id: map['id'] ?? '',
    customerId: map['customerId'] ?? '',
    customerName: map['customerName'],
    items: map['items'] != null
        ? List<SoldItem>.from(map['items'].map((x) => SoldItem.fromMap(x)))
        : null,
    totalAmount: (map['totalAmount'] as num?)?.toDouble() ?? 0.0,
    amountPaid: (map['amountPaid'] as num?)?.toDouble() ?? 0.0,
    type: map['type'],
    date: map['date'] ?? '',
    modifiedAt: map['modifiedAt'],
    notes: map['notes'],
    remainingBalance: (map['remainingBalance'] as num?)?.toDouble() ?? 0.0,
    previousBalance: (map['previousBalance'] as num?)?.toDouble(),
    grandTotal: (map['grandTotal'] as num?)?.toDouble(),
    additionalPayments: map['additionalPayments'] != null
        ? List<Payment>.from(
            map['additionalPayments'].map((x) => Payment.fromMap(x)),
          )
        : null,
    paid: map['paid'] ?? false,
    status: map['status'],
    isEdited: map['isEdited'],
    billNumber: (map['billNumber'] as num?)?.toInt(),
    image: map['image'],
    billAdjustments: map['billAdjustments'] != null
        ? List<BillAdjustment>.from(
            (map['billAdjustments'] as List).map(
              (x) => BillAdjustment.fromMap(x),
            ),
          )
        : null,
  );
}

class Reminder {
  final String id;
  final String customerId;
  final String customerName;
  final String customerPhone;
  final double dueAmount;
  final String dueDate;
  final String message;
  final String status; // 'pending', 'sent', 'completed'

  Reminder({
    required this.id,
    required this.customerId,
    required this.customerName,
    required this.customerPhone,
    required this.dueAmount,
    required this.dueDate,
    required this.message,
    required this.status,
  });

  Map<String, dynamic> toMap() => {
    'id': id,
    'customerId': customerId,
    'customerName': customerName,
    'customerPhone': customerPhone,
    'dueAmount': dueAmount,
    'dueDate': dueDate,
    'message': message,
    'status': status,
  };

  factory Reminder.fromMap(Map<String, dynamic> map) => Reminder(
    id: map['id'] ?? '',
    customerId: map['customerId'] ?? '',
    customerName: map['customerName'] ?? '',
    customerPhone: map['customerPhone'] ?? '',
    dueAmount: (map['dueAmount'] as num?)?.toDouble() ?? 0.0,
    dueDate: map['dueDate'] ?? '',
    message: map['message'] ?? '',
    status: map['status'] ?? 'pending',
  );
}

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
  final String template; // 'simple', 'classic', 'modern'
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
    'contacts': contacts.map((x) => x.toMap()).toList(),
    'address': address,
    'logo': logo,
    'template': template,
    'footer': footer,
  };

  factory BillDesignSettings.fromMap(Map<String, dynamic> map) =>
      BillDesignSettings(
        shopName: map['shopName'] ?? 'Your Ledger Shop',
        contacts: map['contacts'] != null
            ? List<BillDesignContact>.from(
                map['contacts'].map((x) => BillDesignContact.fromMap(x)),
              )
            : [],
        address: map['address'] ?? '',
        logo: map['logo'] ?? '',
        template: map['template'] ?? 'classic',
        footer: map['footer'] ?? '',
      );
}

class AppSettings {
  final String language; // 'en', 'ur'
  final String viewMode; // 'user', 'customer'
  final String theme; // 'light', 'dark', 'system'
  final BillDesignSettings billDesign;

  AppSettings({
    required this.language,
    required this.viewMode,
    required this.theme,
    required this.billDesign,
  });

  Map<String, dynamic> toMap() => {
    'language': language,
    'viewMode': viewMode,
    'theme': theme,
    'billDesign': billDesign.toMap(),
  };

  factory AppSettings.fromMap(Map<String, dynamic> map) => AppSettings(
    language: map['language'] ?? 'en',
    viewMode: map['viewMode'] ?? 'user',
    theme: map['theme'] ?? 'system',
    billDesign: BillDesignSettings.fromMap(map['billDesign'] ?? {}),
  );
}

class AppData {
  final List<Customer> customers;
  final List<Item> items;
  final List<Transaction> transactions;
  final List<Reminder> reminders;
  final AppSettings settings;

  AppData({
    required this.customers,
    required this.items,
    required this.transactions,
    required this.reminders,
    required this.settings,
  });

  Map<String, dynamic> toMap() => {
    'customers': customers.map((x) => x.toMap()).toList(),
    'items': items.map((x) => x.toMap()).toList(),
    'transactions': transactions.map((x) => x.toMap()).toList(),
    'reminders': reminders.map((x) => x.toMap()).toList(),
    'settings': settings.toMap(),
  };

  factory AppData.fromMap(Map<String, dynamic> map) => AppData(
    customers: map['customers'] != null
        ? List<Customer>.from(map['customers'].map((x) => Customer.fromMap(x)))
        : [],
    items: map['items'] != null
        ? List<Item>.from(map['items'].map((x) => Item.fromMap(x)))
        : [],
    transactions: map['transactions'] != null
        ? List<Transaction>.from(
            map['transactions'].map((x) => Transaction.fromMap(x)),
          )
        : [],
    reminders: map['reminders'] != null
        ? List<Reminder>.from(map['reminders'].map((x) => Reminder.fromMap(x)))
        : [],
    settings: AppSettings.fromMap(map['settings'] ?? {}),
  );
}
