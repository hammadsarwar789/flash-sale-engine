import 'package:flutter/material.dart';

/// Design System v3 — "Obsidian Market" Color Tokens
/// Dark-first canonical palette for high-velocity commodity trading floor.
abstract class C {
  // Surfaces & Canvas
  static const Color base = Color(0xFF0B0D0C);
  static const Color surface = Color(0xFF131715);
  static const Color raised = Color(0xFF1B211E);
  static const Color overlay = Color(0xFF232B27);
  static const Color line = Color(0xFF2A332E);
  static const Color lineStrong = Color(0xFF3C4841);

  // Typography & Content
  static const Color text = Color(0xFFEDEFEA);
  static const Color textDim = Color(0xFFA6AFA7);
  static const Color textMute = Color(0xFF6E7A72);

  // Semantic Accents
  static const Color amber = Color(0xFFF2A03D);
  static const Color amberPress = Color(0xFFD8862A);
  static const Color onAmber = Color(0xFF1A1207);
  static const Color amberSoft = Color(0xFF2A2113);

  static const Color mint = Color(0xFF4FD4A0);
  static const Color onMint = Color(0xFF071A12);
  static const Color mintSoft = Color(0xFF12271F);

  static const Color sky = Color(0xFF5AA9F2);
  static const Color onSky = Color(0xFF07131F);
  static const Color skySoft = Color(0xFF0F1F2E);

  static const Color rose = Color(0xFFF2685E);
  static const Color onRose = Color(0xFF1A0A09);
  static const Color roseSoft = Color(0xFF2B1614);

  static const Color violet = Color(0xFFA98BF0);
  static const Color onViolet = Color(0xFF130E21);
  static const Color violetSoft = Color(0xFF1D1730);

  // Light Mode Equivalents (for secondary preview)
  static const Color lightBase = Color(0xFFF4F5F2);
  static const Color lightSurface = Color(0xFFFFFFFF);
  static const Color lightRaised = Color(0xFFE9EBE6);
  static const Color lightOverlay = Color(0xFFFFFFFF);
  static const Color lightLine = Color(0xFFD8DBD4);
  static const Color lightText = Color(0xFF121513);
  static const Color lightTextDim = Color(0xFF4A524C);
  static const Color lightTextMute = Color(0xFF7D877F);

  // Radii
  static const double radiusCard = 10.0;
  static const double radiusModal = 20.0;
  static const double radiusPill = 999.0;
}
