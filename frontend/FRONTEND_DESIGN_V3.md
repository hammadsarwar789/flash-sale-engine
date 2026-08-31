# Flash Sale Engine — Design System v3 "Obsidian Market"

**Handoff spec for Antigravity (web) and the future Flutter app.**
This replaces v2.2 ("Trading Floor Editorial"). Everything here is load-bearing: tokens, fonts, radii, spacing, layout blueprints, and component contracts.

**Cross-platform contract:** every color, radius, spacing step, and type ramp in this document is expressed as a raw value (hex / px) so the exact same system compiles to CSS variables (React + Tailwind) *and* to a Flutter `ThemeData` / `ColorScheme`. Do not invent platform-only colors. Section 12 is the Flutter mapping — it must stay byte-identical to Section 1.

---

## 0. Design Thesis

A **dark-first commodity terminal with a warm human surface.** The backend is a real-time, event-driven, high-concurrency machine — the UI should look like an instrument you trade on, not a marketing page. But unlike v2's cold newsprint, v3 is warm: deep obsidian surfaces, amber as the primary energy, and one cold mint for confirmed/settled state.

### Principles
1. **Dark is the default.** Light mode exists and is a true, tested theme — but the product identity is the dark one. Flutter ships dark-first too.
2. **Depth by surface, not by shadow.** Four elevation steps are four background colors (`base → surface → raised → overlay`), each +1 hairline border. Shadows only on true overlays (modals, sheets, dropdowns).
3. **Amber is energy, mint is truth.** `--amber` = live, urgent, primary action, countdowns. `--mint` = paid, delivered, in stock, healthy. Never swap them.
4. **Soft geometry, dense data.** `radius 10px` on cards/inputs/buttons, `radius 20px` on sheets/modals, `999px` on pills. Rounded — but padding stays tight; this is a data product.
5. **Numbers are monospace, always.** Prices, stock, timers, order IDs, SKUs, tax lines, telemetry: mono + `tabular-nums`. Non-negotiable — layout must never jitter while a counter ticks.
6. **Touch-first sizing.** Every interactive target ≥ 44×44px on web too, so the Flutter port is a re-skin, not a redesign.

---

## 1. Color System

All values are raw hex. Dark is canonical; light is a designed counterpart, not an auto-inversion.

### 1.1 Core tokens

| Token | Dark (default) | Light | Usage |
| --- | --- | --- | --- |
| `--base` | `#0B0D0C` | `#F7F6F3` | App canvas / scaffold background |
| `--surface` | `#131715` | `#FFFFFF` | Cards, tables, panels, nav bar |
| `--raised` | `#1B211E` | `#F1EFEA` | Inputs, table headers, hovered rows, wells |
| `--overlay` | `#232B27` | `#FFFFFF` | Modals, sheets, dropdowns, popovers, toasts |
| `--line` | `#2A332E` | `#E2DED5` | Hairline borders, dividers, table rules |
| `--line-strong` | `#3C4841` | `#C9C3B6` | Focused field borders, active tab underline |
| `--text` | `#EDEFEA` | `#14100B` | Primary text, headings, values |
| `--text-dim` | `#A6AFA7` | `#5B5A54` | Body copy, descriptions, secondary values |
| `--text-mute` | `#6E7A72` | `#8C8A82` | Labels, timestamps, placeholders, struck prices |

### 1.2 Accent & semantic tokens

