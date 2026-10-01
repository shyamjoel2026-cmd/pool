# POOL — Blueprint (the one build document)

**Before you buy it, POOL it.**

| | |
| --- | --- |
| Version | 1.1 — 1 Oct 2026 (India-first M1.5/M2 verification) |
| Status | **The one blueprint.** Business rules come from `POOL_WORKING_MODEL_v3.md`, and the stack from `research/06_prototype_stack.md` and `research/08_hidden_gems.md`. Where they conflict, this file wins. Progress and decisions are logged in `POOL_PROJECT_STATE.md`. |
| Goal | A **real working prototype**, built **India first** for the investor pitches. US implementation is parked by the founder's 30 Sep decision; existing US engine code remains compiling. Payments, webhooks, AI and messaging are later milestones; M2 verifies the local engine, database, accounting and durable workflows. |
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
   - US payment work is parked.
   - Dealers see only paid committed demand. Household/payer checks and quantity limits use per-pool data; there is no fixed product or household quantity cap.
5. **Sealed bids.** Verified sellers bid privately. Each bid gives a **guaranteed all-in price per buyer**, valid even if only one buyer completes, plus optional Wave Drop slabs. Nobody sees another seller's bid, and every view of a bid is logged.
6. **Capacity awards (default A).** Earliest committed joiners get the best-ranked covering seller with capacity; awards may span several sellers, with backups per assignment. Bids must cover quantity, options, service requirements and buyer need-by dates. Ranking uses seller price, delivery and settled rating; the team then sets each assigned bid's buyer price.
7. **Buyer decides.** "Accept ₹X" and "Walk away, refund my booking" get equal weight, with no shaming. A guaranteed price never goes up.
8. **Money path, like Amazon/Flipkart.** The buyer pays through POOL's checkout, and the licensed PA holds the money.
   - India: Razorpay Orders + Route transfer with `on_hold=true`.
   - US payments are parked.
   - The dealer is paid only after the **delivery/pickup code**, minus POOL's fee. POOL never holds buyer money in its own account.
9. **Pricing, founder decision (30 Sep 2026). There is no fixed fee.**
   - The seller bids ITS own price (e.g. ₹40,000 for a TV the market sells at ₹45,000).
   - The **POOL team decides the buyer price for each pool** (e.g. ₹43,000), and POOL keeps the difference.
   - Every price decision is recorded: who set it, when, and for which bid. Offers cannot go out until the team has priced every awarded bid.
   - The team sees the outside price and a recommended saving as information only; the recommendation never blocks a price.
   - Pricing below the seller's price (a POOL-funded discount) is switched off unless the founder turns it on.
   - Legal record, as in v2.2: the seller invoices the buyer at the buyer price, and the difference is the seller's commission to POOL (with GST in India).
   - **Lawyer must review before any foreign investment closes:** FDI Press Note 2 says a marketplace "shall not influence the sale price".
10. **Wave Drop (slab pot).**
    - **Separate pot per seller (founder, 1 Oct 2026).** Each seller's settled counted quantity adds its accepted slab to that seller's pot, shared equally among that seller's settled buyers. Count mode is pool data; held money and refunds conserve paise independently for each seller.
    - Sellers must choose slabs below their actual available margin if they want every extra sale to remain profitable. POOL cannot verify a seller's undisclosed costs and does not promise universal seller profitability.
    - The largest slab is held from each payout until the pool closes. Seller-cancelled orders still pay their slab, from the seller's deposit.
    - The pot is paid as a partial refund to the original payment method. The screen shows real numbers only.
11. **Proof-based tracking.** Required steps, proof types, handover checklist and holds come from the accepted fulfilment profile. Dispatch, serial photos and installation are examples, not universal requirements. Handover requires full captured payment and a valid order-bound code, and refuses an open issue.
12b. **Universal products, founder correction (30 Sep 2026).** POOL is for ANY product, not the examples we discussed. The engine has no product-specific logic. Everything product-specific is data set per pool or product:
    - the category path;
    - the unit of measure (piece, kg, litre, metre, pack, dozen …), with a minimum, a step and optional per-buyer and per-household caps;
    - the tax rate of the product;
    - bid terms and requirements as key/value data (e.g. warranty months, same-day preparation);
    - delivery modes;
    - fulfilment profiles as data: ordered steps with proof, the handover checklist, code length, holds, the return window and any late credit.
    - There is no assumed cap: most buyers take 1 kg of meat, and a school may take 40 benches.

