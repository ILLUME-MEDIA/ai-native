# API Reference

**Base URL:** `https://yourdomain.com/api`
**Content-Type:** `application/json`
**Authentication:** Sanctum cookie (admin SPA) or `Authorization: Bearer <token>` (driver app / OTP)

---

## Table of Contents

1. [Auth](#auth)
2. [Businesses / Muzzhub](#businesses--muzzhub)
3. [Menu & Categories](#menu--categories)
4. [Cart](#cart)
5. [Orders](#orders)
6. [Delivery — Unified Quote](#delivery--unified-quote)
7. [Delivery — DoorDash Drive](#delivery--doordash-drive)
8. [Delivery — UberEats Integration](#delivery--ubereats-integration)
9. [Delivery — Instacart Integration](#delivery--instacart-integration)
10. [Delivery — Own Delivery Staff](#delivery--own-delivery-staff)
11. [Delivery — Zones](#delivery--zones)
12. [Delivery — Assignments (Dispatch)](#delivery--assignments-dispatch)
13. [Delivery — Settings (Admin)](#delivery--settings-admin)
14. [Delivery — Platform Orders (Unified)](#delivery--platform-orders-unified)
15. [Driver App API](#driver-app-api)
16. [POS Integration](#pos-integration)
17. [Webhooks](#webhooks)

---

## Auth

### OTP Login
```
POST /otp-auth/request
Body: { "phone": "+11234567890", "table": "users" }

POST /otp-auth/verify
Body: { "phone": "+11234567890", "otp": "123456" }
Response: { "token": "<bearer_token>" }
```

---

## Businesses / Muzzhub

> All read endpoints are public. Write endpoints require `auth:sanctum`.

```
GET    /ecommerce/businesses                  List all businesses
GET    /ecommerce/businesses/{id}             Get business detail
POST   /ecommerce/businesses                  Create business (admin)
PATCH  /ecommerce/businesses/{id}             Update business (admin)
DELETE /ecommerce/businesses/{id}             Delete business (admin)

GET    /ecommerce/muzzhub                     List muzzhub listings
GET    /ecommerce/muzzhub/{muzzhub}           Get muzzhub detail
POST   /ecommerce/muzzhub                     Create muzzhub (admin)
PATCH  /ecommerce/muzzhub/{muzzhub}           Update muzzhub (admin)
```

---

## Menu & Categories

```
GET    /ecommerce/menu-categories             List categories (public)
GET    /ecommerce/menu-categories/{id}        Category detail
POST   /ecommerce/menu-categories             Create (admin)
PATCH  /ecommerce/menu-categories/{id}        Update (admin)
DELETE /ecommerce/menu-categories/{id}        Delete (admin)

GET    /ecommerce/menu-items                  List items (public)
       ?business_id=1&category_id=2&search=burger
GET    /ecommerce/menu-items/{id}             Item detail (includes modifiers)
POST   /ecommerce/menu-items                  Create (admin)
PATCH  /ecommerce/menu-items/{id}             Update (admin)
DELETE /ecommerce/menu-items/{id}             Delete (admin)

GET    /ecommerce/menu-item-modifiers/{item}  Get modifier groups for item
POST   /ecommerce/menu-item-modifiers/{item}/groups    Add modifier group
PATCH  /ecommerce/menu-item-modifiers/groups/{group}   Update group
POST   /ecommerce/menu-item-modifiers/groups/{group}/options  Add option
PATCH  /ecommerce/menu-item-modifiers/options/{option}        Update option
```

---

## Cart

```
GET    /ecommerce/cart                        Get cart items (session-based)
POST   /ecommerce/cart                        Add item to cart
PATCH  /ecommerce/cart/{cartItem}             Update cart item quantity/notes
DELETE /ecommerce/cart/{cartItem}             Remove item from cart
DELETE /ecommerce/cart                        Clear entire cart
```

**Add to Cart body:**
```json
{
  "business_id": 1,
  "menu_item_id": 5,
  "quantity": 2,
  "notes": "No onions",
  "modifiers": [
    { "group_id": 1, "option_id": 3, "name": "Extra Cheese", "price_adjustment": 1.50 }
  ]
}
```

---

## Orders

### Place Order (Storefront — no auth or OTP bearer)
```
POST /ecommerce/orders
```
**Body:**
```json
{
  "business_id"      : 1,
  "customer_name"    : "John Doe",
  "customer_phone"   : "+11234567890",
  "customer_email"   : "john@example.com",
  "delivery_address" : "456 Oak Ave, Los Angeles, CA 90001",
  "notes"            : "Leave at door",
  "order_type"       : "delivery",
  "item_delivery_type": "delivery",
  "delivery_vendor"  : "doordash",
  "tax_rate"         : 8.5,
  "delivery_fee"     : 5.99
}
```

**Notes:**
- Cart is automatically cleared after order is placed
- If `delivery_vendor = "doordash"` and `delivery_address` is set, DoorDash delivery is auto-dispatched
- `doordash_tracking_url` will be in the response if dispatch succeeded

---

### Admin Order APIs (require `auth:sanctum`)
```
GET    /ecommerce/orders                      List all orders
       ?business_id=1&status=pending&session_id=xyz&per_page=20

GET    /ecommerce/orders/{order}              Order detail
```

**Order detail response includes:**
```json
{
  "id": 42,
  "order_number": "ORD-ABC123",
  "status": "confirmed",
  "doordash_delivery_id": "ORD-ABC123",
  "doordash_status": "enroute_to_pickup",
  "doordash_tracking_url": "https://doordash.com/track/...",
  "tracking_url": "https://doordash.com/track/...",
  "estimated_delivery_at": "2026-02-28T14:35:00Z",
  "tracking": {
    "vendor": "doordash",
    "delivery_id": "ORD-ABC123",
    "status": "enroute_to_pickup",
    "status_label": "Dasher Heading to Restaurant",
    "tracking_url": "https://doordash.com/track/..."
  },
  "assigned_driver": null,
  "current_assignment": null,
  "platform_order": null,
  "business": { ... },
  "items": [ ... ]
}
```

```
PATCH  /ecommerce/orders/{order}/status       Update order status (admin)
Body: { "status": "confirmed" }
```

**Status values:** `pending → confirmed → preparing → ready → out_for_delivery → delivered | cancelled`

**Auto-dispatch logic:**
> When status changes to `confirmed` or `preparing` AND previous status was `pending`
> AND `delivery_vendor = doordash` AND order has a delivery address → DoorDash delivery is automatically dispatched

---

## Delivery — Unified Quote

> **Single endpoint for all delivery vendors.**
> No auth required (public, usable from storefront).

```
POST /delivery/quote
```

**Body:**
```json
{
  "vendor"          : "doordash",
  "pickup_address"  : "123 Main St, Los Angeles, CA 90012",
  "dropoff_address" : "456 Oak Ave, Los Angeles, CA 90001",
  "order_value"     : 35.50,
  "business_id"     : 1,
  "lat"             : 34.0522,
  "lng"             : -118.2437
}
```

| Field | Required by | Description |
|-------|------------|-------------|
| `vendor` | all | `doordash` \| `ubereats` \| `instacart` \| `own` |
| `pickup_address` | doordash | Full pickup address string |
| `dropoff_address` | doordash | Full dropoff address string |
| `order_value` | optional | Order total in dollars (affects DoorDash fee) |
| `business_id` | ubereats, instacart, own | Business ID |
| `lat` + `lng` | ubereats, instacart, own | Customer location for zone matching |

**Response (normalized across all vendors):**
```json
{
  "success"           : true,
  "vendor"            : "doordash",
  "fee"               : 5.99,
  "fee_cents"         : 599,
  "currency"          : "USD",
  "estimated_minutes" : 35,
  "min_order_amount"  : 0,
  "expires_at"        : "2026-02-28T15:00:00Z",
  "quote_id"          : "quote-abc123",
  "zone"              : null,
  "raw"               : { }
}
```

**Vendor notes:**
- `doordash` → Real quote from DoorDash Drive API v2 (requires v2 credentials)
- `ubereats` → Estimated fee from your configured delivery zone (UberEats manages final fee)
- `instacart` → Estimated fee from your configured delivery zone (Instacart manages final fee)
- `own` → Exact fee from your delivery zone config, checks `min_order_amount`

---

## Delivery — DoorDash Drive

> Requires `auth:sanctum` for admin endpoints. Webhook is public.

```
GET  /delivery/doordash/env                   Current environment (sandbox/production)
POST /delivery/doordash/quote                 Direct DoorDash quote (doordash-only endpoint)
     Body: { "pickup_address", "dropoff_address", "order_value" }

GET  /delivery/doordash/status/{order}        Fetch live DoorDash status + sync to DB
POST /delivery/doordash/dispatch/{order}      Manually dispatch delivery for order
POST /delivery/doordash/cancel/{order}        Cancel DoorDash delivery

POST /webhooks/delivery/doordash              Webhook (set in DoorDash Dev Portal) ← no auth
```

**Direct quote response:**
```json
{
  "success"    : true,
  "fee"        : 5.99,
  "fee_cents"  : 599,
  "currency"   : "USD",
  "expires_at" : "2026-02-28T15:00:00Z",
  "quote_id"   : "quote-abc123",
  "raw"        : { }
}
```

**DoorDash status labels:**

| DD Status | Label |
|-----------|-------|
| `created` | Order Received |
| `confirmed` | Confirmed |
| `enroute_to_pickup` | Dasher Heading to Restaurant |
| `arrived_at_pickup` | Dasher at Restaurant |
| `picked_up` | Out for Delivery |
| `enroute_to_dropoff` | Almost There |
| `arrived_at_dropoff` | Dasher Arrived |
| `delivered` | Delivered |
| `delivery_cancelled` | Delivery Cancelled |

**Setup:**
```
1. DoorDash Developer Portal → Webhooks → Add: POST /api/webhooks/delivery/doordash
2. Set in .env:
   DOORDASH_ENV=sandbox
   DOORDASH_SANDBOX_DEVELOPER_ID=xxx
   DOORDASH_SANDBOX_KEY_ID=xxx
   DOORDASH_SANDBOX_SIGNING_SECRET=xxx
```

---

## Delivery — UberEats Integration

> Admin requires `auth:sanctum`. Webhook is public.

```
GET  /delivery/ubereats/config                        Webhook URL + setup steps
GET  /delivery/ubereats/orders                        List UberEats platform orders
     ?business_id=1&status=received&per_page=20

POST /delivery/ubereats/orders/{platformOrder}/accept Accept UberEats order → creates internal order
     Body: { "prep_time_minutes": 20 }

POST /delivery/ubereats/orders/{platformOrder}/reject Reject UberEats order
     Body: { "reason": "Kitchen closed" }

PATCH /delivery/ubereats/orders/{platformOrder}/status Update status sent to UberEats
     Body: { "status": "preparing" }

POST /webhooks/delivery/ubereats                      UberEats webhook ← no auth
```

**Accepted order response:**
```json
{
  "message": "UberEats order accepted.",
  "platform_order": {
    "id": 1,
    "platform": "ubereats",
    "platform_order_id": "ue-order-123",
    "status": "accepted",
    "order_id": 42,
    "subtotal": 25.00,
    "total": 30.00,
    "customer_name": "UberEats Customer",
    "items_payload": [ ... ]
  }
}
```

**Setup:**
```
1. UberEats Merchant Portal (merchant.uber.com)
2. Settings → Developer → Webhook Configuration
3. Add webhook URL: POST /api/webhooks/delivery/ubereats
4. Events: orders.notification, orders.cancel
5. Admin Panel → Delivery Settings → UberEats:
   - ubereats_store_id: (your store ID from Merchant Portal)
   - api_key: client_id from UberEats
   - api_secret: client_secret from UberEats
```

---

## Delivery — Instacart Integration

> Admin requires `auth:sanctum`. Webhook is public.

```
GET  /delivery/instacart/config                        Webhook URL + setup steps
GET  /delivery/instacart/orders                        List Instacart platform orders
     ?business_id=1&status=received

POST /delivery/instacart/orders/{platformOrder}/accept Accept order → creates internal order
POST /delivery/instacart/orders/{platformOrder}/reject Reject order
     Body: { "reason": "Out of stock" }

POST /webhooks/delivery/instacart                      Instacart webhook ← no auth
```

**Setup:**
```
1. Instacart Connect Portal (connect.instacart.com)
2. Settings → Integrations → Webhooks
3. Add: POST /api/webhooks/delivery/instacart
4. Admin Panel → Delivery Settings → Instacart:
   - instacart_retailer_id
   - instacart_location_id
   - webhook_secret (for signature verification)
```

---

## Delivery — Own Delivery Staff

> All require `auth:sanctum`.

```
GET    /delivery/staff                        List drivers
       ?business_id=1&status=available&search=john&per_page=20

GET    /delivery/staff/available              Available drivers only (for assignment modal)
       ?business_id=1

GET    /delivery/staff/locations              Real-time GPS locations of active drivers
       ?business_id=1

POST   /delivery/staff                        Create driver
PATCH  /delivery/staff/{deliveryStaff}        Update driver
DELETE /delivery/staff/{deliveryStaff}        Delete driver (soft delete)
GET    /delivery/staff/{deliveryStaff}        Driver detail (includes last 10 assignments)

POST   /delivery/staff/{deliveryStaff}/token  Generate new driver app token
```

**Create driver body:**
```json
{
  "business_id"  : 1,
  "name"         : "Ahmed Khan",
  "phone"        : "+923001234567",
  "email"        : "ahmed@example.com",
  "pin"          : "1234",
  "vehicle_type" : "motorcycle",
  "vehicle_model": "Honda CB150",
  "vehicle_plate": "LEH-1234",
  "is_active"    : true
}
```

**Generate token response:**
```json
{
  "token"      : "xxxxxxxxxxxx80chars",
  "driver_id"  : 5,
  "driver_name": "Ahmed Khan",
  "message"    : "New token generated. Share this with the driver app. It will not be shown again."
}
```

---

## Delivery — Zones

```
GET    /delivery/zones                         List zones
       ?business_id=1&is_active=1

POST   /delivery/zones                         Create zone (admin, auth:sanctum)
PATCH  /delivery/zones/{deliveryZone}          Update zone (admin)
DELETE /delivery/zones/{deliveryZone}          Delete zone (admin)
GET    /delivery/zones/{deliveryZone}          Zone detail
POST   /delivery/zones/reorder                 Reorder zones (admin)
       Body: { "order": [3, 1, 2] }

GET    /delivery/zones/check-point             Check if lat/lng is in any zone (PUBLIC)
       ?business_id=1&lat=33.72&lng=73.04
```

**Create zone body (circle type):**
```json
{
  "business_id"      : 1,
  "name"             : "Downtown Zone",
  "description"      : "Covers downtown area",
  "zone_type"        : "circle",
  "center_lat"       : 33.7294,
  "center_lng"       : 73.0931,
  "radius_km"        : 5.0,
  "delivery_fee"     : 2.99,
  "min_order_amount" : 15.00,
  "estimated_minutes": 25,
  "is_active"        : true
}
```

**Create zone body (city type):**
```json
{
  "business_id"      : 1,
  "name"             : "Lahore",
  "zone_type"        : "city",
  "city_name"        : "Lahore",
  "zip_codes"        : "54000,54500,54700",
  "delivery_fee"     : 3.99,
  "estimated_minutes": 40
}
```

**Check point response:**
```json
{
  "in_zone"           : true,
  "zone"              : { "id": 1, "name": "Downtown Zone", ... },
  "delivery_fee"      : 2.99,
  "estimated_minutes" : 25
}
```

---

## Delivery — Assignments (Dispatch)

> All require `auth:sanctum`.

```
GET    /delivery/assignments                   List assignments
       ?driver_id=1&status=assigned&business_id=1&is_current=1

POST   /delivery/assignments/assign            Assign driver to order
POST   /delivery/assignments/auto-assign       Auto-assign nearest available driver
POST   /delivery/assignments/orders/{order}/unassign   Unassign driver from order
PATCH  /delivery/assignments/{assignment}/status       Update assignment status
```

**Assign driver body:**
```json
{
  "order_id"        : 42,
  "driver_id"       : 5,
  "zone_id"         : 1,
  "driver_earnings" : 3.50
}
```

**Auto-assign body:**
```json
{ "order_id": 42 }
```

**Update assignment status body:**
```json
{
  "status"           : "picked_up",
  "driver_notes"     : "Order picked up at 2:30 PM",
  "rejection_reason" : null
}
```

**Status flow:** `assigned → accepted → picked_up → out_for_delivery → delivered`
**Rejection flow:** `assigned → rejected` (order returns to `unassigned`, admin reassigns)

---

## Delivery — Settings (Admin)

> All require `auth:sanctum`.

```
GET  /delivery/settings?business_id=1        All platform settings for a business
POST /delivery/settings                      Create/update platform settings
POST /delivery/settings/test                 Test connection
     Body: { "business_id": 1, "platform": "ubereats" }
```

**Upsert settings body:**
```json
{
  "business_id"                   : 1,
  "platform"                      : "ubereats",
  "is_enabled"                    : true,
  "api_key"                       : "client_id_from_ubereats",
  "api_secret"                    : "client_secret_from_ubereats",
  "webhook_secret"                : "webhook_secret_string",
  "ubereats_store_id"             : "store-id-from-merchant-portal",
  "ubereats_menu_id"              : "menu-id",
  "settings"                      : { "default_delivery_fee": 2.99 }
}
```

**Platform values:** `own` | `doordash` | `ubereats` | `instacart` | `grubhub` | `skip`

**Test connection response:**
```json
{
  "success"    : true,
  "message"    : "UberEats credentials appear configured.",
  "webhook_url": "https://yourdomain.com/api/webhooks/delivery/ubereats"
}
```

---

## Delivery — Platform Orders (Unified)

> All require `auth:sanctum`. Unified view of UberEats + Instacart orders.

```
GET    /delivery/platform-orders             List all platform orders (all vendors)
       ?business_id=1&platform=ubereats&status=received&per_page=25&date_from=2026-02-01&date_to=2026-02-28

GET    /delivery/platform-orders/summary     Dashboard summary
       ?business_id=1
       Response: { pending_orders, today: { orders_today, revenue_today }, by_platform, by_status }

GET    /delivery/platform-orders/{platformOrder}       Order detail (with items + linked internal order)
PATCH  /delivery/platform-orders/{platformOrder}/status  Update status
       Body: { "status": "preparing" }
```

**Summary response:**
```json
{
  "pending_orders": 3,
  "today": {
    "orders_today"  : 12,
    "revenue_today" : 450.00,
    "fees_today"    : 45.00
  },
  "by_platform": [
    { "platform": "ubereats",  "total": 8,  "total_payout": 320.00 },
    { "platform": "instacart", "total": 4,  "total_payout": 130.00 }
  ],
  "by_status": [
    { "status": "received",  "total": 3 },
    { "status": "delivered", "total": 9 }
  ]
}
```

---

## Driver App API

> Auth: `Authorization: Bearer <token>` (token generated via admin: `POST /delivery/staff/{id}/token`)
> No `auth:sanctum` — uses custom token auth.

```
POST   /driver-app/login                               Phone + PIN login
GET    /driver-app/me                                  My profile + current assignment
PATCH  /driver-app/status                              Go online/offline + update location
POST   /driver-app/location                            Update GPS location (call every 30s while active)
GET    /driver-app/assignments                         My active assignments
PATCH  /driver-app/assignments/{assignmentId}/respond  Accept or reject assignment
PATCH  /driver-app/assignments/{assignmentId}/progress Update delivery progress
GET    /driver-app/history                             Completed delivery history
```

**Login:**
```json
POST /driver-app/login
Body: { "phone": "+923001234567", "pin": "1234" }
Response: {
  "token": "xxxxxxxxxx",
  "driver": { "id": 5, "name": "Ahmed", "status": "offline", "rating": 4.8 }
}
```

**Go online:**
```json
PATCH /driver-app/status
Headers: Authorization: Bearer <token>
Body: { "status": "available", "current_lat": 33.7294, "current_lng": 73.0931 }
```

**Update location (poll every 30s):**
```json
POST /driver-app/location
Body: { "lat": 33.7294, "lng": 73.0931 }
```

**Respond to assignment:**
```json
PATCH /driver-app/assignments/15/respond
Body: {
  "action"           : "accept",    // or "reject"
  "rejection_reason" : null
}
```

**Update delivery progress:**
```json
PATCH /driver-app/assignments/15/progress
Body: {
  "status"       : "picked_up",     // picked_up | out_for_delivery | delivered | failed
  "driver_notes" : "Picked up at 2:30 PM",
  "lat"          : 33.7300,
  "lng"          : 73.0940
}
```

**Progress status flow:**
```
accepted → picked_up → out_for_delivery → delivered
```

**`/driver-app/me` response:**
```json
{
  "driver": {
    "id": 5,
    "name": "Ahmed Khan",
    "phone": "+923001234567",
    "vehicle_type": "motorcycle",
    "status": "busy",
    "rating": 4.8,
    "total_deliveries": 142
  },
  "current_assignment": {
    "id": 15,
    "status": "accepted",
    "order": {
      "order_number": "ORD-ABC123",
      "delivery_address": "456 Oak Ave...",
      "customer_name": "John Doe",
      "customer_phone": "+11234567890",
      "notes": "Leave at door",
      "total": 35.50,
      "business": { "name": "My Restaurant", "address": "123 Main St..." },
      "items": [ ... ]
    }
  }
}
```

---

## POS Integration

### Square / Clover

```
GET    /ecommerce/pos/connections              List POS connections (admin)
POST   /ecommerce/pos/connect                  Connect POS (Square/Clover)
DELETE /ecommerce/pos/connections/{connection} Remove connection

GET    /ecommerce/pos/catalog                  Sync POS catalog → menu items
POST   /ecommerce/pos/catalog/sync             Push/sync catalog
POST   /ecommerce/pos/payment                  Create POS payment
GET    /ecommerce/orders/{order}/pos-orders    POS orders for an order (admin)

POST   /webhooks/pos/square                    Square webhook ← no auth
POST   /webhooks/pos/clover                    Clover webhook ← no auth
```

---

## Webhooks

> All webhook endpoints are **public** (no auth). Verified by signature or DoorDash JWT.

| Endpoint | Provider | Configure in |
|----------|----------|-------------|
| `POST /webhooks/delivery/doordash` | DoorDash Drive | DoorDash Developer Portal → Webhooks |
| `POST /webhooks/delivery/ubereats` | UberEats Merchant | merchant.uber.com → Settings → Webhooks |
| `POST /webhooks/delivery/instacart` | Instacart Connect | connect.instacart.com → Webhooks |
| `POST /webhooks/pos/square` | Square | Square Developer Dashboard → Webhooks |
| `POST /webhooks/pos/clover` | Clover | Clover Developer Dashboard |
| `POST /ecommerce/stripe/webhook` | Stripe | Stripe Dashboard → Webhooks |

**DoorDash webhook events handled:**
- `delivery_status` changes → order status synced
- `tracking_url` updated → stored in `orders.tracking_url` + `orders.doordash_tracking_url`
- `estimated_delivery_time` → stored in `orders.estimated_delivery_at`

**UberEats webhook events handled:**
- `orders.notification` / `eats.order` → creates `PlatformOrder` (status=received)
- `orders.cancel` → marks `PlatformOrder` as cancelled

**Instacart webhook events handled:**
- `order.created` / `order.placed` → creates `PlatformOrder`
- `order.cancelled` → marks cancelled
- `fulfillment.delivered` → marks delivered

---

## Error Responses

```json
{ "message": "Unauthenticated." }          // 401
{ "message": "Forbidden." }                // 403
{ "message": "Not found." }               // 404
{ "message": "...", "errors": { ... } }   // 422 Validation error
{ "message": "...", "success": false }    // 502 External API error
```

---

## Environment Variables Required

```env
# DoorDash
DOORDASH_ENV=sandbox
DOORDASH_SANDBOX_DEVELOPER_ID=
DOORDASH_SANDBOX_KEY_ID=
DOORDASH_SANDBOX_SIGNING_SECRET=
DOORDASH_SANDBOX_BASE_URL=https://openapi.doordash.com/drive/v1

DOORDASH_PRODUCTION_DEVELOPER_ID=
DOORDASH_PRODUCTION_KEY_ID=
DOORDASH_PRODUCTION_SIGNING_SECRET=
DOORDASH_PRODUCTION_BASE_URL=https://openapi.doordash.com/drive/v1

# UberEats + Instacart — credentials stored in delivery_settings table per business
# (Admin Panel → Delivery Settings → UberEats / Instacart)

# Stripe
STRIPE_KEY=
STRIPE_SECRET=
STRIPE_WEBHOOK_SECRET=
```