| Token | Dark | Light | Usage |
| --- | --- | --- | --- |
| `--amber` | `#F2A03D` | `#C2721A` | Primary CTA, LIVE badges, countdowns, scarcity < 10% |
| `--amber-press` | `#D8862A` | `#A65E12` | Pressed / active state of amber elements |
| `--on-amber` | `#1A1207` | `#FFFFFF` | Text and icons on a filled amber surface |
| `--amber-soft` | `#2A2113` | `#FBEEDC` | Amber-tinted background chips, alert strips |
| `--mint` | `#4FD4A0` | `#127A55` | PAID, SHIPPED, DELIVERED, in stock, healthy service |
| `--mint-soft` | `#12271F` | `#DEF3E9` | Success chip / banner background |
| `--sky` | `#5AA9F2` | `#1667B8` | Info, tracking links, PENDING-in-progress, focus ring |
| `--sky-soft` | `#0F1F2E` | `#E1EEFB` | Info chip background |
| `--rose` | `#F2685E` | `#C0362B` | CANCELLED, REFUNDED, out of stock, destructive, errors |
| `--rose-soft` | `#2B1614` | `#FBE4E1` | Error chip / banner background |
| `--violet` | `#A98BF0` | `#6844C4` | Admin-only chrome, internal/debug views (outbox, task logs) |
| `--violet-soft` | `#1D1730` | `#EEE8FC` | Admin badge background |

### 1.3 Fixed mappings (do not improvise)

**Order status → token**

| Status | Color | Chip |
| --- | --- | --- |
| `PENDING` | `--sky` | soft bg + dot |
| `PAID` | `--mint` | soft bg + dot |
| `SHIPPED` | `--mint` | outline + dot |
| `DELIVERED` | `--mint` | filled `--mint` / `--on-amber`-style dark text |
| `CANCELLED` | `--rose` | outline + dot |
| `REFUNDED` | `--rose` | soft bg + dot |
| `RETURNED` | `--text-mute` | outline + dot |

**Stock level → token** (per *variant*, never per product)

| Level | Color | Bar |
| --- | --- | --- |
| 0 | `--rose` | empty, label `SOLD OUT` |
| 1–10% | `--amber` | pulsing bar, label `N LEFT` |
| 10–30% | `--amber` | static bar |
| > 30% | `--mint` | static bar |

### 1.4 Hard rules
- No gradients anywhere except one permitted 1px `--amber → transparent` underline on the LIVE ticker. No mesh, no radial, no glow.
- No `backdrop-filter: blur()`. Overlays use solid `--overlay` + scrim `rgba(0,0,0,0.6)`.
- `--amber` must stay under ~8% of viewport area. It is a signal, not a brand wash.
- Never hardcode `text-white` / `bg-black` / hex literals in components — token classes only.
- Contrast floor: body text ≥ 4.5:1, labels ≥ 3:1 in both themes.

---

## 2. Typography

Three families, all available on Google Fonts **and** in Flutter via `google_fonts` — that is why they were chosen.

| Role | Family | Fallbacks |
| --- | --- | --- |
| Display / headings | **Sora** | `system-ui`, sans-serif |
| UI / body / controls | **Manrope** | `system-ui`, sans-serif |
| Numerics / SKU / telemetry | **JetBrains Mono** | `ui-monospace`, monospace |

Web: load with `<link>` in the document head. Never `@import` a font URL in CSS.

### Type scale (desktop; ×0.88 below 640px, applied via clamp)

| Role | Family | Size / Line | Weight | Tracking |
| --- | --- | --- | --- | --- |
| Display | Sora | 64 / 66 | 700 | −0.03em |
| H1 | Sora | 40 / 46 | 700 | −0.02em |
| H2 | Sora | 28 / 34 | 600 | −0.015em |
| H3 | Sora | 20 / 26 | 600 | −0.01em |
| Body | Manrope | 15 / 24 | 400 | 0 |
| Body strong | Manrope | 15 / 24 | 600 | 0 |
| Small / meta | Manrope | 13 / 18 | 500 | 0 |
| Label caps | Manrope | 11 / 14 | 700 | +0.12em, uppercase |
| Price XL | JetBrains Mono | 34 / 34 | 600 | −0.02em |
| Price inline | JetBrains Mono | 15 / 20 | 500 | 0 |
| Timer / counter | JetBrains Mono | 22 / 22 | 700 | +0.02em |
| Code / ID / SKU | JetBrains Mono | 12 / 16 | 400 | 0 |

Every mono style carries `font-variant-numeric: tabular-nums` (Flutter: `FontFeature.tabularFigures()`).

---

## 3. Layout, Spacing, Shape, Motion

