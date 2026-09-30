# DRAFT — POOL business mechanism: understanding + attack (for adversarial review)

Sources used: founder's brief (29 Sep 2026); POOL_MASTER_SPEC.md v1.1 (§1 Mechanisms A/B, §4.1, §16–18 POOLBACK, §20 red-team cases); POOL_FINAL_BLUEPRINT.md v2.2; research file wf1_research.txt (web research, 29 Sep 2026). Labels: [FILE] = in founder's files; [RESEARCH] = web research with source; [ANALYSIS] = my reasoning; UNKNOWN — MUST BE VALIDATED = needs real merchant/buyer evidence.

## Part 1 — What I understand POOL to be

1. **The business.** A buyer-side request-for-quote marketplace for considered, identifiable purchases. A buyer declares genuine intent for a specific product; POOL (a) shows the honest set of real alternatives and (b) runs a private, sealed competition among verified merchants for that intent — alone or grouped with compatible intent — and then runs the buyer-facing transaction (acceptance, payment routing, status, issues, evidence). If it works, the defensible asset is **verified, committed purchase intent in dense clusters + a record of which merchants keep their promises**. It is not a retailer, not a logistics company, not a payments company.

2. **Actors.** Buyer; merchant (authorised dealer, large-format chain, brand store, possibly online seller); **brand/manufacturer** (sets MOP, funds schemes and volume incentives, runs installation and warranty — a hidden but decisive actor); POOL; licensed payment aggregator (holds/splits money); delivery/installation providers (merchant staff, 3PL, brand service network); external benchmarks (Amazon, Flipkart, Croma… — both competitors and price references); regulators and courts (CCPA/consumer commissions, GST, RBI, CCI); channel partners (communities, builders, employers — in the files); and bad actors (fake buyers, resellers, colluding merchants).

3. **Buyer value.** (i) Less searching (weak, commoditised). (ii) A better price — either *discovered* (A) or *created by aggregation* (B). (iii) A true landed-price comparison (delivery, installation, extras, warranty, returns). (iv) No haggling and no sales calls. (v) A guaranteed price that never rises. (vi) Possibly a later volume benefit. (vii) Protection: one accountable desk and, if payments go through a licensed aggregator with a hold, money that reaches the merchant only after delivery. (viii) Freedom: never forced to buy.

4. **Merchant value.** Buyers who already intend to buy (lower acquisition cost than ads/marketplace fees); pay only on success; sealed pricing (can discount privately without a public MOP breach); prepaid money instead of cash haggling; possibly volume that helps hit brand targets; possibly batched delivery if buyers are clustered. Costs: lower price, POOL's fee, quoting effort that often loses, payout delay, service obligations, possible rebate liability.

5. **Where POOL sits.** Between intent and purchase, then alongside fulfilment: before (identify product, qualify intent, compare), during (sealed bids, acceptance, payment routing), after (status, issues, settlement evidence, any rebate calculation). Legally it will be a **marketplace e-commerce entity** under the Consumer Protection (E-Commerce) Rules 2020, with duties (grievance officer, seller disclosures, ranking disclosure) [RESEARCH], and consumer commissions have held marketplaces jointly liable despite a "mere intermediary" defence (Flipkart + Thomson TV, South Mumbai District Commission, June 2025) [RESEARCH].

6. **How it could earn** (undecided in the brief): (a) merchant-paid success fee per settled order (fixed ₹ or %); (b) POOL adds a margin on the merchant's price (₹27,500 → ₹27,900); (c) a separately shown buyer fee; (d) affiliate commission when the buyer chooses Amazon/Flipkart (Amazon.in pays 3.5% on TVs/large appliances [RESEARCH], but Amazon can revoke an affiliate ID — Buyhatke's was blocked [RESEARCH]); later (e) brand-funded programmes, B2B procurement fees, regulated financing/warranty referrals. [FILE] The blueprint v2.2 chose (b)-as-commission: the dealer invoices the buyer at the community price and POOL invoices the dealer the difference with 18% GST.

