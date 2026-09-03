import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'tokens.dart';

/// Backward-compatible AppColors bridge mapped directly to Design System v3 (tokens.dart `C`)
class AppColors {
  // ── Surfaces ──────────────────────────────────────────────
  static Color get bone => C.base;
  static Color get paper => C.surface;
  static Color get paperSunk => C.raised;
  static Color get rule => C.line;

  // Aliases for Material semantics
  static Color get background => C.base;
  static Color get surface => C.surface;
  static Color get surfaceElevated => C.raised;
  static Color get border => C.line;

  // ── Typography ────────────────────────────────────────────
  static Color get ink => C.text;
  static Color get graphite => C.textDim;
  static Color get ash => C.textMute;

  static Color get textPrimary => C.text;
  static Color get textSecondary => C.textDim;
  static Color get textMuted => C.textMute;

  // ── Accent / Signal ───────────────────────────────────────
  static Color get signal => C.amber;
  static Color get signalInk => C.onAmber;

  static Color get primary => C.amber;
  static Color get primaryLight => C.amberSoft;
  static Color get accentFlash => C.amber;

  // ── Semantic ──────────────────────────────────────────────
  static Color get gain => C.mint;
  static Color get warn => C.amber;
  static Color get loss => C.rose;
  static Color get marker => C.amberSoft;

  static Color get success => C.mint;
  static Color get warning => C.amber;
  static Color get secondary => C.mint;
  static Color get info => C.sky;
  static Color get admin => C.violet;
}

class AppTheme {
  // ─────────────────────────────────────────────────────────────
  // 1. Day / Light Theme (Default)
  // ─────────────────────────────────────────────────────────────
  static ThemeData get lightTheme {
    final baseTextTheme = ThemeData.light().textTheme.apply(
      bodyColor: C.lightText,
      displayColor: C.lightText,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: C.lightBase,
      primaryColor: C.lightAmber,
      dividerColor: C.lightLine,
      colorScheme: const ColorScheme.light(
        primary: C.lightAmber,
        onPrimary: C.lightOnAmber,
        primaryContainer: C.lightAmberSoft,
        onPrimaryContainer: C.lightAmberPress,
        secondary: C.lightMint,
        onSecondary: C.lightOnMint,
        secondaryContainer: C.lightMintSoft,
        surface: C.lightSurface,
        onSurface: C.lightText,
        surfaceContainerHighest: C.lightRaised,
        outline: C.lightLine,
        outlineVariant: C.lightLineStrong,
        error: C.lightRose,
        onError: C.lightOnRose,
        errorContainer: C.lightRoseSoft,
        tertiary: C.lightSky,
        onTertiary: C.lightOnSky,
      ),

      // ── Typography ────
      textTheme: GoogleFonts.manropeTextTheme(baseTextTheme).copyWith(
        displayLarge: GoogleFonts.sora(fontSize: 32, fontWeight: FontWeight.bold, color: C.lightText, letterSpacing: -0.5),
        displayMedium: GoogleFonts.sora(fontSize: 28, fontWeight: FontWeight.bold, color: C.lightText, letterSpacing: -0.4),
        displaySmall: GoogleFonts.sora(fontSize: 24, fontWeight: FontWeight.bold, color: C.lightText, letterSpacing: -0.3),
        headlineMedium: GoogleFonts.sora(fontSize: 20, fontWeight: FontWeight.w700, color: C.lightText),
        headlineSmall: GoogleFonts.sora(fontSize: 18, fontWeight: FontWeight.w600, color: C.lightText),
        titleLarge: GoogleFonts.sora(fontSize: 16, fontWeight: FontWeight.w600, color: C.lightText),
        titleMedium: GoogleFonts.manrope(fontSize: 14, fontWeight: FontWeight.w600, color: C.lightText),
        titleSmall: GoogleFonts.manrope(fontSize: 12, fontWeight: FontWeight.w600, color: C.lightTextDim),
        bodyLarge: GoogleFonts.manrope(fontSize: 14, fontWeight: FontWeight.w400, color: C.lightText),
        bodyMedium: GoogleFonts.manrope(fontSize: 13, fontWeight: FontWeight.w400, color: C.lightTextDim),
        bodySmall: GoogleFonts.manrope(fontSize: 11, fontWeight: FontWeight.w400, color: C.lightTextMute),
        labelLarge: GoogleFonts.jetBrainsMono(fontSize: 13, fontWeight: FontWeight.w700, fontFeatures: [const FontFeature.tabularFigures()]),
        labelMedium: GoogleFonts.jetBrainsMono(fontSize: 11, fontWeight: FontWeight.w600, fontFeatures: [const FontFeature.tabularFigures()]),
        labelSmall: GoogleFonts.jetBrainsMono(fontSize: 10, fontWeight: FontWeight.w500, fontFeatures: [const FontFeature.tabularFigures()]),
      ),

      // ── AppBar ────
      appBarTheme: AppBarTheme(
        backgroundColor: C.lightBase,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
        iconTheme: const IconThemeData(color: C.lightText),
        titleTextStyle: GoogleFonts.sora(
          color: C.lightText,
          fontSize: 18,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.2,
        ),
      ),

      // ── Cards ────
      cardTheme: CardThemeData(
        color: C.lightSurface,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(C.radiusCard),
          side: const BorderSide(color: C.lightLine, width: 1),
        ),
      ),

      // ── Inputs ────
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: C.lightRaised,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        hintStyle: GoogleFonts.manrope(color: C.lightTextMute, fontSize: 13),
        labelStyle: GoogleFonts.manrope(color: C.lightTextDim, fontSize: 13),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(C.radiusCard),
          borderSide: const BorderSide(color: C.lightLine),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(C.radiusCard),
          borderSide: const BorderSide(color: C.lightLine),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(C.radiusCard),
          borderSide: const BorderSide(color: C.lightSky, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(C.radiusCard),
          borderSide: const BorderSide(color: C.lightRose),
        ),
      ),

