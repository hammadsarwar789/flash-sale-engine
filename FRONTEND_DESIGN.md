# Flash Sale Engine — Frontend Design Specification v2

**Handoff document for Antigravity.** This spec replaces the previous glassmorphic dark-mode direction. It defines a distinctive, editorial visual system for the High-Scale Flash Sale Engine & E-Commerce Platform. Follow it to the letter — colors, fonts, spacing, and layout rules are all load-bearing.

---

## 0. Design Thesis — "Trading Floor Editorial"

The previous design read as generic AI SaaS: dark slate + cyan glow + purple gradients + glass blur. This version rejects that. The new direction treats a flash sale like a **live commodities market crossed with a print magazine**: high information density, monospaced numerics, sharp corners, restrained color, editorial serif headlines, and a single aggressive accent used only for live/urgency states.

Guiding principles:
1. **Paper, not glass.** No backdrop blur. No translucent panels. No mesh gradients. Solid surfaces with hairline borders.
2. **Type does the work.** Big serif display + monospace numerics carry hierarchy. Icons are minimal.
3. **One loud color, everything else quiet.** Signal Red is reserved for live/scarce/urgent. Everything else is bone, ink, and graphite.
4. **Right angles.** `border-radius: 2px` maximum on interactive elements; `0` on cards and panels.
5. **Numbers are sacred.** Prices, stock counts, timers, and IDs always render in tabular monospace with `font-variant-numeric: tabular-nums`.

---

## 1. Color System

Light mode is primary. Dark mode is a strict inversion — do not introduce new hues for dark mode.

### Tokens (define as CSS custom properties on `:root`)

| Token              | Light (hex)   | Dark (hex)    | Usage                                                        |
| ------------------ | ------------- | ------------- | ------------------------------------------------------------ |
| `--bone`           | `#F4F1EA`     | `#0E0E0C`     | App background                                               |
| `--paper`          | `#FBF9F4`     | `#161613`     | Card / panel surface                                         |
| `--paper-sunk`     | `#EDE8DC`     | `#1F1F1B`     | Inputs, table stripes, quiet wells                           |
| `--ink`            | `#111111`     | `#F1EEE6`     | Primary text, headlines                                      |
| `--graphite`       | `#3A3A38`     | `#C8C4B8`     | Body text                                                    |
| `--ash`            | `#7A776E`     | `#8A8779`     | Secondary text, meta, timestamps                             |
| `--rule`           | `#1C1C1A`     | `#F1EEE6`     | Hairline borders (used at 100% for structural, 12% for soft) |
| `--signal`         | `#E5321B`     | `#FF4A32`     | LIVE, low stock, urgent CTAs — **use sparingly**             |
| `--signal-ink`     | `#FFFFFF`     | `#0E0E0C`     | Text on `--signal` fills                                     |
| `--gain`           | `#1F6B3A`     | `#4FBE7B`     | Confirmed / paid / shipped / in-stock                        |
| `--warn`           | `#B8791A`     | `#E0A44A`     | Pending / low stock warning                                  |
| `--loss`           | `#8A1A12`     | `#E5321B`     | Refunded / cancelled                                         |
| `--marker`         | `#F5E6A8`     | `#5A4A18`     | Highlighter background for search matches / new arrivals     |

### Rules
- **Never** use gradients. Not on buttons, banners, backgrounds, or badges. Flat fills only.
- **Never** use `backdrop-filter: blur()`. Anywhere.
- **Never** introduce cyan, purple, pink, or emerald from the previous spec.
- `--signal` may cover at most ~5% of the visible viewport at any time. It is a spotlight, not a wash.
- Status pills use text-color + hairline border, not filled chips (except LIVE, which is filled `--signal`).

---

## 2. Typography

Load via Google Fonts `<link>` in the root head — do not `@import` in CSS.

### Families
- **Display / Headline:** `"GT Sectra"` → fallback `"Instrument Serif"`, `Georgia`, serif. Editorial serif with sharp bracketed serifs.
- **UI / Body:** `"Söhne"` → fallback `"Inter Tight"`, `system-ui`, sans-serif. Tight, neutral grotesque.
- **Numerics / Code / IDs / Prices / Timers:** `"JetBrains Mono"` → fallback `ui-monospace`, monospace. Always `font-variant-numeric: tabular-nums`.

