/**
 * SAMPLE WORLD for the demo. Every number is produced by the same rules the engine uses (engine.ts), relative to "now",
 * so a reset always gives a consistent, believable state. People, shops and brands are invented.
 */
import { mulberry32, pick, randInt } from '../lib/rand';
import { rs } from '../lib/money';
import { atIST, DAY, HOUR, MIN } from '../lib/time';
import { PRODUCTS, PROFILES, SELLERS, UOMS } from './catalog';
import { closeWave, computeAward, lineTotal, splitOrder, waveCount, holdPerUnit } from './engine';
import type { AuditEvent, Bid, Community, Member, Notification, Order, Pool, RiskSignal, SellerApplication, State, Ticket } from './types';

export const STATE_VERSION = 7;

const FIRST = ['Ravi', 'Sowmya', 'Imran', 'Deepika', 'Venkat', 'Farhana', 'Kiran', 'Lavanya', 'Arjun', 'Meena', 'Suresh', 'Ayesha', 'Prakash', 'Swathi', 'Naveen', 'Rekha', 'Abdul', 'Harika', 'Mahesh', 'Divya', 'Srikanth', 'Nikhila', 'Rahul', 'Bhavana', 'Sai', 'Keerthi', 'Anil', 'Shreya', 'Gopal', 'Fatima', 'Vamsi', 'Pooja', 'Rajesh', 'Anusha', 'Karthik', 'Madhavi', 'Yusuf', 'Sneha', 'Teja', 'Ramya', 'Vinod', 'Priyanka', 'Ashok', 'Hima', 'Sandeep', 'Sravani', 'Manoj', 'Uma', 'Chaitanya', 'Neha', 'Zoya', 'Bharath', 'Tanvi', 'Rohit', 'Geetha', 'Salman', 'Mounika', 'Pavan', 'Jyothi', 'Aditya'];
const INITIALS = 'ABCDGKLMNPRSTVY';
const AREAS: Record<string, Array<[string, string]>> = {
  west: [['500032', 'Gachibowli'], ['500084', 'Kondapur'], ['500081', 'Madhapur'], ['500089', 'Manikonda'], ['500019', 'Lingampally'], ['500075', 'Kokapet'], ['500033', 'Jubilee Hills']],
  gk: [['500032', 'Gachibowli'], ['500084', 'Kondapur']],
  kondapur: [['500084', 'Kondapur'], ['500032', 'Gachibowli'], ['500081', 'Madhapur']],
  miyapur: [['500049', 'Miyapur'], ['500050', 'Chandanagar'], ['500085', 'KPHB']],
  north: [['500100', 'Kompally'], ['501401', 'Medchal'], ['500055', 'Jeedimetla']],
  medchal: [['501401', 'Medchal'], ['500100', 'Kompally']],
  lakeview: [['500032', 'Lakeview Heights, Gachibowli']],
};

type R = () => number;

