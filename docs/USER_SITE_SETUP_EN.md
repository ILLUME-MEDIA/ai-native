# User Site Integration Guide — Support & Refund System

## Overview

Your main Laravel app (admin backend) runs on **Domain A** (e.g., `admin.yourdomain.com`).
Your customer-facing site runs on **Domain B** (e.g., `shop.yourdomain.com`).

This guide explains how to embed the Support + Refund widget on Domain B so customers can:
- Submit refund requests for their orders
- Open support tickets
- Chat with admin in real-time (polling — works on cPanel)

---

## How It Works — Architecture

```
Customer (Domain B)          Admin Backend (Domain A)
┌─────────────────┐          ┌─────────────────────┐
│  SupportRefundApp │──API──▶ │  /api/ecommerce/*   │
│  (React widget)  │◀──JSON── │  /api/my-orders/*   │
└─────────────────┘          └─────────────────────┘
         │
         │ Polling every 4s
         │ (no WebSocket needed)
         ▼
   New messages appear
   automatically
```

---

## Step 1 — Allow Your User Domain in CORS

On **Domain A** (Laravel `.env`), add your user site domain:

```env
CORS_ALLOWED_ORIGINS=https://shop.yourdomain.com,http://localhost:3000,...existing...
```

Then run:
```bash
php artisan config:cache
```

---

## Step 2 — Install Widget on User Site

### Option A — React (Recommended)

Copy these files to your user site project:
```
resources/js/User/
  SupportRefundApp.jsx
  components/
    SupportChat.jsx
    SupportTickets.jsx
    RefundWidget.jsx
```

Then use in any page:
```jsx
import SupportRefundApp from './User/SupportRefundApp';

// For guest users (no login):
<SupportRefundApp
  apiBase="https://admin.yourdomain.com"
  sessionId={localStorage.getItem('session_id') ?? generateUUID()}
/>

// For OTP-authenticated users:
<SupportRefundApp
  apiBase="https://admin.yourdomain.com"
  authHeader={`Bearer ${otpToken}`}
  sessionId={sessionId}
/>
```

### Option B — Plain HTML / Any Framework

Use the API directly with `fetch`. No framework needed.

---

## Step 3 — User Authentication

### Guest Users (No Login)
Use a UUID stored in `localStorage` as session ID:

```js
// Generate once, save forever
if (!localStorage.getItem('user_session')) {
  localStorage.setItem('user_session', crypto.randomUUID());
}
const sessionId = localStorage.getItem('user_session');

// Pass as header on every request:
headers: { 'X-Session-Id': sessionId }
```

**Important:** This session ID must be the same one used when placing orders (`session_id` field on `orders` table). The API links tickets and refunds to orders via this session ID.

### OTP-Authenticated Users
```js
// After OTP verify, you get a token:
const token = await fetch('/api/otp-auth/verify', { ... }).then(r => r.json());

// Use as:
headers: { 'Authorization': `Bearer ${token.token}` }
```

---

## Step 4 — Setting Session ID When Creating Orders

When customer places an order on your user site, send the same `session_id`:

```js
fetch('https://admin.yourdomain.com/api/ecommerce/orders', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Session-Id': sessionId,  // ← same UUID as in localStorage
  },
  body: JSON.stringify({ business_id: 1, items: [...] })
});
```

This links the order to the user's session so they can see their own orders and request refunds.

---

## Available APIs for User Site

All endpoints are on Domain A (`https://admin.yourdomain.com/api/...`).

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/my-orders` | List my orders |
| GET | `/my-orders/{id}` | Single order detail |

### Refunds
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/my-orders/{id}/refund-request` | Submit refund request |
| GET  | `/my-orders/{id}/refund` | Check refund status |
| GET  | `/my-refunds` | All my refund requests |

### Support Tickets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | `/ecommerce/support/tickets` | List my tickets |
| POST | `/ecommerce/support/tickets` | Open new ticket |
| GET  | `/ecommerce/support/tickets/{id}` | View ticket + messages |
| POST | `/ecommerce/support/tickets/{id}/messages` | Send message |
| POST | `/ecommerce/support/tickets/{id}/close` | Close ticket |

---

## Step 5 — Polling (Real-time Chat Without WebSocket)

The widget automatically polls every **4 seconds** when a chat is open. No setup needed.

If you later add Pusher (free at pusher.com), update `.env`:
```env
BROADCAST_CONNECTION=pusher
PUSHER_APP_ID=your_id
PUSHER_APP_KEY=your_key
PUSHER_APP_SECRET=your_secret
PUSHER_APP_CLUSTER=ap2

VITE_PUSHER_APP_KEY="your_key"
VITE_PUSHER_APP_CLUSTER="ap2"
```
The frontend auto-detects Pusher and switches to true WebSocket. No code change needed.

---

## Step 6 — Admin Workflow

1. Customer submits ticket → appears in `/admin/apps/ecommerce/support`
2. Admin opens ticket → chat modal opens
3. Admin replies → customer sees it within 4 seconds (polling)
4. Admin can **Resolve** (with note) or **Close** ticket
5. For refunds → `/admin/apps/ecommerce/refunds` → Approve with refund type (Full / Partial / Items / Platform Fee / Tip)
6. If Stripe payment exists → Stripe refund processed automatically

---

## Step 7 — Refund Settings

Go to Admin → Ecommerce → Fee & Tip Settings → **Refund Policy**:

| Setting | Description |
|---------|-------------|
| Auto-Refund via Stripe | If ON, approved refunds are processed immediately via Stripe |
| Refund Window Hours | e.g., 24 = customer can only request refund within 24 hours of order |

---

## Deployment Checklist

- [ ] CORS domain added in `.env`
- [ ] `php artisan config:cache` run on server
- [ ] Session ID stored in customer's `localStorage`
- [ ] Same session ID used for order placement AND support/refund requests
- [ ] Widget deployed on user site with correct `apiBase` URL
- [ ] Test: place order → request refund → open ticket → admin replies → customer sees reply within 4s