### 3.1 Grid
- Desktop > 1024px: 12 cols, max canvas `1360px`, 48px gutters, 24px gaps.
- Tablet 640–1024px: 8 cols, 28px gutters.
- Mobile < 640px: 4 cols, 16px gutters. Single column; tables become stacked cards.
- Admin uses a persistent **240px left rail** + fluid content on desktop; on mobile the rail collapses to a bottom sheet nav.

### 3.2 Spacing scale (px)
`2, 4, 8, 12, 16, 20, 24, 32, 40, 56, 80, 120` — nothing off-scale.

### 3.3 Shape & elevation
| Element | Radius |
| --- | --- |
| Buttons, inputs, selects, cards, images, tiles | `10px` |
| Modals, drawers, bottom sheets, ticker chips | `20px` |
| Status pills, avatars, badges, quantity steppers | `999px` |

Elevation ladder (no shadow below level 3):
1. `--base` + no border
2. `--surface` + `1px solid --line`
3. `--raised` + `1px solid --line`
4. `--overlay` + `1px solid --line-strong` + `0 16px 40px rgba(0,0,0,0.45)`

Focus ring everywhere: `2px solid --sky`, `2px` offset. Never remove it.

### 3.4 Motion
- 120ms hover, 180ms state change, 240ms sheet/modal, 320ms route transition. Easing `cubic-bezier(0.2, 0, 0, 1)`.
- Allowed: ticker marquee, digit roll on timers/counters, 1s pulse on the LIVE dot and on stock bars < 10%, skeleton fade (opacity only), sheet slide-up.
- Banned: card lift on hover, shimmer-gradient skeletons, parallax, glow pulses, bouncy springs.
- Respect `prefers-reduced-motion`: kill marquee, roll, and pulse; keep opacity fades.

---

## 4. Global Chrome

### 4.1 Live ticker (`TickerBar`)
36px tall, `--surface` bg, top hairline, mono 12px caps, right-to-left marquee. Content: live drops, scarcity events, orders/min, next drop countdown. LIVE dot = 6px `--amber`, pulsing.
`● LIVE · CYBER JACKET / BLACK / M — 3 LEFT · SOLD OUT: NEON SNEAKER 42 · NEXT DROP 00:14:22 · ORDERS/MIN 428`

### 4.2 Navbar (64px, `--surface`, bottom hairline, sticky)
- Left: wordmark `FLASH` (Sora 700) + `●` amber dot + `SALE`.
- Center: `Catalog`, `Live Drops`, `Orders`, `Wishlist`. Active item = 2px `--amber` underline.
- Right: `⌘K` search chip → command palette; cart button `Cart · 3 · $269.97` (mono, amber count badge); avatar menu or `Sign in` (amber filled).
- Admins additionally see a `--violet` `ADMIN` pill linking to `/admin`.
- Mobile: logo + search icon + cart icon; nav collapses to a bottom tab bar (`Shop · Search · Cart · Orders · Account`) — this is also the Flutter navigation model.

### 4.3 Footer
`--surface`, top hairline, 3 columns: colophon + build hash + region; directories (Catalog, Orders, Support, API docs, Legal); live health telemetry in mono with `--mint` dots (`API 99.98% ● · PAYMENTS 100% ● · REDIS 99.99% ●`).

---

## 5. Storefront Blueprints

