import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../models/app_models.dart';
import '../../core/services/persistence_service.dart';
import 'package:cloud_firestore/cloud_firestore.dart' hide Transaction;
import 'auth_provider.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

final persistenceServiceProvider = Provider((ref) => PersistenceService());

class AppDataNotifier extends AsyncNotifier<AppData> {
  final FirebaseFirestore _db = FirebaseFirestore.instance;
  late PersistenceService _persistence;

  @override
  FutureOr<AppData> build() async {
    _persistence = ref.watch(persistenceServiceProvider);
    final user = ref.watch(authServiceProvider).currentUser;

    if (user == null || user.email == null) {
      throw 'User not authenticated';
    }

    final email = user.email!;
    final localDataMap = await _persistence.load(email);
    AppData currentData = localDataMap != null
        ? AppData.fromMap(localDataMap)
        : _getDefaultAppData();

    _fetchFromFirestore(email);
    _setupSyncEngine(email);

    return currentData;
  }

  AppData _getDefaultAppData() {
    return AppData(
      customers: [],
      items: [],
      transactions: [],
      reminders: [],
      settings: AppSettings(
        language: 'en',
        viewMode: 'user',
        theme: 'system',
        billDesign: BillDesignSettings(
          shopName: 'Your Ledger Shop',
          contacts: [
            BillDesignContact(id: '1', label: 'Office', phone: '000-000-0000'),
          ],
          address: 'Main Street, Business District',
          logo: '',
          template: 'classic',
          footer: 'Account Managed by CashbookPro',
        ),
      ),
    );
  }

  Future<void> _fetchFromFirestore(String email) async {
    try {
      final docSnap = await _db.collection('users').doc(email).get();
      if (!docSnap.exists) {
        // Create new user doc
        await _db.collection('users').doc(email).set({
          'email': email,
          'createdAt': DateTime.now().toIso8601String(),
          'isPremium': false,
        });
        return;
      }

      final firestoreData = docSnap.data()!;

      // Load sub-collections
      final results = await Future.wait([
        _db.collection('users').doc(email).collection('customers').get(),
        _db.collection('users').doc(email).collection('items').get(),
        _db.collection('users').doc(email).collection('transactions').get(),
        _db.collection('users').doc(email).collection('reminders').get(),
      ]);

      final customers = results[0].docs
          .map((d) => Customer.fromMap(d.data()))
          .toList();
      final items = results[1].docs.map((d) => Item.fromMap(d.data())).toList();
      final transactions = results[2].docs
          .map((d) => Transaction.fromMap(d.data()))
          .toList();
      final reminders = results[3].docs
          .map((d) => Reminder.fromMap(d.data()))
          .toList();

      final settings = AppSettings.fromMap(firestoreData['settings'] ?? {});

      final data = AppData(
        customers: customers,
        items: items,
        transactions: transactions,
        reminders: reminders,
        settings: settings,
      );

      state = AsyncData(data);
      await _persistence.save(email, data.toMap(), markUnsynced: false);
    } catch (e) {
      debugPrint('AppDataNotifier: Fetch Error: $e');
    }
  }

  Future<void> saveData(AppData data) async {
    final email = ref.read(authServiceProvider).currentUser?.email;
    if (email == null) return;

    state = AsyncData(data);
    await _persistence.save(email, data.toMap());
    _syncToFirestore(email, data);
  }

  Future<void> _syncToFirestore(String email, AppData data) async {
    final connectivity = await Connectivity().checkConnectivity();
    if (connectivity.contains(ConnectivityResult.none)) return;

    try {
      final batch = _db.batch();
      final userRef = _db.collection('users').doc(email);

      // 1. Sync Settings to Root Doc
      batch.set(userRef, {
        'settings': data.settings.toMap(),
      }, SetOptions(merge: true));

      // 2. Sync Collections (Limiting to most recent/important to stay within batch limits if needed,
      // but usually batches handle up to 500 operations).

      // For a truly scalable solution, we should only sync changed items.
      // For now, mirroring the "triggerFirestoreSync" logic with batches.

      for (var c in data.customers) {
        batch.set(
          userRef.collection('customers').doc(c.id),
          c.toMap(),
          SetOptions(merge: true),
        );
      }
      for (var i in data.items) {
        batch.set(
          userRef.collection('items').doc(i.id),
          i.toMap(),
          SetOptions(merge: true),
        );
      }
      // Sync last 200 transactions to keep it fast similar to web
      final recentTxs = data.transactions.length > 200
          ? data.transactions.sublist(data.transactions.length - 200)
          : data.transactions;
      for (var t in recentTxs) {
        batch.set(
          userRef.collection('transactions').doc(t.id),
          t.toMap(),
          SetOptions(merge: true),
        );
      }
      for (var r in data.reminders) {
        batch.set(
          userRef.collection('reminders').doc(r.id),
          r.toMap(),
          SetOptions(merge: true),
        );
      }

      await batch.commit();
      await _persistence.setSynced(email);
    } catch (e) {
      debugPrint('AppDataNotifier: Sync Failed: $e');
    }
  }

