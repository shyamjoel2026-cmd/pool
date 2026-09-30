# POOL — Final Blueprint

**Before you buy it, POOL it.**

> **Update, 29 Sep 2026:** `POOL_WORKING_MODEL_v3.md` now replaces this blueprint's business model, pricing, payment, trust, growth, budget and scale sections (§2–3, the pricing and payment rules in §7–8, §9, §12, §20). Use this file only for operating detail that does not conflict with v3. The untouched v2.2 is kept as `POOL_FINAL_BLUEPRINT_v2.2_backup.md`.

| | |
| --- | --- |
| Version | **2.2 — FINAL.** Replaces `POOL_MASTER_SPEC.md` (v1.1), `POOL_FOUNDER_DECISION_WORKBOOK.md`, `POOL_FINAL_EXECUTION_PLAN.md` (EXEC-1.0) and `POOL_G2_G3_READINESS_CHECKLIST.md`. Where anything in those four files conflicts with this one, this one wins. The four originals are untouched. Version 2.1 is kept as `POOL_FINAL_BLUEPRINT_v2.1_backup.md`. |
| What changed in 2.2 | **1. POOL is a bridge, never a seller** (founder, 29 Sep 2026). The dealer sells; the buyer pays one price; POOL keeps the difference. **2. Mixed demand is solved:** what happens when residents want different models or brands (§5). **3. The hard questions** a founder must answer are raised and decided (§19). **4. Every line of v2.1 was re-read and checked;** each fix is logged in §22. |
| Date | 28–29 September 2026 |
| Decision owner | Founder. The decisions below were made under the founder's delegation. |
| Status | **GO.** Week 0 set-up starts now. Field research starts **Monday 5 October 2026**. Live orders need Gate 1, a registered company with GST, a live payment set-up and the legal package first. Target date: **Monday 2 November 2026**. |
| Market evidence to date | **None.** No dealer or buyer has been contacted yet. |

**Labels used in this document**

- **FACT**: checked against a named source on 28–29 Sep 2026 (listed in §23), or checked directly in the four source files.
- **DECISION**: a founder choice. It changes only through the decision log (§21), with a reason and a date.
- **ASSUMPTION**: a planning number. Measured data replaces it at Gate 2.
- **TEST**: a question the pilot must answer with evidence.
- **EXAMPLE**: made-up numbers that only show how a rule works.

**How to read this document:**

- §1–5: the verdict, the model, the strategy, and how pooling works with mixed demand.
- §6–10: how the business runs day to day.
- §11–14: the team, money, the dated plan and the gates.
- §15–19: legal, the product build, metrics, risks, and the hard questions.
- §20–23: how POOL scales, the decision and validation logs, and sources.

---

## 1. Verdict on the four documents

### 1.1 What is broken

*In §1, section numbers such as "§4.1" point to the old master unless marked otherwise.*

1. **The process replaced the product.**
   - The four files hold 519 KB and about 69,000 words, all written on 27–28 September 2026.
   - All four end with *field research NO-GO*, and no dealer or buyer was contacted.
   - The master's own freeze decision says: *"stop rewriting the master and gather the next evidence."* Three more files (246 KB of process) followed instead of field work. *(FACT.)*
2. **Duplication and circular references.**
   - The checklist's 125-line instrument block is a word-for-word copy of the master. *(FACT: diff.)*
   - The workbook repeats the same boilerplate 22 times.
   - The workbook points to EXEC-1.0, which points back to the master and the checklist.
3. **The core thesis contradicts itself.** The master defines *Mechanism B* as the "Realized Volume Effect" (§1, §22, A23). EXEC-1.0 §2 uses the same label for "Merchant Economic Acceptance". *(FACT.)*
4. **The scope is bigger than the budget and team can carry.**
   - The plan covered four metros at once, up to eight lanes, and every physical product above ₹5,000.
   - It had ₹4 lakh for the first cycle, 40 hours per city lead and 20 developer-hours in total.
   - No city could start until all four were ready. *(FACT: EXEC §4–6.)*
5. **The value threshold rules out most of the product range.** The test max(₹1,000, 2%) means a 20% saving at ₹5,000. EXEC §12 notes this and keeps both rules anyway. *(FACT.)*
6. **Nothing was chosen.** There is no SKU, locality, community, dealer or date; all are "discovery outputs".
7. **The chosen channel contradicts the order model.** The master starts with "apartment possession, relocation, housing communities". Such households usually need several appliances (ASSUMPTION), yet §3.3 allows one item per order. *(FACT for the quotes.)*
8. **The payment rules make the trust risk worse.** Buyer trust is named a top risk (§20.4, §22.3, A25). Yet buyers must prepay an unknown dealer, and pay-on-delivery is banned for a settlement-accounting reason (§33.2). *(FACT.)*
9. **Revenue arrives late and depends on dealer honesty.**
   - The fee comes after eight settlement conditions, then a weekly invoice with 7 days to pay.
   - The spec itself says "collection risk remains" (§23.1). *(FACT.)*
10. **The design fights its own volume logic.** Buyers pick among competing dealers, so volume splits. The master names this the "Competition–Concentration Tension" (§4.1) and leaves it unsolved. *(FACT.)*
11. **Mixed demand is deferred, not solved.** The master admits that brand incentives "cannot be assumed to combine" across brands (§4.1). It defers mixed-model pooling to a later test (§21.2, A03). Real residents want different models and brands from day one. *(FACT.)*
12. **A switched-off feature shapes the design.** POOLBACK is OFF, yet it drives 8 of the 74 database tables and most of the worked economic cases. *(FACT.)*
13. **Research is blocked by legal ritual.**
    - Talking to a shopkeeper needs eight specialist reviews, a retention period for every data class, and a restore drill.
    - Yet the DPDP substantive duties only apply from **13 May 2027**. *(FACT.)*
14. **The experiment design is theatre.** A cluster-randomised design over 10–40 dealer shops can only be "descriptive", as the documents themselves admit. *(FACT.)*
15. **Competition is never analysed.**
    - PriceMela is building nearly the same bridge model.
    - Wantd claims 1,200+ closed deals.
    - MyGate (27,000 communities) is not mentioned at all. *(FACT: see §9 of this blueprint.)*
16. **AI is missing where it matters.** The documents keep AI out of the pilot (§32.1, §34.1), while the team has five developers.
17. **Two deciding factors are never mentioned:**
    - brand price floors (MOP), which apply to the dealer's own invoice;
    - the festive season.

    *(FACT: zero occurrences of "MOP", "festive", "Diwali" or "season".)*

### 1.2 What is right (kept, in condensed form)

- **Buyer rules:**
  - one firm price;
  - an accepted price never goes up;
  - all-in landed prices;
  - an unknown charge is never zero;
  - no fake MRP savings;
  - sealed quotes;
  - never ask the budget;
  - no lead reselling;
  - AI never sets prices or terms.
- **Operating basics:** merchant verification, price evidence, unit economics that count failed work and founder time, stop discipline, and refusal coding.
- **Engineering rules:** money in paise, immutable accepted snapshots, idempotent acceptance, an audit trail and tenant isolation.

---

## 2. The founder's model: POOL is the bridge

**The model (DECISION, founder, 29 Sep 2026).**

- POOL is **not a seller**. It never owns stock, never invoices goods, and never holds the buyer's money.
- **The authorised dealer sells**, invoices the resident, delivers and installs.
- **POOL pools the community's demand** and gets dealers to bid for it.
- **The resident pays one community price**, below the best market price.
- **POOL keeps the difference** between that price and what the dealer agreed to receive.

