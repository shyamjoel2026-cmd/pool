# POOL — Project State (the reference file)

> **What this is.** The single place to restart from if the chat or thread is lost. It holds what POOL is, every decision so far, where each file is, what's in progress and what comes next.
> **Rule:** update this file after every milestone — each decision, finished research, account created, build step. Newest entries go at the top of each log.
> **Last updated:** 1 Oct 2026

---

## 0. Handoff log (newest first; every agent adds an entry at the end of a session; see AGENTS.md §2)

### 2026-10-03 · Claude Code · Experience: light mode only (founder request)
- Did:
  - Removed dark mode from `experience/`: the dark token blocks in `styles.css`, all 27 Tailwind `dark:` classes, the theme sync in `App.tsx`, the "Appearance" switch in the buyer Account screen, the theme buttons in Demo controls, the `theme` preference in state, and `shots --dark`.
  - Added `color-scheme: only light` and `<meta name="color-scheme" content="only light">`, so browsers don't auto-darken the page.
  - The navy hero and header bands are part of the light design and stay.
  - Earlier on 2 Oct: the build stamp is shown in the app, and the README steps now use a pinned fresh folder (`..\pool-deep-end`) on port 5180, because the founder's localhost had served the old olive version from `codex/experience-polish`.
- Verified:
  - with the browser set to dark mode, the buyer, pool, seller and console screens render light;
  - typecheck passes;
  - tests 9/9;
  - build passes;
  - walkthrough 15/15 with ledger ₹0.00;
  - no runtime errors on any route.
- Next: founder review; native-speaker review of Telugu/Hindi.
- Open issues / blockers: none new.

### 2026-10-02 04:20 · Claude Code · Experience builds on the founder's toolchain (pnpm 12)
- Did:
  - Rebuilt from a fresh GitHub clone with pnpm 12.8.1, the founder's version. `pnpm install` failed: pnpm 12's `minimumReleaseAge` rejects packages under 24 hours old, and Vite 8.3.2 was published on 1 Oct. Took Codex's fix (Vite 8.3.1), regenerated the lockfile with pnpm 12.8.1 (only Vite changed; the other 152 packages are identical) and pinned `"packageManager": "pnpm@12.8.1"` in `experience/package.json`, as `pool/` does.
  - `pnpm walkthrough` and `pnpm shots` used a Linux-only Chromium path. They now use `scripts/browser.mjs`: `CHROME_PATH`, else the cloud Chromium, else installed Chrome, else Edge.
  - `experience/README.md` now has a Windows step-by-step guide (git worktree into `..\idea-experience`), a build-and-compile table with expected output, and troubleshooting.
- Verified: on a fresh clone of `546b95b` with pnpm 12.8.1:
  - install leaves the lockfile untouched;
  - `typecheck` passes;
  - tests pass 9/9;
  - `build` and `build:demo` pass;
  - walkthrough 15/15 with ledger ₹0.00;
  - 63 routes load with no runtime errors.

  The worktree steps were tested from a clone on `main`: first run, second run ("already exists") and `git pull`. The one-file build (`dist-demo/index.html`) opened from `file://`, went landing → buyer app → phone pool with no errors, and saved state in the browser.
- Next: the founder runs the README steps on Windows; native-speaker review of Telugu/Hindi.
- Open issues / blockers: `codex/experience-polish` still conflicts with this branch's styles; its Vite fix is now included here.

### 2026-10-02 03:40 · Claude Code · Experience redesign: "Deep End" visual system, what India buys most
- Did:
  - Founder rejected the olive/paper palette on `codex/experience-polish` ("looks like garbage", "2010"). Rebuilt the look of `experience/` on `claude/magical-pascal-1zipb0` instead of recolouring it. Decision: one visual metaphor, **water rises, price falls**: pools fill as households join, the Wave Drop pot is water, prices roll into place.
  - Type: Google Sans Flex (variable width/optical size) for UI and wide display headlines, Instrument Serif italic for the one emotional word, Anek Telugu / Anek Devanagari for Indian scripts. All verified on Google Fonts.
  - Colour: electric pool blue `#1f57ff` for actions, aqua for live pools and money coming back, marigold for savings, green only for money states. Contrast checked with code (body grey raised to 4.7:1; old one was 3.7:1).
  - Shape and motion: pill buttons, 24/16 radii, floating liquid-glass tab bars and action bars, rolling digits, water and drop/ripple animations (all off under reduced motion).
  - New logo mark (a pool filling, one drop falling in) and favicon.
  - Product art: replaced flat icons with lit 3D-style SVG renders for all 20 products (`src/ui/ProductArt.tsx`, QA sheet at `#/art`).
  - Content: the landing page and buyer home now lead with what India buys most. Evidence: phones ~30% and phones + appliances 60–65% of online festive GMV 2025 (Redseer via Storyboard18; Counterpoint festive report). Added sample products and open pools: Orbit Nova 5G phone (HSN 8517 13, 18%), Raftaar E3 electric scooter (HSN 8711 60, 5%), 3 kW installed rooftop solar (8.9% overall GST: 70% goods at 5%, 30% services at 18%, rule since 22 Sep 2025). Rates checked against PIB / ClearTax / TaxHeal.
  - Landing rebuilt: live pool hero (water level, drops, sealed bids, best outside price), "What India buys most" bento of live pools, six-step journey with real UI pieces, honesty case, Wave Drop as a rising pot, city map, three-script India section, doors, promise, investor maths from the live ledger.
  - Buyer app: new home (deep-water header, "Pooling near you now" carousel), product-coloured heroes on pool and product pages, offer price hero with rolling digits. Accept and Walk away are now the same style (ported from Codex; POOL never nudges).
  - Ported from Codex: booking-success count fix (it double-counted the new household) and lazy-loaded routes. Codex's olive palette and its POOL_BLUEPRINT.md paragraph were not taken.
  - 59 new Telugu/Hindi strings (drafts, need native review). State key is now `pool-demo-state-v9`.
