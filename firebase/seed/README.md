# Seed data guide — Bommi's Bakery

Use this after creating the Firebase project (project id may stay `cakes-by-kee`).

## 1. Create business

Document: `businesses/bommis-bakery`

```json
{
  "businessId": "bommis-bakery",
  "slug": "bommis-bakery",
  "displayName": "Bommi's Bakery",
  "kind": "bakery",
  "status": "active"
}
```

## 2. Settings

`businesses/bommis-bakery/settings/general` — Bommi's Bakery, Instagram `bommis__bakery`, WhatsApp, INR, pickup/delivery.

`businesses/bommis-bakery/settings/orderRules` — `minimumPreorderDays: 3`, pickup + delivery on.

## 3. Categories & products

Import from `src/data/seedCatalogue.js` (theme cakes, wedding/fondant, fresh cream, baking classes).

## 4. Admin user

1. Create Email/Password user in Firebase Auth (baker).
2. Create `businesses/bommis-bakery/adminUsers/{uid}` with `{ "businessId": "bommis-bakery", "email": "...", "role": "owner" }`.

## 5. Visify operator (you)

Create Auth user `visifyapps@gmail.com`, then:

`visifyOperators/{yourAuthUid}`

Desk lives on the **separate** Visify site: `https://visify-apps.github.io/visify-desk/` — never on the bakery Pages URL.

## 6. Deploy rules

```bash
npx firebase-tools login
npx firebase-tools use cakes-by-kee
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```