7. **Not a price-comparison site because** comparison sites only show existing public prices and earn on redirects; POOL creates a *new private price* by making merchants compete for identified intent — including offline dealers who publish no prices — and takes responsibility for the transaction flow. Honest caveat: the comparison part itself is not different and is commoditised (91mobiles, Buyhatke, PriceHistory; Google began testing Flipkart checkout inside Gemini/AI Mode on 26 Sep 2026) [RESEARCH].

8. **Not Amazon/Flipkart because** they sell anonymous shoppers a public price set by sellers and own checkout, logistics and returns at national scale; POOL runs private competitions per demand, includes offline dealers, owns no logistics, and claims to be neutral (shows Amazon when Amazon is better). Note: Amazon/Flipkart are themselves India's biggest "pools" — their festive prices are brand-funded against national volume.

9. **Not ordinary group buying because** there is no minimum group to buy; the buyer's price stands at quantity one; nobody recruits friends; any volume benefit is extra and paid only on settled purchases; merchants compete in a reverse auction instead of one merchant posting a deal.

10. **What must be true** (each UNKNOWN — MUST BE VALIDATED unless noted):
   - T1 Headroom: private merchant offers beat the buyer's *effective* best price (after bank offers, exchange, EMI, installation extras) by enough to matter.
   - T2 Mechanism A: showing aggregated demand improves the merchant's quantity-one guaranteed offer vs. the same merchant quoting one isolated buyer.
   - T3 Mechanism B: realised volume at one merchant creates extra merchant economics the merchant will share.
   - T4 Density: enough buyers want compatible products in the same place and window.
   - T5 Trust: buyers accept an unfamiliar merchant through POOL for the saving on offer, and accept the wait.
   - T6 Enforcement: merchants deliver and honour terms, and POOL has leverage (money control) to make them.
   - T7 Brand tolerance: brands do not punish dealers for sub-MOP private prices (legal cover exists — CCI penalised Maruti ₹200 cr in 2021 for a discount-control policy [RESEARCH] — but informal pressure via schemes/stock is common [RESEARCH]).
   - T8 Economics: POOL's revenue per settled order exceeds the cost to acquire and serve it.
   - T9 Identity: the product can be matched reliably (partly KNOWN to be hard: brands make channel-specific TV models, e.g. Samsung DUE76 on Flipkart vs DUE77 on Amazon [RESEARCH]).
   - T10 Rails: a licensed aggregator will run marketplace split settlement with a delivery-linked hold for POOL's dealers (the 2025 RBI PA Directions allow settlement timelines set by agreement [RESEARCH]; a specific PA's acceptance is UNKNOWN).

## Part 2 — Attack

