# POOL experience (clickable, simulated)

A complete, clickable walk-through of POOL for investors and first customers: the landing page, the buyer app, the seller app and the POOL team console. All of them run on one simulated engine that follows the rules in `POOL_BLUEPRINT.md` and the engine in `pool/packages/engine`.

**This is not the product.** It lives outside `pool/` on purpose (AGENTS.md: no mocked data paths in the product). Nothing leaves the browser: payments, WhatsApp, the assistant, camera and tracking are simulated, and every such place is labelled "Simulated". Brands, sellers and people are samples.

## Run it

Needs Node 22.12+ and pnpm.

```
cd experience
pnpm install
pnpm dev          # http://localhost:5173
```

Other commands:
- `pnpm typecheck`, `pnpm build`
- `pnpm build:demo`: a single self-contained HTML file in `dist-demo/`, for sharing.
- `pnpm shots`: screenshots of every route into `.shots/`. Needs `pnpm preview` running.

## What's inside

| Path | What |
| --- | --- |
| `#/` | Landing page: live story, Wave Drop slider, city map, honesty case, investor maths from the live ledger |
| `#/buyer` | Buyer app: find (link, scan or ask), pool, join or start (starter picks the close time), refundable booking, personal offer (accept or walk away), pay now, EMI or at the door, handover code, issues, invoice, Wave Drop, money, account, community, Warranty Locker, assistant, WhatsApp |
| `#/seller` | Seller app: demand, sealed bid (lower-only, Wave Drop slabs, payout preview), orders with proof, code verification, payouts and holds, staff mode, forward demand |
| `#/ops` | POOL team: overview, seller KYB review, awards, buyer pricing, exceptions and refunds, reconciliation (ties out to ₹0.00), risk, audit, rules |

On desktop, the buyer and seller apps show inside a phone frame, with the 15-step investor walkthrough beside it. The **Demo** menu in the top bar can:
- move the clock forward;
- trigger failure states (payment failure, slow network, offline, load error);
- switch language and theme;
- reset the demo.

`src/sim/engine.ts` mirrors the engine's rules:
- money in integer paise, half-up rounding and largest-remainder allocation;
- ranking and eligibility, the low-bid flag, award in join order with backups;
- `splitOrder` with TCS, TDS and holds;
- the Wave Drop slab pot.

State is kept in `localStorage`, under the key `pool-demo-state-v8`.

## Checks

- `pnpm test` runs 9 tests:
  - money primitives;
  - GST split;
  - GSTIN checksum;
  - order-split conservation;
  - Wave Drop close;
  - the ledger tying out to ₹0.00;
  - Telugu/Hindi coverage of every buyer and landing string, with every `{placeholder}` kept.
- `pnpm walkthrough` drives all 15 investor steps through the real UI: join, bid, close, hold back the flagged bid, award, price, accept and pay, dispatch, checklist, code, installation, wave close, payouts and reconciliation. It checks the ledger is still ₹0.00 at the end. It needs `pnpm preview` running.
- `pnpm shots` screenshots every route. `--dark` captures the dark theme; `--lang=te` or `--lang=hi` captures Telugu or Hindi.

## Known gaps (honest)

- Telugu and Hindi are draft translations. They cover the buyer app and landing page, but a native speaker should review them before launch.
- Product names, units ("piece", "kg"), the seller app and the POOL console stay in English. The seller's delivery staff mode is bilingual.
- Late credit (₹200) and return costs are placeholders pending a founder decision, the same as in the engine.

The full screen spec is in `SPEC.md`.