**How the money moves (founder's example).**

1. The dealer bids: *"For this community, I will accept **₹40,000** per unit, delivered and installed."* That is the **dealer net**.
2. The community price is **₹43,000** (set by the §8.2 rule). The best market price is ₹50,000.
3. The dealer's tax invoice to the resident is ₹43,000. The resident pays through **POOL's checkout, run by an RBI-authorised payment company** that holds the money.
4. **After confirmed delivery**, the payment company splits the ₹43,000 automatically:
   - ₹40,000 to the dealer (less statutory TCS and TDS, which are the dealer's own tax credits), with 10% held until installation;
   - ₹3,000 to POOL, released last, once the order is complete (§6.1).
5. **Nobody pays POOL anything out of pocket.** The resident pays no fee. The dealer receives exactly its bid.

**The one legal point to know (the CA and the lawyer confirm it).** In tax and contract terms, the difference a bridge keeps is a **commission**: payment for its service to the dealer.

- POOL invoices the dealer for it, with 18% GST, and the dealer claims that GST back.
- The dealer ends up exactly where it would be selling at ₹40,000 (§8.3 proves it).
- This is how marketplaces earn. It changes nothing for the resident or the dealer — but POOL's papers, tax and wording must say "commission", not "we sell".

**Why this is the right model:**

| Compared with | The bridge wins because |
| --- | --- |
| The old fee model (v2.0) | • About 4× more contribution per unit: ≈₹1,534 (§8.3) against ≈₹361 under the old ₹800 fee (₹800 less 3% bad debt, ₹375 operations and ₹40 tech).<br>• No invoice to chase: the commission is taken automatically at payment. |
| The reseller model (v2.1 — wrongly assumed) | • POOL never buys goods, so there is no GST input-credit trap on the product price.<br>• The resident gets the authorised dealer's own invoice, so the warranty is normal.<br>• No stock, no seller liability for the goods.<br>• A marketplace can take foreign investment later. An inventory model cannot (§15). |

**What it demands (all planned in this blueprint):**

- A payment company's **split-settlement** product, with every dealer's KYC done (§15).
- **GST registration as an e-commerce operator**, plus TCS and TDS collection and filing (§15).
- **Marketplace duties.** POOL shows the dealer's details, gives every complaint a ticket number, and publishes how it ranks offers. The dealer carries the seller duties, including refunds for late or defective goods (§15).
- **Honest wording.** POOL says clearly that it is paid a commission by the dealer, that the commission is included in the price, and that the resident pays nothing extra. POOL never claims to be the resident's negotiating agent (Contract Act s.215–216, §15).

**The founder's challenge to the example (TEST).** The ₹50,000 must be the **best real market price** (the landed online or store price on the day), never the MRP.

- If the AC really sells at ₹44,000, a ₹40,000 dealer net still works: the resident pays ₹42,000 and saves ₹2,000.
- If the dealer net is not at least **about 7% below the real market price**, the item cannot be listed (§8.2).
- That gap is the most important number in the pilot.

---

## 3. What POOL is

**One sentence.** POOL is the bridge between residents moving into new gated communities and authorised appliance dealers. It pools the residents' demand, makes dealers bid for it, and lets each resident buy from the winning dealer at one community price below the best market price. POOL keeps a small, capped difference and charges nobody a fee.

| To whom | The promise |
| --- | --- |
| **Residents** | • The exact model at one all-in price, below the best verified market price.<br>• Your price never depends on how many others buy.<br>• An authorised dealer sells, invoices, delivers and installs; the manufacturer's warranty applies.<br>• Your money waits with a licensed payment company and reaches the dealer only after delivery.<br>• One POOL desk, and we never ask your budget.<br>• If a verified cheaper option exists, we re-price or tell you. |
| **Dealers** | • Real demand from one address, bid for in one sealed round.<br>• Batched delivery and installation.<br>• You receive exactly your bid, automatically: 90% on delivery, the rest on installation.<br>• **Nothing to pay from your pocket:** no fees, no listing, no leads, no ads. |
| **POOL** | Keeps the difference between the community price and the dealer net, between 5% and 7.5% of the dealer net (§8.2). Nothing else. |

**What POOL is not:**

- not a seller;
- not a payment company (a licensed one handles the money);
- not "wait until 50 people join" group buying (your price is fixed);
- not a catalogue;
- not a cashback scheme.

---

## 4. The wedge, and the logic behind it

**Who (DECISION).** Households taking possession in large new gated communities (200+ homes), plus recent movers there.

**What (DECISION).**

- **Core:** split ACs, refrigerators, washing machines and TVs; dishwashers on request.
- **Add-ons, only inside a household basket:** chimney, hob, water purifier, storage geyser, microwave.
- **Excluded:** phones and laptops, furniture and mattresses, used/refurbished/open-box goods, and services.

**Where (DECISION).**

- **Hyderabad** is the only city with live operations in 2026, starting with 3 communities. It was the original master's home market.
- **Bengaluru:** price scans only; it can go live in Q1 2027, after Gate 2.
- **Mumbai and Delhi:** no spending in 2026.

**Why this wedge — each step depends on the one before it:**

1. **Pooling only changes economics when demand is concentrated in one place and one period.** A possession wave is exactly that.
2. **Concentration lowers the dealer's real costs:** one negotiation, batched delivery and installation, and near-zero marketing. Those savings fund the resident's discount and POOL's difference. §5 shows which savings survive when demand is mixed.
3. **POOL awards each lot to one dealer**, so volume concentrates instead of splitting — the old documents' unsolved problem (§1.1, item 10).
4. **Households usually need several appliances at once (ASSUMPTION),** so value is earned per basket.
5. **Distribution is cheap and permitted:** an association or builder desk, with individual opt-in. It plays to the founder's network.
6. **Exact model numbers exist in these categories,** so comparisons are precise.
7. **Why not the other options:**
   - **Phones and laptops:** tight price floors, online dominance, and Wantd already targets them.
   - **Furniture:** the same product cannot be identified across sellers.
   - **Cheap items:** they cannot carry both a saving and a difference.
8. **Why one city:** the budget, one founder's reach, and the rule that evidence does not transfer between cities.

**Seasonality (FACT).**

| Date | Event |
| --- | --- |
| 8 Oct 2026 | Amazon Great Indian Festival starts |
| 9 Oct 2026 | Flipkart Big Billion Days starts |
| 15 Oct 2026 | 0.4% fee (MDR) starts on UPI payments to merchants above ₹2,000 |
| 6 Nov 2026 | Dhanteras |
| 8 Nov 2026 | Diwali |

- October brings the year's biggest online sales, so it is the hardest benchmark. The scan runs through it on purpose (§13).
- February–May is AC season. ACs are likely the largest move-in category by value (ASSUMPTION; measured in the pilot).

---

## 5. Pooling when residents want different models and brands

**The problem in one line.** Pooling only produces a discount if the volume lowers the dealer's costs or earns the dealer more. That depends on *what kind* of volume it is.

### 5.1 Where a dealer's community discount comes from

**Status: EXPECTED, not yet measured. Gate 1 measures it (§5.8).**

| Source of the discount | 50 × same model | 50 × same brand, mixed models | 50 × mixed brands |
| --- | --- | --- | --- |
| Lower selling cost: no walk-ins, ads or haggling; one negotiation | ✓ | ✓ | ✓ if one dealer serves the whole lot |
| Batched delivery to one address | ✓ | ✓ | ✓ if one dealer delivers every brand |
| Batched installation (same towers, same days) | ✓ | ✓ (same brand's technicians) | Partly: each brand sends its own technicians (TEST: who installs) |
| **Brand volume incentives.** The brand pays the dealer on its total purchases of that brand. A trade source puts these at 1–3% for hitting targets (FACT, trade source; TEST). | ✓ | **✓ Every LG unit counts, whatever the model** | Split: each brand's count is smaller |
| Model-specific schemes (launch, clearance) | ✓ | Partly | Rarely |
| Brand "project" pricing for a bulk order to one site (TEST: will brands treat a community wave as a project?) | Likely | Possible | Harder |

**Context (FACT, trade source; TEST).** The same source puts general-trade dealer margins on large appliances at 10–15%.

- POOL needs about 7% headroom below the market price.
- That is roughly half a dealer's margin.
- **It only works if the volume replaces what the dealer gives up.** That is exactly what this section designs for.

### 5.2 Founder's question 1: 50 residents want LG, but different models

**Most of the pooling value survives (EXPECTED).**

- **One LG lot.** POOL runs a single LG lot covering every LG model the community needs. LG-capable dealers bid on it as one package.
- **Two price layers in each bid:**
  - a price per model;
  - a **brand-level step-down**: after the Nth LG unit in the wave, whatever the models, the dealer net drops.
- **Residents still choose their own model.** Each model gets its own fixed community price.
- **POOL Picks inside LG.** For each specification (for example 1.5 ton, 5-star, inverter), the card highlights the LG model with the best community price. Residents who do not mind the exact model tend to gather there, which also unlocks model-specific schemes.

### 5.3 Founder's question 2: 50 residents want ACs from different brands

**Less value survives:** brand incentives split, and installation splits across brands. POOL uses four fixes, in this order:

1. **Ask how fixed each choice is — never the budget.**
   - Options: *exact model* / *this brand, any model with my specs* / *best value for my specs*.
   - TEST: what share of residents are flexible.
2. **POOL Picks by specification, across brands.** POOL shows the 2–3 best-value models per specification, using a published ranking rule. Marketplaces must disclose their main ranking parameters (FACT, Rule 5). Flexible residents concentrate on these picks.
3. **Zone lots: the same brand across nearby communities.** For example, 8 Daikin buyers here plus 12 in the next community make one 20-unit Daikin lot.
4. **Package bids from multi-brand dealers.** A dealer can bid for the community's whole AC demand across brands, with a package discount. POOL compares that package with brand-by-brand awards and takes the cheaper combination that meets the service limits.

**Anything that still cannot clear the ~7% bar is shown as "not listable — here is where it is cheapest".** No resident is ever pushed toward a brand they did not ask for.

### 5.4 Lot rules (DECISION — thresholds are ASSUMPTIONS, recalibrated after the first waves)

| Lot type | When it is used |
| --- | --- |
| **SKU lot** | 10 or more units of one model in a wave |
| **Brand lot** | 15 or more units of one brand, any models |
| **Category package** | All remaining units of a category in one community, open to multi-brand dealers |
| **Zone lot** | The same brand across communities within about 10 km, when one community is too small |
| **Quote Request** | Anything below these sizes. It is priced at the single-unit bid and listed only if it clears the §8.2 rule. |

**Award rule.** POOL picks the cheapest combination of bids that covers the wave's demand, subject to four limits:

- at most **3 dealers per community wave**;
- a **named backup** for every lot;
- each dealer's **declared capacity** (stock, installations per day);
- the dealer's **service record**.

With up to 5 dealers and 6 lots, the console can check every combination exactly.

### 5.5 Waves (DECISION)

- **Wave length:** 14 days in October–November, 30 days from December.
- **Each wave:** registration cut-off → 48-hour sealed round → award → Price Card for the whole community, late registrants included, until the next wave.
- **Timing:** the December sealed round runs in the second half of the month, when dealers are closest to their quarterly brand targets (§19, question 4).
- **Earlier buyers keep their price.** A later card can be cheaper or dearer.
- **Before dispatch**, if the card price of your model drops (a new wave, or a verified cheaper market price), POOL re-prices your order down by cutting its own difference, down to its floor (rule 5).
  - If the new price is lower still, POOL tells you, and you may cancel free or move your order to the new card.
  - The dealer's tax invoice is issued at dispatch, so no credit note is needed (CA to confirm).

### 5.6 What a resident's price depends on

- **It depends on** the lot's **base bid** for that model — the price with no volume step-downs counted.
- **It never depends on** how many others buy after you.
- **Extra volume** after a step-down lowers the dealer net for later orders. That raises POOL's difference; it never raises your price.

### 5.7 The honest limit

**If residents in a community are rigid on brand and model, and no brand reaches lot size, POOL works like a well-run single-unit bridge.** It can still work — if the base bids clear the rule — but with less advantage. The pilot must learn which case Hyderabad's communities are.

### 5.8 How Gate 1 measures pooling (TEST)

For 5 of the 20 scan models, at least 3 dealers give **four research prices**:

1. one unit;
2. 20 units of the same model;
3. 20 units of the same brand, mixed models;
4. 20 units of mixed brands (multi-brand dealers only).

The gaps between these four numbers show where the discount really comes from. That tells POOL how hard it must shape demand.

---

## 6. How it works

### 6.1 Flow A — Community Price Card, run in waves (primary flow)

1. **Community partnership.** The residents' association or the builder's handover team gives written permission for two things:
   - a POOL desk on possession days or weekends;
   - one official message carrying the POOL link.

   Each resident opts in individually.
2. **Need registration (two minutes).** The resident gives:
   - their tower (not the flat number, until delivery);
   - their possession month;
   - the categories they need;
   - their specifications (for example room size for an AC);
   - any exact model;
   - **how fixed the choice is** (§5.3);
   - their timing, including when the flat will be ready for installation;
   - whether the flat is for their own use or for rent.

   There is no budget question.
3. **Sealed round.**
   - **Lots.** POOL turns the wave's needs into lots (§5.4) and sends each lot, with anonymous demand counts, to 3–5 verified dealers.
   - **What each dealer bids:**
     - a **dealer net** per model: what it will accept, delivered and installed;
     - optional volume step-downs;
     - stock and lead times;
     - who installs;
     - installations per day;
     - DOA and replacement terms.
   - **Confirmation.** The dealer confirms its bid by link.
   - **Award.** POOL awards each lot by the §5.4 rule.
4. **Price Card.**
   - **Price.** POOL applies the §8.2 rule to set each model's community price.
   - **Access.** The card is private: a signed link, watermarked with the community's name and the last four digits of the viewer's phone, shown only to verified residents.
   - **What each model shows:**
     - the community price;
     - the best verified market price, with its timestamp;
     - the saving;
     - what is included;
     - the seller (the dealer's legal name, address, GSTIN and customer-care number);
     - POOL's delivery promise;
     - warranty and returns.
   - **Not listable?** If a model cannot clear the rule, the card says so and shows where it is cheapest.
5. **Order.**
   - The resident accepts the exact offer version. It is frozen as a snapshot.
   - **The delivery date is fixed at acceptance and must fall within 45 days.** A resident whose flat is not ready for installation can take delivery now and book installation later (step 7).
   - The resident pays a **₹2,000 booking** through POOL's checkout. The payment company holds it, and it is refundable until dispatch. *(Exactly ₹2,000 on purpose: UPI payments of ₹2,000 or less carry no fee — FACT.)*
   - POOL sends the order to the awarded dealer, and the dealer confirms the slot within 4 service hours.
   - The dealer dispatches with its **own tax invoice to the resident**, at the community price.
6. **Delivery.**
   - The resident, or a receiver they name (a family member or the interior contractor), checks the model and the box.
   - The resident pays the balance through POOL's checkout, then gives the one-time delivery code. The code can be shared remotely.
   - The dealer (or the brand's technicians) installs — at delivery, or on the date the resident books — and the resident confirms installation in the POOL link.
7. **Settlement (automatic, through the payment company).**
   - **On the delivery code:** the dealer's net is released, minus a **10% installation holdback** on items where installation is included, and minus TCS and TDS.
   - **The holdback** is released on the installation confirmation, or 5 days after delivery if no issue is open.
   - **Deferred installation:** the resident books a date within 45 days of delivery. The holdback is released on installation or 45 days after delivery, whichever comes first, and the dealer's duty to install on the booked date continues under the seller agreement.
   - **POOL's difference is released last:** with the holdback, or 5 days after delivery for items without installation, if no issue is open. POOL is paid only for completed orders.
   - *(The holdback is a DECISION; dealers' acceptance of it is a TEST.)*
8. **Follow-through.**
   - POOL runs the issue desk.
   - The **Warranty Locker** keeps the dealer's invoice and the warranty card for the resident.

### 6.2 Flow B — Quote Request (secondary flow)

For a model that is not on the card, POOL runs a 24-hour sealed round with 3–5 dealers.

- The model is priced by the same rule and ordered the same way.
- If it cannot be listed, the resident is told within 24 service hours, together with the cheapest market option.

### 6.3 Service levels (DECISION)

| Item | Commitment |
| --- | --- |
| Service hours | 10:00–19:00 IST, Monday–Saturday. Diwali-week staffing is published in advance. |
| First human reply (WhatsApp) | Within 1 service hour |
| Quote Request | A price, or "not listable, here is the cheapest option", within 24 service hours |
| Dealer slot confirmation | Within 4 service hours. If the dealer fails, the backup dealer takes the order at the same resident price. Any higher dealer net comes out of POOL's difference first, then out of the commitment reserve (§12). |
| **Delivery promise** | POOL's promised date = the dealer's committed date **plus 2 days**. If the goods arrive later than the stated schedule, the resident may return them for a refund. Sellers must accept this under Rule 6 (FACT). The money is usually still with the payment company, so the refund is quick. |
| Complaints | Every complaint gets a ticket number (Rule 5, FACT). It is acknowledged the same service day (legal maximum 48 hours) and resolved or escalated within 7 days (legal maximum one month). |

### 6.4 Basket rules (DECISION)

- Every line has its own price, honoured if it is bought alone.
- A **basket discount** can come from the dealer's package bid or from POOL's own difference. It is shown as a separate line and guaranteed only when all lines are accepted together.
- If a line is cancelled later, the per-line prices apply to what remains. This is shown before acceptance.
- **What other households buy never changes your price.**
- **Add-ons stay on the card only if they earn it:** if fewer than 20% of add-on lines clear §8.2 by the mid-pilot review (27 November), add-ons are dropped (§19, question 32).

### 6.5 Order lifecycle (DECISION)

**Resident:** `REGISTERED → PRICED → ACCEPTED (booking held) → SENT_TO_DEALER → DEALER_CONFIRMED → DISPATCHED (dealer invoice) → DELIVERED (code + balance) → INSTALLED (if included) → COMPLETED`

- **Exits:** `CANCELLED` (booking refunded) and `RETURNED` (refund under the dealer policy shown at acceptance).
- **Flags:** `PAYMENT_DUE`, `INSTALL_DEFERRED`, `LATE`, `ISSUE_OPEN`, `DISPUTE`.

**Settlement:** `HELD → RELEASED_ON_DELIVERY → HOLDBACK_RELEASED` (or `REFUNDED`).

- Every change is an append-only event recording who, when and what evidence.
- The accepted snapshot is never edited.

---

## 7. The twelve rules POOL never breaks

1. **One firm price.** The community price is valid for you alone and never depends on how many others buy. The volume risk sits with POOL's difference, never with your price.
2. **An accepted price never goes up.** Before dispatch, it can only go down (§5.5).
3. **All-in, one figure.**
   - The price covers the item, delivery, standard installation, taxes and every mandatory charge, shown as one total with its breakup.
   - Extras (for example extra AC piping) are priced before you order.
   - An unknown charge is never treated as ₹0.
4. **Only real comparisons.**
   - Exact model against exact model.
   - The market price is the best verified landed price, timestamped and rechecked within 24 hours of acceptance. Never MRP.
   - Bank-card offers are shown separately.
5. **When a verified cheaper option exists, POOL either re-prices the card or says so.** Re-pricing cuts POOL's own difference, down to its floor.
6. **Buyer first.**
   - The resident saves at least **max(₹1,000, 2%)**.
   - POOL's difference is capped at **7.5% of the dealer net**.
   - Below a **5%** difference, the item is not listed.
7. **POOL is the bridge, and says so.**
   - The dealer sells and invoices.
   - The money sits with a licensed payment company until delivery.
   - POOL is paid a commission by the dealer, and it is included in the price. Every card states the rule: between 5% and 7.5% of the dealer's net, never leaving you less than the minimum saving. The exact amount per order is not published, because it would reveal the dealer's sealed bid (rule 8).
   - POOL never claims to be your negotiating agent.
   - POOL never asks anyone for an OTP. The delivery code is yours to give only after you, or your named receiver, have checked the box.
8. **Sealed rounds.** Dealers never see each other's bids. Each lot has one winner and a named backup.
9. **POOL never asks a resident's budget or maximum price.** It asks only how fixed the choice is.
10. **Contact details go only to the delivering dealer,** only for delivery and warranty service. They are never sold or used for marketing.
11. **AI drafts; people decide.** No AI output sets a price, confirms stock, verifies a payment or closes a complaint.
12. **Nothing fake.**
    - No invented demand, MRP "savings", reviews or countdowns. A countdown appears only when the deadline is real.
    - **No POOL-funded discounts** to fake traction.

---

## 8. Business model and unit economics

### 8.1 How POOL earns (DECISION)

- **The only income:** the community price minus the dealer net.
- **How it is collected:** automatically, by the payment company's split, at settlement.
- **What the law calls it:** a marketplace commission. POOL invoices each dealer monthly, with 18% GST, and the dealer claims that GST back.
- **Nobody pays POOL from their pocket.** There are no buyer fees, dealer fees, listing fees, lead fees, paid placement, subscriptions or rebates.
- **POOL absorbs the payment charges** (UPI and card). There is never a surcharge.
- **Never POOL's money:**
  - the resident's payment before settlement;
  - the dealer's share;
  - TCS and TDS collected for the government.
- **Revenue in the accounts** is POOL's difference, excluding GST. **Sales through POOL (GMV) are never reported as revenue.**

### 8.2 The pricing rule (DECISION — the console computes it; the dealer confirms the resulting price as its selling price)

**Definitions:**

- **C** — the dealer net: all-in, delivered and installed, GST included.
- **M** — the best verified market landed price.
- **H** (headroom) = M − C.
- **S** (minimum buyer saving) = max(₹1,000, 2% of M).
- **F** (floor) = 5% of C.
- **T** (cap) = 7.5% of C.

**The rule:**

1. **List only if H ≥ S + F.**
2. **POOL's difference = the smallest of:**
   - T;
   - H − S;
   - the larger of F and H/2.
3. **Community price = C + difference.**

**In words:** POOL takes half the headroom, between 5% and 7.5% of the dealer net. It never takes so much that the resident saves less than max(₹1,000, 2%).

| Dealer net C | Market price M | Headroom | POOL's difference | **Community price** | Resident saves |
| ---: | ---: | ---: | ---: | ---: | ---: |
| ₹40,000 | ₹50,000 | ₹10,000 | ₹3,000 | **₹43,000** | ₹7,000 ← *founder's example* |
| ₹40,000 | ₹45,000 | ₹5,000 | ₹2,500 | **₹42,500** | ₹2,500 |
| ₹40,000 | ₹43,000 | ₹3,000 | ₹2,000 | **₹42,000** | ₹1,000 |
| ₹40,000 | ₹42,500 | ₹2,500 | — | **not listed** | shown the cheaper option |
| ₹25,000 | ₹29,000 | ₹4,000 | ₹1,875 | **₹26,875** | ₹2,125 |
| ₹60,000 | ₹68,000 | ₹8,000 | ₹4,000 | **₹64,000** | ₹4,000 |

**What this means (arithmetic).** To be listable, **the dealer net must be at least about 7% below the real market price**: 6.7–6.9% at ₹45,000–₹60,000, and 7.9% at ₹30,000.

### 8.3 Unit economics (ASSUMPTIONS — replaced by measured numbers at Gate 2)

**POOL's side — founder's example (₹40,000 net → ₹43,000 price):**

| Line | Amount | Basis |
| --- | ---: | --- |
| Difference (commission, GST-inclusive) | ₹3,000 | ₹43,000 − ₹40,000 |
| GST on the commission | −₹458 | 18%, paid by POOL and claimed back by the dealer |
| **Net commission** | **₹2,542** | |
| Payment charges | −₹378 | 70% UPI at 0.4% = ₹172 (FACT, from 15 Oct 2026); 30% card at an assumed 2% = ₹860 |
| Operations time | −₹375 | 90 minutes at ₹250/hour loaded |
| Tech and messaging | −₹40 | |
| Risk allowance | −₹215 | 0.5% of price: disputes, chargebacks, goodwill |
| **Contribution per unit** | **≈ ₹1,534** | |

**The dealer's side — proof that "the dealer receives exactly its bid" (arithmetic):**

| Line | Amount |
| --- | ---: |
| Dealer's invoice to the resident | ₹43,000 |
| GST the dealer owes on that sale | ₹6,559 |
| GST credit on POOL's commission invoice | −₹458 |
| **Dealer's net GST** | **₹6,102** — the same as selling at ₹40,000 directly (₹6,102) |
| Cash to the dealer after POOL's ₹3,000 | ₹40,000 |
| Less TCS (0.5% of ₹36,441) and TDS (0.1% of ₹43,000) | −₹182 and −₹43. **Both are the dealer's own tax credits, not costs.** |

**Why the dealer is exactly neutral.** It works because the product and POOL's commission carry the same 18% GST. ACs, TVs, dishwashers, washing machines and refrigerators are all at 18% (FACT). An item at any other rate is listed only after the CA sets the split so that the dealer's after-tax position still equals its bid.

**Sensitivity (arithmetic, dealer net ₹40,000):**

| Difference per unit | ₹1,500 | ₹2,000 | ₹2,500 | ₹3,000 | ₹4,000 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Contribution per unit | ₹284 | ₹700 | ₹1,117 | ₹1,534 | ₹2,368 |

| Operations time (at ₹3,000) | 60 min | 120 min | 180 min |
| --- | ---: | ---: | ---: |
| Contribution per unit | ₹1,659 | ₹1,409 | ₹1,159 |

### 8.4 Community economics (ASSUMPTIONS)

**Assumptions:**

- 400 homes;
- 60% buy at least one core appliance during the possession window;
- POOL wins 25% of those households;
- 2.2 units per household;
- an average price of ₹40,000 and an average difference of ₹2,500;
- ₹25,000 to run the community channel.

| Result | Value |
| --- | ---: |
| Units | 132 |
| Sales through POOL (GMV, not revenue) | ₹52.8 lakh |
| POOL net commission | ≈ ₹2.80 lakh |
| **Contribution after the channel cost** | **≈ ₹1.27 lakh** |
| **Break-even** | **≈ 22 units ≈ 10 households ≈ 4% of buying households** |

- At a 10% share: ≈₹35,800. At 15%: ≈₹66,200.
- **Once the headroom exists, the model is robust. Without it, nothing can be listed.**

### 8.5 Volume step-downs (DECISION)

- **POOL never buys or holds stock.** An order reaches a dealer only after the resident's booking.
- **Step-downs apply going forward.** When a lot passes its threshold (for example the 20th LG unit), the dealer net drops for the *later* orders. There are no credit notes and nothing to collect afterwards.
- **Counting period.** A step-down may count every unit the dealer delivers to that community, or to its zone lot, within one calendar quarter, across waves. Brands pay volume incentives quarterly (FACT, trade source), so this matches how the dealer's own reward is counted (§19, question 4).
- **Residents are priced off the base bid**, the one with no step-downs counted. Step-downs raise POOL's difference.
- POOL prices off expected step-downs only in communities that have already proved their volume.
- **Firm minimums (last resort).** If a dealer insists on a firm minimum, bookings are taken against a real deadline. If the minimum is not reached, every booking is refunded.

---

## 9. Competition, and how POOL wins

*FACT. These are the companies' own website claims as seen on 28 Sep 2026: self-reported and unverified.*

| Player | What it does | Relevance to POOL |
| --- | --- | --- |
| **PriceMela** (Bengaluru — Jayanagar, JP Nagar) | Buyers post requirements; sellers send **sealed** offers (max 8); **buyers pay sellers directly**; no commission at launch; *"No lead credits. No ad packages. Ever."* Categories include Apple devices, home appliances and furniture. *Launching soon.* | **The closest model.** Both are bridges where the seller sells. POOL differs in four ways:<br>• it pools community demand into lots;<br>• it gives one community price per model;<br>• the money is held until delivery;<br>• it earns a capped difference. |
| **Wantd** (Bengaluru) | Reverse marketplace for phones and laptops; buyers post with a budget. It claims 1,200+ closed deals and an average saving of ₹4,200. | It owns the phone/laptop lane. POOL stays out of it and never asks the budget. |
| **Wantoo** | "Reverse marketplace" claiming 14 cities and 2,400+ needs posted. | The generic space is crowded. |
| **CrowdTag** | Chrome extension on Amazon; brand-funded threshold discount codes. Invite-only. | Threshold pooling on Amazon; no local fulfilment. |
| **MyGate** | 27,000 communities and 57 lakh homes; raised ₹225 crore in June 2026; says it is profitable; offers local services and a used-goods marketplace. Its 2024 blog says it "facilitates group buying". | **The biggest potential competitor, and also the most natural partner.** |

**The price benchmarks** are online marketplaces and large electronics chains. They are POOL's real competition for every order.

**How POOL wins:**

1. **Community demand turned into lots.**
2. **One winner per lot**, so volume concentrates.
3. **All-in, installed prices, with precise comparisons.**
4. **Baskets.**
5. **Money held until delivery.**
6. **The lowest cost per order**, through AI-assisted operations.

**Earnable moat (none of it exists today):**

- headroom and price history by community, lot and dealer;
- dealer performance;
- community trust;
- low operations cost;
- later, brand project pricing (§20).

---

## 10. Go-to-market playbooks

### 10.1 Communities

**Selection criteria (all must hold):**

- 200+ homes;
- possession under way or within 90 days (check builder announcements, association notices and public RERA listings);
- at least 5 authorised multi-brand dealers within about 15 km;
- a named association or builder contact.

**Pitch:**

- free for the community;
- a community price below the market;
- authorised dealers only;
- money held until delivery;
- one issue desk;
- no data sold;
- individual opt-in.

**Asks:** a desk, one official message, and a named contact. Keep the permission in writing.

**Who to ask (ASSUMPTION).** At possession, an elected association often does not exist yet, so the builder's handover or facility-management team is usually the gatekeeper. If the builder already has an appliance partner, POOL invites it to bid like any dealer and never claims exclusivity.

**Forbidden:**

- scraping groups;
- adding people to groups;
- bought contact lists;
- messaging anyone who has not opted in;
- cash referral schemes.

Any contribution to an association fund is printed on the card and counted as acquisition cost.

**Second channel (TEST): interior designers working in the same towers.** They already buy appliances for clients and can refer clients to POOL. Any referral payment is disclosed on the card and counted as acquisition cost.

### 10.2 Dealers (the sellers)

**Target:** 8–12 authorised multi-brand dealers within reach of the three communities, plus any large-format chain store willing to bid. Qualify at least 3.

**Qualification (all required before the first order):**

- GSTIN active, and returns filed;
- a regular GST registration that allows supplies through an e-commerce operator (the CA confirms the rule for composition dealers);
- store visit, with a photo;
- brand-authorisation evidence;
- a sample tax invoice;
- bank details match the legal name. Confirm them by a call to the store or owner, never over chat;
- related shops flagged. Shops with the same owner count as one dealer;
- **KYC done with POOL's payment company as a settlement account;**
- **written confirmation that invoicing at the community price does not breach its brand's price policy (MOP).** Brands without this stay off the card.

**Exposure limits (DECISION, §19):**

- a new dealer takes at most 10 units until it has completed 5 clean deliveries;
- a bid more than 15% below the median of the other bids for the same model triggers a check of brand authorisation and stock before the award;
- a dealer whose side sales to registered residents pass 10% of its awarded volume is not invited again.

**Seller agreement (Rule 6 requires a prior written contract — FACT; the lawyer drafts it):**

- **Pricing:**
  - the dealer invoices the resident at the community price;
  - it receives its net through automatic settlement (§6.1, step 7);
  - volume step-downs apply going forward.
- **Service:**
  - delivery dates and installation capacity are committed in the bid;
  - when a resident defers installation, the dealer installs on the booked date (within 45 days of delivery);
  - a dealer that cancels a confirmed order pays the resident what a refusing resident would pay (§19, question 14);
  - Rule 6 seller duties apply, including refunds for defective, not-as-described or late goods;
  - the dealer appoints its own grievance officer. POOL's desk is the first line.
- **Money:**
  - refunds or chargebacks after settlement are recovered from the dealer's next settlements.
- **Data:**
  - resident data is used only for delivery and warranty service; no marketing.
- **Non-circumvention:**
  - the dealer may not offer the community price directly to that community's residents during the wave. This clause is time-limited, and the lawyer checks it.

**Pitch:**

- a whole community's demand in one sealed round;
- batched delivery and installation;
- your bid paid automatically after delivery;
- nothing to pay from your pocket.

### 10.3 Residents

**Intake fields (only these):**

- name;
- WhatsApp number;
- community and tower;
- possession month;
- categories;
- specifications;
- any exact model;
- how fixed the choice is;
- timing, including when the flat will be ready for installation;
- own use or for rent;
- how they found POOL;
- consent.

**Never collected:** budget, income, ID documents, bank details or OTPs. The flat number and delivery address are collected only after acceptance.

**Payment:** everything goes through POOL's checkout, run by the licensed payment company: the ₹2,000 booking first, then the balance at delivery. It is never paid to a person, and never in cash.

- **Card EMI** is available where the resident's bank offers it. Any "no-cost" EMI must be funded by the dealer or the brand and shown as a separate line.
- **Loans where a lender pays the dealer directly** bypass POOL's checkout, so they are not offered in the pilot. The need is measured (§19, question 10).

---

## 11. Team (DECISION)

| Who | Owns |
| --- | --- |
| **Founder** (48 hours/week at most) | Dealer and community deals in Hyderabad; every go/no-go decision; approves every manual settlement release, refund beyond policy and use of the reserve; weekly scorecard |
| **Hyderabad — community lead** | Associations, desks, registrations, flexibility capture |
| **Hyderabad — resident concierge** | WhatsApp desk, Price Cards, orders, bookings, delivery codes, issues |
| **Hyderabad — supply & dealer operations** | Dealer qualification, lots and sealed rounds, awards, delivery and installation scheduling |
| **Hyderabad — finance & compliance** | Payment-company settlements and reconciliation; commission invoices (GST); TCS and TDS with the CA; delivery-code audit |
| **Benchmarks, QA & Bengaluru scans** (remote) | Market-price evidence, SKU catalogue, checking AI outputs, Bengaluru scans |
| **Developers ×5**, each using Claude Code | Core app ×2, AI features ×1, lots/pricing/data ×1, QA/security/devops ×1 |
| **External** | Startup lawyer (fixed fee), chartered accountant (company, GST, TCS/TDS, monthly books), trademark agent |

- **Separation of duties:**
  - the person who onboards a dealer does not confirm its bank details;
  - the person who handles an order cannot release its settlement manually. Only the founder can.
- **Every person confirms availability in writing in Week 0.** If the field people are based in four cities, the Mumbai and Delhi people take the remote benchmark and QA work.
- **The ₹10 lakh contains no salaries.** Any pay comes out of it, which shrinks scope, or from new money.

---

## 12. Money — ₹10,00,000 hard cap (DECISION)

| Line | Cap (₹) | Allowed use |
| --- | ---: | --- |
| Legal & compliance | 1,75,000 | • Company, if not yet incorporated.<br>• Lawyer package: marketplace terms, seller agreement, privacy, grievance process.<br>• CA: GST registration as an e-commerce operator, and TCS/TDS set-up and monthly filings to December.<br>• Trademark search. |
| Hyderabad field operations | 1,25,000 | Local travel, possession-day desks, printing, phones and data |
| Community acquisition tests | 75,000 | Desk materials, events, permitted channel costs (all counted as acquisition cost) |
| Tech & tools | 1,00,000 | Hosting, domain, Google Workspace, WhatsApp messaging, AI APIs, accounting software, payment-company set-up |
| Bengaluru preparation | 25,000 | Price scans only |
| Commitment & goodwill reserve | 1,00,000 | • Honouring accepted prices when a backup dealer costs more than POOL's difference.<br>• Errors POOL caused.<br>• **Never a price subsidy for new orders.** |
| Contingency | 50,000 | Founder approval, logged |
| **Locked reserve** | **3,50,000** | Released only on a Gate 2 pass. Up to ₹1,50,000 may go to the single allowed retest (§14). |
| **Total** | **10,00,000** | **Spendable before Gate 2: ₹6,50,000** |

**Controls:**

- The founder approves every commitment above ₹10,000.
- One person records spending; another reconciles it weekly.
- At 80% of a line, new spending is frozen. At 100%, that line stops.
- Moving money between lines needs a dated entry in the decision log.
- **POOL never touches residents' or dealers' money.** Only its settled difference lands in POOL's account.

---

## 13. The 13-week plan (dated)

| Week | Dates (Mon–Sun) | What happens |
| --- | --- | --- |
| **0** | 28 Sep – 4 Oct 2026 | See the Week 0 list below. |
| **1–3** | 5 – 25 Oct | See the discovery sprint list below. |
| **4** | 26 Oct – 1 Nov | **Gate 1 decision on Friday 30 October.** If it passes:<br>• sign seller agreements;<br>• dealers complete payment-company KYC;<br>• receive the lawyer package;<br>• publish the first wave's Price Cards;<br>• full-flow rehearsal with test orders, which are never counted. |
| **5–12** | 2 Nov – 27 Dec | **Live pilot: Hyderabad, 3 communities.**<br>• Waves every 14 days, then every 30 days from December.<br>• Week 5 holds Dhanteras and Diwali, so delivery promises carry a buffer.<br>• Scorecard every Monday; TCS/TDS and commission invoices at each month-end.<br>• **Mid-pilot review: Friday 27 November.** |
| **13** | 28 Dec 2026 – 3 Jan 2027 | **Gate 2 decision on Thursday 31 December.** |

**Week 0 (28 Sep – 4 Oct):**

- Everyone confirms availability in writing.
- **On day one, confirm whether a Private Limited company exists.** If not, file for incorporation that week: company, GST, bank account and payment onboarding run in sequence, and each can take one to two weeks (ASSUMPTION).
- Then, in order:
  - GST registration (compulsory for an operator that collects TCS — FACT);
  - a current account;
  - applications to **two** RBI-authorised payment companies' **marketplace split-settlement** products, which need a live website with terms, a refund policy and a privacy policy. Go live with the first one ready.
- Engage the lawyer and the CA.
- Run the trademark search.
- Set up Google Workspace (2FA) and a WhatsApp Business number, and apply for the WhatsApp Business Platform.
- Shortlist 8–10 communities and 15–20 dealers.
- Fix the **20 scan models**: the brands and models residents name most, plus current bestsellers on the major marketplaces.
- Print the consent scripts.
- Developers set up the repository and the data model.

**Weeks 1–3 — discovery sprint and build (5 – 25 Oct):**

- **Dealers:** visit 12–15 dealers and ask Appendix A. For the 20 models, collect *research-only, non-binding* **dealer nets**:
  - a no-minimum community price;
  - step-downs;
  - **the four-price test (§5.8)** on 5 models with at least 3 dealers;
  - project-pricing possibilities;
  - MOP limits on the invoice price;
  - installation-kit prices per flat type;
  - installations per day;
  - acceptance of settlement through the payment company, including the holdback.
- **Market prices:** twice a week, including through the sale that starts on 8–9 October. Record all-in landed prices; bank offers separately.
- **Communities:** meet 6–8 associations or builders. Get 2–3 written permissions. Desks only register needs; nothing is sold.
- **Residents:** hold 40–60 conversations and registrations, including:
  - flexibility (exact model / brand / any);
  - trust in paying through POOL's checkout;
  - financing needs (card EMI, or a loan paid to the dealer);
  - when the flat will be ready for installation (interiors), and whether an AC can wait until summer;
  - whether they will live there or are furnishing it for rent.
- **Build:** POOL Ops v1 (§16) ready for internal testing by 25 October.
- **Bengaluru:** a phone price scan of the same 20 models with 5 dealers, clearly labelled as research.

---

## 14. Gates and kill rules (DECISION)

### Gate 1 — Headroom, supply and readiness (decision: Friday 30 October 2026)

**PASS requires all five:**

1. **Headroom:** at least **10 of the 20** scan models are listable under §8.2, using written, non-binding **no-minimum** community dealer nets against verified market prices.
2. **Supply:** at least **3 independent dealers** accept the seller agreement in principle, **including settlement through POOL's payment company**. Every listable model has at least 2 bids.
3. **Price floors:** each dealer confirms in writing that invoicing at the community price does not breach its brand's MOP policy. Brands without that confirmation are dropped; if fewer than 10 models remain, item 1 fails.
4. **Demand:** at least **2 communities** give written permission, and at least **40 households** register a need within 60 days.
5. **Readiness:**
   - company, GST registration, and the payment company's split settlement are live;
   - the lawyer package is delivered;
   - the CA is set up for TCS, TDS and commission invoices.

**Must be reported at Gate 1 (not pass/fail):**

- the four-price test results (§5.8);
- the share of registrations that are brand- or model-flexible;
- the share of residents who need EMI, split into card EMI and loans paid to the dealer;
- the share of AC needs deferred to summer, and of households whose interiors delay installation.

**If Gate 1 fails:**

| Failed item | Response |
| --- | --- |
| 1 (headroom) | Do not launch.<br>• If most of the gap comes from time-limited festive sale prices, re-scan once between 16 and 20 November.<br>• **Otherwise stop:** there is no headroom, so there is nothing to list. |
| 2 (supply) | If dealers reject the holdback, test release on the delivery code alone. **If dealers refuse settlement through POOL's checkout altogether, stop.** The bridge cannot collect its difference without it. |
| 3 (price floors) | List only the confirmed brands. If fewer than 10 models remain, treat it as item 1. |
| 4 (distribution) | Run 4 weeks of Quote Requests through network referrals, then decide. |
| 5 (readiness) | The live start moves. No exceptions. |

### Gate 2 — Unit economics (decision: Thursday 31 December 2026)

**PASS requires all ten:**

1. **Volume:** at least **40 delivered units** (strong: at least 80).
2. **Acceptance:** at least 25% of ready residents shown a listed price accepted it.
3. **Buyer value:** 100% of orders met the minimum saving at acceptance. The median saving is reported.
4. **Difference:** the average realised difference is at least **5% of the dealer net**, after cancellations and refunds.
5. **Promises:**
   - at least 90% of units delivered by POOL's promised date;
   - zero price increases;
   - every late delivery offered a refund.
6. **Money and tax:**
   - every rupee went through the payment company;
   - 100% of settlements were released only after a delivery code;
   - zero unreconciled settlements;
   - TCS and TDS were filed on time.
7. **Dealer duties:** every refund owed under Rule 6 was paid within policy.
8. **Operations:** at most 120 minutes per unit, and a measured contribution of **at least ₹700 per unit**.
9. **Dealers return:** at least 2 winning dealers bid again at equal or better nets.
10. **Safety:** zero unresolved payment or data incidents, and every complaint resolved within 30 days.

**Decision rules:**

- **All ten pass →** Phase 2 (§20). The reserve is unlocked.
- **Any of items 2–7, 9 or 10 fails →** stop or move to Plan B (§20). These are product, trust or compliance failures.
- **Only items 1 and/or 8 fail →** one retest: 3 more communities for 6 weeks, capped at ₹1,50,000 from the reserve. **There is no third attempt.**

**Pilot funnel behind the 40-unit bar (ASSUMPTIONS):**

| Step | Assumption | Result |
| --- | --- | ---: |
| Reachable households | 3 communities × 300 | 900 |
| Need a core appliance in the window | 50% | 450 |
| Register with POOL | 35% | 158 |
| Qualified | 70% | 110 |
| Accept | 30% | 33 |
| Units delivered | 2 per household | **≈66** |

At an average price of ₹40,000 and an average difference of ₹2,500 (arithmetic):

- GMV of about ₹26.4 lakh (not revenue);
- net commission of about ₹1.40 lakh;
- contribution of about ₹76,000.

**The pilot buys evidence, not profit.**

---

## 15. Legal and compliance — what is needed, and when

### 15.1 Now (research only, Weeks 0–3)

**Handling rules:**

- A consent script opens every interview.
- Written notes only; no audio.
- Only the §10.3 fields are collected.
- One restricted workspace with 2FA, and no public links.
- Raw notes are deleted by 31 March 2027.
- No personal data goes into consumer AI tools.

**Why this is enough now.** The DPDP Rules were notified in November 2025, and their substantive duties apply from **13 May 2027** (FACT). POOL follows them now as good practice.

**Consent script for residents:**

> "Hi, I'm ___ from POOL. We're researching how families moving into new communities buy appliances. This is research only. Nothing is sold today, and nothing you say commits you to anything. I'll take written notes; no audio. Your name and number are kept separately from your answers, only to follow up if you agree, and we delete the notes by March 2027. You can skip any question or ask us to delete your answers at any time. Is that okay?"

**Consent script for dealers:**

> "This is research only. Any price you give is non-binding until we sign a written seller agreement. It will never be shown to another dealer."

### 15.2 Before the first live order (target 2 November 2026)

| Requirement | What it means for POOL | Source |
| --- | --- | --- |
| **Private Limited company** | An e-commerce entity must be a company incorporated under the Companies Act. It must also name a grievance officer, acknowledge complaints within 48 hours and redress them within one month, show its legal name and contacts, and never use pre-ticked consent. | E-Commerce Rules 2020, Rule 4 (FACT) |
| **Marketplace duties** | POOL must:<br>• get an undertaking from each seller that its descriptions are accurate;<br>• show each seller's name, address, customer-care number and ratings;<br>• give every complaint a ticket number;<br>• show return, refund, warranty, delivery, payment and grievance information;<br>• publish the main parameters used to rank offers (this covers POOL Picks);<br>• describe any differentiated treatment of sellers in its terms. | Rule 5 (FACT) |
| **Seller duties (the dealer's)** | The dealer must:<br>• sign a prior written agreement with POOL;<br>• appoint a grievance officer;<br>• provide its legal name, address, GSTIN and PAN;<br>• show one total price with its breakup;<br>• **accept returns and refund for defective, not-as-described or late goods** (force majeure excepted);<br>• never post fake reviews. | Rule 6 (FACT) |
| **GST and TCS** | • **Collecting TCS makes GST registration compulsory, whatever the turnover**; the dealers must be registered too.<br>• POOL collects **TCS of 0.5%** on the net taxable value of sales through it, because the consideration is collected through its checkout (CA to confirm), and files monthly.<br>• POOL charges 18% GST on its commission. | CGST s.24 and s.52 (FACT) |
| **Income-tax TDS** | POOL deducts **0.1% of gross sales** from dealer settlements (since 1 Oct 2024). There is no TDS for individual or HUF dealers whose sales through POOL stay within ₹5 lakh a year, if they give a PAN or Aadhaar; the rate is 5% without either. | s.194-O (FACT) |
| **Payments** | • The money is held and split by an **RBI-authorised payment aggregator's marketplace settlement product**. POOL never holds or settles funds itself: under RBI's direction, a payment aggregator may not also run a marketplace, so POOL uses one.<br>• Settlement timelines are set by the agreement with the payment company, which must state them transparently. So release on the delivery code and the holdback are written into that agreement.<br>• The payment company may not accept payments for a seller not onboarded on POOL, so every dealer is onboarded before its first order.<br>• Refunds go back to the original payment method.<br>• UPI to merchants carries a 0.4% fee above ₹2,000 from 15 Oct 2026, capped at ₹300. | RBI Master Direction, 15 Sep 2025; UPI MDR FAQ (FACT); split products exist (FACT, §23) |
| **Honest role** | POOL says it is paid a commission by the dealer, and that the commission is included in the price. It never claims to be the resident's negotiating agent: an agent who secretly deals on its own account can have the deal repudiated and must hand over the benefit. | Contract Act s.215–216 (FACT) |
| **Legal metrology** | Sellers' mandatory declarations are shown, including MRP and country of origin for imports. No sale above MRP, and **no savings claimed against MRP**. | 2026 amendment in force 1 Jul 2026 (FACT) |
| **Foreign investment (later)** | The marketplace model allows 100% FDI, but a marketplace "will not directly or indirectly influence the sale price". Before any foreign money, the lawyer restructures pricing so that the dealer sets its price and POOL applies only uniform listing rules. | Press Note 2 (2018) (FACT) |
| **Dark patterns** | CCPA's 13 listed dark patterns include false urgency, drip pricing and bait-and-switch. They are covered by the one-figure price and the real-deadlines-only rule. | CCPA (FACT) |
| **Competition law** | • Bids stay sealed, award rules are fixed before each round, and no bid information is shared.<br>• Collusive bidding between dealers is presumed anti-competitive, so POOL watches for it (§19, question 18).<br>• The lawyer reviews the non-circumvention clause. | Competition Act 2002, s.3(3)(d) (FACT); lawyer |
| **Trademark** | Search "POOL" before any brand spending; keep two backups. | Old master §24, A17 |

**Not needed:** a payment-aggregator licence (POOL uses a licensed one), escrow of its own, lending, insurance, or rebate structures.

---

## 16. Product and technology — the lean build

**Principle:** build only what the first 100 orders actually use.

### 16.1 Surfaces (mobile web; no native apps)

- **Resident:**
  - registration (specifications and flexibility; never budget);
  - private Price Card with POOL Picks;
  - acceptance;
  - booking and balance through the payment company's checkout;
  - delivery code, with a named receiver if needed;
  - installation booking;
  - order tracker;
  - issue button;
  - Warranty Locker.
- **Dealer:**
  - lot bid form (dealer nets, step-downs, capacity, terms);
  - confirmation link;
  - order acceptance and slot booking;
  - dispatch with invoice upload;
  - settlement statement.
- **Operations console:**
  - communities and waves;
  - needs board (lot builder);
  - dealer qualification;
  - SKU catalogue and market-price log;
  - sealed rounds and the award engine (§5.4);
  - **pricing engine (§8.2)**;
  - orders and delivery scheduling;
  - settlement monitor;
  - commission invoices;
  - TCS/TDS ledger export;
  - issue desk;
  - scorecard and time log.

### 16.2 Data and engineering rules

**About 22 tables:**

`staff_users`, `communities`, `waves`, `residents`, `consents`, `needs` (specifications plus flexibility), `dealers`, `dealer_checks`, `skus`, `market_prices`, `lots`, `bids` (sealed), `awards`, `price_cards` (every rule input stored), `orders` (accepted snapshot plus hash, immutable), `order_events` (append-only), `payments`, `settlements`, `commission_invoices`, `tax_ledger`, `issues`, `audit_log`.

**Kept from the master:**

- Integer paise and a currency on every amount.
- UTC stored, IST displayed.
- Immutable snapshots.
- Idempotent acceptance and payment recording, so a retry never creates a second order or charge.
- Role-based access. Dealers see only their own bids, orders and settlements.
- **No budget field anywhere.**
- No server-side URL fetching except through allow-listed adapters.
- An audit log on every money or status change.
- Daily backups, with one restore test before go-live.

**Stack (DECISION):**

- TypeScript, React (Vite) mobile web, Node/Fastify, PostgreSQL.
- Managed hosting in an Indian region.
- Staff sign in with Google Workspace and 2FA.
- Residents and dealers sign in with a WhatsApp-verified phone plus signed magic links.
- Money only through the payment company's APIs. POOL never stores card data.

### 16.3 AI — the operations engine (every output is a *draft* that a person or dealer confirms)

| Feature | Input → output | Confirmed by |
| --- | --- | --- |
| SKU resolver | Link, screenshot, box or model plate → exact model and variant | Operations |
| Spec helper | Room size and use → suggested AC tonnage and star rating, with running-cost comparison (rule-based, not AI) | Resident decides |
| Bid reader | Dealer's WhatsApp text, voice note or photo → structured bid draft | **The dealer, by link** |
| Invoice checker | Dealer's invoice photo or PDF → checks price = community price, the right model and resident, and the GSTIN | Finance & compliance |
| Lot suggester | The wave's needs → proposed lot structure (§5.4) | Supply operations |
| Market-price helper | Listings → draft landed benchmark | Benchmarks & QA |
| Resident FAQ assistant | Answers only from the resident's card, the policies and their order; everything else goes to a human | Spot-checked |
| Operations copilot | Follow-up drafts, late-delivery flags, issue summaries | Operations |

**Guardrails:**

- **AI has no write access** to prices, orders, payments, settlements or invoices.
- Outside content is data, never instructions (protection against prompt injection).
- Every draft is stored with the model version and the person who approved it.
- No personal data goes to an AI provider without a data-processing agreement.

**WhatsApp:**

- The Business app from Week 0; the Business Platform application in Week 1.
- Service replies within the 24-hour window are free, and so are utility templates inside it (FACT).
- **No marketing templates.**

### 16.4 Build schedule

| Week | Deliverable |
| --- | --- |
| 1 | Data model, authentication, console skeleton, time log, needs board |
| 2 | Lots, sealed rounds, bid flow, SKU resolver |
| 3 | Award engine, pricing engine, Price Card, acceptance, booking payments (payment-company sandbox) |
| 4 | Orders, delivery codes, balance payments, split settlement and holdback, commission invoices, tax ledger, audit, backup/restore test, full rehearsal |
| 5–8 | Bid reader, invoice checker, lot suggester, FAQ assistant, Warranty Locker |
| 9–12 | Fixes chosen by measured pain only |

**Not being built:**

- POOLBACK;
- a randomisation engine;
- a wallet or POOL-held money;
- native apps;
- a national catalogue;
- retailer integrations beyond benchmarks;
- agent/UCP commerce;
- microservices or Kubernetes.

---

## 17. Metrics — one weekly scorecard, every Monday

| Block | Measures |
| --- | --- |
| **Funnel** | Registered → qualified → shown a listed price → accepted → confirmed → dispatched → delivered → installed → completed |
| **Pooling** | Share of flexible registrations; share choosing a POOL Pick; units per lot; lot types used; the four-price test results; headroom by lot type |
| **Buyer value** | Saving against the market per order (median and spread); share of models not listable; share lost to bank-card offers or flash sales; share lost to loan or cash needs |
| **Money** | GMV (never called revenue); difference per unit (₹ and % of dealer net); net commission; payment charges; refunds; settlement delays; holdback releases; TCS and TDS filed; contribution per unit |
| **Operations** | Minutes per unit; on-time delivery; installation within the window; installations per day against capacity |
| **Trust & safety** | Tickets opened and resolved; time to resolve; chargebacks; payment-safety and data incidents |

**Reporting rules:**

- Numerator and denominator on every number.
- Each community before any total.
- Nothing unknown counted as zero.
- Failed work counted as cost.
- Test orders never included.

---

## 18. Risk register — top 13

| # | Risk | Why it could kill POOL | Early signal | Response |
| --- | --- | --- | --- | --- |
| 1 | **Not enough headroom** (dealer net not about 7% below market) | Nothing can be listed | Gate 1 scan | Project pricing; value in installation kits; otherwise stop |
| 2 | **MOP on the dealer's own invoice** | Dealers can't invoice at the community price | Dealers refuse written confirmation | Only brands with confirmed room; value within the invoice rules; never help anyone hide prices from a brand |
| 3 | **Mixed demand** (residents rigid on brand and model) | Lots stay too small for step-downs | Low flexibility share; small lots | Flexibility capture, POOL Picks, zone lots, package bids (§5) |
| 4 | **Dealers refuse settlement through POOL's checkout** | POOL cannot collect its difference | Gate 1 supply answers | Release on the delivery code without a holdback; if still refused, stop |
| 5 | **Residents distrust an unknown checkout** | Low acceptance | Discovery answers; acceptance below 25% | Licensed payment company named on the card; money released only after delivery; community endorsement |
| 6 | **Installation delays by brand service networks** | Refunds for late goods; anger | Installation window misses | Capacity declared in bids; the holdback; buffers in the promise |
| 7 | **Payment-company dependency** (late onboarding, limits, account holds) | Orders stop | Onboarding slips past 30 Oct; settlement delays | Apply to two in Week 0; the second one live by Gate 2 |
| 8 | **Refunds or chargebacks after settlement** | Losses | Disputes | Recovery from the dealer's next settlements; the holdback; risk allowance |
| 9 | **Operations time too high** | Contribution shrinks | Above 120 minutes per unit | AI tooling; waves instead of one-off quotes |
| 10 | **Associations refuse access** | No distribution | Fewer than 2 permissions by Week 3 | Builders; interior designers; referrals |
| 11 | **Seasonal distortion** (festive sale prices; winter AC demand) | Wrong conclusions; low AC volume in the pilot | Scans inside and outside the sale; AC needs deferred | Re-scan after 15 November; plan pilot volume from fridges, washing machines and TVs; pre-summer AC wave in February 2027 |
| 12 | **Leakage** (dealers or residents go direct) | Volume leaks | Community sales outside POOL | Time-limited non-circumvention; the pooled demand exists only through POOL |
| 13 | **A funded copycat, foreign-investment pricing rules, or team time** | Distribution, funding or pace | Announcements; term sheets; Week 0 confirmations | Partner first; restructure pricing before foreign money; cut to 2 communities |

---

## 19. Hard questions — raised and decided

The founder asked two of these (§5.2, §5.3). Below are the rest: the questions a dealer, a resident, a lawyer or an investor will ask. Each has an answer, a label, and the section that carries it.

### 19.1 Headroom and price — the questions that decide everything

**1. Can a dealer really go about 7% below the best market price, when that price is often an online sale price?**

- EXAMPLE: a dealer's cost is ₹39,000 and the best online landed price is ₹42,500. To be listable, the dealer net must be at most ₹39,524 — only ₹524 (1.3%) above its cost, before its own delivery and installation costs.
- So a winning bid needs money from behind the price: quarterly brand volume incentives (1–3%, FACT, trade source), savings from batching, launch or festive schemes, or brand project pricing.
- **DECISION:** Gate 1 measures exactly this, through the four-price test and the project-pricing questions (§5.8, Appendix A). No headroom means nothing to list: stop (§20.5, Plan C).

**2. Is the founder's example — a ₹40,000 net against a ₹50,000 market price — realistic?**

- A 20% gap is bigger than a general-trade dealer's whole front margin on large appliances (10–15%, FACT, trade source). Even with every back-end incentive stacked, it would leave the dealer almost nothing. It can happen only when the "₹50,000" is not the real market price, or when a brand funds a project price.
- **DECISION:** plan for single-digit gaps. The pricing rule is built to work at about 7% (§8.2). A bigger gap is a bonus, never the plan.

**3. When the online sticker price is low, where can POOL still win?**

- **On the landed price.** Online prices often exclude installation, extra pipes and stands (ASSUMPTION; every scan records them).
- A new community has a few standard flat types, so the awarded dealer can quote one fixed **installation kit** per flat type and room (DECISION; TEST: dealer acceptance).
- The comparison is always landed price against landed price (rule 4).

**4. When do dealers bid lowest?**

- Near a quarter-end, when they are closest to brand targets that are paid quarterly (FACT, trade source).
- **DECISION:** the December sealed round runs in the second half of December. Step-downs may count every unit delivered to a community or zone lot within one calendar quarter, across waves (§5.5, §8.5).
- TEST: December bids compared with November bids for the same models.

**5. What happens to POOL's difference during a flash sale?**

- Before dispatch, POOL re-prices down by cutting its own difference, down to its floor. Below that, the resident may cancel free or move to the new card (§5.5, rule 5).
- This can cost POOL revenue in October–November. It is measured (§17), and the festive re-scan rule protects the gate (§14).

### 19.2 The money path

**6. Does the dealer really end up exactly at its bid?**

- Yes, for the whole core range. The §8.3 proof holds exactly when the product and POOL's commission carry the same GST rate. ACs, TVs, dishwashers, washing machines and refrigerators are all at 18% (FACT).
- **DECISION:** an item at another rate is listed only after the CA sets the split so the dealer's after-tax position still equals its bid.

**7. Who sets the price, and could POOL be accused of manipulating it?**

- The console computes the community price (§8.2). The dealer confirms it as its own selling price and invoices it.
- Rule 4 of the E-Commerce Rules bars manipulating prices to impose unjustified prices on consumers (FACT). A POOL listing is always below the best verified market price, with the evidence stored — the strongest possible answer.
- Before any foreign investment, the pricing is restructured (§15, §20.6).

**8. Should residents see how much POOL earns on their order?**

- **DECISION:** every card states how POOL is paid — a commission from the dealer, inside the price, between 5% and 7.5% of the dealer's net, never leaving the resident less than the minimum saving (rule 7, Appendix B).
- The exact rupee amount per order is not published. Price minus commission would reveal the winning dealer's sealed bid, which rule 8 protects.

**9. Card fees (an assumed 2%) are about five times UPI fees (0.4%). Should card payers pay more?**

- No surcharge, ever (§8.1).
- The booking is exactly ₹2,000, because UPI payments of ₹2,000 or less carry no fee (FACT).
- TEST: the card share is measured, and Gate 2 uses the measured payment cost, not the assumed 30% card share.

**10. What about EMI, consumer loans and cash?**

- **Card EMI** runs through the checkout, and the bank sets the interest. "No-cost" EMI is allowed only if the dealer or the brand funds it, shown as a separate line — never POOL-funded (rule 12).
- **Loans paid by a lender straight to the dealer** bypass POOL's checkout, so they are not offered in the pilot.
  - **DECISION:** if at least 20% of ready residents need them (Gate 1 reports this), the CA and the lawyer design a set-off flow before Phase 2, with POOL's commission deducted from the dealer's next settlements.
- **Cash:** never. It breaks the money-held-until-delivery promise and the automatic split. The loss is measured (`WANTS_CASH`).

**11. Why does POOL get paid last?**

- **DECISION:** POOL's difference is released only when the order completes: with the holdback, or 5 days after delivery for items without installation (§6.1, step 7).
- POOL earns only on completed orders, and a refund before completion never needs a commission reversal.

**12. Does holding money after delivery fit the payment rules?**

- Settlement timelines are set by the payment company's agreement, which must state them transparently (FACT). So release on the delivery code, and the holdback, are written into that agreement.
- A payment company may not accept payments for a seller not onboarded on the marketplace (FACT), so every dealer is onboarded before its first order.
- Refunds go back to the original payment method (FACT).
- TEST: the chosen payment company confirms in writing that it supports the holdback and the 45-day release for deferred installation.

**13. One basket, two dealers — does the resident pay twice?**

- No. Split products divide one customer payment among several sellers (FACT: Razorpay Route). Each dealer gets its own net, and POOL gets its difference.

**14. A resident refuses the delivery after dispatch. Who pays?**

- Rule 4 bars a platform from charging cancellation fees unless it bears similar charges when it cancels (FACT). POOL holds dealers to the same mirror.
- **DECISION:**
  - no charge before dispatch;
  - after dispatch, a resident who refuses delivery pays at most the dealer's disclosed return-transport cost, taken from the booking;
  - a dealer that cancels a confirmed order pays the resident the same amount.
- Defective, not-as-described or late goods are always refunded in full by the seller (Rule 6).

**15. What if the payment set-up is not live by 30 October?**

- From zero, incorporation, GST registration, a current account and payment onboarding run in sequence, and each can take one to two weeks (ASSUMPTION).
- **DECISION:** in Week 0, confirm whether a company exists and, if not, file that week; apply to two payment companies (§13). If split settlement is not live by 30 October, the live start moves (Gate 1, item 5).
- **There is no fallback where residents pay dealers directly.** POOL could not collect its difference, and residents would lose the money-held-until-delivery protection.

### 19.3 Dealers

**16. Why would a dealer sell below its own shop price?**

- Its alternative is not a walk-in at the shop price. These residents would otherwise buy online or from a chain, often during a festive sale.
- POOL brings pre-sold volume, batched delivery and installation, and units that count toward quarterly brand targets.
- TEST: Gate 1, item 2.

**17. Won't dealers inflate their bids, knowing POOL adds its difference on top?**

- Sealed competition stops it. With 3–5 bidders, a high bid loses to another dealer or cannot be listed.
- The rule also shares a lower bid with the resident (arithmetic, §8.2):
  - in the normal zone, every ₹1,000 a dealer cuts lowers the resident's price by ₹500;
  - at the 7.5% cap, it lowers the resident's price by the full ₹1,000 or more;
  - only on thin headroom, where the resident is held at the minimum saving, does the cut go to POOL first.

**18. Could local dealers collude on bids?**

- Collusive bidding is presumed anti-competitive under the Competition Act, s.3(3)(d) (FACT).
- **DECISION:**
  - invite dealers from across the 15 km radius, plus any chain store that will bid;
  - compare every bid with the market-price history;
  - if bids cluster just under the listing line, add new bidders in the next wave.
- POOL never shares bid information (rule 8).

**19. What if a bid looks too good to be true** (grey stock, a dealer buying the award, a shop about to fail)?

- **DECISION:** a bid more than 15% below the median of the other bids for the same model triggers a check of brand authorisation and stock before the award.
- A new dealer takes at most 10 units until it has completed 5 clean deliveries (§10.2).
- The exact model and variant are checked against the dealer's invoice (the SKU resolver and the invoice checker, §16.3).

**20. What if the awarded dealer fails or disappears mid-wave?**

- Money for undelivered orders is still with the payment company, so no resident loses money.
- The named backup takes the orders at the same resident price. Any higher net comes out of POOL's difference first, then out of the commitment reserve (§6.3, §12).

**21. What stops a side deal between a dealer and a resident?**

- EXAMPLE: the dealer sells directly to a registered resident at ₹41,500 — between its ₹40,000 net and the ₹43,000 community price. Both gain ₹1,500, and POOL loses ₹3,000.
- **Defences:**
  - the dealer net is never shown;
  - the dealer won the lot only through POOL, and loses every future wave if caught;
  - the time-limited non-circumvention clause (§10.2);
  - a resident who goes direct loses POOL's protections: money held until delivery, the refund path and the Warranty Locker.
- **DECISION:** accept some leakage, and measure it. Every registered resident who did not buy is asked where they bought (`BOUGHT_FROM_AWARDED_DEALER_DIRECT`). A dealer whose side sales pass 10% of its awarded volume is not invited again (§10.2).

**22. Will dealers accept waiting for their money?**

- They are paid by the payment company after delivery, not at the counter, and 10% waits for installation.
- TEST: Gate 1, item 2. If the holdback is refused, test release on the delivery code alone. If settlement through POOL's checkout is refused altogether, stop (§14).

### 19.4 Residents and the home

**23. Will residents buy ACs in November and December?**

- Hyderabad's AC season is February–May (§4), and the pilot runs in winter. Many move-in households will postpone ACs (ASSUMPTION).
- **DECISION:**
  - register AC needs with a "before summer" date;
  - plan the pilot's Gate 2 volume from fridges, washing machines and TVs;
  - run the first pre-summer AC wave in February 2027 (§20.2).
- Brands pay launch incentives on new models — 2–5% for the first three months (FACT, trade source) — which suits a pre-summer wave (TEST).

**24. The flat isn't ready and interiors delay installation. What then?**

- **DECISION:**
  - the delivery date is fixed at acceptance and must fall within 45 days (§6.1, step 5);
  - the resident can take delivery now and book an installation date within 45 days of delivery. The holdback is then released on installation or at 45 days, whichever comes first, and the dealer's duty to install on the booked date continues (§6.1, step 7);
  - a receiver can be named (a family member or the interior contractor), and the delivery code shared remotely.
- TEST: do brands honour free installation and the warranty when installation is deferred?

**25. Who is the buyer in investor-heavy projects?**

- Often a landlord furnishing a flat for rent: price-first, and sometimes buying for several flats (ASSUMPTION).
- **DECISION:** landlords are residents like any other, and their needs go into the same lots. TEST: the share of registrations from landlords (§13).

**26. Why would a resident trust an unknown name with ₹43,000?**

- Before delivery, the resident has paid only a refundable ₹2,000.
- The balance is paid at the door, after checking the box, into a licensed payment company — never to POOL, and never to a person.
- The seller is an authorised dealer, with its own invoice and the manufacturer's warranty.
- **If POOL itself shut down mid-wave,** bookings and unsettled balances would sit with the payment company, not in POOL's account, and delivered goods would keep the dealer's invoice and the brand's warranty. POOL's failure cannot spend a resident's money.

**27. Will residents use the card to bargain elsewhere?**

- Some will. If another seller beats a card price, the resident saves more — which is POOL's promise anyway (rule 5).
- It is measured (`BOUGHT_ELSEWHERE_CHEAPER`). Cards are private and carry the viewer's watermark (§6.1).

**28. The same model costs more in community B than in community A. Is that unfair?**

- Each community's price comes from its own sealed bids and delivery costs; the rule is the same everywhere. The card says so (Appendix B).

**29. Models change every year. What if a model disappears mid-wave?**

- **DECISION:** the SKU catalogue maps successor models. A successor is a new listing with its own price, never an automatic substitution.
- An accepted order is delivered as the exact model. If it cannot be, the resident chooses:
  - the successor at the lower of its card price and the accepted price (any gap comes out of POOL's difference first, then the commitment reserve); or
  - a full refund.

**30. The builder already has an appliance partner, and there is no elected association yet. Who decides?**

- At possession, the builder's handover or facility team is usually the gatekeeper (ASSUMPTION).
- **DECISION:** invite the builder's partner to bid like any dealer. POOL never claims exclusivity, and any builder fee is printed on the card and counted as acquisition cost (§10.1).

### 19.5 Scope, strategy and the team

**31. Will brands tolerate private community prices?**

- Brands enforce price floors on dealers (FACT, trade source). A community price that spreads publicly can get a dealer punished.
- Cards are private and watermarked, and only brands whose dealers confirm the community price in writing are listed (§10.2). POOL never helps anyone hide prices from a brand (§18).
- **The long-term answer is to bring brands in.** To a brand, a community wave can look like a builder's bulk project. TEST in Phase 2: will one brand give a POOL community project pricing (§20.2)?

**32. Can add-ons ever clear a ₹1,000 minimum saving?**

- On a chimney whose best market price is ₹12,000, ₹1,000 is over 8%. With POOL's 5% floor on top, the dealer net must be about 13% below the market price (arithmetic).
- **DECISION:** add-ons stay only if at least 20% of add-on lines clear §8.2 by the mid-pilot review on 27 November. Otherwise they are dropped (§6.4).

**33. MyGate and other community apps: partner or threat?**

- They own distribution in tens of thousands of communities (MyGate: 27,000, FACT). A copy by one of them is the biggest threat; a partnership is the fastest path to scale.
- **DECISION:** no approach before Gate 2 — without evidence, POOL has no leverage. After Gate 2, POOL offers itself as the operator behind their distribution: dealers, lots, pricing and settlement.

**34. When can POOL pay its people?**

- The pilot cannot: its expected contribution is about ₹76,000 (§14).
- EXAMPLE: at ₹1,277 contribution per unit (60 minutes of operations, §20.1), a team costing ₹10 lakh a month needs about 780 units a month. That is about 36 communities inside their possession windows at once (132 units over 6 months each, ASSUMPTION).
- **DECISION:** nobody is paid from the ₹10 lakh (§11). After a Gate 2 pass, POOL raises outside capital on the evidence.

---

## 20. After Gate 2: how POOL becomes huge

*Everything in this section happens only if Gate 2 passes.*

### 20.1 The honest arithmetic of "huge"

**At 10,000 delivered units a month** (average price ₹40,000 and average difference ₹2,500 — ASSUMPTIONS; the rest is arithmetic):

| Measure | Per year |
| --- | ---: |
| Sales through POOL (GMV — never revenue) | ≈ ₹480 crore |
| POOL net commission (revenue) | ≈ ₹25.4 crore |
| Contribution, at 60 minutes of operations per unit (≈ ₹1,277 per unit) | ≈ ₹15.3 crore |

- **From possession waves alone,** 10,000 units a month needs about **455 communities inside their possession windows at any one time** — about 900 new waves a year (132 units per community over 6 months, ASSUMPTION). No single city can supply that.
- **So the possession wave is the entry, and the seasonal wave is the business.** A community that trusted POOL at move-in can run a pre-summer AC wave and a festive wave every year.
  - EXAMPLE: 400 homes × 0.3 core units per home per year (replacements, upgrades, extra ACs — ASSUMPTION) × a 25% share = **30 units a year per mature community.**
  - 200 communities in possession (4,400 units a month) plus about 2,240 mature communities (5,600 a month) make 10,000 a month.
  - 2,240 communities is about 8% of the 27,000 that MyGate alone serves (FACT for the 27,000).
- **"Huge" therefore means many cities, thousands of communities, partners for distribution, and brands at the table.** The stages below earn each step with evidence.

### 20.2 Stages and triggers (DECISION)

| Stage | When | What happens | Trigger for the next stage |
| --- | --- | --- | --- |
| **1. Hyderabad depth** | Q1 2027 | • Hyderabad grows to 10 communities; Bengaluru goes live with 3.<br>• The first pre-summer AC wave, February–March, with the pilot communities as the first mature communities.<br>• The second payment company is live.<br>• Price off expected step-downs only where volume is proven (§8.5). | • 300 delivered units in one month.<br>• Measured contribution of at least ₹1,000 per unit.<br>• A seasonal wave in a mature community reaches at least 20% acceptance. |
| **2. Two-city repeatability** | Q2–Q4 2027 | • Operations at 60 minutes per unit or less.<br>• At least one brand gives project pricing.<br>• Capital raised on the evidence; hiring only against measured contribution. | • 1,000 units a month across two cities, 3 months in a row.<br>• Contribution covers the team. |
| **3. The network** | 2028 onwards | • 5 or more cities.<br>• Seasonal waves across the installed base.<br>• Distribution partners: community apps and builders.<br>• Sellers include dealers, chains and brands' own stores. POOL stays the bridge. | 10,000 units a month |

### 20.3 The flywheel

- **Volume:** more communities → bigger lots → better bids (step-downs, quarter-end timing, project pricing) → bigger savings → higher acceptance → more communities.
- **Data:** every wave adds headroom history by model, lot type and dealer → faster pricing and better lot design → lower operations cost per unit → more of each difference kept.

### 20.4 What never changes while scaling

- The twelve rules (§7): no buyer fees, no paid ranking, no lead selling, no fake urgency, and AI drafts only.
- POOL never holds stock or residents' money. Any seller can bid; none can buy placement.

### 20.5 Plan B and Plan C

- **Plan B** — residents do not convert, but headroom and supply are proven. Sell the same pooling engine to small businesses (PGs, co-living operators, clinics, offices), where concentration comes naturally.
- **Plan C** — there is no headroom. Stop. Nothing in this model survives without it.

### 20.6 Exit reality

- **Nobody buys a company with no transactions.** The first credible conversation needs two quarters of delivered orders, dealers who come back, and measured margins.
- **Foreign money needs one change first.** The marketplace model allows 100% foreign investment under the automatic route (FACT), but a marketplace "will not directly or indirectly influence the sale price" (FACT, Press Note 2). Before any foreign money, and with the lawyer's confirmation:
  - dealers bid the community price itself;
  - POOL takes one published commission rate from every seller;
  - "beat the verified market price by the minimum saving" stays as a uniform listing condition.

  The resident's experience does not change.
- **Natural partners and buyers:** community platforms, builders, appliance chains and brands. **Plan to be a partner first.**

### 20.7 POOLBACK stays parked

- Volume economics already reach POOL through step-downs, which raise its difference without touching the resident's price.
- A delayed buyer cashback would add accounting and legal weight for no new value.
- It is revisited only at 1,000 or more delivered units a month, with a structure the lawyer has approved.

---

## 21. Decision log — what changed from the four documents, and why

| # | Topic | Old documents | Final decision | Why |
| --- | --- | --- | --- | --- |
| 1 | Documents | Four files, 519 KB, circular references | **This one blueprint.** The four originals stay untouched, as reference; the master remains the engineering library for Phase 2. | One source of truth |
| 2 | Status | Field research NO-GO in all four | **GO; field work from 5 October** | Evidence only comes from the field |
| 3 | Cities | Four metros at once; none starts until all four are ready | **Hyderabad live; Bengaluru scans; Mumbai and Delhi wait** | Capacity and budget; evidence does not transfer |
| 4 | Products | Physical products of about ₹5,000 or more | **Core appliances; add-ons only in baskets, and only if they clear the rule** | Headroom arithmetic; exact identity; move-in fit |
| 5 | Channel | Generic community outreach | **Possession waves in 200+ home gated communities; seasonal waves later** | Concentration makes pooling real |
| 6 | Order model | One unit only | **Baskets; every line priced and honoured alone** | Move-ins buy several appliances |
| 7 | Payment | Prepay an unknown dealer; COD banned | **POOL's checkout, run by a licensed payment company: ₹2,000 refundable booking, balance at delivery, release on the delivery code, 10% installation holdback** | Trust, and the automatic split |
| 8 | **Revenue** | Dealer success fee after 8 settlement conditions, invoiced weekly | **The difference only, taken automatically at settlement as a commission. No fee to anyone.** *(Founder, 29 Sep 2026)* | ≈4× contribution per unit; nothing to chase |
| 9 | **Seller of record** | The dealer; POOL never takes title | **The dealer — kept. POOL is the bridge.** *(v2.1's reseller reading is reversed.)* | Founder correction; normal warranty; no stock; FDI stays possible |
| 10 | Pricing | None; merchants set prices | **The §8.2 rule; the dealer confirms the resulting price as its own** | Buyer first; margin protected; no MRP games |
| 11 | Volume risk | POOLBACK tiers | **Fixed resident price off the base bid; prospective step-downs, counted per quarter** | Protects residents; no credit notes |
| 12 | Allocation | Residents pick among dealers, so volume splits | **Lots with one winner each and a named backup; at most 3 dealers per wave** | Solves the Competition–Concentration Tension |
| 13 | Mixed demand | Deferred to a later test | **Lot types, flexibility capture, POOL Picks, zone lots and package bids; measured by the four-price test** | Real demand is mixed from day one |
| 14 | POOLBACK | OFF but fully specified | **Removed; parked** | Step-downs already deliver the volume economics |
| 15 | Mechanisms A/B | Thesis gates; B defined two different ways | **Headroom and volume measured directly** | Removes the contradiction |
| 16 | Experiment | Cluster-randomised design and a 23-field pre-registration packet | **Headroom scan plus a live pilot, with numeric gates** | The documents themselves conceded "descriptive only" |
| 17 | Research legal | 8 specialist reviews before any interview | **One-page consent, minimal data, deletion by March 2027** | Proportionate; DPDP duties start 13 May 2027 |
| 18 | Live legal | Specialist review before live commerce | **Company, GST as an e-commerce operator, TCS/TDS, split settlement, marketplace terms, a Rule 6 seller agreement, CA and trademark search — all before the first order** | POOL is a marketplace that collects payments |
| 19 | AI | None in the pilot | **AI operations engine; drafts only** | Cost per order |
| 20 | Tech scope | 74 tables and 15 state dimensions | **About 22 tables, one lifecycle, append-only events** | Pilot scale |
| 21 | Team | City leads at 40 hours; developers at 20 hours in total | **4 people in Hyderabad, including finance & compliance; 5 developers build** | Settlements, commission invoices and tax need an owner |
| 22 | Budget | ₹4 lakh first cycle; ₹6 lakh locked | **₹6.5 lakh spendable to Gate 2; ₹3.5 lakh locked; no stock float** | POOL never buys stock |
| 23 | Thresholds | max(₹1,000, 2%); coverage; acceptance | **Minimum saving inside the pricing rule; acceptance kept; headroom, settlement, price-floor, difference and contribution gates added** | Tests the whole business |
| 24 | Timeline | Relative windows only | **A dated 13-week plan with 2 gates** | Accountability |
| 25 | Never analysed | Competition, seasonality, MOP, EMI, interiors timing, quarter-end targets | **Built into the plan, the gates, the risks and §19** | Each one can decide the result |

---

## 22. Validation log — what changed from v2.1, and why

**How this version was checked (29 Sep 2026):**

- every section of v2.1 was re-read against the founder's bridge model;
- every number (the §8.2 table, §8.3, §8.4, the §14 funnel, the §12 total, the §19 and §20 figures) was recomputed by script, and every date checked for its weekday;
- every claim about the four source files was re-checked in the files themselves;
- every legal and market fact was traced to a named source (§23), or labelled ASSUMPTION or TEST.

| # | v2.1 said | Problem | v2.2 |
| --- | --- | --- | --- |
| 1 | POOL buys at the dealer's net price and sells to the resident; POOL is the seller | A misreading of the founder's model | **POOL is the bridge.** The dealer sells and invoices; POOL keeps the difference as a commission (§2) |
| 2 | The resident pays POOL; POOL pays the dealer within 3 working days | POOL would hold residents' money | A licensed payment company holds and splits the money; POOL never holds it (§6.1, §15) |
| 3 | POOL charges GST on its own sale and claims the dealer's GST as input credit; a "GST match" gate | Reseller tax logic | 18% GST on the commission, claimed back by the dealer; neutrality proof; TCS 0.5% and TDS 0.1% (§8.3, §15) |
| 4 | Inventory-entity duties (Rule 7) | Wrong rulebook for a marketplace | Marketplace duties (Rule 5) and the dealer's seller duties (Rule 6) (§15) |
| 5 | Foreign capital is barred while POOL is the seller | True for a seller; not for a bridge | Marketplace FDI is allowed, after one pricing change (§20.6) |
| 6 | Volume tiers settled by credit note between businesses at the end of the window | Money to chase after the sale | Prospective step-downs, counted per quarter; no credit notes (§8.5) |
| 7 | One awarded dealer per SKU; no answer for mixed models or brands | Real demand is mixed | Lots, flexibility capture, POOL Picks, zone lots, package bids; the four-price test (§5) |
| 8 | ₹2 lakh revolving float; ₹2 lakh locked | A float is only needed to buy stock | No float; ₹1 lakh commitment reserve; ₹3.5 lakh locked (§12) |
| 9 | Gates on GST matching, warranty and spread | Reseller gates | Gates on settlement acceptance, the price floor on the dealer's invoice, Rule 6 refunds and a difference of at least 5% (§14) |
| 10 | Brand confirmation that the warranty covers resold units | Only needed for resale | Removed: the dealer's own invoice carries the normal warranty |
| 11 | "Those households buy 3–6 appliances at once" | Stated as a fact without evidence | "Usually need several appliances" (ASSUMPTION); 2.2 units per household in the model (§1.1, §4, §8.4) |
| 12 | About 19 tables | Missing lots, awards, settlements and tax records | About 22 tables (§16.2) |
| 13 | Gate 1's festive exception: re-scan if the gap comes from "festive bank offers" | Rule 4 already keeps bank-card offers out of the market price, so they cannot cause the gap | Re-scan if the gap comes from time-limited festive sale prices (§14) |

**Weaknesses found while re-checking the v2.2 draft itself, and fixed before release:**

| # | Weakness | Fix |
| --- | --- | --- |
| 14 | "Re-priced down" before dispatch had no limit, so it could push POOL's difference below zero | Re-pricing only down to POOL's floor; below that, cancel free or move to the new card (§5.5) |
| 15 | POOL's difference was released at the same time as the dealer's | Released last, with the holdback; POOL earns only on completed orders (§6.1) |
| 16 | "The dealer receives exactly its bid" was stated for every item | Exact only when the product is taxed at 18% like the commission. The core range is all at 18% (verified); other rates need the CA's split (§8.3) |
| 17 | No answer for flats under interior work, and no limit on delivery dates | Delivery within 45 days; deferred installation with a 45-day holdback limit; a named receiver (§6.1) |
| 18 | The pilot runs in winter, when AC purchases are postponed | "Before summer" AC registration; pilot volume planned from other categories; a pre-summer wave (§18, §19, §20) |
| 19 | No policy for EMI, loans or cash | Card EMI yes; lender-paid loans measured first; cash never (§10.3, §19) |
| 20 | No guard against collusion, too-good bids or side deals | Exposure limits and a collusion watch (§10.2, §15, §19) |
| 21 | Add-ons kept without checking they can clear the minimum saving | A 20% clearance test by 27 November (§6.4) |
| 22 | One payment company on the critical path, and no check on whether a company exists | Company check in Week 0; two payment applications (§13) |
| 23 | No cancellation rule after dispatch | A mirror rule for residents and dealers (§19, question 14) |

**Claims about the four source files, re-checked on 29 Sep 2026 — all hold:**

- 519,392 bytes and 69,264 words in total;
- the same two boilerplate lines repeated 22 times in the workbook;
- 74 tables in master §27.2, 8 of them for rebates (POOLBACK);
- zero occurrences of "MOP", "festive", "Diwali", "season" and "MyGate".

---

## 23. Sources (checked 28–29 September 2026)

**Checks on the four source files:**

- Sizes, word counts and dates were read from the files themselves.
- The master's SHA-256 (`6E8895A6…C8DC`) matches the hash recorded in EXEC-1.0.
- The checklist's 125-line instrument block is identical to master lines 1783–1966.
- 74 tables were counted in master §27.2, 8 of them in the rebate group.
- The pre-registration packet has 23 fields.
- "MOP", "festive", "Diwali", "season" and "MyGate" occur nowhere in the four files.

**Competitors:**

- PriceMela — <https://pricemela.com/sellers>
- Wantd — <https://www.wantd.in/>
- Wantoo — <https://www.wantoo.in/>
- CrowdTag — <https://crowdtag.ai/>
- MyGate raises ₹225 crore (YourStory, 10 Jun 2026) — <https://yourstory.com/2026/06/mygate-raises-rs-225-cr-from-dharana-capital>
- MyGate blog on community group buying (20 Mar 2024) — <https://mygate.com/blog/housing-society/community-group-buying/>

**Consumer, contract and competition law:**

- E-Commerce Rules 2020, Rule 4 — <https://www.consumerprotection.in/rule-4-duties-of-e-commerce-entities/>
- E-Commerce Rules 2020, Rule 5 — <https://www.consumerprotection.in/rule-5-liabilities-of-marketplace-e-commerce-entities/>
- E-Commerce Rules 2020, Rule 6 — <https://www.consumerprotection.in/rule-6-duties-of-sellers-on-marketplace/>
- Indian Contract Act s.215 — <https://indiankanoon.org/doc/1346870/> and s.216 — <https://indiankanoon.org/doc/253878/>
- Competition Act 2002, s.3(3) — <https://indiankanoon.org/doc/1885813/>
- CCPA dark-patterns advisory (7 Jun 2025) — <https://www.pib.gov.in/PressReleasePage.aspx?PRID=2134765>
- Legal Metrology (Packaged Commodities) Amendment Rules 2026 — <https://www.scconline.com/blog/post/2026/02/21/legal-metrology-packaged-commodities-amendment-rules-2026-explained/>
- DPDP Rules 2025 (PIB) — <https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/nov/doc20251117695301.pdf>
- DPDP phased timeline — <https://www.sansalegal.com/post/dpdp-act-2023-and-rules-2025-phased-implementation-timeline-and-business-compliance-deadlines>

**Foreign investment:**

- Press Note 2 (2018), marketplace conditions — <https://www.dpiit.gov.in/static/uploads/2025/07/2959b696766693441f5eb45d3eb49f97.pdf>
- FDI in e-commerce (PIB, 11 Dec 2019) — <https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=1595850&reg=48&lang=2>

**Tax:**

- CGST s.52, TCS — <https://taxguru.in/goods-and-service-tax/gst-tcs-commerce-operators-section-52-gstr-8-0-5-percent-rate.html>
- CGST s.24, compulsory registration — <https://taxguru.in/goods-and-service-tax/compulsory-gst-registration-section-24-cgst-act-2017.html>
- Income-tax s.194-O, TDS — <https://cleartax.in/s/section-194o>
- GST on ACs, TVs and dishwashers, 28% → 18% from 22 Sep 2025 — <https://upstox.com/news/personal-finance/tax/new-gst-rate-for-air-conditioners-ac-t-vs-and-dishwashers-all-you-need-to-know/article-180717/> and <https://shop.haierindia.com/blog/gst-rate-ac-tv-washing-machine-appliances/>
- GST on refrigerators and washing machines, 18% — <https://tallysolutions.com/gst/hsn-code-for-ac-refrigerator-washing-machine-home-appliances-gst-rate-guide/>

**Payments:**

- RBI Master Direction on Payment Aggregators (15 Sep 2025) — <https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=12896>
- UPI merchant fee from 15 Oct 2026 (Ministry of Finance FAQ) — <https://financialservices.gov.in/sites/default/files/2026-09/FAQs---Merchant-Discount-Rate--MDR--on-Select-UPI--P2M--Transactions_0.pdf>
- Razorpay Route (split payments to sellers, deferred settlement) — <https://razorpay.com/route/>
- PayU aggregator and marketplace settlement — <https://docs.payu.in/docs/aggregator-or-marketplace-settlement-solution>

**Trade practice:**

- Dealer margins and incentive schemes (Alok Kapoor Advisory, 20 Jan 2026) — <https://alokkapoor.com/blog/distribution-margins-india-what-brands-need-to-know>
- MOP as a brand-set price floor — <https://ppms.in/blog/what-is-the-meaning-of-mrp-mop-or-srp/>

**Timing and tools:**

- Amazon Great Indian Festival 2026 dates — <https://www.fonearena.com/blog/492788/amazon-great-indian-festival-2026-date.html>
- Diwali 2026 dates — <https://samvat.in/festivals/diwali-2026/>
- Amazon Creators API — <https://affiliate-program.amazon.in/creatorsapi/docs/en-us/introduction>
- Flipkart Affiliate API — <https://affiliate.flipkart.com/api-docs/af_register.html>
- WhatsApp Business pricing — <https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing>

**Not verified; must be checked by people:**

- trademark availability of "POOL";
- the number and timing of possession-stage communities in Hyderabad, and who controls access at possession;
- **dealer nets (the headroom) and the four-price test**;
- brands' price-floor (MOP) policies on the dealer's invoice, and project pricing;
- the payment company's approval time, card fees, settlement cycle, holdback support and chargeback terms;
- whether brands honour free installation and the warranty when installation is deferred;
- GST rates for chimneys, hobs, water purifiers, geysers and microwaves;
- the CA's confirmation of TCS, the TDS base, the commission's tax code and the rule for composition dealers;
- team availability, and whether a company already exists.

---

## Appendix A — Dealer discovery questions (research only, non-binding)

Open with the dealer consent script (§15.1).

1. **Supply.** Which of these 20 models can you supply and install in [community]? What stock and lead time? Who installs — you or the brand's service network? How many installations a day?
2. **The bridge.** You sell and invoice the resident at the community price. The resident pays through POOL's checkout, run by a licensed payment company. After delivery, the payment company pays you your net automatically. POOL keeps the difference as a commission, invoiced to you with GST, which you claim back. Would you sell this way?
3. **Your net, with no minimum.** What is your net per unit — all-in, delivered and installed — with no minimum quantity?
4. **The four-price test.** What is your net for: (a) one unit; (b) 20 units of the same model; (c) 20 units of the same brand, mixed models; (d) 20 units of mixed brands (multi-brand dealers only)?
5. **Where the saving comes from.** What becomes cheaper for you with a community's volume: delivery, installation, selling cost, quarterly brand targets, launch or festive schemes? Can the brand give project pricing for a community wave?
6. **Price floors.** Does any brand policy (MOP) limit the price on your invoice to the resident? Will you confirm in writing that the community price is allowed?
7. **Installation kits.** For this community's flat types, can you quote one fixed price per room for pipes, stands and standard extras?
8. **Settlement.** Will you complete KYC with our payment company? Will you accept release on the resident's delivery code, with 10% held until installation (or up to 45 days if the resident defers installation), and TCS and TDS deducted as the law requires?
9. **Seller duties.** Under Rule 6 you refund defective, not-as-described or late goods. What are your DOA, replacement and return terms, and who pays return transport? Who is your grievance officer?
10. **Repeat.** Would you bid again for the next community at the same or a better net? What would make you stop?

Record the exact answers, the evidence shown, and a refusal code (Appendix C). **Never invent a buyer to get a price. Never reveal another dealer's price.**

## Appendix B — Price Card (what a resident sees)

> **[Brand] [exact model] — [variant, capacity, star rating]**
>
> **Seller:** [dealer's legal name], authorised [brand] dealer — [address], GSTIN [__], customer care [__]. Verified by POOL on [date]. **Marketplace:** POOL [legal company name].
>
> **Community price (all-in): ₹[__]** = item ₹[__] (never above MRP) + delivery ₹[__] + standard installation ₹[__] (includes [materials]); taxes included. **Installation kit for your flat type** ([type, room]): ₹[__], fixed. Any other extra is priced before you order.
>
> **Market price:** best verified landed price ₹[__] at [source], checked [date, time]. **You save ₹[__].** Bank-card offers, if any: [__] (shown separately).
>
> **How POOL is paid:** the dealer pays POOL a commission. It is already inside this price — you pay nothing extra. It is between 5% and 7.5% of what the dealer receives, and it never leaves you less than ₹[minimum saving] below the best market price we verified. Your price does not depend on how many others buy. Prices are set per community, from that community's own sealed dealer bids.
>
> **Delivery by:** [date] (within 45 days of acceptance). **Installation:** within [__] of delivery, or on a date you book within 45 days of delivery.
>
> **Warranty:** manufacturer's [__], on the dealer's invoice, kept in your Warranty Locker.
>
> **Returns:** defective, not as described, or delivered after the promised date → refund or replacement from the seller. Change of mind: free cancellation until dispatch; after dispatch, at most [the dealer's disclosed return-transport cost].
>
> **Payment:** ₹2,000 booking now through POOL's checkout, run by [licensed payment company]; refundable until dispatch. The balance is paid at delivery through the same checkout, by UPI or card (card EMI where your bank offers it). Your money reaches the dealer only after you give your delivery code. Never pay cash, and never pay a personal account.
>
> **Valid until:** [date]. **Offer version:** [__]. **Viewer:** [community] · phone ending [__].
>
> **Help:** POOL desk [WhatsApp], 10:00–19:00 Mon–Sat; a ticket number for every complaint. Grievance officers: POOL [name, email]; seller [name, email].

## Appendix C — Codes

- **Dealer refusal:** `MODEL_NOT_AVAILABLE`, `OUT_OF_STOCK`, `AREA_NOT_SERVED`, `PRICE_FLOOR_MOP`, `WONT_SETTLE_VIA_POOL`, `HOLDBACK_REFUSED`, `NO_INSTALL_CAPACITY`, `KYC_NOT_COMPLETED`, `GST_FILING_ISSUE`, `NOT_ECONOMIC`, `TOO_MUCH_EFFORT`, `NO_REASON`, `NO_RESPONSE`.
- **Resident decline:** `PREFERS_ONLINE_DESPITE_SAVING`, `SAVING_TOO_SMALL`, `CHECKOUT_TRUST`, `SELLER_TRUST`, `WANTS_CASH`, `NEEDS_LENDER_EMI`, `DELIVERY_TIMING`, `INTERIORS_NOT_READY`, `WARRANTY_CONCERN`, `WRONG_MODEL`, `BRAND_NOT_LISTED`, `NOT_LISTABLE`, `BOUGHT_FROM_AWARDED_DEALER_DIRECT`, `BOUGHT_ELSEWHERE_CHEAPER`, `POSTPONED`, `NO_LONGER_NEEDED`, `NO_RESPONSE`.
- One primary code, optional secondary codes, and the person's own words. A non-response is never read as a reason.

---

*Founder's operating commitment, kept from the original master: tell the truth about demand, prices, dealer behaviour, buyer outcomes and the company's economics — even when the evidence says stop.*
