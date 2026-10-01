# POOL: code monorepo

Rules, architecture and milestones: `../POOL_BLUEPRINT.md`. Status and the handoff log: `../POOL_PROJECT_STATE.md`. Shared agent rules: `../AGENTS.md`.

## Packages

| Package | What | Status |
| --- | --- | --- |
| `packages/engine` | A pure TypeScript core for ANY product, with no I/O and no product-specific logic. Money is in integer paise/cents. Units of measure, quantity rules, bid terms, fulfilment profiles (steps, checklist, holds, return window), tax rate and category are all data. It covers: pools (buyer-chosen close, optional caps, opt-in extension, NO_DEAL, default-B timeout), sealed bids (lower-only, anomaly flag, published ranking by seller price, capacity split), **team pricing** (seller price → team-set buyer price → margin; offers blocked until priced), profile-driven orders (proof per step, handover code, holds, late credit, cancellation symmetry, seller default), Wave Drop slab pot, codes, and time slots. | M1.5 audit in progress: 102 engine tests; retained US regression scenario |

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

## M2 checkpoint (not completion)

- packages/db: PostgreSQL 18, Drizzle schema/adapter, versioned migrations 001–004, pinned upstream pgledger plus an explicit bigint adapter. All POOL money columns and ledger stored amounts are bigint INR paise. Raw pgledger functions retain numeric inputs so fractional requests can be rejected before integer conversion.
- packages/core: transactional command/idempotency store, payment receipt ownership, persisted bids and team pricing, immutable fulfilment profile versions, booking-to-order credit, hash-only handover codes, durable DBOS workflows and transactional workflow outbox.
- Tests create a uniquely named fresh database in the real Docker server, apply every migration, and remove only that test database afterward. No database mocks. Requires local CREATEDB permission. Test receipts are synthetic inputs to the trusted command boundary; no Razorpay integration exists before M3.

With local secrets already in .env:

~~~powershell
& "$env:LOCALAPPDATA\Programs\DockerDesktop\resources\bin\docker.exe" compose up -d --build
pnpm --filter @pool/db migrate
pnpm test
pnpm typecheck
node --env-file=.env packages/core/src/worker.ts
~~~

Current validation: 10 engine files / 102 tests and 2 core files / 9 tests; all three package typechecks passed. The core suite covers clean migrations, real ledger conservation with generated allocations, payment receipt reuse rejection and rollback, persisted lifecycle, wrong-code attempts, issue-resolution hold rescheduling, and kill/restart after wave transaction commit. Timer and crash fixtures are isolated states; they are not proof of every business flow.

Remaining acceptance work: complete seller-default command funding/recovery paths; define multi-seller Wave Drop semantics; bind delivery tax treatment and disclosed return costs to persisted accepted terms; bring Drizzle declarations fully in line with migration constraints; expand delayed-receipt and crash/recovery coverage. Generic command reducers are an internal trusted API, not an HTTP/auth boundary. No M3 work has started.
