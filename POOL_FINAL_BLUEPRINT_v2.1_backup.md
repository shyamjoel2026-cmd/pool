# POOL — Final Blueprint

**Before you buy it, POOL it.**

| | |
| --- | --- |
| Version | **2.1 — FINAL.** Replaces `POOL_MASTER_SPEC.md` (v1.1), `POOL_FOUNDER_DECISION_WORKBOOK.md`, `POOL_FINAL_EXECUTION_PLAN.md` (EXEC-1.0) and `POOL_G2_G3_READINESS_CHECKLIST.md`. Where anything in those four files conflicts with this one, this one wins. |
| Change in 2.1 | **Revenue model corrected by the founder on 29 September 2026.** POOL charges no fee to anyone. It buys in bulk from dealers and earns the difference between the dealer's bulk price and the price the buyer pays. §1.3 explains what this changes. |
| Date | 28–29 September 2026 |
| Decision owner | Founder. The decisions below were made under the founder's delegation, after two complete readings of all four documents. |
| Status | **GO.** Week 0 set-up starts now. Field research starts **Monday 5 October 2026**. Live sales need Gate 1, a registered company with GST, and the legal package first. Target date: **Monday 2 November 2026**. |
| Market evidence to date | **None.** No dealer or buyer has been contacted. Every number in this document is one of the four labels below. |

**Labels used in this document**

- **FACT**: checked against a primary or named source on 28–29 Sep 2026 (listed in §19), or checked directly in the four source files.
- **DECISION**: a founder choice. It can only be changed through the decision log (§18), with a reason and a date.
- **ASSUMPTION**: a planning number. Measured data replaces it at Gate 2.
- **TEST**: a question that the pilot must answer with evidence.

**How to read this document:**

- §1–3: the verdict, the founder's correction, and the strategy.
- §4–8: how the business works.
- §9–12: the team, money, the dated plan and the gates.
- §13–16: legal, the product build, metrics and risks.
- §17–19: what comes after the pilot, the decision log and sources.

---

## 1. Verdict on the four documents

### 1.1 What is broken

1. **The process replaced the product.** The four files hold 519 KB and about 69,000 words, all written on 27–28 September 2026. All four end with the same status: *field research NO-GO*. No dealer or buyer was contacted. The master's own freeze decision says: *"stop rewriting the master and gather the next evidence."* What followed was three more files (246 KB of process), not field work. *(FACT: file sizes and text checked.)*
2. **Duplication and circular references.**
   - The checklist's instrument block (125 lines) is a word-for-word copy of the master. *(FACT: checked by diff.)*
   - The workbook repeats the same owner/date/status boilerplate 22 times.
   - Every workbook decision points to EXEC-1.0, which points back to the master and the checklist.
3. **The core thesis contradicts itself.** The master defines *Mechanism B* as the "Realized Volume Effect" (§1, §22, risk A23). EXEC-1.0 §2 uses the same label for "Merchant Economic Acceptance". *(FACT.)*
4. **The scope is bigger than the budget and team can carry.** The plan covered four metros at once, up to eight lanes, and every physical product above ₹5,000. Against that:
   - the first cycle had ₹4 lakh;
   - each city lead had 40 hours for about 30 interviews and 60 invitations;
   - the five developers had 20 hours in total;
   - no city could start until all four were ready. *(FACT: EXEC §4–6.)*
5. **The value threshold rules out most of the product range.** The buyer-value test is max(₹1,000, 2%). At ₹5,000 that means a 20% saving. EXEC §12 points this out and keeps both rules anyway. *(FACT.)*
6. **Nothing was chosen.** There is no SKU, no locality, no community, no dealer and no calendar date. All are "discovery outputs". A field team cannot work from "UNKNOWN".
7. **The chosen channel contradicts the order model.** The master says to start with "apartment possession, relocation, housing communities". Those households buy 3–6 appliances at once. Yet §3.3 allows only one item per order. *(FACT.)*
8. **The payment rules make the biggest risk worse.** The documents name buyer trust as a top risk (§20.4, §22.3, A25). They then make buyers prepay an unknown dealer and ban pay-on-delivery. The only stated reason is settlement accounting (§33.2). *(FACT.)*
9. **Revenue arrives late and depends on dealers being honest.**
   - The fee is only recognised after eight settlement conditions are met.
   - It is then invoiced weekly with seven days to pay.
   - The spec itself admits "collection risk remains" (§23.1). *(FACT.)*
10. **The design fights its own volume logic.** Buyers choose among competing dealers, so volume splits across them, while volume discounts need it concentrated. The master names this the "Competition–Concentration Tension" (§4.1) and leaves it unsolved. *(FACT.)*
11. **A switched-off feature shapes the whole design.** POOLBACK is OFF, yet it accounts for 8 of the 74 database tables, the cohort rules and most of the worked economic cases. *(FACT: tables counted in §27.2.)*
12. **Research is blocked by legal ritual.** Before anyone may talk to a shopkeeper, the plan requires eight "specialist review" dispositions, a retention period for every data class, and a restore drill. India's DPDP substantive obligations apply from **13 May 2027** (FACT). Good data practice is needed now; a legal committee is not.
13. **The experiment design is theatre.** A cluster-randomised design over 10–40 dealer shops can only ever be "descriptive" — the documents admit this themselves. *(FACT.)*
14. **Competition is never analysed.**
    - PriceMela (Bengaluru) is building the old spec's exact model: sealed offers, buyer pays the seller directly.
    - Wantd claims 1,200+ closed deals.
    - MyGate, with 27,000 communities, is not mentioned at all. *(FACT: §7.)*
15. **AI is missing where it matters.** The documents keep AI out of the pilot (§32.1, §34.1), while the team has five developers.
16. **Four things that decide the outcome are never mentioned:**
    - brand price floors (MOP);
    - the festive season;
    - GST input credit;
    - brand warranty through resellers. *(FACT: zero occurrences of "MOP", "festive", "Diwali", "season", "input credit", "ITC" or "reseller".)*

### 1.2 What is right (kept, in condensed form)

- **The rules that protect buyers:**
  - one firm price;
  - an accepted price never goes up;
  - all-in landed prices;
  - an unknown charge is never treated as zero;
  - no fake MRP savings;
  - sealed quotes;
  - POOL never asks for the buyer's budget;
  - no lead reselling;
  - AI never sets prices or terms.
- **Operating basics:** merchant verification, price-evidence discipline, unit economics that count failed work and founder time, stop discipline, and refusal coding.
- **Engineering rules:** money in paise, an immutable accepted snapshot, idempotent acceptance, an audit trail and tenant isolation.

### 1.3 The founder's correction (29 Sep 2026) — what it changes

**The model (DECISION).** POOL charges no fee to buyers or dealers.

- POOL buys from a dealer at a bulk price. For example, **₹40,000** per unit because the community brings volume.
- POOL sells to the resident at a POOL price. For example, **₹43,000**, against a market price of ₹50,000.
- **The difference is POOL's profit.**

**Why this is stronger than the old fee model:**

1. **About 4× more contribution per unit** (§6.3: ≈₹1,534 against ≈₹361).
2. **No fee to chase.** The buyer pays POOL, and POOL pays the dealer. Under the old model, POOL had to invoice dealers and hope they paid.
3. **It fixes flaw 10.** POOL, as the single buyer, gives each item's community order to **one** dealer. Volume concentrates, and so does the bulk discount.
4. **For dealers it is simpler.** One bulk customer, one invoice, one payer.

**What it costs (planned for in this blueprint, not wished away):**

- **POOL becomes the seller of record.** That brings:
  - the e-commerce rules for sellers, including refunds for late or defective goods (§13);
  - GST registration and invoicing;
  - input-credit risk;
  - seller liability;
  - brand-warranty questions;
  - collecting money for its own sales;
  - a limit on foreign investment while POOL holds this model (FACT: §13).
- **POOL never says it negotiates on the buyer's behalf.** An agent who secretly keeps a margin can have the deal set aside (FACT: Contract Act s.215–216). POOL sells as a retailer and states that its margin is included in the price.

**Founder's challenge to the example (TEST).** The ₹50,000 must be the **best real market price**: the landed online or store price on the day. It must never be the MRP.

- If the AC really sells online at ₹44,000, then a ₹40,000 dealer price still works: the buyer pays ₹42,000 and saves ₹2,000.
- If the dealer's bulk price is not at least **about 7% below the real market price**, the item cannot be sold at all (§6.2).
- That gap is the single most important number the pilot must measure.

---

## 2. What POOL is

