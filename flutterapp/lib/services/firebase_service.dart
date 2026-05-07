import 'package:cloud_firestore/cloud_firestore.dart';

import 'package:flutter/foundation.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../models/app_models.dart';
import 'persistence_service.dart';

class FirebaseService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final PersistenceService _persistence = PersistenceService();

  Future<AppData?> fetchUserData(String email) async {
    try {
      final docRef = _firestore.collection('users').doc(email);
      final docSnap = await docRef.get();
      if (docSnap.exists) {
        final data = docSnap.data() as Map<String, dynamic>;
        return AppData.fromMap(data);
      }
    } catch (e) {
      if (kDebugMode) {
        print("Error fetching from Firestore: $e");
      }
    }
    return null;
  }

  Future<void> saveUserData(
    String email,
    AppData data, {
    bool forceSync = false,
  }) async {
    // 1. SAVE TO LOCAL CACHE (IMMEDIATE)
    await _persistence.save(email, data.toMap());

    // 2. CHECK CONNECTIVITY & SYNC IF ONLINE
    final connectivityResult = await Connectivity().checkConnectivity();
    final isOnline = !connectivityResult.contains(ConnectivityResult.none);

    if (isOnline) {
      await syncToFirestore(email, data);
    }
  }

  Future<void> syncToFirestore(String email, AppData data) async {
    try {
      final docRef = _firestore.collection('users').doc(email);
      await docRef.set(data.toMap(), SetOptions(merge: true));
      await _persistence.setSynced(email);
    } catch (e) {
      if (kDebugMode) {
        print("Error syncing to Firestore: $e");
      }
    }
  }

  Future<void> syncAllPending() async {
    final connectivityResult = await Connectivity().checkConnectivity();
    if (connectivityResult.contains(ConnectivityResult.none)) return;

    final pendingKeys = await _persistence.getUnsyncedKeys();
    for (String email in pendingKeys) {
      final localData = await _persistence.load(email);
      if (localData != null) {
        await syncToFirestore(email, AppData.fromMap(localData));
      }
    }
  }
}
