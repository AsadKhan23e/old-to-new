import 'package:cloud_firestore/cloud_firestore.dart';
import '../../data/models/customer_model.dart';
import '../../data/models/bill_model.dart';
import '../../data/models/item_model.dart';
import '../../data/models/payment_model.dart';
import '../../data/models/settings_model.dart';

class FirestoreService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  // --- Settings ---
  Stream<BillDesignSettings> streamSettings(String userEmail) {
    return _db.collection('users').doc(userEmail).snapshots().map((doc) {
      if (!doc.exists) return BillDesignSettings.defaultSettings;
      final data = doc.data() as Map<String, dynamic>;
      final settingsData =
          (data['settings'] as Map<String, dynamic>?)?['billDesign']
              as Map<String, dynamic>?;
      return settingsData != null
          ? BillDesignSettings.fromMap(settingsData)
          : BillDesignSettings.defaultSettings;
    });
  }

  Future<void> updateSettings(String userEmail, BillDesignSettings settings) {
    return _db.collection('users').doc(userEmail).set({
      'settings': {'billDesign': settings.toMap()},
    }, SetOptions(merge: true));
  }

  // --- Customers ---
  Stream<List<CustomerModel>> streamCustomers() {
    return _db.collection('customers').snapshots().map((snapshot) {
      return snapshot.docs.map((doc) {
        return CustomerModel.fromFirestore(doc.id, doc.data());
      }).toList();
    });
  }

  Future<void> addCustomer(
    String name,
    String phone, {
    bool isSupplier = false,
  }) {
    return _db.collection('customers').add({
      'name': name,
      'phone': phone,
      'isSupplier': isSupplier,
      'createdAt': FieldValue.serverTimestamp(),
    });
  }

  // --- Bills ---
  Stream<List<BillModel>> streamBillsForCustomer(String customerId) {
    return _db
        .collection('bills')
        .where('customerId', isEqualTo: customerId)
        .snapshots()
        .map((snapshot) {
          return snapshot.docs.map((doc) {
            return BillModel.fromFirestore(doc.id, doc.data());
          }).toList();
        });
  }

  Stream<BillModel?> streamOpenBill(String customerId) {
    return _db
        .collection('bills')
        .where('customerId', isEqualTo: customerId)
        .where('status', isEqualTo: 'open')
        .limit(1)
        .snapshots()
        .map((snapshot) {
          if (snapshot.docs.isEmpty) return null;
          return BillModel.fromFirestore(
            snapshot.docs.first.id,
            snapshot.docs.first.data(),
          );
        });
  }

  Future<void> createBill(String customerId) {
    return _db.collection('bills').add({
      'customerId': customerId,
      'status': 'open',
      'createdAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  Future<void> finalizeBill(String billId) {
    return _db.collection('bills').doc(billId).update({
      'status': 'finalized',
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  // --- Items ---
  Stream<List<BillItemModel>> streamBillItems(String billId) {
    return _db
        .collection('bills')
        .doc(billId)
        .collection('items')
        .snapshots()
        .map((snapshot) {
          return snapshot.docs.map((doc) {
            return BillItemModel.fromFirestore(doc.id, doc.data());
          }).toList();
        });
  }

  Future<void> addBillItem(
    String billId,
    String name,
    double price,
    int quantity,
  ) {
    return _db.collection('bills').doc(billId).collection('items').add({
      'name': name,
      'price': price,
      'quantity': quantity,
      'isActive': true,
      'createdAt': FieldValue.serverTimestamp(),
    });
  }

  // --- Payments ---
  Stream<List<PaymentModel>> streamBillPayments(String billId) {
    return _db
        .collection('bills')
        .doc(billId)
        .collection('payments')
        .snapshots()
        .map((snapshot) {
          return snapshot.docs.map((doc) {
            return PaymentModel.fromFirestore(doc.id, doc.data());
          }).toList();
        });
  }

  Future<void> addBillPayment(String billId, double amount) {
    return _db.collection('bills').doc(billId).collection('payments').add({
      'amount': amount,
      'createdAt': FieldValue.serverTimestamp(),
    });
  }
}
