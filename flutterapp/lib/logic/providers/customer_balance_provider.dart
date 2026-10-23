import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'customer_provider.dart';
import 'bill_provider.dart';
import 'payment_provider.dart';

final customerTotalSalesProvider = Provider.family<AsyncValue<double>, String>((
  ref,
  customerId,
) {
  final billsAsync = ref.watch(customerBillsProvider(customerId));

  return billsAsync.when(
    data: (bills) {
      double totalSales = 0.0;
      bool isLoading = false;

      for (var bill in bills) {
        final totalAsync = ref.watch(billTotalProvider(bill.id));
        if (totalAsync.value != null) {
          totalSales += totalAsync.value!;
        } else {
          isLoading = true;
        }
      }

      if (isLoading) return const AsyncValue.loading();
      return AsyncValue.data(totalSales);
    },
    loading: () => const AsyncValue.loading(),
    error: (e, stack) => AsyncValue.error(e, stack),
  );
});

final customerTotalPaidProvider = Provider.family<AsyncValue<double>, String>((
  ref,
  customerId,
) {
  final billsAsync = ref.watch(customerBillsProvider(customerId));

  return billsAsync.when(
    data: (bills) {
      double totalPaid = 0.0;
      bool isLoading = false;

      for (var bill in bills) {
        final paidAsync = ref.watch(billPaidProvider(bill.id));
        if (paidAsync.value != null) {
          totalPaid += paidAsync.value!;
        } else {
          isLoading = true;
        }
      }

      if (isLoading) return const AsyncValue.loading();
      return AsyncValue.data(totalPaid);
    },
    loading: () => const AsyncValue.loading(),
    error: (e, stack) => AsyncValue.error(e, stack),
  );
});

final customerBalanceProvider = Provider.family<AsyncValue<double>, String>((
  ref,
  customerId,
) {
  final sales = ref.watch(customerTotalSalesProvider(customerId));
  final paid = ref.watch(customerTotalPaidProvider(customerId));

  if (sales.hasValue && paid.hasValue) {
    return AsyncValue.data(sales.value! - paid.value!);
  }
  return const AsyncValue.loading();
});