### 1. Does aggregated demand really change merchant pricing?
- [ANALYSIS] For a dealer, the 50th TV costs the same as the 1st unless it crosses a brand volume slab or scheme. What truly moves with volume: brand volume incentives (trade-source figure 1–3%, low-quality source [FILE/RESEARCH]), selling effort (mostly fixed staff/rent — not a marginal saving), batched delivery (only if buyers are clustered — a national pool gets none), inventory clearance, cash flow.
- [ANALYSIS] "50 interested buyers" is not volume; it is a probability of volume. A rational merchant prices each buyer at its single-buyer competitive price and treats volume as upside. So most of what looks like Mechanism A is really **competition** (source A), not aggregation (source B).
- [RESEARCH] Margins bound the answer: listed electronics retailers run ~14–16% gross and ~7% EBITDA (Electronics Mart FY25: 14.6% / 6.9%); advisory estimates put dealer front margin at 8–15% (low-quality source). Research estimate: a local dealer can fund only ~2–5% off MOP on a ₹30k TV from its own margin.
- [RESEARCH] Where group pricing demonstrably exists in India, it is **brand-funded for verified closed groups**: LG Corporate Employee Store 5–10% with unit caps and a no-resale clause; Samsung's corporate programmes; GeM tenders need tender-specific OEM authorisation. Implication: the actor whose price aggregated demand can move is the **brand** (regional sales/B2B desk), not the local dealer.
- [RESEARCH] History: Mercata and MobShop failed partly because big retailers were cheaper anyway; CityMall's founders: "no two people will ever ask for the same product at the same time".
- Verdict: UNKNOWN — MUST BE VALIDATED. Plausibly real only (a) for committed, concentrated demand, (b) with brand money, (c) off-season or in installation-heavy categories (ACs). Test: same merchant, same product, same week — price for 1 buyer vs. N *interested* vs. N *committed (money blocked)* vs. N same-brand mixed models (the blueprint's four-price test, §5.8).

### 2. Merchant incentives
- **Gimmick tiers.** Best merchant strategy: guaranteed price near normal, plus generous rebate tiers at volumes it expects never to reach. Cheap marketing, misleading to buyers, and POOL cannot rank offers that mix a certain price with an uncertain rebate. [ANALYSIS]
- **Perverse incentive (your files' §18.7 blocker).** The merchant funds the rebate, so fewer settled orders = less liability. It can lower the count by slow delivery, "out of stock", poor installation → cancellations/returns. [FILE]
- **Tier cliff.** With whole-cohort tiers, at 49 settled units the 50th order triggers extra rebate on all 50 units — the merchant gains by refusing or delaying exactly that order. [ANALYSIS]
- **Won't pay (your files' §18.8 blocker).** A deferred merchant-funded rebate is unsecured merchant credit risk. [FILE]
- **Quoting fatigue.** Losing sealed rounds repeatedly makes merchants stop quoting. [ANALYSIS]
- **Bypass.** After the first sale the merchant knows the buyer; within a community it becomes "the" dealer. [FILE §19 Q21]
- **Collusion.** Few authorised dealers per brand per city → easy bid rotation; bid rigging is presumed anti-competitive (Competition Act s.3(3)(d)); after the 2023 amendment a facilitating platform can be presumed part of a cartel. [RESEARCH]

### 3. Delivery / fulfilment responsibility — is "POOL as control layer" realistic?
- In POOL's favour [RESEARCH]: Amazon and Flipkart do **not** offer change-of-mind returns on TVs; the remedy is service-centre replacement/repair verified by a technician or brand DOA certificate; installation and warranty are done by the **brand** whichever authorised seller sold it. So the after-sales core can be copied: merchant delivers + brand installs + DOA replacement contract.
- Against: (a) speed — Amazon offers scheduled delivery+installation in 220+ cities and Flipkart promises next-day plus same-day installation in top cities; POOL = pool window + dealer delivery = 2–5 days. (b) status truth — a local dealer's "dispatched" is not a tracking feed; POOL needs proof events (delivery OTP, serial photo, brand installation job sheet). (c) liability — commissions hold marketplaces jointly liable, so POOL must be able to refund first. (d) national pools break local fulfilment (intercity freight for a 55" TV probably ₹1,300–2,600 — estimate).
- The decisive design point: **who receives the money.** If the buyer pays the merchant directly (master spec §4 design), POOL has no leverage — trust is weak. If the buyer pays through a licensed aggregator's marketplace split with a delivery-linked hold (blueprint v2.2 design), POOL can enforce refunds — but dealers wait for money (research: dealers expect upfront/COD). Your brief says "the merchant receives the purchase payment" — this must become "via the aggregator, after delivery", or the control layer is only a promise.

### 4. Buyer trust
- Prepaying ₹28,800 to an unknown dealer via an unknown platform is a big ask. Mitigations exist (licensed aggregator holds money; authorised dealer's own GST invoice; brand warranty; community/employer endorsement), but the switching threshold is UNKNOWN — MUST BE VALIDATED.
- "Cheaper" must be the buyer's *personal effective* price. 2026 reality [RESEARCH]: Flipkart BBD (9 Oct) runs 10% instant bank discounts; exchange can be worth up to ~15%; Flipkart expects about a third of electronics GMV via EMI. A POOL price ₹1,100 below list can be *more expensive* for a buyer holding the right card.
- A conditional, deferred rebate reads like bait unless shown as "₹0 guaranteed extra; possible ₹X paid by merchant Y if N units settle".
- Channel-specific SKUs: offering an "equivalent" model where the pasted one is online-only damages trust.

### 5. Cancellation / return abuse
- Your mechanism fixes the *price* leak: 49 cancellations → 1 settled unit → no tier. [FILE §18.6 reaches the same result]
- It does **not** fix the *cost* leak: failed deliveries, return transport for TVs, reserved stock. Merchants will price expected cancellation cost into the guaranteed offer.
- Legal limits: cancellation charges on consumers are allowed only if the platform bears similar charges when it cancels (E-Commerce Rules 2020, Rule 4); disproportionate penalties can be unfair contract terms (CPA 2019 s.2(46)) [RESEARCH]. India has no statutory change-of-mind right for goods; sellers must refund defective/not-as-described/late goods (Rule 6). So post-delivery "49 returns" are mostly impossible for change-of-mind; fake defect claims are gated by the brand DOA process.
- "Settled" needs a precise definition: delivered + installed + DOA/replacement window closed + no open dispute. Card chargebacks can arrive later — small residual risk.

### 6. Fake buyers
- Under your mechanism, fakes cannot move a tier without actually buying and keeping the product (at which point they are real buyers).
- **The hole is Mechanism A itself** [ANALYSIS]: the guaranteed price is by design independent of settlement, so if showing "50 interested" lowers the guaranteed offer, a fraudster can manufacture that effect with fake *interest*. The merchant isn't cheated on that one sale (it promised the price was acceptable at quantity one), but it learns POOL's demand numbers don't convert and stops improving offers → the signal decays for everyone. Fake demand attacks the **credibility of POOL's demand signal**, not individual deals.
- Fix: never show merchants raw interest — show committed demand (refundable booking or money block, one per payer account/address) plus POOL's measured historical conversion rate.
- Signal strength [RESEARCH]: payer bank account/card > delivery address > PAN > device > phone OTP. UPI Reserve Pay is capped at ₹10,000 (NPCI circular), so it can't block a TV's value; a UPI one-time mandate can reportedly block up to ~₹1 lakh for up to 60 days (PA documentation, not an NPCI circular — UNKNOWN for POOL's merchant category).

### 7. Merchant/buyer collusion
- Merchant + fake buyers: only pays if POOL pays anything per order (referral cash, POOL-funded incentives) or if ranking uses volume/ratings. Precedent: a Meesho seller + agent ran ~2,500 fake orders/month and took ₹5.5 crore via returns (reported Dec 2024) [RESEARCH]. Rule: no per-order payouts before settlement; ratings only from verified settled orders.
- Merchant + real buyer bypass: split POOL's fee off-platform [FILE §19 Q21].
- Buyer "price shopping": take the private pool price to another shop to haggle [FILE §19 Q27].
- Reseller: one person funding many units to resell — not a price fraud (merchant sold at its chosen price) but brand no-resale policies (LG's corporate store bans resale) and dealer channel conflict → per-payer/address caps; route bulk buyers to a separate B2B pool [RESEARCH].

### 8. The guaranteed-price + settled-volume mechanism — verdict
Strong: it removes the price payoff of fake joins and mass cancellation, and it keeps the buyer free. [FILE §18.6 agrees]
Weak — five problems it does not solve [FILE §18.7/18.8/§4.1 + ANALYSIS]:
1. **Perverse delay incentive** (merchant lowers its own liability) — needs merchant-caused failures to count as settled, which needs adjudication.
2. **Counterparty risk** — needs the maximum rebate held back from each order's payout by the aggregator until assessment (then paid to the buyer as a partial refund to the original method, or released to the merchant). Legally plausible under agreement-based settlement; UNKNOWN until a PA and a lawyer confirm.
3. **Concentration tension** — sealed competition splits buyers across merchants, so each merchant's settled cohort is small and tiers rarely trigger. Solving it requires awarding a pool to one merchant (a tender), which reduces choice.
4. **Tier cliffs** — use marginal per-unit schedules, not whole-cohort jumps.
5. **Delay value** — a ₹300–1,000 rebate after ~30–45 days may be worth little to buyers (§18.9 hypothesis, UNKNOWN), while it costs the merchant full value — an inefficient transfer. And an unasked question: if the merchant would pay ₹1,000 at 50 settled units, why not bid ₹1,000 lower up front? Only because volume is uncertain — the rebate is a hedge against the very uncertainty POOL is supposed to remove.
[ANALYSIS] There are exactly four ways to pass volume economics to buyers without creating a fraud payoff: (a) an upfront price that must be safe at quantity one (volume enters only through competition); (b) a contingent rebate on settled volume (your brief); (c) prospective step-downs for later buyers once a threshold is actually delivered; (d) all-or-nothing activation where money is blocked and the deal activates only if N committed buyers exist (Groupon "tipping point" / IPO ASBA style). Each has a different trust, complexity and abuse profile. [FILE] The blueprint v2.2 uses (c) but gives step-downs to POOL's margin, not to buyers — which contradicts your brief's promise that aggregation gives buyers negotiating power.

### 9. Why buyers still choose Amazon when POOL is cheaper
Speed (next-day + installation); habit and one-click checkout; trust in the platform's refund process (even though TV change-of-mind returns aren't offered there either); personal effective price (bank card offers, Amazon Pay rewards, exchange, no-cost EMI); payment flexibility; fear of an unknown dealer (grey stock, warranty); the pasted model may be online-only; saving too small for the friction; a deferred rebate counts for little; waiting for festive sales; reviews and ratings on the listing. Size of this "trust premium": UNKNOWN — MUST BE VALIDATED (your master spec §20.4 already has the refusal code for it).

### 10. Attacks you did not list
- **Density** is the precondition for B, and it is missing in open national pools (SKU fragmentation + channel-specific models).
- **Timing**: October–November festive pricing is the hardest benchmark; the 2026 price hikes (research: 5–10% on ACs from ~1 Oct 2026) create a window where dealers hold old-price stock.
- **Legal shape of the margin**: POOL adding ₹400 on top of a dealer's ₹27,500 is lawful only if documented (dealer invoices ₹27,900 and POOL invoices the dealer a ₹400 commission with GST, or dealer invoices ₹27,500 and POOL invoices the buyer a ₹400 fee). A hidden markup with no invoice breaks GST and misleads consumers; a POOL-set markup can count as "influencing the sale price" under FDI Press Note 2 (2018) once foreign money comes in [RESEARCH].
- **Conflict of interest**: if POOL earns a % of price or keeps a markup, it earns more when prices are higher, and more when its merchant wins instead of Amazon. A fixed ₹ fee per settled order is the most price-neutral; affiliate income when the external option wins reduces the steering incentive.
- **Operating cost per order** (manual verification, quote collection, coordination) versus a ₹400–₹3,000 fee.
- **Big platforms** moving into AI shopping (Gemini + Flipkart checkout).

## Part 3 — Where your files already are
- Master spec v1.1 = this exact thesis (A and B), with POOLBACK fully specified but OFF and blocked by §18.7 and §18.8.
- Blueprint v2.2 = narrowed to Hyderabad new-community possession waves, fixed community price, lots awarded to one dealer, aggregator checkout with delivery-linked hold, POOL commission 5–7.5% of dealer net, step-downs to POOL, POOLBACK parked, link-paste kept only as an SKU-resolver input.
- Your new brief reopens: national link-paste habit, buyer rebate, margin model undecided.

## Part 4 — Plan for the final (not an app design, not a roadmap)
1. Fix the definitions first: interest ≠ commitment ≠ order ≠ payment ≠ delivery ≠ settlement.
2. Decide the mechanism by evidence, via six field tests in Hyderabad before building anything: (i) four-price test incl. committed-vs-interested; (ii) brand B2B/project desk test; (iii) buyer effective-price test (card/exchange/EMI) off-season vs festive; (iv) aggregator test (split + hold + OTM block in writing); (v) buyer switching/trust test with real offers; (vi) merchant rebate willingness + buyer delay-value test.
3. Launch mechanism only where density is natural (closed groups — new communities via builder contacts; employer groups), keep the public link-paste tool as the habit and demand map.
4. Money model: decide between disclosed merchant commission and visible buyer fee on evidence; never an undocumented markup.
5. Then write v3.0 of the blueprint.