  void _setupSyncEngine(String email) {
    Timer.periodic(const Duration(seconds: 45), (timer) async {
      final connectivity = await Connectivity().checkConnectivity();
      if (!connectivity.contains(ConnectivityResult.none)) {
        final unsynced = await _persistence.getUnsyncedKeys();
        if (unsynced.contains(email)) {
          final data = await _persistence.load(email);
          if (data != null) {
            await _syncToFirestore(email, AppData.fromMap(data));
          }
        }
      }
    });
  }

  // Helper methods to modify data
  void addCustomer(Customer customer) {
    final cur = state.value;
    if (cur == null) return;
    saveData(
      AppData(
        customers: [...cur.customers, customer],
        items: cur.items,
        transactions: cur.transactions,
        reminders: cur.reminders,
        settings: cur.settings,
      ),
    );
  }

  void updateCustomer(Customer customer) {
    final cur = state.value;
    if (cur == null) return;
    final index = cur.customers.indexWhere((c) => c.id == customer.id);
    if (index == -1) return;
    final list = [...cur.customers];
    list[index] = customer;
    saveData(
      AppData(
        customers: list,
        items: cur.items,
        transactions: cur.transactions,
        reminders: cur.reminders,
        settings: cur.settings,
      ),
    );
  }

  void deleteCustomer(String id) {
    final cur = state.value;
    if (cur == null) return;
    final list = cur.customers.where((c) => c.id != id).toList();
    saveData(
      AppData(
        customers: list,
        items: cur.items,
        transactions: cur.transactions,
        reminders: cur.reminders,
        settings: cur.settings,
      ),
    );
  }

  void addItem(Item item) {
    final cur = state.value;
    if (cur == null) return;
    saveData(
      AppData(
        customers: cur.customers,
        items: [...cur.items, item],
        transactions: cur.transactions,
        reminders: cur.reminders,
        settings: cur.settings,
      ),
    );
  }

  void updateItem(Item item) {
    final cur = state.value;
    if (cur == null) return;
    final index = cur.items.indexWhere((i) => i.id == item.id);
    if (index == -1) return;
    final list = [...cur.items];
    list[index] = item;
    saveData(
      AppData(
        customers: cur.customers,
        items: list,
        transactions: cur.transactions,
        reminders: cur.reminders,
        settings: cur.settings,
      ),
    );
  }

  void deleteItem(String id) {
    final cur = state.value;
    if (cur == null) return;
    final list = cur.items.where((i) => i.id != id).toList();
    saveData(
      AppData(
        customers: cur.customers,
        items: list,
        transactions: cur.transactions,
        reminders: cur.reminders,
        settings: cur.settings,
      ),
    );
  }

  void addTransaction(Transaction tx) {
    final cur = state.value;
    if (cur == null) return;
    saveData(
      AppData(
        customers: cur.customers,
        items: cur.items,
        transactions: [...cur.transactions, tx],
        reminders: cur.reminders,
        settings: cur.settings,
      ),
    );
  }

  void updateTransaction(Transaction tx) {
    final cur = state.value;
    if (cur == null) return;
    final index = cur.transactions.indexWhere((t) => t.id == tx.id);
    if (index == -1) return;
    final list = [...cur.transactions];
    list[index] = tx;
    saveData(
      AppData(
        customers: cur.customers,
        items: cur.items,
        transactions: list,
        reminders: cur.reminders,
        settings: cur.settings,
      ),
    );
  }

  void addReminder(Reminder reminder) {
    final cur = state.value;
    if (cur == null) return;
    saveData(
      AppData(
        customers: cur.customers,
        items: cur.items,
        transactions: cur.transactions,
        reminders: [...cur.reminders, reminder],
        settings: cur.settings,
      ),
    );
  }

  void updateReminder(Reminder reminder) {
    final cur = state.value;
    if (cur == null) return;
    final index = cur.reminders.indexWhere((r) => r.id == reminder.id);
    if (index == -1) return;
    final list = [...cur.reminders];
    list[index] = reminder;
    saveData(
      AppData(
        customers: cur.customers,
        items: cur.items,
        transactions: cur.transactions,
        reminders: list,
        settings: cur.settings,
      ),
    );
  }

  void deleteReminder(String id) {
    final cur = state.value;
    if (cur == null) return;
    final list = cur.reminders.where((r) => r.id != id).toList();
    saveData(
      AppData(
        customers: cur.customers,
        items: cur.items,
        transactions: cur.transactions,
        reminders: list,
        settings: cur.settings,
      ),
    );
  }

