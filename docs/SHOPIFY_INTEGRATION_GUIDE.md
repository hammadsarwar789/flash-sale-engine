# 🛍️ Step-by-Step Guide: How to Link Your Shopify Store with Flash Sale Engine
> **Target Audience:** Store Owners, Operations Teams & Non-Technical Users  
> **Estimated Setup Time:** 10 to 15 Minutes  

---

## 🌟 1. How It Works (In Plain English)

**Flash Sale Engine** connects directly to your **Shopify Store** so that your inventory, catalog products, and customer orders are automatically updated in real-time.

```
       ┌────────────────────────┐              ┌────────────────────────┐
       │   Flash Sale Website   │              │     Shopify Store      │
       │   & Admin Dashboard    │ ◄──────────► │    Admin & Checkout    │
       └────────────────────────┘              └────────────────────────┘
                   │                                       │
                   └───────────────────┬───────────────────┘
                                       ▼
                       🔄 Real-Time Bidirectional Sync
                       • Orders placed on either side
                       • Inventory stock adjustments
                       • Product additions & updates
                       • Customer order refunds
```

- When a customer buys on your **Flash Sale Website**, stock is instantly deducted on **Shopify**.
- When a customer buys on **Shopify**, stock is instantly deducted on your **Flash Sale Website**.
- Neither site can ever oversell!

---

## 🔐 Phase 1: Get Your Credentials from Shopify (5 Minutes)

To allow Flash Sale Engine to securely communicate with your Shopify store, you need an **Access Token** and **Store Location ID**.

### Step 1.1: Log into your Shopify Admin
1. Go to your Shopify Admin URL (for example: `https://flash-sale-21466.myshopify.com/admin`).
2. Log in using your store owner credentials.

### Step 1.2: Enable Custom App Development
1. Click **Settings** (gear icon at the bottom left).
2. Click **Apps and sales channels** from the left menu.
3. Click **Develop apps** (top right button).
4. If prompted to allow custom app development, click **Allow custom app development** and confirm.

### Step 1.3: Create a New App
1. Click the green **Create an app** button.
2. Enter your App name: `Custom Store Sync Engine`.
3. Select your App developer email and click **Create app**.

### Step 1.4: Grant API Permissions (Scopes)
1. Under **Overview**, click **Configure Admin API scopes**.
2. Enable the required permissions:
   - ✅ `read_products` & `write_products`
   - ✅ `read_inventory` & `write_inventory`
   - ✅ `read_orders` & `read_all_orders`
   - ✅ `read_locations`
   - ✅ `read_customers`
   - ✅ `read_files` & `write_files`
   - ✅ `read_fulfillments` & `write_fulfillments`
3. Click **Save** at the top right.

### Step 1.5: Install App & Get Your Access Token
1. Click the **API credentials** tab at the top.
2. Click **Install app** and confirm by clicking **Install**.
3. Under **Admin API access token**, click **Reveal token once**.
4. ⚠️ **Copy this token immediately** (it starts with `shpat_...`). Save it in a safe note.

---

## ⚙️ Phase 2: Add Keys to Flash Sale Engine (2 Minutes)

Now you just need to paste those keys into your application's config file.

### Step 2.1: Open your configuration file
Open the `.env` file inside the `backend/` folder (or ask your host administrator to update environment settings):

```env
# -----------------------------------------------------------------
# SHOPIFY INTEGRATION SETTINGS
# -----------------------------------------------------------------
SHOPIFY_SHOP_DOMAIN=flash-sale-21466.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_your_token_copied_from_step_1_5
SHOPIFY_API_VERSION=2026-07
SHOPIFY_LOCATION_ID=80021225539
SHOPIFY_WEBHOOK_SECRET=shpss_your_webhook_secret
```

### Step 2.2: How to Find Your Shopify Location ID
If you ever change your store location:
1. In Shopify Admin, go to **Settings ➔ Locations**.
2. Click on your main store location (e.g., *Shop location*).
3. Look at your browser address bar:
   `https://admin.shopify.com/store/your-store/settings/locations/80021225539`
4. The number at the end (`80021225539`) is your **SHOPIFY_LOCATION_ID**.

---

## 🔔 Phase 3: Set Up Webhooks for Live Orders (3 Minutes)

Webhooks tell Flash Sale Engine instantly whenever someone buys or refunds an item on Shopify.

### Step 3.1: Go to Notifications
1. In Shopify Admin, click **Settings ➔ Notifications**.
2. Scroll all the way down to the **Webhooks** section.
3. Click **Create webhook**.

### Step 3.2: Create the Order Webhook
- **Event:** `Order creation`
- **Format:** `JSON`
- **URL:** `https://your-domain.com/api/v1/webhooks/shopify/orders/create`
- **Webhook API version:** `2026-07`
- Click **Save**.

### Step 3.3: Create the Refund Webhook
- Click **Create webhook**.
- **Event:** `Refund creation`
- **Format:** `JSON`
- **URL:** `https://your-domain.com/api/v1/webhooks/shopify/refunds/create`
- Click **Save**.

---

## 🚀 Phase 4: Managing Products & Inventory (1-Click Guide)

### How to Publish a Product to Shopify
1. Log into your **Flash Sale Admin Dashboard**.
2. Navigate to **Catalog / Products**.
3. Next to any product, you will see the **SHOPIFY SYNC** button:
   - Status `[UNPUBLISHED]`: Product is local only.
   - Click the toggle switch ➔ Status changes to `[SYNCED]`.
4. Your product, pricing, variants, and image URLs are automatically created on Shopify!

### How Automatic Stock Sync Works
| Action Taken | What Happens Automatically? |
| :--- | :--- |
| **Customer buys 2 items on Flash Sale Website** | Flash Sale Engine reduces local stock by 2, and pushes the updated inventory to Shopify. |
| **Customer buys 2 items on Shopify Store** | Shopify triggers a webhook; Flash Sale Engine reduces local stock by 2 without looping back. |
| **Admin edits stock on Admin Dashboard** | Stock is updated in database & Redis, and pushed to Shopify. |
| **Customer receives a refund** | Stock is automatically added back to both systems. |

---

## ❓ Frequently Asked Questions & Troubleshooting

### 1. Why does my table show "AVAILABLE STOCK" and "TOTAL CAPACITY"?
- **AVAILABLE STOCK (e.g. 24 UNITS):** Stock remaining and ready for customers to purchase right now.
- **TOTAL CAPACITY (e.g. 29 UNITS):** Total starting inventory / total warehouse space allocated for this item.

### 2. My product says `[UNPUBLISHED]` — why isn't it updating on Shopify?
- Products marked `[UNPUBLISHED]` are saved locally only.
- Simply click the **SHOPIFY SYNC** toggle switch to publish it. Once it changes to `[SYNCED]`, inventory updates will stream to Shopify automatically.

### 3. What if my internet disconnects during a sale?
- Don't worry! Flash Sale Engine uses an **Outbox Queue**. If a Shopify update fails temporarily, the system retries in the background until Shopify receives it.

---
*Document Version: 2.0 | Engine Integration Built for High Performance & Zero-Drift E-Commerce.*
