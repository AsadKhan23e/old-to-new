import 'dart:convert';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import 'package:path_provider/path_provider.dart';

class PersistenceService {
  static Database? _database;

  Future<Database?> get database async {
    // Return null on Web because sqflite/path_provider isn't supported there by default
    if (kIsWeb) return null;

    if (_database != null) return _database!;
    _database = await _initDB();
    return _database;
  }

  Future<Database> _initDB() async {
    final documentsDirectory = await getApplicationDocumentsDirectory();
    final path = join(documentsDirectory.path, 'shopbook_offline_db.db');

    return await openDatabase(
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
  }

  Future<void> save(
    String key,
    Map<String, dynamic> data, {
    bool markUnsynced = true,
  }) async {
    final value = jsonEncode(data);
    final synced = markUnsynced ? 0 : 1;

    if (kIsWeb) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(key, value);
      await prefs.setInt('${key}_synced', synced);
    } else {
      final db = await database;
      if (db == null) return;
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      await db.insert('local_store', {
        'key': key,
        'value': value,
        'synced': synced,
        'updated_at': timestamp,
      }, conflictAlgorithm: ConflictAlgorithm.replace);
    }
  }

  Future<Map<String, dynamic>?> load(String key) async {
    if (kIsWeb) {
      final prefs = await SharedPreferences.getInstance();
      final value = prefs.getString(key);
      if (value != null) {
        return jsonDecode(value);
      }
      return null;
    } else {
      final db = await database;
      if (db == null) return null;
      final maps = await db.query(
        'local_store',
        where: 'key = ?',
        whereArgs: [key],
      );

      if (maps.isNotEmpty) {
        return jsonDecode(maps.first['value'] as String);
      }
      return null;
    }
  }

  Future<List<String>> getUnsyncedKeys() async {
    if (kIsWeb) return []; // Simplification for Web fallback

    final db = await database;
    if (db == null) return [];

    final maps = await db.query(
      'local_store',
      columns: ['key'],
      where: 'synced = 0',
    );

    return List.generate(maps.length, (i) => maps[i]['key'] as String);
  }

  Future<void> setSynced(String key) async {
    if (kIsWeb) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setInt('${key}_synced', 1);
    } else {
      final db = await database;
      if (db == null) return;

      await db.update(
        'local_store',
        {'synced': 1},
        where: 'key = ?',
        whereArgs: [key],
      );
    }
  }
}
