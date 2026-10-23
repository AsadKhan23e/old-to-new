import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../logic/providers/auth_provider.dart';
import '../../core/services/text_memory_service.dart';
import 'signup_screen.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});
  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _emailController.text = TextMemoryService.load('last_login_email') ?? '';
  }

  void _login() async {
    setState(() => _isLoading = true);
    final auth = ref.read(authServiceProvider);
    final email = _emailController.text.trim();
    final password = _passwordController.text.trim();

    if (email.isEmpty || password.isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Please fill all fields')));
      setState(() => _isLoading = false);
      return;
    }

    TextMemoryService.save('last_login_email', email);
    final result = await auth.signIn(email, password);

    if (!mounted) return;
    setState(() => _isLoading = false);

    if (result == "SUCCESS") {
      // Home screen will be shown by auth state changes logic in main.dart
    } else if (result != null && result.startsWith("VERIFY:")) {
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text(
            'Email Verification Required',
            style: TextStyle(),
          ),
          content: const Text(
            'Aapke email address par verification link bhej di gai hai. Agar inbox me nahi to spam folder check karein.\n\nVerify karne ke baad hi login mumkin hai.',
            style: TextStyle(height: 1.5),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Theek Hai'),
            ),
          ],
        ),
      );
    } else {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(result ?? "Login failed")));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFAF8F3),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Container(
            constraints: const BoxConstraints(
              maxWidth: 400,
            ), // tablet/desktop responsiveness
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(
                  Icons.account_balance_wallet_outlined,
                  size: 80,
                  color: Color(0xFF8C6A4F),
                ),
                const SizedBox(height: 16),
                const Text(
                  'ShopBook AI',
                  style: TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                    
                  ),
                ),
                const Text(
                  'Login to your journal',
                  style: TextStyle(
                    color: Colors.grey,
                    fontStyle: FontStyle.italic,
                  ),
                ),
                const SizedBox(height: 48),
                _buildField(
                  _emailController,
                  'Email Address',
                  Icons.email_outlined,
                  false,
                ),
                const SizedBox(height: 16),
                _buildField(
                  _passwordController,
                  'Password',
                  Icons.lock_outline,
                  true,
                ),
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: _showForgotDialog,
                    child: const Text(
                      'Forgot Password?',
                      style: TextStyle(color: Color(0xFF8C6A4F)),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                _isLoading
                    ? const CircularProgressIndicator(color: Color(0xFF8C6A4F))
                    : ElevatedButton(
                        onPressed: _login,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF8C6A4F),
                          foregroundColor: Colors.white,
                          minimumSize: const Size(double.infinity, 50),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: const Text(
                          'LOGIN',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                      ),
                const SizedBox(height: 16),
                OutlinedButton.icon(
                  onPressed: () =>
                      ref.read(authServiceProvider).signInWithGoogle(),
                  icon: Image.network(
                    'https://upload.wikimedia.org/wikipedia/commons/4/4a/Logo_2013_Google.png',
                    height: 20,
                    errorBuilder: (c, e, s) =>
                        const Icon(Icons.g_mobiledata, color: Colors.blue),
                  ),
                  label: const Text('Sign in with Google'),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(double.infinity, 50),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
                const SizedBox(height: 32),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text("Don't have an account?"),
                    TextButton(
                      onPressed: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const SignupScreen(),
                        ),
                      ),
                      child: const Text(
                        'Signup',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF8C6A4F),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildField(
    TextEditingController ctrl,
    String hint,
    IconData icon,
    bool isPass,
  ) {
    return TextField(
      controller: ctrl,
      obscureText: isPass,
      decoration: InputDecoration(
        hintText: hint,
        prefixIcon: Icon(icon, color: Colors.grey),
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFCFCAC0)),
        ),
      ),
    );
  }

  void _showForgotDialog() {
    final resetCtrl = TextEditingController(text: _emailController.text);
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Reset Password'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Enter your registered email to receive reset link.'),
            const SizedBox(height: 16),
            TextField(
              controller: resetCtrl,
              decoration: const InputDecoration(
                labelText: 'Email Address',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              final scaffoldMessenger = ScaffoldMessenger.of(context);
              final navigator = Navigator.of(context);
              final res = await ref
                  .read(authServiceProvider)
                  .resetPassword(resetCtrl.text.trim());
              if (!mounted) return;
              navigator.pop();
              if (res == "SUCCESS") {
                scaffoldMessenger.showSnackBar(
                  const SnackBar(
                    content: Text(
                      'Password reset link aapke email par bhej di gai hai.',
                    ),
                    duration: Duration(seconds: 5),
                  ),
                );
              } else {
                scaffoldMessenger.showSnackBar(
                  SnackBar(content: Text(res ?? "Try again later")),
                );
              }
            },
            child: const Text('Send Link'),
          ),
        ],
      ),
    );
  }
}
