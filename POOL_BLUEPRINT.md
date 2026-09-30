# POOL — Blueprint (the one build document)

**Before you buy it, POOL it.**

| | |
| --- | --- |
| Version | 1.0 — 30 Sep 2026 |
| Status | **The one blueprint.** Business rules come from `POOL_WORKING_MODEL_v3.md`, and the stack from `research/06_prototype_stack.md` and `research/08_hidden_gems.md`. Where they conflict, this file wins. Progress and decisions are logged in `POOL_PROJECT_STATE.md`. |
| Goal | A **real working prototype** (India + USA) for 4 investor pitches (2 India, 2 USA). Money moves only in test mode, but every flow is real: real APIs, real webhooks, real AI, real messages, real sealed bids. No dummy dashboards. |
| Labels | **Rule** = product rule. **Decision** = tech choice. **Guess** = a number to confirm with evidence. |

---

## 1. Product rules (what the code must enforce)

1. **Link → product.** The buyer pastes any link, and POOL identifies the exact product.
   - Amazon and Flipkart pages are never fetched. Their terms forbid scraping, and Amazon's Creators API policy conflicts with POOL. For those links we use only the URL itself (ASIN / pid / the model number in the slug) plus the buyer's confirmation.
   - Pages that allow it are read once, on the buyer's request: JSON-LD/OpenGraph first, then Claude `web_fetch`.
   - Every extracted field carries a **verbatim evidence quote** that the server checks against the page. Anything unproven is shown as "unconfirmed".
2. **Honest comparison.** The comparison shows the all-in "you pay" price, delivery date, installation, warranty and seller, with a timestamp and source. It can say "Amazon is cheaper for you".
3. **Pools.** Buyers join an open pool or start one. **The starter chooses the closing time**; there is no default. The countdown is real, never resets and is logged.
4. **Commitment.** The buyer places a small **refundable booking**.
   - India: charged, then refunded if they walk away. UPI Reserve Pay stays behind a flag until Razorpay confirms it.
   - US: a Stripe manual-capture hold, extended up to 30 days where the card supports it.
   - Dealers see only committed buyers, counted once per payer and per address, with at most 2 units per model per household.
5. **Sealed bids.** Verified sellers bid privately. Each bid gives a **guaranteed all-in price per buyer**, valid even if only one buyer completes, plus optional Wave Drop slabs. Nobody sees another seller's bid, and every view of a bid is logged.
6. **Winner.** There is one winning seller per pool, plus a backup. The published rule is: lowest all-in price among bids that meet the service minimums; ties go to the earlier delivery date, then the better settled rating. POOL's fee is never a factor.
7. **Buyer decides.** "Accept ₹X" and "Walk away, refund my booking" get equal weight, with no shaming. A guaranteed price never goes up.
8. **Money path, like Amazon/Flipkart.** The buyer pays through POOL's checkout, and the licensed PA holds the money.
   - India: Razorpay Orders + Route transfer with `on_hold=true`.
   - US: Stripe Connect capture + transfer.
   - The dealer is paid only after the **delivery/pickup code**, minus POOL's fee. POOL never holds buyer money in its own account.
9. **Fee.** The seller's price *is* the buyer's price. POOL takes a uniform rate-card % from the seller payout (Guess: large appliances 5%, TVs 3%). Nothing is added on top.
10. **Wave Drop (slab pot).**
    - Each settled unit adds its slab to a pot, and the pot is split equally among settled buyers. The seller keeps each slab below its margin, so every extra sale stays profitable for it.
    - The largest slab is held from each payout until the pool closes. Seller-cancelled orders still pay their slab, from the seller's deposit.
    - The pot is paid as a partial refund to the original payment method. The screen shows real numbers only.
11. **Proof-based tracking.** A status moves only with proof: seller confirms → dispatch photo → delivery/pickup code → serial photo + invoice → installation job number.
12. **No dark patterns.** India's CCPA 13-pattern checklist and the US FTC rules on every screen: no fake timers or counters, no drip pricing, no pre-ticked add-ons.

---

## 2. Architecture (Decisions)

