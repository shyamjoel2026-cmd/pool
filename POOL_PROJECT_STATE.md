# POOL — Project State (the reference file)

> **What this is.** The single place to restart from if the chat or thread is lost. It holds what POOL is, every decision so far, where each file is, what's in progress and what comes next.
> **Rule:** update this file after every milestone — each decision, finished research, account created, build step. Newest entries go at the top of each log.
> **Last updated:** 29 Sep 2026

---

## 0. Handoff log (newest first; every agent adds an entry at the end of a session; see AGENTS.md §2)

### 2026-09-30 · Claude Code · M1 starting
- **Did:**
  - Hidden-gems research: `research/08_hidden_gems.md`.
  - Wrote `POOL_BLUEPRINT.md`, the one build document.
  - Created `AGENTS.md` as the shared rules for Claude Code and Codex. `CLAUDE.md` now imports it.
  - Created the `pool/` git repo (branch `main`, empty).
  - Installed pnpm 12.8.1 into `%APPDATA%\npm`.
- **Verified:**
  - Docker 29.8.1 is running.
  - gh is logged in.
  - 53 GB of disk is free.
  - npm latest versions checked on 30 Sep: typescript 7.0.2, vitest 5.0.3, fast-check 4.10.2, zod 4.6.5, dinero.js 2.0.2.
- **Next:** M1, the engine package (pool state machine, bid evaluation, guaranteed price, Wave Drop slab pot, fee split, codes) plus money property tests.
- **Open:** the founder must put test keys in `pool/.env` (the variable names will be in `pool/.env.example`).

## 1. How to resume (read this first)

1. Open Claude Code or Codex in `C:\Users\shyamjoel\Desktop\idea`. `AGENTS.md` (Codex) and `CLAUDE.md` (Claude, which imports `AGENTS.md`) load automatically and point here.
2. Read this file end to end, then `POOL_WORKING_MODEL_v3.md` (the current business model).
3. Research results live in `research/`. Raw JSON copies are in `research/raw/`.
4. Continue from **§7 Next steps**.

---

## 2. POOL in one paragraph

**"Before you buy it, POOL it."**

1. A buyer pastes any product link.
2. POOL identifies the exact product and shows honest options, including the buyer's own card offers.
3. The buyer taps **POOL this** and pays a small refundable booking.
4. They join an open pool, or start one and choose when it closes.
5. Verified sellers bid privately with a **guaranteed per-buyer price**.
6. The buyer accepts or walks away.
7. Payment goes through POOL's checkout, where a licensed payment company holds the money until the delivery or pickup code is given.
8. The seller fulfils the order and is paid, minus POOL's fee.
9. The **Wave Drop** (a shared refund pot from completed purchases) is paid out when the pool closes.

The first sector is appliances; then every sector, one at a time — Sunday mutton, college laptops and more.

---

## 3. Founder and resources (confirmed by founder, 29 Sep 2026)

- Hyderabad-based founder.
- A **Pvt Ltd company already exists**.
- Budget **above ₹50 lakh**.
- Team: founder + 4 field/ops people + 5 developers.
- Edge: **builder/real-estate contacts, dealer/electronics trade contacts, strong tech/AI**.
- **Current goal:** a **working global prototype (India + USA)** to pitch **4 investors — 2 in India, 2 in the USA**. It must be real, with no dummy dashboards or fake data.

---

## 4. Decision log (founder decisions — newest first)

