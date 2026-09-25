# Product Requirements — Home Bakery Enquiry & Order Management SaaS

**Status:** MVP specification (source of truth)  
**Pilot seller:** Cakes by Kee (`_cakes_by_kee_`)  
**Principle:** Multi-business-capable architecture; first deployment contains one bakery only.

---

## 1. Product purpose

Replace unstructured WhatsApp order collection with a structured enquiry flow, while keeping WhatsApp as the continuation channel.

**Target flow**

```
Instagram → Bakery website → Structured enquiry → Firebase → Baker reviews → Customer continues on WhatsApp
```

**Problem being solved**

- Customers repeatedly explain cake type, occasion, date, flavour, size, customisation, reference image, pickup/delivery over WhatsApp.
- Baker maintains orders via WhatsApp notes and manual methods.
- Structured customer/order data is not preserved for reuse.

**Problem NOT being solved**

- Replacing WhatsApp as the conversation channel.
- Full e-commerce checkout for unique custom cakes.

---

## 2. Core product principle

**Do not build a normal e-commerce checkout for custom cakes.**

| Flow | Path |
|------|------|
| Custom cake (primary) | Browse → Custom Cake → Requirements → Reference image → Preferred date → Submit enquiry → Baker quotes → WhatsApp |
| Standardised products | Simpler product enquiry/order path (brownies, selected regular cakes) — still enquiry-oriented for MVP unless price is fixed and clearly orderable |

Custom cakes are frequently unique and non-repetitive. Do not force: Product → Cart → Fixed price → Checkout.

---

## 3. Pilot business context

| Attribute | Value |
|-----------|--------|
| Brand | Cakes by Kee |
| Instagram | `_cakes_by_kee_` (~5.4k followers) |
| Operating since | ~2020 |
| Channel | Instagram → WhatsApp (no Instagram DMs for orders) |
| Preorder | ~4–5 days advance |
| Fulfillment | Self pickup; delivery charges extra |
| Strengths | Custom cakes, bulk orders, baking classes |

**Catalogue themes (seed, not hardcoded UI):** fresh cream cakes, fondant/wedding, special/fusion, brownies (min 8 pcs), cupcakes, lava, bento, tier, plum, bulk, seasonal, highly custom themes.

Baking classes are noted for future; **out of MVP scope** as a booking product.

---

## 4. Actors

| Actor | Auth | Capabilities |
|-------|------|----------------|
| Public customer | None | Browse, submit enquiry, open WhatsApp link |
| Bakery admin | Firebase email/password | Manage products, enquiries, customers, orders, settings |

---

## 5. Interfaces & routes

### Public (customer)

| Route | Purpose |
|-------|---------|
| `/` | Homepage |
| `/menu` | Category / menu browse |
| `/cakes` | Cake-focused listing (or alias into menu) |
| `/custom-cake` | Multi-step custom enquiry |
| `/products/:productId` | Product detail |
| `/enquiry/success` | Confirmation + WhatsApp CTA |

### Admin

| Route | Purpose |
|-------|---------|
| `/admin/login` | Admin login |
| `/admin` | Dashboard |
| `/admin/enquiries` | Enquiry list |
| `/admin/enquiries/:id` | Enquiry detail |
| `/admin/products` | Product management |
| `/admin/customers` | Customer list |
| `/admin/orders` | Order list |
| `/admin/settings` | Business & order rules |

Admin routes are protected.

---

## 6. Public homepage requirements

Must communicate:

- Bakery name and short description
- Custom cakes, brownies, bento, other products
- Preorder requirement
- Pickup / delivery info
- Primary CTA: **Start a Cake Enquiry**
- Secondary CTA: **View Menu**
- Visible WhatsApp option (“Prefer WhatsApp?”) — not the only ordering method

Visual tone: warm, premium, handmade, trustworthy. Mobile-first.

---

## 7. Menu & products

Categories (MVP):

- Custom Cakes
- Regular Cakes
- Bento Cakes
- Brownies
- Cupcakes
- Lava Cakes
- Wedding / Tier Cakes
- Bulk Orders
- Seasonal

Products live in Firestore. Admin can create / edit / disable. **Do not hardcode products in React components.**

### Product fields

| Field | Notes |
|-------|--------|
| `id` | Document ID |
| `businessId` | Tenant key |
| `name` | Display name |
| `categoryId` | Category ref |
| `description` | Public copy |
| `imageUrls[]` | Storage or public URLs |
| `basePrice` | Number or null |
| `priceType` | `fixed` \| `starting_from` \| `enquiry` |
| `minimumQuantity` | e.g. brownies = 8 |
| `available` | Soft disable |
| `requiresCustomEnquiry` | Routes to enquiry flow |
| `customFields[]` | Future product-specific fields |
| `displayOrder` | Sort |
| `createdAt` / `updatedAt` | Timestamps |

---

## 8. Custom cake enquiry (primary feature)

Mobile-first multi-step form with progress (`1 / N`), back navigation without data loss, progressive disclosure.

| Step | Content |
|------|---------|
| 1 | Need: Custom / Regular / Bento / Brownies / Bulk / Other |
| 2 | Occasion (+ custom text) |
| 3 | Requirements: size, servings, flavour, egg/eggless, shape, theme, colour, text on cake, age, other (mostly optional) |
| 4 | Reference image upload + optional description |
| 5 | Preferred date + preorder notice (4–5 days); architect for future availability rules |
| 6 | Pickup or delivery (+ address fields if delivery); “Delivery charges extra” |
| 7 | Customer: name, WhatsApp phone (required), email optional |
| 8 | Review + Submit Enquiry |