      // ── Buttons ────
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: C.lightAmber,
          foregroundColor: C.lightOnAmber,
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
          foregroundColor: C.lightText,
          side: const BorderSide(color: C.lightLine),
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

      // ── Bottom Sheet ────
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: C.lightOverlay,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(C.radiusModal)),
          side: BorderSide(color: C.lightLine, width: 1),
        ),
      ),

      // ── Bottom Navigation Bar ────
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: C.lightSurface,
        selectedItemColor: C.lightAmber,
        unselectedItemColor: C.lightTextMute,
        selectedLabelStyle: GoogleFonts.manrope(fontSize: 11, fontWeight: FontWeight.w700),
        unselectedLabelStyle: GoogleFonts.manrope(fontSize: 11, fontWeight: FontWeight.w500),
        type: BottomNavigationBarType.fixed,
        elevation: 0,
      ),

      // ── Divider ────
      dividerTheme: const DividerThemeData(
        color: C.lightLine,
        thickness: 1,
        space: 1,
      ),

      // ── Chips ────
      chipTheme: ChipThemeData(
        backgroundColor: C.lightRaised,
        selectedColor: C.lightAmber,
        labelStyle: GoogleFonts.manrope(
          color: C.lightText,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
        side: const BorderSide(color: C.lightLine),
        shape: const StadiumBorder(),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      ),

      // ── Snackbar ────
      snackBarTheme: SnackBarThemeData(
        backgroundColor: C.lightRaised,
        contentTextStyle: GoogleFonts.manrope(
          color: C.lightText,
          fontSize: 13,
          fontWeight: FontWeight.w500,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(C.radiusCard),
          side: const BorderSide(color: C.lightLine),
        ),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. Night / Dark Theme
  // ─────────────────────────────────────────────────────────────
  static ThemeData get darkTheme {
    final baseTextTheme = ThemeData.dark().textTheme.apply(
      bodyColor: C.darkText,
      displayColor: C.darkText,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: C.darkBase,
      primaryColor: C.darkAmber,
      dividerColor: C.darkLine,
      colorScheme: const ColorScheme.dark(
        primary: C.darkAmber,
        onPrimary: C.darkOnAmber,
        primaryContainer: C.darkAmberSoft,
        onPrimaryContainer: C.darkAmberPress,
        secondary: C.darkMint,
        onSecondary: C.darkOnMint,
        secondaryContainer: C.darkMintSoft,
        surface: C.darkSurface,
        onSurface: C.darkText,
        surfaceContainerHighest: C.darkRaised,
        outline: C.darkLine,
        outlineVariant: C.darkLineStrong,
        error: C.darkRose,
        onError: C.darkOnRose,
        errorContainer: C.darkRoseSoft,
        tertiary: C.darkSky,
        onTertiary: C.darkOnSky,
      ),

      // ── Typography ────
      textTheme: GoogleFonts.manropeTextTheme(baseTextTheme).copyWith(
        displayLarge: GoogleFonts.sora(fontSize: 32, fontWeight: FontWeight.bold, color: C.darkText, letterSpacing: -0.5),
        displayMedium: GoogleFonts.sora(fontSize: 28, fontWeight: FontWeight.bold, color: C.darkText, letterSpacing: -0.4),
        displaySmall: GoogleFonts.sora(fontSize: 24, fontWeight: FontWeight.bold, color: C.darkText, letterSpacing: -0.3),
        headlineMedium: GoogleFonts.sora(fontSize: 20, fontWeight: FontWeight.w700, color: C.darkText),
        headlineSmall: GoogleFonts.sora(fontSize: 18, fontWeight: FontWeight.w600, color: C.darkText),
        titleLarge: GoogleFonts.sora(fontSize: 16, fontWeight: FontWeight.w600, color: C.darkText),
        titleMedium: GoogleFonts.manrope(fontSize: 14, fontWeight: FontWeight.w600, color: C.darkText),
        titleSmall: GoogleFonts.manrope(fontSize: 12, fontWeight: FontWeight.w600, color: C.darkTextDim),
        bodyLarge: GoogleFonts.manrope(fontSize: 14, fontWeight: FontWeight.w400, color: C.darkText),
        bodyMedium: GoogleFonts.manrope(fontSize: 13, fontWeight: FontWeight.w400, color: C.darkTextDim),
        bodySmall: GoogleFonts.manrope(fontSize: 11, fontWeight: FontWeight.w400, color: C.darkTextMute),
        labelLarge: GoogleFonts.jetBrainsMono(fontSize: 13, fontWeight: FontWeight.w700, fontFeatures: [const FontFeature.tabularFigures()]),
        labelMedium: GoogleFonts.jetBrainsMono(fontSize: 11, fontWeight: FontWeight.w600, fontFeatures: [const FontFeature.tabularFigures()]),
        labelSmall: GoogleFonts.jetBrainsMono(fontSize: 10, fontWeight: FontWeight.w500, fontFeatures: [const FontFeature.tabularFigures()]),
      ),

      // ── AppBar ────
      appBarTheme: AppBarTheme(
        backgroundColor: C.darkBase,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
        iconTheme: const IconThemeData(color: C.darkText),
        titleTextStyle: GoogleFonts.sora(
          color: C.darkText,
          fontSize: 18,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.2,
        ),
      ),

      // ── Cards ────
      cardTheme: CardThemeData(
        color: C.darkSurface,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(C.radiusCard),
          side: const BorderSide(color: C.darkLine, width: 1),
        ),
      ),

      // ── Inputs ────
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: C.darkRaised,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        hintStyle: GoogleFonts.manrope(color: C.darkTextMute, fontSize: 13),
        labelStyle: GoogleFonts.manrope(color: C.darkTextDim, fontSize: 13),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(C.radiusCard),
          borderSide: const BorderSide(color: C.darkLine),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(C.radiusCard),
          borderSide: const BorderSide(color: C.darkLine),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(C.radiusCard),
          borderSide: const BorderSide(color: C.darkSky, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(C.radiusCard),
          borderSide: const BorderSide(color: C.darkRose),
        ),
      ),

      // ── Buttons ────
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: C.darkAmber,
          foregroundColor: C.darkOnAmber,
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
          foregroundColor: C.darkText,
          side: const BorderSide(color: C.darkLine),
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

      // ── Bottom Sheet ────
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: C.darkOverlay,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(C.radiusModal)),
          side: BorderSide(color: C.darkLine, width: 1),
        ),
      ),

      // ── Bottom Navigation Bar ────
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: C.darkSurface,
        selectedItemColor: C.darkAmber,
        unselectedItemColor: C.darkTextMute,
        selectedLabelStyle: GoogleFonts.manrope(fontSize: 11, fontWeight: FontWeight.w700),
        unselectedLabelStyle: GoogleFonts.manrope(fontSize: 11, fontWeight: FontWeight.w500),
        type: BottomNavigationBarType.fixed,
        elevation: 0,
      ),

      // ── Divider ────
      dividerTheme: const DividerThemeData(
        color: C.darkLine,
        thickness: 1,
        space: 1,
      ),

      // ── Chips ────
      chipTheme: ChipThemeData(
        backgroundColor: C.darkRaised,
        selectedColor: C.darkAmber,
        labelStyle: GoogleFonts.manrope(
          color: C.darkText,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
        side: const BorderSide(color: C.darkLine),
        shape: const StadiumBorder(),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      ),

      // ── Snackbar ────
      snackBarTheme: SnackBarThemeData(
        backgroundColor: C.darkRaised,
        contentTextStyle: GoogleFonts.manrope(
          color: C.darkText,
          fontSize: 13,
          fontWeight: FontWeight.w500,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(C.radiusCard),
          side: const BorderSide(color: C.darkLine),
        ),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}
