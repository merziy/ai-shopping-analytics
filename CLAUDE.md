# AI Shopping Analytics — Project Rules

## Code Style

**No narrative comments.** Comments explain *why*, not *what*. Never write comments that describe what the code is doing (e.g. `// Loop through orders`, `// Return the response`). The code speaks for itself. Only comment when the reason behind a decision would not be obvious to a future reader.

**No Observer APIs.** Do not use `IntersectionObserver`, `MutationObserver`, `ResizeObserver`, or `PerformanceObserver` anywhere in this codebase. Use event listeners or React state instead.

**No `any` types without justification.** Prefer explicit types. If `as any` is needed, it should be a last resort and accompanied by a comment explaining why.

**Relative imports in routes.** Use `../db.server`, `../lib/foo`, etc. The `~/` alias does not resolve reliably in all route contexts.

**No wrapper components for layout.** Keep component trees flat. Don't create a wrapper just to add padding or a container div — do it inline.

## Architecture

- Attribution detection lives in `app/lib/attribution.server.ts` — add new AI platforms there.
- Public API routes (`api.session`, `api.event`) require CORS headers and must not call `authenticate.admin`.
- Dashboard pulls orders from Shopify Admin API on load and attributes them to sessions — no webhooks for order data.
- Tracking script is served from `/tracking.js` and injected via ScriptTag API on first admin load.

## Stack

- React Router v7 + TypeScript
- Prisma + SQLite (dev) / PostgreSQL (prod)
- Shopify Polaris for embedded admin UI
- No external UI libraries beyond Polaris