- Verified: in `experience/`: `pnpm typecheck` passed; `pnpm test` 9/9; `pnpm build` and `pnpm build:demo` passed; `pnpm walkthrough` 15/15 with reconciliation ₹0.00; all 63 routes loaded with no runtime errors; screenshots reviewed at 1440 and 390–412 px, light and dark, English, Telugu and Hindi.
- Next: founder review of the new look; native-speaker review of Telugu/Hindi; decide whether `codex/experience-polish` should be closed (it conflicts with this branch's styles).
- Open issues / blockers: the seller app and POOL console got the new system through shared components, not a screen-by-screen redesign. The late credit (₹200) and return costs are still GUESS placeholders, same as the engine.

### 2026-10-02 02:00 · Claude Code · Experience QA, translations, end-to-end walkthrough
- Did:
  - Visual QA of 60 routes (phone and desktop) and fixed what it found:
    - sticky Join/Accept bars were hidden behind the tab bar;
    - payment success screens closed before the buyer could see them, on both join and accept;
    - the tax invoice's columns overlapped;
    - sample washer deliveries were stamped late, which showed "on time 42%";
    - greetings used the server clock instead of IST;
    - audit entries showed raw ids;
    - landing sections stayed invisible for reduced-motion users;
    - Google Fonts blocked app start on slow networks;
    - a fresh demo wasn't saved until the first change, so reloads changed ids.
  - Fixed two logic bugs found by the end-to-end run:
    - the demo "close now" shortcut moved the delivery deadline but not the sellers' dates, so every bid became ineligible;
    - "complete deliveries" ignored buyers still deciding, so the wave could never close.
  - Made the seller's bid capacity default to the committed quantity plus headroom.
  - Removed claims I could not verify:
    - the "1 Jan 2027 e-commerce price rule", which POOL_BLUEPRINT.md marks UNVERIFIED;
    - an "8 Oct festive offers" date;
    - "8 years" of tax-record retention;
    - "download" listed as a DPDP Act right.
  - Rewrote demo copy so it doesn't assume the gender of sample people.
  - Translated the buyer app and landing page into Telugu and Hindi: 1,300+ strings, including relative dates.
  - Published a private preview (single-file build): https://claude.ai/artifact/4wzQXV62MCn9GX5tdHB2HD
- Verified: in `experience/`:
  - `pnpm typecheck` passed;
  - `pnpm test` passed 9/9, including translation coverage and placeholder parity;
  - `pnpm walkthrough` passed 15/15, with reconciliation at ₹0.00 after the full story;
  - `pnpm shots` showed no runtime errors on 60 routes.
- Next:
  - native-speaker review of the Telugu and Hindi copy;
  - a full dark-theme pass (spot-checked so far: buyer home, offer, seller today, reconciliation; one fix made);
  - translate the seller app if sellers need it.
- Open issues / blockers: the same GUESS placeholders as the engine (late credit, return costs). `pool/` was not touched.

### 2026-10-02 00:48 · Claude Code · Clickable POOL experience (simulated) added in `experience/`
- Did: built a self-contained, clickable experience at `experience/` (Vite 8 + React 19 + Tailwind 4; package `@pool/experience`, own lockfile). It contains:
  - a landing page;
  - a buyer app (about 40 screens): find by link, scan or assistant; join or start a pool, with the starter choosing the close time; refundable booking; personal offer with accept or walk-away and the honest "outside is cheaper for you" case; pay now, by EMI or at the door, never cash; checklist then handover code; issues; GST invoice; Wave Drop; money and refunds; account, privacy and help; community move-in pools; Warranty Locker; WhatsApp voice-note join;
  - a seller app (13 screens): demand; sealed lower-only bid with Wave Drop slabs and payout preview; orders with proof; code verification; payouts and holds; staff mode; forward demand;
  - a POOL team console: awards, buyer pricing, exceptions and refunds, reconciliation, KYB review, risk, audit and rules;
  - a 15-step investor walkthrough.
  It sits outside `pool/` on purpose: everything is simulated in the browser (no backend, no real money or messages) and labelled "Simulated", so it must not live in the product monorepo (AGENTS.md: no mocked data paths in the product). Rules mirror `pool/packages/engine`: integer paise, half-up rounding, largest-remainder allocation, ranking and eligibility, the 15%-below-median flag, join-order award with backups, `splitOrder` (TCS 0.5%, TDS 0.1%, installation hold 10%, Wave hold), the Wave Drop slab pot, CGST/SGST vs IGST, and the GSTIN checksum. Spec: `experience/SPEC.md`.
- Verified: in `experience/`, `pnpm typecheck` passed, `pnpm build` passed, and `pnpm test` passed 7 tests: money primitives, GST split, GSTIN checksum, order-split conservation, Wave Drop close invariants, and the seeded ledger tying out to ₹0.00. `pool/` was not touched.
- Next:
  - visual QA of every screen (phone and desktop, light and dark) via `pnpm shots`;
  - an end-to-end click-through of the walkthrough;
  - fill the Telugu and Hindi dictionaries (`src/lib/i18n-dict.ts`);
  - publish a single-file preview (`pnpm build:demo`).
- Open issues / blockers: the Telugu and Hindi strings are mostly not translated yet. Late credit (₹200) and return costs are the same GUESS placeholders as the engine. Sample brands, sellers and people only.

### 2026-10-01 23:35 · Codex · GitHub push completed
- Did: configured `origin` as `https://github.com/shyamjoel2026-cmd/pool.git` and pushed `main` successfully.
- Verified: local `main` tracks `origin/main`; `git ls-remote origin refs/heads/main` reports `a8e21c3f1adcc8ef5c81a68156986ce337721c9a`; worktree is clean.
- Next: continue from the pushed `main` branch.
- Open issues / blockers: none for this push.

### 2026-10-01 23:28 · Codex · repository handoff / push preparation
- Did: removed the unrelated untracked `opencode.json` at the founder's request; retained the POOL web, engine, core, database, migration and audit changes already present in the working tree; committed them as `884d6aa` (`Continue POOL foundation audit and buyer preview`).
- Verified: in `pool/`, `pnpm test` passed — engine **12 files / 119 tests**, core **4 files / 28 tests**, db no-test-files exit 0; `pnpm typecheck` passed for apps/web, engine, db and core; `git diff --check` passed. The backup/restore test reported **47 table fingerprints match** and ledger trial balance 0.
- Next: configure the intended Git remote, then push `main`.
- Open issues / blockers: the repository has no Git remote configured, so a network push cannot be completed until the founder provides or adds the remote URL. Existing foundation-audit decisions and M3 stop boundary remain unchanged.

### 2026-10-01 19:36 · Codex · M1/M1.5/M2 ruthless audit continuation
- Did: added durable workflow recovery with audited fork-at-failed-step, operational workflow inspection, invalid-outbox quarantine and capped retry backoff; added fulfilment slot persistence (migration 006), seller/area/mode/purpose ownership, row-locked capacity reservations, atomic cancellation/return release and reconciliation of stored counters; added migration 007 dispatch diagnostics; fixed a weak money property fixture by generating valid order splits and checking exact conservation; rejected expired bid delivery promises and checkout promises; rechecked seller verification at checkout after offers; updated README/blueprint to say foundation acceptance is reopened and India-only scope.
- Verified: in `pool/`, `pnpm test` → engine **12 files / 117 tests passed**, core **4 files / 24 tests passed**, db no-test-files exit 0; aggregate exit 0. `pnpm typecheck` → apps/web, engine, db, core all `Done`, exit 0. Real Docker PostgreSQL fresh-database harness exercised migrations 001–007. New tests cover failed workflow recovery/history/deduplication, invalid outbox isolation, concurrent one-capacity reservations, cancellation release exactly once, deliberate slot-counter corruption detection, seller revocation after offer publication, expired delivery promises, and valid money conservation. `git diff --check` passed before the final edits. Commits: `8f3c193`, `91497cb`, `4119b23`, `2f66d24`.
- Sources used: DBOS workflow management https://docs.dbos.dev/typescript/tutorials/workflow-management ; PostgreSQL partial indexes https://www.postgresql.org/docs/18/indexes-partial.html ; PostgreSQL window functions https://www.postgresql.org/docs/18/functions-window.html ; Drizzle PostgreSQL columns https://orm.drizzle.team/docs/column-types/pg . Existing source URLs remain in the prior audit entries. No new package, secret, provider call or US-specific code.
- Next: continue temporal return/acceptance and migration-restore audit; resolve founder’s two pending contract decisions before changing PREPAY_FULL or post-window returns. M3 remains blocked.
- Open issues / blockers: PREPAY_FULL full-capture versus payment-deadline semantics; post-window defect exception versus Wave-close return eligibility; provisional GUESS defaults; GSTIN checksum, commission GST/TDS, POS and credit-note treatment remain UNVERIFIED; DBOS/pg deprecation warning remains recorded. `opencode.json` is an unrelated untracked file and was not touched.

### 2026-10-01 16:02 · Codex · Buyer web preview added (local-only)
- Did: added `pool/apps/web`, a Next.js 16 buyer-facing India-first preview. It has the POOL home/search surface, real PostgreSQL pool projection at `/api/pools`, expired-pool filtering, pool detail modal, empty/error/loading states, browser-local shortlist, English/Telugu/Hindi copy, and a “How it works” view. Added the local dev loader so `pnpm dev` reads the single ignored `pool/.env` without propagating Node's `--env-file` flag on Windows. Added a site-specific favicon.
- Verified: `pnpm --filter @pool/web typecheck` passed; `pnpm --filter @pool/web build` passed (Next 16.3.8); workspace `pnpm typecheck` passed for web, engine, db and core; `git diff --check` passed; Docker PostgreSQL was running and migrations 001–006 applied; `pnpm dev` served `http://127.0.0.1:3000`; `/api/pools` returned a safe empty result after filtering expired test records; browser checks passed for home, search, shortlist save/view, Telugu switch and How-it-works.
- Next: connect authenticated pool creation/joining and the real product-identification flow after the relevant backend/payment work orders; add Playwright/axe gates when M5 begins. Keep the local preview running for founder review.
- Open issues / blockers: current database contains only expired test fixtures, so the honest pool list is empty until a real future pool is created. No sign-in, Razorpay, booking, checkout, or product-link identification is claimed in this preview. Existing foundation-audit edits from the prior handoff remain in the worktree.

### 2026-10-01 15:30 · Codex · Foundation acceptance REOPENED at founder request — audit/rework in progress
- The 15:07 implementation checklist was too narrow to establish foundation readiness. Its 126 passing tests remain historical evidence; its completion wording is superseded by this entry. M3 remains blocked by the founder's explicit stop boundary.
- Fresh baseline before this audit's edits: `pnpm test` → engine 11 files / 110 tests, core 3 files / 16 tests (106.00s); `pnpm typecheck` → all packages Done, exit 0. Docker healthy. No package additions.
- Reproduced six missing-behaviour regressions before fixes: later fulfilment proof/deferral rejected after settlement; completed proof loses prompt payout when issue clears; CLOSED pool cannot expire pricing/refund if award job never ran; mixed pre-snapshot identities and snapshot identity mismatch silently accepted; NaN slot times/corrupt reservation count accepted; NaN/fractional quantity caps and invalid embedded units accepted. `foundation-audit.test.ts`: **6 failed (6)** before fixes. Fixes then passed engine **116 tests / 12 files**. One new test initially had a TypeScript narrowing error, subsequently fixed; final verification pending below.
- Independent check rejected an early suspicion: generic orderCommand already allocates margin/TCS/TDS on handover. Dedicated handover duplicates the rule, but no missing allocation was reproduced; do not report that suspicion as a defect.
- Research: DBOS step retries default false in installed 5.2.11 declarations; recorded failure needs explicit retry/recovery, not just process restart. Official https://docs.dbos.dev/typescript/tutorials/step-tutorial and https://docs.dbos.dev/typescript/tutorials/workflow-management . Ledger total zero is insufficient to prove individual account balances, entry chains or transfer/journal linkage; implementing read-only reconciliation under one consistent snapshot: https://www.postgresql.org/docs/18/transaction-iso.html ; https://www.postgresql.org/docs/18/functions-aggregate.html ; https://www.postgresql.org/docs/18/functions-json.html . Database checks: https://www.postgresql.org/docs/18/ddl-constraints.html ; https://www.postgresql.org/docs/18/sql-createtrigger.html ; https://www.postgresql.org/docs/18/indexes-expressional.html . Event sourcing review https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing ; backup/restore review https://www.postgresql.org/docs/18/backup-dump.html ; driver connection lifecycle https://node-postgres.com/features/pooling ; sequence-based tests https://fast-check.dev/docs/advanced/model-based-testing/ . These sources inform the audit; no claim that every proposed improvement has been built.
- Open audit queue: delayed/out-of-order timers; failed-workflow visibility/recovery; receipt/idempotency/offer/proof immutability and positive money constraints; reconciliation beyond trial balance; durable slot reservation ownership/capacity; prepay acceptance/payment deadline semantics; post-window return policy; replay stream integrity beyond snapshot identity; migration drift and restore verification; temporal bid eligibility; whole-order runtime validation; structured operational diagnostics and database privilege boundaries. Additional tools/libraries will be selected only for a demonstrated need, not installed to inflate the stack.
- Founder questions sent: PREPAY_FULL accepted only on full capture versus reserving until a payment deadline; post-window claims via ops exception versus direct return until Wave close. No answer presumed. These decisions affect money/contract semantics and are not silently invented. Earlier GUESS-default question also remains pending.
- In progress / uncommitted: engine six-regression repairs; pricing watchdog scheduling from OPEN/CLOSED/PRICING; INR/aggregate identity guards; migration 005 immutable evidence and money constraints/indexes; read-only reconciliation; real-Postgres foundation tests. Next: complete and verify these changes, then continue the open audit queue. Do not treat this entry as a finished audit.

### 2026-10-01 15:07 · Codex · M1/M1.5 + M2 implementation verified; STOP before M3
- Did: completed the remaining Task A/B rework from the 09:40 checkpoint and recorded the founder's **separate pot per seller** decision in §4. No existing founder decision changed. India-only persistence; retained US engine regression, no US additions. Task A A1–A10 and Task B B1–B7 have implementation and passing local verification, subject to the explicitly permitted UNVERIFIED tax/checksum items below. This is not production approval or a claim that the core has no remaining defects.
- Commits this continuation: `ca8b67d` Drizzle schema alignment; `28c10df` delayed receipts and disclosed checkout facts; `f10be57` replacement-funding conservation; `c031d52` atomic funded seller recovery; `c1048fc` separate seller pots and engine guards; `cdd9d9c` reviewed tax/Wave terms at checkout; `509bdf6` durable per-seller settlement and integration coverage. Documentation is committed separately after this handoff. No secrets committed; `git check-ignore pool/.env` returned `pool/.env`; `git ls-files -- .env .env.local` in pool/ returned no files.
- File map — engine: `bids.ts`/`pool.ts` enforce need-by, capacity, deadlines, per-pool limits, paid booking, PRICING, every active member's extension consent and auditable buyer disclosures; `booking.ts` computes exact fixed/bps booking; `checkout.ts` models both payment plans and credit; `india-tax.ts` conserves nested goods/commission/TCS/TDS components with explicit reviewed applicability; `india.ts` formats INR/IST, validates address/state/GSTIN format and exposes advisory checksum; `order.ts` blocks unpaid or issue-held handover, records releases/reversals, returns actual replacement-funding principal to its sources, and stores accepted seller Wave terms/default liabilities; `fulfilment.ts` rejects invalid code/checklist/hold/step policy and makes holds/profile requirements data; `seller-default.ts` preserves buyer price, recalculates backup holds/commission, checks capacity/promises/modes/slabs, and reports deposit/reserve requirements or refund+compensation; `wave-drop.ts` closes deterministic separate pots; `abuse.ts` emits human-review signals; `money.ts` uses safe integer paise and BigInt intermediates. `pricing.ts`, `codes.ts`, `uom.ts`, `terms.ts`, `slots.ts` retain universal data-driven rules. No I/O or Date.now in engine.
- File map — database: `docker-compose.yml`/`Dockerfile.postgres` run pinned PG18 + PostGIS + pgvector, localhost 55432, named volume; `db/src/env.ts` fails fast without a PostgreSQL URL and 32+ non-placeholder CODE_SECRET; `db/src/index.ts` creates pg/Drizzle clients; `db/src/schema.ts` now matches persisted columns, nullability and references, including a reference-only declaration for pgledger's TEXT account ID. SQL migrations own checks/indexes/triggers. `001_pool.sql` tables/vendor adapter constraints; `002_durability.sql` ordered audit/outbox; `003_receipts.sql` global receipt uniqueness; `004_bigint_ledger.sql` integral-bigint storage and immutable ledger/profile history. `db/src/migrate.ts` owns atomic ordered migrations and now cites pinned ULID helper provenance; `db/vendor/*` preserves upstream code/licenses.
- File map — core: `store.ts` commits audit, state, balanced ledger, projection and idempotency together; `payments.ts` gives each receipt one global owner/amount; `commerce.ts` persists seller review and bid access, validates submission clock, loads actual awards/prices/profiles, freezes return costs/tax/Wave facts at checkout, issues hash-only codes and commits wrong attempts, and atomically cancels eligible pools/orders; `recovery.ts` loads real orders/backups/remaining capacity, consumes funded deposit then reserve, invalidates old codes and retains exact funding provenance; `index.ts` maps money events, projects state, schedules close/pricing/accept/hold/settle/wave outbox entries, derives Wave pots from accepted orders, and charges penalties only from backed seller deposits; `workflows.ts` uses local DBOS durable clocks/sleeps/steps for those workflows; `worker.ts` prevents overlapping dispatch and confines IPC fixtures to explicit test mode. Generic reducers and receipt/funding inputs are trusted service functions, not an HTTP/auth boundary.
- File map — tests: `engine/test/award-safety.test.ts` deadline and safe-integer properties; `india-complete.test.ts` booking/replay/tax/checkout/default/helpers/abuse/limits/issue/cancellation/return; `default-recovery.test.ts` replacement principal, recomputed holds and independent pots; the original engine suites remain green. `core/test/run.ts` creates a fresh uniquely named real Docker PostgreSQL database, applies all migrations, then drops only that generated database. `integration.test.ts` receipt ownership/delay, generated balanced transfers, lifecycle, accepted-term tampering, schema/history constraints and isolated crash; `recovery.test.ts` full multi-seller lifecycle and crash, deposit/reserve insufficiency rollback and recovery, refund/compensation/capacity, cancelled/returned principal, default Wave penalty rollback, ops cancellation replay/rollback; `workflows.test.ts` durable timers and issue-resolution hold → settlement → Wave outbox progression; `worker-fixture.ts` centralizes child process readiness/kill/restart with redacted failure output. `pool/README.md` and blueprint updated, including stale fixed-cap/one-winner/savings-gate wording superseded by existing founder decisions.
- Verified original baseline before edits (not rerun against the changed code): `pnpm install` → `Lockfile passes supply-chain policies (85 entries in 7s)`, `Done in 7.4s using pnpm v12.8.1`; `pnpm test` → `Test Files 8 passed (8)`, `Tests 75 passed (75)`; `pnpm typecheck` → tsc exit 0 (30 Sep entry records it).
- Verified final behavior run, in pool/: `pnpm exec prettier --write` on changed engine/core files; `pnpm typecheck` → engine/db/core each `Done`, exit 0; `pnpm test` → engine **`Test Files 11 passed (11)` / `Tests 110 passed (110)`**, start 14:51:45, duration 17.45s; core **`Test Files 3 passed (3)` / `Tests 16 passed (16)`**, start 14:52:09, duration 78.00s; db `No test files found, exiting with code 0` (SQL is exercised by core). Aggregate exit 0: **126 tests / 14 test files**. Last changes after that run are source comments and documentation only. A preceding complete run also passed 107 engine + 16 core tests before the last three engine guard tests.
- Verified environment: `node --input-type=module -e` with synthetic config/assertions → **`Environment validation: 6 invalid configurations rejected; synthetic valid accepted`**, exit 0 (no real secrets read). `git diff --check -- pool/packages/core pool/packages/engine` → exit 0; upstream ULID's preserved line-3 trailing whitespace is unchanged. Engine search for I/O/current clocks/randomness found no prohibited calls. No mocked database.
- Verified Docker/migrations: full executable `%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin\docker.exe`, in pool/: `compose up -d` → `Container pool-postgres-1 Recreate`, `Recreated`, `Starting`, **`Started`**, exit 0; immediate ps initially showed health starting, follow-up **`pool-postgres-1 / pool-postgres / postgres / Up 23 seconds (healthy) / 127.0.0.1:55432->5432/tcp`**, exit 0. `pnpm --filter @pool/db migrate` → **`Migrations applied: 001, 002, 003, 004`**, exit 0. Recreate preserved the named volume. Fresh migration builds also pass in every core test run.
- Verified money/crash evidence: two sellers' accepted slabs yield independent buyer refunds **20** and **150+150 paise**, total pot **320 paise**, seller remainders **20+100 paise**. Test kills the worker after domain+ledger commit and before DBOS records the step, restarts the same workflow ID, and asserts the money-event count is unchanged. Final order held balances are zero and `sum(pgledger_entries.amount)` is exactly `0`. Recovery consumes actual backing; insufficient backing changes neither orders nor money postings. Returned/cancelled replacement principal goes back to original deposit/reserve sources. Additional fast-check properties prove pot/refund/held/penalty sums, booking refund/application, nested taxes, all payout components and terminal disposition; tests are evidence over generated inputs, not an exhaustive proof.
- Versions: no new package added in this continuation. Existing npm-view pins retained: fast-check 4.10.2, vitest 5.0.3, typescript 7.0.2, @types/node 26.6.3, drizzle-orm 0.45.3, pg 8.23.0, @types/pg 8.23.1, @dbos-inc/dbos-sdk 5.2.11, prettier 3.9.9. Earlier pin queries are recorded above/below. Additional `npm view @dbos-inc/dbos-sdk@5.2.11 gitHead repository.url` returned **3f36908f58fd8b3079cbf5372203c7a2d0ba06cc** and **git+https://github.com/dbos-inc/dbos-transact-ts.git**. Ledger remains pinned **5e2c1fe2ee7bf471ddca3097e1c1acbb17b562a6**. Dockerfile pins image digest and apt versions; no invented package/image version.
- Official sources used (engineering): https://node-postgres.com/features/transactions ; https://orm.drizzle.team/docs/get-started-postgresql ; https://orm.drizzle.team/docs/column-types/pg ; https://orm.drizzle.team/docs/select ; https://docs.dbos.dev/typescript/programming-guide ; https://raw.githubusercontent.com/dbos-inc/dbos-transact-ts/3f36908f58fd8b3079cbf5372203c7a2d0ba06cc/src/system_database.ts ; https://github.com/pgr0ss/pgledger/tree/5e2c1fe2ee7bf471ddca3097e1c1acbb17b562a6 ; https://github.com/pgr0ss/pgledger/tree/5e2c1fe2ee7bf471ddca3097e1c1acbb17b562a6/vendor/scoville-pgsql-ulid ; https://hub.docker.com/_/postgres ; https://apt.postgresql.org/ ; https://github.com/pgvector/pgvector ; https://github.com/postgis/postgis ; https://www.postgresql.org/docs/18/sql-createtable.html ; https://www.postgresql.org/docs/18/sql-createtrigger.html ; https://www.postgresql.org/docs/18/sql-altertable.html ; https://www.postgresql.org/docs/18/ddl-constraints.html ; https://www.postgresql.org/docs/18/ddl-identity-columns.html ; https://www.postgresql.org/docs/18/functions-admin.html#FUNCTIONS-ADVISORY-LOCKS ; https://www.postgresql.org/docs/18/functions-math.html ; https://www.postgresql.org/docs/18/functions-comparisons.html (ANY) ; https://raw.githubusercontent.com/postgres/postgres/REL_18_0/src/backend/access/hash/hashfunc.c (hashtextextended, line 302) ; https://www.postgresql.org/docs/18/sql-createdatabase.html ; https://www.postgresql.org/docs/18/sql-dropdatabase.html ; https://nodejs.org/api/crypto.html ; https://nodejs.org/api/intl.html ; https://nodejs.org/api/child_process.html ; https://nodejs.org/api/assert.html ; https://vitest.dev/config/fileparallelism ; https://prettier.io/docs/cli . Official current Node docs supplement the behavior actually tested on local Node 24.12; no runtime upgrade.
- Official sources used (India): movement-of-goods POS https://www.indiacode.nic.in/bitstream/123456789/5747/1/the_integrated_goods_and_services_tax_act%2C_2017.pdf ; TCS notifications ratification https://gstcouncil.gov.in/node/5511 ; TDS source https://www.incometaxindia.gov.in/documents/d/guest/income_tax_act_2025_as_amended_by_fa_act_2026-pdf ; commission-tax reference https://gst.karnataka.gov.in/Documents/General/gstserviceReadyReckner6102020.pdf ; state master https://docs.ewaybillgst.gov.in/apidocs/state-code.html ; no cash in PA escrow https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=12896 §17(b) ; bid-rigging context https://cci.gov.in/antitrust . Source access is not CA/legal approval.
- Open issues / UNVERIFIED: official GSTIN checksum algorithm (advisory only); POOL commission classification/current 18% applicability; TDS base/exemptions; non-movement/services POS; zero-rated versus exempt TCS applicability; invoice/credit-note treatment on returns and Wave Drop. Persisted zero-rate checkout now requires reviewed tax flags; pure legacy rate-only fallback is explicitly UNVERIFIED. Inherited E-Commerce Amendment Rules 2026 / 1 Jan 2027 claim is now labelled UNVERIFIED in the blueprint. Founder GUESS defaults remain provisional: 24h accept window, 60-minute minimum duration, anomaly threshold and sample profiles; an optional confirmation question was sent, no answer presumed.
- Open warning / operational limit: pg emits **`DeprecationWarning: Calling client.query() when the client is already executing a query is deprecated and will be removed in pg@9.0. Use async/await or an external async flow control mechanism instead.`** It is not hidden. The installed pinned DBOS source and official commit show a queued SET statement in its pool-connect hook (system_database.ts lines 1020–1027); standalone POOL SELECT did not emit the warning. Attribution to that hook is an **inference**, not proof that no other concurrent query exists. No vendor patch made. Earlier 30-second worker-readiness timeout was intermittent; current 60-second readiness and 180-second full crash-test bounds pass, root cause remains unproven. A Wave transaction blocked by an unfunded penalty requires ops to fund the deposit and rerun the trusted close command; automatic failed-workflow remediation/ops UI is not claimed.
- Next: **STOPPED before M3**, as ordered. No Razorpay calls, PA webhook verification, Route releases/refunds or payout reversals executed. External ledger counterpart postings are accounting instructions awaiting a verified M3 adapter. Do not present them as actual payment-provider movements. M3 needs a separate work order. For founder/CA review: confirm provisional policy defaults and reviewed supply/commission/TDS/credit-note treatment before live money; do not silently convert guesses into decisions.

Acceptance map for this checkpoint (engine modules are under pool/packages/engine/src, engine tests under pool/packages/engine/test, db/core paths under pool/packages; all listed tests passed in the counts above):

| Item | Implementation / evidence |
| --- | --- |
| A1 | engine/bids.ts; award-safety.test.ts Friday/Monday example + generated deadline assignments |
| A2 | booking.ts, pool.ts, checkout.ts; booking clamp/disposition/replay properties and delayed receipt regression; core receipt capture/refund atomically |
| A3 | checkout.ts/order.ts; both plans tested; handover refuses unpaid balance; UPI/card receipts, no cash |
| A4 | india-tax.ts/order.ts; intra/inter-state paisa examples and nested sum properties; tax treatment caveats above |
| A5 | pool.ts/pricing.ts; PRICING → published offers requires all prices; deadline refunds |
| A6 | seller-default.ts + core/recovery.ts; same buyer price, actual capacity/backing, fallback refund+compensation, exact terminal funding disposition |
| A7 | rebuildPool/rebuildOrder; journal snapshots/audit, generated booking/order replay plus persisted recovery replay |
| A8 | abuse.ts; shared payer/device, bursts, similar bids/rotation and low-bid positive/negative tests; no automatic punishment |
| A9 | india.ts; INR/IST/address/state/GSTIN tests; checksum authority explicitly UNVERIFIED |
| A10 | pool.ts/policy.ts; per-pool accept/minimum duration limits tested |
| B1 | Dockerfile.postgres/docker-compose.yml; healthy localhost-only PG18 + extensions/named volume; fresh migrations pass |
| B2 | db/schema.ts + migrations 001–004; required tables, INR currency, bigint amounts, immutable history; Drizzle query tests use real DB |
| B3 | pinned pgledger + core/store.ts/index.ts/recovery.ts; same-transaction balanced transfers/idempotency; trial balance exact zero |
| B4 | core/workflows.ts/worker.ts/outbox; chosen close, pricing/accept expiry, holds, settlement and derived Wave pots; restart/timer tests |
| B5 | core service functions; actual persisted commerce inputs, atomic state/audit/ledger/outbox, receipt ownership and rollback |
| B6 | 16 real Docker PostgreSQL/DBOS integration tests; full lifecycle, zero trial balance, replay, full two-seller worker kill/restart |
| B7 | ignored .env, .env.example + validateEnv; six invalid synthetic configurations fail, valid synthetic configuration passes |


### 2026-10-01 09:40 · Codex · M1.5/M2 verified checkpoint; acceptance audit remains open
- Did: committed engine formatting separately (9684e86), engine receipt/code/refund/default fixes (1acdce8), Docker/database/ledger (653b881), and transactional commands/workflows/tests (818f33c). NOT declaring Task A/B complete. No M3 integration or US additions.
- File map: engine/pool.ts enforces receipt identity, pricing assignments, atomic-cancel preconditions and buyer audit; order.ts tracks collected/released funds and reverses returns; codes.ts verifies UTC time; seller-default.ts recomputes backup commission and exposes added funding (durable command still missing); india-tax.ts explicit non-movement POS data; wave-drop.ts validates recipients/counts and computes slab intervals with BigInt. Node strip-only compatibility replaces parameter properties. Regression tests in india-complete.test.ts, pool.test.ts and wave-drop.test.ts.
- File map: Dockerfile.postgres + docker-compose.yml pin PG18 base/extension packages, localhost 55432 and named volume; db/src/env.ts validates secrets, index.ts connects pg/Drizzle, schema.ts declares tables; migrations/001_pool.sql creates POOL tables and pinned ledger constraints, 002 adds outbox/audit ordering, 003 enforces PA receipt uniqueness, 004 adapts upstream ledger storage to bigint and makes ledger/profile histories immutable. vendor/ preserves pgledger and ULID SQL/licenses. core/store.ts owns state/audit/ledger/idempotency transaction; payments.ts claims each PA receipt once globally; commerce.ts persists seller review, bids/access logs, team prices, immutable profiles, checkout, code attempts and ops cancellation; index.ts projects state, posts money, schedules timers and validates persisted wave outcomes; workflows.ts/worker.ts run local DBOS and an outbox. core/test/run.ts creates/drops only a unique real test database; integration.test.ts and workflows.test.ts cover lifecycle, receipts, rollback, generated ledger allocation, crash restart, durable timers and issue-resolution rescheduling. Generic reducers remain internal trusted primitives.
- Exact verified commands/output: original baseline 75 tests and tsc 0 passed before edits. Latest completed full run: pnpm typecheck -> packages/engine, packages/db, packages/core: Done, exit 0; pnpm test -> engine "Test Files 10 passed (10)", "Tests 102 passed (102)"; core "Test Files 2 passed (2)", "Tests 9 passed (9)"; db "No test files found, exiting with code 0" (SQL covered by core); aggregate command exit 0. Core uses fresh Docker PostgreSQL for each run. pnpm --filter @pool/db migrate -> "Migrations applied: 001, 002, 003, 004". Docker compose ps -> pool-postgres-1 / pool-postgres / postgres / "Up 14 hours (healthy)" / "127.0.0.1:55432->5432/tcp". git check-ignore pool/.env -> pool/.env. Diff check: upstream ULID file has preserved trailing whitespace on line 3; project-authored edits clean.
- Failures exposed then fixed: duplicate payment receipt across members/pools; invalid paidAt; weaker checklist/code policy; returning previously paid-out funds; stale hold timer after an issue resolves. Explicit failing regression outputs were observed before fixes. Latest timer test executes through outbox after issue resolution. A new delayed-receipt regression is being added after this checkpoint and is not included in the counts above.
- Data repair: earlier synthetic crash fixtures 5b811ec2-748d-44e3-b2eb-93908a178f18 and e689fd22-7c07-46ef-bcef-d35bb940f413 each posted an unfunded 10-paise wave refund; no persisted orders/payments existed for either. Migration 004 correctly refused their negative internal balances. Verified original chains, reversed exactly four original transfers with four compensating transfers and TEST_FIXTURE_REVERSED audit events, preserving all history. Output: "Reversed exactly 2 historical synthetic crash fixtures with 4 compensating transfers; original entries retained." / "Negative internal accounts: 0". Migration then passed. No real PA movement occurred.
- Versions verified via npm view: drizzle-orm 0.45.3, pg 8.23.0, @types/pg 8.23.1, @dbos-inc/dbos-sdk 5.2.11; existing fast-check 4.10.2, vitest 5.0.3, typescript 7.0.2, @types/node 26.6.3. prettier 3.9.9 was checked then installed exactly ("Done in 15s using pnpm v12.8.1"). DBOS install previously reported 110 supply-chain policy entries. pgledger commit 5e2c1fe2ee7bf471ddca3097e1c1acbb17b562a6. PG image digest and apt versions are in Dockerfile.postgres; apt-cache and docker pull were verified.
- Official engineering sources: https://github.com/pgr0ss/pgledger ; https://docs.dbos.dev/typescript/programming-guide ; installed DBOS 5.2.11 declarations verify retrieveWorkflow/startWorkflow/registerWorkflow/runStep/sleep/config (workflow-handles docs URL failed); https://node-postgres.com/features/transactions ; https://orm.drizzle.team/docs/get-started-postgresql ; https://orm.drizzle.team/docs/select ; https://orm.drizzle.team/docs/column-types/pg ; https://hub.docker.com/_/postgres ; https://apt.postgresql.org/ ; https://github.com/pgvector/pgvector ; https://github.com/postgis/docker-postgis ; https://www.postgresql.org/docs/18/sql-createtable.html ; https://www.postgresql.org/docs/18/sql-createtrigger.html ; https://www.postgresql.org/docs/18/functions-admin.html#FUNCTIONS-ADVISORY-LOCKS ; https://www.postgresql.org/docs/18/sql-altertable.html ; https://www.postgresql.org/docs/18/functions-math.html ; https://www.postgresql.org/docs/18/ddl-constraints.html ; https://www.postgresql.org/docs/18/sql-createdatabase.html ; https://www.postgresql.org/docs/18/sql-dropdatabase.html ; https://vitest.dev/config/fileparallelism ; https://prettier.io/docs/cli . Node crypto/Intl and India tax sources are in earlier entry and source comments. ULID helper origin/version needs an explicit provenance comment before final acceptance.
- UNVERIFIED: official GSTIN checksum algorithm; current commission GST classification; CA confirmation of TDS base/exemptions and non-movement POS. Tax URLs: https://gstcouncil.gov.in/node/5511 ; https://www.indiacode.nic.in/bitstream/123456789/5747/1/the_integrated_goods_and_services_tax_act%2C_2017.pdf ; https://www.incometaxindia.gov.in/documents/d/guest/income_tax_act_2025_as_amended_by_fa_act_2026-pdf ; https://gst.karnataka.gov.in/Documents/General/gstserviceReadyReckner6102020.pdf . Source access does not mean CA/legal approval. Existing policy GUESS values remain guesses.
- Remaining acceptance work: durable seller-default funding/recovery and terminal disposition of funding; delayed receipts; tax/address and disclosed return-cost binding; Drizzle nullability/FKs/checks alignment; strengthen multi-order/multi-seller crash coverage. DBOS/pg emits a query-concurrency deprecation warning (not hidden; origin needs tracing). No claim that 111 passing tests prove the entire core correct.
- Founder question (pending): with split seller awards and different slabs, separate seller pots or one shared pool-wide Wave Drop pot? Current documents do not decide who subsidizes whom. Do not invent this rule. Next: finish independent audit fixes, resolve this decision, rerun acceptance checks; stop before M3. Code checkpoint is committed; README/blueprint/handoff updates and any later regression changes must be committed separately.

### 2026-10-01 00:40 · Codex · M1.5/M2 adversarial review IN PROGRESS
- Status: NOT declaring M1.5/M2 complete. Founder requested a deeper audit after superficial green-test confidence. Latest completed full run before new regression tests: engine 10 files / 97 tests; core 2 files / 7 real PostgreSQL/DBOS tests; all three package typechecks exit 0. Original required 75-test baseline passed before edits (see earlier entry).
- Confirmed defects now reproduced: one PA receipt can commit multiple members; replay with a different receipt is silently accepted; NaN/old paidAt values pass booking validation. Two new regression tests currently FAIL, intentionally, before repair.
- Review queue: cross-pool receipt uniqueness and payment persistence; checkout must bind to persisted offer/profile/tax facts; award/ranking and prices must load persisted records; seller-default funding/commission/replay/cancellation; wave inputs must match persisted orders and sellers; pgledger upstream numeric versus required bigint; outbox restart and timer deferral edge cases; schema constraints; real crash-path coverage and clean migration rebuild.
- Already revised since last checkpoint: exact collected-money refunds, reversal on return, wrong-code attempts persist, wave checks persisted outcomes/holds, default splits expose additional seller funding and recompute commission, DBOS files serialized in tests. These changes and all M2 work are currently UNCOMMITTED and require review before acceptance.
- Open: GSTIN checksum official source, CA-reviewed TDS base/exemptions and commission classification, founder GUESS policy defaults. M3 has not started. No secrets printed or committed.

### 2026-09-30 19:20 · Codex · M1.5 rework checkpoint (M2 still pending)
- Did: independently reviewed inherited M1 after the founder requested deep rework. Found stale extension consent, unchecked deadlines, incomplete booking/refund amounts, code proof bypass, missing replay data, and hold releases after returns. Implemented deadline-aware awards, BigInt intermediates, booking rules/receipt validation, PRICING/published offers, exact booking application/refunds, India tax context/helpers, checkout balance gating, seller default planning, abuse signals, and snapshot-backed replay. Changed old fixtures only to supply mandatory founder-required payment, pricing, tax and real-code inputs. Exempt goods TCS expectation corrected; US fixture still runs.
- Verified baseline: `pnpm install` → “Lockfile passes supply-chain policies (85 entries in 7s)”, “Done in 7.4s using pnpm v12.8.1”; `pnpm test` → “Test Files 8 passed (8)”, “Tests 75 passed (75)”; `pnpm typecheck` → tsc exit 0. First rework commit 2dcffa7: 9 files / 78 tests, tsc exit 0. Subsequent check: 10 files / 91 tests, tsc exit 0; newer checks recorded at next checkpoint.
- Sources: npm view returned fast-check 4.10.2, vitest 5.0.3, typescript 7.0.2, @types/node 26.6.3 (existing pins unchanged). New dependency queries returned drizzle-orm 0.45.3, pg 8.23.0, @types/pg 8.23.1, @dbos-inc/dbos-sdk 5.2.11 (not yet installed). Tax/source URLs are in india-tax.ts; state master https://docs.ewaybillgst.gov.in/apidocs/state-code.html; Intl https://nodejs.org/api/intl.html; crypto https://nodejs.org/api/crypto.html; cash restriction https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=12896 section 17(b); Competition Act explanation https://cci.gov.in/antitrust.
- Next: finish edge-case review and verification, then M2 Docker/database/ledger/workflows and real integration/crash tests; stop before M3.
- Open issues / blockers: UNVERIFIED GSTIN checksum specification (advisory check only), CA confirmation of TDS base/exemptions and current commission classification, non-movement/services POS needs explicit tax treatment, historical GUESS policy defaults remain unconfirmed. Delegated workers stopped on usage limits; root continued alone. No secrets printed. No M3 work.

### 2026-09-30 · Claude Code · handoff to Codex
- **Did:**
  - Founder decision: **India first**, US parked (recorded in §4 and AGENTS.md).
  - Gap review of M1 for India. It found: needBy ignored in award, no booking amounts, no pay-at-door plan, GST not split CGST/SGST vs IGST, no pricing stage, seller default not executed, no event replay, no abuse detectors.
  - Wrote the work order **`CODEX_PROMPT.md`**: Task A = M1.5 India-complete engine (A1–A10), Task B = M2 database + pgledger + DBOS workflows (B1–B7). It stops before M3.
- **Verified:** tool URLs in the prompt come from `research/08_hidden_gems.md` (pgledger github.com/pgr0ss/pgledger, DBOS github.com/dbos-inc/dbos-transact-ts), and every research reference in the prompt was grep-checked to exist in the named file.
- **Next:** Codex runs `CODEX_PROMPT.md`.
- **Open:** as in the previous entry (GUESS numbers, Press Note 2 review, test keys in `pool/.env`).

### 2026-09-30 · Claude Code · M1 REBUILT — universal engine + team pricing
- **Founder corrections (30 Sep):**
  1. There is **no fixed POOL fee**. The seller bids its own price, and the POOL team decides the buyer price per pool.
  2. POOL is for **any product**. The first engine was wrongly built around the examples we discussed (TV, meat, laptop, installation, 18% GST, a 5 kg cap).
  3. Most buyers take 1 kg of meat, not 5 kg.
- **Did:** rebuilt `pool/packages/engine` with no product-specific logic.
  - **New modules:**
    - `uom.ts`: any unit of measure as data; per-pool quantity rules with min, step and optional caps.
    - `terms.ts`: bid terms and requirements as key/value data.
    - `fulfilment.ts`: fulfilment profiles as data — ordered steps with proof, handover checklist, code length, holds, return window, late credit.
    - `pricing.ts`: team price decisions, margin, offers, honest comparison as info only.
    - `presets.ts`: example data only.
  - **Rewritten modules:**
    - `policy.ts`: region rules only.
    - `bids.ts`: seller price, modes, terms.
    - `pool.ts`: categoryPath, quantityRule, profile id, wave count mode.
    - `order.ts`: profile-driven steps; the split is buyer = margin + TCS + TDS + holds + wave hold + release.
    - `codes.ts`: digits and checklist from the profile.
  - Removed `quantity.ts` and the fixed rate card.
- **Verified:**
  - `npx vitest run` → **8 files, 75 tests passed**. `npx tsc --noEmit` → **exit 0**.
  - The end-to-end scenario runs the same code for a TV (India, installation, 18% GST, seller ₹40,000 → team ₹43,000), meat (India, 1 kg each, store pickup, 0% GST) and a US product, and every minor unit is conserved in each.
  - The split reproduces the v2.2 bridge numbers (GST in margin ₹457.63, TCS ₹182.20, TDS ₹43).
  - A property test covers any price, any GST slab and any holds.
  - A grep of `src/` finds product words only in comments and example data.
- **Next:** M2 — Postgres in Docker, Drizzle schema (products, pools, bids, price decisions, orders, fulfilment profiles as tables), pgledger, DBOS workflows, integration tests.
- **Open:**
  - The founder should confirm the remaining GUESS numbers: 24 h accept window, 60-minute minimum pool, 15% anomaly flag, example profiles.
  - A lawyer must review team-set pricing vs FDI Press Note 2 before US investment closes.
  - Test keys go in `pool/.env`.

### 2026-09-30 · Claude Code · M1 DONE (engine)
- **Did:** built `pool/packages/engine`, a pure TypeScript core with no I/O. Modules:
  - `money`: integer paise/cents, exact `allocate`.
  - `quantity`: unit or kg-as-grams.
  - `policy`: India/US numbers, with GUESSes marked.
  - `pool`: buyer-chosen close, household and payer caps, extension only with every member's opt-in, NO_DEAL, default B timeout.
  - `bids`: default C lower-only, anomaly flag, published ranking, default A capacity split, listing rule.
  - `order`: split, proof-gated lifecycle, late credit, install hold, Rule 4 cancellation symmetry, seller default gap.
  - `wave-drop`: slab pot.
  - `codes`: HMAC-hashed 4/6-digit codes, attempts, expiry, open-box gate.
  - `slots`: pickup slots.
- Added the 16-point engine completeness checklist and defaults A/B/C to `POOL_BLUEPRINT.md` §1 (12a).
- **Verified:** `npx vitest run` → **7 files, 71 tests passed**; `npx tsc --noEmit` → **exit code 0**. The tests reproduce the Wave Drop table (10/25/34/49/50/100) and the TV ₹28,400 split to the paisa, and prove:
  - `allocate` sums exactly (property test);
  - the order split sums exactly (property test);
  - Wave Drop refunds equal the pot, and held money balances (property test);
  - an extra settled unit never lowers seller profit (property test);
  - an end-to-end 30-buyer / 2-seller pool conserves every paisa.
- **Bug found by the tests and fixed:** a seller penalty with zero settled buyers left money unassigned. The penalty now applies only when settled buyers exist.
- **Next:** M2 — Postgres in Docker (pgvector + PostGIS), Drizzle schema, pgledger, DBOS workflows (pool close timer, payout hold until code, Wave Drop at close), integration tests.
- **Open:**
  - The founder should confirm defaults A/B/C and the GUESS numbers in `policy.ts` (fee 5%/3%, US minimum saving $20/2%, 5 kg cap, 24 h accept window, 7-day settle window, late credit ₹200/$5).
  - The founder puts test keys in `pool/.env`.

### 2026-09-30 · Claude Code · M1 starting
- **Did:**
  - Hidden-gems research: `research/08_hidden_gems.md`.
  - Wrote `POOL_BLUEPRINT.md`, the one build document.
  - Created `AGENTS.md` as the shared rules for Claude Code and Codex. `CLAUDE.md` now imports it.
  - Made the whole `idea/` folder ONE git repo (branch `main`, first commit 6be521a). Verified in OpenAI docs: Codex does not read AGENTS.md above the git root, so a separate `pool/` repo would have hidden the rules from Codex. The first time Claude Code sees the `@AGENTS.md` import it asks for approval once (Claude Code memory docs).
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
| 1 Oct 2026 | **Separate Wave Drop pot per seller.** For pools fulfilled by multiple sellers with different slabs, each seller's pot is shared only among that seller's settled buyers (founder response in Codex). |
| 30 Sep 2026 | **India first.** Everything now is built for India. The US is parked. The founder moves day-to-day building to **Codex** (Claude's usage limit keeps interrupting). The work order is in `CODEX_PROMPT.md`. |
| 30 Sep 2026 | **No fixed POOL fee.** The seller bids its own price, and the POOL team decides the buyer price per pool (e.g. seller ₹40,000 → buyer ₹43,000 for a TV the market sells at ₹45,000). |
| 30 Sep 2026 | **POOL is universal: any product.** No product-specific logic in the code. Units, quantities, caps, taxes, terms and fulfilment steps are data per pool. Typical meat purchase is 1 kg; there is no assumed cap. |
| 30 Sep 2026 | GST turnover above ₹40 lakh; Docker, GitHub and accounts (Anthropic, Razorpay, Stripe, Meta, Twilio) ready. |
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

## 7. Next steps (current, 1 Oct 2026)

1. M1/M1.5 and M2 implementation is verified at the top §0 checkpoint. **Stop before M3** under CODEX_PROMPT.md; a new payments work order is required to start it.
2. Founder/CA review the open tax treatment and provisional policy numbers listed below. Preserve UNVERIFIED/GUESS labels until actual confirmation is recorded.
3. The next authorized milestone would be India Razorpay test-mode receipt verification, Orders, Route holds/releases/refunds and webhook handling. Ledger counterpart entries at M2 are not payment-provider execution.
4. Later blueprint milestones cover product identification, buyer/seller/ops UI, notifications and India deployment. US stays parked. Accounts/credentials remain founder-managed; agents do not create accounts or enter passwords.

---

## 8. Open questions for the founder

1. Confirm or retain as provisional: 24-hour acceptance, 60-minute minimum pool duration, and the 15% below-median review flag. Optional question sent; no answer presumed.
2. Obtain CA-reviewed commission classification/rate, TDS base/exemptions, supply-specific POS/TCS applicability and return/Wave credit-note treatment. GSTIN checksum authority remains UNVERIFIED.
3. Top builder projects with realistic handover months, dealer/brand contacts, and ownership of buyer support and finance/compliance.
4. Investor meeting dates — these set the remaining prototype deadline.

Already resolved: budget above ₹50 lakh, team size, GST turnover above ₹40 lakh, no fixed fee, India first, universal product data and separate seller Wave Drop pots. Historical proposed fee rate cards in §4 are superseded by the founder's 30 Sep no-fixed-fee decision; do not reintroduce them.

---

## 9. Working rules for anyone (human or AI) continuing this work

- **No hallucination.** Verify facts at the source and arithmetic with scripts. Label guesses as "guess — check".
- **Think like a founder, write in plain language.** Keep the founder's idea at the centre; improve it rather than replace it.
- **Keep one source of truth.** Don't create new document sprawl. Update this file and the one blueprint.
- **The prototype must be real.** Money moves through test-mode flows, and messages, bids and AI calls are real. No fake dashboards.
- **UI quality is a hard requirement.**
- **Honest marketing only.** No fake urgency, counters or hidden fees (India's CCPA dark-pattern rules, US FTC).
