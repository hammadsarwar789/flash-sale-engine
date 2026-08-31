# Flash Sale Engine — Frontend Design Specification v2.2

**Handoff document for Antigravity & Engineering Team.** This specification defines the distinctive, editorial visual system and architectural UI contracts for the High-Scale Flash Sale Engine & E-Commerce Platform. Follow it to the letter — colors, fonts, spacing, layout blueprints, and interaction rules are strictly load-bearing.

---

## 0. Design Thesis — "Trading Floor Editorial"

This system rejects generic SaaS patterns (dark slate, cyan glows, glassmorphism, floating drop-shadows, and purple gradients). Instead, it treats high-concurrency flash sales and multi-tenant marketplace operations like a **live commodities market crossed with a prestige financial broadsheet**: high information density, tabular monospaced numerics, sharp 90-degree corners, restrained neutral bone/ink palettes, editorial serif typography for hierarchy, and a single aggressive accent (`--signal`) reserved exclusively for live drops, scarcity thresholds, and urgent real-time state changes.

### Guiding Principles:
1. **Paper, Not Glass.** No backdrop blur (`backdrop-filter: blur()`). No translucent floating panels. Solid surfaces with hairline `1px solid var(--rule)` borders.
2. **Type Does the Heavy Lifting.** Large editorial serif display paired with clean neutral grotesques and dense monospaced numerics carry complete visual hierarchy.
3. **One Loud Color, Everything Else Quiet.** Signal Red (`#E5321B`) is reserved for LIVE states, stock scarcity (<10%), and primary irreversible actions. Everything else is bone, paper, ink, graphite, and ash.
4. **Right Angles Only.** `border-radius: 2px` maximum on buttons/inputs; `border-radius: 0` on cards, panels, modals, tables, and product images.
5. **Numbers are Sacred.** Prices, inventory levels, countdown timers, order IDs, SKUs, and telemetry values always render in tabular monospace with `font-variant-numeric: tabular-nums`.

---

## 1. Color System

Light mode is primary and default. Dark mode is a strict photographic inversion — no new colored glows or synthetic neon hues are introduced.

### Design Tokens (defined in `:root` and `@media (prefers-color-scheme: dark)`)

| Token              | Light (hex)   | Dark (hex)    | Semantic Usage                                               |
| ------------------ | ------------- | ------------- | ------------------------------------------------------------ |
| `--bone`           | `#F4F1EA`     | `#0E0E0C`     | Root application canvas & page background                    |
| `--paper`          | `#FBF9F4`     | `#161613`     | Primary card, table, and panel surface                       |
| `--paper-sunk`     | `#EDE8DC`     | `#1F1F1B`     | Input fills, code blocks, quiet wells, table headers         |
| `--ink`            | `#111111`     | `#F1EEE6`     | Primary text, headlines, high-contrast buttons               |
| `--graphite`       | `#3A3A38`     | `#C8C4B8`     | Body copy, descriptions, secondary values                    |
| `--ash`            | `#7A776E`     | `#8A8779`     | Meta labels, timestamps, strikethrough original prices       |
| `--rule`           | `#1C1C1A`     | `#F1EEE6`     | Hairline borders (100% opacity structural, 12% soft divider) |
| `--signal`         | `#E5321B`     | `#FF4A32`     | LIVE drops, critical stock (<10%), urgent warnings, main CTA |
| `--signal-ink`     | `#FFFFFF`     | `#0E0E0C`     | Text rendered over `--signal` solid fills                    |
| `--gain`           | `#1F6B3A`     | `#4FBE7B`     | Confirmed / Paid / Shipped / In-stock (>30%) / Escrow paid   |
| `--warn`           | `#B8791A`     | `#E0A44A`     | Pending approval / Moderate stock (10–30%) / Outbox lag      |
| `--loss`           | `#8A1A12`     | `#E5321B`     | Cancelled / Refunded / Out of stock / Failed health checks   |
| `--marker`         | `#F5E6A8`     | `#5A4A18`     | Highlighter background for search query matches & new drops  |

