import 'package:cloud_firestore/cloud_firestore.dart';

class BillModel {
  final String id;
  final String customerId;
  final String status; // 'open' | 'finalized'
  final DateTime createdAt;
  final DateTime updatedAt;

  BillModel({
    required this.id,
    required this.customerId,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
  });

  Map<String, dynamic> toMap() => {
    'customerId': customerId,
    'status': status,
    'createdAt': createdAt,
    'updatedAt': updatedAt,
  };

  factory BillModel.fromFirestore(String id, Map<String, dynamic> map) =>
      BillModel(
        id: id,
        customerId: map['customerId'] ?? '',
        status: map['status'] ?? 'open',
        createdAt: map['createdAt'] != null
            ? (map['createdAt'] as Timestamp).toDate()
            : DateTime.now(),
        updatedAt: map['updatedAt'] != null
            ? (map['updatedAt'] as Timestamp).toDate()
            : DateTime.now(),
      );
}