If licensed fonts are unavailable, fall back to `Instrument Serif` + `Inter Tight` + `JetBrains Mono` (all Google Fonts, free).

### Type scale (desktop; scale 0.85× on mobile)

| Role                   | Family  | Size / Line     | Weight | Tracking  |
| ---------------------- | ------- | --------------- | ------ | --------- |
| Display (hero)         | Serif   | 88px / 88px     | 400    | -0.02em   |
| H1 (page title)        | Serif   | 56px / 60px     | 400    | -0.015em  |
| H2 (section)           | Serif   | 36px / 40px     | 400    | -0.01em   |
| H3 (card title)        | Sans    | 18px / 24px     | 500    | -0.005em  |
| Body                   | Sans    | 15px / 24px     | 400    | 0         |
| Small / Meta           | Sans    | 12px / 16px     | 500    | +0.04em   |
| Eyebrow / Label (caps) | Sans    | 11px / 14px     | 600    | +0.14em   |
| Price / Numeric large  | Mono    | 32px / 32px     | 500    | -0.02em   |
| Price / Numeric inline | Mono    | 14px / 20px     | 500    | 0         |
| Code / ID / SKU        | Mono    | 12px / 16px     | 400    | 0         |

Rules:
- All labels (`STATUS`, `SKU`, `STOCK`, `PRICE`, category chips) render in the **Eyebrow** style: UPPERCASE, tracked +0.14em.
- Headlines are serif. Never bold a serif headline — weight comes from size, not weight.
- Body copy is `--graphite`, never pure `--ink`.
- Prices always monospace, always tabular. Original prices use `text-decoration: line-through` in `--ash`; discounted prices in `--ink`.

---

## 3. Layout, Grid, Spacing

### Grid
- **12-column** grid, `1440px` max canvas width, `72px` gutter on desktop.
- On mobile: 4-column, `20px` gutter.
- Content is **left-aligned to the grid**, never centered on the page (except modals and auth cards).

### Spacing scale (px)
`4, 8, 12, 16, 24, 32, 48, 72, 120, 200`. Use only these values.

### Borders & corners
- Cards / panels / tables: `border: 1px solid var(--rule)`, `border-radius: 0`.
- Buttons / inputs / pills: `border-radius: 2px`.
- Images / product photos: `border-radius: 0`, `border: 1px solid var(--rule)`.
- No shadows. Anywhere. Elevation is expressed by border + surface color, not blur.

### Motion
- Duration: `120ms` for hover, `200ms` for state changes, `400ms` for page transitions. Easing: `cubic-bezier(0.2, 0, 0, 1)`.
- Only two animations exist app-wide:
  1. **Ticker scroll** — horizontal marquee on the LIVE bar.
  2. **Digit flip** — countdown timers and live stock counters use a subtle 1-line vertical roll on value change.
- No fade-in-on-scroll. No hover lifts. No pulsing glows.

---

## 4. Global Chrome

### 4.1 Live Ticker Bar (top, above navbar) — `TickerBar.tsx`
Fixed 32px band across the full width. Background `--ink`, text `--signal-ink`, monospace 12px UPPERCASE, tracked +0.1em. Continuously scrolls right-to-left showing live sale events:
`▲ CYBER JACKET / BLACK / M — 3 LEFT · SOLD OUT: NEON SNEAKERS / SIZE 9 · NEW DROP IN 00:14:22 · ORDERS/MIN: 428 ·`
A pulsing 6px `--signal` square precedes the word `LIVE` at the far left. This is the only place pulse animation is allowed.

### 4.2 Navbar — `Navbar.tsx`
Height 72px. Background `--paper`. Bottom border `1px solid var(--rule)`.

Layout (left → right):
```
[ FLASH/SALE ]     Catalog   Live Drops   Orders   Wishlist(3)     [ Search ⌘K ]   [ Cart · 2 · $269.97 ]   [ JD ]
```
- Wordmark: serif `FLASH` in `--ink`, slash separator in `--signal`, `SALE` in `--ink`. No icon.
- Nav links: sans 14px, `--graphite`, active state = `--ink` with 2px `--signal` underline offset 20px below.
- Search: a keyboard-cue chip (`⌘K`) that opens a full-screen command-palette overlay (not a header input).
- Cart: shows item count AND live subtotal in monospace. No icon required.
- Avatar is a 32px square (not circle) with monogram initials in serif.

