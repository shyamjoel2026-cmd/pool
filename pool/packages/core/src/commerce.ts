import { randomUUID, randomInt, createHash } from 'node:crypto';
import type { Pool as PgPool, PoolClient } from 'pg';
import * as e from '@pool/engine';
import { command, post, type Posting } from './store.ts';
import { projectPool, projectOrder, poolPostings, orderPostings } from './index.ts';
import { validateEnv } from '@pool/db';
/** Administrative seller verification is data supplied by the ops process; no fake KYC integration. */
export function saveSeller(
  db: PgPool,
  id: string,
  key: string,
  facts: e.SellerFacts & { gstin: string; stateCode: string },
) {
  if (!e.validateGSTINFormat(facts.gstin) || facts.gstin.slice(0, 2) !== facts.stateCode)
    throw new Error('invalid GSTIN/state');
  // UNVERIFIED checksum algorithm remains advisory; ops supplies verified status, not this calculation.
  const reviewedFacts = {
    ...facts,
    gstinChecksumStatus: e.validateGSTIN(facts.gstin) ? 'ADVISORY_MATCH' : 'ADVISORY_MISMATCH',
  };
  return command(
    db,
    'seller:' + id,
    'seller',
    key,
    facts,
    () => ({
      state: reviewedFacts,
      events: [{ type: 'SELLER_REVIEWED', sellerId: id, ...reviewedFacts }],
      postings: [],
    }),
    async (c, s) => {
      await c.query(
        'INSERT INTO sellers(id,gstin,state_code,data) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO UPDATE SET data=excluded.data,gstin=excluded.gstin,state_code=excluded.state_code',
        [id, s.gstin, s.stateCode, s],
      );
    },
  );
}
export async function submitBid(db: PgPool, bid: e.Bid, key: string, now: number) {
  if (bid.submittedAt !== now)
    throw new Error('bid submission time must match the trusted receipt clock');
  if (!Number.isSafeInteger(bid.returnCostMinor) || bid.returnCostMinor! < 0)
    throw new Error('bid requires disclosed return cost in paise');
  return command<e.Bid>(
    db,
    'bid:' + bid.poolId + ':' + bid.sellerId,
    'bid',
    key,
    { bid, now },
    (previous) => ({ state: bid, events: [], postings: [] }),
    async (c) => {
      const p = (await c.query('SELECT data FROM pools WHERE id=$1 FOR UPDATE', [bid.poolId]))
        .rows[0]?.data as e.Pool | undefined;
      const seller = (await c.query('SELECT data FROM sellers WHERE id=$1', [bid.sellerId])).rows[0]
        ?.data as e.SellerFacts | undefined;
      if (!p || p.state !== 'OPEN' || !seller?.verified)
        throw new Error('open pool and verified seller required');
      const previous = (
        await c.query(
          'SELECT data FROM bids WHERE pool_id=$1 AND seller_id=$2 ORDER BY revision DESC LIMIT 1',
          [bid.poolId, bid.sellerId],
        )
      ).rows[0]?.data as e.Bid | undefined;
      if (previous) await auditBidReads(c, [previous], bid.sellerId, 'bid-revision');
      e.acceptBid(
        {
          policy: e.INDIA_POLICY,
          poolClosesAt: p.closesAt,
          now,
          uom: p.quantityRule.uom,
          maxSlabBpsOfPrice: 9999,
          acceptWindowMinutes: p.acceptWindowMinutes ?? e.INDIA_POLICY.acceptWindowMinutes,
          ...(p.pricingDeadline === undefined ? {} : { pricingDeadline: p.pricingDeadline }),
        },
        previous,
        bid,
      );
      await c.query(
        'INSERT INTO bids(id,pool_id,seller_id,revision,seller_price_minor,data) VALUES($1,$2,$3,$4,$5,$6)',
        [bid.id, bid.poolId, bid.sellerId, bid.revision, String(bid.sellerPrice.minor), bid],
      );
      await c.query(
        'INSERT INTO audit_events(id,aggregate_id,event_type,data) VALUES($1,$2,$3,$4)',
        [
          randomUUID(),
          bid.poolId,
          'BID_SUBMITTED',
          {
            type: 'BID_SUBMITTED',
            poolId: bid.poolId,
            bidId: bid.id,
            revision: bid.revision,
            at: now,
          },
        ],
      );
    },
  );
}
export async function readBids(db: PgPool, poolId: string, actorId: string, reason: string) {
  if (!actorId.trim() || !reason.trim()) throw new Error('bid access requires actor and reason');
  const c = await db.connect();
  try {
    await c.query('BEGIN');
    const rows = await c.query('SELECT id,data FROM bids WHERE pool_id=$1 ORDER BY revision', [
      poolId,
    ]);
    for (const row of rows.rows)
      await c.query('INSERT INTO bid_access_log(id,bid_id,actor_id,data) VALUES($1,$2,$3,$4)', [
        randomUUID(),
        row.id,
        actorId,
        { reason },
      ]);
    await c.query('COMMIT');
    return rows.rows.map((r) => r.data as e.Bid);
  } catch (error) {
    await c.query('ROLLBACK');
    throw error;
  } finally {
    c.release();
  }
}
export function savePrice(db: PgPool, decision: e.PriceDecision, key: string) {
  return command(
    db,
    'price:' + decision.poolId + ':' + decision.bidId,
    'price',
    key,
    decision,
    () => ({
      state: decision,
      events: [{ type: 'PRICE_DECIDED', ...decision }],
      postings: [],
    }),
    async (c, d) => {
      const bid = (await c.query('SELECT data FROM bids WHERE id=$1', [d.bidId])).rows[0]?.data as
        e.Bid | undefined;
      const p = (await c.query('SELECT data FROM pools WHERE id=$1', [d.poolId])).rows[0]?.data as
        e.Pool | undefined;
      if (!bid || bid.poolId !== d.poolId || p?.state !== 'PRICING')
        throw new Error('price decision requires assigned pool in PRICING');
      await auditBidReads(c, [bid], d.decidedBy, 'team-pricing');
      e.checkPriceDecision(e.INDIA_POLICY, bid.sellerPrice, d);
      await c.query(
        'INSERT INTO price_decisions(id,pool_id,bid_id,buyer_price_minor,decided_by,data) VALUES($1,$2,$3,$4,$5,$6)',
        [key, d.poolId, d.bidId, String(d.buyerPrice.minor), d.decidedBy, d],
      );
    },
  );
}
/** Profile IDs are immutable versions, so accepted terms cannot change underneath an order. */
export function saveFulfilmentProfile(db: PgPool, profile: e.FulfilmentProfile, key: string) {
  e.validateProfile(profile);
  return command(
    db,
    'profile:' + profile.id,
    'profile',
    key,
    profile,
    (existing) => {
      if (existing) throw new Error('fulfilment profile version already exists');
      return {
        state: profile,
        events: [{ type: 'FULFILMENT_PROFILE_CREATED', profileId: profile.id }],
        postings: [],
      };
    },
    async (c) => {
      await c.query('INSERT INTO fulfilment_profiles(id,data) VALUES($1,$2)', [
        profile.id,
        profile,
      ]);
    },
  );
}
/** Ranking uses stored bid revisions, stored seller review and requirements frozen in the pool. */
export function awardPersistedPool(
  db: PgPool,
  poolId: string,
  key: string,
  actorId: string,
  now: number,
) {
  if (!actorId.trim()) throw new Error('award requires audit actor');
  return command<e.Pool>(
    db,
    poolId,
    'pool',
    key,
    { actorId, now },
    async (p, c) => {
      if (!p?.bidRequirements) throw new Error('pool bid requirements missing');
      const rows = await c.query('SELECT id,data FROM bids WHERE pool_id=$1', [poolId]);
      const sellers = await c.query(
        'SELECT id,data FROM sellers WHERE id IN (SELECT seller_id FROM bids WHERE pool_id=$1)',
        [poolId],
      );
      for (const b of rows.rows)
        await c.query('INSERT INTO bid_access_log(id,bid_id,actor_id,data) VALUES($1,$2,$3,$4)', [
          randomUUID(),
          b.id,
          actorId,
          { reason: 'award' },
        ]);
      const ranked = e
        .rankBids(
          rows.rows.map((r) => r.data),
          p.bidRequirements,
          new Map(sellers.rows.map((r) => [r.id, r.data])),
        )
        .filter((b) => b.validUntil >= now);
      const result = e.stageAward(
        p,
        e.award(
          ranked,
          p.members.filter((m) => m.status === 'COMMITTED'),
        ).assignments,
        now,
      );
      return {
        state: result.value,
        events: result.events,
        postings: poolPostings(result.events),
      };
    },
    projectPool,
  );
}
/** Publication loads the audited team decisions instead of accepting caller-fabricated prices. */
export function publishPersistedOffers(db: PgPool, poolId: string, key: string, now: number) {
  return command<e.Pool>(
    db,
    poolId,
    'pool',
    key,
    { now },
    async (p, c) => {
      if (!p) throw new Error('pool missing');
      const rows = await c.query(
        'SELECT data FROM price_decisions WHERE pool_id=$1 ORDER BY created_at,id',
        [poolId],
      );
      const bids = await c.query('SELECT data FROM bids WHERE pool_id=$1', [poolId]);
      await auditBidReads(
        c,
        bids.rows.map((r) => r.data),
        'system:offer-publication',
        'offer-publication',
      );
      const decisions = new Map<string, e.PriceDecision>(
        rows.rows.map((r) => [r.data.bidId, r.data]),
      );
      const result = e.publishOffers(
        e.INDIA_POLICY,
        p,
        decisions,
        bids.rows.map((r) => r.data),
        now,
      );
      return {
        state: result.value,
        events: result.events,
        postings: poolPostings(result.events),
      };
    },
    projectPool,
  );
}
/** Accept + booking credit + order creation commit together. No accepted booking can be stranded between commands. */
export function acceptCheckout(
  db: PgPool,
  poolId: string,
  memberId: string,
  orderId: string,
  key: string,
  profile: e.FulfilmentProfile,
  tax: e.IndiaTaxContext,
  promisedBy: number,
  returnCost: e.Money,
  waveHoldMinor: number,
  now: number,
) {
  let order: e.Order;
  return command<e.Pool>(
    db,
    poolId,
    'pool',
    key,
    {
      memberId,
      orderId,
      profile,
      tax,
      promisedBy,
      returnCost,
      waveHoldMinor,
      now,
    },
    async (p, c) => {
      if (!p) throw new Error('pool missing');
      const r = e.decide(p, memberId, 'ACCEPTED', now, orderId);
      const offer = p.offers!.find((o) => o.memberId === memberId)!;
      const member = p.members.find((m) => m.memberId === memberId)!;
      if (
        !member.deliveryAddress ||
        tax.deliveryStateCode !== member.deliveryAddress.stateCode ||
        tax.poolStateCode !== p.poolStateCode
      )
        throw new Error('checkout supply states differ from stored address/pool');
      if (
        !offer.returnCost ||
        returnCost.currency !== offer.returnCost.currency ||
        returnCost.minor !== offer.returnCost.minor
      )
        throw new Error('checkout return cost differs from disclosed offer');
      const bid = (await c.query('SELECT data FROM bids WHERE id=$1', [offer.bidId])).rows[0]
        ?.data as e.Bid | undefined;
      if (bid) await auditBidReads(c, [bid], 'system:checkout', 'checkout-validation');
      const seller = (await c.query('SELECT state_code FROM sellers WHERE id=$1', [offer.sellerId]))
        .rows[0];
      if (
        !bid ||
        bid.poolId !== poolId ||
        bid.sellerId !== offer.sellerId ||
        bid.deliverBy !== promisedBy ||
        bid.validUntil < now
      )
        throw new Error('checkout promise differs from persisted bid');
      if (
        profile.id !== p.fulfilmentProfileId ||
        !profile.modes.some((mode) => bid.modes.includes(mode))
      )
        throw new Error('checkout fulfilment differs from pool/bid');
      if (
        tax.hsnCode !== p.hsnCode ||
        tax.gstRateBps !== p.gstRateBps ||
        tax.sellerStateCode !== seller?.state_code
      )
        throw new Error('checkout tax differs from persisted pool/seller');
      const reviewed = p.reviewedTaxTreatment ?? { supplyKind: 'MOVEMENT_OF_GOODS' };
      if (p.gstRateBps === 0 && reviewed.tcsApplicable === undefined)
        throw new Error('zero-rate supply needs reviewed TCS applicability');
      const treatment = (
        context: Pick<
          e.IndiaTaxContext,
          | 'supplyKind'
          | 'placeOfSupplyStateCode'
          | 'taxTreatmentSource'
          | 'tcsApplicable'
          | 'tdsApplicable'
        >,
      ) => ({
        supplyKind: context.supplyKind,
        placeOfSupplyStateCode: context.placeOfSupplyStateCode ?? null,
        taxTreatmentSource: context.taxTreatmentSource ?? null,
        tcsApplicable: context.tcsApplicable ?? p.gstRateBps! > 0,
        tdsApplicable: context.tdsApplicable ?? true,
      });
      if (fingerprint(treatment(tax)) !== fingerprint(treatment(reviewed)))
        throw new Error(
          'checkout withholding/place of supply differs from reviewed pool treatment',
        );
      const storedProfile = (
        await c.query('SELECT data FROM fulfilment_profiles WHERE id=$1', [p.fulfilmentProfileId])
      ).rows[0]?.data;
      // Hash canonical JSON to avoid depending on JSONB object-key order.
      if (!storedProfile || fingerprint(storedProfile) !== fingerprint(profile))
        throw new Error('checkout profile differs from immutable stored version');
      const expectedWaveHold =
        e.holdPerUnit(bid.slabs) * e.waveCount(offer.qty, p.quantityRule.uom, p.waveCountMode);
      if (waveHoldMinor !== expectedWaveHold)
        throw new Error('checkout wave hold differs from bid and quantity');
      if (returnCost.currency !== 'INR' || returnCost.minor < 0)
        throw new Error('invalid disclosed return cost');
      const booking = p.members.find((m) => m.memberId === memberId)!.booking!;
      order = e.beginCheckout(
        {
          id: orderId,
          poolId,
          buyerId: memberId,
          sellerId: offer.sellerId,
          bidId: offer.bidId,
          waveTerms: {
            sellerId: offer.sellerId,
            bidId: offer.bidId,
            slabs: bid.slabs,
            count: e.waveCount(offer.qty, p.quantityRule.uom, p.waveCountMode),
          },
          profile,
          split: e.splitOrder(e.INDIA_POLICY, {
            buyerTotal: offer.buyerTotal,
            sellerTotal: offer.sellerTotal,
            indiaTax: tax,
            profile,
            waveHoldMinor,
          }),
          promisedBy,
          returnCost,
          status: 'AWAITING_PAYMENT',
          steps: [],
          holdDeferrals: {},
          holdsReleased: [],
          openIssue: false,
        },
        p.checkoutPlan!,
        booking.paid,
        now,
      ).order;
      const postings = poolPostings(r.events);
      postings.push({
        from: poolId + ':accepted:' + memberId,
        to: orderId + ':held',
        minor: booking.paid.minor,
        key: orderId + ':booking-credit',
      });
      return { state: r.value, events: r.events, postings };
    },
    async (c, p) => {
      await projectPool(c, p);
      await c.query('INSERT INTO aggregates(id,kind,data) VALUES($1,$2,$3)', [
        orderId,
        'order',
        order,
      ]);
      await projectOrder(c, order);
      for (const event of e.recordOrder(order, now).events)
        await c.query(
          'INSERT INTO audit_events(id,aggregate_id,event_type,data) VALUES($1,$2,$3,$4)',
          [randomUUID(), orderId, event.type, event],
        );
    },
  );
}
export async function issueHandoverCode(
  db: PgPool,
  orderId: string,
  expiresAt: number,
  now = Date.now(),
) {
  if (!Number.isSafeInteger(now) || !Number.isSafeInteger(expiresAt) || expiresAt <= now)
    throw new Error('code expiry must be after issuance');
  const c = await db.connect();
  try {
    await c.query('BEGIN');
    await c.query('SELECT pg_advisory_xact_lock(7015003)');
    const o = (await c.query('SELECT data FROM orders WHERE id=$1', [orderId])).rows[0]?.data as
      e.Order | undefined;
    if (!o) throw new Error('order missing');
    if (!['PAID', 'AWAITING_PAYMENT'].includes(o.status))
      throw new Error('code issuance requires an open order');
    const previous = (
      await c.query('SELECT data FROM handover_codes WHERE order_id=$1 FOR UPDATE', [orderId])
    ).rows[0]?.data as e.StoredCode | undefined;
    if (previous && previous.usedAt === undefined && previous.expiresAt >= now)
      throw new Error('an active handover code already exists');
    const generate = () =>
      e.issueCode(
        validateEnv().codeSecret,
        orderId,
        o.profile.codeDigits,
        expiresAt,
        randomInt(10 ** o.profile.codeDigits),
        o.profile.handoverChecklist,
      );
    let code = generate();
    while (previous && code.stored.hash === previous.hash) code = generate();
    await c.query(
      'INSERT INTO handover_codes(id,order_id,hash,data) VALUES($1,$1,$2,$3) ON CONFLICT(id) DO UPDATE SET hash=excluded.hash,data=excluded.data',
      [orderId, code.stored.hash, code.stored],
    );
    await c.query('INSERT INTO audit_events(id,aggregate_id,event_type,data) VALUES($1,$2,$3,$4)', [
      randomUUID(),
      orderId,
      'HANDOVER_CODE_ISSUED',
      { type: 'HANDOVER_CODE_ISSUED', orderId, expiresAt, replaced: !!previous, at: now },
    ]);
    await c.query('COMMIT');
    return code.plain;
  } catch (error) {
    await c.query('ROLLBACK');
    throw error;
  } finally {
    c.release();
  }
}
/** Wrong attempts must commit as well, so callers cannot erase the attempt limit by retrying. */
export async function handover(
  db: PgPool,
  orderId: string,
  attempt: string,
  checklist: e.Checklist,
  now: number,
) {
  const c = await db.connect();
  try {
    await c.query('BEGIN');
    await c.query('SELECT pg_advisory_xact_lock(7015003)');
    const o = (await c.query('SELECT data FROM orders WHERE id=$1 FOR UPDATE', [orderId])).rows[0]
      ?.data as e.Order;
    const stored = (
      await c.query('SELECT data FROM handover_codes WHERE id=$1 FOR UPDATE', [orderId])
    ).rows[0]?.data as e.StoredCode;
    if (!o || !stored) throw new Error('order/code missing');
    const r = e.verifyAndHandOver(o, validateEnv().codeSecret, stored, attempt, checklist, now);
    await c.query('UPDATE handover_codes SET data=$2 WHERE id=$1', [orderId, r.code]);
    if (r.ok) {
      const postings = orderPostings(r.order, r.events);
      for (const name of ['margin', 'tcs', 'tds'] as const)
        postings.push({
          from: orderId + ':held',
          to: orderId + ':' + name,
          minor: o.split[name].minor,
          key: orderId + ':allocate:' + name,
        });
      for (const p of postings) await post(c, p);
      await c.query('UPDATE aggregates SET data=$2,version=version+1 WHERE id=$1', [
        orderId,
        r.order,
      ]);
      await projectOrder(c, r.order);
      for (const event of r.events)
        await c.query(
          'INSERT INTO audit_events(id,aggregate_id,event_type,data) VALUES($1,$2,$3,$4)',
          [randomUUID(), orderId, event.type, event],
        );
    }
    await c.query('COMMIT');
    return r.ok ? { ok: true as const, order: r.order } : { ok: false as const, reason: r.reason };
  } catch (error) {
    await c.query('ROLLBACK');
    throw error;
  } finally {
    c.release();
  }
}
/** Ops cancellation refunds accepted orders and unapplied bookings in the same transaction. */
export function cancelPoolAndOrders(db: PgPool, poolId: string, key: string, now: number) {
  return command<e.Pool>(
    db,
    poolId,
    'pool',
    key,
    { now },
    (p) => {
      if (!p) throw new Error('pool missing');
      const ids = p.members.filter((m) => m.status === 'ACCEPTED').map((m) => m.booking!.orderId!);
      const r = e.cancelPool(p, now, ids);
      return {
        state: r.value,
        events: r.events,
        postings: poolPostings(r.events),
      };
    },
    async (c, p) => {
      const rows = await c.query('SELECT data FROM orders WHERE pool_id=$1', [poolId]);
      for (const row of rows.rows) {
        const old = row.data as e.Order;
        if (['CANCELLED_BY_BUYER', 'CANCELLED_BY_SELLER', 'RETURNED'].includes(old.status))
          continue;
        if (!['PAID', 'AWAITING_PAYMENT'].includes(old.status))
          throw new Error(
            'delivered orders require their return workflow before pool cancellation',
          );
        // Ops cancellation is always a full refund, with no invented seller penalty.
        const result = e.buyerCancels({ ...old, steps: [] }, now);
        const order = { ...result.order, steps: old.steps };
        for (const posting of orderPostings(order, result.events)) await post(c, posting);
        await c.query('UPDATE aggregates SET data=$2,version=version+1 WHERE id=$1', [
          order.id,
          order,
        ]);
        await projectOrder(c, order);
        for (const event of e
          .recordOrder(order, now)
          .events.concat(result.events.filter((e) => e.type !== 'ORDER_SNAPSHOT')))
          await c.query(
            'INSERT INTO audit_events(id,aggregate_id,event_type,data) VALUES($1,$2,$3,$4)',
            [randomUUID(), order.id, event.type, event],
          );
      }
      await projectPool(c, p);
    },
  );
}

function fingerprint(value: unknown): string {
  const canonical = (v: unknown): string =>
    Array.isArray(v)
      ? '[' + v.map(canonical).join(',') + ']'
      : v && typeof v === 'object'
        ? '{' +
          Object.entries(v)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, x]) => JSON.stringify(k) + ':' + canonical(x))
            .join(',') +
          '}'
        : (JSON.stringify(v) ?? 'null');
  return createHash('sha256').update(canonical(value)).digest('hex');
}

async function auditBidReads(c: PoolClient, bids: readonly e.Bid[], actor: string, reason: string) {
  if (!actor.trim()) throw new Error('bid access requires an actor');
  for (const bid of bids)
    await c.query('INSERT INTO bid_access_log(id,bid_id,actor_id,data) VALUES($1,$2,$3,$4)', [
      randomUUID(),
      bid.id,
      actor,
      { reason },
    ]);
}