### Hard Rules:
- **Never** use gradients (no linear-gradient, radial-gradient, or mesh backgrounds).
- **Never** use `backdrop-filter: blur()`.
- `--signal` must never exceed ~5% of the visible viewport area at any time. It acts as an urgent spotlight, not a brand wash.
- Status pills use text-color + hairline border with a 6px status dot (except `LIVE` badges, which are filled `--signal`).

---

## 2. Typography

Loaded via Google Fonts `<link>` in `index.html` (avoid blocking `@import` in CSS).

### Font Stacks:
- **Display / Headlines:** `"GT Sectra"`, `"Instrument Serif"`, `Georgia`, serif. Editorial serif with sharp bracketed serifs.
- **UI / Body / Controls:** `"Söhne"`, `"Inter Tight"`, `system-ui`, sans-serif. Neutral geometric grotesque.
- **Numerics / Telemetry / SKUs / Timers:** `"JetBrains Mono"`, `ui-monospace`, monospace. Always enforce `font-variant-numeric: tabular-nums`.

### Type Scale (Desktop — scaled 0.85× on Mobile <640px)

| Role                   | Family | Size / Line-Height | Weight | Letter Spacing | CSS Equivalent |
| ---------------------- | ------ | ------------------ | ------ | -------------- | -------------- |
| Display Hero           | Serif  | 88px / 88px        | 400    | -0.02em        | `font-serif text-[88px] leading-none` |
| H1 Page Title          | Serif  | 56px / 60px        | 400    | -0.015em       | `font-serif text-[56px] leading-[60px]` |
| H2 Section Heading     | Serif  | 36px / 40px        | 400    | -0.01em        | `font-serif text-[36px] leading-[40px]` |
| H3 Card / Sub-Heading  | Sans   | 18px / 24px        | 500    | -0.005em       | `font-sans text-[18px] font-medium` |
| Body Copy              | Sans   | 15px / 24px        | 400    | 0              | `font-sans text-[15px] text-graphite` |
| Small / Meta           | Sans   | 12px / 16px        | 500    | +0.04em        | `font-sans text-[12px] text-ash` |
| Eyebrow / Label (Caps) | Sans   | 11px / 14px        | 600    | +0.14em        | `font-sans text-[11px] uppercase tracking-widest` |
| Price / Numeric Large  | Mono   | 32px / 32px        | 500    | -0.02em        | `font-mono text-[32px] tabular-nums` |
| Price / Numeric Inline | Mono   | 14px / 20px        | 500    | 0              | `font-mono text-[14px] tabular-nums` |
| Code / SKU / Order ID  | Mono   | 12px / 16px        | 400    | 0              | `font-mono text-[12px] tabular-nums` |

---

## 3. Layout, Grid & Spacing

### 3.1 Grid System
- **Desktop (>1024px):** 12-column grid, `1440px` max canvas width, `72px` margin gutters, `24px` column gaps.
- **Tablet (640px–1024px):** 8-column grid, `32px` margin gutters.
- **Mobile (<640px):** 4-column grid, `20px` margin gutters.
- Content is strictly **left-aligned to the grid lines**, never centered in ambiguous space (except auth cards and alert modals).

### 3.2 Spacing Scale (px)
`4, 8, 12, 16, 24, 32, 48, 72, 120, 200`.

### 3.3 Borders, Corners & Elevation
- Panels, cards, tables, modals: `border: 1px solid var(--rule)`, `border-radius: 0`.
- Buttons, inputs, pills: `border-radius: 2px`.
- Images: `border-radius: 0`, `border: 1px solid var(--rule)`.
- **Zero Shadows:** Elevation is expressed solely by crisp border hierarchy and background shifts between `--bone`, `--paper`, and `--paper-sunk`.

### 3.4 Micro-Interactions & Motion
- Durations: `120ms` for hover transitions, `200ms` for state switches, `400ms` for page transitions.
- Approved Animations:
  1. **Ticker Marquee:** Continuous smooth horizontal scroll for live engine telemetry.
  2. **Digit Flip / Roll:** 1-line vertical slide roll on numeric countdown timers and stock counters.
  3. **Pulsing Indicator:** 1-second interval pulse on the 6px `--signal` LIVE indicator only.
