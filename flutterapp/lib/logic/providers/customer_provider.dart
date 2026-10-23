import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/services/firestore_service.dart';
import '../../data/models/customer_model.dart';
import '../../data/models/bill_model.dart';

final firestoreServiceProvider = Provider((ref) => FirestoreService());

// --- Core Streams ---
final customersProvider = StreamProvider<List<CustomerModel>>((ref) {
  return ref.watch(firestoreServiceProvider).streamCustomers();
});

final customerBillsProvider = StreamProvider.family<List<BillModel>, String>((
  ref,
  customerId,
) {
  return ref.watch(firestoreServiceProvider).streamBillsForCustomer(customerId);
});

final openBillProvider = StreamProvider.family<BillModel?, String>((
  ref,
  customerId,
) {
  return ref.watch(firestoreServiceProvider).streamOpenBill(customerId);
});

// --- Derived Calculation Providers ---