### 4.3 Footer — `Footer.tsx`
`--ink` background, `--bone` text. Three-column grid:
1. Colophon: wordmark, one-sentence description, build hash + region (mono 11px).
2. Navigation columns (Catalog, Account, Legal).
3. System status: three lines with monospace uptime figures (`API 99.982%` · `PAYMENTS 100.000%` · `INVENTORY 99.994%`). A 6px square precedes each — `--gain` if healthy, `--warn` if degraded, `--loss` if down.
No social icons. No newsletter form (unless product requires it).

---

## 5. Page Blueprints

Rendered as ASCII to lock composition. Follow proportions exactly.

### 5.1 Product Catalog — `/products`

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [ TICKER ]                                                                   │
│ [ NAVBAR ]                                                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│ ISSUE Nº 042 — WEEK OF JUL 27                             ALL PRICES IN USD  │
│                                                                              │
│ The Flash                                                                    │
│ Sale Floor.                                                       (serif 88) │
│                                                                              │
│ 1,204 items · 42 live drops · next drop 00:14:22                             │
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
│ ...                                                                          │
├──────────────────────────────────────────────────────────────────────────────┤
│                              ← 001–024 of 1,204 →                            │
└──────────────────────────────────────────────────────────────────────────────┘
```

**ProductCard** (repeated exactly, do not substitute for a masonry or bento):
- 1px `--rule` border, `--paper` background, no radius, no shadow.
- Header row: issue number (`Nº 001`, mono 11px, `--ash`) left; if live, a `--signal` filled 4px×16px vertical bar + word `LIVE` (mono 11px, `--signal`).
- Image well: square 1:1, `--paper-sunk` background, 1px inner border. On hover, image does NOT scale — instead a hairline crosshair appears in the top-right corner.
- Title: sans 18/24 medium, `--ink`.
- Category: eyebrow style, `--ash`.
- Price: mono 20/24, `--ink`. Zero-padded to consistent width (`$099.99`, not `$99.99`). Original price appears as small line-through beneath.
- Stock: horizontal bar rendered with block characters `▓` and `░` in mono (not a `<div>` bar). Numeric count right-aligned. Color: `--gain` if >30% stock, `--warn` if 10–30%, `--signal` if <10%.
- No "Add to Cart" or "Wishlist" buttons on the card. Entire card is a link; add-to-cart lives on PDP only. This is intentional — reduces impulse noise, forces detail view.

Pagination: monospace `← 001–024 of 1,204 →`, no numbered page links.

### 5.2 Product Detail — `/products/:id`

Two-column, 7/5 split (60/40). Left = image stack. Right = sticky spec sheet.

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

- Images stack vertically (no thumbnails, no carousel). Scroll to browse.
- Right panel is `position: sticky; top: 104px`. Never collapses on desktop.
- Primary CTA is the ONLY filled-`--signal` button on the page. Full width of the right column, 56px tall, sans 14 UPPERCASE +0.1em tracking, `--signal-ink` text. Secondary CTA (Wishlist) is text-only underlined, `--ink`.
- Color swatches are 24px squares with 1px `--rule` border, no radius. Selected state = 2px `--ink` outer border, offset 2px.
- Size buttons are 44px squares, 1px `--rule` border, `--paper` fill. Selected = `--ink` fill, `--paper` text. Out-of-stock = diagonal strikethrough line drawn corner-to-corner in `--ash`.
- Reviews tab lives BELOW the fold, full-width, not tabbed side-by-side.

### 5.3 Cart — `/cart`

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
│ Nº 02                                                    │ SUMMER30       │
│ ┌────┐  Neon Sneakers                         $199.98    │ −$030.00       │
│ │IMG │  CYBER BLUE · 10 · SKU FL-3320         ─────────  │                │
│ └────┘  QTY [−] 02 [+]                        [ REMOVE ] │ ─────────────  │
├──────────────────────────────────────────────────────────┤ TOTAL          │
│ [ + APPLY COUPON CODE ]                                  │ $269.97        │
│                                                          │                │
│                                                          │ ┌────────────┐ │
│                                                          │ │ CHECKOUT → │ │
│                                                          │ └────────────┘ │
└──────────────────────────────────────────────────────────┴────────────────┘
```