### 5.1 `/products` — Catalog
```text
┌──────────────────────────────────────────────────────────────────────┐
│ ● LIVE · NEXT DROP 00:14:22 · ORDERS/MIN 428 ······················· │
│ FLASH●SALE   Catalog  Live Drops  Orders  Wishlist   ⌘K  [Cart·$269] │
├──────────────────────────────────────────────────────────────────────┤
│ THE FLOOR                                                            │
│ Everything, moving fast.                              (Sora 64)      │
│ 1,204 items · 42 live drops · next drop 00:14:22      (mono)         │
├──────────────────────────────────────────────────────────────────────┤
│ [ Search products…            ] [ Category ▾ ] [ Sort ▾ ] [ Price ▾ ]│
│ Active: Outerwear ✕   Under $100 ✕                     Clear all     │
├──────────────────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                 │
│ │ [IMAGE]  │ │ [IMAGE]  │ │ [IMAGE]  │ │ [IMAGE]  │  card: surface, │
│ │      ♡   │ │ ●LIVE ♡  │ │      ♡   │ │      ♡   │  r10, hairline  │
│ │ Cyber    │ │ Neon     │ │ Field    │ │ Signal   │                 │
│ │ Jacket   │ │ Sneaker  │ │ Tote     │ │ Cap      │                 │
│ │ Outerwear│ │ Footwear │ │ Accessory│ │ Accessory│                 │
│ │ $099.99  │ │ $199.98  │ │ $049.00  │ │ $029.00  │  mono price     │
│ │ ▓▓▓▓░ 14 │ │ ▓░░░░  3 │ │ ▓▓▓▓▓ 84 │ │ ▓▓▓▓░ 42 │  stock bar      │
│ │ ★4.6 (82)│ │ ★4.9(210)│ │ ★4.2 (31)│ │ ★4.4 (12)│                 │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘                 │
│                    ‹ 1 2 3 … 24 ›                                    │
└──────────────────────────────────────────────────────────────────────┘
```
Grid: 4 up desktop / 3 tablet / 2 mobile. Skeletons match card geometry exactly. Empty state: mono line `NO MATCHES` + clear-filters button.

### 5.2 `/products/:id` — Detail
Two columns (7/5). Left: gallery — one large `r10` image + horizontal thumb strip; `● LIVE` badge top-left if in a drop. Right rail (sticky):
```text
Outerwear · SKU FSE-CJ-0413              (label caps + mono)
Cyber Jacket                             (Sora 40)
★★★★☆ 4.6 · 82 reviews                   → jumps to reviews
$099.99   $149.99                        (mono XL + struck --text-mute)
─────────────────────────────────────────
COLOR   [ Black ]( Sand )( Moss )        selected = amber border
SIZE    ( S )[ M ]( L )( XL·sold out )   sold out = struck, --line text
─────────────────────────────────────────
▓▓░░░░░░  3 LEFT IN BLACK / M            amber, pulsing
Reserved for 10:00 after checkout        (small, --text-mute)
─────────────────────────────────────────
[ − ] 1 [ + ]      [  ADD TO CART  ] [♡]   amber filled, full-width mobile
─────────────────────────────────────────
Description · Shipping & returns · Specs   (accordion)
```
Rules: no variant selected ⇒ Add to cart disabled with helper text `Select a size`. The resolved `variant_id` flows into every cart/checkout call. Stock, price, and rating all come from the variant when one exists.

Reviews block below: aggregate bar chart (5→1 stars) on the left, list on the right, each row `avatar · name · ★ · date (mono) · body`. Auth'd users get an inline star-picker + textarea form; guests see `Sign in to review`.

### 5.3 `/cart`
Two columns (8/4). Left: line rows — 72px thumb, name, variant chips, mono unit price, `999px` quantity stepper, remove `✕`, per-line total right-aligned mono. Stock conflicts surface inline as an amber strip on the row (`Only 2 left — quantity reduced`).
Right: sticky summary card — `Subtotal`, `Discount`, `Tax (8%)`, `Total` (mono, right-aligned, tabular), coupon input with `Apply`, then amber `CHECKOUT` full-width. Valid coupon renders a mint chip `SAVE20 · −$24.00 ✕`; invalid renders a rose helper line, never a toast alone.
Empty cart: centered, `--raised` panel, mono `CART EMPTY`, amber `Browse the floor`.

### 5.4 `/checkout`
Left column = 3 numbered steps in `--surface` cards, right column = sticky order summary (mirrors 5.3 plus per-line detail).
1. **Contact** — signed in: email shown read-only. Guest: email field + note `You can create an account after`.
2. **Shipping** — saved address radio cards (`+ New address` opens inline form). Selected card = `--amber` 1px border + amber radio.
3. **Payment** — Stripe Elements card form themed to the tokens (`--overlay` field bg, `--line` border, `--text` input color, `--rose` invalid). Below: `Pay $293.99` amber button, mono total in the label.
Persistent footer line, mono 12px: `Idempotency-Key: 8f3c…a91 · Reservation holds 10:00`. During submit the button becomes a determinate progress bar, never a spinner-only state. Error path: rose banner at the top of the failing step with the API message, form state preserved.

