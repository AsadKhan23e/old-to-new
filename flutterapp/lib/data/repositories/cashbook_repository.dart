import '../../core/services/firestore_service.dart';
import '../models/customer_model.dart';
import '../models/bill_model.dart';
import '../models/item_model.dart';
import '../models/payment_model.dart';

class CashbookRepository {
  final FirestoreService _service = FirestoreService();

  Stream<List<CustomerModel>> getCustomers() => _service.streamCustomers();

  Stream<List<BillModel>> getBills(String customerId) =>
      _service.streamBillsForCustomer(customerId);

  Stream<List<BillItemModel>> getItems(String billId) =>
      _service.streamBillItems(billId);

  Stream<List<PaymentModel>> getPayments(String billId) =>
      _service.streamBillPayments(billId);

  // --- Aggregate Logic (Derived) ---

  // Since Riverpod isn't installed, we'll expose the raw streams and
  // handle the complex aggregation logic in the Provider layer using
  // StreamZip or multiple StreamBuilders/Providers.
}