12a. **Engine completeness checklist** (added 30 Sep 2026 after a gap review; the engine must cover all of it):
    1. Any unit of measure is data, stored as integer base quantities with configured scale, minimum, step and optional caps.
    2. Per-buyer options, e.g. cut or RAM, that must match what the bid covers.
    3. Seller capacity, and split awards: *proposed default A*: the earliest joiners get the winner's price, the rest get the backup's; each buyer sees their own price.
    4. "No deal": no covering bid or an expired pricing deadline yields full booking refunds. Outside-price savings are advisory information for the team and never block its buyer price decision (30 Sep founder correction).
    5. Accept window: *proposed default B*: no reply means walk away, with a full refund; never a silent charge.
    6. Bids:
       - *proposed default C*: a seller can only lower a bid before close, never raise it;
       - every revision is logged;
       - a bid must stay valid through the accept window;
       - a bid more than 15% below the median bid is flagged for checks.
    7. Pickup/service time slots with capacity, by area and time (any product).
    8. The profile's handover checklist must pass before the code can be used; open-box/model/serial checks are optional profile data.
    9. Cancellation:
       - free before dispatch;
       - after dispatch, the buyer pays at most the disclosed return cost;
       - a seller who cancels pays the buyer the same amount (E-Commerce Rules 2020, Rule 4 symmetry).
    10. Seller default: the backup takes over at the **same** buyer price; any difference comes from the seller's deposit, then from POOL's reserve.
    11. Holds release on configured proof or profile-defined timeout; deferral is allowed only where the profile explicitly permits it, within its maximum. Five/45-day installation rules are example data.
    12. Late-delivery credit, paid from the seller's held money.
    13. A close time is never extended without every member opting in (logged).
    14. A pool matching key (product or grouping, region, area), so new buyers are shown existing pools.
    15. Domain events and an append-only audit of every price, count and close time shown.
    16. Idempotency keys on every money command.
    - **Money representation:** integer minor units (paise/cents) inside the engine, plus a tested largest-remainder allocation. No money library in the core. (Dinero.js 2.0.2 ships its currencies at `dinero.js/currencies` if the UI needs formatting; `Intl.NumberFormat` is enough.)

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
- **Current build: India only.** Local development runs in Docker; India deployment is planned for AWS Mumbai. The diagram's US integrations and US region are parked roadmap items.
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

Current build scope is **India only** (INR / Razorpay test). The original US demo remains parked until the founder reopens it.

1. Paste a real product link → product card with evidence per field, or "unconfirmed".
2. Honest comparison (real sources with a timestamp).
3. Start a pool (choose closing time) or join one → real test-mode booking or hold.
4. Two real seller accounts submit sealed bids (web; WhatsApp Flow bids come later) → the pool closes via a DBOS timer → winner picked by the published rule.
5. Buyer accepts → real test capture/transfer on hold → seller marks dispatch with a photo → buyer shows the code → seller enters or scans it → payout released (Razorpay Route `on_hold=false` / Stripe transfer).
6. Wave Drop computed and paid as a real test partial refund; the ledger trial balance ties out.
7. Ops console: pools, bids (with access log), exceptions and the ledger.
8. MCP server: find, join and check a pool from Claude.
9. **Stretch:** a Telugu WhatsApp voice note that joins a pool (Sarvam + Claude).

### Experience preview boundary and visual direction — 2 Oct 2026

The investor-facing `experience/` app is a separate Vite preview on the Claude branch. It demonstrates the buyer, seller and POOL-team journeys with browser simulation and sample data; it is not the M3 payment or product-identification implementation. The preview must label simulated money and sample data wherever a user could mistake it for a live transaction. It must preserve the India-first, universal-product rules above and must not be copied into `pool/apps/web`.