export function seed(now: number): State {

  const T0 = now;
  const at = (days: number, hour: number, minute = 0) => atIST(T0, days, hour, minute);
  let n = 0;
  const id = (p: string) => `${p}-${(++n).toString(36)}`;

  const me = {
    id: 'b-me',
    name: 'Ananya Reddy',
    phone: '+91 98480 12321',
    email: 'ananya.reddy@example.in',
    city: 'Hyderabad',
    memberSince: T0 - 41 * DAY,
    addresses: [
      { id: 'addr-home', label: 'Home', name: 'Ananya Reddy', line1: 'Flat 304, Sri Sai Residency', line2: 'Road No. 2, Gachibowli', landmark: 'Opp. DLF back gate', city: 'Hyderabad', state: 'Telangana', stateCode: '36', pincode: '500032', phone: '+91 98480 12321', isDefault: true },
      { id: 'addr-new', label: 'New flat (handover 15 days)', name: 'Ananya Reddy', line1: 'Flat 1204, Tower B, Lakeview Heights', line2: 'Gachibowli–Nanakramguda Road', landmark: 'Next to Lakeview clubhouse', city: 'Hyderabad', state: 'Telangana', stateCode: '36', pincode: '500032', phone: '+91 98480 12321' },
      { id: 'addr-parents', label: 'Parents', name: 'Padma Reddy', line1: 'H.No. 8-3-112, Sri Nagar Colony', line2: 'Kukatpally', city: 'Hyderabad', state: 'Telangana', stateCode: '36', pincode: '500072', phone: '+91 94403 •••18' },
    ],
    upi: ['ananya.reddy@okhdfc'],
    cards: [
      { id: 'card-hdfc', bank: 'HDFC Bank', type: 'credit' as const, network: 'Visa', last4: '4421' },
      { id: 'card-sbi', bank: 'SBI Card', type: 'credit' as const, network: 'RuPay', last4: '0098' },
    ],
    household: { size: 3, key: 'hh-me' },
    communityId: 'c-lakeview',
  };

  const pools: Pool[] = [];
  const orders: Order[] = [];
  const tickets: Ticket[] = [];
  const audit: AuditEvent[] = [];
  const notifications: Notification[] = [];
  const log = (atMs: number, actor: string, action: string, detail: string, poolId?: string, orderId?: string) =>
    audit.push({ id: id('ev'), at: atMs, actor, action, detail, poolId, orderId });
  const notify = (to: Notification['to'], kind: Notification['kind'], atMs: number, title: string, body: string, href?: string, read = false, channels: Notification['channels'] = ['app', 'whatsapp']) =>
    notifications.push({ id: id('n'), to, kind, at: atMs, title, body, href, read, channels });

  // ---------- members ----------
  let householdSeq = 0;
  function genMembers(rr: R, count: number, o: { from: number; to: number; area: keyof typeof AREAS; qty: (rr: R) => number; booking: number; options?: (rr: R) => Record<string, string>; needBy?: (rr: R) => number | undefined }): Member[] {
    const out: Member[] = [];
    for (let i = 0; i < count; i++) {
      const [pin, area] = pick(rr, AREAS[o.area]);
      const joinedAt = Math.round(o.from + ((o.to - o.from) * (i + rr() * 0.8)) / count);
      householdSeq++;
      out.push({
        id: id('m'),
        name: `${pick(rr, FIRST)} ${INITIALS[Math.floor(rr() * INITIALS.length)]}.`,
        pincode: pin,
        area,
        householdKey: `hh-${householdSeq}`,
        payerKey: `py-${householdSeq}`,
        deviceKey: `dv-${householdSeq}`,
        qtyBase: o.qty(rr),
        options: o.options ? o.options(rr) : {},
        needBy: o.needBy?.(rr),
        joinedAt,
        status: 'committed',
        bookingPaise: o.booking,
        bookingRef: `pay_SIM_${Math.floor(rr() * 1e10).toString(36).toUpperCase()}`,
        bookingMethod: rr() < 0.82 ? 'UPI' : 'Card',
        bookingPaidAt: joinedAt + 40_000,
        channel: rr() < 0.08 ? 'whatsapp' : 'app',
      });
    }
    return out;
  }

  function mkBid(poolId: string, sellerId: string, price: number, cap: number, deliverBy: number, submittedAt: number, extra: Partial<Bid> = {}): Bid {
    return {
      id: `b-${poolId.replace('pool-', '')}-${sellerId.replace('s-', '')}`,
      poolId,
      sellerId,
      revision: 1,
      pricePaise: rs(price),
      capacityBase: cap,
      deliverBy,
      modes: ['home_delivery'],
      terms: {},
      optionsCovered: [],
      slabs: [],
      validUntil: deliverBy + 10 * DAY,
      submittedAt,
      history: [{ revision: 1, pricePaise: rs(price), at: submittedAt }],
      accessLog: [],
      ...extra,
    };
  }

  function basePool(p: Partial<Pool> & Pick<Pool, 'id' | 'no' | 'productId' | 'areaLabel' | 'createdAt' | 'closesAt' | 'state' | 'profileId' | 'bookingPaise'>): Pool {
    return {
      areaKey: p.areaLabel.toLowerCase().replace(/[^a-z]+/g, '-'),
      pincodes: [],
      track: 'open',
      startedBy: { name: 'POOL team', at: p.createdAt, team: true },
      qtyRule: { minBase: 1, stepBase: 1, maxPerHouseholdBase: 2 },
      checkoutPlans: ['prepay', 'door', 'emi'],
      requirements: { deliverWithinDays: 5, modes: ['home_delivery'], terms: [] },
      waveCountMode: 'per_uom',
      members: [],
      bids: [],
      invitedSellers: [],
      blocked: {},
      prices: {},
      ...p,
    } as Pool;
  }

  const product = (pid: string) => PRODUCTS.find((x) => x.id === pid)!;
  const profile = (pid: string) => PROFILES.find((x) => x.id === pid)!;
  const code = (rr: R, digits: 4 | 6) => String(Math.floor(rr() * 10 ** digits)).padStart(digits, '0');

  /** Make an order exactly as the engine would: totals from lineTotal, holds from the profile, wave hold from the largest slab. */
  function mkOrder(rr: R, pool: Pool, m: Member, bid: Bid, opts: { createdAt: number; plan?: Order['plan']; status: Order['status']; steps?: Order['steps']; handedOverAt?: number; settledAt?: number; address?: string; promisedBy?: number; slot?: Order['slot'] }): Order {
    const prod = product(pool.productId);
    const uom = UOMS[prod.uom];
    const price = pool.prices[bid.id];
    const buyerTotal = lineTotal(price.buyerPricePaise, m.qtyBase, uom);
    const sellerTotal = lineTotal(bid.pricePaise, m.qtyBase, uom);
    const plan = opts.plan ?? (rr() < 0.7 ? 'prepay' : 'door');
    const paid = plan === 'door' && opts.status === 'confirmed' ? m.bookingPaise : buyerTotal;
    const prof = profile(pool.profileId);
    const o: Order = {
      id: id('o'),
      no: `PO-${String(randInt(rr, 100000, 999999))}`,
      poolId: pool.id,
      memberId: m.id,
      isMe: m.isMe,
      buyerName: m.name,
      buyerPhoneMasked: `+91 9${randInt(rr, 1000, 9999)} •••${randInt(rr, 10, 99)}`,
      address: opts.address ?? `${randInt(rr, 1, 1800)}, ${pick(rr, ['Tower A', 'Tower C', 'Block 2', 'Plot 44', 'Lane 3', 'H.No 6-2'])}, ${m.area}, Hyderabad`,
      pincode: m.pincode,
      sellerId: bid.sellerId,
      productId: pool.productId,
      qtyBase: m.qtyBase,
      options: m.options,
      bidId: bid.id,
      buyerPricePaise: price.buyerPricePaise,
      sellerPricePaise: bid.pricePaise,
      buyerTotal,
      sellerTotal,
      bookingCredit: m.bookingPaise,
      plan,
      paidPaise: paid,
      balanceDue: buyerTotal - paid,
      payMethod: rr() < 0.75 ? 'UPI' : 'Card',
      payRef: `pay_SIM_${Math.floor(rr() * 1e10).toString(36).toUpperCase()}`,
      status: opts.status,
      steps: opts.steps ?? [],
      promisedBy: opts.promisedBy ?? bid.deliverBy,
      slot: opts.slot,
      code: { value: code(rr, prof.codeDigits), digits: prof.codeDigits, expiresAt: atIST(T0, 0, 23, 59), attempts: 0, maxAttempts: 5 },
      checklist: {},
      handedOverAt: opts.handedOverAt,
      paidAt: paid > m.bookingPaise ? opts.createdAt + 4 * MIN : undefined,
      holdsReleased: [],
      tickets: [],
      createdAt: opts.createdAt,
      settledAt: opts.settledAt,
    };
    m.orderId = o.id;
    if (opts.handedOverAt) o.invoiceNo = `INV/${bid.sellerId.slice(2, 5).toUpperCase()}/26-27/${randInt(rr, 1000, 9999)}`;
    return o;
  }

  function confirmAwardAndPrice(pool: Pool, atAward: number, prices: Record<string, number>, atPrice: number, note?: string) {
    pool.award = computeAward(pool, SELLERS, atAward);
    pool.award.confirmedAt = atAward + 20 * MIN;
    pool.award.confirmedBy = 'Aarav Mehta (pricing)';
    for (const [bidId, price] of Object.entries(prices)) {
      pool.prices[bidId] = { bidId, buyerPricePaise: rs(price), decidedBy: 'Aarav Mehta (pricing)', decidedAt: atPrice, note };
    }
    log(atAward + 20 * MIN, 'Aarav Mehta', 'Award confirmed', `${pool.award.assignments.length} households assigned, ${pool.award.unserved.length} unserved`, pool.id);
    for (const [bidId, price] of Object.entries(prices)) log(atPrice, 'Aarav Mehta', 'Buyer price set', `${bidId}: ₹${price.toLocaleString('en-IN')} per unit`, pool.id);
  }

  // =====================================================================================
  // 1. TV — open (the walkthrough pool). Lakshmi has not bid yet.
  // =====================================================================================
  {
    const rr = mulberry32(101);
    const createdAt = at(-2, 15, 10);
    const closesAt = at(2, 18);
    const p = basePool({
      id: 'pool-tv', no: 'POOL-HYD-TV-0412', productId: 'p-tv', areaLabel: 'Hyderabad West', pincodes: ['500032', '500084', '500081', '500089', '500019', '500075', '500033'],
      startedBy: { name: 'Ravi K. (Kondapur)', at: createdAt }, createdAt, closesAt, state: 'open', profileId: 'delivery_with_installation', bookingPaise: rs(2000),
      requirements: { deliverWithinDays: 5, modes: ['home_delivery'], terms: [{ key: 'installation_included', label: 'Installation included', op: 'eq', value: true }, { key: 'warranty_months', label: 'Warranty (months)', op: 'gte', value: 12 }] },
      invitedSellers: ['s-lakshmi', 's-deccan', 's-kaveri', 's-sairam', 's-metro', 's-quickdeal', 's-branddesk'],
    });
    p.members = genMembers(rr, 47, { from: createdAt, to: T0 - 25 * MIN, area: 'west', qty: (x) => (x() < 0.12 ? 2 : 1), booking: rs(2000) });
    p.members[0].name = 'Ravi K.';
    p.members[0].area = 'Kondapur';
    p.members[0].pincode = '500084';
    // One device used for three households (risk signal, counted but flagged; never auto-punished).
    for (const k of [17, 18, 19]) p.members[k].deviceKey = 'dv-shared-1';
    const tv = (sid: string, price: number, cap: number, days: number, ago: number, extra: Partial<Bid> = {}) =>
      mkBid('pool-tv', sid, price, cap, closesAt + days * DAY, T0 - ago * HOUR, { terms: { installation_included: true, warranty_months: 12, wall_mount: 'included' }, ...extra });
    p.bids = [
      tv('s-deccan', 40450, 30, 4, 20, { history: [{ revision: 1, pricePaise: rs(40990), at: T0 - 30 * HOUR }, { revision: 2, pricePaise: rs(40450), at: T0 - 20 * HOUR }], revision: 2 }),
      tv('s-kaveri', 40200, 60, 6, 26, { slabs: [{ fromUnit: 11, perUnitPaise: rs(300) }, { fromUnit: 26, perUnitPaise: rs(600) }] }),
      tv('s-sairam', 41100, 20, 3, 9),
      tv('s-metro', 40900, 25, 4, 14, { slabs: [{ fromUnit: 30, perUnitPaise: rs(200) }] }),
      tv('s-quickdeal', 33500, 100, 5, 3),
      tv('s-branddesk', 40800, 200, 5, 30, { terms: { installation_included: true, warranty_months: 24, wall_mount: 'included' }, slabs: [{ fromUnit: 25, perUnitPaise: rs(400) }, { fromUnit: 50, perUnitPaise: rs(600) }] }),
    ];
    p.bids[0].accessLog = [{ who: 'Pricing desk', role: 'POOL team', at: T0 - 19 * HOUR, why: 'Pre-close completeness check (prices hidden)' }];
    log(createdAt, 'Ravi K.', 'Pool started', 'Close time chosen: ' + new Date(closesAt).toISOString(), p.id);
    pools.push(p);
  }

  // =====================================================================================
  // 2. AC — closed 90 min ago; award computed, waiting for the POOL team (I am a member).
  // =====================================================================================
  {
    const rr = mulberry32(202);
    const createdAt = at(-4, 11);
    const closesAt = T0 - 90 * MIN;
    const p = basePool({
      id: 'pool-ac', no: 'POOL-HYD-AC-0388', productId: 'p-ac', areaLabel: 'Hyderabad West', pincodes: ['500032', '500084', '500081', '500089'],
      startedBy: { name: 'Sowmya P. (Madhapur)', at: createdAt }, createdAt, closesAt, state: 'closed', profileId: 'delivery_with_installation', bookingPaise: rs(2000),
      requirements: { deliverWithinDays: 5, modes: ['home_delivery'], terms: [{ key: 'installation_included', label: 'Installation included', op: 'eq', value: true }, { key: 'warranty_months', label: 'Warranty (months)', op: 'gte', value: 12 }] },
      invitedSellers: ['s-coolair', 's-kaveri', 's-lakshmi', 's-metro', 's-quickdeal'],
      closedAt: closesAt,
      pricingDeadline: closesAt + 4 * HOUR,
    });
    p.members = genMembers(rr, 57, { from: createdAt, to: closesAt - 30 * MIN, area: 'west', qty: () => 1, booking: rs(2000) });
    const mine: Member = { id: 'm-me-ac', isMe: true, name: 'Ananya R.', pincode: '500032', area: 'Gachibowli', householdKey: 'hh-me', payerKey: 'py-me', deviceKey: 'dv-me', qtyBase: 1, options: {}, joinedAt: at(-3, 20, 15), status: 'committed', bookingPaise: rs(2000), bookingRef: 'pay_SIM_AC7Q2M9X', bookingMethod: 'UPI · ananya.reddy@okhdfc', bookingPaidAt: at(-3, 20, 16) };
    p.members.splice(19, 0, mine);
    p.members.sort((a, b) => a.joinedAt - b.joinedAt);
    const ac = (sid: string, price: number, cap: number, days: number, ago: number, extra: Partial<Bid> = {}) =>
      mkBid('pool-ac', sid, price, cap, closesAt + days * DAY, closesAt - ago * HOUR, { terms: { installation_included: true, warranty_months: 12, copper_pipe_m: 3 }, ...extra });
    p.bids = [
      ac('s-coolair', 36900, 40, 4, 30, { slabs: [{ fromUnit: 11, perUnitPaise: rs(300) }, { fromUnit: 26, perUnitPaise: rs(500) }] }),
      ac('s-kaveri', 36400, 25, 5, 44),
      ac('s-lakshmi', 37200, 30, 4, 20, { slabs: [{ fromUnit: 21, perUnitPaise: rs(400) }] }),
      ac('s-metro', 38100, 20, 5, 10),
      ac('s-quickdeal', 30500, 80, 5, 2),
    ];
    p.award = computeAward(p, SELLERS, closesAt + 2 * MIN);
    log(closesAt, 'System', 'Pool closed at the chosen time', `${p.members.length} committed households; 5 sealed bids opened`, p.id);
    notify('buyer', 'pool', closesAt + 3 * MIN, 'Your AC pool has closed', '5 sellers bid privately. The POOL team is setting your price; your offer comes by ' + new Date(p.pricingDeadline!).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }) + '.', '/buyer/pool/pool-ac');
    notify('ops', 'award', closesAt + 3 * MIN, 'AC pool closed — award needs review', '58 households · 5 bids · 1 low-bid flag. Pricing deadline in 4 h.', '/ops/awards/pool-ac');
    notify('seller', 'award', closesAt + 3 * MIN, 'AC pool closed', 'Your bid of ₹37,200 is in the award review. You will hear the result after POOL publishes offers.', '/seller/bids', false);
    pools.push(p);
  }

  // =====================================================================================
  // 3. Rice — offers out; I have an offer for 2 bags. 54 households already accepted.
  // =====================================================================================
  {
    const rr = mulberry32(303);
    const createdAt = at(-4, 9);
    const closesAt = T0 - 8 * HOUR;
    const offersAt = T0 - 5 * HOUR - 30 * MIN;
    const p = basePool({
      id: 'pool-rice', no: 'POOL-HYD-RICE-0219', productId: 'p-rice', areaLabel: 'Gachibowli & Kondapur', pincodes: ['500032', '500084'],
      startedBy: { name: 'Lavanya S. (Kondapur)', at: createdAt }, createdAt, closesAt, state: 'offers', profileId: 'home_delivery', bookingPaise: rs(200),
      qtyRule: { minBase: 1, stepBase: 1, maxPerHouseholdBase: 4 }, checkoutPlans: ['prepay', 'door'], requirements: { deliverWithinDays: 3, modes: ['home_delivery'], terms: [{ key: 'crop', label: 'New crop', op: 'eq', value: 'new' }] },
      invitedSellers: ['s-annapurna', 's-krishna'], closedAt: closesAt, pricingDeadline: closesAt + 4 * HOUR, offersAt, acceptBy: offersAt + 24 * HOUR,
    });
    p.members = genMembers(rr, 85, { from: createdAt, to: closesAt - 20 * MIN, area: 'gk', qty: (x) => (x() < 0.55 ? 1 : x() < 0.85 ? 2 : 3), booking: rs(200) });
    const mine: Member = { id: 'm-me-rice', isMe: true, name: 'Ananya R.', pincode: '500032', area: 'Gachibowli', householdKey: 'hh-me', payerKey: 'py-me', deviceKey: 'dv-me', qtyBase: 2, options: {}, joinedAt: at(-2, 19, 40), status: 'committed', bookingPaise: rs(200), bookingRef: 'pay_SIM_RC2K8P1Z', bookingMethod: 'UPI · ananya.reddy@okhdfc', bookingPaidAt: at(-2, 19, 41) };
    p.members.push(mine);
    p.members.sort((a, b) => a.joinedAt - b.joinedAt);
    p.bids = [
      mkBid('pool-rice', 's-annapurna', 1420, 400, closesAt + 3 * DAY, closesAt - 30 * HOUR, { terms: { crop: 'new', weight_guarantee: true }, slabs: [{ fromUnit: 51, perUnitPaise: rs(10) }, { fromUnit: 101, perUnitPaise: rs(20) }] }),
      mkBid('pool-rice', 's-krishna', 1465, 120, closesAt + 3 * DAY, closesAt - 12 * HOUR, { terms: { crop: 'new' } }),
    ];
    confirmAwardAndPrice(p, closesAt + 30 * MIN, { 'b-rice-annapurna': 1520, 'b-rice-krishna': 1520 }, closesAt + 2 * HOUR, 'Saving ≥ ₹170 per bag vs local kirana');
    const assigned = new Set(p.award!.assignments.map((a) => a.memberId));
    let accepted = 0;
    for (const m of p.members) {
      if (!assigned.has(m.id)) continue;
      m.status = 'offered';
      if (m.isMe) continue;
      const roll = rr();
      if (roll < 0.66) {
        m.status = 'accepted';
        m.decidedAt = offersAt + randInt(rr, 5, 300) * MIN;
        accepted++;
        const bid = p.bids.find((b) => b.id === p.award!.assignments.find((a) => a.memberId === m.id)!.bidId)!;
        const conf = rr() < 0.5;
        orders.push(mkOrder(rr, p, m, bid, { createdAt: m.decidedAt, status: 'confirmed', plan: rr() < 0.5 ? 'prepay' : 'door', steps: conf ? [{ key: 'seller_confirmed', at: m.decidedAt + 40 * MIN, by: 'Annapurna Rice Traders' }] : [] }));
      } else if (roll < 0.7) {
        m.status = 'walked_away';
        m.decidedAt = offersAt + randInt(rr, 10, 200) * MIN;
        m.refundAt = m.decidedAt;
      }
    }
    log(offersAt, 'Aarav Mehta', 'Offers published', `${assigned.size} personal offers; decide by ${new Date(p.acceptBy!).toISOString()}`, p.id);
    notify('buyer', 'offer', offersAt + MIN, 'Your rice offer is ready', '2 bags of Sona Masoori for ₹3,040 all-in — ₹340 less than your best local price. Decide by tomorrow.', '/buyer/offer/m-me-rice');
    pools.push(p);
    void accepted;
  }

  // =====================================================================================
  // 4. Groundnut oil — offers out; for me, Flipkart with my SBI card is cheaper (honesty case).
  // =====================================================================================
  {
    const rr = mulberry32(404);
    const createdAt = at(-5, 10);
    const closesAt = T0 - 20 * HOUR;
    const offersAt = T0 - 16 * HOUR;
    const p = basePool({
      id: 'pool-oil', no: 'POOL-HYD-OIL-0107', productId: 'p-oil', areaLabel: 'Hyderabad West', pincodes: ['500032', '500084', '500081'],
      createdAt, closesAt, state: 'offers', profileId: 'home_delivery', bookingPaise: rs(200),
      qtyRule: { minBase: 1, stepBase: 1, maxPerHouseholdBase: 3 }, checkoutPlans: ['prepay', 'door'], requirements: { deliverWithinDays: 4, modes: ['home_delivery'], terms: [] },
      invitedSellers: ['s-godavari'], closedAt: closesAt, pricingDeadline: closesAt + 4 * HOUR, offersAt, acceptBy: offersAt + 24 * HOUR,
    });
    p.members = genMembers(rr, 51, { from: createdAt, to: closesAt - HOUR, area: 'west', qty: (x) => (x() < 0.8 ? 1 : 2), booking: rs(200) });
    p.members.push({ id: 'm-me-oil', isMe: true, name: 'Ananya R.', pincode: '500032', area: 'Gachibowli', householdKey: 'hh-me', payerKey: 'py-me', deviceKey: 'dv-me', qtyBase: 1, options: {}, joinedAt: at(-3, 8, 5), status: 'committed', bookingPaise: rs(200), bookingRef: 'pay_SIM_OL5T3N7Q', bookingMethod: 'UPI · ananya.reddy@okhdfc', bookingPaidAt: at(-3, 8, 6) });
    p.members.sort((a, b) => a.joinedAt - b.joinedAt);
    p.bids = [mkBid('pool-oil', 's-godavari', 2480, 150, closesAt + 4 * DAY, closesAt - 40 * HOUR, { terms: { fssai: true } })];
    confirmAwardAndPrice(p, closesAt + 40 * MIN, { 'b-oil-godavari': 2650 }, closesAt + 3 * HOUR);
    for (const m of p.members) {
      m.status = 'offered';
      if (m.isMe) continue;
      const roll = rr();
      if (roll < 0.58) {
        m.status = 'accepted';
        m.decidedAt = offersAt + randInt(rr, 5, 600) * MIN;
        orders.push(mkOrder(rr, p, m, p.bids[0], { createdAt: m.decidedAt, status: 'confirmed' }));
      } else if (roll < 0.66) {
        m.status = 'walked_away';
        m.decidedAt = offersAt + randInt(rr, 5, 600) * MIN;
        m.refundAt = m.decidedAt;
      }
    }
    notify('buyer', 'offer', offersAt + MIN, 'Your groundnut oil offer is ready', '1 tin for ₹2,650. With your SBI card, Flipkart is ₹49 cheaper today — we show both so you can choose.', '/buyer/offer/m-me-oil', true);
    pools.push(p);
  }

  // =====================================================================================
  // 5. Mutton — weekly pool (every Sunday), open; I have 1 kg curry cut.
  // =====================================================================================
  {
    const rr = mulberry32(505);
    // Next Friday 8 PM IST (closes two days before the Sunday pickup).
    const istDay = new Date(T0 + 330 * MIN).getUTCDay();
    let toFri = (5 - istDay + 7) % 7;
    if (toFri === 0 && T0 > at(0, 20)) toFri = 7;
    const closesAt = at(toFri, 20);
    const sunday = at(toFri + 2, 0);
    const createdAt = closesAt - 6 * DAY;
    const p = basePool({
      id: 'pool-mutton', no: 'POOL-HYD-MEAT-0052', productId: 'p-mutton', areaLabel: 'Kondapur · Sunday pickup', pincodes: ['500084', '500032', '500081'],
      createdAt: Math.min(createdAt, T0 - 6 * HOUR), closesAt, state: 'open', profileId: 'store_pickup', bookingPaise: rs(100), recurring: 'Every Sunday · closes Friday 8 PM',
      qtyRule: { minBase: 500, stepBase: 250, maxPerBuyerBase: 3000 }, checkoutPlans: ['prepay'], waveCountMode: 'per_order',
      requirements: { deliverWithinDays: 2, modes: ['store_pickup'], terms: [{ key: 'same_day_cut', label: 'Cut on Sunday morning', op: 'eq', value: true }] },
      invitedSellers: ['s-freshcut', 's-royalmeat'],
      pickup: {
        place: 'FreshCut Meat Centre, Kondapur (or the winning shop)',
        address: 'Shop 4, Botanical Garden Road, Kondapur, Hyderabad 500084',
        slots: [7, 8, 9, 10].map((h, i) => ({ id: `slot-${i}`, label: `Sun ${h}:00 – ${h + 1}:00 ${h < 12 ? 'AM' : 'PM'}`, startsAt: sunday + h * HOUR, endsAt: sunday + (h + 1) * HOUR, capacity: 20, booked: [14, 19, 11, 6][i] })),
      },
    });
    p.startedBy = { name: 'POOL team (weekly pool)', at: p.createdAt, team: true };
    p.members = genMembers(rr, 63, { from: p.createdAt, to: T0 - 15 * MIN, area: 'kondapur', qty: (x) => (x() < 0.6 ? 1000 : x() < 0.8 ? 500 : x() < 0.95 ? 1500 : 2000), booking: rs(100), options: (x) => ({ cut: x() < 0.78 ? 'curry' : 'boneless' }) });
    p.members.push({ id: 'm-me-mutton', isMe: true, name: 'Ananya R.', pincode: '500032', area: 'Gachibowli', householdKey: 'hh-me', payerKey: 'py-me', deviceKey: 'dv-me', qtyBase: 1000, options: { cut: 'curry' }, joinedAt: T0 - 26 * HOUR, status: 'committed', bookingPaise: rs(100), bookingRef: 'pay_SIM_MT8V1C4D', bookingMethod: 'UPI · ananya.reddy@okhdfc', bookingPaidAt: T0 - 26 * HOUR + MIN });
    p.members.sort((a, b) => a.joinedAt - b.joinedAt);
    p.bids = [
      mkBid('pool-mutton', 's-freshcut', 720, 120000, sunday + 11 * HOUR, T0 - 30 * HOUR, { modes: ['store_pickup'], terms: { same_day_cut: true }, optionsCovered: ['cut:curry', 'cut:boneless'] }),
      mkBid('pool-mutton', 's-royalmeat', 760, 60000, sunday + 11 * HOUR, T0 - 10 * HOUR, { modes: ['store_pickup'], terms: { same_day_cut: true }, optionsCovered: ['cut:curry'] }),
    ];
    pools.push(p);
  }

  // =====================================================================================
  // 6. Washing machine — completed wave. Delivered, installed, settled; Wave Drop paid.
  // =====================================================================================
  {
    const rr = mulberry32(606);
    const createdAt = at(-31, 12);
    const closesAt = at(-25, 18);
    const offersAt = closesAt + 3 * HOUR;
    const p = basePool({
      id: 'pool-washer', no: 'POOL-HYD-WM-0231', productId: 'p-washer', areaLabel: 'Hyderabad West', pincodes: ['500032', '500084', '500081'],
      startedBy: { name: 'Deepika M. (Gachibowli)', at: createdAt }, createdAt, closesAt, state: 'completed', profileId: 'delivery_with_installation', bookingPaise: rs(2000),
      requirements: { deliverWithinDays: 5, modes: ['home_delivery'], terms: [{ key: 'installation_included', label: 'Installation included', op: 'eq', value: true }] },
      invitedSellers: ['s-lakshmi', 's-metro', 's-deccan'], closedAt: closesAt, pricingDeadline: closesAt + 4 * HOUR, offersAt, acceptBy: offersAt + 24 * HOUR,
    });
    p.members = genMembers(rr, 39, { from: createdAt, to: closesAt - HOUR, area: 'west', qty: () => 1, booking: rs(2000) });
    p.members.push({ id: 'm-me-washer', isMe: true, name: 'Ananya R.', pincode: '500032', area: 'Gachibowli', householdKey: 'hh-me', payerKey: 'py-me', deviceKey: 'dv-me', qtyBase: 1, options: {}, joinedAt: at(-28, 21), status: 'committed', bookingPaise: rs(2000), bookingRef: 'pay_SIM_WM3H6R2K', bookingMethod: 'UPI · ananya.reddy@okhdfc', bookingPaidAt: at(-28, 21, 1) });
    p.members.sort((a, b) => a.joinedAt - b.joinedAt);
    const sl = [{ fromUnit: 11, perUnitPaise: rs(300) }, { fromUnit: 26, perUnitPaise: rs(600) }];
    p.bids = [
      mkBid('pool-washer', 's-lakshmi', 27600, 45, closesAt + 4 * DAY, closesAt - 50 * HOUR, { terms: { installation_included: true, warranty_months: 24 }, slabs: sl }),
      mkBid('pool-washer', 's-metro', 28150, 30, closesAt + 4 * DAY, closesAt - 20 * HOUR, { terms: { installation_included: true, warranty_months: 24 } }),
    ];
    confirmAwardAndPrice(p, closesAt + 40 * MIN, { 'b-washer-lakshmi': 29490, 'b-washer-metro': 29490 }, closesAt + 2 * HOUR);
    const bid = p.bids[0];
    let k = 0;
    const waveOrders: Array<{ orderId: string; count: number; outcome: 'settled' | 'buyer_cancelled' | 'returned' | 'seller_cancelled' }> = [];
    for (const m of p.members) {
      m.status = 'offered';
      const roll = m.isMe ? 0 : rr();
      if (roll > 0.92) {
        m.status = roll > 0.96 ? 'timed_out' : 'walked_away';
        m.decidedAt = offersAt + 6 * HOUR;
        m.refundAt = m.decidedAt;
        continue;
      }
      m.status = 'accepted';
      m.decidedAt = offersAt + randInt(rr, 10, 600) * MIN;
      k++;
      const handed = m.isMe ? at(-13, 16, 20) : at(-21 + (k % 6), 12 + (k % 7));
      const o = mkOrder(rr, p, m, bid, {
        createdAt: m.decidedAt,
        status: 'settled',
        plan: m.isMe ? 'prepay' : undefined,
        handedOverAt: handed,
        settledAt: handed + 7 * DAY,
        steps: [
          { key: 'seller_confirmed', at: m.decidedAt + HOUR, by: 'Lakshmi Home Appliances' },
          { key: 'dispatched', at: handed - 3 * HOUR, by: 'Lakshmi Home Appliances', proof: 'dispatch-photo.jpg' },
          { key: 'handover', at: handed, by: m.name, proof: 'code verified' },
          { key: 'installed', at: handed + 22 * HOUR, by: 'AquaWave service', proof: `JOB-AW-${randInt(rr, 100000, 999999)}` },
        ],
        address: m.isMe ? 'Flat 304, Sri Sai Residency, Road No. 2, Gachibowli, Hyderabad 500032' : undefined,
      });
      o.paidPaise = o.buyerTotal;
      o.balanceDue = 0;
      o.serial = `AW8FL${randInt(rr, 10000000, 99999999)}`;
      o.installJob = o.steps.find((s) => s.key === 'installed')!.proof;
      o.holdsReleased = [{ key: 'installation', at: handed + 22 * HOUR, reason: 'Installed (job number)' }];
      o.code.usedAt = handed;
      if (k === 7) {
        o.status = 'returned';
        o.returnedAt = handed + 2 * DAY;
        o.refundPaise = o.buyerTotal;
        o.settledAt = undefined;
        tickets.push({ id: id('t'), no: 'TKT-20914', orderId: o.id, buyerName: m.name, sellerId: 's-lakshmi', type: 'damaged', description: 'Drum makes a grinding noise from the first wash.', photos: 2, wants: 'replacement', status: 'resolved', createdAt: handed + 20 * HOUR, sellerDueBy: handed + 44 * HOUR, ackBy: handed + 68 * HOUR, messages: [{ from: 'buyer', text: 'Drum makes a grinding noise from the first wash.', at: handed + 20 * HOUR }, { from: 'seller', text: 'Brand technician visited: dead on arrival confirmed (DOA cert. AW-DOA-5521).', at: handed + 40 * HOUR }, { from: 'pool', text: 'Buyer chose a full refund over a replacement. Refund issued to the original UPI.', at: handed + 2 * DAY }], resolution: { kind: 'refund', amountPaise: o.buyerTotal, at: handed + 2 * DAY, by: 'POOL support' } });
        o.tickets.push(tickets[tickets.length - 1].id);
      }
      if (k === 12) {
        o.status = 'cancelled_by_buyer';
        o.cancelledAt = m.decidedAt + 2 * HOUR;
        o.refundPaise = o.buyerTotal;
        o.steps = [];
        o.handedOverAt = undefined;
        o.settledAt = undefined;
        o.invoiceNo = undefined;
        o.holdsReleased = [];
      }
      if (m.isMe) {
        o.no = 'PO-418806';
        o.payMethod = 'UPI · ananya.reddy@okhdfc';
        o.code.value = '804215';
      }
      orders.push(o);
      waveOrders.push({ orderId: o.id, count: 1, outcome: o.status === 'settled' ? 'settled' : o.status === 'returned' ? 'returned' : 'buyer_cancelled' });
    }
    const wave = closeWave(sl, waveOrders);
    const waveClosedAt = at(-3, 11);
    p.wave = { closedAt: waveClosedAt, potPaise: wave.pot, settledUnits: wave.settledUnits, perOrder: wave.refunds, releaseToSeller: { 's-lakshmi': wave.releaseToSeller } };
    for (const o of orders.filter((x) => x.poolId === p.id && x.status === 'settled')) {
      o.waveRefundPaise = wave.refunds[o.id] ?? 0;
    }
    const myOrder = orders.find((o) => o.isMe && o.poolId === p.id)!;
    const myShare = wave.refunds[myOrder.id];
    log(waveClosedAt, 'System', 'Wave closed', `${wave.settledUnits} settled units · pot ₹${(wave.pot / 100).toLocaleString('en-IN')} · ₹${(wave.releaseToSeller / 100).toLocaleString('en-IN')} unused hold released to seller`, p.id);
    notify('buyer', 'wave', waveClosedAt + MIN, `Wave Drop: ₹${(myShare / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })} back`, `${wave.settledUnits} neighbours completed their washing machine purchase. Your share is back on your UPI.`, `/buyer/order/${myOrder.id}`, true);
    notify('seller', 'payout', waveClosedAt + MIN, 'Wave closed · hold released', `₹${(wave.releaseToSeller / 100).toLocaleString('en-IN')} of Wave Drop hold released to you. ₹${(wave.pot / 100).toLocaleString('en-IN')} went to ${wave.settledUnits} buyers.`, '/seller/payouts', true);
    pools.push(p);
  }

  // =====================================================================================
  // 7. Mixer grinder — fulfilment; my order is out for delivery and I chose to pay at the door.
  // =====================================================================================
  {
    const rr = mulberry32(707);
    const createdAt = at(-9, 10);
    const closesAt = at(-5, 18);
    const offersAt = closesAt + 2 * HOUR;
    const p = basePool({
      id: 'pool-mixer', no: 'POOL-HYD-MIX-0144', productId: 'p-mixer', areaLabel: 'Gachibowli & Kondapur', pincodes: ['500032', '500084'],
      startedBy: { name: 'Meena K. (Gachibowli)', at: createdAt }, createdAt, closesAt, state: 'fulfilment', profileId: 'home_delivery', bookingPaise: rs(300),
      checkoutPlans: ['prepay', 'door'], requirements: { deliverWithinDays: 6, modes: ['home_delivery'], terms: [{ key: 'warranty_months', label: 'Warranty (months)', op: 'gte', value: 24 }] },
      invitedSellers: ['s-lakshmi', 's-metro'], closedAt: closesAt, pricingDeadline: closesAt + 4 * HOUR, offersAt, acceptBy: offersAt + 24 * HOUR,
    });
    p.members = genMembers(rr, 23, { from: createdAt, to: closesAt - HOUR, area: 'gk', qty: () => 1, booking: rs(300) });
    p.members.push({ id: 'm-me-mixer', isMe: true, name: 'Ananya R.', pincode: '500032', area: 'Gachibowli', householdKey: 'hh-me', payerKey: 'py-me', deviceKey: 'dv-me', qtyBase: 1, options: {}, joinedAt: at(-8, 9, 30), status: 'committed', bookingPaise: rs(300), bookingRef: 'pay_SIM_MX9A1L5B', bookingMethod: 'UPI · ananya.reddy@okhdfc', bookingPaidAt: at(-8, 9, 31) });
    p.members.sort((a, b) => a.joinedAt - b.joinedAt);
    p.bids = [
      mkBid('pool-mixer', 's-lakshmi', 2600, 20, closesAt + 6 * DAY, closesAt - 20 * HOUR, { terms: { warranty_months: 24 }, slabs: [{ fromUnit: 11, perUnitPaise: rs(40) }] }),
      mkBid('pool-mixer', 's-metro', 2700, 15, closesAt + 6 * DAY, closesAt - 10 * HOUR, { terms: { warranty_months: 12 } }),
    ];
    confirmAwardAndPrice(p, closesAt + 30 * MIN, { 'b-mixer-lakshmi': 2890 }, closesAt + 90 * MIN);
    const assigned = new Set(p.award!.assignments.map((a) => a.memberId));
    for (const m of p.members) {
      if (!assigned.has(m.id)) {
        m.status = 'unserved';
        m.refundAt = offersAt;
      }
    }
    let k = 0;
    const bid = p.bids[0];
    for (const m of p.members.filter((x) => assigned.has(x.id))) {
      m.status = 'offered';
      if (!m.isMe && rr() < 0.12) {
        m.status = 'timed_out';
        m.decidedAt = p.acceptBy!;
        m.refundAt = p.acceptBy!;
        continue;
      }
      m.status = 'accepted';
      m.decidedAt = offersAt + randInt(rr, 10, 900) * MIN;
      k++;
      const stage = m.isMe ? 'out' : k <= 5 ? 'handed' : k <= 10 ? 'out' : k <= 14 ? 'confirmed' : 'new';
      const steps: Order['steps'] = [];
      if (stage !== 'new') steps.push({ key: 'seller_confirmed', at: m.decidedAt + 2 * HOUR, by: 'Lakshmi Home Appliances' });
      if (stage === 'out' || stage === 'handed') steps.push({ key: 'dispatched', at: stage === 'handed' ? T0 - 30 * HOUR : at(0, 9, 40), by: 'Lakshmi Home Appliances', proof: 'dispatch-photo.jpg' });
      const handed = stage === 'handed' ? T0 - 26 * HOUR + k * 7 * MIN : undefined;
      if (handed) steps.push({ key: 'handover', at: handed, by: m.name, proof: 'code verified' });
      const o = mkOrder(rr, p, m, bid, { createdAt: m.decidedAt, status: handed ? 'handed_over' : 'confirmed', plan: m.isMe ? 'door' : undefined, steps, handedOverAt: handed, address: m.isMe ? 'Flat 304, Sri Sai Residency, Road No. 2, Gachibowli, Hyderabad 500032' : undefined });
      if (handed) {
        o.paidPaise = o.buyerTotal;
        o.balanceDue = 0;
        o.code.usedAt = handed;
      }
      if (stage === 'out') {
        o.tracking = { partner: 'Lakshmi delivery (own fleet)', awb: `LHA-${randInt(rr, 1000, 9999)}`, rider: 'Salim · +91 98490 •••62', etaText: 'Today, 4–6 PM', events: [{ at: at(0, 9, 40), text: 'Packed and dispatched from Kukatpally (photo attached)' }, { at: at(0, 13, 5), text: 'Out for delivery · 6 stops before you' }] };
      }
      if (m.isMe) {
        o.no = 'PO-582113';
        o.code.value = '317604';
        o.payMethod = undefined;
      }
      orders.push(o);
      if (k === 3) {
        tickets.push({ id: id('t'), no: 'TKT-21177', orderId: o.id, buyerName: m.name, sellerId: 's-lakshmi', type: 'damaged', description: 'Small jar lid is cracked. Rest is fine.', photos: 1, wants: 'replacement', status: 'open', createdAt: T0 - 5 * HOUR, sellerDueBy: T0 + 19 * HOUR, ackBy: T0 + 43 * HOUR, messages: [{ from: 'buyer', text: 'Small jar lid is cracked. Rest is fine.', at: T0 - 5 * HOUR }] });
        o.tickets.push(tickets[tickets.length - 1].id);
      }
    }
    const mine = orders.find((o) => o.isMe && o.poolId === p.id)!;
    notify('buyer', 'delivery', at(0, 13, 5), 'Your mixer grinder is out for delivery', `Arriving today 4–6 PM. You chose to pay at the door: ₹${((mine.balanceDue) / 100).toLocaleString('en-IN')} by UPI or card, then give your code.`, `/buyer/order/${mine.id}`);
    notify('seller', 'delivery', T0 - 2 * HOUR, '4 mixer orders to confirm', 'Confirm today so buyers see a firm delivery date.', '/seller/orders');
    pools.push(p);
  }

  // =====================================================================================
  // 8. Air purifier — no deal (no bid met the pool's requirements); every booking refunded.
  // =====================================================================================
  {
    const rr = mulberry32(808);
    const createdAt = at(-8, 12);
    const closesAt = at(-3, 18);
    const p = basePool({
      id: 'pool-purifier', no: 'POOL-HYD-AIR-0031', productId: 'p-purifier', areaLabel: 'Hyderabad West', pincodes: ['500032', '500084'],
      startedBy: { name: 'Imran S. (Kokapet)', at: createdAt }, createdAt, closesAt, state: 'no_deal', profileId: 'home_delivery', bookingPaise: rs(500),
      requirements: { deliverWithinDays: 4, modes: ['home_delivery'], terms: [{ key: 'filter', label: 'Filter grade H13', op: 'eq', value: 'H13' }] },
      invitedSellers: ['s-metro', 's-deccan'], closedAt: closesAt, noDealReason: 'No bid met the pool’s requirements: one offered an H12 filter, one could deliver only in 7 days.',
    });
    p.members = genMembers(rr, 21, { from: createdAt, to: closesAt - HOUR, area: 'west', qty: () => 1, booking: rs(500) });
    p.members.push({ id: 'm-me-purifier', isMe: true, name: 'Ananya R.', pincode: '500032', area: 'Gachibowli', householdKey: 'hh-me', payerKey: 'py-me', deviceKey: 'dv-me', qtyBase: 1, options: {}, joinedAt: at(-6, 22), status: 'committed', bookingPaise: rs(500), bookingRef: 'pay_SIM_PR1E7W3S', bookingMethod: 'UPI · ananya.reddy@okhdfc', bookingPaidAt: at(-6, 22, 1) });
    p.bids = [
      mkBid('pool-purifier', 's-metro', 11200, 30, closesAt + 3 * DAY, closesAt - 30 * HOUR, { terms: { filter: 'H12' } }),
      mkBid('pool-purifier', 's-deccan', 11450, 30, closesAt + 7 * DAY, closesAt - 10 * HOUR, { terms: { filter: 'H13' } }),
    ];
    p.award = computeAward(p, SELLERS, closesAt + MIN);
    for (const m of p.members) {
      m.status = 'no_deal';
      m.refundAt = closesAt + 5 * MIN;
    }
    notify('buyer', 'refund', closesAt + 10 * MIN, 'No deal on the air purifier — ₹500 refunded', 'No seller met the pool’s requirements (H13 filter, delivery in 4 days). Your full booking is back on your UPI.', '/buyer/pool/pool-purifier', true);
    pools.push(p);
  }

  // =====================================================================================
  // 9. Cement — fulfilment; the winning seller missed dispatch on 6 orders (seller default exception).
  // =====================================================================================
  {
    const rr = mulberry32(909);
    const createdAt = at(-10, 10);
    const closesAt = at(-6, 18);
    const offersAt = closesAt + 3 * HOUR;
    const p = basePool({
      id: 'pool-cement', no: 'POOL-HYD-CEM-0019', productId: 'p-cement', areaLabel: 'Medchal · self-build homes', pincodes: ['501401', '500100'],
      startedBy: { name: 'Narsimha G. (Medchal)', at: createdAt }, createdAt, closesAt, state: 'fulfilment', profileId: 'home_delivery', bookingPaise: rs(1000),
      qtyRule: { minBase: 20, stepBase: 10, maxPerBuyerBase: 400 }, checkoutPlans: ['prepay', 'door'], waveCountMode: 'per_order',
      requirements: { deliverWithinDays: 3, modes: ['home_delivery'], terms: [{ key: 'max_age_days', label: 'Bags ≤ 30 days from manufacture', op: 'eq', value: true }] },
      invitedSellers: ['s-buildmart', 's-cementdepot'], closedAt: closesAt, pricingDeadline: closesAt + 4 * HOUR, offersAt, acceptBy: offersAt + 24 * HOUR,
    });
    p.members = genMembers(rr, 28, { from: createdAt, to: closesAt - HOUR, area: 'medchal', qty: (x) => 20 + 10 * Math.floor(x() * 18), booking: rs(1000) });
    p.bids = [
      mkBid('pool-cement', 's-buildmart', 352, 5000, closesAt + 3 * DAY, closesAt - 30 * HOUR, { terms: { max_age_days: true } }),
      mkBid('pool-cement', 's-cementdepot', 360, 3000, closesAt + 3 * DAY, closesAt - 18 * HOUR, { terms: { max_age_days: true } }),
    ];
    confirmAwardAndPrice(p, closesAt + 30 * MIN, { 'b-cement-buildmart': 372, 'b-cement-cementdepot': 372 }, closesAt + 2 * HOUR);
    let k = 0;
    for (const m of p.members) {
      m.status = 'accepted';
      m.decidedAt = offersAt + randInt(rr, 10, 600) * MIN;
      k++;
      const a = p.award!.assignments.find((x) => x.memberId === m.id)!;
      const bid = p.bids.find((b) => b.id === a.bidId)!;
      const late = k % 4 === 0 && k <= 24;
      const handed = !late && k % 3 !== 0 ? closesAt + 2 * DAY + k * 20 * MIN : undefined;
      const steps: Order['steps'] = [{ key: 'seller_confirmed', at: m.decidedAt + HOUR, by: 'Deccan Building Supplies' }];
      if (handed) steps.push({ key: 'dispatched', at: handed - 3 * HOUR, by: 'Deccan Building Supplies', proof: 'lorry-photo.jpg' }, { key: 'handover', at: handed, by: m.name, proof: 'code verified' });
      const o = mkOrder(rr, p, m, bid, { createdAt: m.decidedAt, status: handed ? 'handed_over' : 'confirmed', steps, handedOverAt: handed, promisedBy: closesAt + 3 * DAY });
      if (handed) {
        o.paidPaise = o.buyerTotal;
        o.balanceDue = 0;
      }
      orders.push(o);
    }
    tickets.push({ id: id('t'), no: 'TKT-21203', orderId: orders[orders.length - 4].id, buyerName: orders[orders.length - 4].buyerName, sellerId: 's-buildmart', type: 'late', description: 'Cement was promised 2 days ago. Slab casting is waiting.', photos: 0, wants: 'refund', status: 'pool_reviewing', createdAt: T0 - 20 * HOUR, sellerDueBy: T0 - 2 * HOUR, ackBy: T0 + 28 * HOUR, messages: [{ from: 'buyer', text: 'Cement was promised 2 days ago. Slab casting is waiting.', at: T0 - 20 * HOUR }, { from: 'pool', text: 'We are moving your order to the backup seller (Medchal Cement Depot) at the same price. Late credit of ₹200 applies.', at: T0 - 3 * HOUR }] });
    notify('ops', 'issue', T0 - 3 * HOUR, 'Seller default: 6 cement orders late', 'Deccan Building Supplies missed the promised date. Backup (Medchal Cement Depot) has capacity at ₹8/bag more — charge the gap to the defaulting seller.', '/ops/exceptions');
    pools.push(p);
  }

  // =====================================================================================
  // 10–13. Open pools: school books, deep cleaning, student laptops, fridge (no bids yet).
  // =====================================================================================
  {
    const rr = mulberry32(1010);
    const createdAt = at(-3, 18);
    const p = basePool({
      id: 'pool-books', no: 'POOL-HYD-BK-0026', productId: 'p-books', areaLabel: 'Miyapur school parents', pincodes: ['500049', '500050', '500085'],
      startedBy: { name: 'Swathi V. (parent, Miyapur)', at: createdAt }, createdAt, closesAt: at(3, 20), state: 'open', profileId: 'home_delivery', bookingPaise: rs(100),
      qtyRule: { minBase: 1, stepBase: 1, maxPerHouseholdBase: 3 }, checkoutPlans: ['prepay', 'door'], waveCountMode: 'per_uom', requirements: { deliverWithinDays: 5, modes: ['home_delivery', 'store_pickup'], terms: [] },
      invitedSellers: ['s-vidya'],
    });
    p.members = genMembers(rr, 112, { from: createdAt, to: T0 - 40 * MIN, area: 'miyapur', qty: (x) => (x() < 0.85 ? 1 : 2), booking: rs(100) });
    p.bids = [mkBid('pool-books', 's-vidya', 1240, 400, at(8, 18), T0 - 16 * HOUR, { modes: ['home_delivery', 'store_pickup'] })];
    pools.push(p);
  }
  {
    const rr = mulberry32(1111);
    const createdAt = at(-1, 10);
    const p = basePool({
      id: 'pool-clean', no: 'POOL-HYD-SVC-0014', productId: 'p-clean', areaLabel: 'Gachibowli', pincodes: ['500032', '500084'],
      startedBy: { name: 'Bhavana T. (Gachibowli)', at: createdAt }, createdAt, closesAt: at(2, 21), state: 'open', profileId: 'service_visit', bookingPaise: rs(300),
      qtyRule: { minBase: 1, stepBase: 1, maxPerHouseholdBase: 1 }, checkoutPlans: ['prepay', 'door'], waveCountMode: 'per_order', serviceWindow: 'Visits on Sat–Sun of the following two weekends',
      requirements: { deliverWithinDays: 12, modes: ['service_visit'], terms: [{ key: 'team_size', label: 'Team of 3', op: 'gte', value: 3 }] },
      invitedSellers: ['s-sparkle'],
    });
    p.members = genMembers(rr, 26, { from: createdAt, to: T0 - 2 * HOUR, area: 'gk', qty: () => 1, booking: rs(300) });
    p.bids = [mkBid('pool-clean', 's-sparkle', 3990, 40, at(12, 18), T0 - 8 * HOUR, { modes: ['service_visit'], terms: { team_size: 3 } })];
    pools.push(p);
  }
  {
    const rr = mulberry32(1212);
    const createdAt = at(-2, 11);
    const p = basePool({
      id: 'pool-laptop', no: 'POOL-HYD-LAP-0009', productId: 'p-laptop', areaLabel: 'Medchal–Kompally students', pincodes: ['500100', '501401', '500055'],
      startedBy: { name: 'Rohit P. (B.Tech, 2nd year)', at: createdAt }, createdAt, closesAt: at(4, 18), state: 'open', profileId: 'home_delivery', bookingPaise: rs(2000),
      qtyRule: { minBase: 1, stepBase: 1, maxPerHouseholdBase: 1 },
      requirements: { deliverWithinDays: 6, modes: ['home_delivery', 'store_pickup'], terms: [{ key: 'warranty_months', label: 'Warranty (months)', op: 'gte', value: 12 }] },
      invitedSellers: ['s-campus', 's-kaveri'],
    });
    p.members = genMembers(rr, 41, { from: createdAt, to: T0 - HOUR, area: 'north', qty: () => 1, booking: rs(2000), options: (x) => ({ colour: x() < 0.6 ? 'silver' : 'graphite' }) });
    // 8 joins within 4 minutes from two devices (risk signal: join burst).
    const burstStart = at(-1, 23, 41);
    for (let i = 0; i < 8; i++) {
      const m = p.members[30 + i];
      m.joinedAt = burstStart + i * 30_000;
      m.deviceKey = i % 2 ? 'dv-burst-a' : 'dv-burst-b';
    }
    p.members.sort((a, b) => a.joinedAt - b.joinedAt);
    p.bids = [
      mkBid('pool-laptop', 's-campus', 46500, 60, at(9, 18), T0 - 20 * HOUR, { terms: { warranty_months: 12 }, optionsCovered: ['colour:silver', 'colour:graphite'] }),
      mkBid('pool-laptop', 's-kaveri', 46900, 40, at(10, 18), T0 - 9 * HOUR, { terms: { warranty_months: 24 }, optionsCovered: ['colour:silver'] }),
    ];
    pools.push(p);
  }
  {
    const rr = mulberry32(1313);
    const createdAt = at(-1, 9);
    const p = basePool({
      id: 'pool-fridge', no: 'POOL-HYD-FR-0153', productId: 'p-fridge', areaLabel: 'Hyderabad West', pincodes: ['500032', '500084', '500081', '500089'],
      startedBy: { name: 'Kiran T. (Manikonda)', at: createdAt }, createdAt, closesAt: at(4, 19), state: 'open', profileId: 'home_delivery', bookingPaise: rs(1500),
      requirements: { deliverWithinDays: 4, modes: ['home_delivery'], terms: [{ key: 'warranty_months', label: 'Warranty (months)', op: 'gte', value: 12 }] },
      invitedSellers: ['s-lakshmi', 's-deccan', 's-metro', 's-homefit'],
    });
    p.members = genMembers(rr, 29, { from: createdAt, to: T0 - 50 * MIN, area: 'west', qty: () => 1, booking: rs(1500) });
    pools.push(p);
  }

  // =====================================================================================
  // 14–17. Lakeview Heights community (handover in 15 days): move-in basket pools, co-branded with the builder.
  // =====================================================================================
  const lakeHandover = at(15, 10);
  const community: Community = {
    id: 'c-lakeview',
    name: 'Lakeview Heights',
    builder: 'Greenfield Developers',
    area: 'Gachibowli–Nanakramguda',
    pincode: '500032',
    handoverAt: lakeHandover,
    homes: 420,
    registered: 186,
    poolIds: ['pool-lv-fan', 'pool-lv-geyser', 'pool-lv-ro', 'pool-lv-chimney'],
    needs: [
      { category: 'Ceiling fans', households: 164 },
      { category: 'Geysers', households: 118 },
      { category: 'Water purifiers', households: 102 },
      { category: 'Chimneys', households: 88 },
      { category: 'ACs (summer wave)', households: 131 },
      { category: 'Fridges', households: 64 },
    ],
  };
  const lv: Array<[string, string, number, number, number, string, number]> = [
    ['pool-lv-fan', 'p-fan', 64, 6, 300, 'POOL-LVH-FAN-01', 1],
    ['pool-lv-geyser', 'p-geyser', 41, 2, 500, 'POOL-LVH-GEY-01', 2],
    ['pool-lv-ro', 'p-ro', 38, 1, 500, 'POOL-LVH-RO-01', 3],
    ['pool-lv-chimney', 'p-chimney', 29, 1, 1000, 'POOL-LVH-CHM-01', 4],
  ];
  for (const [pid, prodId, count, maxHh, booking, no, seedN] of lv) {
    const rr = mulberry32(1400 + seedN);
    const createdAt = at(-5, 11);
    const p = basePool({
      id: pid, no, productId: prodId, areaLabel: 'Lakeview Heights', pincodes: ['500032'], track: 'community', communityId: 'c-lakeview',
      startedBy: { name: 'Lakeview Heights × POOL (move-in desk)', at: createdAt, team: true }, createdAt, closesAt: at(6, 20), state: 'open', profileId: 'delivery_with_installation', bookingPaise: rs(booking),
      qtyRule: { minBase: 1, stepBase: 1, maxPerHouseholdBase: maxHh },
      requirements: { deliverWithinDays: 0, modes: ['home_delivery'], terms: [{ key: 'installation_included', label: 'Installation included', op: 'eq', value: true }] },
      invitedSellers: ['s-homefit', 's-metro', 's-lakshmi'],
    });
    // Community pools deliver on the handover delivery days, not N days after close.
    p.requirements.deliverWithinDays = Math.ceil((lakeHandover + 3 * DAY - p.closesAt) / DAY);
    p.members = genMembers(rr, count, { from: createdAt, to: T0 - 3 * HOUR, area: 'lakeview', qty: (x) => (prodId === 'p-fan' ? 2 + Math.floor(x() * 4) : 1), booking: rs(booking) });
    if (pid === 'pool-lv-fan') {
      p.members.push({ id: 'm-me-fan', isMe: true, name: 'Ananya R.', pincode: '500032', area: 'Lakeview Heights, Gachibowli', householdKey: 'hh-me', payerKey: 'py-me', deviceKey: 'dv-me', qtyBase: 3, options: {}, joinedAt: at(-2, 21, 10), status: 'committed', bookingPaise: rs(booking), bookingRef: 'pay_SIM_FN6G2Y8U', bookingMethod: 'UPI · ananya.reddy@okhdfc', bookingPaidAt: at(-2, 21, 11) });
      p.members.sort((a, b) => a.joinedAt - b.joinedAt);
      p.bids = [mkBid(pid, 's-homefit', 2690, 500, lakeHandover + 2 * DAY, T0 - 20 * HOUR, { terms: { installation_included: true } })];
    }
    if (pid === 'pool-lv-geyser') p.bids = [mkBid(pid, 's-homefit', 7350, 150, lakeHandover + 2 * DAY, T0 - 12 * HOUR, { terms: { installation_included: true } })];
    pools.push(p);
  }

  // ---------- risk signals ----------
  const signals: RiskSignal[] = [
    { id: 'rs-1', kind: 'low_bid', severity: 'high', title: 'AC bid 17% below the median', detail: 'QuickDeal Traders bid ₹30,500 against a median of ₹36,900. New seller, no completed orders.', poolId: 'pool-ac', entities: ['QuickDeal Traders'], evidence: ['Median of 5 bids: ₹36,900', 'Threshold (15% below): ₹31,365', 'Seller joined Sep 2026; 0 settled orders', 'Same seller flagged in the TV pool'], at: T0 - 88 * MIN, status: 'new' },
    { id: 'rs-2', kind: 'low_bid', severity: 'high', title: 'TV bid 18% below the median', detail: 'QuickDeal Traders bid ₹33,500 on the 55″ TV pool (closes Friday). Check stock and invoices before award.', poolId: 'pool-tv', entities: ['QuickDeal Traders'], evidence: ['Median of 6 bids: ₹40,625', 'Threshold: ₹34,531', 'Authorised-dealer letter for Vistaar not on file'], at: T0 - 3 * HOUR, status: 'new' },
    { id: 'rs-3', kind: 'shared_device', severity: 'medium', title: 'One phone booked for 3 households', detail: 'Three bookings in the TV pool came from the same device, for three different addresses and UPI IDs.', poolId: 'pool-tv', entities: ['3 households · Madhapur, Kondapur, Manikonda'], evidence: ['Device fingerprint dv-shared-1', 'Bookings 6 min apart', 'Different UPI IDs, different flats'], at: T0 - 9 * HOUR, status: 'watching', note: 'Could be a family member helping neighbours. Counted, not blocked.' },
    { id: 'rs-4', kind: 'join_burst', severity: 'medium', title: '8 joins in 4 minutes from 2 devices', detail: 'Student laptop pool: 8 bookings between 11:41 and 11:45 PM from two phones.', poolId: 'pool-laptop', entities: ['8 members · Kompally'], evidence: ['Devices dv-burst-a, dv-burst-b', 'All paid by different UPI IDs', 'Same hostel address pattern'], at: at(-1, 23, 50), status: 'new' },
    { id: 'rs-5', kind: 'winner_rotation', severity: 'low', title: 'Possible win rotation', detail: 'Deccan Digital and Metro Appliance Hub have alternated as the lowest bid in 4 recent pools, each time within ₹100 of each other.', entities: ['Deccan Digital', 'Metro Appliance Hub'], evidence: ['4 pools since Aug', 'Gap between the two bids ≤ ₹100 every time', 'Bid-rigging is presumed illegal (Competition Act s.3(3)(d))'], at: T0 - 2 * DAY, status: 'watching' },
  ];

  // ---------- seller applications ----------
  const applications: SellerApplication[] = [
    { id: 'app-1', business: 'Rayalaseema Electricals', owner: 'C. Hari Prasad', kind: 'dealer', city: 'Kurnool', stateCode: '37', gstin: '', legalNameOnGst: 'RAYALASEEMA ELECTRICALS', pan: 'AAKFR3418N', bankName: 'State Bank of India', bankHolder: 'RAYALASEEMA ELECTRICALS', ifsc: 'SBIN0000941', categories: ['appliances', 'home'], pincodes: ['518001', '518002'], documents: [{ name: 'GST certificate', ok: true }, { name: 'Authorised-dealer letter (AeroLite, HeatSafe)', ok: true }, { name: 'Shop photo with signboard', ok: true }, { name: 'Cancelled cheque', ok: true }], submittedAt: T0 - 26 * HOUR, status: 'pending' },
    { id: 'app-2', business: 'GreenLeaf Organics', owner: 'S. Kavya', kind: 'distributor', city: 'Hyderabad', stateCode: '36', gstin: '', legalNameOnGst: 'KAVYA AGRO FOODS', pan: 'ABEPK7721L', bankName: 'ICICI Bank', bankHolder: 'GREENLEAF ORGANICS', ifsc: 'ICIC0000777', categories: ['groceries'], pincodes: ['500032', '500084'], documents: [{ name: 'GST certificate', ok: true }, { name: 'FSSAI licence', ok: true }, { name: 'Shop photo', ok: false }], submittedAt: T0 - 11 * HOUR, status: 'pending' },
    { id: 'app-3', business: 'Royal Furniture Works', owner: 'A. Khan', kind: 'shop', city: 'Hyderabad', stateCode: '36', gstin: '', legalNameOnGst: 'ROYAL FURNITURE WORKS', pan: 'AATFR9902P', bankName: 'HDFC Bank', bankHolder: 'IRFAN AHMED KHAN', ifsc: 'HDFC0001920', categories: ['home'], pincodes: ['500008'], documents: [{ name: 'GST certificate', ok: true }, { name: 'Cancelled cheque', ok: true }], submittedAt: T0 - 3 * HOUR, status: 'pending' },
  ];
  // Real check characters for 1 and 3; a deliberate typo for 2 (checksum fails).
  applications[0].gstin = makeGstinLocal('37', applications[0].pan);
  applications[1].gstin = makeGstinLocal('36', applications[1].pan).slice(0, 14) + 'X';
  applications[2].gstin = makeGstinLocal('36', applications[2].pan);

  // ---------- extra notifications ----------
  notify('buyer', 'pool', T0 - 22 * HOUR, 'Mutton pool: your 1 kg is booked', 'This week’s Sunday mutton pool closes Friday 8 PM. Pickup slots open after the price is set.', '/buyer/pool/pool-mutton', true);
  notify('buyer', 'pool', T0 - 47 * HOUR, 'Lakeview Heights move-in pools are open', 'Fans, geysers, water purifiers and chimneys — delivered and installed in handover week.', '/buyer/community', true);
  notify('seller', 'bid', T0 - 6 * HOUR, 'New demand: FrostLine 253 L fridge', '29 committed households in Hyderabad West. Pool closes in 4 days. You have not bid yet.', '/seller/demand/pool-fridge');
  notify('seller', 'bid', T0 - 3 * HOUR, 'TV pool closes in 2 days', '47 committed households for the Vistaar 55″ QLED. 6 sealed bids so far. You have not bid.', '/seller/demand/pool-tv');
  notify('ops', 'review', T0 - 3 * HOUR, '3 seller applications waiting', 'Rayalaseema Electricals, GreenLeaf Organics, Royal Furniture Works.', '/ops/sellers');
  notify('ops', 'risk', T0 - 88 * MIN, 'Low bid flagged in AC pool', 'QuickDeal Traders: ₹30,500, 17% below the median. Decide before the award.', '/ops/risk');

  return {
    v: STATE_VERSION,
    seededAt: T0,
    offset: 0,
    me,
    sellerMeId: 's-lakshmi',
    opsUser: { name: 'Aarav Mehta', role: 'Pricing & awards' },
    products: PRODUCTS,
    sellers: [
      ...SELLERS,
      { ...SELLERS.find((s) => s.id === 's-annapurna')!, id: 's-krishna', name: 'Sri Krishna Rice Mill', owner: 'P. Krishna Murthy', area: 'Suryapet', city: 'Suryapet', pan: 'AAMFS1188D', gstin: makeGstinLocal('36', 'AAMFS1188D'), rating: 4.5, ratingCount: 210, settledOrders: 260 },
      { ...SELLERS.find((s) => s.id === 's-freshcut')!, id: 's-royalmeat', name: 'Royal Mutton Shop', owner: 'Syed Ameer', area: 'Tolichowki', pan: 'BGHPA4410C', gstin: makeGstinLocal('36', 'BGHPA4410C'), rating: 4.4, ratingCount: 310, settledOrders: 700 },
    ],
    profiles: PROFILES,
    pools,
    orders,
    tickets,
    signals,
    applications,
    communities: [
      community,
      { id: 'c-skyline', name: 'Skyline Meadows', builder: 'Northstar Homes', area: 'Kokapet', pincode: '500075', handoverAt: at(128, 10), homes: 640, registered: 92, poolIds: [], needs: [{ category: 'ACs (summer wave)', households: 210 }, { category: 'Fridges', households: 140 }, { category: 'Washing machines', households: 120 }] },
    ],
    notifications: notifications.sort((a, b) => b.at - a.at),
    audit: audit.sort((a, b) => b.at - a.at),
    watch: [
      { productId: 'p-fridge', addedAt: T0 - 3 * DAY, alert: 'pool' },
      { productId: 'p-laptop', addedAt: T0 - 5 * DAY, alert: 'price', targetPaise: rs(45000) },
    ],
    recent: ['p-tv', 'p-fridge', 'p-laptop'],
    chats: { assistant: [], whatsapp: [] },
    prefs: { lang: 'en', theme: 'system', notify: { offers: ['app', 'whatsapp'], delivery: ['app', 'whatsapp', 'sms'], refunds: ['app', 'whatsapp', 'email'], pools: ['app'], wave: ['app', 'whatsapp'] }, dataSaver: false },
    demo: { failNextPayment: false, slowNetwork: false, offline: false, failNextLoad: false },
    tour: { active: false, step: 0 },
    sellerDrafts: {},
    onboarded: true,
  };
}

import { makeGstin } from '../lib/gstin';
function makeGstinLocal(state: string, pan: string) {
  return makeGstin(state, pan);
}

export const waveHoldFor = (slabs: { fromUnit: number; perUnitPaise: number }[], count: number) => holdPerUnit(slabs) * count;
export { splitOrder, waveCount };
