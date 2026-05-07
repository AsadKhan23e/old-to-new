import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'logic/providers/auth_provider.dart';
import 'ui/screens/main_navigation_screen.dart';
import 'ui/screens/login_screen.dart';
import 'core/services/text_memory_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  try {
    await Firebase.initializeApp(
      options: const FirebaseOptions(
        apiKey: "AIzaSyDHd7AjnsZbbb6IBz7kZOITx0fYjlsj8UY",
        appId: "1:367068109515:android:620c34816020626cdad94e",
        messagingSenderId: "367068109515",
        projectId: "myshopbook1",
        storageBucket: "myshopbook1.firebasestorage.app",
      ),
    );

    FirebaseFirestore.instance.settings = const Settings(
      persistenceEnabled: true,
      cacheSizeBytes: Settings.CACHE_SIZE_UNLIMITED,
    );
  } catch (e) {
    // Firebase initialization is handled gracefully.
  }

  await TextMemoryService.init();

  runApp(const ProviderScope(child: ShopBookApp()));
}

class ShopBookApp extends ConsumerWidget {
  const ShopBookApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    const primaryColor = Color(0xFF8C6A4F);

    return MaterialApp(
      title: 'ShopBook AI',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFFFAF8F3), // Web app body bg
        colorScheme: ColorScheme.fromSeed(
          seedColor: primaryColor,
          primary: primaryColor,
          secondary: const Color(0xFF6B7A50),
          surface: Colors.white,
          onSurface: const Color(0xFF2F2F2F),
        ),
        textTheme: GoogleFonts.outfitTextTheme(Theme.of(context).textTheme)
            .copyWith(
              displayLarge: const TextStyle(fontFamily: 'serif'),
              displayMedium: const TextStyle(fontFamily: 'serif'),
              bodyLarge: const TextStyle(fontFamily: 'serif'),
              bodyMedium: const TextStyle(fontFamily: 'serif'),
            ),
        appBarTheme: AppBarTheme(
          centerTitle: true,
          elevation: 0,
          backgroundColor: const Color(0xFFFAF8F3),
          surfaceTintColor: Colors.transparent,
          titleTextStyle: GoogleFonts.outfit(
            color: const Color(0xFF2F2F2F),
            fontSize: 20,
            fontWeight: FontWeight.bold,
          ),
          iconTheme: const IconThemeData(color: Color(0xFF2F2F2F)),
        ),
        cardTheme: CardThemeData(
          elevation: 0, // Shadcn cards are usually flat with a border
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: const BorderSide(color: Color(0xFFCFCAC0)),
          ),
          color: Colors.white,
          margin: const EdgeInsets.symmetric(vertical: 6, horizontal: 0),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            elevation: 0,
            backgroundColor: primaryColor,
            foregroundColor: Colors.white,
            minimumSize: const Size(88, 44),
            padding: const EdgeInsets.symmetric(horizontal: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
            textStyle: const TextStyle(
              fontWeight: FontWeight.w600,
              fontSize: 14,
            ),
          ),
        ),
        textButtonTheme: TextButtonThemeData(
          style: TextButton.styleFrom(
            foregroundColor: primaryColor,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
            textStyle: const TextStyle(
              fontWeight: FontWeight.w600,
              fontSize: 14,
            ),
          ),
        ),
        floatingActionButtonTheme: const FloatingActionButtonThemeData(
          elevation: 2,
          backgroundColor: primaryColor,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(12)),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 14,
          ),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: Color(0xFFCFCAC0)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: Color(0xFFCFCAC0)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: primaryColor, width: 2),
          ),
          labelStyle: const TextStyle(color: Colors.black54),
        ),
        dialogTheme: DialogThemeData(
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: const BorderSide(color: Color(0xFFCFCAC0)),
          ),
          backgroundColor: Colors.white,
        ),
      ),
      home: const AuthWrapper(),
    );
  }
}

class AuthWrapper extends ConsumerWidget {
  const AuthWrapper({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);

    return authState.when(
      data: (user) {
        if (user != null && user.emailVerified) {
          return const MainNavigationScreen();
        }
        return const LoginScreen();
      },
      loading: () =>
          const Scaffold(body: Center(child: CircularProgressIndicator())),
      error: (e, stack) => Scaffold(body: Center(child: Text("Error: $e"))),
    );
  }
}