The visual system now uses warm paper surfaces, charcoal type and restrained olive as the primary palette. Colour is reserved for status, money and the one current action. The choice follows the design review recorded for this session: expressive hierarchy should make the next action obvious, comparison cards must expose the few attributes buyers need, touch targets should remain at least 44px in the app, and non-essential motion must respect reduced-motion preferences. Sources checked: [Google Material expressive design research](https://design.google/library/expressive-material-design-google-research), [Baymard product-list research](https://baymard.com/research-articles/product-listing-information), [W3C WCAG 2.2 target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced), [web.dev reduced motion](https://web.dev/articles/prefers-reduced-motion).

---

## 6. Build plan (milestones)

| # | Milestone | Done when |
| --- | --- | --- |
| M1 | Monorepo + **engine** (pool state machine, bid evaluation, guaranteed price, Wave Drop slab pot, fee split, code generation and verification) + money property tests | `pnpm test` is green, including fast-check money invariants |
| M1.5 | India booking/checkout/taxes, need-by and pricing deadlines, funded seller recovery, replay/audit, abuse signals and India helpers | A1–A10 verified locally; 110 engine tests, explicit UNVERIFIED tax/checksum assumptions |
| M2 | Postgres (Docker) + Drizzle schema + pgledger + DBOS workflows (pool close, payout hold) | An integration test closes a pool and posts balanced ledger entries |
| M3 | India payments: Razorpay test (Orders, Route on_hold, release, refunds), with verified webhooks. US/Stripe work is parked. **Not started; stop after M2.** | A real test-mode booking → capture → hold → release → Wave Drop refund, verified at the payment provider |
| M4 | Product identification (URL parse, JSON-LD, Claude with evidence quotes) + matching (Voyage) | 20 real links identified; an eval reports accuracy |
| M5 | Buyer web app (paste → compare → pool → pay → track → code), with UI quality gates | Playwright golden flow + axe clean + Lighthouse budget on a mid-range Android profile |
| M6 | Seller app + ops console + WhatsApp notifications (Cloud API test number) + OTP (Twilio) | Two sellers bid; buyers get WhatsApp updates |
| M7 | MCP server + demo script + load test on the last-minute join burst + deploy (Mumbai + US) | Full rehearsal passes twice |

---

## 7. Keys and secrets

- Keys live only in `pool/.env` (git-ignored), and are **test keys only**.
- Claude never prints or commits them. `pool/.env.example` lists the variable names.
- M2 validates DATABASE_URL and CODE_SECRET at startup; POSTGRES_PASSWORD configures Docker. Future integrations validate their own keys when their milestone is built; those keys are not required by M2.
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
- E-Commerce Rules 2020 duties (grievance officer, seller disclosures, ranking disclosure). **UNVERIFIED:** the inherited claim about E-Commerce Amendment Rules 2026 and a 1 Jan 2027 effective date has no verified official source in this work order; do not rely on it.
- GST TCS 0.5% and TDS 0.1%.
- DPDP consent notices.
- A lawyer reviews the Wave Drop credit-note treatment and the cancellation policy.

## M1.5 / M2 audit checkpoint — 1 Oct 2026

**Foundation acceptance reopened at the founder's request.** The earlier 110 engine / 16 integration test checkpoint did not establish complete foundation readiness. Audit and rework are in progress; current exact evidence and unresolved decisions live in POOL_PROJECT_STATE.md §0. Tax/compliance assumptions remain explicitly UNVERIFIED. M3 has not started. Current persisted names are assignments (awards), wave_pots (wave_drop_pots), plus units, fulfilment_profiles, price_decisions, offers, order_steps, handover_codes, idempotency_keys, aggregates, money_events, ledger_account_map and workflow_outbox. India-only persistence; existing US engine regression remains.

Founder confirmed 1 Oct 2026: capacity-split pools have a separate Wave Drop pot per seller. Each seller's slab pot is shared only among that seller's settled buyers. Settlement must use the accepted, persisted slabs and counted quantities for that seller.
