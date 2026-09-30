# Work order for Codex — POOL: M1.5 (India-complete engine) + M2 (database and durable workflows)

You are continuing an existing project. Do not start fresh or redesign.

## 0. Read first (mandatory, in this order)

1. `AGENTS.md` (repo root): the founder's rules. They override everything, including this file.
2. `POOL_PROJECT_STATE.md`: read §0 (handoff log, newest first) and §4 (decision log).
3. `POOL_BLUEPRINT.md`: §1 (product rules, including 12a and 12b), §2–4 (architecture, stack, data model), §6 (milestones).
4. `pool/README.md`, then every file in `pool/packages/engine/src` and `pool/packages/engine/test`.
5. In `pool/`: run `pnpm install`, `pnpm test`, then `pnpm typecheck`. The baseline is **8 test files, 75 tests passing, and tsc exit 0**. If the baseline fails, stop and report the failure. Do not change code until it is green.

## 1. What POOL is (founder-confirmed; do not change these decisions)

- POOL is for **any product**: groceries, meat, oil, cement, books, furniture, electronics, services. It never contains product-specific logic.
- A buyer joins or starts a pool and **chooses when it closes**. Only paid, refundable bookings count as committed demand.
- Sellers submit **sealed bids at their own price** per unit of measure. A seller can lower a bid before close but never raise it (default C).
- **The POOL team sets the buyer price for each pool.** POOL keeps the difference. There is no fixed fee.
- **Default A:** the earliest joiners get the best-ranked seller that still has capacity.
- **Default B:** the buyer accepts or walks away. No reply by the deadline counts as walking away, with a full refund.
- **Payment:** the buyer pays through POOL's checkout, and a licensed payment aggregator (Razorpay Route) holds the money. The seller is paid after the handover code.
- **Wave Drop:** settled-volume refunds use the slab pot. Seller-cancelled orders still pay their slab.
- **INDIA FIRST.** Build everything for India only: INR, GST, TCS/TDS, UPI, Razorpay, pincodes, Telugu/Hindi/English. The US is parked. Keep the existing US code compiling, and add nothing US-specific.

## 2. Non-negotiable engineering rules

- **No hallucination.** Before using any package, run `npm view <pkg> version` and pin the exact version it returns.
  - Take every API, SQL function, Docker image and tax rule from its official docs, repo or government source, and put the URL in a code comment or the handoff log.
  - If you cannot verify something, write `UNVERIFIED:` next to it. Never invent a function name, flag or rate.
- **Money** is integer paise only (`Money { currency, minor }`). No floats anywhere in money paths. All splits go through `allocate()`.
- **The engine stays pure** (`packages/engine`): no I/O, no database, no network, no `Date.now()`. Time is passed in as a parameter.
- **Product-agnostic.** Categories, units, quantity rules, terms, fulfilment profiles, HSN codes and GST rates are data. `grep` for product words must only hit comments and `presets.ts`.
- **Tests prove behaviour.** Every new rule gets unit tests, and every money rule gets a **fast-check property test** that the parts sum exactly. Keep all existing tests green; change a test only when a founder decision changed the behaviour, and say so in the commit message.
- **Real, not fake.** M2 uses a real PostgreSQL in Docker. There are no mocked databases in integration tests.
- **Secrets.** Only `pool/.env` holds them (git-ignored), and `pool/.env.example` lists the variable names. Never print, log or commit keys.
- **Commits.** Make small commits with clear messages. Before finishing, add a handoff entry to `POOL_PROJECT_STATE.md` §0 (format in `AGENTS.md` §2). It must include the exact test counts and command outputs you saw.

## 3. Environment (Windows, verified 30 Sep 2026)

- Node v24.12.0 and pnpm 12.8.1. If `pnpm` is not found, add `%APPDATA%\npm` to PATH.
- Docker Desktop 29.8.1 is running, but `docker.exe` is **not on PATH**. Use `%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin\docker.exe` (Compose v5.5.1 is available as `docker compose`).
- The repo root is `C:\Users\shyamjoel\Desktop\idea` (one git repo). The code is in `pool/`.

