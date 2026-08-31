import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'tokens.dart';

/// Backward-compatible AppColors bridge mapped directly to Design System v3 (tokens.dart `C`)
class AppColors {
  // ── Surfaces ──────────────────────────────────────────────
  static const Color bone = C.base;
  static const Color paper = C.surface;
  static const Color paperSunk = C.raised;
  static const Color rule = C.line;

  // Aliases for Material semantics
  static const Color background = C.base;
  static const Color surface = C.surface;
  static const Color surfaceElevated = C.raised;
  static const Color border = C.line;

  // ── Typography ────────────────────────────────────────────
  static const Color ink = C.text;
  static const Color graphite = C.textDim;
  static const Color ash = C.textMute;

  static const Color textPrimary = C.text;
  static const Color textSecondary = C.textDim;
  static const Color textMuted = C.textMute;

  // ── Accent / Signal (Energy Amber) ────────────────────────
  static const Color signal = C.amber;
  static const Color signalInk = C.onAmber;

  static const Color primary = C.amber;
  static const Color primaryLight = Color(0xFFF7BD6B);
  static const Color accentFlash = C.amber;

  // ── Semantic ──────────────────────────────────────────────
  static const Color gain = C.mint;
  static const Color warn = C.amber;
  static const Color loss = C.rose;
  static const Color marker = C.amberSoft;

  static const Color success = C.mint;
  static const Color warning = C.amber;
  static const Color secondary = C.mint;
  static const Color info = C.sky;
  static const Color admin = C.violet;
}

class AppTheme {
  static ThemeData get darkTheme {
    final baseTextTheme = ThemeData.dark().textTheme.apply(
      bodyColor: C.text,
      displayColor: C.text,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: C.base,
      primaryColor: C.amber,
      dividerColor: C.line,
      colorScheme: const ColorScheme.dark(
        primary: C.amber,
        secondary: C.mint,
        surface: C.surface,
        error: C.rose,
        onPrimary: C.onAmber,
        onSecondary: C.onMint,
        onSurface: C.text,
        onError: C.onRose,
      ),

      // ── Typography (Manrope default, Sora headings, JetBrains Mono numerics)
      textTheme: GoogleFonts.manropeTextTheme(baseTextTheme).copyWith(
        displayLarge: GoogleFonts.sora(fontSize: 32, fontWeight: FontWeight.bold, color: C.text, letterSpacing: -0.5),
        displayMedium: GoogleFonts.sora(fontSize: 28, fontWeight: FontWeight.bold, color: C.text, letterSpacing: -0.4),
        displaySmall: GoogleFonts.sora(fontSize: 24, fontWeight: FontWeight.bold, color: C.text, letterSpacing: -0.3),
        headlineMedium: GoogleFonts.sora(fontSize: 20, fontWeight: FontWeight.w700, color: C.text),
        headlineSmall: GoogleFonts.sora(fontSize: 18, fontWeight: FontWeight.w600, color: C.text),
        titleLarge: GoogleFonts.sora(fontSize: 16, fontWeight: FontWeight.w600, color: C.text),
        titleMedium: GoogleFonts.manrope(fontSize: 14, fontWeight: FontWeight.w600, color: C.text),
        titleSmall: GoogleFonts.manrope(fontSize: 12, fontWeight: FontWeight.w600, color: C.textDim),
        bodyLarge: GoogleFonts.manrope(fontSize: 14, fontWeight: FontWeight.w400, color: C.text),
        bodyMedium: GoogleFonts.manrope(fontSize: 13, fontWeight: FontWeight.w400, color: C.textDim),
        bodySmall: GoogleFonts.manrope(fontSize: 11, fontWeight: FontWeight.w400, color: C.textMute),
        labelLarge: GoogleFonts.jetBrainsMono(fontSize: 13, fontWeight: FontWeight.w700, fontFeatures: [const FontFeature.tabularFigures()]),
        labelMedium: GoogleFonts.jetBrainsMono(fontSize: 11, fontWeight: FontWeight.w600, fontFeatures: [const FontFeature.tabularFigures()]),
        labelSmall: GoogleFonts.jetBrainsMono(fontSize: 10, fontWeight: FontWeight.w500, fontFeatures: [const FontFeature.tabularFigures()]),
      ),

      // ── AppBar ──────────────────────────────────────────
      appBarTheme: AppBarTheme(
        backgroundColor: C.base,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
        iconTheme: const IconThemeData(color: C.text),
        titleTextStyle: GoogleFonts.sora(
          color: C.text,
          fontSize: 18,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.2,
        ),
      ),

      // ── Cards (Obsidian 10px rounded, 1px hairline border) ────
      cardTheme: CardThemeData(
        color: C.surface,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(C.radiusCard),
          side: const BorderSide(color: C.line, width: 1),
        ),
      ),

      // ── Inputs (10px rounded, C.raised fill, Sky focus border) ──
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: C.raised,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        hintStyle: GoogleFonts.manrope(color: C.textMute, fontSize: 13),
        labelStyle: GoogleFonts.manrope(color: C.textDim, fontSize: 13),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(C.radiusCard),
          borderSide: const BorderSide(color: C.line),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(C.radiusCard),
          borderSide: const BorderSide(color: C.line),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(C.radiusCard),
          borderSide: const BorderSide(color: C.sky, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(C.radiusCard),
          borderSide: const BorderSide(color: C.rose),
        ),
      ),

      // ── Buttons ─────────────────────────────────────────
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: C.amber,
          foregroundColor: C.onAmber,
          elevation: 0,
          minimumSize: const Size(0, 48),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(C.radiusCard),
          ),
          textStyle: GoogleFonts.manrope(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.3,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: C.text,
          side: const BorderSide(color: C.line),
          minimumSize: const Size(0, 48),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(C.radiusCard),
          ),
          textStyle: GoogleFonts.manrope(
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),

      // ── Bottom Sheet (20px rounded top) ─────────────────
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: C.overlay,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(C.radiusModal)),
          side: BorderSide(color: C.line, width: 1),
        ),
      ),

      // ── Bottom Navigation Bar ───────────────────────────
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: C.surface,
        selectedItemColor: C.amber,
        unselectedItemColor: C.textMute,
        selectedLabelStyle: GoogleFonts.manrope(fontSize: 11, fontWeight: FontWeight.w700),
        unselectedLabelStyle: GoogleFonts.manrope(fontSize: 11, fontWeight: FontWeight.w500),
        type: BottomNavigationBarType.fixed,
        elevation: 0,
      ),

      // ── Divider ─────────────────────────────────────────
      dividerTheme: const DividerThemeData(
        color: C.line,
        thickness: 1,
        space: 1,
      ),

      // ── Chips (999px StadiumBorder) ──────────────────────
      chipTheme: ChipThemeData(
        backgroundColor: C.raised,
        selectedColor: C.amber,
        labelStyle: GoogleFonts.manrope(
          color: C.text,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
        side: const BorderSide(color: C.line),
        shape: const StadiumBorder(),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      ),

      // ── Snackbar ────────────────────────────────────────
      snackBarTheme: SnackBarThemeData(
        backgroundColor: C.raised,
        contentTextStyle: GoogleFonts.manrope(
          color: C.text,
          fontSize: 13,
          fontWeight: FontWeight.w500,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(C.radiusCard),
          side: const BorderSide(color: C.line),
        ),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}
