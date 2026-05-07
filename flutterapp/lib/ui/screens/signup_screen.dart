import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../logic/providers/auth_provider.dart';
import '../../core/services/text_memory_service.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';

class SignupScreen extends ConsumerStatefulWidget {
  const SignupScreen({super.key});

  @override
  ConsumerState<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends ConsumerState<SignupScreen> {
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  @override
  void initState() {
    super.initState();
    _nameController.text = TextMemoryService.load('signup_name') ?? '';
    _emailController.text = TextMemoryService.load('signup_email') ?? '';
  }

  File? _image;
  bool _isLoading = false;

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: ImageSource.gallery);
    if (pickedFile != null) {
      setState(() => _image = File(pickedFile.path));
    }
  }

  void _signup() async {
    final name = _nameController.text.trim();
    final email = _emailController.text.trim();
    final password = _passwordController.text.trim();
    final confirm = _confirmPasswordController.text.trim();

    if (name.isEmpty || email.isEmpty || password.isEmpty || confirm.isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('All fields are required')));
      return;
    }

    if (password != confirm) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Passwords do not match')));
      return;
    }

    setState(() => _isLoading = true);
    final auth = ref.read(authServiceProvider);
    TextMemoryService.save('signup_name', name);
    TextMemoryService.save('signup_email', email);
    final result = await auth.signUp(email, password, name);

    if (!mounted) return;
    setState(() => _isLoading = false);

    if (result != null && result.startsWith("SUCCESS:")) {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => AlertDialog(
          title: const Text(
            'Registration Complete',
            style: TextStyle(),
          ),
          content: const Text(
            'Aapke email address par verification link bhej di gai hai. Agar inbox me nahi to spam folder check karein.\n\nVerify karne ke baad hi login mumkin hai.',
            style: TextStyle(height: 1.5),
          ),
          actions: [
            ElevatedButton(
              onPressed: () {
                Navigator.pop(context); // Close dialog
                Navigator.pop(context); // Go back to Login screen
              },
              child: const Text('LOGIN PAR JAYEIN'),
            ),
          ],
        ),
      );
    } else {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(result ?? "Signup failed")));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFAF8F3),
      appBar: AppBar(backgroundColor: Colors.transparent, elevation: 0),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Container(
            constraints: const BoxConstraints(maxWidth: 400),
            child: Column(
              children: [
                const Text(
                  'Create Account',
                  style: TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                    
                  ),
                ),
                const Text(
                  'Begin your journey with ShopBook',
                  style: TextStyle(color: Colors.grey),
                ),
                const SizedBox(height: 32),
                _imageSection(),
                const SizedBox(height: 24),
                _buildField(_nameController, 'Full Name', Icons.person_outline),
                const SizedBox(height: 16),
                _buildField(
                  _emailController,
                  'Email Address',
                  Icons.email_outlined,
                ),
                const SizedBox(height: 16),
                _buildField(
                  _passwordController,
                  'Password',
                  Icons.lock_outline,
                  isPass: true,
                ),
                const SizedBox(height: 16),
                _buildField(
                  _confirmPasswordController,
                  'Confirm Password',
                  Icons.lock_reset,
                  isPass: true,
                ),
                const SizedBox(height: 32),
                _isLoading
                    ? const CircularProgressIndicator(color: Color(0xFF8C6A4F))
                    : ElevatedButton(
                        onPressed: _signup,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF8C6A4F),
                          foregroundColor: Colors.white,
                          minimumSize: const Size(double.infinity, 50),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: const Text(
                          'SIGN UP',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                      ),
                const SizedBox(height: 16),
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text(
                    'Already have an account? Login',
                    style: TextStyle(color: Color(0xFF8C6A4F)),
                  ),
                ),
                const SizedBox(height: 32),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _imageSection() {
    return GestureDetector(
      onTap: _pickImage,
      child: Stack(
        children: [
          CircleAvatar(
            radius: 50,
            backgroundColor: const Color(0xFF8C6A4F).withAlpha(20),
            backgroundImage: _image != null ? FileImage(_image!) : null,
            child: _image == null
                ? const Icon(Icons.person, size: 50, color: Color(0xFF8C6A4F))
                : null,
          ),
          Positioned(
            bottom: 0,
            right: 0,
            child: Container(
              padding: const EdgeInsets.all(4),
              decoration: const BoxDecoration(
                color: Color(0xFF8C6A4F),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.camera_alt,
                color: Colors.white,
                size: 20,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildField(
    TextEditingController ctrl,
    String hint,
    IconData icon, {
    bool isPass = false,
  }) {
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
}