- Cart hold timer (`04:59`) uses the digit-flip animation and turns `--signal` at ≤ 60s.
- Line items separated by full-width `--rule` hairline. No cards, no shadows, no rounded rows.
- Right column sticky, 320px fixed width on desktop.
- Coupon input is inline expandable — starts as a text link `[ + APPLY COUPON CODE ]`.

### 5.4 Checkout — `/checkout`

Single column, max 720px, left-aligned, three numbered sections stacked vertically. No two-column split — checkout is a form, not a dashboard.

```
Nº 01  SHIPPING
       ────────────────────────────────────────
       Full name          [                       ]
       Street             [                       ]
       City / Zip         [                ] [    ]
       Country            [ United States       ▾ ]

Nº 02  PAYMENT
       ────────────────────────────────────────
       Card               [ 4242 4242 4242 4242 ]
       Expiry / CVC       [ 12/28 ]  [ 123 ]
       Cardholder         [                       ]

Nº 03  REVIEW
       ────────────────────────────────────────
       2 items · $269.97 total · ship to 123 Tech Way

       ┌──────────────────────────────────────┐
       │  PLACE ORDER — $269.97               │
       └──────────────────────────────────────┘
       Secured by Stripe · idempotency-key attached
```

Inputs: `--paper-sunk` fill, no border, 2px `--ink` underline on focus. Labels sit above inputs in eyebrow style.

### 5.5 Orders — `/orders`

Table, not cards.

```
ORD Nº      DATE          ITEMS   TOTAL       STATUS         TRACKING
─────────────────────────────────────────────────────────────────────────────
ORD-98421   27 JUL 2026   03      $269.97     ● SHIPPED      TRK-88192301
ORD-98410   26 JUL 2026   01      $049.00     ● DELIVERED    TRK-88192200
ORD-98399   25 JUL 2026   02      $158.00     ○ PENDING      —
```

- Status dot: `--gain` filled for paid/shipped/delivered, `--warn` hollow for pending, `--loss` filled for cancelled/refunded.
- Row hover: background shifts to `--paper-sunk`, no border change.
- Click row to expand a full-width detail panel in place (accordion), do not navigate away. Detail panel contains the fulfillment stepper rendered horizontally as `[ PENDING ]───[ PAID ]───[ SHIPPED ]───[ DELIVERED ]` with the reached nodes filled `--ink`.

### 5.6 Admin — `/admin`

Left rail (240px, `--ink` background, `--bone` text) + content. Rail lists modules top-to-bottom in eyebrow style. Content area is dense tables — never dashboards with big-number cards larger than the tables beneath them.

Telemetry uses **one row of 6 tight KPI cells** (not big square cards):
```
REVENUE 24H   ORDERS 24H   AOV        ACTIVE HOLDS   REDIS HITS/S   OUTBOX LAG
$142,850.00   1,420        $100.60    42             12,480         0.31s
```
Each cell: 1px `--rule` border, 96px tall, label in eyebrow, value in mono 24/24. No sparklines unless the KPI is time-series-critical.

### 5.7 Auth — `/login`, `/register`, etc.

Full-viewport split. Left half `--ink` background with a giant serif quote or the wordmark; right half `--paper` with the form (max 400px). No card, no border around the form — just labels + underlined inputs + one primary button.

---

## 6. Components — Contract Summary

| Component        | Shape                                                 | Notes                                                  |
| ---------------- | ----------------------------------------------------- | ------------------------------------------------------ |
| Button (primary) | Filled `--ink`, text `--paper`, radius 2, height 44   | Only ONE primary per view                              |
| Button (signal)  | Filled `--signal`, text `--signal-ink`                | Reserved for checkout / add-to-cart / cancel-order     |
| Button (ghost)   | Transparent, 1px `--rule` border                      | Default for secondary actions                          |
| Button (link)    | Underlined text, `--ink`                              | Tertiary actions, inline                               |
| Input            | `--paper-sunk` fill, no border, 2px focus underline   | Label ABOVE, never floating                            |
| Select           | Same as input, chevron `▾` right                      | Native `<select>` styled, no custom dropdown           |
| Pill / Chip      | 1px `--rule`, radius 2, 24px tall, eyebrow text       | Filled only for `LIVE` (signal) and status dots        |
| Badge (LIVE)     | `--signal` fill, `--signal-ink` text, mono 11         | Pulses 1s cycle                                        |
| Table            | Full-width, hairline `--rule` between rows, no zebra  | Header row uses eyebrow style, `--paper-sunk` fill     |
| Modal            | 560px max, `--paper`, 1px `--rule`, radius 0          | Backdrop is `--ink` at 60% opacity — NOT blurred       |
| Toast            | Bottom-left, `--ink` fill, `--paper` text, radius 2   | Never top-right; never with icons                      |
| Skeleton         | `--paper-sunk` solid block, no shimmer                | Shimmer animation is banned                            |

