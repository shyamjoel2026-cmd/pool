# POOL: code monorepo

Rules, architecture and milestones: `../POOL_BLUEPRINT.md`. Status and the handoff log: `../POOL_PROJECT_STATE.md`. Shared agent rules: `../AGENTS.md`.

## Packages

| Package | What | Status |
| --- | --- | --- |
| `packages/engine` | Pure universal-product rules: booking, need-by-aware capacity awards, team pricing, checkout, reviewed India tax data, profile-driven fulfilment, seller recovery, replay, abuse signals and separate seller Wave Drop pots. | M1/M1.5 implementation verified: 110 tests; retained US regression |
| `packages/db` | PostgreSQL 18, Drizzle query schema, migrations, immutable audit/profile/ledger histories and bigint pgledger adapter. | M2 migrations verified against real Docker PostgreSQL |
| `packages/core` | Atomic commands, receipt ownership, persisted commerce and funded recovery, local DBOS workflows and transactional outbox. | M2 implementation verified: 16 integration tests |

## Run (Windows, Node ≥ 24.12)

```powershell
$env:PATH="$env:APPDATA\npm;$env:PATH"
pnpm install
pnpm test        # all packages
pnpm typecheck
```

## Conventions

- Money is always `Money { currency, minor }` in integer minor units. Never use floats. Splits use `allocate()`, which always sums exactly.
- Region-level numbers live in `policy.ts`. Everything product-specific is data per pool (see `presets.ts` for EXAMPLES only). Values marked `GUESS` stay guesses until the founder confirms them.
- There is no fixed fee: the POOL team sets each pool's buyer price (`pricing.ts`).
- Every money event carries an `idempotencyKey` (`<orderId>:<action>`), so a retry never double-pays.
- Order status only moves when the required proof is attached.

## M1.5 rework
India pools now require booking and checkout configuration plus HSN/GST data. Awards move through stageAward → publishOffers; the actual acceptance deadline must fit bid validity. Payment receipts must match bookings. All money is integer paise with exact BigInt intermediates. Handover verifies an order-bound code after balance capture. issueCode requires externally generated entropy, keeping the engine deterministic. Reducers replay journal snapshots and audit data; commands return exact money events. India tax caveats are explicitly marked UNVERIFIED in source.

## M2 verification — 1 Oct 2026

- packages/db: PostgreSQL 18, Drizzle schema/adapter, versioned migrations 001–007, pinned upstream pgledger plus an explicit bigint adapter. All POOL money columns and ledger stored amounts are bigint INR paise. Raw pgledger functions retain numeric inputs so fractional requests can be rejected before integer conversion.
- packages/core: transactional command/idempotency store, payment receipt ownership, persisted bids and team pricing, immutable fulfilment profile versions, booking-to-order credit, hash-only handover codes, durable DBOS workflows and transactional workflow outbox.
- Seller recovery loads actual accepted orders, bids and remaining capacity, uses funded seller deposits then the reserve, preserves the buyer price, and returns replacement principal on cancellation/return. Replacements must cover the accepted fulfilment and Wave Drop terms.
- Wave closure derives separate pots from accepted seller terms and actual terminal orders. Default penalties require funded deposits. Order settlement and Wave Drop are scheduled through the outbox after the return window and resolution of open issues.
- Tests create a uniquely named fresh database in the real Docker server, apply every migration, and remove only that test database afterward. No database mocks. Requires local CREATEDB permission. Test receipts are synthetic inputs to the trusted command boundary; no Razorpay integration exists before M3.

Trusted operational service functions: `reconcileLedger(db)` reports inconsistent balances, entry chains, transfer linkage, projections and slot counters without inventing repairs; `inspectWorkflows(aggregateId)` reports durable status; `retryFailedWorkflow(workflowId, requestId, actor, reason, now)` records an audited recovery intent and forks at the failed step. Retry callers must preserve the original request fields for idempotency. Invalid outbox jobs are quarantined for investigation; failed submissions retry with a capped delay and the same workflow ID. Fulfilment slots bind seller, area, mode and a data-defined purpose; cancellation, return and seller reassignment release invalid reservations atomically. These functions are not authenticated HTTP endpoints.

With local secrets already in .env:

~~~powershell
& "$env:LOCALAPPDATA\Programs\DockerDesktop\resources\bin\docker.exe" compose up -d --build
pnpm --filter @pool/db migrate
pnpm test
pnpm typecheck
node --env-file=.env packages/core/src/worker.ts
~~~

**Foundation acceptance reopened: audit/rework in progress.** The historical 126-test checkpoint is superseded by exact current outputs in POOL_PROJECT_STATE.md §0. Tests cover clean migrations, exact ledger conservation, receipt reuse and delayed receipts, accepted-term binding, default funding/capacity/cancellation/return, rollback, issue-resolution timers, automatic settlement-to-wave dispatch, and a complete two-seller lifecycle with kill/restart after the wave transaction commits but before DBOS records completion. Restart creates no duplicate postings. Smaller isolated crash fixtures also remain.

Task A (A1–A10) and Task B (B1–B7) remain under foundation audit. This is a local prototype checkpoint, not a proof of correctness for every input or production approval. **UNVERIFIED:** official GSTIN checksum authority, current commission GST classification, TDS base/exemptions, non-movement place-of-supply and return/credit-note treatment. Persisted zero-rate checkout requires reviewed applicability data; the pure legacy rate-only fallback remains labelled UNVERIFIED. GSTIN checksum is advisory; seller review is supplied by ops. Existing GUESS policy values need founder confirmation. DBOS/pg still emits a query-concurrency deprecation warning; the traced upstream connection hook is recorded in the handoff.

Generic reducers and funding/receipt commands are trusted service functions; callers must supply verified payment facts. There is no HTTP/auth boundary or payment-provider adapter at M2. External ledger counterpart entries are accounting instructions, not executed Razorpay transfers or refunds. **Stopped before M3**, including live/test Razorpay APIs, webhook verification and payout reversal execution. Exact evidence, file map, source URLs and remaining questions: `../POOL_PROJECT_STATE.md` §0.