```text
Buyer web/PWA ─┐                                ┌─ Razorpay (India, test) : Orders, Route on_hold, Refunds, Offers
Seller web ────┼─ Next.js 16 app (UI) ── oRPC ──┤  Stripe (US, test)      : Connect, manual/extended capture, Transfers
Ops console ───┘            │  SSE (live)       ├─ Claude (@anthropic-ai/sdk): extraction, matching, voice→action, OCR
WhatsApp ── webhooks ───────┤                   ├─ Meta WhatsApp Cloud API · Twilio Verify (US) · MSG91 (India, after DLT)
AI assistants ── MCP ───────┘                   ├─ Sarvam (Telugu/Hindi STT/TTS) · Voyage (embeddings)
                     Node service: API + DBOS workflows ──► PostgreSQL 18 (+pgvector, PostGIS, pgledger)
```

- **One TypeScript monorepo** (pnpm workspaces). The core is custom; Medusa/Mercur is not used for the prototype.
- **One stateful dependency: PostgreSQL.**
  - DBOS runs durable workflows in it: pool close, bid window, accept window, payout hold until code, Wave Drop at close.
  - pgledger is the double-entry ledger.
  - pgvector plus tsvector/pg_trgm handle search and matching.
- **Two regions from one codebase:** India data in AWS Mumbai (RBI 2018 payment-data localisation), US in us-east-1. Local development runs in Docker.
- **Live updates** use Server-Sent Events through oRPC. No WebSockets.

---

## 3. Stack

Versions are checked at install time and recorded in the repo's `package.json`.

| Layer | Choice | Why |
| --- | --- | --- |
| Language/runtime | TypeScript, Node 24 LTS | Team standard; Node 24 runs TypeScript natively for scripts |
| Web | Next.js 16 + React 19.2, Tailwind 4, shadcn/ui (Base UI), Motion, Lucide, Sonner, NumberFlow | "Wow" + accessible; Base UI OTP field for codes |
| API | oRPC (Zod contracts) on a Node service | One contract gives the typed client, OpenAPI, SSE and MCP tools |
| DB / ORM | PostgreSQL 18 + pgvector + PostGIS, Drizzle | Single stateful dependency |
| Workflows / timers | DBOS Transact (pinned exact version) | Crash-safe money steps; no Temporal/Redis |
| Ledger / money | pgledger (vendored SQL), Dinero.js v2 | Exact to the paise/cent; the ledger commits in the same transaction |
| Payments | Razorpay (India), Stripe Connect (US) | Verified hold/release/refund primitives |
| AI | Claude via `@anthropic-ai/sdk` (`claude-opus-5-5` default; `claude-haiku-4-5` for high-volume simple tasks), Voyage embeddings, Sarvam speech | Official SDK only; structured outputs + evidence quotes |
| Extraction | URL parsing → cheerio + metascraper (JSON-LD/OG) → Claude `web_fetch` → Firecrawl fallback; zxing-wasm barcodes | Deterministic first, AI second, never invents |
| Messaging | Meta WhatsApp Cloud API (direct), Twilio Verify (OTP), Resend (email) | Accounts exist |
| Auth | Better Auth (phone OTP) | Self-hosted; India data stays in India |
| Quality | Vitest + fast-check (money properties), PGlite for SQL unit tests, Playwright + axe-core, Lighthouse CI, Oxlint | "No issues" gate |
| Observability | Sentry SDK, OpenTelemetry, PostHog (no payment PII), Langfuse (redacted) | |
| Dev tooling | pnpm, Hookdeck CLI (webhooks), Varlock/Zod env validation | |

---

## 4. Data model (core tables)

| Table | Holds |
| --- | --- |
| `users` | People, with region IN/US |
| `sellers` | Sellers: KYC status, GSTIN, payout account ref (Route linked account / Stripe account), rating |
| `products` | Canonical product: brand, model, variant, GTIN, spec JSON, embedding |
| `product_sources` | Where a product was seen: URL, store, price, fetched_at, evidence |
| `pools` | Product/grouping, region, currency, creator, `closes_at` (chosen), state |
| `pool_members` | Pool membership: booking payment ref, status, qty, household key |
| `bids` | Sealed bids: price per unit, slabs[], delivery terms, warranty, valid_until |
| `bid_access_log` | Every read of a bid |
| `awards` | Winner + backup per pool |
| `orders` | One per buyer per won pool: guaranteed price, state, codes (hashed) |
| `order_proofs` | Photo / serial / job number, with who and when |
| `payments` | PA refs, holds, captures, transfers, refunds (idempotency keys) |
| `ledger_*` | pgledger accounts, transfers and entries |
| `wave_drop_pots` | Pot per pool, and per-buyer share paid |
| `audit_events` | Append-only: every close time, count or price shown to a buyer |