### Submission behaviour

1. Validate  
2. Upload image if present  
3. Generate human-readable enquiry number (e.g. `CK-20260910-001`) + Firestore doc ID  
4. Save enquiry  
5. Create/update customer  
6. Timestamps  
7. Success page  
8. WhatsApp continuation link with pre-filled structured message  

### Duplicate protection

- Loading state  
- Disabled submit  
- Client submission token / idempotency key where appropriate  

### Error handling

Never silent fail. Never show success if Firestore write failed. Cover missing fields, invalid phone/date, date too soon, upload/Firestore/network failure.

---

## 9. Enquiry statuses

Initial: `NEW`

| Status | Meaning |
|--------|---------|
| `NEW` | Just submitted |
| `REVIEWING` | Baker reviewing |
| `QUOTE_SENT` | Quote shared |
| `CUSTOMER_CONFIRMED` | Customer accepted |
| `ADVANCE_PENDING` | Waiting for advance |
| `CONFIRMED` | Accepted order intent |
| `IN_PREPARATION` | Baking |
| `READY` | Ready for pickup/delivery |
| `COMPLETED` | Done |
| `CANCELLED` | Cancelled |
| `REJECTED` | Rejected |

MVP: manual status changes only. Prefer status over hard delete.

---

## 10. Admin dashboard

Simple counts / lists (no heavy analytics):

- Today’s enquiries  
- New enquiries  
- Upcoming orders  
- Pending quotations  
- Pending confirmations  
- Upcoming cake dates  
- Recent customers  

Example tiles: New enquiries, Upcoming orders, Pending quotes, This week ₹ (if data exists).

### Enquiry list

Show: enquiry ID, customer, type, occasion, preferred date, status, created, WhatsApp button.  
Filters: status, date, category, occasion.  
Search: name, phone, enquiry ID.

### Enquiry detail

**Customer:** name, phone, WhatsApp  
**Request:** type, occasion, date, size, flavour, egg/eggless, theme, message, reference image, fulfillment, address  
**Business (internal):** status, notes, quoted price, advance, balance  

Actions: change status, notes, quotation, WhatsApp, mark confirmed/completed.  
Internal notes never exposed to customers.

### Quotation

Baker enters: `quotedPrice`, `advanceRequired`, `quotationNotes`.  
`balanceAmount = quotedPrice - advanceRequired`.  
No online payment in MVP.  
CTA: open WhatsApp with pre-filled quote message; UI copy like “Quote sent via WhatsApp”.

---

## 11. Customers & orders

**Customers** are a separate entity (not only nested in enquiries). See schema docs.

**Enquiry ≠ Order.**

- Enquiry: customer wants a Barbie cake.  
- Order: bakery accepted for a quoted price.

Orders track payment status without a payment gateway: `UNPAID`, `ADVANCE_PENDING`, `PARTIALLY_PAID`, `PAID`, `REFUNDED`.

---

## 12. Business settings

| Setting | MVP intent |
|---------|------------|
| Identity | name, displayName, description, logo, cover, phone, WhatsApp, address, Instagram |
| Fulfillment | pickupAvailable, deliveryAvailable |
| Rules | minimumPreorderDays = 4 |
| Pricing | currency (INR) |
| Delivery charge mode | `manual` (no calculator) |
| Hours | openingHours (display) |

---

## 13. WhatsApp (MVP)

- Click-to-chat only: `https://wa.me/<phone>?text=<encoded>`  
- Helper: `generateWhatsAppLink(phone, message)`  
- Pre-filled messages include **enquiry ID**  
- No WhatsApp Business API, no auto-send, no paid provider  

---

## 14. Non-functional requirements

| Area | Requirement |
|------|-------------|
| Stack | React + Vite + JS + Firebase (Auth, Firestore, Storage) |
| Hosting | GitHub Pages (static); no Express on host |
| Cost | Free-tier oriented; no paid CDN/email/analytics/WhatsApp API for MVP |
| Auth | Admin only; customers never register |
| Security | Strict Firestore/Storage rules; no Admin SDK / service accounts in frontend |
| Images | jpg/jpeg/png/webp; max ~5 MB; business-scoped paths |
| Responsive | 360–1440px; customer mobile-first; admin desktop-first |
| Routing | Prefer hash routing for GitHub Pages reliability |
| Soft delete | Prefer CANCELLED / REJECTED / ARCHIVED |

---

## 15. Seed & demo data

- Seed categories and sample products from known catalogue (dev-safe).  
- Demo enquiries: `CK-DEMO-001` … `003` with varied statuses; one with reference image placeholder if possible.  
- No fake real-person PII beyond clearly synthetic demo names.

---

## 16. Explicitly out of scope (MVP)

See `future-roadmap.md`. Includes payments, WhatsApp API, delivery zones, calendar availability, loyalty, multi-staff SaaS billing, AI features, baking-class booking, Express/Cloud Functions.

---

## 17. Success criteria (MVP)

1. Customer can complete custom enquiry without an account.  
2. Data lands in Firestore under a `businessId`.  
3. Success page offers WhatsApp with enquiry ID.  
4. Admin can login, list/detail enquiries, status, notes, quote, WhatsApp.  
5. Products managed in admin, shown on public site.  
6. Unauthenticated users cannot read enquiries/customers/orders.  
7. `npm run build` succeeds; GitHub Pages deploy path documented.