---

## TASK A — M1.5: make the engine India-complete and more advanced (`pool/packages/engine`, pure)

Each item needs tests. The acceptance check is in brackets.

**A1. Buyer need-by date.** `award()` currently ignores `Member.needBy`. A member may only be assigned a bid whose `deliverBy ≤ needBy`; otherwise try the next covering bid, and if none fits, mark the member unserved with reason `NEED_BY`. [Test: a member needing delivery by Friday is never given a Monday bid.]

**A2. Refundable booking, modelled end to end.** Add a per-pool `BookingRule`: fixed paise, or bps of an estimate, with min and max (data).
- Compute the booking amount at join.
- Credit the booking against the final price at checkout.
- Emit exact refund amounts, not just flags, for: leave, unpaid at close, UNSERVED, NO_DEAL, WALKED_AWAY, TIMED_OUT, and ops cancelling the pool.

[Property test: for every member, the booking is either fully refunded or fully applied to an order. Never both, never neither.]

**A3. Checkout plans.** Support two plans per pool (data): `PREPAY_FULL` (balance due at accept) and `BALANCE_AT_HANDOVER` (the buyer pays the balance by UPI or card at the door, through the PA, **before** the code can be verified).
- Cash is never allowed: RBI PA Directions 2025 say the escrow cannot be used for COD (see `research/06_prototype_stack.md`).
- `handOver()` must refuse while any balance is unpaid.

[Tests for both plans.]

**A4. India GST, done properly.** Products and pools carry `hsnCode` and `gstRateBps` (data). Given the seller's GSTIN state code and the delivery address state (the place of supply for goods is where movement ends; verify against the IGST Act 2017 s.10 and cite it), compute:
- Tax inside the buyer price, split into **CGST+SGST** (intra-state) or **IGST** (inter-state).
- **TCS under CGST s.52**: 0.5% of net taxable value, split 0.25% CGST + 0.25% SGST, or 0.5% IGST. Verify the current rate against CBIC or an official notification and cite it.
- **Income-tax TDS**: 0.1% (old s.194-O, now s.393(1) of the Income-tax Act 2025 per `research/01_idea_research_market_supply_legal_abuse.txt`). Verify and cite it; mark the TDS base `UNVERIFIED: CA to confirm`.
- **GST on POOL's commission** (the margin): 18% inside the margin, split by POOL's state vs the seller's state.

Replace the flat `goodsTaxBps` with this, and keep every existing money invariant. [Property test: all tax parts plus everything else sum exactly to the buyer total; intra-state and inter-state examples to the paisa.]

**A5. Pool pricing stage.** Add pool state `PRICING` between `CLOSED` and `AWARDED`. `award()` output is stored as assignments, and offers can only be published after the team has a `PriceDecision` for every assigned bid (`pricing.ts` already enforces this at `makeOffers`). Add an optional pricing deadline per pool; if it passes with prices missing, move to NO_DEAL with full refunds. [Tests.]

**A6. Execute seller default.** Add a function that takes a defaulting seller's open orders and reassigns each buyer to their `backupBidId` **at the same buyer price**.
- It returns the new assignments, the gap charge to the defaulting seller (`backupCostGap`), and the Wave Drop penalty.
- If no backup has capacity, the buyer is fully refunded, plus the disclosed compensation.

[Tests, and a property test that the buyer price never changes.]

**A7. Event sourcing and audit.** Every pool and order change is already an event. Add pure reducers `rebuildPool(events)` and `rebuildOrder(events)`, and add audit events for anything shown to buyers: price, committed count, close time.

[Property test: replaying the events gives exactly the same state as the command path.]

**A8. Abuse detectors** (pure functions that return signals, never auto-punish):
- one `payerKey` or device across several households or pools;
- identical or near-identical bids, and winner rotation across pools by the same sellers (bid-rigging is presumed illegal under Competition Act s.3(3)(d));
- join bursts from one area or device;
- a bid below 15% of the median (this exists; include it).

[Tests with clear positive and negative cases.]

