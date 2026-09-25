# Firestore Schema — Home Bakery Enquiry SaaS

**Status:** Data source of truth (MVP)  
**Pattern:** Nested under `businesses/{businessId}` (multi-business-ready)

---

## 1. Collection tree

```
businesses/{businessId}
  ├── categories/{categoryId}
  ├── products/{productId}
  ├── enquiries/{enquiryId}
  ├── customers/{customerId}
  ├── orders/{orderId}
  ├── adminUsers/{userId}          # Firebase Auth UID
  ├── counters/{counterId}         # e.g. enquiries
  └── settings/
        ├── general                # document
        └── orderRules             # document
```

Optional future (not MVP collections): `memberships`, `billing`, `campaigns`.

---

## 2. `businesses/{businessId}`

| Field | Type | Notes |
|-------|------|--------|
| `businessId` | string | Same as doc ID |
| `slug` | string | e.g. `cakes-by-kee` |
| `status` | string | `active` \| `archived` |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

Public branding primarily lives in `settings/general`.

---

## 3. `settings/general`

| Field | Type | MVP default / example |
|-------|------|------------------------|
| `businessName` | string | Cakes by Kee |
| `displayName` | string | Cakes by Kee |
| `description` | string | Short public blurb |
| `logoUrl` | string \| null | |
| `coverImageUrl` | string \| null | |
| `phone` | string | |
| `whatsappNumber` | string | Digits for wa.me |
| `address` | string | Pickup address |
| `pickupAvailable` | boolean | true |
| `deliveryAvailable` | boolean | true |
| `currency` | string | `INR` |
| `instagramUrl` | string | |
| `instagramHandle` | string | `_cakes_by_kee_` |
| `openingHours` | string \| map | Display string OK for MVP |
| `updatedAt` | timestamp | |

---

## 4. `settings/orderRules`

| Field | Type | MVP |
|-------|------|-----|
| `minimumPreorderDays` | number | `4` |
| `deliveryEnabled` | boolean | true |
| `pickupEnabled` | boolean | true |
| `deliveryChargeMode` | string | `manual` (`fixed` \| `zone_based` later) |
| `deliveryChargeFixed` | number \| null | null |
| `updatedAt` | timestamp | |

Architect date validation against `minimumPreorderDays` only; no calendar availability collection yet.

---

## 5. `categories/{categoryId}`

| Field | Type | Notes |
|-------|------|--------|
| `businessId` | string | |
| `name` | string | |
| `slug` | string | |
| `description` | string | optional |
| `displayOrder` | number | |
| `available` | boolean | |
| `createdAt` / `updatedAt` | timestamp | |

**Seed categories:** Custom Cakes, Fresh Cream, Wedding/Fondant, Special/Fusion, Brownies, Cupcakes/Lava, Bento, Seasonal, Bulk Orders.

---

## 6. `products/{productId}`

| Field | Type | Notes |
|-------|------|--------|
| `businessId` | string | |
| `name` | string | |
| `categoryId` | string | |
| `description` | string | |
| `imageUrls` | string[] | |
| `basePrice` | number \| null | |
| `priceType` | string | `fixed` \| `starting_from` \| `enquiry` |
| `minimumQuantity` | number \| null | e.g. 8 for brownies |
| `available` | boolean | |
| `requiresCustomEnquiry` | boolean | |
| `customFields` | array | `[{ key, label, type, required }]` — empty OK |
| `displayOrder` | number | |
| `createdAt` / `updatedAt` | timestamp | |

Examples:

- Chocolate Truffle → `starting_from`  
- Custom Barbie Cake → `enquiry`  
- Brownie SKU → `fixed` + `minimumQuantity: 8`

---

## 7. `enquiries/{enquiryId}`

Document ID: auto ID (internal). Human number separate.

| Field | Type | Notes |
|-------|------|--------|
| `businessId` | string | |
| `enquiryNumber` | string | e.g. `CK-20260910-001`, `CK-DEMO-001` |
| `submissionToken` | string | Client idempotency key |
| `status` | string | See status enum |
| `customerId` | string \| null | Linked after upsert |
| `customerSnapshot` | map | `{ name, phone, email }` denormalized |
| `requestType` | string | Custom Cake, Regular, Bento, … |
| `occasion` | string | |
| `occasionOther` | string \| null | |
| `cakeSize` | string \| null | |
| `servings` | string \| number \| null | |
| `flavour` | string \| null | |
| `eggPreference` | string \| null | `egg` \| `eggless` \| null |
| `shape` | string \| null | |
| `theme` | string \| null | |
| `colourPreference` | string \| null | |
| `messageOnCake` | string \| null | |
| `age` | string \| number \| null | |
| `otherRequirements` | string \| null | |
| `referenceImageUrl` | string \| null | |
| `referenceImagePath` | string \| null | Storage path |
| `referenceNotes` | string \| null | |
| `preferredDate` | string \| timestamp | Prefer timestamp + display |
| `fulfillmentType` | string | `pickup` \| `delivery` |
| `deliveryAddress` | map \| null | `{ address, area, pincode, notes }` |
| `productId` | string \| null | If started from a product |
| `quotedPrice` | number \| null | Admin only write |
| `advanceRequired` | number \| null | |
| `balanceAmount` | number \| null | computed |
| `quotationNotes` | string \| null | |
| `quoteSentAt` | timestamp \| null | |
| `internalNotes` | string \| null | **never public** |
| `orderId` | string \| null | When converted |
| `createdAt` / `updatedAt` | timestamp | |
| `source` | string | `website` |

