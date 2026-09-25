# Deployment — GitHub Pages + Firebase

**Status:** Deployment plan (implement Phase 10)

---

## 1. Overview

| Layer | Host |
|-------|------|
| Frontend SPA | GitHub Pages |
| Auth / DB / Storage | Firebase project |
| Custom domain | Configured by owner (Pages + optional Firebase unrelated) |

No Express process. `npm run build` outputs static `dist/`.

---

## 2. Vite / GitHub Pages

- Use `base` in `vite.config.js` appropriate to site type:
  - User/org site: `base: '/'`
  - Project site: `base: '/CakeStoreFront/'` (adjust to repo name)
- Prefer **HashRouter** so deep links work without `404.html` SPA hacks.
- Env vars: set `VITE_*` in GitHub Actions secrets / variables for production build.

---

## 3. Suggested GitHub Actions flow

Workflow path: `.github/workflows/deploy.yml`

```
on: push to main/master (or workflow_dispatch)
  → checkout
  → setup Node 22
  → npm ci
  → npm run build (inject VITE_* secrets/vars)
  → upload Pages artifact
  → deploy-pages
```

Enable **Settings → Pages → Build and deployment → GitHub Actions**.

Add repository **Secrets**: `VITE_FIREBASE_API_KEY`, `AUTH_DOMAIN`, `PROJECT_ID`, `STORAGE_BUCKET`, `MESSAGING_SENDER_ID`, `APP_ID`.

Optional **Variables**: `VITE_DEFAULT_BUSINESS_ID`, `VITE_BASE_PATH`.

---

## 4. Firebase setup (manual / CLI)

1. Create Firebase project.  
2. Enable Authentication (Email/Password).  
3. Create Firestore database.  
4. Storage is **optional** and often prompts for Blaze (paid billing). MVP default: **skip Storage**; customers send reference photos on WhatsApp.  
5. Register web app; copy config into `.env` / CI. Set `VITE_ENABLE_FIREBASE_STORAGE=false`.  
6. Deploy rules: `firebase deploy --only firestore:rules,firestore:indexes` (omit `storage` if unused).  
7. Seed business `cakes-by-kee`, categories, products, demo enquiries, adminUsers.  
8. Create admin auth user; mirror UID in `adminUsers`.

---

## 5. Environment template

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_DEFAULT_BUSINESS_ID=cakes-by-kee
```

Web config ≠ server secret. Still do not commit production `.env` if team policy prefers CI-only injection.

**Never** add service account files to this repo.

---

## 6. Cost posture

Stay on Firebase Spark (free) as long as usage allows. Avoid paid add-ons for MVP. Monitor Storage bandwidth and Firestore reads (admin dashboards should avoid unbounded listeners).

---

## 7. Post-deploy smoke test

1. Homepage loads on mobile width.  
2. Menu products appear.  
3. Enquiry submits; success shows ID.  
4. WhatsApp link opens with text.  
5. Admin login works.  
6. New enquiry visible.  
7. Unauthenticated Firestore enquiry list fails (rules).

---

## 8. Custom domain

Owner configures DNS for GitHub Pages. App should not hardcode a domain. Hash routes remain portable.
