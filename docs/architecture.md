# Architecture — Home Bakery Enquiry SaaS

**Status:** Technical source of truth (MVP)  
**Related:** `product-requirements.md`, `firestore-schema.md`, `security-rules.md`, `deployment.md`

---

## 1. Summary

Static React SPA (Vite) talking directly to Firebase services. No Node/Express server in MVP. Multi-tenant data model keyed by `businessId`; first deployment seeds one business (Cakes by Kee).

```
┌─────────────────┐     ┌──────────────────────────────┐
│  React (Vite)   │────▶│  Firebase Auth (admin only)  │
│  GitHub Pages   │────▶│  Cloud Firestore             │
│  Hash routing   │────▶│  Firebase Storage            │
└─────────────────┘     └──────────────────────────────┘
         │
         └──▶ wa.me links (client-generated, no API)
```

---

## 2. Stack decisions

| Choice | Why |
|--------|-----|
| React + Vite + JavaScript | Spec requirement; simple for one developer |
| React Router (HashRouter) | SPA routes without GitHub Pages rewrite complexity |
| Firebase Auth / Firestore / Storage | Auth + DB + files without a custom server |
| No Redux | Local state + React Context sufficient |
| No UI framework unless needed | Custom CSS for brand control; small CSS modules/files |
| No Cloud Functions in MVP | Cost + complexity; client + rules enough |
| WhatsApp click-to-chat | Free continuation channel |

---

## 3. Multi-tenant model (architecture only)

```
User (Firebase Auth)
  └── adminUsers/{uid} → { businessId, role }
        └── businesses/{businessId}
              ├── products, categories
              ├── enquiries, customers, orders
              └── settings/*
```

- All business-owned documents include `businessId` where useful for queries/rules.
- Public site for MVP reads a **configured default `businessId`** (env or config), not a hardcoded brand string in components.
- Future public paths like `/b/cakes-by-kee` can resolve slug → `businessId` without rewriting collections.

**Not in MVP:** SaaS billing, multi-business switcher UI, staff invite flows beyond single admin.

---

## 4. Proposed folder structure

```
CakeStoreFront/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Pages: install → build → deploy dist
├── docs/
│   ├── product-requirements.md
│   ├── architecture.md
│   ├── firestore-schema.md
│   ├── security-rules.md
│   ├── user-flows.md
│   ├── future-roadmap.md
│   └── deployment.md
├── firebase/
│   ├── firestore.rules
│   ├── storage.rules
│   ├── firestore.indexes.json
│   └── seed/                   # scripts or JSON for seed/demo data
├── public/
│   ├── 404.html                # optional GH Pages fallback if needed
│   └── favicon / assets
├── src/
│   ├── components/
│   │   ├── common/             # Button, Input, Spinner, ErrorMessage
│   │   ├── customer/           # MenuCard, Enquiry steps, WhatsAppCTA
│   │   └── admin/              # StatusBadge, EnquiryTable, QuoteForm
│   ├── pages/
│   │   ├── public/             # Home, Menu, ProductDetail, CustomCake, Success
│   │   └── admin/              # Login, Dashboard, Enquiries, Products, etc.
│   ├── layouts/
│   │   ├── PublicLayout.jsx
│   │   └── AdminLayout.jsx
│   ├── hooks/                  # useAuth, useBusiness, useEnquiryForm
│   ├── services/
│   │   ├── firebase/           # app init
│   │   ├── firestore/          # products, enquiries, customers, orders, settings
│   │   ├── storage/            # reference image upload
│   │   └── whatsapp/           # generateWhatsAppLink + message builders
│   ├── context/                # AuthContext, BusinessContext, EnquiryDraftContext
│   ├── utils/                  # validation, dates, enquiryNumber, phone
│   ├── config/                 # env wrappers, defaultBusinessId
│   ├── types/                  # JSDoc typedefs (no TS required for MVP)
│   ├── data/                   # local seed mirrors / constants (not product catalogue)
│   ├── styles/                 # global tokens, public theme, admin theme
│   ├── routes/                 # route tables, ProtectedRoute
│   ├── App.jsx
│   └── main.jsx
├── .env.example
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

**Intentionally absent:** `functions/` (Cloud Functions), Express server, monorepo packages.

---

## 5. Frontend architecture

### Routing

- Use **HashRouter** (`/#/menu`, `/#/admin/...`) for GitHub Pages without server rewrite rules.
- Custom domain later still works with hash routing; can migrate to BrowserRouter + SPA fallback when hosting supports it.

### State

| Concern | Approach |
|---------|----------|
| Auth session | Firebase Auth + `AuthContext` |
| Business settings / branding | `BusinessContext` loaded once per session |
| Enquiry multi-step draft | Component state or light context; persist optional `sessionStorage` |
| Admin lists | Fetch on mount; simple local filter state |

### Service layer

Pages/components call thin service modules; no direct Firestore sprinkled in deep UI without a service boundary. Keeps rules/schema changes localized.

---

## 6. Data & ID strategy