- Banned: Hover card lifts (`translateY`), shimmering skeleton gradients, floating glow shadows, and parallax scroll effects.

---

## 4. Global Chrome Specifications

### 4.1 Live Ticker Bar (`TickerBar.tsx`)
- Height: Fixed 32px across full viewport width.
- Surface: `--ink` background, `--signal-ink` text, `font-mono text-xs uppercase tracking-wider`.
- Behavior: Continuous right-to-left marquee displaying real-time events, drop countdowns, and system orders/min.
- Format: `▲ CYBER JACKET / BLACK / M — 3 LEFT · SOLD OUT: NEON SNEAKERS · DROP IN 00:14:22 · ORDERS/MIN: 428 ·`

### 4.2 Primary Navigation (`Navbar.tsx`)
- Height: 72px. Background `--paper`. Bottom border: `1px solid var(--rule)`.
- **Left:** Wordmark: serif `FLASH` in `--ink`, `/` separator in `--signal`, `SALE` in `--ink`.
- **Center:** Route links (`Catalog`, `Live Drops`, `Orders`, `Wishlist`, `Vendor Portal`, `Support Desk`). Active link marked with a 2px `--signal` bottom border indicator.
- **Right:**
  - `[ Search ⌘K ]` Command-palette trigger chip.
  - `[ Cart · {count} · ${total} ]` Monospaced item count and running subtotal.
  - User square monogram badge (`[ JD ]`) or `[ SIGN IN ]` button.

### 4.3 Footer Colophon (`Footer.tsx`)
- Surface: `--ink` background, `--bone` text, `1px solid var(--rule)`.
- 3-Column Layout:
  1. **Colophon:** Wordmark, editorial issue statement, build hash, active region (`us-east-1`).
  2. **Directories:** Direct links to Customer Catalog, Vendor Portal, Support Desk, API Docs, Legal.
  3. **Live Health Telemetry:** Monospaced uptime figures with 6px status squares (`API 99.982% ●` · `PAYMENTS 100% ●` · `REDIS CLUSTER 99.994% ●`).

---

## 5. Page Blueprints & ASCII Layout Wireframes

### 5.1 Product Catalog Floor — `/products`

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [ TICKER BAR: LIVE DROPS · ORDERS/MIN: 428 ]                                 │
│ [ NAVBAR: FLASH/SALE   Catalog   Orders   Wishlist   Vendor   [Cart · $269] ]│
├──────────────────────────────────────────────────────────────────────────────┤
│ ISSUE Nº 042 — WEEK OF AUG 29                             ALL PRICES IN USD  │
│                                                                              │
│ The Flash                                                                    │
│ Sale Floor.                                                       (serif 88) │
│                                                                              │
│ 1,204 items · 42 live drops · next drop in 00:14:22                          │
├──────────────────────────────────────────────────────────────────────────────┤
│ CATEGORY   ● All  Outerwear  Footwear  Tech  Accessories   │  SORT  ▾ Newest │
├──────────────────────────────────────────────────────────────────────────────┤
│ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐     │
│ │ Nº 001        │ │ Nº 002 · LIVE │ │ Nº 003        │ │ Nº 004        │     │
│ │               │ │               │ │               │ │               │     │
│ │   [ IMAGE ]   │ │   [ IMAGE ]   │ │   [ IMAGE ]   │ │   [ IMAGE ]   │     │
│ │               │ │               │ │               │ │               │     │
│ │ Cyber Jacket  │ │ Neon Sneakers │ │ Field Tote    │ │ Signal Cap    │     │
│ │ Outerwear     │ │ Footwear      │ │ Accessories   │ │ Accessories   │     │
│ │ $099.99       │ │ $199.98       │ │ $049.00       │ │ $029.00       │     │
│ │ ▓▓▓▓▓░░░ 14   │ │ ▓░░░░░░░  3   │ │ ▓▓▓▓▓▓▓▓ 84   │ │ ▓▓▓▓▓▓░░ 42   │     │
│ └───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘     │
├──────────────────────────────────────────────────────────────────────────────┤
│                              ← 001–024 of 1,204 →                            │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Stock Bar:** Rendered with block characters (`▓` filled, `░` remaining) in monospace.
- **Card Action:** Clicking a product card navigates to `/products/:id`. No inline add-to-cart buttons on the floor grid.

