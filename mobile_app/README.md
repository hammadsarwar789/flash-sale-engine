# ⚡ Flash Sale Engine — Flutter Mobile App

A high-performance, reactive Flutter mobile client built with **BLoC Architecture** (`flutter_bloc`) for the **Flash Sale Engine**. Designed for ultra-fast, concurrent stock drops, real-time inventory countdowns, 10-minute atomic stock reservations, and sub-second checkout.

---

## 📱 Features

* **⚡ Real-Time Flash Sale Feed**: Live countdown timers (`CountdownTimerWidget`), flash drop banners, category filter chips, and stock depletion progress bars.
* **🔒 10-Minute Atomic Stock Reservation**: Integrates with the backend Redis Lua script engine using unique `Idempotency-Key` headers to lock stock safely before checkout.
* **🛒 Full Cart Experience**: Real-time subtotal computation, quantity modifiers, and quick checkout flow.
* **💳 Seamless Checkout & Payment**: Idempotent order placement, address inputs, payment method selection, and order confirmation.
* **📦 Order Tracking**: History screen tracking order states (`PENDING`, `PAID`, `COMPLETED`, `CANCELLED`).
* **🔐 Tokenized Authentication**: JWT-based session handling with automatic token injection using `Dio` interceptors and `flutter_secure_storage`.
* **🎨 Modern Cyber Aesthetics**: Vibrant dark theme with neon emerald, cyan, and electric rose accents matching the web experience.

---

## 🏛 Clean Architecture & Folder Structure

```
mobile_app/
├── lib/
│   ├── main.dart                      # App entry point, MultiRepositoryProvider & MultiBlocProvider
│   │
│   ├── core/                          # Cross-cutting foundational utilities
│   │   ├── constants/
│   │   │   └── api_constants.dart     # Dynamic endpoints and platform-aware base URLs
│   │   ├── network/
│   │   │   └── api_client.dart        # Dio singleton with JWT interceptor & error mapping
│   │   ├── theme/
│   │   │   └── app_theme.dart         # High-contrast Material 3 cyber dark theme
│   │   └── utils/
│   │       └── formatters.dart        # Currency, countdown timer, and date formatting
│   │
│   ├── data/                          # Data Layer
│   │   ├── models/                    # Typed models (User, Product, Category, Cart, Order)
│   │   └── repositories/              # Repositories (Auth, Product, Cart, Order)
│   │
│   ├── logic/                         # Business Logic (BLoC) Layer
│   │   ├── auth/                      # AuthBloc, AuthEvent, AuthState
│   │   ├── products/                  # ProductBloc, ProductEvent, ProductState
│   │   ├── cart/                      # CartBloc, CartEvent, CartState
│   │   └── orders/                    # OrderBloc, OrderEvent, OrderState
│   │
│   └── presentation/                  # UI Layer
│       ├── routes/
│       │   └── app_router.dart        # Declarative routing with GoRouter
│       ├── widgets/                   # Reusable widgets (Countdown, StockMeter, Card, etc.)
│       └── screens/
│           ├── splash/                # Session check & animated splash
│           ├── auth/                  # Login & Register screens
│           ├── home/                  # Flash Sale Home & Catalog
│           ├── product/               # Product Detail & Urgency meter
│           ├── cart/                  # Shopping Cart
│           ├── checkout/              # Flash Reservation Checkout
│           ├── orders/                # My Orders history
│           └── profile/               # User profile & Diagnostics
└── test/                              # Unit & Widget tests
```

---

## 🔌 API & Network Configuration

The application automatically resolves the backend URL depending on the platform:

| Platform | Resolved URL | Note |
| :--- | :--- | :--- |
| **Android Emulator** | `http://10.0.2.2:5000/api/v1` | Standard loopback alias to host machine |
| **iOS Simulator** | `http://localhost:5000/api/v1` | Localhost loopback |
| **Web / Desktop** | `http://localhost:5000/api/v1` | Direct localhost |
| **Physical Device** | `http://<YOUR_LOCAL_IP>:5000/api/v1` | Change in `lib/core/constants/api_constants.dart` |

---

## 🚀 Getting Started

### 1. Prerequisites
* **Flutter SDK**: `^3.13.0` or higher
* **Dart SDK**: `^3.1.0` or higher
* Flash Sale Engine backend running at `http://localhost:5000`

### 2. Install Dependencies
```bash
cd mobile_app
flutter pub get
```

### 3. Run the App
#### On Android Emulator:
```bash
flutter run -d android
```

#### On iOS Simulator (macOS):
```bash
flutter run -d ios
```

#### On Chrome / Web:
```bash
flutter run -d chrome
```

#### On Windows Desktop:
```bash
flutter run -d windows
```

---

## 🧪 Testing & Code Quality

Run static analysis and tests:
```bash
# Analyze code for linting and type safety
flutter analyze

# Run unit and widget tests
flutter test
```

---

## 🔄 State Management Flow (BLoC Pattern)

```
[ UI Widget ] 
      │
      ▼  (Dispatches Event)
[ BLoC ] ──► (Calls Repository) ──► [ ApiClient (Dio) ] ──► [ FastAPI Backend ]
      │                                                               │
      ▼  (Emits State)                                                │
[ UI Widget (BlocBuilder / BlocListener) ] ◄──────────────────────────┘
```

1. **User Action**: Triggered on UI (e.g. clicking "Reserve Now").
2. **Event Dispatched**: `ReserveFlashSaleEvent(productId: 1, quantity: 1)`.
3. **Repository Execution**: `OrderRepository.reserveFlashSaleItem(...)` attaches an `Idempotency-Key` header and calls `/api/v1/orders/reserve`.
4. **State Emitted**: `ReservationSuccess` containing the order and reservation countdown.
5. **UI Transition**: `BlocListener` navigates to `/checkout` with live countdown timer.
