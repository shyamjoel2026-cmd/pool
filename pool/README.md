# POOL: code monorepo

Rules, architecture and milestones: `../POOL_BLUEPRINT.md`. Status and the handoff log: `../POOL_PROJECT_STATE.md`. Shared agent rules: `../AGENTS.md`.

## Packages

| Package | What | Status |
| --- | --- | --- |
| `packages/engine` | Pure TypeScript core. It holds money in integer paise/cents and covers: quantities (unit / kg in grams), policy (India/US), pools (buyer-chosen close, caps, extension only with everyone's opt-in, award, accept window with no reply meaning walk away), sealed bids (lower-only revisions, anomaly flag, published ranking, capacity split), orders (split, proof-gated lifecycle, late credit, install hold, cancellation symmetry, seller default), Wave Drop slab pot, handover codes and pickup slots. No I/O. | M1 done: 71 tests, including fast-check money properties and an end-to-end scenario |

## Run (Windows, Node ≥ 24.12)

```bash
export PATH="$PATH:$APPDATA/npm"   # if pnpm is not found
pnpm install
pnpm test        # all packages
pnpm typecheck
```

## Conventions

- Money is always `Money { currency, minor }` in integer minor units. Never use floats. Splits use `allocate()`, which always sums exactly.
- Every commercial number lives in `policy.ts`. Values marked `GUESS` stay guesses until the founder confirms them.
- Every money event carries an `idempotencyKey` (`<orderId>:<action>`), so a retry never double-pays.
- Order status only moves when the required proof is attached.
