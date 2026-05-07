import 'package:cloud_firestore/cloud_firestore.dart';

class CustomerModel {
  final String id;
  final String name;
  final String phone;
  final bool isSupplier;
  final DateTime createdAt;

  CustomerModel({
    required this.id,
    required this.name,
    required this.phone,
    this.isSupplier = false,
    required this.createdAt,
  });

  Map<String, dynamic> toMap() => {
    'name': name,
    'phone': phone,
    'isSupplier': isSupplier,
    'createdAt': createdAt,
  };

  factory CustomerModel.fromFirestore(String id, Map<String, dynamic> map) =>
      CustomerModel(
        id: id,
        name: map['name'] ?? '',
        phone: map['phone'] ?? '',
        isSupplier: map['isSupplier'] ?? false,
        createdAt: map['createdAt'] != null
            ? (map['createdAt'] as Timestamp).toDate()
            : DateTime.now(),
      );
}
