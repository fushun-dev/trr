# Taiwan Rice Roll 台湾紫米饭团 · Miri

A single-shop F&B ordering Progressive Web App (PWA) for a Taiwanese rice roll
business in **Jalan Luak, Miri**. Customers browse the menu, build a cart and
check out for pickup or delivery; staff manage orders and the menu from an admin
dashboard.

Inspired by the architecture of [`hsi_app`](https://github.com/hsimarketplace2026-bit/hsi_app)
(static HTML + Tailwind + Supabase), simplified to one shop with a purple
gradient theme.

## Features

- **Storefront** — categorized menu (rice rolls, vegetarian, burritos, kefir,
  drinks, snacks), cart drawer, pickup/delivery checkout, WhatsApp order handoff.
- **Admin dashboard** (`/admin`) — live order queue with status flow
  (pending → confirmed → preparing → ready → completed), daily sales stats, and
  full menu CRUD.
- **Auth** — optional customer accounts (order history) + admin-only dashboard,
  all enforced by Supabase Row Level Security.
- **PWA** — installable, offline app shell via service worker.
-  Purple gradient theme, bilingual EN/中文 menu, RM pricing.

## Tech stack

| Layer    | Choice                                            |
|----------|---------------------------------------------------|
| Frontend | Static HTML, Tailwind (CDN), vanilla JS           |
| Backend  | Supabase (Postgres + Auth + RLS)                  |
| Hosting  | Any static host (GitHub Pages, Netlify, Vercel)   |

No build step — it's plain static files.

## Project structure

```
.
├── index.html              # Customer storefront
├── admin/index.html        # Staff dashboard
├── css/styles.css          # Purple gradient theme
├── js/
│   ├── config.js           # ← put your Supabase keys + shop settings here
│   ├── supabase.js         # client + shared helpers (toast, auth, money)
│   ├── cart.js             # localStorage cart
│   ├── app.js              # storefront logic (menu, cart, checkout)
│   ├── auth.js             # customer auth modal
│   └── admin.js            # admin orders + menu management
├── supabase/migrations/
│   └── 0001_init.sql       # schema, RLS policies + seeded real menu
├── assets/icons/           # PWA icons
├── manifest.json
└── sw.js                   # service worker
```

## Setup

### 1. Create a Supabase project
1. Sign up at [supabase.com](https://supabase.com) and create a project.
2. Open **SQL Editor** and run the contents of
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
   This creates all tables, RLS policies, triggers, and seeds the full menu.

### 2. Add your keys
Edit [`js/config.js`](js/config.js) and fill in:
```js
SUPABASE_URL: 'https://YOUR-PROJECT.supabase.co',
SUPABASE_ANON_KEY: 'your-anon-public-key',   // Project Settings → API
WHATSAPP: '60XXXXXXXXX',                       // shop WhatsApp (optional)
```
The anon key is safe to commit — all access is guarded by RLS.

> Until keys are added, the storefront runs in **preview mode** with a built-in
> demo menu so you can see the layout (no orders are saved).

### 3. Create an admin account
1. Open the site, click **Sign in → Create an account**, and register.
2. In Supabase: **Authentication → Users**, copy your user's UUID.
3. In **SQL Editor**, run:
   ```sql
   update public.profiles set role = 'admin' where id = '<your-user-uuid>';
   ```
4. Sign in at `/admin/`.

### 4. Deploy
Push to GitHub and enable **Pages** (Settings → Pages → deploy from branch),
or drop the folder onto Netlify/Vercel. It's all static.

## Notes
- Guests can order without an account; signed-in customers can see their own
  orders. Admins see and manage everything.
- Menu, prices, hours and shop name can be edited live from the admin dashboard
  / `settings` table — defaults in `js/config.js` are the fallback.
