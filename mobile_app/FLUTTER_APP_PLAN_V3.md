# Flutter Mobile App Build Plan — Design System v3 "Obsidian Market"

## 1. Executive Summary & Cross-Platform Alignment

This document outlines the phased build plan for the **Flash Sale Engine Flutter Mobile App** (`mobile_app/`), mapping byte-for-byte to [`frontend/FRONTEND_DESIGN_V3.md`](file:///d:/Flash%20Sale%20Engine/frontend/FRONTEND_DESIGN_V3.md).

The app delivers a dark-first, high-density, real-time commodity trading experience for flash drops and e-commerce transactions on iOS and Android.

---

## 2. Architecture & Tech Stack

| Layer | Technology | Rationale / Spec Requirement |
| --- | --- | --- |
| **Framework** | Flutter 3.x (Dart 3.x) | Cross-platform native compilation (iOS & Android) |
| **State Management** | `flutter_bloc` (^8.1.6) + `equatable` | Predictable, event-driven reactive state for flash sales and carts |
| **Networking** | `dio` (^5.7.0) | Interceptors for Bearer JWT refresh, base URL routing, timeout guards |
| **Secure Storage** | `flutter_secure_storage` (^9.2.2) | Secure storage for Bearer Access and Refresh tokens (never `SharedPreferences`) |
| **Routing** | `go_router` (^14.6.2) | Declarative 5-tab ShellRoute + deep linking for products/orders |
| **Typography** | `google_fonts` (^6.2.1) | Sora (display/headers), Manrope (body/UI), JetBrains Mono (numerics) |
| **Formatting** | `intl` (^0.19.0) + `uuid` | Currency formatting and UUID v4 `Idempotency-Key` headers |

---

## 3. Theme & Token Mapping (`lib/core/theme/`)

### 3.1 Token Class `C` (`lib/core/theme/tokens.dart`)

```dart
import 'package:flutter/material.dart';

class C {
  // Dark Surfaces (Canonical Default)
  static const base       = Color(0xFF0B0D0C); // Scaffold background
  static const surface    = Color(0xFF131715); // Cards, panels, bottom nav
  static const raised     = Color(0xFF1B211E); // Inputs, wells, hovered tiles
  static const overlay    = Color(0xFF232B27); // Modals, bottom sheets, dialogs
  static const line       = Color(0xFF2A332E); // Hairline borders, dividers
  static const lineStrong = Color(0xFF3C4841); // Active borders, focused inputs
  static const text       = Color(0xFFEDEFEA); // Primary headlines, values
  static const textDim    = Color(0xFFA6AFA7); // Body copy, secondary text
  static const textMute   = Color(0xFF6E7A72); // Labels, timestamps, struck prices

  // Semantic Accents
  static const amber      = Color(0xFFF2A03D); // Primary CTA, LIVE, countdowns
  static const amberPress = Color(0xFFD8862A); // Active/pressed button state
  static const onAmber    = Color(0xFF1A1207); // High-contrast text on amber
  static const amberSoft  = Color(0xFF2A2113); // Urgent badge/strip bg
  static const mint       = Color(0xFF4FD4A0); // PAID, SHIPPED, DELIVERED, in-stock
  static const mintSoft   = Color(0xFF12271F); // Success banner bg
  static const sky        = Color(0xFF5AA9F2); // Info, PENDING, focus outline
  static const skySoft    = Color(0xFF0F1F2E); // Info banner bg
  static const rose       = Color(0xFFF2685E); // CANCELLED, REFUNDED, out-of-stock
  static const roseSoft   = Color(0xFF2B1614); // Error banner bg
  static const violet     = Color(0xFFA98BF0); // Admin/Vendor tags
  static const violetSoft = Color(0xFF1D1730);
}
```

### 3.2 Typography & Radii Constants
- **Headings / Titles:** `GoogleFonts.sora(...)`
- **UI / Body / Subtitles:** `GoogleFonts.manrope(...)`
- **Prices / SKUs / Timers:** `GoogleFonts.jetBrainsMono(fontFeatures: [FontFeature.tabularFigures()])`
- **Radii:** `10px` (Cards, Inputs, Buttons), `20px` (Bottom Sheets, Dialogs), `999px` (Pills, Steppers, Badges).

---

## 4. Mobile Navigation & Screen Matrix

The mobile app implements the **5-Destination Bottom Navigation Shell**:
1. **Shop (`/shop`)** — Live drop ticker, search bar, category chips, 2-column product grid with stock bars.
2. **Search (`/search`)** — Quick filter command palette, instant SKU search, price ranges.
3. **Cart (`/cart`)** — Line items with 999px steppers, inline coupon input, checkout hold timer, sticky checkout button.
4. **Orders (`/orders`)** — Order history list, order detail modal with horizontal fulfillment milestone rail (`PENDING` ➔ `PAID` ➔ `SHIPPED` ➔ `DELIVERED`).
5. **Account (`/account`)** — Profile info, Wishlist, Saved addresses, Vendor Switch (if merchant role), Theme / Logout.

---

## 5. Phased Build Plan for `mobile_app/`

### Phase 1: Core Theme & Token Synchronization
- [ ] Create `lib/core/theme/tokens.dart` matching Section 12 of `FRONTEND_DESIGN_V3.md`.
- [ ] Update `lib/core/theme/app_theme.dart` with Sora + Manrope + JetBrains Mono text themes, zero elevation card themes with 10px radius and 1px `C.line` border.
- [ ] Create UI primitives:
  - `PriceText` / `MoneyText` (JetBrains Mono tabular numerics).
  - `StockBarWidget` (segmented 8-block or continuous indicator shifting mint/amber/rose).
  - `StatusPillWidget` (999px stadium border, 6px semantic dot).
  - `CountdownTimerWidget` (digit-flipping mono timer).

### Phase 2: Navigation & Shell Routing
- [ ] Configure `GoRouter` shell route with `NavigationBar` (Shop, Search, Cart, Orders, Account).
- [ ] Implement dark-first App Bar with `FLASH●SALE` wordmark (Sora 700 + amber dot).

### Phase 3: Storefront & Flash Sale Floor
- [ ] **Live Ticker:** Horizontal smooth marquee banner with pulsing amber dot and live drop countdowns.
- [ ] **Catalog Screen:** 2-column product grid, square images, mono prices, stock bars, live drop tags.
- [ ] **Product Detail Screen (PDP):**
  - Image gallery with page indicator.
  - Sticky bottom action bar with quantity stepper and full-width amber `ADD TO CART` button.
  - Size and Color variant chips with real-time stock and price resolution.
  - Reviews breakdown and submission bottom sheet.

### Phase 4: Cart, Holds & Checkout Flow
- [ ] **Cart Screen:** Real-time hold countdown timer, coupon code apply bar, price breakdown.
- [ ] **Checkout Screen:** 3-step bottom sheet or stepper: Address Picker, Stripe Payment Sheet, Idempotent submission with progress bar.

### Phase 5: Orders, Fulfillment Rail & Account
- [ ] **Orders Screen:** Status filtering chips, order card list.
- [ ] **Order Detail Screen:** Real-time horizontal fulfillment milestone rail (`PENDING ➔ PAID ➔ SHIPPED ➔ DELIVERED`), tracking number copy action, receipt invoice breakdown.
- [ ] **Wishlist Screen:** 2-column grid with `Move to Cart` actions.

### Phase 6: Vendor & Admin Tools (Mobile Optimization)
- [ ] Vendor dashboard tab for sellers (sub-orders fulfillment, Shopify sync status toggle, payout request sheet).

---

## 6. Definition of Done for Mobile App
- [ ] 100% color token and font parity with web design system v3.
- [ ] Monospaced tabular numerics used for all prices, inventory counts, and timers.
- [ ] All touch targets ≥ 44×44px.
- [ ] Real-time updates for countdown timers and stock levels without layout jitter.
