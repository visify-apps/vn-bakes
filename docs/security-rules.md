# Security Rules — Home Bakery Enquiry SaaS

**Status:** Proposed security model (implement in Phase 9; design now)  
**Files (to be created in implementation):** `firebase/firestore.rules`, `firebase/storage.rules`

---

## 1. Principles

1. Least privilege: public read only what the storefront needs.  
2. Customers never authenticate; they may **create** enquiries (and upload reference images) with field constraints.  
3. Admin access requires Firebase Auth **and** membership in `adminUsers`.  
4. Internal notes, quotes, customers list, and orders are never publicly readable.  
5. No service account / Admin SDK in the frontend.  
6. Prefer deny-by-default.

---

## 2. Helper concepts (Firestore)

```
isSignedIn()          → request.auth != null
isAdmin(businessId)   → exists(.../adminUsers/$(request.auth.uid))
                        && get(...).data.businessId == businessId
isValidImageMeta()    → content type / size checks (Storage)
```

---

## 3. Firestore access matrix

| Path | Unauthenticated | Admin of business |
|------|------------------|-------------------|
| `businesses/{id}` | Read if `active` | Read/Write |
| `settings/general` | Read | Read/Write |
| `settings/orderRules` | Read (needed for preorder UX) | Read/Write |
| `categories/*` | Read if `available != false` (or all public categories) | CRUD |
| `products/*` | Read if `available == true` | CRUD (incl. unavailable) |
| `enquiries/*` | **Create** only (validated); no get/list | Read/Update (validated) |
| `customers/*` | No read/list; optional restricted create/update | CRUD |
| `orders/*` | Deny | CRUD |
| `adminUsers/*` | Deny | Read own; owner manage later |
| `counters/*` | Deny public read; allow update only via admin **or** carefully constrained enquiry transaction | Prefer admin-only counter + client uses Cloud Function later — see note |

### Counter / enquiry number note

**Ambiguity:** Public clients need a unique `enquiryNumber` without reading all enquiries.

**MVP options (choose one in implementation):**

| Option | Pros | Cons |
|--------|------|------|
| A. Client sets `enquiryNumber` = `CK-{date}-{docIdSuffix}` | No public counter | Less pretty sequential |
| B. Public transaction on `counters/enquiries` | Nice sequential IDs | Must lock counter rules tightly |
| C. Cloud Function | Cleanest security | Out of MVP stack preference |

**Recommendation for MVP:** Option A (doc-id-based human ID) **or** Option B with rules that only allow `increment` by 1 and no read of other data. Prefer **A** if rules review is tight; demos can still use `CK-DEMO-*` seed IDs.

---

## 4. Enquiry create validation (conceptual)

Allow create when:

- `businessId` matches path  
- `status == "NEW"`  
- Quote/internal fields absent or null  
- Required: `customerSnapshot.name`, `customerSnapshot.phone`, `preferredDate`, `requestType`, `fulfillmentType`  
- `submissionToken` present (string)  
- Optional: idempotency — if token exists, reject duplicate (hard without query; client UX + accept rare dup under rules)

**Update by public:** Deny (no public updates).

**Update by admin:** Allow status, notes, quote fields, links to order/customer; do not allow arbitrary wiping of audit fields without care.

---

## 5. Customer write from public

**Problem:** Upserting customers from an unauthenticated client is easy to abuse (overwrite someone’s name/spend).

**MVP recommendation:**

1. On enquiry create, store `customerSnapshot` on the enquiry (always).  
2. Admin SDK / Cloud Function would upsert customers securely — **not in MVP**.  
3. **Phase 6 compromise:** Admin-only customer collection updates; a small **authenticated admin trigger is N/A**. Instead:  
   - **Option 1 (preferred MVP):** Cloud-free approach — admin dashboard “Sync customer” or automatic upsert when **admin first opens** enquiry (admin credentials perform customer write).  
   - **Option 2:** Extremely locked public create: only create if doc doesn’t exist; only set name/phone/email/counters with increment; **no public read**. Still abuseable for spam docs.

**Plan default:** Option 1 — customer records created/updated by admin client when viewing/processing enquiry, plus batch seed. Enquiry always has snapshot for baker response speed.

Document this as intentional MVP security tradeoff.

---

## 6. Storage rules (conceptual)

Path: `businesses/{businessId}/enquiries/{enquiryId}/reference/{fileName}`

| Action | Public | Admin |
|--------|--------|-------|
| Read | Allow if object exists (or via download URL token) | Allow |
| Create | Allow if size ≤ 5MB and contentType in jpg/png/webp | Allow |
| Update/Delete | Deny | Allow |

Product image paths: admin only write; public read.

---

## 7. Auth

- Email/password for bakery admin.  
- No customer accounts.  
- Create admin user in Firebase Console; add matching `adminUsers/{uid}` document before first login works.

---

## 8. Frontend secrets policy

Safe in repo / CI as public client config:

- `VITE_FIREBASE_API_KEY` and other web app config keys  

Never commit:

- Service account JSON  
- Private keys  
- Admin SDK credentials  

Security is enforced by **rules**, not by hiding the API key.

---

## 9. Verification checklist

Rules files live in `firebase/firestore.rules` and `firebase/storage.rules` (Phase 9).

- [ ] Unauthenticated `get/list` enquiries → denied  
- [ ] Unauthenticated `get/list` customers → denied  
- [ ] Unauthenticated `get/list` orders → denied  
- [ ] Unauthenticated create enquiry with `internalNotes` set → denied  
- [ ] Unauthenticated read products (available) → allowed  
- [ ] Admin read/write enquiries → allowed  
- [ ] Random authenticated user without `adminUsers` → denied  
- [ ] Oversized / wrong-type storage upload → denied  

After seeding an admin user, verify with the Firebase Emulator Suite or the Rules Playground.

---

## 10. Future hardening (not MVP)

- App Check  
- Cloud Function for enquiry submission + customer upsert  
- Rate limiting  
- Virus scanning on uploads  
- Field-level encryption for phone (usually unnecessary)
