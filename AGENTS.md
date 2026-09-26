# AI Shopping Analytics — Agent & Contributor Guide

## What This App Does

A Shopify embedded admin app that detects which AI platforms (ChatGPT, Perplexity, Copilot, Gemini, Claude, etc.) are driving traffic and orders to a merchant's store. Fills a gap in existing analytics tools — none track AI referral channels.

## Stack

- **Framework**: React Router v7 + TypeScript (Shopify CLI scaffold)
- **Database**: Prisma ORM — SQLite in dev, PostgreSQL in prod
- **UI**: Shopify Polaris (embedded admin)
- **Hosting**: Fly.io or Railway (not yet deployed)
- **Tracking**: Theme App Extension (app embed block) — injects inline JS into storefront

## Architecture

```
Storefront (Theme App Extension)
  └─ app-embed.liquid → inline JS → POST /api/session, POST /api/event
       └─ App Server (React Router on tunnel / prod URL)
            └─ PostgreSQL via Prisma
                 ├─ VisitorSession
                 ├─ PageEvent
                 └─ AttributedOrder

Shopify Admin (Embedded App)
  └─ /app → Dashboard (pulls orders via Admin GraphQL, attributes to sessions)
```

## Key Files

| Path | Purpose |
|---|---|
| `app/lib/attribution.server.ts` | AI platform detection from referrer + UTM |
| `app/routes/api.session.ts` | Public POST — creates VisitorSession |
| `app/routes/api.event.ts` | Public POST — logs PageEvent |
| `app/routes/app._index.tsx` | Dashboard — fetches orders, attributes, renders KPIs |
| `extensions/ai-analytics-tracking/blocks/app-embed.liquid` | Storefront tracking script |
| `prisma/schema.prisma` | Data model |

## Code Rules

**No narrative comments.** Comments explain *why*, not *what*. The code speaks for itself.

**No Observer APIs.** No `IntersectionObserver`, `MutationObserver`, `ResizeObserver`, or `PerformanceObserver`.

**No `any` types without justification.** If `as any` is needed, explain why in a comment.

**Relative imports in routes.** Use `../db.server`, `../lib/foo`. The `~/` alias does not resolve reliably in all route contexts.

**No wrapper components for layout.** Keep component trees flat.

**No webhooks for order data.** Pull orders via Shopify Admin GraphQL API in the dashboard loader.

**Public API routes** (`api.session`, `api.event`) must include CORS headers and must not call `authenticate.admin`.

**Attribution detection** lives exclusively in `app/lib/attribution.server.ts`. Add new AI platforms there.

## Running Locally

```bash
shopify app dev        # starts server + tunnel + registers extension
npx prisma studio      # browse the database
npx prisma migrate dev --name <name>   # apply schema changes
```

The Theme App Extension app URL must be set in the theme editor (Online Store → Customize → App embeds → AI Analytics) to the current tunnel URL each session. This goes away once deployed to a stable URL.

## Data Model

- **VisitorSession** — one per anonymous storefront visit, stores referrer, aiPlatform, UTM params
- **PageEvent** — add-to-cart and checkout-started clicks tied to a session
- **AttributedOrder** — Shopify order matched to a VisitorSession (30-min window via Admin API)

## Open Work

- [ ] Deploy to Fly.io for stable URL (eliminates per-session theme editor update)
- [ ] Shopify Billing API — $99/month subscription, 14-day trial
- [ ] Products page — which products appear most in AI-referred orders
- [ ] Settings page — verify extension is active, set timezone
- [ ] App Store listing

## Do Not

- Add ScriptTag API usage (deprecated)
- Use webhooks for `orders/create` (requires Shopify protected data approval)
- Commit `.env` or any secrets
- Add the Claude session URL to commit messages
