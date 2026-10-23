import 'package:flutter/foundation.dart';

import '../models/app_models.dart';
import '../services/firebase_service.dart';
import '../services/persistence_service.dart';
import '../services/auth_service.dart';

class AppProvider with ChangeNotifier {
  final FirebaseService _firebase = FirebaseService();
  final PersistenceService _persistence = PersistenceService();
  final AuthService _auth = AuthService();

  AppData? _appData;
  bool _isLoading = true;

  AppData? get appData => _appData;
  bool get isLoading => _isLoading;

  AppProvider() {
    _init();
  }

  Future<void> _init() async {
    _auth.authStateChanges.listen((user) async {
      if (user != null) {
        await initializeData(user.email!);
      } else {
        _appData = null;
        _isLoading = false;
        notifyListeners();
      }
    });
  }

  Future<void> initializeData(String email) async {
    _isLoading = true;
    notifyListeners();

    // 1. FAST LOAD from local storage
    final localMap = await _persistence.load(email);
    if (localMap != null) {
      _appData = AppData.fromMap(localMap);
      _isLoading = false;
      notifyListeners();
    }

    // 2. FETCH from Firestore (background)
    final serverData = await _firebase.fetchUserData(email);
    if (serverData != null) {
      _appData = serverData;
      await _persistence.save(email, serverData.toMap(), markUnsynced: false);
      _isLoading = false;
      notifyListeners();
    } else if (_appData == null) {
      // Create default data if first time
      _appData = AppData(
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
              BillDesignContact(
                id: '1',
                label: 'Office',
                phone: '000-000-0000',
              ),
            ],
            address: 'Main Street, Business District',
            logo: '',
            template: 'classic',
            footer: 'Account Managed by CashbookPro',
          ),
        ),
      );
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> saveData() async {
    if (_appData == null || _auth.currentUser == null) return;
    await _firebase.saveUserData(_auth.currentUser!.email!, _appData!);
    notifyListeners();
  }

  // --- Actions ---

  void addCustomer(Customer customer) {
    if (_appData == null) return;
    _appData!.customers.add(customer);
    saveData();
  }

  void updateCustomer(Customer customer) {
    if (_appData == null) return;
    final index = _appData!.customers.indexWhere((c) => c.id == customer.id);
    if (index != -1) {
      _appData!.customers[index] = customer;
      saveData();
    }
  }

  void deleteCustomer(String id) {
    if (_appData == null) return;
    _appData!.customers.removeWhere((c) => c.id == id);
    saveData();
  }

  // --- Transactions ---
  void addTransaction(Transaction tx) {
    if (_appData == null) return;
    _appData!.transactions.insert(0, tx); // Newest first
    saveData();
  }

  void updateTransaction(Transaction tx) {
    if (_appData == null) return;
    final index = _appData!.transactions.indexWhere((t) => t.id == tx.id);
    if (index != -1) {
      _appData!.transactions[index] = tx;
      saveData();
    }
  }

  // --- Items ---
  void addItem(Item item) {
    if (_appData == null) return;
    _appData!.items.add(item);
    saveData();
  }

  void updateItem(Item item) {
    if (_appData == null) return;
    final index = _appData!.items.indexWhere((i) => i.id == item.id);
    if (index != -1) {
      _appData!.items[index] = item;
      saveData();
    }
  }

  // --- Data Calculations (Exact Logic from Web App) ---

  double get totalJama {
    if (_appData == null) return 0;
    double jama = 0;
    final customerIds = _appData!.customers
        .where((c) => !c.isSupplier)
        .map((c) => c.id)
        .toList();

    for (var tx in _appData!.transactions) {
      if (customerIds.contains(tx.customerId)) {
        jama += tx.amountPaid;
        if (tx.additionalPayments != null) {
          jama += tx.additionalPayments!.fold(0, (sum, p) => sum + p.amount);
        }
        if (tx.type == 'debit') {
          jama += tx.totalAmount;
        }
      }
    }
    return jama;
  }

  double get totalUdhar {
    if (_appData == null) return 0;
    double udhar = 0;
    final customers = _appData!.customers.where((c) => !c.isSupplier).toList();

    for (var customer in customers) {
      final customerTxs = _appData!.transactions.where(
        (t) => t.customerId == customer.id,
      );
      double custSales = 0;
      double custPaid = 0;

      for (var tx in customerTxs) {
        if (tx.type != 'debit') {
          custSales += tx.totalAmount;
          if (tx.billAdjustments != null) {
            for (var adj in tx.billAdjustments!) {
              custSales += adj.difference;
            }
          }
        }

        custPaid += tx.amountPaid;
        if (tx.additionalPayments != null) {
          custPaid += tx.additionalPayments!.fold(
            0,
            (sum, p) => sum + p.amount,
          );
        }
        if (tx.type == 'debit') {
          custPaid += tx.totalAmount;
        }
      }

      final balance = custSales - custPaid;
      if (balance > 0) udhar += balance;
    }
    return udhar;
  }

  // --- Settings ---
  void setLanguage(String lang) {
    if (_appData == null) return;
    final newSettings = AppSettings(
      language: lang,
      viewMode: _appData!.settings.viewMode,
      theme: _appData!.settings.theme,
      billDesign: _appData!.settings.billDesign,
    );
    _updateSettings(newSettings);
  }

  void setViewMode(String mode) {
    if (_appData == null) return;
    final newSettings = AppSettings(
      language: _appData!.settings.language,
      viewMode: mode,
      theme: _appData!.settings.theme,
      billDesign: _appData!.settings.billDesign,
    );
    _updateSettings(newSettings);
  }

  void setTheme(String theme) {
    if (_appData == null) return;
    final newSettings = AppSettings(
      language: _appData!.settings.language,
      viewMode: _appData!.settings.viewMode,
      theme: theme,
      billDesign: _appData!.settings.billDesign,
    );
    _updateSettings(newSettings);
  }

  void updateBillDesign(BillDesignSettings design) {
    if (_appData == null) return;
    final newSettings = AppSettings(
      language: _appData!.settings.language,
      viewMode: _appData!.settings.viewMode,
      theme: _appData!.settings.theme,
      billDesign: design,
    );
    _updateSettings(newSettings);
  }

  void togglePremium() {
    // In a real app, this would check a subscription.
    // For now, we assume settings might track premium if needed,
    // or it's a global state. The web app uses a helper getIsPremium().
    // We'll just notify listeners to refresh components if we add an isPremium field.
    notifyListeners();
  }

  void _updateSettings(AppSettings settings) {
    if (_appData == null) return;
    final newData = AppData(
      customers: _appData!.customers,
      items: _appData!.items,
      transactions: _appData!.transactions,
      reminders: _appData!.reminders,
      settings: settings,
    );
    _appData = newData;
    saveData();
  }
}
