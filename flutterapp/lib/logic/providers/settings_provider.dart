import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/services/firestore_service.dart';
import '../../data/models/settings_model.dart';
import 'auth_provider.dart';

final settingsServiceProvider = Provider((ref) => FirestoreService());

final billDesignSettingsProvider = StreamProvider<BillDesignSettings>((ref) {
  final user = ref.watch(authServiceProvider).currentUser;
  if (user == null || user.email == null) {
    return Stream.value(BillDesignSettings.defaultSettings);
  }
  return ref.watch(settingsServiceProvider).streamSettings(user.email!);
});
