import 'package:flutter/material.dart';

/// Design System v3 — "Obsidian Market" & "Day Trading" Color Tokens
/// Extracted directly from web frontend `frontend/src/index.css`
abstract class C {
  // ─── Default Day (Light) Mode Tokens (Cold Boot Default) ───
  static const Color base = lightBase;
  static const Color surface = lightSurface;
  static const Color raised = lightRaised;
  static const Color overlay = lightOverlay;
  static const Color line = lightLine;
  static const Color lineStrong = lightLineStrong;

  static const Color text = lightText;
  static const Color textDim = lightTextDim;
  static const Color textMute = lightTextMute;

  static const Color amber = lightAmber;
  static const Color amberPress = lightAmberPress;
  static const Color onAmber = lightOnAmber;
  static const Color amberSoft = lightAmberSoft;

  static const Color mint = lightMint;
  static const Color onMint = lightOnMint;
  static const Color mintSoft = lightMintSoft;

  static const Color sky = lightSky;
  static const Color onSky = lightOnSky;
  static const Color skySoft = lightSkySoft;

  static const Color rose = lightRose;
  static const Color onRose = lightOnRose;
  static const Color roseSoft = lightRoseSoft;

  static const Color violet = lightViolet;
  static const Color onViolet = lightOnViolet;
  static const Color violetSoft = lightVioletSoft;

  // ─── Canonical Day / Light Tokens (.light in index.css) ───
  static const Color lightBase = Color(0xFFF7F6F3);
  static const Color lightSurface = Color(0xFFFFFFFF);
  static const Color lightRaised = Color(0xFFF1EFEA);
  static const Color lightOverlay = Color(0xFFFFFFFF);
  static const Color lightLine = Color(0xFFE2DED5);
  static const Color lightLineStrong = Color(0xFFC9C3B6);

  static const Color lightText = Color(0xFF14100B);
  static const Color lightTextDim = Color(0xFF5B5A54);
  static const Color lightTextMute = Color(0xFF8C8A82);

  static const Color lightAmber = Color(0xFFC2721A);
  static const Color lightAmberPress = Color(0xFFA65E12);
  static const Color lightOnAmber = Color(0xFFFFFFFF);
  static const Color lightAmberSoft = Color(0xFFFBEEDC);

  static const Color lightMint = Color(0xFF127A55);
  static const Color lightOnMint = Color(0xFFFFFFFF);
  static const Color lightMintSoft = Color(0xFFDEF3E9);

  static const Color lightSky = Color(0xFF1667B8);
  static const Color lightOnSky = Color(0xFFFFFFFF);
  static const Color lightSkySoft = Color(0xFFE1EEFB);

  static const Color lightRose = Color(0xFFC0362B);
  static const Color lightOnRose = Color(0xFFFFFFFF);
  static const Color lightRoseSoft = Color(0xFFFBE4E1);

  static const Color lightViolet = Color(0xFF6844C4);
  static const Color lightOnViolet = Color(0xFFFFFFFF);
  static const Color lightVioletSoft = Color(0xFFEEE8FC);

  // ─── Canonical Night / Dark Tokens (:root, .dark in index.css) ───
  static const Color darkBase = Color(0xFF0B0D0C);
  static const Color darkSurface = Color(0xFF131715);
  static const Color darkRaised = Color(0xFF1B211E);
  static const Color darkOverlay = Color(0xFF232B27);
  static const Color darkLine = Color(0xFF2A332E);
  static const Color darkLineStrong = Color(0xFF3C4841);

  static const Color darkText = Color(0xFFEDEFEA);
  static const Color darkTextDim = Color(0xFFA6AFA7);
  static const Color darkTextMute = Color(0xFF6E7A72);

  static const Color darkAmber = Color(0xFFF2A03D);
  static const Color darkAmberPress = Color(0xFFD8862A);
  static const Color darkOnAmber = Color(0xFF1A1207);
  static const Color darkAmberSoft = Color(0xFF2A2113);

  static const Color darkMint = Color(0xFF4FD4A0);
  static const Color darkOnMint = Color(0xFF071A12);
  static const Color darkMintSoft = Color(0xFF12271F);

  static const Color darkSky = Color(0xFF5AA9F2);
  static const Color darkOnSky = Color(0xFF07131F);
  static const Color darkSkySoft = Color(0xFF0F1F2E);

  static const Color darkRose = Color(0xFFF2685E);
  static const Color darkOnRose = Color(0xFF1A0A09);
  static const Color darkRoseSoft = Color(0xFF2B1614);

  static const Color darkViolet = Color(0xFFA98BF0);
  static const Color darkOnViolet = Color(0xFF130E21);
  static const Color darkVioletSoft = Color(0xFF1D1730);

  // ─── Theme-Aware Context Helpers ───
  static bool isDark(BuildContext context) => Theme.of(context).brightness == Brightness.dark;

  static Color baseOf(BuildContext context) => isDark(context) ? darkBase : lightBase;
  static Color surfaceOf(BuildContext context) => isDark(context) ? darkSurface : lightSurface;
  static Color raisedOf(BuildContext context) => isDark(context) ? darkRaised : lightRaised;
  static Color overlayOf(BuildContext context) => isDark(context) ? darkOverlay : lightOverlay;
  static Color lineOf(BuildContext context) => isDark(context) ? darkLine : lightLine;
  static Color lineStrongOf(BuildContext context) => isDark(context) ? darkLineStrong : lightLineStrong;

  static Color textOf(BuildContext context) => isDark(context) ? darkText : lightText;
  static Color textDimOf(BuildContext context) => isDark(context) ? darkTextDim : lightTextDim;
  static Color textMuteOf(BuildContext context) => isDark(context) ? darkTextMute : lightTextMute;

  static Color amberOf(BuildContext context) => isDark(context) ? darkAmber : lightAmber;
  static Color onAmberOf(BuildContext context) => isDark(context) ? darkOnAmber : lightOnAmber;
  static Color amberSoftOf(BuildContext context) => isDark(context) ? darkAmberSoft : lightAmberSoft;

  static Color mintOf(BuildContext context) => isDark(context) ? darkMint : lightMint;
  static Color skyOf(BuildContext context) => isDark(context) ? darkSky : lightSky;
  static Color roseOf(BuildContext context) => isDark(context) ? darkRose : lightRose;
  static Color violetOf(BuildContext context) => isDark(context) ? darkViolet : lightViolet;

  // ─── Radii ───
  static const double radiusCard = 10.0;
  static const double radiusModal = 20.0;
  static const double radiusPill = 999.0;
}