---

## 5. Prototype scope — the investor demo

It must work end to end in **both** India (INR / Razorpay test) and US (USD / Stripe test).

1. Paste a real product link → product card with evidence per field, or "unconfirmed".
2. Honest comparison (real sources with a timestamp).
3. Start a pool (choose closing time) or join one → real test-mode booking or hold.
4. Two real seller accounts submit sealed bids (web; WhatsApp Flow bids come later) → the pool closes via a DBOS timer → winner picked by the published rule.
5. Buyer accepts → real test capture/transfer on hold → seller marks dispatch with a photo → buyer shows the code → seller enters or scans it → payout released (Razorpay Route `on_hold=false` / Stripe transfer).
6. Wave Drop computed and paid as a real test partial refund; the ledger trial balance ties out.
7. Ops console: pools, bids (with access log), exceptions and the ledger.
8. MCP server: find, join and check a pool from Claude.
9. **Stretch:** a Telugu WhatsApp voice note that joins a pool (Sarvam + Claude).

---

## 6. Build plan (milestones)

| # | Milestone | Done when |
| --- | --- | --- |
| M1 | Monorepo + **engine** (pool state machine, bid evaluation, guaranteed price, Wave Drop slab pot, fee split, code generation and verification) + money property tests | `pnpm test` is green, including fast-check money invariants |
| M2 | Postgres (Docker) + Drizzle schema + pgledger + DBOS workflows (pool close, payout hold) | An integration test closes a pool and posts balanced ledger entries |
| M3 | Payments: Razorpay test (Orders, Route on_hold, release, refunds) + Stripe test (manual/extended capture, transfer, partial refund), with webhooks through Hookdeck | A real test-mode booking → capture → hold → release → Wave Drop refund, visible in both dashboards |
| M4 | Product identification (URL parse, JSON-LD, Claude with evidence quotes) + matching (Voyage) | 20 real links identified; an eval reports accuracy |
| M5 | Buyer web app (paste → compare → pool → pay → track → code), with UI quality gates | Playwright golden flow + axe clean + Lighthouse budget on a mid-range Android profile |
| M6 | Seller app + ops console + WhatsApp notifications (Cloud API test number) + OTP (Twilio) | Two sellers bid; buyers get WhatsApp updates |
| M7 | MCP server + demo script + load test on the last-minute join burst + deploy (Mumbai + US) | Full rehearsal passes twice |

---

## 7. Keys and secrets

- Keys live only in `pool/.env` (git-ignored), and are **test keys only**.
- Claude never prints or commits them. `pool/.env.example` lists the variable names.
- The app validates them at startup and fails fast if any is missing.
- Needed:
  - `ANTHROPIC_API_KEY`
  - `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET`
  - `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`
  - `WHATSAPP_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_VERIFY_TOKEN`
  - `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_VERIFY_SERVICE_SID`
  - later: `VOYAGE_API_KEY`, `SARVAM_API_KEY`

---

## 8. Compliance gates

These are not needed for the demo; they must be done before live money.

- Razorpay Route live approval (GST-3B above ₹40 lakh ✅; use-case approval pending).
- Stripe live needs a US entity (e.g. Stripe Atlas).
- TRAI DLT registration for India SMS; A2P 10DLC for US SMS.
- Meta Business Verification.
- E-Commerce Rules 2020 duties (grievance officer, seller disclosures, ranking disclosure); the E-Commerce Amendment Rules 2026 apply from 1 Jan 2027.
- GST TCS 0.5% and TDS 0.1%.
- DPDP consent notices.
- A lawyer reviews the Wave Drop credit-note treatment and the cancellation policy.
