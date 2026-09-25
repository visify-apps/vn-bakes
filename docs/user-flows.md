# User Flows — Home Bakery Enquiry SaaS

**Status:** MVP flow reference  
**Principle:** Structured enquiry first; WhatsApp for conversation continuation.

---

## 1. Customer — discover from Instagram

```
Instagram profile / post
  → Website (bio link / story link)
  → Homepage
```

Homepage goals:

1. Trust (brand, handmade, preorder clarity)  
2. Primary action: **Start a Cake Enquiry**  
3. Secondary: **View Menu**  
4. Escape hatch: **Prefer WhatsApp?**

---

## 2. Customer — browse menu / product

```
View Menu
  → Categories
  → Product list (Firestore)
  → Product detail
       ├─ If requiresCustomEnquiry / priceType enquiry → Start enquiry (pre-fill type/product)
       └─ Else → Enquire about this product (same multi-step, fewer forced fields) OR WhatsApp
```

MVP: product CTAs funnel into enquiry form with `productId` / `requestType` prefilled rather than cart checkout.

---

## 3. Customer — custom cake enquiry (primary)

```
Step 1 What do you need?
Step 2 Occasion
Step 3 Cake requirements (mostly optional fields)
Step 4 Reference image + notes
Step 5 Preferred date (+ 4–5 day notice; block if too soon)
Step 6 Pickup / Delivery (+ address if delivery)
Step 7 Name + WhatsApp phone (+ optional email)
Step 8 Review
     → Submit (disabled while loading; submissionToken)
     → Success page
          ├─ Enquiry number displayed
          └─ Continue on WhatsApp (pre-filled message with ID)
```

**Back** preserves draft. Progress indicator `n / 8`.

### Failure paths

| Failure | UX |
|---------|-----|
| Validation | Inline errors; stay on step |
| Date too soon | Clear message with minimum days |
| Upload fail | Message; allow retry or submit without image |
| Firestore fail | No success page; retry CTA |
| Double click | Ignored via disabled + token |

---

## 4. Customer — WhatsApp continuation

```
Success page → wa.me link
  → WhatsApp opens with structured summary + enquiry ID
  → Baker matches ID in admin dashboard
```

Customer may also use homepage WhatsApp without submitting (unstructured — discouraged but available).

---

## 5. Admin — login

```
/admin/login
  → Email / password (Firebase Auth)
  → Verify adminUsers membership
  → /admin dashboard
```

Unauthenticated access to `/admin/*` redirects to login.

---

## 6. Admin — daily operations

```
Dashboard
  → See NEW count, upcoming dates, pending quotes
  → Open Enquiries
       → Filter / search
       → Open enquiry detail
            ├─ Read customer + request + reference image
            ├─ Change status (NEW → REVIEWING → …)
            ├─ Add internal note
            ├─ Enter quotation (auto balance)
            ├─ Open WhatsApp quote message
            ├─ Mark confirmed / completed
            └─ (Phase 7) Create order from enquiry
```

---

## 7. Admin — quotation flow

```
Enter quotedPrice + advanceRequired + notes
  → balanceAmount calculated
  → Save on enquiry (status → QUOTE_SENT optional)
  → Open WhatsApp with quote template
  → Baker sends manually
```

No online payment collection.

---

## 8. Admin — products

```
/admin/products
  → List
  → Create / edit / disable (available=false)
  → Public menu updates from Firestore
```

---

## 9. Admin — customers & orders

```
Customers: list/search by name/phone; view totals (MVP basic)
Orders: list created from accepted enquiries; paymentStatus manual
```

---

## 10. Enquiry → Order (conceptual)

```
Enquiry CONFIRMED (or baker action “Create order”)
  → Order document created
  → enquiry.orderId set
  → Customer totals updated (admin-side)
```

Exact trigger button can be “Convert to order” on enquiry detail (Phase 7).

---

## 11. Out-of-flow (not built)

- Customer account / order tracking portal  
- Automated WhatsApp reminders  
- Online advance payment  
- Delivery fee quote calculator  
- Baking class registration