**A9. India helpers.**
- `formatINR()` via `Intl.NumberFormat('en-IN')`, giving lakh/crore grouping (e.g. ₹45,99,900).
- IST display helpers (store UTC, display Asia/Kolkata).
- `Address` with pincode (6 digits) and state code validation.
- GSTIN format and checksum validation. Verify the checksum algorithm from an official or authoritative source and cite it; if you cannot, mark it `UNVERIFIED`.

**A10. Per-pool overrides.** The accept window and the minimum pool duration can be set per pool, within the policy's limits.

Done when: all old and new tests pass, `tsc` exits 0, the engine is still pure, README is updated, commits are made, and the handoff entry is written.

---

## TASK B — M2: persistence and durable workflows (India only)

**B1. Database in Docker.**
- Create `pool/docker-compose.yml` for **PostgreSQL 18** with **pgvector** and **PostGIS**.
- Verify on Docker Hub, or the official pgvector/PostGIS docs, which image or tag provides both for PG18. If none does, write a small Dockerfile on the official `postgres:18` image that installs both extensions, and document the source of each package.
- Data goes in a named volume, bound to localhost only.

**B2. `packages/db`.**
- Use Drizzle ORM (pin the version). Write migrations for the blueprint §4 tables, extended for M1.5: products (hsn, gst rate), units, fulfilment_profiles, pools (quantity rule, booking rule, checkout plan), pool_members, bids (all revisions), bid_access_log, price_decisions, assignments, offers, orders, order_steps, handover_codes (hash only), payments (PA reference fields, no card data), sellers (GSTIN, state code), addresses (pincode, state), wave_pots, audit_events (append-only; block UPDATE and DELETE with a trigger), idempotency_keys.
- Money columns are `bigint` paise, and every row has a currency column.

**B3. Ledger.**
- Vendor **pgledger** from https://github.com/pgr0ss/pgledger (MIT; pin the exact commit hash in a comment).
- Post every engine money event (booking, capture, margin, TCS, TDS, holds, releases, refunds, Wave Drop, seller charges) as balanced double-entry transfers, in the **same transaction** as the state change.
- pgledger has no idempotency, so add a POOL idempotency-key table (noted in `research/08_hidden_gems.md`).

**B4. Durable workflows.**
- Use **DBOS Transact** (`@dbos-inc/dbos-sdk`, https://github.com/dbos-inc/dbos-transact-ts, MIT; pin the exact version from `npm view`).
- Workflows: pool close at the chosen `closesAt` (durable sleep), pricing deadline, accept-window expiry, hold release timers, wave close.
- DBOS does **not** run on PGlite (per `research/08_hidden_gems.md`), so it uses the Docker Postgres. Do not use DBOS Conductor or Cloud: all data stays in India on our own database.

**B5. Command layer** (`packages/core` or `apps/api` service functions, no HTTP yet). Functions that load state, call the pure engine, and persist events, state and ledger postings atomically with idempotency keys.

**B6. Integration tests against the real Docker Postgres:**
- a full pool lifecycle;
- the **ledger trial balance ties out to the paisa**;
- replaying the same command twice changes nothing;
- **crash test**: kill the worker mid-workflow (for example during wave close), restart, and show no double postings.

PGlite may be used only for pure-SQL unit tests.

**B7. `.env.example`** with `DATABASE_URL` and `CODE_SECRET` (32+ chars; generate locally, never commit). Validate the env at startup and fail fast with a clear message.

Done when: `docker compose up` works on this machine, migrations apply cleanly, all unit and integration tests pass, the trial balance test passes, and the crash test passes. Commit and write the handoff entry.

**Stop after Task B.** M3 (Razorpay test mode: Orders + Route transfers `on_hold`, release, refunds, webhooks) is the next work order. Do not start it.

## 4. Report at the end (in the handoff entry and in your reply)

- What you built, file by file.
- The exact commands you ran and their final output lines (test counts, tsc exit code, `docker compose ps`).
- Every external fact you used, with its source URL.
- Everything marked `UNVERIFIED`.
- Anything you could not finish, and why.
- Questions for the founder. Ask; do not guess.