**One sentence.** POOL pools the demand of residents moving into new gated communities, buys big-ticket home appliances in bulk from authorised dealers, and sells them to residents at a community price below the best market price. It keeps a small, capped margin and charges nobody a fee.

| To whom | The promise |
| --- | --- |
| **Residents** | • The exact model at one all-in price (delivery, standard installation, taxes and every mandatory charge), below the best verified market price.<br>• Your price never depends on how many others buy.<br>• Delivered and installed by an authorised dealer, with the manufacturer's warranty.<br>• Pay POOL a small refundable booking, and the balance on delivery.<br>• One number to call.<br>• We never ask your budget.<br>• If a verified cheaper option exists, we match it or tell you. |
| **Dealers** | • One bulk customer (POOL): one tax invoice, one payer, paid within 3 working days of delivery.<br>• Real volume from one address, with batched delivery and installation.<br>• **No fees, no commissions, no listing or lead charges.** |
| **POOL** | Earns only the difference between the dealer's bulk net price and the POOL price. That margin is kept between 5% and 7.5% of POOL's cost (§6.2). |

**What POOL is not:**

- not a marketplace charging commissions;
- not a payment company (it collects only for its own sales);
- not "wait until 50 people join" group buying (the buyer's price is fixed; POOL carries the volume risk);
- not a product catalogue;
- not a rebate or cashback scheme.

---

## 3. The wedge, and the logic behind it

**Who (DECISION).** Households taking possession of homes in large new gated communities (200 homes or more), plus recent movers there.

**What (DECISION).**

- **Core categories:** split ACs, refrigerators, washing machines and TVs. Dishwashers on request.
- **Add-ons, only inside a household basket:** chimney, hob, water purifier, storage geyser, microwave.
- **Excluded:** phones and laptops, furniture and mattresses, used/refurbished/open-box goods, and services.

**Where (DECISION).**

- **Hyderabad** is the only city with live operations in 2026, starting with 3 communities. It was the home market in the original master, and one founder can personally close dealers and communities in one city.
- **Bengaluru:** price scans only in 2026. It goes live in Q1 2027, and only after Gate 2.
- **Mumbai and Delhi:** no spending in 2026.

**Why this wedge — each step depends on the one before it:**

1. **Bulk buying only works when demand is concentrated in one place and one period.** A possession wave is exactly that: hundreds of households at one address, in the same weeks, needing the same categories.
2. **Concentration lowers the dealer's real costs:**
   - one negotiation;
   - one bulk customer;
   - batched delivery and installation in the same towers;
   - near-zero marketing cost.

   Those savings are what fund both the buyer's discount and POOL's margin.
3. **POOL, as the single buyer, gives each item to one dealer per community window.** Volume stops splitting across dealers — the old documents' unsolved problem (§1.1, item 10).
4. **Baskets multiply the value.** One household buys 3–6 appliances, so savings and margin are earned per basket.
5. **Distribution is cheap and permitted.** POOL reaches residents through an association or builder handover desk, and each resident opts in individually. This also plays to the founder's network.
6. **Exact model numbers exist in these categories,** so the comparison is precise and residents can check it.
7. **Why not the other options:**
   - **Phones and laptops:** tight brand price floors, online already dominates, and Wantd targets them.
   - **Furniture:** the same product cannot be identified across sellers.
   - **"Everything above ₹5,000":** cheap items cannot carry a saving and a margin.
8. **Why one city:** the ₹10 lakh budget, one founder's reach, and the old documents' own rule that evidence does not transfer between cities.

**Seasonality (FACT).**

| Date | Event |
| --- | --- |
| 8 Oct 2026 | Amazon Great Indian Festival starts |
| 9 Oct 2026 | Flipkart Big Billion Days starts |
| 15 Oct 2026 | 0.4% fee (MDR) starts on UPI payments to merchants above ₹2,000 (§13) |
| 6 Nov 2026 | Dhanteras |
| 8 Nov 2026 | Diwali |

- October brings the year's biggest online sales. That makes it the hardest benchmark, and the price scan runs through it on purpose (§11).
- February–May is AC season. ACs are likely the largest move-in category by value (ASSUMPTION; the pilot will measure it).

---

## 4. How it works

### 4.1 Flow A — Community Price Card (primary flow)

1. **Community partnership.** POOL gets written permission from the residents' association or the builder's handover team for two things: a POOL desk on possession days or weekends, and one official message carrying the POOL link. Each resident opts in individually.
2. **Need registration (two minutes).** The resident gives:
   - their tower (not the flat number, until delivery);
   - their possession month;
   - the categories they need;
   - any exact models;
   - their timing.

   There is no budget question.
3. **Sealed procurement round.** POOL sends 3–5 verified dealers a list of 25–40 SKUs, together with anonymous demand counts. For example: "212 homes, possession Nov–Jan, 64 need an AC."
   - Each dealer bids a **net price to POOL**. The price is all-in: delivered and installed at the resident's home, with a GST tax invoice billed to POOL.
   - A dealer may add volume tiers, settled by a credit note at the end of the window.
   - Each bid also states stock, lead time, who installs (dealer or brand service), the warranty position, the dead-on-arrival (DOA) and replacement terms, and the payment terms.
   - The dealer confirms by link.
   - POOL awards each SKU to the lowest bid that meets the service and compliance terms, and names the runner-up as backup.
4. **POOL prices each SKU using the rule in §6.2** and publishes a private Price Card for verified residents (a signed link, watermarked with the community's name; never posted publicly). For each SKU it shows:
   - POOL's all-in price;
   - the best verified market price, with a timestamp;
   - the saving;
   - what is included;
   - POOL's delivery promise;
   - warranty and returns.

   **If an SKU cannot beat the market by the required margin, the card says so and shows where it is cheaper.**
5. **Resident orders.**
   - The resident accepts the exact offer version, which is frozen as a snapshot.
   - The resident pays a **₹2,000 booking** by UPI link. It is refundable until dispatch.
   - POOL sends the awarded dealer a purchase order: **billed to POOL, shipped to the resident**.
   - The dealer confirms the delivery slot within 4 service hours.
   - The dealer delivers. **The resident pays POOL the balance** by UPI or card link, and the dealer installs.
   - The resident confirms in the POOL link.
6. **POOL invoices and settles.**
   - POOL issues its tax invoice to the resident.
   - POOL pays the dealer **within 3 working days of confirmed delivery**, against the dealer's valid tax invoice.
7. **Follow-through.**
   - POOL chases installation and runs the issue desk.
   - The **Warranty Locker** stores POOL's invoice, the dealer's invoice and the warranty card for the resident.

### 4.2 Flow B — Quote Request (secondary flow)

For a model that is not on the card:

- POOL runs a 24-hour sealed procurement round with 3–5 dealers.
- The item is priced by the same rule and ordered the same way.
- If it cannot be listed, the resident is told within 24 service hours, together with the best market option.

### 4.3 Service levels (DECISION)

| Item | Commitment |
| --- | --- |
| Service hours | 10:00–19:00 IST, Monday–Saturday. Staffing for Diwali week is published in advance. |
| First human reply (WhatsApp) | Within 1 service hour |
| Quote Request result | A price, or "not listable, here is the cheaper option", within 24 service hours |
| Dealer slot confirmation | Within 4 service hours of the purchase order. If the dealer fails, the backup dealer steps in at POOL's cost. The resident's price never changes. |
| **Delivery promise** | POOL's promised date = the dealer's committed date **plus 2 days**. If POOL misses its own promise, the resident may cancel for a full refund (E-Commerce Rules, Rule 7 — FACT, §13). |
| Complaints | Acknowledged the same service day (legal maximum 48 hours). Resolved or escalated to the founder within 7 days (legal maximum for redress: one month). |

### 4.4 Basket rules (DECISION)

- Every line has its own price, honoured if it is bought alone.
- POOL may add a **basket discount** (for example "₹1,500 off AC + fridge + washing machine"). It is paid from POOL's margin or the dealer's basket bid, shown as a separate line, and guaranteed only when all lines are accepted together.
- If a line is cancelled later, the per-line prices apply to what remains. This is shown before acceptance.
- **What other households buy never changes your price.**

### 4.5 Order lifecycle (DECISION)

**Resident side:** `REQUESTED → PRICED → ACCEPTED (booking paid) → PO_PLACED → DEALER_CONFIRMED → DELIVERED (balance paid) → INSTALLED (if included) → COMPLETED`

- **Exits:** `CANCELLED` (booking refunded) and `RETURNED` (refund under the policy shown at acceptance).
- **Flags:** `PAYMENT_DUE`, `LATE`, `ISSUE_OPEN`, `DISPUTE`.

**Dealer side:** `PO_ISSUED → DELIVERED → INVOICE_RECEIVED → PAID`, plus `ITC_MATCHED` once POOL's GST input credit is reconciled.

- Every change is an append-only event recording who, when and what evidence.
- The accepted snapshot is never edited.

---

## 5. The twelve rules POOL never breaks

1. **One firm price.** POOL's price is valid for you alone and never depends on how many others buy. POOL, not the buyer, carries the volume risk.
2. **An accepted price never goes up.**
3. **All-in, one figure.** Item, delivery, standard installation, taxes and every mandatory charge, shown as one total with its breakup. Extras (for example extra AC piping) are priced before ordering. An unknown charge is never treated as ₹0.
4. **Only real comparisons.**
   - Exact model against exact model.
   - The market price is the best verified landed price, timestamped and rechecked (no older than 24 hours) when the resident accepts.
   - **Never MRP.**
   - Bank-card offers are shown separately.
5. **When a verified cheaper option exists, POOL either matches it (if its margin floor allows) or says so** and links it.
6. **Buyer first on pricing.**
   - The buyer always saves at least **max(₹1,000, 2%)** against the market price.
   - POOL's margin is capped at **7.5% of its cost**.
   - If the margin cannot reach **5%**, POOL does not sell that item.
7. **POOL is the seller, and says so.**
   - Buyers pay POOL, and POOL pays dealers.
   - POOL never presents itself as the buyer's negotiating agent while keeping a margin.
   - POOL never asks anyone for an OTP.
8. **Sealed procurement.** Dealers never see each other's bids. There is one winning dealer per SKU per community window, with a named backup.
9. **POOL never asks a resident's budget or maximum price.**
10. **Contact details go only to the delivering dealer,** and only for delivery. They are never sold.
11. **AI drafts; people decide.** No AI output sets a price, confirms stock, verifies a payment or closes a complaint.
12. **Nothing fake.**
    - No invented demand, MRP "savings", reviews or countdowns. A countdown is shown only when the deadline is real.
    - **No selling below cost to fake traction.**

---

## 6. Business model and unit economics

### 6.1 How POOL earns (DECISION)

- **The only income:** POOL's selling price minus the dealer's bulk net price.
- **No fees of any kind:** no buyer fees, dealer fees, commissions, listing fees, lead fees, paid placement, subscriptions or rebates.
- **Card costs:** POOL absorbs card and UPI charges. It never adds a surcharge.
- **Never counted as POOL money:**
  - the GST inside POOL's price (POOL passes it to the government);
  - booking amounts not yet earned (refundable until dispatch);
  - dealer money owed.
- **Revenue in the accounts** is POOL's full selling price excluding GST. The number that matters is the **spread**: POOL's selling price minus its purchase cost.

### 6.2 The pricing rule (DECISION — the ops console computes it automatically)

**Definitions:**

- **C** — the dealer's net price to POOL: all-in, delivered and installed, including GST.
- **M** — the best verified market landed price, timestamped.
- **Headroom:** H = M − C.
- **Minimum buyer saving:** S = max(₹1,000, 2% of M).
- **Margin floor:** F = 5% of C.
- **Margin cap:** T = 7.5% of C.

**The rule, step by step:**

1. **List the item only if H ≥ S + F.** Otherwise the card says where it is cheaper.
2. **POOL margin = the smallest of three numbers:**
   - T;
   - H − S;
   - the larger of F and H/2.
3. **POOL price = C + margin.**

**In words:** POOL takes half the headroom, but never less than 5% of its cost and never more than 7.5%. It never takes so much that the buyer saves less than max(₹1,000, 2%).

| Dealer net C | Market price M | Headroom | POOL margin | **POOL price** | Buyer saves |
| ---: | ---: | ---: | ---: | ---: | ---: |
| ₹40,000 | ₹50,000 | ₹10,000 | ₹3,000 | **₹43,000** | ₹7,000 ← *the founder's example* |
| ₹40,000 | ₹45,000 | ₹5,000 | ₹2,500 | **₹42,500** | ₹2,500 |
| ₹40,000 | ₹43,000 | ₹3,000 | ₹2,000 | **₹42,000** | ₹1,000 |
| ₹40,000 | ₹42,500 | ₹2,500 | — | **not listed** | resident is shown the cheaper option |
| ₹25,000 | ₹29,000 | ₹4,000 | ₹1,875 | **₹26,875** | ₹2,125 |
| ₹60,000 | ₹68,000 | ₹8,000 | ₹4,000 | **₹64,000** | ₹4,000 |

**What this means (arithmetic).** For an item to be listable, **the dealer's net price must be at least about 7% below the real market price.**

- At market prices of ₹45,000–₹60,000 the minimum gap is 6.7–6.9%.
- At ₹30,000 it is 7.9%.

This gap is the pilot's make-or-break number (Gate 1).

### 6.3 Unit economics (ASSUMPTIONS — replaced by measured numbers at Gate 2)

**Worked example: the founder's ₹40,000 → ₹43,000 unit.**

| Line | Amount | Basis |
| --- | ---: | --- |
| Spread (GST-inclusive) | ₹3,000 | ₹43,000 − ₹40,000 |
| GST on the spread | −₹458 | 18% GST on ACs, TVs, dishwashers and washing machines (FACT); POOL claims input credit on the dealer's invoice |
| **Gross margin (ex-GST)** | **₹2,542** | |
| Payment cost | −₹378 | 70% UPI at 0.4% = ₹172 (FACT, from 15 Oct 2026); 30% card at an assumed 2% = ₹860 |
| Operations time | −₹375 | 90 minutes at ₹250/hour loaded |
| Tech and messaging | −₹40 | |
| Returns and risk allowance | −₹215 | 0.5% of price |
| **Contribution per unit** | **≈ ₹1,534** | About **4.2×** the old fee model's ≈₹361 |

**Sensitivity (arithmetic, same assumptions, dealer cost ₹40,000):**

| Spread per unit | ₹1,500 | ₹2,000 | ₹2,500 | ₹3,000 | ₹4,000 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Contribution per unit | ₹284 | ₹700 | ₹1,117 | ₹1,534 | ₹2,368 |

**Operations minutes now matter less than the spread.** At a ₹3,000 spread:

| Operations time | 60 min | 120 min | 180 min |
| --- | ---: | ---: | ---: |
| Contribution per unit | ₹1,659 | ₹1,409 | ₹1,159 |

**The trap that can wipe out the margin — GST input credit (FACT-based arithmetic).**

- POOL pays GST inside the dealer's price and recovers it as input credit. That only works if the dealer reports POOL's invoice in its own GST returns.
- On a ₹40,000 purchase, the credit at risk is **₹6,102**. That is more than **2×** the ₹3,000 spread.
- **Controls:**
  - buy only from dealers with a clean GST return-filing record (checked on the GST portal);
  - pay only against a valid tax invoice;
  - reconcile every month with the CA;
  - withhold the GST amount from any dealer whose invoice does not show up in POOL's input-credit statement.

### 6.4 Community economics (ASSUMPTIONS)

**Assumptions:**

- 400 homes;
- 60% buy at least one core appliance during the possession window;
- POOL wins 25% of those households;
- 2.2 units per household;
- average POOL price ₹40,000 and average spread ₹2,500;
- ₹25,000 to set up and run the community channel.

| Result | Value |
| --- | ---: |
| Units | 132 |
| Sales (GST-inclusive) | ₹52.8 lakh |
| Gross margin (ex-GST) | ≈ ₹2.80 lakh |
| **Contribution after channel cost** | **≈ ₹1.27 lakh** |
| **Break-even** | **≈ 22 units ≈ 10 households ≈ 4% of buying households** |

- If POOL wins 10% of buying households: ≈₹35,800. At 15%: ≈₹66,200.
- **Conclusion:** once the headroom exists, the model is robust. Without headroom there is nothing to sell.

### 6.5 Volume and tiers — POOL carries the risk, but never holds stock (DECISION)

**POOL buys nothing in advance during the pilot.** Each purchase order goes to the dealer only after the resident's booking.

**Order of preference for dealer terms:**

1. **A flat community net price with no minimum quantity.** The dealer is motivated by the visible, concentrated demand.
2. **A tier table**, settled by a credit note at the end of the window (for example: up to 19 units ₹41,500; 20–49 units ₹40,800; 50 or more ₹40,000).
   - POOL prices residents off the **no-volume tier**. The tier credit is POOL's upside.
   - POOL starts pricing off expected tiers only after a community has proven its volume.
3. **Last resort: a real pre-booking threshold.** If a dealer insists on a firm minimum, bookings are taken against a genuine deadline. If the threshold is not reached, every booking is refunded.
4. **Never:** POOL buying inventory upfront. For scale, 50 units at ₹40,000 is ₹20 lakh, twice the whole budget.

**The dealer's side (TEST).** For the dealer, POOL's bulk net price is a B2B sale.

- It must beat what the dealer earns on walk-in sales, once lower selling effort, batching and volume are counted.
- Dealers must confirm in writing three things:
  - they may sell to a reseller under their brand agreements;
  - their best B2B or institutional price;
  - that warranty passes through (Appendix A).

---

## 7. Competition, and how POOL wins

*FACT. These are the companies' own claims on their websites as seen on 28 Sep 2026. They are self-reported and unverified.*

| Player | What it does | Relevance to POOL |
| --- | --- | --- |
| **PriceMela** (Bengaluru — Jayanagar, JP Nagar) | Buyers post requirements; sellers send **sealed** offers (maximum 8 per requirement); **buyers pay sellers directly**; no commission at launch; *"No lead credits. No ad packages. Ever."* Categories include Apple devices, home appliances and furniture. Status: *launching soon*. | The old spec's exact model. POOL's corrected model is different: POOL is the bulk buyer and the seller. |
| **Wantd** (Bengaluru) | "Reverse electronics marketplace" for phones and laptops; buyers post with a budget. It claims 1,200+ verified closed deals and an average saving of ₹4,200. | It owns the phone/laptop lane. POOL stays out of it and never asks for a budget. |
| **Wantoo** | "Reverse marketplace" claiming 14 cities and 2,400+ needs posted. | The generic "post what you need" space is crowded. |
| **CrowdTag** | Chrome extension on Amazon: shoppers "tag" products and brand-funded threshold discount codes unlock. Invite-only. | Threshold pooling tied to Amazon, with no local fulfilment. |
| **MyGate** | Community platform with 27,000 communities and 57 lakh homes. It raised ₹225 crore in June 2026 and says it is profitable. It offers local services and a used-goods marketplace. Its 2024 blog says it "facilitates group buying". | **The biggest potential competitor, and also the most natural partner, for this wedge.** |

**The price benchmarks** are online marketplaces and big electronics chains. They are also POOL's real competition for every order.

**How POOL wins:**

1. **Concentrated community demand**, turned into real bulk buying.
2. **One winning dealer per item per community**, so volume concentrates and so does the discount.
3. **All-in, delivered-and-installed prices, with precise comparisons.** POOL matches a cheaper verified option or says so.
4. **Baskets** for move-ins.
5. **One accountable seller:** a small booking and pay-on-delivery.
6. **The lowest cost per order**, through AI-assisted operations.

**Moat that can be earned (none of it exists today):**

- dealer performance and price history per community;
- community relationships;
- a verified all-in price dataset;
- low operations cost;
- later, direct brand or institutional supply.

---

## 8. Go-to-market playbooks

### 8.1 Communities

**Selection criteria (all must hold):**

- 200 homes or more;
- possession under way, or starting within 90 days (check builder announcements, association notices and public RERA listings);
- at least 5 authorised multi-brand dealers within about 15 km;
- a named association or builder contact.

**Pitch to the association:**

- free for the community;
- residents get a community price below the market price, one accountable seller and one issue desk;
- no resident data is sold;
- residents opt in individually.

**Asks:**

1. a weekend or possession-day desk;
2. one message in the official channel;
3. a named contact.

Keep the permission in writing.

**Forbidden:**

- scraping groups;
- adding people to groups;
- buying contact lists;
- messaging anyone who has not opted in;
- cash referral schemes.

Any contribution to an association fund must be printed on the Price Card and counted as acquisition cost.

### 8.2 Dealers (suppliers)

**Target:** 8–12 authorised multi-brand dealers within reach of the three communities. Qualify at least 3.

**Qualification — all required before any purchase order:**

- GSTIN active, **with a clean return-filing record** (checked on the GST portal);
- store visit, with a photo;
- brand-authorisation evidence;
- a sample tax invoice;
- **written confirmation that the dealer may supply a reseller, and that the manufacturer warranty holds on units POOL resells** (POOL invoice plus dealer invoice). Brands without this confirmation stay off the card;
- bank details match the legal name. Confirm this on a call to the store or owner, never over chat;
- related shops flagged. Shops with the same owner count as one supplier.

**Standard supply terms (lawyer drafts them — §13):**

- billed to POOL, shipped to the resident;
- the dealer carries the risk until delivery;
- the delivery date is committed; installation by the dealer or the brand's service network;
- DOA and defect replacement back-to-back;
- payment within 3 working days of confirmed delivery, against a valid tax invoice;
- volume tiers settled by credit note;
- no offering POOL's community net price directly to that community's residents during the window.

**Pitch:**

- one bulk customer, one invoice, one payer, paid in 3 working days;
- batched delivery and installation at one address;
- no fees and no commissions.

### 8.3 Residents

**Where POOL finds them:** possession-day desks, the official channel message, and non-cash referrals.

**Intake fields (only these):**

- name;
- WhatsApp number;
- community and tower;
- possession month;
- categories needed;
- exact models, if known;
- timing;
- how they found POOL;
- consent.

**Never collected:** budget, income, ID documents, bank details or OTPs. The flat number and delivery address are collected only after acceptance.

**Payment:** a ₹2,000 booking by UPI link, and the balance to POOL on delivery (UPI or card link). Always to POOL's verified business account, never to a person.

---

## 9. Team (DECISION)

| Who | Owns |
| --- | --- |
| **Founder** (48 hours/week at most) | Dealer and community deals in Hyderabad; every go/no-go decision; **approves every dealer payout**; weekly scorecard |
| **Hyderabad — community lead** | Associations, desks, resident registration |
| **Hyderabad — resident concierge** | WhatsApp desk, Price Cards, orders, bookings, follow-up, issues |
| **Hyderabad — supply & dealer operations** | Dealer qualification, procurement rounds, purchase orders, delivery and installation chasing |
| **Hyderabad — finance & compliance** | Sales invoices, payment collection, dealer invoice checks, payout preparation, monthly GST input-credit reconciliation with the CA, float control |
| **Benchmarks, QA & Bengaluru scans** (remote) | Market-price evidence, SKU catalogue, checking AI outputs, Bengaluru price scans |
| **Developers ×5**, each using Claude Code | Two on the core app, one on AI features, one on pricing and data tooling, one on QA, security and devops |
| **External** | Startup lawyer (fixed fee), chartered accountant (company, GST, monthly books), trademark agent |

- **Separation of duties.** Payout duties are split three ways:
  - the person who onboards a dealer does not confirm its bank details;
  - finance prepares each payout;
  - the founder approves it.
- **Every person confirms availability in writing during Week 0.** If the five field people are based in four cities, the Mumbai and Delhi people take the remote benchmark and QA work.
- **The ₹10 lakh contains no salaries.** Any pay comes out of it, which shrinks scope, or from new money.

---

## 10. Money — ₹10,00,000 hard cap (DECISION)

| Line | Cap (₹) | Allowed use |
| --- | ---: | --- |
| Legal & compliance | 1,75,000 | Company incorporation (if not done); lawyer package (sale terms, supply agreement, returns and refund policy, privacy); CA for GST registration and monthly books and returns to December; trademark search |
| Hyderabad field operations | 1,25,000 | Local travel, possession-day desks, printing, phones and data |
| Community acquisition tests | 75,000 | Desk materials, events, permitted channel costs (all counted as acquisition cost) |
| Tech & tools | 75,000 | Hosting, domain, Google Workspace, WhatsApp messaging, AI APIs, accounting software, payment set-up |
| Bengaluru preparation | 25,000 | Price scans only |
| Returns & goodwill reserve | 75,000 | Refunds POOL owes (Rule 7) that a dealer fails to cover; errors POOL caused. Never a price subsidy. |
| Contingency | 50,000 | Founder approval, logged |
| **Working-capital float** | **2,00,000** | **Revolving, never spent.** Bridges dealer payouts and booking refunds. Must be back to full within 15 days of each use. |
| **Locked reserve** | **2,00,000** | Released only on a Gate 2 pass. Up to ₹1,50,000 may go to the single allowed retest (§12). |
| **Total** | **10,00,000** | **Spendable before Gate 2: ₹6,00,000**, plus the float, which must always come back |

**Controls:**

- The founder approves every commitment above ₹10,000, and every dealer payout.
- One person records spending; another reconciles it weekly.
- At 80% of a line, new spending on that line is frozen. At 100%, it stops.
- Moving money between lines needs a dated entry in the decision log.
- **Bookings and sale proceeds are never used for operating costs until the sale is complete.** Money owed to dealers is never counted as POOL's cash.

---

## 11. The 13-week plan (dated)

| Week | Dates (Mon–Sun) | What happens |
| --- | --- | --- |
| **0** | 28 Sep – 4 Oct 2026 | See the Week 0 list below. |
| **1–3** | 5 – 25 Oct | See the discovery sprint list below. |
| **4** | 26 Oct – 1 Nov | **Gate 1 decision on Friday 30 October.** If it passes:<br>• sign supply agreements;<br>• receive the lawyer package;<br>• GST, bank and payments go live;<br>• publish the first Price Cards (valid 14 days);<br>• the team rehearses the full flow as test buyers. Test orders are never counted as results. |
| **5–12** | 2 Nov – 27 Dec | **Live pilot: Hyderabad, 3 communities.**<br>• Week 5 contains Dhanteras (6 Nov) and Diwali (8 Nov). Set delivery promises with a buffer.<br>• Price Cards refresh every 14 days, then every 30 days from December.<br>• Scorecard every Monday; GST reconciliation every month-end.<br>• **Mid-pilot review Friday 27 November.** |
| **13** | 28 Dec 2026 – 3 Jan 2027 | **Gate 2 decision on Thursday 31 December** (§12). |

**Week 0 (28 Sep – 4 Oct).** Everything that needs a company takes time, so it starts now.

- Everyone confirms availability in writing.
- Incorporate a Private Limited company if none exists.
- Then, in order: GST registration, a current account, and UPI/payment-gateway onboarding. The gateway needs a live website with terms, a refund policy and a privacy policy.
- Engage the lawyer and the CA.
- Run the trademark search for "POOL".
- Set up Google Workspace (2FA) and a WhatsApp Business number, and apply for the WhatsApp Business Platform.
- Shortlist 8–10 communities and 15–20 dealers.
- Fix the **20 core SKUs** for the scan.
- Print the consent scripts.
- Developers set up the repository and the data model.

**Weeks 1–3 — discovery sprint and build (5 – 25 Oct):**

- **Dealers:** visit 12–15 dealers and ask Appendix A. For the 20 SKUs, collect *research-only, non-binding* **bulk net prices to POOL**, all-in and delivered to the community:
  - a flat price with no minimum quantity;
  - their tier table.

  Also record, for each dealer:
  - whether they may supply a reseller;
  - their payment terms;
  - their GST return-filing record;
  - any MOP constraints;
  - whether the brand's warranty holds on resold units — ask for written confirmation from the brand's regional or service team.
- **Market prices:** twice a week, record the best landed market price for the same 20 SKUs. The sale starts on 8–9 October. Include delivery, installation and material charges; record bank offers separately.
- **Communities:** meet 6–8 associations or builder teams. Get 2–3 written permissions. Run desks for need registration only; nothing is sold.
- **Residents:** hold 40–60 conversations and registrations, including trust questions. *Would you pay a ₹2,000 booking and the balance on delivery to POOL?*
- **Build:** POOL Ops v1 (§14) ready for internal testing by 25 October.
- **Bengaluru:** price scan of the same 20 SKUs with 5 dealers, by phone and clearly labelled as research.

---

## 12. Gates and kill rules (DECISION)

### Gate 1 — Headroom, supply and readiness (decision: Friday 30 October 2026)

**PASS requires all five:**

1. **Headroom:** at least **10 of the 20** scan SKUs are listable under the §6.2 rule (H ≥ S + F). This uses written, non-binding dealer bulk net prices that need **no POOL volume commitment**, against the verified market price.
2. **Supply:** at least **3 independent dealers** are qualified (§8.2) and agree to the standard supply terms. Each listable SKU has at least 2 bids.
3. **Warranty:** written confirmation for every brand on the first card that the manufacturer warranty is honoured on units bought through POOL. Brands without it are dropped. If fewer than 10 SKUs remain, item 1 fails.
4. **Demand:** at least **2 communities** have given written permission, and at least **40 households** have registered a need within 60 days.
5. **Readiness:**
   - company, GST registration, current account and payment collection are live;
   - the lawyer package is delivered;
   - the CA is set up for invoices and monthly input-credit reconciliation.

   **Nothing is sold without these.** If they are not ready, the live start moves.

**If Gate 1 fails:**

| Failed item | Response |
| --- | --- |
| 1 (headroom) | Do not launch.<br>• If most of the gap comes from time-limited festive bank offers, re-scan once between 16 and 20 November and decide again.<br>• **Otherwise stop.** No headroom means nothing to sell in this model. |
| 2 (supply) | If dealers will not give credit, test booking-funded payment within the float with one dealer. If dealers will not supply a reseller at all, stop. |
| 3 (warranty) | List only the confirmed brands. If fewer than 10 SKUs remain, treat it as item 1. |
| 4 (distribution) | Run 4 weeks of Quote Requests through network referrals only, then decide. |
| 5 (readiness) | The live start moves. No exceptions. |

### Gate 2 — Unit economics (decision: Thursday 31 December 2026)

**PASS requires all ten:**

1. **Volume:** at least **40 delivered units** (strong pass: at least 80).
2. **Acceptance:** at least 25% of ready residents who were shown a listed price accepted it.
3. **Buyer value:** every order met the minimum saving at acceptance (100% rule compliance). The median saving is reported.
4. **Spread:** the realised average spread is **at least 5% of dealer cost**, after returns and credits.
5. **Promises:**
   - at least 90% of units delivered by POOL's promised date;
   - zero price increases after acceptance;
   - every late delivery offered a refund under the policy.
6. **Cash and GST:**
   - every dealer payout was covered by resident money received, or by the float;
   - the float was restored within 15 days of each use;
   - no resident dues were left unpaid;
   - **100% of purchase invoices were matched for GST input credit.**
7. **Warranty:** zero warranty denials caused by buying through POOL.
8. **Operations:** measured time is at most 120 minutes per unit, and measured contribution is **at least ₹700 per unit**.
9. **Suppliers:** at least 2 supplying dealers bid again at equal or better net prices.
10. **Safety:** zero unresolved payment or data incidents, and every complaint is resolved within 30 days.

**Decision rules:**

- **All ten pass →** Phase 2 (§17). The reserve is unlocked.
- **Any of items 2–7, 9 or 10 fails →** stop, or move to Plan B (§17). These are product, trust or compliance failures, not scale problems.
- **Only items 1 and/or 8 fail →** one retest: 3 more communities for 6 weeks, capped at ₹1,50,000 from the reserve. Then a final decision. **There is no third attempt.**

**Pilot funnel behind the 40-unit bar (ASSUMPTIONS):**

| Step | Assumption | Result |
| --- | --- | ---: |
| Reachable households | 3 communities × 300 | 900 |
| Need a core appliance in the window | 50% | 450 |
| Register with POOL | 35% | 158 |
| Qualified | 70% | 110 |
| Accept | 30% | 33 |
| Units delivered | 2 per household | **≈66** |

At an average price of ₹40,000 and an average spread of ₹2,500, 66 units give (arithmetic):

- sales of about ₹26.4 lakh (GST-inclusive);
- gross margin of about ₹1.40 lakh;
- contribution of about ₹76,000.

**The pilot buys evidence, not profit.**

---

## 13. Legal and compliance — what is needed, and when

### 13.1 Now (research only, Weeks 0–3)

**Handling rules:**

- Every interview starts with a consent script.
- Written notes only; no audio.
- Only the §8.3 fields are collected.
- One restricted workspace with 2FA, and no public links.
- Raw notes are deleted by 31 March 2027.
- No personal data goes into consumer AI tools.

**Why this is enough now.** The DPDP Rules were notified in November 2025. Their substantive duties — notice, consent, security safeguards, breach notification and erasure — apply from **13 May 2027** (FACT). POOL follows them now as good practice.

**Consent script for residents:**

> "Hi, I'm ___ from POOL. We're researching how families moving into new communities buy appliances. This is research only. Nothing is sold today, and nothing you say commits you to anything. I'll take written notes; no audio. Your name and number are kept separately from your answers, only to follow up if you agree, and we delete the notes by March 2027. You can skip any question or ask us to delete your answers at any time. Is that okay?"

**Consent script for dealers:**

> "This is research only. Any price you give is non-binding until we sign a written supply agreement. It will never be shown to another dealer."

### 13.2 Before the first live sale (target 2 November 2026)

| Requirement | What it means for POOL | Source |
| --- | --- | --- |
| **Private Limited company** | An e-commerce entity must be a company incorporated under the Companies Act. It must also:<br>• name a grievance officer;<br>• acknowledge complaints within 48 hours and redress them within one month;<br>• display its legal name and contacts;<br>• never use pre-ticked consent. | E-Commerce Rules 2020, Rule 4 (FACT) |
| **Seller duties** | POOL sells its own goods online, so it should plan for the duties of an inventory e-commerce entity (the lawyer confirms the classification):<br>• show return, refund, exchange, warranty and delivery information;<br>• show the total price as one figure with its breakup;<br>• **accept returns and refund when goods are defective, deficient, spurious, not as advertised, or delivered later than the stated schedule** (force majeure excepted);<br>• never post fake reviews.<br>This is why §4.3 builds in a delivery buffer and §8.2 builds in back-to-back supply terms. | E-Commerce Rules 2020, Rule 7 (FACT) |
| **GST** | • Register before the first sale.<br>• Issue tax invoices.<br>• Claim input credit only on dealer invoices that the dealer has reported (§6.3: ≈₹6,102 at risk per ₹40,000 unit).<br>• E-way bills where the consignment requires them.<br>ACs, all TVs and dishwashers moved from 28% to 18% GST on 22 Sep 2025, and washing machines stay at 18%. The CA confirms the rest. | Rate change (FACT); CA to set up |
| **Payments** | • POOL collects only its own sale proceeds, so it is a merchant and not a payment aggregator (RBI: a PA aggregates *and settles* funds for other merchants — FACT; lawyer to confirm).<br>• **UPI to merchants carries a 0.4% fee on payments above ₹2,000 from 15 Oct 2026, capped at ₹300 at ₹75,000 and above. Consumers pay nothing.**<br>• Card data stays with the gateway, never with POOL. | RBI Master Direction, 15 Sep 2025; Ministry of Finance UPI MDR FAQ (FACT) |
| **Seller, not agent** | POOL must never market itself as the buyer's negotiating agent while keeping a margin. Under the Contract Act, an agent who deals on its own account without disclosure can have the deal repudiated, and must hand over the benefit. POOL sells as a retailer and says its margin is in the price. | Indian Contract Act s.215–216 (FACT) |
| **Seller liability** | As a product seller, POOL carries liability under the Consumer Protection Act 2019 product-liability chapter. The lawyer scopes it. **POOL never promises more warranty than the manufacturer gives.** | Lawyer |
| **Legal metrology** | • Show the mandatory declarations, including MRP.<br>• Never sell above MRP.<br>• **Never claim savings against MRP.** | Legal Metrology rules; the 2026 country-of-origin amendment, in force 1 Jul 2026 (FACT) |
| **Foreign investment** | "FDI is not permitted in inventory based model of e-commerce." While POOL is the seller, raise only domestic capital, and keep a marketplace mode ready (§17). | PIB, 11 Dec 2019 / Press Note 2 (2018) (FACT) |
| **Dark patterns** | CCPA's 2023 guidelines list 13 dark patterns, including false urgency, drip pricing and bait-and-switch. The one-figure price and the real-deadlines-only rule cover the main ones. | CCPA (FACT) |
| **Trademark** | Search "POOL" before any brand spending, and keep two backup names ready. | Old master §24, risk A17 |
| **Supply agreement** | The lawyer drafts the §8.2 terms, including the time-limited non-circumvention clause, which is to be checked against competition law. | Lawyer |

**Not needed for the pilot:** a payment-aggregator licence, escrow, lending, insurance products, or rebate structures.

---

## 14. Product and technology — the lean build

**Principle:** build only what the first 100 orders actually use.

### 14.1 Surfaces (mobile web; no native apps)

- **Resident:**
  - registration;
  - private Price Card;
  - acceptance of the exact offer version;
  - booking and balance payment by UPI or card link;
  - order tracker;
  - issue button;
  - Warranty Locker.
- **Dealer:**
  - procurement bid form (net price to POOL, tiers, terms);
  - confirmation link;
  - purchase-order acceptance;
  - delivery and installation updates;
  - invoice upload;
  - payout statement.
- **Operations console:**
  - communities, residents and dealer qualification;
  - SKU catalogue and market-price log;
  - procurement rounds and awards;
  - **pricing engine (§6.2)**;
  - purchase orders;
  - payments and dealer payouts, with founder approval;
  - sales invoices and credit notes;
  - GST input-credit reconciliation export;
  - issue desk;
  - weekly scorecard;
  - time log.

### 14.2 Data and engineering rules

**About 19 tables:**

`staff_users`, `communities`, `residents`, `consents`, `dealers`, `dealer_checks`, `skus`, `market_prices`, `procurement_rounds`, `bids` (sealed), `price_cards` (with every pricing-rule input stored), `orders` (accepted snapshot plus hash, immutable), `order_events` (append-only), `purchase_orders`, `buyer_payments`, `dealer_payables`, `sales_invoices` and `credit_notes`, `issues`, `audit_log`.

**Kept from the master:**

- Money in integer paise, with a currency.
- Timestamps in UTC, displayed in IST.
- Immutable accepted snapshots.
- Acceptance and payment recording in single transactions with idempotency keys, so a retry never creates a second order or a double charge.
- Role-based access. Dealers see only their own bids, orders and payouts.
- **No budget or willingness-to-pay field anywhere.**
- Product URLs are never fetched by the server except through allow-listed adapters.
- Every money or status change is audit-logged.
- Daily backups, with one restore test before go-live.

**Keep "who is the seller" as a field on each order, not an assumption.** If foreign capital is ever needed, the same system must be able to run in marketplace mode (§17).

**Stack (DECISION):**

- TypeScript, React (Vite) mobile web, Node/Fastify, PostgreSQL.
- Managed hosting in an Indian region.
- Staff sign in with Google Workspace and 2FA.
- Residents and dealers sign in with a WhatsApp-verified phone plus signed magic links.
- Payments go through a regulated payment gateway or UPI collect; POOL never stores card data.

### 14.3 AI — the operations engine (each output is a *draft* that a person or dealer confirms)

| Feature | Input → output | Who confirms |
| --- | --- | --- |
| SKU resolver | A link, screenshot, box photo or model plate → the exact model and variant, with confidence | Operations staff |
| Bid reader | A dealer's WhatsApp text, voice note or handwritten quote → a structured bid draft | **The dealer, by link** |
| Invoice reader | A dealer invoice (photo or PDF) → GSTIN, HSN, amounts and tax → checked against the purchase order | Finance & compliance |
| Market-price helper | Candidate listings and landed prices → a draft benchmark | Benchmarks & QA (adds the timestamp) |
| Resident FAQ assistant | Answers only from the resident's Price Card, the policies and the order status; everything else goes to a human | Operations spot-checks |
| Operations copilot | Drafts follow-ups, flags late deliveries and payouts, summarises issue threads | Operations staff |

**Guardrails:**

- AI has **no write access** to prices, orders, payments, payouts or invoices.
- Outside content is treated as data, never as instructions (protection against prompt injection).
- Every draft is stored with the model version and the person who approved it.
- No resident personal data goes to an AI provider without a data-processing agreement.

**WhatsApp:**

- The Business app is used from Week 0; the Business Platform application goes in during Week 1.
- Service replies inside the 24-hour window are free, and so are utility templates sent inside it (FACT).
- **POOL sends no marketing templates.**

### 14.4 Build schedule

| Week | Deliverable |
| --- | --- |
| 1 | Data model, authentication, operations console skeleton, time log |
| 2 | Procurement rounds, bid flow, SKU resolver |
| 3 | Pricing engine, Price Card, resident acceptance, booking payments |
| 4 | Purchase orders, balance payments, sales invoices, dealer payables, audit log, backup/restore test, end-to-end rehearsal |
| 5–8 | Bid reader, invoice reader, FAQ assistant, Warranty Locker, GST reconciliation export |
| 9–12 | Fixes chosen by measured pain only |

**Not being built:**

- POOLBACK or cohorts;
- a randomisation or pre-registration engine;
- wallets, escrow or lending;
- native apps;
- a national catalogue;
- retailer integrations beyond benchmarks;
- agent or UCP commerce;
- microservices or Kubernetes.

---

## 15. Metrics — one weekly scorecard, every Monday

| Block | Measures |
| --- | --- |
| **Funnel** | Registered → qualified → shown a listed price → accepted (booking) → purchase order → delivered (balance paid) → installed → completed |
| **Buyer value** | Saving against the verified market price per order (median and spread); share of SKUs not listable; share where the resident chose the cheaper outside option |
| **Headroom** | Dealer net price against market price, per SKU per week (%); bids received per SKU; tier credits earned |
| **Money** | Sales (GMV); spread per unit (₹ and % of cost); gross margin ex-GST; payment costs; returns and refunds; dealer payables ageing; float in use; **GST input-credit match rate**; contribution per unit |
| **Operations** | Minutes per delivered unit (time log); on-time delivery against POOL's promise; installation within the window |
| **Trust & safety** | Issues opened and resolved; time to resolve; warranty problems; payment-safety and data incidents |

**Reporting rules:**

- Every number shows its numerator and denominator.
- Each community is reported before any total.
- Nothing unknown is counted as zero.
- Failed work counts as cost.
- Test orders never appear in results.

---

## 16. Risk register — top 12

| # | Risk | Why it could kill POOL | Early signal | Response |
| --- | --- | --- | --- | --- |
| 1 | **Not enough headroom** (dealer bulk price not about 7% below market; MOP floors) | Nothing to sell | Gate 1 scan | Brand institutional or project pricing; value in installation kits; otherwise stop |
| 2 | **Residents won't pay an unknown seller** | Low acceptance | Discovery trust answers; acceptance below 25% | Only a ₹2,000 booking up front; balance on delivery; community endorsement; real reviews only |
| 3 | **Brand warranty or channel policy blocks resale** | Supply stops, or residents lose their warranty | No written warranty confirmation | Confirmed brands only; both invoices given to the resident; later, become an authorised or institutional buyer |
| 4 | **GST input-credit loss** (dealer does not report POOL's invoice) | Wipes out the margin (≈₹6,102 per ₹40k unit) | Monthly reconciliation mismatch | Clean-filing dealers only; pay against valid invoices; withhold the GST amount until matched |
| 5 | **Seller liability** (Rule 7 refunds for late or defective goods) | Refunds with no recovery | Late deliveries, DOA cases | Delivery buffer; back-to-back dealer terms; returns reserve |
| 6 | **Cash squeeze** (dealer wants prepayment; resident refuses at the door) | The float runs out | Float usage above 50% | Booking first; dealer credit terms; cap on units in flight |
| 7 | **Operations time too high** | Contribution shrinks | Time log above 120 minutes per unit | AI tooling; Price Cards over one-off quotes |
| 8 | **Associations refuse access** | No distribution | Fewer than 2 permissions by Week 3 | Builder handover teams; referrals; Quote Requests |
| 9 | **Festive-season distortion** | Wrong conclusions | Scans inside and outside the sale | Re-scan after 15 November |
| 10 | **Circumvention** (residents or dealers go direct after the first order) | Volume leaks away | Dealer sales in the community outside POOL | Time-limited non-circumvention clause; POOL's value is the volume, which dealers only get through POOL |
| 11 | **A funded player moves in** (MyGate, PriceMela, big chains) | Distribution disadvantage | Their announcements | Partner rather than fight: POOL as the bulk-buying engine inside a community platform |
| 12 | **Foreign-investment limit, or team time** | Blocks funding or an exit; slows the plan | A foreign-investor term sheet; Week 0 confirmations | Domestic capital; marketplace mode kept ready; cut to 2 communities |

---

## 17. After Gate 2 (only if it passes)

**Q1 2027:**

- Hyderabad grows to 10 communities.
- Bengaluru goes live with 3 communities.
- **AC pre-season push, February–April**, if the pilot confirms ACs are the largest move-in category by value.
- Start pricing off expected volume tiers only for communities that have proven their volume.
- Apply to the top 2 brands as an **authorised or institutional buyer**. That removes the warranty risk and widens the headroom.
- Hire only against measured contribution.

**Milestones that make POOL valuable:**

- a repeatable launch playbook for communities;
- 50 or more qualified dealers with a price and performance history;
- a verified headroom dataset;
- operations time of 90 minutes or less per unit;
- **1,000 or more delivered units per month across two cities.**

**Plan B.** Use this if residents do not convert, but headroom and supply are proven. Sell the same bulk-buying service to small businesses — PGs, co-living operators, clinics and offices — where concentration comes naturally.

**Plan C.** Use this if there is no headroom. Stop. Nothing in this model survives without it.

**Exit reality:**

- Nobody buys a company with no transactions. The first credible conversation needs two quarters of delivered orders, dealers who come back, and measured margins.
- **While POOL is the seller, foreign capital is barred** (FACT).
- Domestic buyers — retail chains, builders, domestic platforms — can take it as it is.
- A foreign-invested buyer would need POOL in **marketplace mode**. The dealer becomes the seller and POOL's spread becomes a disclosed commission. The resident's experience stays the same.
- Keep that switch possible (§14.2). **Plan to be a partner first.**

**POOLBACK stays parked.** Under this model, volume economics already flow to POOL through tier credits between businesses. A delayed cashback to buyers adds nothing.

---

## 18. Decision log — what changed from the four documents, and why

| # | Topic | Old documents | Final decision | Why |
| --- | --- | --- | --- | --- |
| 1 | Documents | Four files, 519 KB, circular references | **This one blueprint.** The old files move to `archive/`. The old master stays a reference library for Phase 2 engineering (§26–34). | One source of truth |
| 2 | Status | Field research NO-GO in all four files | **GO from 5 October** | Evidence only comes from the field |
| 3 | Cities | Four metros concurrently; none starts until all four are ready | **Hyderabad live; Bengaluru scans; Mumbai and Delhi wait** | Capacity, budget, evidence does not transfer |
| 4 | Products | All physical products at about ₹5,000 or more | **Core appliances; add-ons only in baskets** | Headroom arithmetic; exact identity; move-in fit |
| 5 | Channel | Generic community outreach | **Possession waves in large gated communities** | Concentration makes bulk buying real |
| 6 | Order model | One unit only | **Baskets; each line's price honoured alone** | Move-ins buy baskets |
| 7 | Payment | Prepay the dealer after reservation; COD banned | **Resident pays POOL: ₹2,000 refundable booking, balance on delivery. POOL pays the dealer within 3 working days.** | Trust; POOL is the seller |
| 8 | **Revenue** | Merchant success fee after 8 settlement conditions | **Spread only. POOL buys at the dealer's bulk net price and sells at the POOL price. No fee to anyone.** *(Founder correction, 29 Sep 2026)* | About 4× contribution per unit; no fee to chase; concentrates volume |
| 9 | Seller of record | Dealer is the seller; POOL never takes title | **POOL is the seller** (billed to POOL, shipped to the resident) | Required by the spread model. Rule 7, GST, seller liability and the FDI limit are all planned (§13). |
| 10 | Pricing | None; merchants set prices | **§6.2 rule:** POOL takes half the headroom, between 5% and 7.5% of cost; the buyer always saves at least max(₹1,000, 2%); otherwise the item is not listed | Buyer first; margin protected; no MRP games |
| 11 | Volume risk | Only through POOLBACK tiers | **The buyer's price is fixed; POOL carries the volume risk; no POOL stock; price off the no-volume tier until volume is proven** | Protects buyers and cash |
| 12 | Allocation | Buyers pick among dealers, so volume splits | **One awarded dealer per SKU per community window, with a backup** | Solves the Competition–Concentration Tension |
| 13 | POOLBACK | OFF but fully specified | **Removed; parked** | Tier credits between businesses replace it |
| 14 | Mechanisms A/B | Thesis gates; B defined two different ways | **Headroom and volume are measured directly; no mechanism labels** | Removes the contradiction |
| 15 | Experiment | Cluster-randomised design plus a 23-field pre-registration packet | **Headroom scan plus a live pilot, with numeric gates** | The documents themselves conceded "descriptive only" |
| 16 | Research legal | 8 specialist reviews before any interview | **One-page consent, minimal data, deletion by March 2027** | Proportionate; DPDP substantive duties start 13 May 2027 |
| 17 | Live legal | Specialist review before live commerce | **Company, GST, payments, lawyer package (sale terms, Rule 7 returns, supply agreement), CA and trademark search before the first sale** | POOL is now a seller |
| 18 | AI | None in the pilot | **AI operations engine, including an invoice reader for GST; drafts only** | Cost per order; GST accuracy |
| 19 | Tech scope | 74 tables, 15 state dimensions, 25 endpoint families | **About 19 tables, a simple lifecycle, append-only events, a "seller" field** | Pilot scale; future marketplace mode |
| 20 | Team | City leads at 40 hours; developers at 20 hours in total | **4 people in Hyderabad, including finance & compliance; developers build** | POOL now handles money and GST |
| 21 | Budget | ₹4 lakh first cycle; ₹6 lakh locked | **₹6 lakh spendable to Gate 2; ₹2 lakh revolving float; ₹2 lakh locked** | Cash needs of a seller |
| 22 | Thresholds | max(₹1,000, 2%); 60% coverage; above 25% acceptance | **Minimum saving kept inside the pricing rule; acceptance kept; headroom, spread, GST match, warranty and contribution gates added** | Tests the whole business |
| 23 | Timeline | Relative windows only | **A dated 13-week plan with 2 gates** | Accountability |
| 24 | Competition, seasonality, MOP, GST credit, warranty | Never analysed or mentioned | **Built into the plan, the gates and the risks** | Each can decide the result |

---

## 19. Sources (checked 28–29 September 2026)

**Checks on the four source files:**

- Sizes, word counts and dates were read from the files themselves.
- The master's SHA-256 (`6E8895A6…C8DC`) matches the hash recorded in EXEC-1.0.
- The checklist's 125-line instrument block is identical to master lines 1783–1966.
- 74 tables were counted in master §27.2.
- The pre-registration packet has 23 fields.
- "MOP", "festive", "Diwali", "season", "MyGate", "builder", "input credit", "ITC" and "reseller" do not occur in any of the four files.

**External sources:**

- PriceMela — <https://pricemela.com/sellers>
- Wantd — <https://www.wantd.in/>
- Wantoo — <https://www.wantoo.in/>
- CrowdTag — <https://crowdtag.ai/>
- MyGate raises ₹225 crore (YourStory, 10 Jun 2026) — <https://yourstory.com/2026/06/mygate-raises-rs-225-cr-from-dharana-capital>
- MyGate blog, community group buying (20 Mar 2024) — <https://mygate.com/blog/housing-society/community-group-buying/>
- RBI Master Direction on Payment Aggregators (15 Sep 2025) — <https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=12896>
- UPI merchant MDR from 15 Oct 2026 (Ministry of Finance FAQ) — <https://financialservices.gov.in/sites/default/files/2026-09/FAQs---Merchant-Discount-Rate--MDR--on-Select-UPI--P2M--Transactions_0.pdf>
- GST cut on ACs, TVs and dishwashers, 28% → 18% from 22 Sep 2025 — <https://upstox.com/news/personal-finance/tax/new-gst-rate-for-air-conditioners-ac-t-vs-and-dishwashers-all-you-need-to-know/article-180717/> and <https://shop.haierindia.com/blog/gst-rate-ac-tv-washing-machine-appliances/>
- FDI not permitted in the inventory model of e-commerce (PIB, 11 Dec 2019) — <https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=1595850&reg=48&lang=2>
- E-Commerce Rules 2020, Rule 4 — <https://www.consumerprotection.in/rule-4-duties-of-e-commerce-entities/>
- E-Commerce Rules 2020, Rule 7 (inventory entities) — <https://www.consumerprotection.in/rule-7-duties-and-liabilities-of-inventory-e-commerce-entities/>
- Indian Contract Act s.215 — <https://indiankanoon.org/doc/1346870/> and s.216 — <https://indiankanoon.org/doc/253878/>
- DPDP Rules 2025 (PIB) — <https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/nov/doc20251117695301.pdf>
- DPDP phased timeline — <https://www.sansalegal.com/post/dpdp-act-2023-and-rules-2025-phased-implementation-timeline-and-business-compliance-deadlines>
- CGST s.52 TCS — <https://taxguru.in/goods-and-service-tax/gst-tcs-commerce-operators-section-52-gstr-8-0-5-percent-rate.html>
- Legal Metrology Amendment 2026 — <https://www.scconline.com/blog/post/2026/02/21/legal-metrology-packaged-commodities-amendment-rules-2026-explained/>
- CCPA dark-patterns advisory — <https://www.pib.gov.in/PressReleasePage.aspx?PRID=2134765>
- Amazon Creators API — <https://affiliate-program.amazon.in/creatorsapi/docs/en-us/introduction>
- Flipkart Affiliate API — <https://affiliate.flipkart.com/api-docs/af_register.html>
- WhatsApp Business pricing — <https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing>
- Amazon Great Indian Festival 2026 date — <https://www.fonearena.com/blog/492788/amazon-great-indian-festival-2026-date.html>
- Diwali 2026 dates — <https://samvat.in/festivals/diwali-2026/>
- MOP (trade source) — <https://ppms.in/blog/what-is-the-meaning-of-mrp-mop-or-srp/>

**Not verified; must be checked by people:**

- trademark availability of "POOL";
- the number and timing of possession-stage communities in Hyderabad;
- **dealer bulk net prices (the headroom)**;
- brand warranty and reseller policies;
- actual card fees from the chosen gateway;
- GST rates for chimneys, purifiers, geysers and microwaves;
- team availability;
- whether a company already exists.

---

## Appendix A — Dealer discovery questions (research only, non-binding)

1. Which of these 20 models can you supply and install in [community]? What is your stock and lead time? Who installs: you or the brand's service network?
2. Would you sell to POOL as a bulk buyer? POOL buys; you deliver and install at the resident's home, billed to POOL and shipped to the resident. Does your brand agreement allow selling to a reseller?
3. What is your **net price to POOL** per unit — all-in, delivered and installed, with a GST invoice to POOL — **with no minimum quantity**? And what if the window reaches 20 or 50 units, settled by credit note at the end?
4. What exactly becomes cheaper for you with a community's volume: batched delivery, installation, no marketing?
5. Does any brand price policy (MOP) limit your B2B price? Do you have institutional or project pricing from the brand?
6. Will you accept payment within 3 working days of confirmed delivery? Are your GST returns filed on time? (We will check the GST portal.)
7. Will the brand honour the warranty on units we resell, with our invoice plus yours? Can you get that in writing from the brand's regional or service team?
8. What are your DOA, replacement and return terms, and who pays for return logistics?
9. Would you bid again for the next community at the same or a better price? What would make you stop?

Record the exact answers, the evidence shown, and a refusal code (Appendix C). Never invent a buyer to get a price. Never reveal another dealer's price.

## Appendix B — Price Card (what a resident sees)

> **[Brand] [exact model] — [variant, capacity, star rating]**
> **Seller:** POOL [legal company name], GSTIN [__]. **Delivered and installed by:** [dealer name], authorised [brand] dealer (verified [date]).
> **POOL price (all-in): ₹[__]** = item ₹[__] + delivery ₹[__] + standard installation ₹[__] (includes [materials]), taxes included. Extras are priced before you order: [e.g. extra pipe ₹__/m].
> **Market price:** best verified [store/online] landed price ₹[__], checked [date, time]. **You save ₹[__].** Card-specific bank offers, if any: [__] (shown separately).
> **How we price:** POOL buys in bulk from authorised dealers for your community and sells to you. Our margin is included in this price. Your price does not depend on how many others buy.
> **Delivery by:** [POOL's promised date]. **Installation:** within [__] of delivery.
> **Warranty:** manufacturer's [__]. You receive POOL's invoice and the dealer's invoice.
> **Returns:** defective, not as described, or delivered after our promised date → full refund or replacement. Change of mind: free cancellation until dispatch; after dispatch, [the exact policy].
> **Payment:** ₹2,000 booking now (refundable until dispatch). The balance is paid on delivery to **POOL [legal name]** by UPI [verified ID] or card link. Never pay anyone's personal account.
> **Valid until:** [date]. **Offer version:** [__].
> **Help:** POOL desk [WhatsApp], 10:00–19:00 Mon–Sat. Grievance officer: [name, email].

## Appendix C — Codes

- **Dealer refusal:** `MODEL_NOT_AVAILABLE`, `OUT_OF_STOCK`, `AREA_NOT_SERVED`, `WONT_SUPPLY_RESELLER`, `PRICE_FLOOR_MOP`, `NO_CREDIT_TERMS`, `WARRANTY_NOT_CONFIRMED`, `GST_FILING_ISSUE`, `NOT_ECONOMIC`, `TOO_MUCH_EFFORT`, `NO_REASON`, `NO_RESPONSE`.
- **Resident decline:** `PREFERS_ONLINE_DESPITE_SAVING`, `SAVING_TOO_SMALL`, `PAYMENT_TO_POOL_CONCERN`, `SELLER_TRUST`, `DELIVERY_TIMING`, `WARRANTY_CONCERN`, `WRONG_MODEL`, `POSTPONED`, `NO_LONGER_NEEDED`, `NOT_LISTABLE`, `NO_RESPONSE`.
- One primary code, optional secondary codes, and the person's own words. A non-response is never read as a reason.

---

*Founder's operating commitment, kept from the original master: tell the truth about demand, prices, dealer behaviour, buyer outcomes and the company's economics — even when the evidence says stop.*
