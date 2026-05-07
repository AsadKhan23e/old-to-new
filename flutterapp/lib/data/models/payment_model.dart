import 'package:cloud_firestore/cloud_firestore.dart';

class PaymentModel {
  final String id;
  final double amount;
  final DateTime createdAt;

  PaymentModel({
    required this.id,
    required this.amount,
    required this.createdAt,
  });

  Map<String, dynamic> toMap() => {'amount': amount, 'createdAt': createdAt};

  factory PaymentModel.fromFirestore(String id, Map<String, dynamic> map) =>
      PaymentModel(
        id: id,
        amount: (map['amount'] as num?)?.toDouble() ?? 0.0,
        createdAt: map['createdAt'] != null
            ? (map['createdAt'] as Timestamp).toDate()
            : DateTime.now(),
      );
}