### Status enum

`NEW` | `REVIEWING` | `QUOTE_SENT` | `CUSTOMER_CONFIRMED` | `ADVANCE_PENDING` | `CONFIRMED` | `IN_PREPARATION` | `READY` | `COMPLETED` | `CANCELLED` | `REJECTED`

### Public create whitelist

On create, client may set request + customerSnapshot + submissionToken + preferredDate + fulfillment + reference fields.  
Client **must not** set: `internalNotes`, quote fields, `status` other than `NEW`, `orderId`.

---

## 8. `customers/{customerId}`

| Field | Type | Notes |
|-------|------|--------|
| `businessId` | string | |
| `name` | string | |
| `phone` | string | Normalized digits |
| `email` | string \| null | |
| `createdAt` / `updatedAt` | timestamp | |
| `lastEnquiryAt` | timestamp \| null | |
| `lastOrderAt` | timestamp \| null | |
| `totalEnquiries` | number | |
| `totalOrders` | number | |
| `totalSpend` | number | |
| `tags` | string[] | empty for MVP |

**ID strategy (proposal):** deterministic `customerId` from normalized phone (e.g. hash or `phone_{digits}`) within business to simplify upsert **or** query-by-phone then create. Document implementation choice in Phase 6. Prefer no public list/query of customers.

---

## 9. `orders/{orderId}`

| Field | Type | Notes |
|-------|------|--------|
| `businessId` | string | |
| `enquiryId` | string | |
| `customerId` | string | |
| `orderNumber` | string | Human readable |
| `orderDate` | timestamp | |
| `deliveryDate` | timestamp \| null | Preferred / confirmed date |
| `status` | string | Align with fulfilment lifecycle |
| `quotedPrice` | number | |
| `advanceAmount` | number | |
| `balanceAmount` | number | |
| `paymentStatus` | string | See enum |
| `fulfillmentType` | string | `pickup` \| `delivery` |
| `createdAt` / `updatedAt` | timestamp | |

### Payment status

`UNPAID` | `ADVANCE_PENDING` | `PARTIALLY_PAID` | `PAID` | `REFUNDED`

No payment gateway fields required beyond notes for MVP.

---

## 10. `adminUsers/{userId}`

`userId` = Firebase Auth UID.

| Field | Type | Notes |
|-------|------|--------|
| `businessId` | string | |
| `email` | string | |
| `role` | string | `owner` \| `admin` |
| `displayName` | string \| null | |
| `createdAt` | timestamp | |

---

## 11. `counters/enquiries`

| Field | Type | Notes |
|-------|------|--------|
| `lastNumber` | number | Daily or global sequence |
| `lastDateKey` | string | `YYYYMMDD` if daily reset |

Used to mint `enquiryNumber` via transaction.

---

## 12. Storage paths

```
businesses/{businessId}/enquiries/{enquiryId}/reference/{fileName}
businesses/{businessId}/products/{productId}/{fileName}   # admin product images (Phase 5+)
```

Allowed content types: `image/jpeg`, `image/png`, `image/webp`. Max size ~5 MB (enforced in rules where possible + client).

---

## 13. Indexes (expected)

Composite indexes likely needed for admin queries, e.g.:

- enquiries: `status` + `createdAt`  
- enquiries: `preferredDate` + `status`  
- enquiries: `requestType` + `createdAt`  
- products: `categoryId` + `displayOrder`  
- products: `available` + `displayOrder`

Maintain in `firebase/firestore.indexes.json` as queries are finalized.

---

## 14. Soft-delete / history

Do not hard-delete enquiries, customers, or orders in normal flows. Use `CANCELLED` / `REJECTED` / `available: false` / future `ARCHIVED`.

---

## 15. Demo documents

| enquiryNumber | status |
|---------------|--------|
| `CK-DEMO-001` | `NEW` |
| `CK-DEMO-002` | `REVIEWING` / `QUOTE_SENT` |
| `CK-DEMO-003` | `CONFIRMED` / `COMPLETED` |

Synthetic customer names only.
