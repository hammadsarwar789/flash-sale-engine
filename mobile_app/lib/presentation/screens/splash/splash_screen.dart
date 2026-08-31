import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile_app/core/theme/tokens.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    Timer(const Duration(milliseconds: 800), () {
      if (mounted) {
        context.go('/home');
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: C.base,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Wordmark
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'FLASH',
                  style: GoogleFonts.sora(fontSize: 28, fontWeight: FontWeight.w800, color: C.text),
                ),
                const SizedBox(width: 6),
                Container(width: 8, height: 8, decoration: const BoxDecoration(color: C.amber, shape: BoxShape.circle)),
                const SizedBox(width: 6),
                Text(
                  'SALE',
                  style: GoogleFonts.sora(fontSize: 28, fontWeight: FontWeight.w400, color: C.textDim),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'HIGH VELOCITY TRADING FLOOR',
              style: GoogleFonts.jetBrainsMono(
                color: C.textMute,
                fontSize: 10,
                fontWeight: FontWeight.bold,
                letterSpacing: 1.5,
              ),
            ),
            const SizedBox(height: 48),
            const CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(C.amber),
            ),
          ],
        ),
      ),
    );
  }
}