---

## 7. Iconography & Imagery

- **Icons:** Use `lucide-react` at 16px or 20px, stroke width 1.5, color inherits from text. Never colored. Never filled. If an icon feels decorative, remove it.
- **Product imagery:** Square 1:1, shot on `--paper-sunk` seamless. If placeholders are needed during dev, generate via image tool with prompt `"editorial catalog product photo on warm paper background, natural light, square 1:1, no props"`.
- **No stock photography** of people, cities, or lifestyle scenes anywhere in the chrome. No hero backgrounds behind text.
- **No illustrations** unless commissioned in the same editorial paper aesthetic.

---

## 8. Responsive Rules

| Breakpoint      | Grid       | Notable adaptations                                                       |
| --------------- | ---------- | ------------------------------------------------------------------------- |
| < 640 (mobile)  | 4-col      | Product grid 1-col. PDP stacks (image over spec sheet, CTA sticky bottom). Ticker keeps scrolling. Navbar collapses to `[wordmark]  [⌘K]  [cart total]` — no hamburger, no drawer. |
| 640–1024 (tab)  | 8-col      | Product grid 2-col. Cart summary drops below items. Admin rail becomes top segmented control. |
| > 1024 (desk)   | 12-col     | As blueprints above.                                                      |

Fonts scale down 0.85× below 640px. Spacing scale unchanged.

---

## 9. Accessibility

- All interactive elements have a visible focus state: 2px `--signal` outline, 2px offset. Never remove focus rings.
- Contrast: body text `--graphite` on `--paper` = 8.9:1. `--signal` on `--paper` = 4.6:1 (large text only — do not set body copy in `--signal`).
- Live-updating regions (ticker, stock counters, timers) wrapped in `aria-live="polite"` with `aria-atomic="false"`; ticker gets `aria-hidden="true"` on the marquee and a screen-reader-only summary.
- Prefers-reduced-motion: disable ticker scroll and digit flip; render static latest value.

---

## 10. What NOT to Do (explicit constraints)

Antigravity — if you find yourself doing any of these, stop:

1. Adding a purple/cyan gradient anywhere.
2. Applying `backdrop-filter: blur()`.
3. Rounding a card to more than 2px.
4. Adding a drop shadow — of any size — to any surface.
5. Bolding a serif headline.
6. Setting a price in a proportional (non-monospace) font.
7. Using emoji as functional UI (they're fine in ticker copy only).
8. Adding a hero image behind text on the catalog page.
9. Substituting the ProductCard for a masonry, bento, or carousel layout.
10. Adding a "Trusted by / As seen in" section, testimonials carousel, or newsletter modal.
11. Adding "Get Started" / "Learn More" generic CTAs.
12. Using more than ONE `--signal`-filled button per screen.
13. Adding fade-in-on-scroll or hover-lift animations.
14. Introducing a light/dark mode toggle in the chrome — dark mode follows `prefers-color-scheme` only.

---

## 11. Implementation Notes for Antigravity

- Stack constraints from the backend README are unchanged: React 18 + Vite + TS + TanStack Query + React Router + Stripe Elements + lucide-react.
- Define all color/font/spacing tokens in `src/index.css` under `:root` and `@media (prefers-color-scheme: dark)`. Do not hard-code hex values in components.
- Build a `<Numeric />` primitive that wraps any number/price/timer and applies mono + tabular-nums + zero-padding. Use it everywhere a number is displayed.
- Build a `<Eyebrow />` primitive for all UPPERCASE tracked labels. Never write `text-xs uppercase tracking-widest` inline.
- Ship the Ticker, Wordmark, ProductCard, and StatusDot as the first four components — they define the visual grammar for everything else.

End of spec.
