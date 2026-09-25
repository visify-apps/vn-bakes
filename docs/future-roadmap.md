# Future Roadmap — Intentionally Deferred

**Status:** Do not implement unless explicitly requested.  
**Rule:** If a future request conflicts with MVP architecture, call out the conflict before changing core docs.

---

## Deferred features

1. WhatsApp Business API  
2. Automated WhatsApp reminders  
3. Payment gateway  
4. Online advance payment  
5. Delivery fee calculator  
6. Delivery zones  
7. Calendar availability / capacity  
8. Production planning  
9. Inventory  
10. Customer segmentation  
11. Repeat-order campaigns  
12. Birthday campaigns  
13. Review automation  
14. Coupons  
15. Loyalty  
16. Analytics (beyond simple counts)  
17. Revenue dashboard (deep)  
18. Multiple staff accounts / roles UX  
19. Multiple businesses in one deployment UI  
20. Subscription billing / SaaS admin  
21. Platform SaaS admin dashboard  
22. AI enquiry classification  
23. AI quotation suggestions  
24. AI reference-image interpretation  
25. Baking class booking  
26. Customer login / order tracking portal  
27. Node.js / Express REST API  
28. Firebase Cloud Functions (unless security forces a thin submit function)  
29. Redux / heavy state libraries  
30. Docker / Kubernetes / microservices  

---

## Data already shaped for later

| Future need | Present in MVP model |
|-------------|----------------------|
| Segmentation / LTV | `customers.tags`, `totalSpend`, `totalOrders` |
| Campaigns | `lastEnquiryAt`, `lastOrderAt` |
| Payments | `paymentStatus`, advance/balance fields |
| Delivery zones | `deliveryChargeMode` enum includes `zone_based` |
| Availability | `preferredDate` + `minimumPreorderDays` (rules later) |
| Multi-tenant URLs | `businessId`, `slug` |
| Staff | `adminUsers.role` |

---

## Architecture evolution (expected later)

```
MVP:  React ──▶ Firebase (client SDK + rules)
Later: React ──▶ Cloud Functions / Express ──▶ Firebase Admin
       + WhatsApp API + Payment webhooks
```

Do not add that layer until a concrete MVP limitation requires it (e.g. secure customer upsert, App Check, server-side WhatsApp).