  void addBillPayment(String txId, double amount, {String? notes}) {
    final cur = state.value;
    if (cur == null) return;
    final index = cur.transactions.indexWhere((t) => t.id == txId);
    if (index == -1) return;

    final tx = cur.transactions[index];
    final newPayment = Payment(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      amount: amount,
      date: DateTime.now().toIso8601String(),
      notes: notes,
    );

    final updatedPayments = List<Payment>.from([
      ...(tx.additionalPayments ?? []),
      newPayment,
    ]);
    final totalPaidSoFar =
        tx.amountPaid + updatedPayments.fold(0.0, (acc, p) => acc + p.amount);
    final newRemaining =
        (tx.type == 'credit' || (tx.items != null && tx.items!.isNotEmpty))
        ? (tx.totalAmount + (tx.previousBalance ?? 0)) - totalPaidSoFar
        : tx.remainingBalance - amount;

    final updatedTx = Transaction(
      id: tx.id,
      customerId: tx.customerId,
      customerName: tx.customerName,
      items: tx.items,
      totalAmount: tx.totalAmount,
      amountPaid: tx.amountPaid,
      type: tx.type,
      date: tx.date,
      modifiedAt: DateTime.now().toIso8601String(),
      notes: tx.notes,
      remainingBalance: newRemaining,
      previousBalance: tx.previousBalance,
      grandTotal: tx.grandTotal,
      additionalPayments: updatedPayments,
      paid: newRemaining <= 0,
      status: newRemaining <= 0 ? 'closed' : tx.status,
      isEdited: true,
      billNumber: tx.billNumber,
      image: tx.image,
      billAdjustments: tx.billAdjustments,
    );

    final txList = [...cur.transactions];
    txList[index] = updatedTx;

    saveData(
      AppData(
        customers: cur.customers,
        items: cur.items,
        transactions: txList,
        reminders: cur.reminders,
        settings: cur.settings,
      ),
    );
  }

  void deleteTransaction(Transaction tx) {
    final cur = state.value;
    if (cur == null) return;

    // 1. Restore Stock (if sale)
    final updatedItems = [...cur.items];
    if (tx.items != null && tx.items!.isNotEmpty) {
      for (var ci in tx.items!) {
        final idx = updatedItems.indexWhere((i) => i.id == ci.itemId);
        if (idx != -1) {
          final inv = updatedItems[idx];
          updatedItems[idx] = Item(
            id: inv.id,
            itemName: inv.itemName,
            quantity: inv.quantity + ci.quantity,
            purchasePrice: inv.purchasePrice,
            sellingPrice: inv.sellingPrice,
            createdAt: inv.createdAt,
            notes: inv.notes,
            picture: inv.picture,
            supplierName: inv.supplierName,
            supplierPhone: inv.supplierPhone,
            modifiedAt: DateTime.now().toIso8601String(),
          );
        }
      }
    }

    // 2. Remove Tx
    final remainingTxs = cur.transactions.where((t) => t.id != tx.id).toList();

    // 3. Recalculate subsequent balances for this customer
    final customerTxs = remainingTxs
        .where((t) => t.customerId == tx.customerId)
        .toList();
    customerTxs.sort((a, b) => a.date.compareTo(b.date)); // Chronological order

    double runningBalance = 0;
    final Map<String, Transaction> recalculatedMap = {};

    for (var t in customerTxs) {
      final billAmount =
          (t.type == 'credit' || (t.items != null && t.items!.isNotEmpty))
          ? t.totalAmount
          : 0.0;
      final debitAmount = (t.type == 'debit') ? t.totalAmount : 0.0;
      final paymentAmount =
          t.amountPaid +
          (t.additionalPayments?.fold(0.0, (acc, p) => acc! + p.amount) ?? 0.0);

      final double prevBal = runningBalance;
      runningBalance = (prevBal + billAmount) - (debitAmount + paymentAmount);

      recalculatedMap[t.id] = Transaction(
        id: t.id,
        customerId: t.customerId,
        customerName: t.customerName,
        items: t.items,
        totalAmount: t.totalAmount,
        amountPaid: t.amountPaid,
        type: t.type,
        date: t.date,
        modifiedAt: t.modifiedAt,
        notes: t.notes,
        remainingBalance: runningBalance,
        previousBalance: prevBal,
        grandTotal: prevBal + billAmount,
        additionalPayments: t.additionalPayments,
        paid: runningBalance <= 0,
        status: t.status,
        isEdited: t.isEdited,
        billNumber: t.billNumber,
        image: t.image,
        billAdjustments: t.billAdjustments,
      );
    }

    final finalTxs = remainingTxs
        .map((t) => recalculatedMap[t.id] ?? t)
        .toList();

    saveData(
      AppData(
        customers: cur.customers,
        items: updatedItems,
        transactions: finalTxs,
        reminders: cur.reminders,
        settings: cur.settings,
      ),
    );
  }

  void updateSettings(AppSettings settings) {
    final cur = state.value;
    if (cur == null) return;
    saveData(
      AppData(
        customers: cur.customers,
        items: cur.items,
        transactions: cur.transactions,
        reminders: cur.reminders,
        settings: settings,
      ),
    );
  }
}

final appDataProvider = AsyncNotifierProvider<AppDataNotifier, AppData>(() {
  return AppDataNotifier();
});