### 5.5 `/orders` and `/orders/:id`
List = dense table on desktop (`Order · Date · Items · Total · Status · →`), stacked cards on mobile. Order IDs and totals mono. Status chip per Section 1.3. Filter chips row across the top.

Detail page: header (`ORDER #FSE-10428`, mono, + status chip + placed date), then a horizontal **fulfillment rail**:
```text
●━━━━━━━●━━━━━━━●━━━━━━━○━━━━━━━○
PENDING  PAID   SHIPPED  DELIVERED
```
Completed nodes `--mint`, current node amber ring + pulse, future nodes `--line`. Cancelled/refunded orders replace the rail with a rose banner. Below: line items table, tracking card (carrier + mono tracking number + copy button), address card, and totals block. `Cancel order` (rose outline, confirm modal) renders only while `PENDING`.

### 5.6 `/wishlist`
Same card geometry as catalog with a filled amber heart, `Move to cart` on each card, and a `Move all in-stock to cart` action in the header.

### 5.7 Auth — `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password`
Split screen: left 50% `--surface` form column (max 420px, centered), right 50% `--base` panel with the live ticker stats stacked vertically in mono + a single oversized amber `●`. Mobile: form only. Fields are `--raised` with 10px radius and floating labels. Primary button amber, full width. Token-driven pages (verify/reset) show three explicit states: verifying (progress bar), success (mint), expired/invalid (rose + resend action).
After login: `role === 'admin'` → `/admin`, else → `/products`.

---

## 6. Admin Area (`/admin/*`)

Distinct chrome so no one confuses it with the storefront: **240px left rail** on `--surface`, `--violet` `ADMIN` pill under the wordmark, violet active-item indicator (storefront uses amber). Content area stays `--base`.

Rail: `Dashboard · Products · Categories · Coupons · Orders · Users · Outbox · Task logs`, with the last two grouped under a muted `INTERNAL` heading.

### 6.1 `/admin` — Dashboard
Four stat tiles across the top (`Revenue`, `Orders`, `Products`, `Users`) — mono 34px value, label caps above, delta line below in mint/rose. Then a 2-col row: orders-by-status bar list, and a `Recent orders` table (8 rows, click-through). Health strip pinned bottom: API / Redis / RabbitMQ / Celery with mint or rose dots.

### 6.2 `/admin/products`
Toolbar: search, category filter, status filter, amber `+ New product`. Dense table: thumb, name, SKU (mono), category, price (mono), total stock, variant count, active toggle, row actions. Expanding a row reveals an inline **variant sub-table** (size, color, SKU, price delta, stock, edit/delete) plus `+ Add variant` and a `Sync stock` action showing DB vs Redis counts side by side, mismatches highlighted amber.
Create/edit uses a right-side drawer (480px, `--overlay`, r20 on the left edge) with sections: Details, Pricing, Media, Variants. Destructive delete = confirm modal typing the product name.

### 6.3 `/admin/categories`
Two panes: left = hierarchical tree with drag-free indent and expand carets (parent/child via `parent_id`); right = detail form for the selected node. Inline `+ Add child`.

### 6.4 `/admin/coupons`
Table (code mono uppercase, type, value, uses/limit as `12 / 100` mono, expiry, status chip) + create drawer with a live preview line: `SAVE20 → −20% · max $50 · expires 2026-09-30`.

### 6.5 `/admin/orders`
Status filter chip row, dense table, row click → detail drawer with the same fulfillment rail as 5.5 plus admin controls: status select, carrier + tracking inputs, `Update`. Setting `REFUNDED` opens a rose confirm modal that states plainly that a Stripe refund will be issued; on success show the refund id in mono.