---

### 5.2 Product Detail Page — `/products/:id`

Two-column 60/40 split: vertical editorial image stack on the left, sticky spec sheet on the right.

```
┌───────────────────────────────────────────┬───────────────────────────────┐
│ ← BACK TO FLOOR                           │ Nº 002 · LIVE                 │
│                                           │                               │
│                                           │ Neon                          │
│                                           │ Sneakers.               (56)  │
│ ┌───────────────────────────────────────┐ │                               │
│ │                                       │ │ ─────────────────────────────  │
│ │             [ IMAGE 1 ]               │ │ SKU        FL-8921            │
│ │                                       │ │ CATEGORY   FOOTWEAR           │
│ │                                       │ │ RATING     ★★★★☆  4.2 (24)    │
│ └───────────────────────────────────────┘ │ ─────────────────────────────  │
│ ┌───────────────────────────────────────┐ │                               │
│ │             [ IMAGE 2 ]               │ │ PRICE                         │
│ └───────────────────────────────────────┘ │ $199.98                       │
│ ┌───────────────────────────────────────┐ │ was $259.98 · save 23%        │
│ │             [ IMAGE 3 ]               │ │                               │
│ └───────────────────────────────────────┘ │ ─────────────────────────────  │
│                                           │ COLOR                         │
│                                           │ [ ● Black ] [ ○ Cyber Blue ]  │
│                                           │                               │
│                                           │ SIZE                          │
│                                           │ [ 8 ] [ 9 ] [10] [11] [12]    │
│                                           │                               │
│                                           │ STOCK    ▓░░░░░░░  3 LEFT     │
│                                           │                               │
│                                           │ QTY   [ − ]  01  [ + ]        │
│                                           │                               │
│                                           │ ┌───────────────────────────┐ │
│                                           │ │  ADD TO CART — $199.98    │ │
│                                           │ └───────────────────────────┘ │
│                                           │  ─── or ───                   │
│                                           │  [ ADD TO WISHLIST ]          │
└───────────────────────────────────────────┴───────────────────────────────┘
```

---

### 5.3 Cart & Hold Reservation — `/cart`

```
┌──────────────────────────────────────────────────────────┬────────────────┐
│ Cart.                                            (56)    │ SUMMARY        │
│ 03 items reserved · hold expires 04:59                   │                │
│                                                          │ SUBTOTAL       │
├──────────────────────────────────────────────────────────┤ $299.97        │
│ Nº 01                                                    │                │
│ ┌────┐  Cyber Jacket                          $099.99    │ SHIPPING       │
│ │IMG │  BLACK · M · SKU FL-8921               ─────────  │ FREE           │
│ └────┘  QTY [−] 01 [+]                        [ REMOVE ] │                │
├──────────────────────────────────────────────────────────┤ COUPON         │
│ Nº 02                                                    │ FLASH30        │
│ ┌────┐  Neon Sneakers                         $199.98    │ −$030.00       │
│ │IMG │  CYBER BLUE · 10 · SKU FL-3320         ─────────  │                │
│ └────┘  QTY [−] 02 [+]                        [ REMOVE ] │ ─────────────  │
├──────────────────────────────────────────────────────────┤ TOTAL          │
│ [ + APPLY PROMO CODE ]                                   │ $269.97        │
│                                                          │ ┌────────────┐ │
│                                                          │ │ CHECKOUT → │ │
│                                                          │ └────────────┘ │
└──────────────────────────────────────────────────────────┴────────────────┘
```

- **Hold Expiration Warning:** Monospace countdown timer turns `--signal` when remaining time is ≤ 60 seconds.

---

### 5.4 Checkout & Stripe Payment — `/checkout`

