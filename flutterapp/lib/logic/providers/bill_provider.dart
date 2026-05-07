import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/item_model.dart';
import 'customer_provider.dart';

final billItemsProvider = StreamProvider.family<List<BillItemModel>, String>((
  ref,
  billId,
) {
  return ref.watch(firestoreServiceProvider).streamBillItems(billId);
});

// Calculate Bill Total (Derived)
final billTotalProvider = Provider.family<AsyncValue<double>, String>((
  ref,
  billId,
) {
  final itemsAsync = ref.watch(billItemsProvider(billId));

  return itemsAsync.whenData((items) {
    return items
        .where((i) => i.isActive)
        .fold(0.0, (sum, i) => sum + (i.price * i.quantity));
  });
});