### 6.6 `/admin/users` (read-only) and internal views
Users: table with email, role chip (violet for admin), joined date, order count.
`/admin/outbox` and `/admin/task-logs`: monospace log tables on `--raised`, 12px, status dots, auto-refresh toggle, payload expands into a `--overlay` code block. Deliberately utilitarian — no styling investment beyond legibility.

---

## 7. Component Contracts

**Button** — variants: `primary` (amber fill / `--on-amber`), `secondary` (`--raised` fill, `--line` border), `ghost` (transparent, text `--text-dim`), `danger` (rose fill), `link` (sky underline). Sizes: `sm 32px`, `md 40px`, `lg 48px`; radius 10; mobile primary is always full width. Loading = inline 14px spinner + label unchanged, width locked.

**Input / Select / Textarea** — 40px (48 on mobile), `--raised` bg, `1px --line`, focus `--line-strong` + sky ring. Label caps above, helper 13px below, error swaps helper to rose and border to rose.

**Status pill** — 24px, `999px`, 6px dot + label caps 11px. Three fills: soft, outline, solid (per 1.3).

**Stock bar** — 4px tall, `999px`, `--line` track, 8 segments on cards / continuous on PDP; color per 1.3.

**Countdown** — mono, digit-roll, `HH:MM:SS`; under 60s the whole block turns amber and the seconds pulse.

**Quantity stepper** — pill, 32px, `−` / mono value / `+`, disabled `+` at stock ceiling with tooltip `Max available: N`.

**Toast (sonner)** — `--overlay`, r10, left 3px accent bar in mint/rose/amber, mono for any id or amount, 4s.

**Modal / Drawer / Sheet** — modal centered max 520px r20; drawer right 480px; mobile always a bottom sheet with a 36px grab handle. Scrim `rgba(0,0,0,0.6)`.

**Table** — header `--raised`, label caps, rows 52px, hairline between rows, hover `--raised`, numeric columns right-aligned mono. Below 640px each row renders as a stacked card with label/value pairs.

**Empty / Error / Loading** — every list defines all three. Empty: centered mono headline + one action. Error: rose banner + `Retry`. Loading: geometry-matched skeletons, opacity fade only.

---

## 8. Responsive & Mobile Parity

| Breakpoint | Behavior |
| --- | --- |
| < 640 | Bottom tab bar, single column, sheets over modals, sticky bottom action bar on PDP/cart/checkout, tables → cards |
| 640–1024 | 2–3 col grids, drawers instead of split panes, admin rail collapses to icons |
| > 1024 | Full layouts as blueprinted |

The mobile web layout **is** the Flutter layout spec: same bottom tabs, same sticky action bars, same sheet-first overlays. Build web mobile as if it were the app.

---

## 9. Accessibility
- WCAG AA contrast in both themes; never encode meaning in color alone — every status has a label, every stock state has a number.
- Full keyboard path: focus ring visible, `⌘K` palette, `Esc` closes overlays, focus trapped in modals and returned on close.
- Live regions: cart count, stock changes, and countdowns announce politely; payment errors assertively.
- Images require alt text; icon-only buttons require `aria-label`.

---

## 10. Do Not
- No purple/indigo SaaS gradients, glassmorphism, blur, neon glow, or floating hover lifts.
- No Inter, no Poppins, no default system-font-only styling.
- No spinners as a whole-page loading state, no layout shift when data arrives.
- No shadows below elevation level 3, no radius other than 10 / 20 / 999.
- No new colors outside Section 1 — extend the token table or don't ship it.
- No hardcoded color utilities in components.

---

## 11. Web Implementation Notes
- Define every Section 1 token as a CSS variable on `:root` and `.dark`, then map them to Tailwind theme colors so utilities read `bg-surface`, `text-text-dim`, `border-line`.
- Fonts via `<link>` in `index.html`; expose as `font-display` (Sora), `font-sans` (Manrope), `font-mono` (JetBrains Mono).
- Ship a small `<Money>`, `<Countdown>`, `<StockBar>`, and `<StatusPill>` primitive set — never format currency or status colors ad hoc in a page.
- Theme toggle persists to `localStorage`, defaults to dark, honors `prefers-color-scheme` on first visit only.

