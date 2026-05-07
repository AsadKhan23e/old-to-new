import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';

class PersistenceService {
  Database? _db;
  bool _isInitialized = false;
  final Map<String, String> _webStore = {}; // Memory fallback for Web

  Future<void> init() async {
    if (_isInitialized) return;
    if (kIsWeb) {
      _isInitialized = true;
      return;
    }

    try {
      final dbPath = await getDatabasesPath();
      final path = join(dbPath, 'shopbook_offline.db');

      _db = await openDatabase(
        path,
        version: 1,
        onCreate: (db, version) async {
          await db.execute('''
            CREATE TABLE local_store (
              key TEXT PRIMARY KEY,
              value TEXT,
              synced INTEGER DEFAULT 1,
              updated_at INTEGER
            )
          ''');
        },
      );
      _isInitialized = true;
    } catch (e) {
      debugPrint('DB Init Error: $e');
    }
  }

  Future<void> save(
    String key,
    Map<String, dynamic> data, {
    bool markUnsynced = true,
  }) async {
    await init();
    final value = jsonEncode(data);

    if (kIsWeb || _db == null) {
      _webStore[key] = value;
      return;
    }

    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final synced = markUnsynced ? 0 : 1;

    try {
      await _db!.insert('local_store', {
        'key': key,
        'value': value,
        'synced': synced,
        'updated_at': timestamp,
      }, conflictAlgorithm: ConflictAlgorithm.replace);
    } catch (e) {
      debugPrint('Save Error: $e');
    }
  }

  Future<Map<String, dynamic>?> load(String key) async {
    await init();
    if (kIsWeb || _db == null) {
      return _webStore.containsKey(key) ? jsonDecode(_webStore[key]!) : null;
    }

    try {
      final List<Map<String, dynamic>> res = await _db!.query(
        'local_store',
        where: 'key = ?',
        whereArgs: [key],
      );

      if (res.isNotEmpty) {
        return jsonDecode(res.first['value'] as String) as Map<String, dynamic>;
      }
    } catch (e) {
      debugPrint('Load Error: $e');
    }
    return null;
  }

  Future<List<String>> getUnsyncedKeys() async {
    await init();
    if (kIsWeb || _db == null) return [];

    try {
      final List<Map<String, dynamic>> res = await _db!.query(
        'local_store',
        where: 'synced = 0',
      );
      return res.map((v) => v['key'] as String).toList();
    } catch (e) {
      return [];
    }
  }

  Future<void> setSynced(String key) async {
    await init();
    if (kIsWeb || _db == null) return;

    try {
      await _db!.update(
        'local_store',
        {'synced': 1},
        where: 'key = ?',
        whereArgs: [key],
      );
    } catch (e) {
      debugPrint('Sync Flag Error: $e');
    }
  }
}
