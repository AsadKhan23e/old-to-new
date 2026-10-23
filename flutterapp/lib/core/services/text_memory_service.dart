import 'package:shared_preferences/shared_preferences.dart';

class TextMemoryService {
  static late SharedPreferences _prefs;

  static Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
  }

  static Future<void> save(String key, String value) async {
    await _prefs.setString(key, value);
  }

  static String? load(String key) {
    return _prefs.getString(key);
  }

  static Future<void> clear(String key) async {
    await _prefs.remove(key);
  }
}
