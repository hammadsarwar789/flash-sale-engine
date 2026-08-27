import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Design tokens mapped 1-to-1 from the website CSS variables.
/// Dark mode palette (matches `.dark {}` in index.css).
class AppColors {
  // ── Surfaces ──────────────────────────────────────────────
  static const Color bone       = Color(0xFF0E0E0C);  // --bone  (scaffold bg)
  static const Color paper      = Color(0xFF161613);  // --paper (cards, sheets)
  static const Color paperSunk  = Color(0xFF1F1F1B);  // --paper-sunk (inset bg)
  static const Color rule       = Color(0xFF3A3935);  // --rule  (borders, dividers)

  // Aliases for Material semantics
  static const Color background = bone;
  static const Color surface    = paper;
  static const Color surfaceElevated = paperSunk;
  static const Color border     = rule;

  // ── Typography ────────────────────────────────────────────
  static const Color ink        = Color(0xFFF1EEE6);  // --ink (primary text)
  static const Color graphite   = Color(0xFFC8C4B8);  // --graphite (secondary text)
  static const Color ash        = Color(0xFFB5B2A3);  // --ash (muted / hint text)

  // Aliases for Material semantics
  static const Color textPrimary   = ink;
  static const Color textSecondary = graphite;
  static const Color textMuted     = ash;

  // ── Accent / Signal ───────────────────────────────────────
  static const Color signal     = Color(0xFFFF4A32);  // --signal (primary CTA, flash)
  static const Color signalInk  = Color(0xFF0E0E0C);  // --signal-ink (text on signal)

  // Aliases
  static const Color primary      = signal;
  static const Color primaryLight = Color(0xFFFF7A66);  // lighter tint of signal
  static const Color accentFlash  = signal;

  // ── Semantic ──────────────────────────────────────────────
  static const Color gain   = Color(0xFF4FBE7B);  // --gain  (success, in-stock)
  static const Color warn   = Color(0xFFE0A44A);  // --warn  (warning, low-stock)
  static const Color loss   = Color(0xFFE5321B);  // --loss  (error, out-of-stock)
  static const Color marker = Color(0xFF5A4A18);  // --marker (highlight / badge bg)

  // Aliases
  static const Color success = gain;
  static const Color warning = warn;
  static const Color secondary = gain;
}

class AppTheme {
  static ThemeData get darkTheme {
    final baseTextTheme = ThemeData.dark().textTheme.apply(
      bodyColor: AppColors.ink,
      displayColor: AppColors.ink,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: AppColors.bone,
      primaryColor: AppColors.signal,
      dividerColor: AppColors.rule,
      colorScheme: const ColorScheme.dark(
        primary: AppColors.signal,
        secondary: AppColors.gain,
        surface: AppColors.paper,
        error: AppColors.loss,
        onPrimary: AppColors.signalInk,
        onSecondary: Colors.white,
        onSurface: AppColors.ink,
        onError: Colors.white,
      ),

      // ── Typography ──────────────────────────────────────
      // Website uses 'Inter Tight' — Google Fonts maps it as interTight
      textTheme: GoogleFonts.interTightTextTheme(baseTextTheme),

      // ── AppBar ──────────────────────────────────────────
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.bone,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
        iconTheme: const IconThemeData(color: AppColors.ink),
        titleTextStyle: GoogleFonts.interTight(
          color: AppColors.ink,
          fontSize: 20,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.3,
        ),
      ),

      // ── Cards ───────────────────────────────────────────
      // Website uses sharp, borderless cards with 1px rule borders
      cardTheme: CardThemeData(
        color: AppColors.paper,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(4), // editorial: near-square
          side: const BorderSide(color: AppColors.rule, width: 1),
        ),
      ),

      // ── Inputs ──────────────────────────────────────────
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.paperSunk,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        hintStyle: GoogleFonts.interTight(color: AppColors.ash, fontSize: 14),
        labelStyle: GoogleFonts.interTight(color: AppColors.graphite, fontSize: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(4),
          borderSide: const BorderSide(color: AppColors.rule),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(4),
          borderSide: const BorderSide(color: AppColors.rule),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(4),
          borderSide: const BorderSide(color: AppColors.signal, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(4),
          borderSide: const BorderSide(color: AppColors.loss),
        ),
      ),

      // ── Buttons ─────────────────────────────────────────
      // Website CTA: solid signal-red, dark text, squared-off
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.signal,
          foregroundColor: AppColors.signalInk,
          elevation: 0,
          minimumSize: const Size.fromHeight(52),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(4),
          ),
          textStyle: GoogleFonts.interTight(
            fontSize: 15,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.5,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.ink,
          side: const BorderSide(color: AppColors.rule),
          minimumSize: const Size.fromHeight(52),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(4),
          ),
          textStyle: GoogleFonts.interTight(
            fontSize: 15,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),

      // ── Bottom Nav ──────────────────────────────────────
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: AppColors.paper,
        selectedItemColor: AppColors.signal,
        unselectedItemColor: AppColors.ash,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
      ),

      // ── Divider ─────────────────────────────────────────
      dividerTheme: const DividerThemeData(
        color: AppColors.rule,
        thickness: 1,
        space: 1,
      ),

      // ── Chips (category pills) ─────────────────────────
      chipTheme: ChipThemeData(
        backgroundColor: AppColors.paperSunk,
        selectedColor: AppColors.signal,
        labelStyle: GoogleFonts.interTight(
          color: AppColors.ink,
          fontSize: 13,
          fontWeight: FontWeight.w600,
        ),
        side: const BorderSide(color: AppColors.rule),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(4),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      ),

      // ── Snackbar ────────────────────────────────────────
      snackBarTheme: SnackBarThemeData(
        backgroundColor: AppColors.paperSunk,
        contentTextStyle: GoogleFonts.interTight(
          color: AppColors.ink,
          fontSize: 14,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(4),
        ),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}
