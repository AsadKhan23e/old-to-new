import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/payment_model.dart';
import 'customer_provider.dart';

final billPaymentsProvider = StreamProvider.family<List<PaymentModel>, String>((
  ref,
  billId,
) {
  return ref.watch(firestoreServiceProvider).streamBillPayments(billId);
});

// Calculate Total Paid for a bill (Derived)
final billPaidProvider = Provider.family<AsyncValue<double>, String>((
  ref,
  billId,
) {
  final paymentsAsync = ref.watch(billPaymentsProvider(billId));

  return paymentsAsync.whenData((payments) {
    return payments.fold(0.0, (sum, p) => sum + p.amount);
  });
});
