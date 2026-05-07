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
      if (docSnap.exists && docSnap.data() != null) {
        final data = AppData.fromMap(docSnap.data()!);
        state = AsyncData(data);
        await _persistence.save(email, data.toMap());
      }
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
      await _db
          .collection('users')
          .doc(email)
          .set(data.toMap(), SetOptions(merge: true));
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