Single-column linear spec layout (max 720px wide) with idempotency key attachment.

```
Nº 01  SHIPPING & FULFILLMENT ADDRESS
       ─────────────────────────────────────────────────────────────────
       Full Name          [ Jordan Bellfort                           ]
       Street Address     [ 100 Wall Street, Suite 400                ]
       City / Postal Code [ New York                ] [ 10005         ]
       Country            [ United States                           ▾ ]

Nº 02  PAYMENT METHOD (STRIPE ELEMENTS / CARD INTENT)
       ─────────────────────────────────────────────────────────────────
       Card Number        [ 4242 •••• •••• 4242                       ]
       Expiry / CVC       [ 12/28 ]  [ 888 ]
       Cardholder Name    [ Jordan Bellfort                           ]

Nº 03  REVIEW & IDEMPOTENT SUBMISSION
       ─────────────────────────────────────────────────────────────────
       2 items · Tax calculated ($21.60) · Total: $291.57
       Idempotency-Key: idemp_99a8f21b-4491-4c91-9a72

       ┌───────────────────────────────────────────────────────────────┐
       │  PLACE ORDER & AUTHORIZE — $291.57                            │
       └───────────────────────────────────────────────────────────────┘
       Encrypted 256-bit TLS · Direct Stripe Webhook Settlement
```

---

### 5.5 Orders List & Fulfillment Stepper — `/orders` & `/orders/:id`

```
ORD Nº      DATE          ITEMS   TOTAL       STATUS         TRACKING
─────────────────────────────────────────────────────────────────────────────
ORD-98421   27 AUG 2026   03      $269.97     ● SHIPPED      TRK-88192301
ORD-98410   26 AUG 2026   01      $049.00     ● DELIVERED    TRK-88192200
ORD-98399   25 AUG 2026   02      $158.00     ○ PENDING      —
```

**Order Detail / Stepper Modal (`/orders/:id`):**
```
ORDER ORD-98421                                       PLACED: 27 AUG 2026 14:02 UTC
STATUS: SHIPPED                                       CARRIER: FEDEX EXPRESS (TRK-88192301)
────────────────────────────────────────────────────────────────────────────────────
[ PENDING ] ════════ [ PAID ] ════════ [ SHIPPED ] ──────── [ DELIVERED ]
   14:02 UTC            14:03 UTC         16:45 UTC            (Estimated 29 Aug)

ITEMS PURCHASED:
• Cyber Jacket (Black / M) × 1 ────────────────────────────── $099.99
• Neon Sneakers (Cyber Blue / 10) × 1 ─────────────────────── $199.98
Subtotal: $299.97 | Discount: -$30.00 | Shipping: FREE | Total Paid: $269.97
────────────────────────────────────────────────────────────────────────────────────
[ CANCEL ORDER ] (Disabled after transition to PAID/SHIPPED)
```

---

### 5.6 Vendor Merchant Portal — `/vendor`

The multi-tenant merchant control floor for vendor onboarding, catalog lifecycle, sub-order fulfillment, finance ledger, and Shopify omni-channel inventory sync.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ VENDOR MERCHANT PORTAL — KINETIC APPAREL LABS                   KYC: APPROVED│
│ Balance: $14,820.00 · Escrow Held: $3,210.00 · Next Payout: 01 SEP 2026      │
├──────────────────────────────────────────────────────────────────────────────┤
│ TABS: [ OVERVIEW ]  [ SUB-ORDERS (14) ]  [ PRODUCTS (8) ]  [ FINANCE ]       │
├──────────────────────────────────────────────────────────────────────────────┤
│ ┌─ SHOPIFY MULTI-CHANNEL SYNC ─────────────────────────────────────────────┐ │
│ │ Status: CONNECTED (kinetic-store.myshopify.com)                          │ │
│ │ Auto-Sync Inventory: [ ON ]  ·  Auto-Export Orders: [ ON ]               │ │
│ │ Last Sync: 2 mins ago · 142 SKUs Synchronized · Webhook: Active (200 OK) │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ SUB-ORDERS AWAITING FULFILLMENT:                                             │
│ SUB-ORD Nº    PARENT ORD   PRODUCT / VARIANT         QTY   STATUS   ACTION   │
│ ───────────────────────────────────────────────────────────────────────────  │
│ SUB-8821      ORD-98421    Cyber Jacket (Black / M)   01   PENDING  [SHIP]   │
│ SUB-8819      ORD-98418    Field Tote (Olive / OS)    02   SHIPPED  [TRACK]  │
│                                                                              │
│ VENDOR SKU CATALOG & VARIANT MATRIX:                                         │
│ SKU         TITLE                  PRICE     STOCK   SHOPIFY SYNC   ACTIONS  │
│ ───────────────────────────────────────────────────────────────────────────  │
│ FL-8921     Cyber Jacket           $099.99   14      ● SYNCED       [EDIT]   │
│   ├─ M-BLK    Variant: Medium/Blk  $099.99   08      ● SYNCED                │
│   └─ L-BLK    Variant: Large/Blk   $099.99   06      ● SYNCED                │
│ FL-3320     Neon Sneakers          $199.98   03      ● SYNCED       [EDIT]   │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

