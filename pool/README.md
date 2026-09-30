# POOL: code monorepo

Rules, architecture and milestones: `../POOL_BLUEPRINT.md`. Status and the handoff log: `../POOL_PROJECT_STATE.md`. Shared agent rules: `../AGENTS.md`.

## Packages

| Package | What | Status |
| --- | --- | --- |
| `packages/engine` | A pure TypeScript core for ANY product, with no I/O and no product-specific logic. Money is in integer paise/cents. Units of measure, quantity rules, bid terms, fulfilment profiles (steps, checklist, holds, return window), tax rate and category are all data. It covers: pools (buyer-chosen close, optional caps, opt-in extension, NO_DEAL, default-B timeout), sealed bids (lower-only, anomaly flag, published ranking by seller price, capacity split), **team pricing** (seller price → team-set buyer price → margin; offers blocked until priced), profile-driven orders (proof per step, handover code, holds, late credit, cancellation symmetry, seller default), Wave Drop slab pot, codes, and time slots. | M1: 75 tests (fast-check money properties; the same end-to-end scenario for a TV, 1 kg meat and a US product) |

## Run (Windows, Node ≥ 24.12)

```bash
export PATH="$PATH:$APPDATA/npm"   # if pnpm is not found
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
