# POOL experience (clickable, simulated)

A complete, clickable walk-through of POOL for investors and first customers: the landing page, the buyer app, the seller app and the POOL team console. All of them run on one simulated engine that follows the rules in `POOL_BLUEPRINT.md` and the engine in `pool/packages/engine`.

**This is not the product.** It lives outside `pool/` on purpose (AGENTS.md: no mocked data paths in the product). Nothing leaves the browser: payments, WhatsApp, the assistant, camera and tracking are simulated, and every such place is labelled "Simulated". Brands, sellers and people are samples.

## Run it

You need Git, Node.js 22.12 or newer and pnpm 12. The project pins pnpm 12.8.1, and pnpm switches to it by itself.

### On Windows (step by step)

Open **PowerShell** (Start → type `PowerShell` → Enter) and check the tools:

```powershell
git --version
node -v          # v22.12 or newer (v24 is fine)
pnpm -v          # 12.x
```

If `pnpm` is "not recognized", run `$env:Path += ";$env:APPDATA\npm"` (that is where it is installed on the founder's PC) or install it with `npm install -g pnpm@12.8.1`.

0. **Stop every old preview:** press Ctrl+C in each terminal that is running `pnpm dev`. Otherwise an old version can keep answering, and Windows can't replace a folder that's in use.
1. Go to the project folder. If the path doesn't exist, try `$HOME\OneDrive\Desktop\idea`.
   ```powershell
   cd $HOME\Desktop\idea
   ```
2. Get the latest code from GitHub. Note the commit it shows:
   ```powershell
   git fetch origin
   git log -1 --oneline origin/claude/magical-pascal-1zipb0
   ```
3. Make a **fresh folder pinned to exactly that commit**. Your own folder and branch stay untouched, so an old branch can't sneak in:
   ```powershell
   if (Test-Path ..\pool-deep-end) { git worktree remove --force ..\pool-deep-end }
   git worktree add --detach ..\pool-deep-end origin/claude/magical-pascal-1zipb0
   ```
   Repeat steps 2 and 3 whenever you want the newest version.
4. Go into the app folder and install the libraries. The first install takes about a minute and ends with `Done in …`.
   ```powershell
   cd ..\pool-deep-end\experience
   pnpm install
   ```
5. Start it on its own port, so an old server can't answer:
   ```powershell
   pnpm dev --port 5180 --strictPort
   ```
   Open **http://localhost:5180** in Chrome. Under the two big buttons it says `Deep End · build <commit>`, and that commit should match step 2. Keep the window open; **Ctrl+C** stops it.

On your phone: run `pnpm dev --host`, then open the `Network:` address on a phone on the same Wi-Fi. Allow access if Windows Firewall asks.

### Build and compile

Run these in the same `experience` folder:

| Command | What it does | What you should see |
| --- | --- | --- |
| `pnpm typecheck` | Compiles all the TypeScript and checks it for errors | The command echo and nothing else |
| `pnpm test` | Checks the money maths, GST, ledger and translations | `Tests  9 passed (9)` |
| `pnpm build` | Compiles and makes the production build in `dist\` | `✓ built in …` |
| `pnpm preview` | Serves the production build | http://localhost:4173 |
| `pnpm build:demo` | Makes one self-contained file, `dist-demo\index.html` | `✓ built in …`. Double-click the file to open it. |
| `pnpm walkthrough` | Clicks all 15 investor steps in Chrome or Edge. Needs `pnpm preview` running in a second window. | 15 ✓ lines, ending `difference ₹0.00` |

### If something goes wrong

- **`ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION`:** you have an older copy. pnpm 12 refuses packages less than 24 hours old; repeat steps 2–3 to get the fixed lockfile (commit `546b95b` or later).
- **Localhost shows the old (olive) design:** an old server or an old branch is answering. Follow steps 2–5 exactly, use port 5180, and check that the build stamp matches step 2.
- **Port 5180 is busy:** pick another number, for example `pnpm dev --port 5181 --strictPort`.
- **Walkthrough says "No browser found":** install Google Chrome, or set `$env:CHROME_PATH` to a Chromium-based browser.

Other commands:
- `pnpm shots`: screenshots of every route into `.shots/`. Needs `pnpm preview` running.
- `#/art`: a design QA sheet with every product render (not linked from the app).

## Look and feel

One idea runs through every screen: **water rises, price falls**. Pools fill as households join, the Wave Drop pot is water, prices roll into place.
- Type: Google Sans Flex (wide display headlines), Instrument Serif italic for the one emotional word, Anek Telugu and Anek Devanagari for Indian scripts.
- Colour: pool blue for the one action that matters, aqua for live pools and money coming back, marigold for savings, green only for money states.
- Products: lit, 3D-style SVG renders in `src/ui/ProductArt.tsx`. Every product page and pool takes its colour from its product.

## What's inside

| Path | What |
| --- | --- |
| `#/` | Landing page: a live pool filling up, what India buys most (phones, TVs, ACs, scooters, rice, laptops, solar) as live pools, six-step journey, honesty case, Wave Drop pot, city map, three-script India section, investor maths from the live ledger |
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

State is kept in `localStorage`, under the key `pool-demo-state-v9`.

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