### 5.7 Customer Support & AI Desk — `/support`

Role-aware support portal supporting real-time ticket messaging, AI RAG copilot suggestions, and automated return processing.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ SUPPORT DESK & AI COPILOT                      ACTIVE TICKETS: 08 · SLA: 98% │
├──────────────────────────────────────┬───────────────────────────────────────┤
│ TICKET QUEUE (Filter: All ▾)         │ TICKET TCK-4410: SIZING INQUIRY       │
│                                      │ Customer: alex@tech.io · ORD-98421    │
│ ● TCK-4410  Sizing Inquiry (Cyber)   ├───────────────────────────────────────┤
│   From alex@tech.io · 12m ago        │ [14:10] Customer: Hi, does the Cyber  │
│ ○ TCK-4402  Return Request #98399    │ Jacket run slim or standard boxy fit? │
│   From sarah@corp.io · 1h ago        │                                       │
│ ○ TCK-4389  Stripe Payment Issue     ├───────────────────────────────────────┤
│   From dev@pay.net · 3h ago          │ ┌─ AI RAG COPILOT SUGGESTION (94%) ─┐ │
│                                      │ │ "The Cyber Jacket is cut in an    │ │
│                                      │ │ editorial relaxed boxy silhouette.│ │
│                                      │ │ Source: tech_specs_jacket_v2.pdf  │ │
│                                      │ │ [ INSERT SUGGESTED RESPONSE ]     │ │
│                                      │ └───────────────────────────────────┘ │
│                                      │ [ Enter response message...         ] │
│                                      │ [ SEND REPLY ]   [ RESOLVE TICKET ]   │
└──────────────────────────────────────┴───────────────────────────────────────┘
```

---

### 5.8 Admin Control Floor & Telemetry — `/admin` & `/staff`

Admin control room featuring dense telemetry KPI cells, outbox event logs, Celery task monitors, seller approvals, role matrix, and local outlet inventory replenishment.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ADMIN CONTROL FLOOR                                            USER: ROOT_ADM│
├──────────────────────────────────────────────────────────────────────────────┤
│ REVENUE 24H   ORDERS 24H   AOV        ACTIVE HOLDS   REDIS HITS/S   OUTBOX LAG│
│ $142,850.00   1,420        $100.60    42             12,480/s       0.02s     │
├──────────────────────────────────────────────────────────────────────────────┤
│ TABS: [ TELEMETRY ] [ PRODUCTS ] [ APPROVALS ] [ ROLES ] [ OUTLETS ] [ PAY ] │
├──────────────────────────────────────────────────────────────────────────────┤
│ OPERATIONAL EVENT STREAM (OUTBOX & WORKER LOGS):                             │
│ TIMESTAMP     EVENT_TYPE                 PAYLOAD REF       STATUS   LAG      │
│ ──────────────────────────────────────────────────────────────────────────── │
│ 14:02:18.019  order.inventory.deducted   ORD-98421/SKU-89  ● 200    0.012s   │
│ 14:02:17.882  payment.stripe.succeeded   ch_3Mq892100A     ● 200    0.008s   │
│ 14:02:16.441  vendor.payout.requested    VEN-402 ($1,400)  ○ QUEUED 0.120s   │
│                                                                              │
│ PENDING VENDOR ONBOARDING & KYC APPROVALS:                                   │
│ SELLER NAME           TAX ID / REG        STATUS     DOCUMENTS      ACTION   │
│ ──────────────────────────────────────────────────────────────────────────── │
│ Neo Tokyo Craft       REG-9912048         ○ PENDING  [ VIEW KYC ]   [APPROVE]│
│ Cybernetic Stitch     REG-4481023         ○ PENDING  [ VIEW KYC ]   [REJECT] │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

### 5.9 Authentication Suites — `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`

Strict 50/50 horizontal viewport split. Left side is solid `--ink` with monumental editorial quote; right side is clean `--paper` with crisp label-above inputs.

```
┌──────────────────────────────────────┬───────────────────────────────────────┐
│                                      │ Sign In.                              │
│                                      │ Enter your credentials to access the  │
│                                      │ flash sale floor.                     │
│                                      │                                       │
│ "High velocity                       │ EMAIL ADDRESS                         │
│ commerce demands                     │ [ user@domain.com                   ] │
│ absolute precision                   │                                       │
│ and zero latency."                   │ PASSWORD                              │
│                                      │ [ •••••••••••••••••                 ] │
│                                      │                                       │
│                                      │ [ SIGN IN TO ACCOUNT →              ] │
│                                      │                                       │
│ ISSUE Nº 042 · FLASH SALE ENGINE     │ [ Forgot Password? ]  ·  [ Register ] │
└──────────────────────────────────────┴───────────────────────────────────────┘
```

---

## 6. Components & UI Contract Specifications

| Component Primitive | Visual System Shape & Rules | Technical Notes / Key Props |
| ------------------- | --------------------------- | --------------------------- |
| `<Numeric />`       | Tabular monospace, zero-padded, `--ink` or `--graphite`. | Applies `font-mono tabular-nums`. Supports `value`, `prefix`, `padZeros`, `strikethrough`. |
| `<Eyebrow />`       | Monospaced / Sans uppercase, 11px, tracked `+0.14em`. | Used for table headers, form labels, SKU prefixes, status bars. |
| `<StatusDot />`     | 6px geometric square with strict semantic fill. | `--gain` (confirmed), `--warn` (pending), `--loss` (failed/cancelled), `--signal` (live). |
| `<Button />`        | 44px (standard) or 56px (hero CTA), radius 2px, no shadow. | `variant="primary"` (`--ink`), `variant="signal"` (`--signal`), `variant="ghost"` (`1px --rule`). |
| `<Input />`         | `--paper-sunk` background, no side borders, 2px focus line. | Label rendered strictly above in `<Eyebrow />` style. Never floating placeholder. |
| `<StockBar />`      | Mono text block characters `▓▓▓▓▓░░░`. | Dynamic color shift: `--gain` (>30%), `--warn` (10–30%), `--signal` (<10%). |
| `<ShopifyToggle />` | Inline 1px bordered panel with live webhook status indicator. | Controls real-time two-way synchronization for products and orders. |
| `<ShopifyOrdersBox />` | Dedicated table slice showing incoming multi-channel orders. | Monospaced external IDs, automatic fulfillment push status. |
| `<Modal />`         | Sharp 90-degree corners, `1px solid var(--rule)`, max 560px. | Solid backdrop: `rgba(17, 17, 17, 0.6)` without backdrop blur. |
| `<Toast />`         | Bottom-left positioning, solid `--ink` fill, `--paper` text. | 4000ms auto-dismiss. No floating gradients or decorative icons. |

---

## 7. Role-Based Access Control (RBAC) & Route Matrix

| Route Path | Allowed Roles | Description | Unauthenticated Action |
| ---------- | ------------- | ----------- | ---------------------- |
| `/products`, `/products/:id` | Public (All) | Catalog & Product Detail | Allowed |
| `/cart`, `/checkout` | Public / Guest / Customer | Shopping cart and Stripe payment | Guest permitted |
| `/orders`, `/orders/:id` | Customer, Admin | Order history and fulfillment detail | Redirect to `/login` |
| `/wishlist` | Customer | Saved products | Redirect to `/login` |
| `/vendor` | Vendor (`seller`), Admin | Merchant portal & Shopify sync | Redirect to `/login` |
| `/support` | Customer, Support Agent, Admin | Customer support & AI triage desk | Redirect to `/login` |
| `/staff` | Stock Operator, Manager, Admin | Store inventory replenishment | Redirect to `/products` |
| `/admin/*` | Admin, Super Admin, Manager | Telemetry, KYC, RBAC, Financial Ledger | Redirect to `/products` |

---

## 8. Responsive Adaptations

| Viewport Width | Grid System | Layout Behaviors |
| -------------- | ----------- | ---------------- |
| `< 640px` (Mobile) | 4-Column, 20px margins | 1-Column product grid. PDP collapses to vertical image stack above sticky bottom CTA. Top ticker bar remains active. Navbar collapses to Wordmark + Cart chip. |
| `640px–1024px` (Tablet) | 8-Column, 32px margins | 2-Column product grid. Cart summary stacks beneath line items. Admin and Vendor side navigation converts to top segmented bar. |
| `> 1024px` (Desktop) | 12-Column, 72px margins | Full desktop layouts as depicted in Section 5 ASCII Blueprints. |

---

## 9. Accessibility & Screen Reader Standards

1. **Focus Indicators:** Explicit 2px `--signal` focus outline with 2px offset on all keyboard-navigable elements (`:focus-visible`).
2. **Contrast Ratios:**
   - Body copy (`--graphite` on `--paper`): **8.9:1** (exceeds WCAG AAA).
   - High-contrast headlines (`--ink` on `--bone`): **15.2:1**.
   - Signal Red (`--signal` on `--paper`): **4.6:1** (meets WCAG AA for large text/CTAs).
3. **Live Regions:** Dynamic timers, ticker feeds, and stock counters are wrapped in `aria-live="polite"` with `aria-atomic="false"`.
4. **Reduced Motion:** When `prefers-reduced-motion: reduce` is active, disable the marquee ticker scroll and roll digit animations.

---

## 10. Explicit Anti-Patterns & Prohibitions

Antigravity and engineers must never introduce the following:

1. **No Gradients:** Linear, radial, or mesh gradients are banned across all buttons, cards, and backgrounds.
2. **No Backdrop Blur:** `backdrop-filter: blur(...)` is prohibited app-wide.
3. **No Rounded Cards:** Cards, modals, tables, and product imagery must have `border-radius: 0`.
4. **No Drop Shadows:** `box-shadow` is prohibited everywhere. Elevation is achieved solely by border and surface tones.
5. **No Bolding of Serif Headlines:** Editorial serifs derive presence from size, not bold weight.
6. **No Proportional Pricing:** Prices, countdowns, and SKU values must always be monospaced and tabular.
7. **No Shimmer Skeletons:** Loading states are represented by solid `--paper-sunk` rectangles with a quiet monospaced indicator.
8. **Single Signal CTA Rule:** Only **one** filled `--signal` button is permitted per viewport to maintain high-urgency focus.

---

## 11. Implementation Reference Summary

- **Framework:** React 18 + Vite + TypeScript (Strict Mode) + TanStack Query + React Router v6.
- **Styling Architecture:** Tailwind CSS paired with CSS Custom Property tokens declared in `src/index.css`.
- **Authentication:** HttpOnly session cookies with automatic 401 refresh token retry interceptor in `src/api/client.ts`.
- **Checkout Integrity:** Mandatory `Idempotency-Key` header (UUID v4) on order placement and guest checkout requests.
- **Component Foundations:** Standardize on `<Numeric />`, `<Eyebrow />`, `<StatusDot />`, and semantic table layouts across all new views.

*End of Frontend Design Specification v2.2.*
