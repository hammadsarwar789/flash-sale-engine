# 🔌 REST API Specification & Endpoint Directory

This document details the authentication standards, RBAC permission codes, Marshmallow JSON payload specifications, and webhook integration guidelines for the **Flash Sale Engine REST API**.

---

## 1. Authentication & Security Architecture

### 1.1 Password Hashing Specification
- **Algorithm:** PBKDF2-HMAC-SHA256
- **Salt:** 16-byte cryptographically secure random salt (`os.urandom(16)`)
- **Iterations:** 100,000 rounds
- **Storage Format:** `salt_hex:hash_hex`
- **Constant-Time Verification:** Uses `hmac.compare_digest()` to eliminate timing attack vulnerabilities.

### 1.2 JSON Web Tokens (JWT)
Requests to protected endpoints must pass a standard HTTP `Authorization` header:
```http
Authorization: Bearer <jwt_access_token>
```
- **JWT Claims Payload:**
  ```json
  {
    "sub": "usr_90a1f8b2-4c32-4d1e",
    "email": "customer@flashsale.com",
    "role": "customer",
    "user_type": "CUSTOMER",
    "exp": 1786195200
  }
  ```

---

## 2. Role-Based Access Control (RBAC) Permission Matrix

The platform enforces fine-grained permission codes checked via the `@require_permission()` decorator:

| Permission Code | Target Role(s) | Description |
| :--- | :--- | :--- |
| `outlet:stock:read` | Stock Operator, Manager, Admin | View branch outlet inventory levels. |
| `outlet:stock:write` | Stock Operator, Manager, Admin | Adjust or transfer branch stock. |
| `outlet:transfer:approve` | Store Manager, Admin | Approve inter-outlet inventory transfers. |
| `enterprise:roles:read` | Admin, Store Manager | Inspect enterprise role definitions. |
| `enterprise:roles:write` | Super Admin | Define custom roles and permission matrices. |
| `enterprise:roles:assign` | Super Admin, Store Manager | Assign roles to staff members. |
| `enterprise:orders:manage` | Admin, Support Staff | Override order statuses or process refunds. |
| `vendor:catalog:write` | Merchant, Admin | Manage store product listings and SKU variants. |
| `vendor:financials:read` | Merchant, Admin | Inspect escrow ledgers and request payouts. |

---

## 3. Domain Endpoint Catalog & Marshmallow Specs

### 3.1 Authentication & User Management (`/api/v1/auth`)

#### `POST /api/v1/auth/register`
* **Description:** Register customer account or submit staff/vendor onboarding application.
* **Request Payload (Marshmallow `RegisterSchema`):**
  ```json
  {
    "email": "user@example.com",
    "password": "Password123",
    "full_name": "Jane Doe",
    "account_type": "CUSTOMER"
  }
  ```
* **Response Payload (201 Created):**
  ```json
  {
    "message": "User registered successfully",
    "user": {
      "id": "usr_90a1f8b2",
      "email": "user@example.com",
      "role": "customer"
    }
  }
  ```

#### `POST /api/v1/auth/login`
* **Description:** Authenticate credentials and issue JWT tokens.
* **Request Payload (`LoginSchema`):**
  ```json
  {
    "email": "user@example.com",
    "password": "Password123"
  }
  ```
* **Response Payload (200 OK):**
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1Ni...",
    "token_type": "Bearer",
    "user": {
      "id": "usr_90a1f8b2",
      "email": "user@example.com",
      "role": "customer"
    }
  }
  ```

---

### 3.2 Catalog & Product Management (`/api/v1/products`)

#### `GET /api/v1/products`
* **Query Parameters:** `search`, `category_id`, `sort_by` (`created_at`, `price_asc`, `price_desc`), `page` (default 1), `per_page` (default 12).
* **Response Payload (200 OK):**
  ```json
  {
    "items": [
      {
        "id": "prod_phone_01",
        "name": "CyberPhone Ultra",
        "sku": "CP-ULTRA-01",
        "price": 899.99,
        "available_stock": 50,
        "total_stock": 100,
        "discount_percentage": 10,
        "category": { "id": "cat_tech", "name": "Electronics" }
      }
    ],
    "total": 42,
    "page": 1,
    "pages": 4
  }
  ```

#### `POST /api/v1/products/:id/warmup`
* **Description:** Load product stock from PostgreSQL into Redis in-memory cache (`product:{id}:stock`).
* **Headers:** `Authorization: Bearer <admin_token>`
* **Response Payload (200 OK):**
  ```json
  {
    "status": "success",
    "product_id": "prod_phone_01",
    "synced_stock": 50
  }
  ```

---

### 3.3 Cart & Inventory Reservation (`/api/v1/cart`)

#### `POST /api/v1/cart/items`
* **Description:** Add item/variant to cart and acquire Redis Lua stock hold.
* **Request Payload (`AddToCartSchema`):**
  ```json
  {
    "product_id": "prod_phone_01",
    "variant_id": "var_black_256",
    "quantity": 1
  }
  ```
* **Response Payload (200 OK):**
  ```json
  {
    "message": "Item added to cart",
    "cart": {
      "item_count": 1,
      "subtotal": 899.99,
      "reserved_until": "2026-08-07T18:54:00Z"
    }
  }
  ```

---

### 3.4 Flash Sale Orders & Checkout (`/api/v1/orders`)

#### `POST /api/v1/orders/reserve`
* **Headers:** `Idempotency-Key: idempotency-uuid-v4`, `Authorization: Bearer <jwt_token>`
* **Request Payload (`ReserveOrderSchema`):**
  ```json
  {
    "product_id": "prod_phone_01",
    "quantity": 1,
    "shipping_address": {
      "street": "123 Innovation Way",
      "city": "Austin",
      "state": "TX",
      "postal_code": "78701",
      "country": "US"
    }
  }
  ```
* **Response Payload (202 Accepted):**
  ```json
  {
    "order_id": "ord_8812a4b9",
    "status": "RESERVED",
    "expires_at": "2026-08-07T18:54:00Z",
    "total_amount": 899.99
  }
  ```

---

## 4. Webhook Specifications

### 4.1 Courier Logistics Webhook (`POST /api/v1/courier_webhooks`)
External logistics providers dispatch shipment status updates to this endpoint.

#### Request Headers:
```http
Content-Type: application/json
X-Courier-Signature: t=1786195200,v1=9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c
X-Idempotency-Key: courier-evt-991023
```

#### Payload Specification:
```json
{
  "event_id": "evt_shipment_delivered_001",
  "tracking_number": "TRK-88129043",
  "order_id": "ord_8812a4b9",
  "status": "DELIVERED",
  "timestamp": "2026-08-07T18:40:00Z",
  "location": "Austin, TX distribution hub"
}
```

#### Signature Verification Logic:
The backend computes HMAC-SHA256 over `timestamp.payload` using `COURIER_WEBHOOK_SECRET`:
$$\text{Signature} = \text{HMAC-SHA256}(\text{secret}, t + "." + \text{raw\_body})$$
If signature verification fails, the endpoint responds with `HTTP 401 Unauthorized`.
