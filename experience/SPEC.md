# POOL — Experience Spec (front end)

**Before you buy it, POOL it.**

| | |
| --- | --- |
| Version | 1.0 — 1 Oct 2026 |
| What this is | The complete list of what the POOL app shows and does for the **buyer**, the **seller** and the **POOL team**, built from everything the founder has decided. The front end is built against this list. If something is missing here, it is missing in the app, so add it here first. |
| Backend | Comes later. Until then the app runs on a built-in simulation of the engine's rules. **Every simulated payment, message and record is labelled as simulated.** |
| Market | **India first** (INR, GST, UPI, pincodes, IST, English / తెలుగు / हिन्दी). The US is parked. |

## How to read the tags

Every feature says where it comes from, so nothing is invented.

| Tag | Source |
| --- | --- |
| **[F 29 Sep]** | Founder's own words in the chat, with the date |
| **[Brief §n]** | Founder's original brief (29 Sep), section n |
| **[WM §n]** | `POOL_WORKING_MODEL_v3.md`, section n |
| **[BP n]** | `POOL_BLUEPRINT.md`, product rule n |
| **[ENG file]** | The engine code in `pool/packages/engine/src` |
| **[CX A/Bn]** | `CODEX_PROMPT.md` work order item |
| **[GAP n]** | The 16-item feature-gap review of 30 Sep |
| **[RS]** | Verified research shown to the founder (UI/UX brief, critic's "wow" list) |
| **[ECOM]** | Standard e-commerce feature (Amazon, Flipkart and the like) that POOL must also have (founder, 1 Oct) |
| **[PROPOSAL]** | Not decided yet. Claude's suggestion, clearly marked so the founder can keep or drop it |

**Superseded decisions are not used.** The fixed fee in WM §3 was replaced by team pricing [F 30 Sep]. The 5 kg cap was removed [F 30 Sep]. Laptops, excluded in WM §8, are back in through the founder's college-laptop pools [F 29 Sep]. Product-specific logic is not allowed: units, steps, holds and taxes are data [F 30 Sep] [ENG].

---

## 0. Rules every screen follows

1. **Next action, total cost and choices are always visible.** A customer understands what to do next, what it costs in total and what else they can do, without anyone beside them. [F 1 Oct]
2. **Honest.** POOL never hides a better outside option and can say "Amazon is cheaper for you". [Brief §4] [BP 2]
3. **No dark patterns.** No fake timers or counters, no drip pricing, no pre-ticked add-ons. "Accept" and "Walk away" carry equal weight, with no shaming. [BP 7] [BP 12] [WM §5]
4. **Words.** We say "held until delivery", never "escrow". [project state, research]
5. **Universal.** Any product: rice, oil, mutton, cement, books, laptops, TVs, services. No screen is built around one product. [F 30 Sep] [F 29 Sep]
6. **India first.** Prices in lakh/crore format (₹45,99,900), IST times, GST split as CGST+SGST or IGST, UPI first, pincodes. [F 30 Sep] [CX A4] [CX A9]
7. **Languages.** English, తెలుగు and हिन्दी for buyers; first-time smartphone users on low-end Android. [AGENTS] [RS]
8. **States.** Every list and page has loading, empty and error states. Every action shows a confirmation and a result. [F 1 Oct]
9. **Simulated money is labelled** on every payment, refund and payout. [F 1 Oct]

---

## 1. Buyer

**Journey:** product → existing pool or start one → quantity, location and chosen closing time → refundable booking → personal offer → accept or walk away → payment → fulfilment, issues and handover → Wave Drop. [F 1 Oct]

### 1.0 Account and profile

| Feature | Source |
| --- | --- |
| Sign in with phone number and OTP (simulated OTP), with language choice at first launch | [ECOM] [BP stack: phone OTP] |
| Profile: name, phone, email (optional), language, city | [ECOM] |
| Addresses: add, edit, delete, set default; 6-digit pincode check with area and state; landmark; household label | [ECOM] [CX A9] |
| One household = one address and one payer; per-pool limits per household (for example 2 TVs) | [WM §6] [BP 4] [ENG uom] |
| Saved payment methods: UPI IDs, cards (masked) | [ECOM] |
| **"Your cards"**: which bank cards you hold (bank and type only, never the number), so comparisons show your real price with your card offers | [WM §1] [WM §2] |
| Notification settings per event: WhatsApp, SMS, email, push; message language | [ECOM] [RS] |
| Wishlist ("Saved"), recently viewed | [ECOM] |
| Privacy: consent notice, download my data, delete account | [BP compliance: DPDP] |
| Help centre, POOL Promise, ranking rule, terms, privacy, refund and cancellation policy, grievance officer | [WM §3] [WM §7] [BP 6] |
| Share POOL / invite neighbours on WhatsApp (no referral cash: neighbours buying raises everyone's Wave Drop) | [WM §5] [RS] |

### 1.1 Find the product

| Feature | Source |
| --- | --- |
| Paste any link: Amazon, Flipkart, Croma, Reliance Digital, brand site, Instagram, or a photo of a shop shelf | [Brief §2] |
| Amazon and Flipkart pages are never opened; POOL reads only the link (ASIN, product id, model in the name) and the buyer confirms | [BP 1] |
| Exact product card: brand, model, variant, key specs, warranty; each field shows its evidence ("from the link", "from the page", "unconfirmed") | [Brief §2] [BP 1] |
| In the first months a person checks every match: "A POOL expert confirms this model within 24 hours" | [WM §2] [WM §10] |
| Look-alike model warning (brands sell different model numbers on different sites) | [WM §8] |
| Scan a barcode: links for the same item from different stores land in the same pool | [RS] |
| Search and browse categories: electronics, appliances, groceries, meat and fish, books and stationery, building materials, services, furniture, laptops | [F 29 Sep] [F 30 Sep] |
| **Honest comparison**: all-in "you pay" price with your card offers, delivery date, installation, warranty, returns, seller; source and time checked; "Amazon is cheaper for you" when true | [Brief §4] [BP 2] [WM §2] |

### 1.2 Existing pool or start one

| Feature | Source |
| --- | --- |
| Matching: show the open pool for the same product in your area before letting you start a duplicate | [ENG pool: poolMatchKey] [GAP 14] |
| Pool page: product, area, committed households (real count), sealed bids so far, close time with a real countdown (never resets, chosen by the starter and logged), requirements, booking amount, best outside price, timeline, POOL Promise | [BP 3] [WM §7] [CX A7] |
| Start a pool: the starter picks the closing time (no default; at least 1 hour, at most 30 days) | [F 29 Sep] [ENG policy] |
| Two tracks: **community pools** at new-home handover (builder co-branded price card, move-in baskets) and **open city waves** | [WM §8] |
| Options per buyer (for example cut type, RAM and storage, colour) | [GAP 2] [ENG bids: optionsCovered] |
| Close time can move later only if every committed buyer agrees | [ENG pool: extendClose] [GAP 13] |
| Share card for WhatsApp | [RS] |

### 1.3 Quantity, location and closing time

| Feature | Source |
| --- | --- |
| Quantity in the pool's own unit (piece, kg, litre, metre, pack, hour), with minimum, step and maximum per buyer and per household | [ENG uom] [F 30 Sep: "everyone prefers 1 kg"] |
| Delivery address with pincode serviceability, or pickup area for pickup pools | [ENG slots] |
| "Need it by" date: you are only matched to sellers who can deliver by then | [CX A1] |
| Delivery mode where the pool offers a choice: home delivery, store pickup, delivery and installation, service visit | [ENG presets] [F 29 Sep] |
| Closing time: chosen when starting; shown to joiners with who set it and when | [F 29 Sep] [CX A7] |

### 1.4 Refundable booking

| Feature | Source |
| --- | --- |
| Booking amount set per pool (fixed, or a share of the estimate with a minimum and maximum) | [CX A2] |
| Refundable until dispatch; credited against the final price | [WM §2] [CX A2] |
| Only paid bookings count as committed demand, once per payer and once per address | [BP 4] |
| Simulated checkout: UPI (app or UPI ID), card, netbanking; payment pending, success and failure states | [ECOM] [WM §3] |
| Leave the pool before close and get the booking back | [ENG pool: leave] |

### 1.5 Personal offer

| Feature | Source |
| --- | --- |
| After close: "Sellers have bid. POOL is setting your price," with the time offers are due | [CX A5] |
| Guaranteed all-in price for your quantity; it never goes up | [WM §3] [BP 5] [BP 7] |
| Seller details on every offer: name, area, verified, GSTIN, rating from completed purchases only, return terms | [WM §3] [WM §7] |
| Delivery or installation date (never later than your need-by date), warranty, and the return cost if you refuse after dispatch | [ENG order: returnCost] [CX A1] |
| Price breakdown: taxable value, CGST+SGST (same state) or IGST (other state), booking credit, balance | [CX A4] |
| Saving against your best outside price, or "Amazon is cheaper for you" | [BP 2] |
| Wave Drop expected, from real numbers only | [WM §5] |
| Other outcomes, each with a full refund and a plain reason: no seller met the requirements (no deal), seller capacity ran out (unserved), need-by date not met | [ENG pool] [CX A1] |

### 1.6 Accept or walk away

| Feature | Source |
| --- | --- |
| Two equal buttons: "Accept ₹X" and "Walk away, refund my booking" | [BP 7] |
| Decide-by time; no reply counts as walking away, with a full refund (never a silent charge) | [ENG default B] [GAP 5] |

### 1.7 Payment

| Feature | Source |
| --- | --- |
| Pay in full now (UPI, card, netbanking), card EMI, or pay the balance at the door by UPI or card after checking the box. Never cash. | [WM §3] [CX A3] |
| Money held by the licensed payment company until you give the code | [WM §3] [BP 8] |
| Card offers applied only on POOL's own checkout | [project state, research] |
| Receipt, payment reference, retry after failure | [ECOM] |

### 1.8 Fulfilment, issues and handover

| Feature | Source |
| --- | --- |
| Tracking moves only on proof: seller confirms → dispatch photo → delivery code → serial-number photo and invoice → installation job number | [WM §7] [BP 11] |
| Pickup pools: area-wise pickup slots with limited capacity; "ready for pickup" photo | [F 29 Sep: area-wise code] [ENG slots] |
| Courier tracking when a delivery partner is used | [F 29 Sep] [RS] |
| **Handover**: open-box checklist first (right item, no damage, serial matches / right quantity / work done), then the code is shown. Single use, expires, limited tries; POOL never asks for it. | [WM §6] [ENG codes] [GAP 8] |
| Pay at the door: pay the balance to unlock the code | [CX A3] |
| Installation: track the job; postpone if the flat isn't ready (up to 45 days) | [ENG fulfilment: holds] [GAP 11] |
| Late delivery: cancel free, plus an automatic late credit paid by the seller | [WM §7] [GAP 12] |
| Cancel: free before dispatch; after dispatch at most the disclosed return cost | [ENG order: buyerCancels] [GAP 9] |
| Report a problem (damaged, wrong item, not as described, late, installation not done, missing parts, other): ticket number, seller reply deadline, POOL steps in, resolution by replacement, repair or refund. "We refund first and recover from the seller." | [WM §7] |
| Big appliances: no change-of-mind returns; dead-on-arrival goes through the brand check | [WM §6] |
| Seller fails: a backup seller delivers at the same price | [ENG order: backupCostGap] [CX A6] |
| GST invoice in your name; warranty registered | [WM §7] |
| Rate the seller (only after a completed purchase) | [WM §7] |
| **Warranty Locker**: invoices, warranty cards, serial numbers, installation job numbers | [WM §2] |

### 1.9 Wave Drop

| Feature | Source |
| --- | --- |
| What it is, explained at join and offer: every completed purchase drops a slab into a shared pot, split equally | [WM §5] [ENG wave-drop] |
| Live pot from real completed purchases only, with the real wave-close date and your share | [WM §5] |
| "Completed" means paid, delivered, installed, return window over, no open dispute | [WM §5] |
| Paid back to your card or UPI as a partial refund | [WM §5] [BP 10] |

### 1.10 Money: payments and refunds

| Feature | Source |
| --- | --- |
| Every payment (booking, order, balance at the door) and its state (held, released) | [ENG order] |
| Every refund with its reason (left the pool, walked away, no reply, no deal, unserved, cancelled, returned, seller cancelled, late credit, Wave Drop) and a timeline: started → processed → credited | [ENG] [CX A2] |

### 1.11 Notifications

| Feature | Source |
| --- | --- |
| Inbox in the app, plus previews of the WhatsApp, SMS and email messages, in your language | [RS] [AGENTS] |
| Booking confirmed · pool closing soon (real time) · pool closed · offer ready · reminder before the decide-by time · payment confirmed · seller confirmed · dispatched · out for delivery · code ready · delivered · installation · issue updates · refund started and credited · Wave Drop paid · no deal / unserved | [ENG events] |

### 1.12 Other ways in

| Feature | Source |
| --- | --- |
| WhatsApp: a Telugu voice note ("rendu kilo mutton curry cut, Sunday") joins a pool, with a Telugu reply | [RS critic "wow" list] [BP stretch] |
| Join, find or check a pool from an AI assistant (Claude) through POOL's connector | [BP §5.8] [RS] |

---

## 2. Seller

**Journey:** eligible demand → private bid, capacity and terms → awarded orders → fulfilment → payout and hold breakdown. [F 1 Oct]

### 2.0 Onboarding and profile

| Feature | Source |
| --- | --- |
| Sign up: business name, GSTIN (format and checksum checked), PAN, bank account (penny-drop check), address, categories, service pincodes, pickup points, authorised-dealer proof, documents | [ECOM] [CX A9] [WM §6] |
| Verification status with review messages | [ECOM] |
| Security deposit (backs the Promise and Wave Drop penalties) | [WM §7] [ENG wave-drop] |
| **Public seller profile** shown to buyers: name, area, verified, GSTIN, rating from completed purchases, on-time rate, return terms | [WM §3] [WM §7] |
| Team members and roles; store timings | [ECOM] |
| Bank account change only after a call-back check and a waiting period | [WM §6] |
| Bid from WhatsApp (no app needed) | [RS] |

### 2.1 Eligible demand

| Feature | Source |
| --- | --- |
| Only pools in your categories and service area | [ECOM] [WM §6] |
| Only committed demand (paid bookings), counted per household. No buyer identities until a buyer accepts. | [BP 4] [Brief §5] |
| Demand detail: committed households and units, options split, need-by dates, pincode clusters, requirements, best outside price, close time, published ranking rule | [ENG bids] [BP 6] |

### 2.2 Private bid, capacity and terms

| Feature | Source |
| --- | --- |
| Your own price per unit, capacity, deliver-by date, delivery modes, terms (warranty months, installation included…), options covered | [ENG bids] |
| Wave Drop slabs, with a preview proving every extra sale still earns you money | [WM §5] [ENG wave-drop] |
| Valid through the buyer's decide window | [ENG bids] |
| Sealed: nobody sees another seller's bid. Every view of your bid is logged, and you can see that log. | [BP 5] [WM §6] |
| Lower before close, never raise | [ENG default C] |
| Payout preview: your price − TCS − TDS − holds = released on the code | [ENG order: splitOrder] |

### 2.3 Awarded orders

| Feature | Source |
| --- | --- |
| Result at close: your rank under the published rule, units awarded in join order, backup status | [ENG bids: rankBids, award] |
| Buyer price is set by POOL; buyer details appear only after the buyer accepts | [F 30 Sep] [Brief §5] |

### 2.4 Fulfilment

| Feature | Source |
| --- | --- |
| Per order: confirm → dispatch (photo or AWB) → enter or scan the buyer's code → serial photo and invoice → installation job number. Pickup orders: ready photo and slots. Service visits. | [ENG presets] [WM §7] |
| Delivery day per area (batching) | [WM §4] |
| Late-delivery and cancellation consequences shown before they happen | [ENG order] |
| Respond to issues within the deadline | [WM §7] |
| Manage pickup slots and capacity | [ENG slots] |

### 2.5 Payout and hold breakdown

| Feature | Source |
| --- | --- |
| Per order: buyer price (set by POOL), your price, POOL commission (with 18% GST you can claim), TCS 0.5%, TDS 0.1%, installation hold (10%), Wave Drop hold (largest slab), released on the code | [ENG order] [ENG policy] [WM §3] |
| When each hold is released and why; late credits | [ENG order: holdsDue] |
| Wave close: pot paid to buyers, unused hold released to you | [ENG wave-drop: closeWave] |
| Statements and tax credit reports (TCS, TDS, GST on commission); bank settlements | [ECOM] |
| Security deposit ledger | [WM §7] |

### 2.6 Performance

| Feature | Source |
| --- | --- |
| Rating from completed purchases only, on-time rate, win rate, cancellations. Nobody can pay for rank. | [WM §7] |

---

## 3. POOL team (operations console)

**Journey:** seller review → awards → setting buyer prices → exceptions and refunds → financial reconciliation. [F 1 Oct]

| Area | Feature | Source |
| --- | --- | --- |
| **Seller review** | Applications; GSTIN (format, checksum, state code, legal name), PAN, bank name match, authorised-dealer proof, address; approve, ask for changes or reject, with reasons; bank-change requests | [WM §6] [CX A9] |
| **Awards** | At close: eligible bids and why others are not; published ranking; low-bid flags (15% below the median) to block or allow with a reason; households assigned in join order with capacity and backups; unserved reasons; bid access log | [ENG bids] [CX A1] [BP 5] |
| **Buyer prices** | Per winning bid: seller price, best outside price, recommended minimum saving (₹1,000 or 2%, whichever is higher; shown, never forced), buyer price, POOL margin, GST inside the margin, buyer saving. No price below the seller's. Who decided and when. Deadline, after which the pool becomes "no deal" with full refunds. Publish offers. | [F 30 Sep] [ENG pricing] [ENG policy] [CX A5] |
| **Exceptions and refunds** | Issues with deadlines (grievance: acknowledge in 48 hours, resolve within a month); seller failures moved to the backup at the same buyer price; late deliveries and credits; failed payments; timed-out offers; every refund with its reason and payment reference; risk signals (one payer across households, near-identical bids and winner rotation, join bursts, low bids), which never punish automatically | [WM §3] [WM §6] [CX A6] [CX A8] |
| **Reconciliation** | Double-entry ledger: buyer money held by the payment company, seller payable (held and released), POOL margin, GST on commission, TCS and TDS payable, refunds, Wave Drop pots, deposits. The trial balance ties out to the paisa. Payment-company settlement matching. No double refunds. | [CX B3] [CX B6] [ENG] |
| Overview | Live pools, committed households, offers waiting, orders in delivery, money held, exceptions; weekly scorecard (acceptance rate, saving per order, on-time delivery, minutes per unit, sellers offering a Wave Drop) | [WM §10] |
| Pools | Every pool and its full history; team-created pools (product, unit, quantity rule, booking, delivery profile, requirements, close time); community pools with builder co-branding; handover calendar (Possession Radar) | [WM §8] |
| Settings | Categories, units, delivery profiles (steps, proofs, checklist, code length, holds, return window), HSN and GST rates, policy values (decide window, pool length, low-bid flag) | [ENG presets] [ENG policy] [CX A10] |
| Audit log | Every price, count and close time shown to buyers, plus every decision | [CX A7] [GAP 15] |
| Speed | Ctrl+K to jump to any order, pool, seller or refund | [RS] |

---

## 4. Investor walkthrough

| Feature | Source |
| --- | --- |
| A guided story across buyer, seller and POOL team, using the same live data, with a plain explanation of the business at each step | [F 1 Oct] |
| Demo controls: move the clock to the pool's close, the end of the decide window or the end of the return window; make a payment fail; reset the demo | [F 1 Oct] |
| A "where is the money now" view at every step | [WM §3] [PROPOSAL] |

## 5. What is simulated (and always labelled)

Payments, refunds and payouts (Razorpay-style test flow), OTPs, WhatsApp and SMS messages, courier tracking, AI link reading, voice notes, barcode scans, and every person, shop and number in the sample data. Product names are sample brands, and outside prices are sample prices.

## 6. Parked, or waiting on a decision (not shown as live)

- US region (Stripe, USD). [F 30 Sep]
- UPI block instead of charge (Reserve Pay), until Razorpay confirms it. [BP 4]
- The exact deposit amount, the trust reserve (0.5%) and the late-credit amount are still guesses. [WM §7] [GAP 12]
- Exchange offers are not decided.

---

## 7. v1.1 additions (founder review, 1 Oct: "still lacking, think like 2026")

An honest critique of v1.0: it listed the mechanics but not the reasons to open POOL. These additions fix that. **All are [PROPOSAL]** unless a source is given. Two ideas are blocked by the founder's master spec and are deliberately limited:
- **No autonomous buying.** The master spec blocks it. "Autopilot" is limited to alerts and never pays on anyone's behalf.
- **No wallet and no BNPL.** The master spec blocks them. Refunds always go back to the original payment method [WM §3].

### 7.1 Landing page (public front door)
- **The hero is the product working**: paste a link → POOL Check reads it → honest comparison → the live pool. Interactive and clearly marked as sample data.
- **Live city map** of Hyderabad: pools forming by pincode cluster, with real counts from the data (no fake counters [BP 12]).
- **Sealed-bid vault**: seller envelopes arrive, prices stay hidden until close, and every view is logged [BP 5].
- **Wave Drop slider**: drag "completed neighbours" and watch your refund grow while the seller's profit never drops (the WM §5 table, made interactive).
- **"Where is my rupee" ribbon**: booking → held by the payment company → released on the code → Wave Drop back [WM §3].
- **POOL Promise**: six promises [WM §7]. Honesty example: "Amazon is cheaper for you — we'll say so" [BP 2].
- **Three doors**: buyers, sellers ("stop paying for ads — compete for buyers who already paid a booking" [Brief §5]), communities and builders [WM §8].
- **Language switch** (English / తెలుగు / हिन्दी) on the page itself; universal categories, from rice to TVs to services [F 30 Sep].
- **Investor door**: the business in 60 seconds, unit economics and the walkthrough.

### 7.2 Buyer home (2026)
- One smart bar: paste, search, speak (Telugu/Hindi/English), scan a barcode, or **share from any shopping app** (Android share target [RS hidden gems: PWA share target]).
- **Your next step** cards: offers to decide, codes to give, pools closing (real times).
- **Watching**: price watch and "tell me when a pool forms" (alerts only).
- **Your household**: money held, Wave Drops coming, Warranty Locker, service reminders.
- **Your community**: your society's pools and move-in basket [WM §8].
- **Weekly rhythm**: standing pools, such as "Sunday mutton, closes Fri 8 PM", joined in one tap every week (alerts plus one-tap booking, never auto-pay).

### 7.3 Intelligence
- **Ask POOL**: an assistant that explains an offer, compares options and answers in Telugu, Hindi or English by text or voice (simulated in the demo; Claude via the official SDK in production [AGENTS]).
- **Price history**: the 30-day lowest price beside every "was" price, as required from 1 Jan 2027 [WM §3].
- **When to buy**: honest guidance during festive bank-offer weeks [WM §4].

### 7.4 Trust layer
- Photo reviews from completed purchases only [WM §7]; public seller scorecards (on-time, cancellations, issues resolved).
- **POOL track record**: completed pools, savings delivered, on-time rate and refunds paid, from real records only.
- Tracker for POOL Promise claims (late credit, install escalation, genuine-product refund).

### 7.5 Community and builder track [WM §8]
- Society page (for example Lakeview Heights): handover date, move-in basket, community price card, co-branded with the builder.
- Move-in planner: choose appliances, set a budget, and join several pools in one go (every line priced and kept alone).
- Builder / residents' association admin portal: invite residents, see demand, schedule delivery days.
- Handover calendar (Possession Radar) in the ops console.

### 7.6 After the sale: the home grows
- Warranty Locker → **Home inventory**: warranty expiry, service and filter reminders, and AC-service waves [WM §11]; re-pool in one tap.

### 7.7 Seller additions
- Forward demand calendar: upcoming handovers and seasonal waves (summer AC wave, Feb 2027 [WM §8]).
- **Delivery staff mode**: today's route, scan or enter the buyer's code at the door, photo proof.
- Auto-generated GST invoices; win/loss feedback (rank and the reason a bid wasn't eligible, never other sellers' prices).
- Capacity planner and stock commitment across pools; brand-desk and chain accounts [WM §6].

### 7.8 POOL team additions
- Live city map; wave calendar (weekly waves by category); WhatsApp broadcast templates; support inbox.
- Fraud graph: accounts linked by payer, device or address [CX A8].
- Unit economics: margin, payment costs and minutes per unit per pool [WM §9].
