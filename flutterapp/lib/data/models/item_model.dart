class BillItemModel {
  final String id;
  final String name;
  final double price;
  final int quantity;
  final bool isActive;

  BillItemModel({
    required this.id,
    required this.name,
    required this.price,
    required this.quantity,
    this.isActive = true,
  });

  Map<String, dynamic> toMap() => {
    'name': name,
    'price': price,
    'quantity': quantity,
    'isActive': isActive,
  };

  factory BillItemModel.fromFirestore(String id, Map<String, dynamic> map) =>
      BillItemModel(
        id: id,
        name: map['name'] ?? '',
        price: (map['price'] as num?)?.toDouble() ?? 0.0,
        quantity: (map['quantity'] as num?)?.toInt() ?? 0,
        isActive: map['isActive'] ?? true,
      );
}