| ID type | Purpose |
|---------|---------|
| Firestore document ID | Internal primary key; concurrency-safe |
| `enquiryNumber` e.g. `CK-20260910-001` | Human / WhatsApp reference |
| Client `submissionToken` | Idempotency for double-submit |
| Customer key | Prefer normalize phone under business; create-or-update on enquiry |

Enquiry number generation (MVP proposal):

1. Use date prefix `CK-YYYYMMDD-`.
2. Use a short Firestore transaction on `businesses/{id}/counters/enquiries` **or** append random/suffix from doc ID if counters are undesirable.
3. Document chosen approach in schema; prefer counter transaction for readable sequential demos, with awareness of contention (acceptable at bakery scale).

---

## 7. Image upload

1. Client validates type (`image/jpeg`, `image/png`, `image/webp`) and size (≤ 5 MB).  
2. After enquiry ID known (or temp path then move — MVP: upload after creating doc ID client-side via `doc()` then write).  
3. Path: `businesses/{businessId}/enquiries/{enquiryId}/reference/{filename}`.  
4. Store download URL or storage path on enquiry document.  
5. Storage rules: allow create for unauthenticated only under enquiry reference path with content-type/size constraints; no list/delete for public.

---

## 8. Security model (overview)

Full rules in `security-rules.md`.

| Resource | Public | Admin |
|----------|--------|-------|
| Business public profile / settings.general (public fields) | Read | Read/Write |
| Products / categories (available) | Read | CRUD |
| Enquiries | Create only (own submit) | Full read/update |
| Customers | No read; create/update via controlled enquiry path | Full |
| Orders | No | Full |
| Internal notes / quotes | No | Yes |
| Admin users | No | Read own membership |

Admin authorization: authenticated UID must exist in `businesses/{businessId}/adminUsers/{uid}` (or top-level mapping) with matching `businessId`.

**Never** ship service account JSON or Admin SDK credentials in the React app. Vite `VITE_FIREBASE_*` values are public client config.

---

## 9. WhatsApp integration

```
generateWhatsAppLink(phoneE164OrLocal, message) → https://wa.me/{digits}?text={encodeURIComponent(message)}
```

Builders:

- `buildEnquiryContinuationMessage(enquiry, business)`
- `buildQuotationMessage(enquiry, quotation, business)`

No third-party WhatsApp provider in architecture.

---

## 10. Environment configuration

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_DEFAULT_BUSINESS_ID
VITE_BASE_PATH          # optional for GH Pages project site
```

---

## 11. Implementation phases

| Phase | Deliverable | Exit criteria |
|-------|-------------|-----------------|
| **1** ✅ | Vite React app, Firebase init, routing, styles, env | App boots; HashRouter + layouts live |
| **2** ✅ | Public homepage, menu, product detail | Browse works (Firestore + seed fallback) |
| **3** ✅ | Custom enquiry multi-step, upload, submit, success | End-to-end enquiry write (demo mode without Firebase) |
| **4** ✅ | Admin Auth + protected routes | Login gate works (Firebase or demo session) |
| **5** ✅ | Admin enquiries list/detail, status, notes, quote | Baker can operate enquiries |
| **6** ✅ | Customer records UI + upsert on admin sync | Customers collection populated |
| **7** ✅ | Orders model + admin list (convert from enquiry) | Enquiry ≠ Order separation |
| **8** ✅ | WhatsApp helpers wired on success + admin | Links open with correct text |
| **9** ✅ | Firestore + Storage security rules | Rules in `firebase/` ready to deploy |
| **10** ✅ | Seed docs, GH Actions, docs finalize | Deployable MVP |

Do not start Phase N+1 until Phase N works.

---

## 12. Testing strategy (MVP)

Manual / checklist-driven (automated tests optional later):

- Customer happy path including image + WhatsApp link  
- Admin login → enquiry → quote → WhatsApp  
- Product CRUD visibility on public site  
- Security: unauthenticated denied on enquiries/customers  
- Build: `npm run build`

---

## 13. Assumptions (reasonable defaults)

1. Single currency: INR (`₹`).  
2. Phone format: Indian mobile; store digits with country code preference `91…`.  
3. Default business slug/id for pilot: `cakes-by-kee` (document ID).  
4. Hash routing for MVP hosting.  
5. One admin user seeded manually in Firebase Console + `adminUsers` doc.  
6. Product images for seed may use placeholders / Unsplash-style URLs or empty arrays until real assets uploaded.  
7. “This week ₹” dashboard uses sum of confirmed/completed order quotes when available; else hide or show `—`.  
8. `/cakes` can list cake categories/products filtered from the same products collection.

---

## 14. Contradictions & open points

Documented in the plan review (Section “Gaps & contradictions”). Architecture prefers:

- HashRouter over BrowserRouter for GH Pages.  
- Customers writable only through constrained create rules or admin; public “upsert customer” must not allow reading other customers.  
- Enquiry create allowed publicly; fields whitelist in rules (no client-set internal notes/quotes).
