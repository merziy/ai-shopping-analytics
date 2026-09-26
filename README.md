# AI Shopping Analytics

A Shopify embedded admin app that attributes traffic and orders to AI platforms — ChatGPT, Perplexity, Copilot, Gemini, Claude, and others. Merchants finally get a clear answer to "how much revenue is AI sending me?"

---

## What It Does

- Detects AI referrers (via HTTP `Referer` header and UTM params) on every storefront page load
- Creates anonymous sessions tied to the originating AI platform
- Matches sessions to orders at checkout
- Shows a dashboard breaking down sessions, orders, revenue, and conversion rate by AI channel

---

## Stack

| Layer | Choice |
|---|---|
| Framework | React Router v7 (Shopify CLI scaffold) |
| Language | TypeScript |
| Database | Prisma ORM — SQLite (dev), PostgreSQL (prod) |
| Hosting | Fly.io / Railway |
| Frontend | Shopify Polaris + React |
| Tracking | Theme App Extension (app embed block) |

---

## Local Development

**Prerequisites:** Node 18+, Shopify CLI, a Shopify Partner account, and a development store.

```bash
npm install
npx prisma migrate dev   # sets up local SQLite DB
shopify app dev          # starts dev server + ngrok tunnel
```

> Use `shopify app dev`, not `npm run dev`. The Shopify CLI command creates the tunnel and handles OAuth. `npm run dev` alone is not useful for Shopify apps.

After `shopify app dev` starts:
1. Install the app on your dev store when prompted.
2. In the dev store's Theme Editor, add the **AI Analytics Tracking** app embed block.
3. Set the **App URL** field to the tunnel URL printed by `shopify app dev` (e.g. `https://xxxx.trycloudflare.com`).

> The tunnel URL changes every restart — update the Theme Editor setting each time until the app is deployed to a stable URL.

---

## Tracking Script

Storefront tracking is delivered via a **Theme App Extension** (app embed block), not the deprecated ScriptTag API.

The block lives at `extensions/ai-analytics-tracking/blocks/app-embed.liquid`. It injects an inline script that:
- Reads `document.referrer` and UTM params
- Generates an anonymous session token (stored in `sessionStorage`)
- POSTs to `/api/session` on first load
- POSTs to `/api/event` on add-to-cart and checkout start

---

## Key API Endpoints

| Endpoint | Purpose |
|---|---|
| `POST /api/session` | Called by tracking script on first page load; creates/upserts a session |
| `POST /api/event` | Records page events (add_to_cart, checkout_started) |

Both endpoints are public (no Shopify auth) and include CORS headers for `*.myshopify.com`.

---

## Database

```bash
npx prisma studio   # open DB browser at localhost:5555
npx prisma migrate dev --name <name>   # create a migration
```

Models: `Shop`, `VisitorSession`, `PageEvent`, `AttributedOrder`

---

## Project Docs

See **AGENTS.md** for architecture, key files, code rules, open work, and contributor guide.