| Date | Decision |
| --- | --- |
| 29 Sep 2026 | Keep a reference `.md` file (this one) plus `CLAUDE.md`, so work survives if the chat is lost. |
| 29 Sep 2026 | UI/UX must be "wow", professional, very clear and very easy to use, with no UI issues. |
| 29 Sep 2026 | Stop writing documents. Keep **one blueprint**. **Build a working prototype** (India + USA) for investor pitches. First deliverable: verified lists of connectors, open-source code, tech, AI models and advanced features. |
| 29 Sep 2026 | Delivery, pickup and installation options **match whatever other platforms offer** for each category. |
| 29 Sep 2026 | **No fixed pool length.** The person who starts a pool chooses when it closes. |
| 29 Sep 2026 | POOL covers **every sector, one at a time**. Examples: Sunday mutton pools with an area-wise pickup code (possibly with chains like Sneha); college laptop pools (CMR, Malla Reddy students). Delivery partners are used as other e-commerce platforms use them. Prices are transparent across all platforms. |
| 29 Sep 2026 | **Buyers pay through POOL's checkout, like Amazon/Flipkart.** A licensed payment company holds the money, and the dealer is paid after the delivery code. |
| 29 Sep 2026 | Budget above ₹50 lakh; team real; Pvt Ltd exists (these replace blueprint v2.2's ₹10 lakh, no-salary plan). |

**Proposed by Claude, not yet confirmed by the founder:**

- Fee: the seller's price is the buyer's price, and POOL takes a uniform rate-card % from the seller's payout (guess: 5% on large appliances, 3% on TVs).
- **Wave Drop** redesign: a slab pot split equally among buyers. The founder's original whole-group tiers make the 50th sale cost the dealer ₹13,900 at a ₹1,800 margin; the slab pot keeps every extra sale profitable.
- Launch in Hyderabad on 2 tracks: new communities at handover, and open city pools.
- Sunday mutton test on 2 Sundays in 2–3 areas.
- College laptop pilot at one college.
- Go/no-go on Fri 13 Nov 2026 after the dealer price test.

---

## 5. File map

| File | Status |
| --- | --- |
| `POOL_PROJECT_STATE.md` | **This file — the reference. Keep it updated.** |
| `CLAUDE.md` | Auto-loaded context for Claude Code sessions in this folder |
| `POOL_WORKING_MODEL_v3.md` | **Current business model** (29 Sep 2026). To be merged into the one blueprint. |
| `POOL_FINAL_BLUEPRINT.md` | v2.2, plus a note at the top pointing to v3. Its operating detail (seller checks, legal checklist, AI guardrails) is reference only. |
| `POOL_FINAL_BLUEPRINT_v2.2_backup.md`, `POOL_FINAL_BLUEPRINT_v2.1_backup.md` | Backups — do not edit |
| `POOL_MASTER_SPEC.md`, `POOL_FOUNDER_DECISION_WORKBOOK.md`, `POOL_FINAL_EXECUTION_PLAN.md`, `POOL_G2_G3_READINESS_CHECKLIST.md` | Older documents from 27–28 Sep, superseded. The master spec §18 has the original POOLBACK rebate design and its blockers (§18.7 merchant gains from delaying, §18.8 merchant may not pay). |
| `research/01_idea_research_market_supply_legal_abuse.txt` | Web research (29 Sep): comparison market, supply and fulfilment, legal/tax/payments, abuse and mechanism design |
| `research/02_economics_and_density.txt` | Economics, demand density, first-wedge analysis |
| `research/03_hyderabad_possession_pipeline.txt` | ANAROCK completions, delays, TG-RERA possession radar |
| `research/04_blueprint_v2.2_audit_flags_UNVERIFIED.txt` | 61 audit flags on blueprint v2.2 (verifier stage failed). 4 confirmed by Claude: demand counts shown to dealers aren't deduplicated; no delivery-code security rules; "ready residents" in a kill gate is undefined; market price ignores exchange/membership prices. |
| `research/05_mechanism_attack_analysis.md` | Draft attack on the guaranteed-price + settled-volume mechanism |
| `research/raw/*.json` | Full raw research outputs |

---

## 6e. Prerequisites done (founder, 30 Sep 2026)

- **Docker Desktop** 29.8.1 is running (4 CPUs, ~6 GB RAM). It's a per-user install, so `docker.exe` is at `%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin\` and not on PATH.
- **GitHub CLI** is logged in as `shyamjoel2026-cmd`. **Disk:** 53 GB free.
- **GST turnover is above ₹40 lakh** (founder confirmed). The Pvt Ltd can be merchant of record for Razorpay Route live, once Razorpay approves the use case (routepriority@razorpay.com, 5–7 business days).
- **Accounts created:** Anthropic, Razorpay, Stripe, Meta (WhatsApp) and Twilio.
- **Keys:** the founder puts test keys only in the local `.env` file, never in chat or git.

## 6d. Hidden-gems research — DONE (30 Sep 2026)

- **Output:** `research/08_hidden_gems.md`, generated from `research/raw/hidden_gems.json`. It covers 123 gems in 8 areas, plus the critic's verdict.
- **Stack changes (proposed by the critic; to be adopted in the blueprint unless the founder objects):**
  1. **DBOS** (MIT) replaces Temporal, pg-boss and Valkey/BullMQ. It handles pool timers, payout steps and delivery-code waits inside Postgres. Pin the exact version. It needs real Postgres, not PGlite.
  2. **Stripe extended authorisation** (up to 30-day card holds) for US pools. At close, capture only the winning price, so there's no charge-then-refund.
  3. **Postgres-native search** (tsvector + pg_trgm + pgvector) replaces Meilisearch for the prototype.
  4. **Server-Sent Events via oRPC** replace Socket.IO for live pool updates.
- **Key additions:**
  - money: pgledger (double-entry ledger in Postgres), Dinero.js v2 (exact money maths), fast-check money-correctness property tests;
  - product identity: Claude web_fetch with an "evidence quote" check on every field, and zxing-wasm barcodes;
  - AI matching and voice: Voyage multimodal matching, Sarvam Saaras v4 / Bulbul v3 voice;
  - India integrations: Borzo multi-drop sandbox, DIGIPIN address codes, Cashfree Name Match + FSSAI check for a "Verified seller" badge;
  - web front end: NumberFlow price animation, Takumi WhatsApp share cards, Serwist + iOS web push;
  - dev tooling: PGlite for tests only, TS 7 + Oxlint, pnpm hardened, Hookdeck CLI, Varlock env checks, Playwright agents + vitest-evals, k6 load test.
- **Correction found:** Claude's citations cannot be combined with structured outputs (the API returns an error). So every extracted field carries a verbatim `evidence_quote`, checked on the server against the fetched page.
- **UPI Reserve Pay** (block up to ₹10k in the buyer's own account) is behind a feature flag until the payment company confirms sandbox access and split compatibility in writing. PhonePe and GPay aren't supported yet.
- **Rejected** (reasons in the file): Vite+ (2 days old), Zero/Electric sync engines, textbee (not DLT-compliant), mcp-use, Kapso, and others.

## 6c. Hidden-gems research — running (30 Sep 2026)

- The founder felt the earlier research was biased, because it started from tool names Claude supplied. A new **discovery-first** run is under way: workflow run `wf_9240c7af-be1`.
- **Researchers:** 8 of them, one per area:
  - payments and money
  - backend and data
  - AI and agents
  - UI, design and motion
  - mobile, PWA and low-end phones
  - India's commerce stack
  - developer tools and quality
  - growth, trust and community
- **Rules:** they get no names up front. They must use at least 4 discovery channels (GitHub rising projects, Hacker News "Show HN", Product Hunt, "awesome" lists, changelogs, surveys, YC batches) and check each find live.
- **Critic:** one critic compares every find against our current picks, then proposes swaps, additions and a top 10 for investor "wow".
- **Output:** saved to `research/raw/hidden_gems.json` and summarised in `research/08_hidden_gems.md`. **The blueprint and code wait for this.**

## 6b. Research complete — 30 Sep 2026

- **All research is finished.** `research/06_prototype_stack.md` now has 383 items, checked by a script against the research data (no missing links). It covers:
  - payments
  - open-source code
  - messaging / delivery / KYC
  - product-link extraction
  - UI stack and UX patterns
  - AI models and agent stack (43)
  - UI quality gates (33)
- **AI decisions from the research:**
  - Claude only through the official `@anthropic-ai/sdk`. The Vercel AI SDK entry in the stack research is overruled.
  - Telugu/Hindi voice notes: Sarvam speech-to-text over REST (₹30 per hour of audio; do not use its npm SDK — it has no licence).
  - Invoice, label and box photos: Claude vision, then deterministic checks (barcode, GTIN check digit).
  - Barcodes: the phone's built-in `BarcodeDetector`, with the zxing-wasm polyfill as fallback.
  - Product matching: Voyage embeddings + pgvector (Telugu quality still to test).
  - Monitoring: Langfuse (no India region → redact data or self-host).
  - Bot protection: Cloudflare Turnstile.
- **Agent demo:** a real **POOL MCP server**, so Claude, ChatGPT or Gemini CLI can create and join pools (OAuth 2.1 per the 2026-07-28 spec). The agentic checkout standards — ACP (OpenAI), AP2 and UCP (Google) — are shown only as a roadmap slide; checkout through them is not available in India yet.
- Raw output: `research/raw/ai_and_quality_research.json`.

## 6a. Status update — 30 Sep 2026

- **Done:** `research/06_prototype_stack.md` — the verified lists (connectors, open-source code, tech, UI stack and UX patterns).
  - 307 items, generated from the research data.
  - A script confirmed every item and its link appear in the document.
  - Each item was checked live once. The second-checker pass did not finish; each package is checked again when it is installed.
- **Still running:** the AI-models/agent list and the UI quality/accessibility/language list. They get appended to `06` when done.
- **CTO decision (Claude, 30 Sep):** build POOL's core as a custom TypeScript monorepo, not on Medusa + Mercur.
  - Our flows (pools, sealed bids, holds, codes, Wave Drop) don't exist in any framework.
  - Mercur's payouts are Stripe-only.
  - The UI has to be custom anyway.
  - Fewer moving parts on a Windows machine with 17 GB free disk.
  - Medusa/Mercur stay as an option for later.
  - Founder can override.
- **Key research facts driving the build:**
  - Amazon and Flipkart pages must not be fetched (their Terms forbid scraping, and Amazon's Creators API policy conflicts with POOL). For those links, POOL reads only the pasted URL (ASIN, product id, model number in the name) and the buyer confirms the product.
  - Reliance Digital and Vijay Sales pages allow single-page reads (schema.org JSON-LD).
  - Multi-store prices: SerpApi Google Shopping (India + US).
  - Card offers: only on POOL's own checkout (Razorpay Offers).
  - WhatsApp: Meta Cloud API directly (free test number).
  - India SMS needs TRAI DLT registration — start now.
  - US SMS needs A2P 10DLC registration.
- **Machine check (29 Sep):**
  - Node 24, npm 11, Git and gh are installed.
  - Docker is installed but not running.
  - The gh login token is invalid (founder to run `gh auth login`).
  - Only 17 GB of disk is free — founder to free space.

## 6. In progress (29 Sep 2026)

| Work | Status | Output goes to |
| --- | --- | --- |
| Stack research: payments India/US, open-source code, messaging/logistics/KYC, product-link extraction, AI models and agentic features — each item checked twice | Running | `research/06_prototype_stack.md` (to be written when done) |
| UI/UX research: design toolkit, patterns (and banned dark patterns), accessibility, Telugu/Hindi/English, quality gates, key screens | Running | `research/07_uiux_design_spec.md` (to be written when done) |

**Claude model defaults** (official Anthropic skill, cached 25 Sep 2026):

- `claude-opus-5-5` — main model, $4 / $20 per million tokens.
- `claude-sonnet-5-5` — $2 / $10.
- `claude-haiku-4-5` — $1 / $5, for high-volume sub-tasks only.

---

### Early findings from the stack research (30 Sep 2026; payments and open-source areas done, full check still pending)

- **Live India split payments need POOL's company turnover above ₹40 lakh.**
  - Under the RBI Payment Aggregator Directions (15 Sep 2025), a payment aggregator may pay a third party such as a dealer on the merchant's instruction only if that merchant (POOL) has annual turnover above ₹40 lakh, shown in its GST-3B returns.
  - Razorpay applies this to Route, its split-payment product: live access needs GST-3B proof plus approval of the use case (5–7 business days). The rule applies to every Indian payment aggregator.
  - **Test mode needs no KYC.** The investor prototype can run fully in test mode with real APIs, webhooks, holds and refunds.
  - Open question for the founder: does the existing Pvt Ltd have GST-3B turnover above ₹40 lakh?
- **US:** Stripe Connect sandbox. Manual capture places a real card hold for about 5–7 days. The dealer is paid by a transfer after the delivery code, and the Wave Drop goes back as a partial refund. Going live in the US needs a US company, e.g. via Stripe Atlas ($500). Stripe India has been invite-only since May 2024.
- **Wording:** say "held until delivery", not "escrow". Stripe says it does not provide escrow, and in India "escrow" means the payment aggregator's own account.
- **No open-source "pool + sealed bid" engine exists.** The POOL engine is our own IP.
- **Build it on Medusa v2 + Mercur** (both MIT; TypeScript multi-vendor marketplace: seller onboarding, offers, commissions, payouts).
  - Run two regional stacks from one codebase: India (Razorpay, data kept in India) and US (Stripe).
  - Temporal for pool timers and payout holds.
  - PostgreSQL 18 + PostGIS + pgvector, and Valkey.
  - Novu for notifications, Chatwoot for WhatsApp support, Better Auth for sign-in.
  - PostHog, Sentry and OpenTelemetry for analytics and monitoring.
  - Next.js 16 + shadcn/ui + next-intl for the web front end.
  - Claude through the official Anthropic SDK.
- **Licence flags:** avoid AGPL / SSPL / "source-available" pieces in core (Metabase, Unleash, Inngest server, n8n); MinIO is archived; do not enable Medusa's Enterprise RBAC/SSO.
- **RBI 2018 data localisation:** India payment data is stored only in India (AWS Mumbai).
- Raw output: `research/raw/stack_research_partial_run1.json`.

## 7. Next steps (in order)

1. When both research runs finish, write `research/06_*` and `research/07_*`, then update this file.
2. Write the **one blueprint**: business (v3) + tech stack + design spec, in a single file. Mark old files as superseded.
3. **Founder creates accounts.** Claude cannot create accounts. Start the slow approvals first. This is a preliminary list, to be confirmed by the stack research:
   - Anthropic API
   - Razorpay (test mode; Route/marketplace activation)
   - Stripe (test mode; Connect)
   - Meta WhatsApp Business (business verification)
   - SMS provider (India needs TRAI DLT registration)
   - Cloud account (AWS Mumbai + a US region)
   - GitHub organisation
   - Domain
4. Create the code repository (git) with its own `CLAUDE.md` and a `docs/` folder.
5. Build the prototype: core engine (commit → sealed bids → guaranteed price → checkout → code → settlement → Wave Drop), then the buyer app, seller app and ops console, with the UI quality gates.

---

## 8. Open questions for the founder

1. The budget number and salary commitments.
2. Top 5 builder projects, with realistic handover months.
3. Top 15 dealers (name, brands, area).
4. Brand contacts (regional sales or bulk desks).
5. Who owns builders, dealers, buyer support, finance/compliance and tech.
6. Confirm the proposed items in §4 (fee rate card, Wave Drop design, mutton test, go/no-go date).
7. Investor meeting dates — these set the prototype deadline.

---

## 9. Working rules for anyone (human or AI) continuing this work

- **No hallucination.** Verify facts at the source and arithmetic with scripts. Label guesses as "guess — check".
- **Think like a founder, write in plain language.** Keep the founder's idea at the centre; improve it rather than replace it.
- **Keep one source of truth.** Don't create new document sprawl. Update this file and the one blueprint.
- **The prototype must be real.** Money moves through test-mode flows, and messages, bids and AI calls are real. No fake dashboards.
- **UI quality is a hard requirement.**
- **Honest marketing only.** No fake urgency, counters or hidden fees (India's CCPA dark-pattern rules, US FTC).