---

## 12. Flutter Mapping (build-later, design-now)

Keep these values identical to Section 1. When a token changes, change it in both places in the same commit.

```dart
// lib/theme/tokens.dart
class C {
  // dark (default)
  static const base       = Color(0xFF0B0D0C);
  static const surface    = Color(0xFF131715);
  static const raised     = Color(0xFF1B211E);
  static const overlay    = Color(0xFF232B27);
  static const line       = Color(0xFF2A332E);
  static const lineStrong = Color(0xFF3C4841);
  static const text       = Color(0xFFEDEFEA);
  static const textDim    = Color(0xFFA6AFA7);
  static const textMute   = Color(0xFF6E7A72);

  static const amber      = Color(0xFFF2A03D);
  static const amberPress = Color(0xFFD8862A);
  static const onAmber    = Color(0xFF1A1207);
  static const amberSoft  = Color(0xFF2A2113);
  static const mint       = Color(0xFF4FD4A0);
  static const mintSoft   = Color(0xFF12271F);
  static const sky        = Color(0xFF5AA9F2);
  static const skySoft    = Color(0xFF0F1F2E);
  static const rose       = Color(0xFFF2685E);
  static const roseSoft   = Color(0xFF2B1614);
  static const violet     = Color(0xFFA98BF0);
  static const violetSoft = Color(0xFF1D1730);
}

final darkScheme = const ColorScheme.dark(
  primary: C.amber,      onPrimary: C.onAmber,
  secondary: C.mint,     onSecondary: Color(0xFF06170F),
  tertiary: C.sky,       onTertiary: Color(0xFF04121F),
  error: C.rose,         onError: Color(0xFF260A08),
  surface: C.surface,    onSurface: C.text,
  surfaceContainerHighest: C.raised,
  outline: C.line,       outlineVariant: C.lineStrong,
);
```

Flutter conventions that mirror this spec:
- `scaffoldBackgroundColor: C.base`; cards = `Card(color: C.surface, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10), side: BorderSide(color: C.line)))`, `elevation: 0`.
- Type: `GoogleFonts.soraTextTheme()` for display/headline/title, `GoogleFonts.manrope` for body/label, `GoogleFonts.jetBrainsMono(fontFeatures: [FontFeature.tabularFigures()])` for every number.
- Radii: `10` cards/buttons/fields, `20` sheets (`showModalBottomSheet` with `RoundedRectangleBorder(top: 20)`), `StadiumBorder()` for pills/steppers.
- Navigation: `NavigationBar` with the same five destinations as mobile web (Shop, Search, Cart, Orders, Account); admin is web-only for v1.
- Spacing: an 8-point scale constant class matching Section 3.2 — no magic numbers in widgets.
- Motion: `Duration(milliseconds: 180)` default, `Curves.easeOutCubic`; `AnimatedFlipCounter`-style digit roll for timers; honor `MediaQuery.disableAnimations`.
- Auth: cookie-based JWT does not translate cleanly to mobile — plan for the backend to also return bearer tokens for the Flutter client, stored in `flutter_secure_storage`, never `SharedPreferences`.

---

## 13. Definition of Visual Done
- [ ] All Section 1 tokens exist as CSS variables and are the only source of color.
- [ ] Dark and light both pass AA on text, chips, and disabled states.
- [ ] Sora / Manrope / JetBrains Mono load correctly; every number is mono + tabular.
- [ ] Radii limited to 10 / 20 / 999; no shadow below elevation 3; no blur; no gradients.
- [ ] Every list surface has designed loading, empty, and error states.
- [ ] Storefront uses amber accents, admin uses violet — never mixed.
- [ ] Full flow (catalog → variant → cart → coupon → checkout → order tracking) is usable at 375px width.
- [ ] `reduced-motion` disables marquee, roll, and pulse.
- [ ] Token values in Section 1 and Section 12 match exactly.
