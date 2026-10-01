import { describe, expect, it } from 'vitest';
import {
  checkPriceDecision,
  checkQuantity,
  compareToOutside,
  defineUom,
  INDIA_POLICY,
  lineTotal,
  makeOffers,
  money,
  type PriceDecision,
  qty,
  type QuantityRule,
  UOM,
  US_POLICY,
  validateQuantityRule,
  waveCount,
} from '../src/index.ts';

describe('units of measure are data — any product', () => {
  it('prices kg, litre, metre, piece and a custom unit exactly', () => {
    expect(lineTotal(money('INR', 900_00), qty(UOM.kg, 1000), UOM.kg).minor).toBe(900_00); // 1 kg at ₹900/kg
    expect(lineTotal(money('INR', 900_00), qty(UOM.kg, 750), UOM.kg).minor).toBe(675_00); // 750 g
    expect(lineTotal(money('INR', 185_00), qty(UOM.litre, 5000), UOM.litre).minor).toBe(925_00); // 5 L oil
    expect(lineTotal(money('INR', 240_00), qty(UOM.metre, 250), UOM.metre).minor).toBe(600_00); // 2.5 m cloth
    expect(lineTotal(money('USD', 649_99), qty(UOM.piece, 2), UOM.piece).minor).toBe(1299_98);
    const dozen = defineUom('dozen', 12, 'egg');
    expect(lineTotal(money('INR', 84_00), qty(dozen, 30), dozen).minor).toBe(210_00); // 30 eggs at ₹84/dozen
  });
  it('refuses mixing units', () => {
    expect(() => lineTotal(money('INR', 1), qty(UOM.kg, 1), UOM.litre)).toThrow();
  });
});

describe('quantity rules are set per pool (no product assumptions)', () => {
  // e.g. a meat pool the team configured: min 500 g, steps of 250 g, max 2 kg per buyer
  const rule: QuantityRule = {
    uom: UOM.kg,
    minBase: 500,
    stepBase: 250,
    maxPerBuyerBase: 2000,
  };
  it('accepts valid quantities (most buyers pick 1 kg)', () => {
    expect(() => checkQuantity(rule, qty(UOM.kg, 1000))).not.toThrow();
    expect(() => checkQuantity(rule, qty(UOM.kg, 750))).not.toThrow();
  });
  it('rejects below minimum, off-step, above max, wrong unit', () => {
    expect(() => checkQuantity(rule, qty(UOM.kg, 250))).toThrow(/minimum/);
    expect(() => checkQuantity(rule, qty(UOM.kg, 1100))).toThrow(/steps/);
    expect(() => checkQuantity(rule, qty(UOM.kg, 2250))).toThrow(/maximum/);
    expect(() => checkQuantity(rule, qty(UOM.piece, 1))).toThrow(/priced per kg/);
  });
  it('a pool without caps accepts any valid quantity', () => {
    const open: QuantityRule = { uom: UOM.piece, minBase: 1, stepBase: 1 };
    expect(() => checkQuantity(open, qty(UOM.piece, 40))).not.toThrow(); // e.g. a school buying 40 benches
  });
  it('rejects broken rules', () => {
    expect(() => validateQuantityRule({ uom: UOM.kg, minBase: 0, stepBase: 250 })).toThrow();
    expect(() =>
      validateQuantityRule({
        uom: UOM.kg,
        minBase: 1000,
        stepBase: 250,
        maxPerBuyerBase: 500,
      }),
    ).toThrow();
  });
  it('wave counting mode is chosen per pool', () => {
    expect(waveCount(qty(UOM.kg, 1500), UOM.kg, 'per_order')).toBe(1);
    expect(waveCount(qty(UOM.piece, 3), UOM.piece, 'per_uom')).toBe(3);
  });
});

describe('pricing — the POOL team sets the buyer price per pool (founder decision)', () => {
  const decision = (buyer: number, bidId = 'b1'): PriceDecision => ({
    poolId: 'p',
    bidId,
    buyerPrice: money('INR', buyer),
    decidedBy: 'team:priya',
    decidedAt: 1,
  });
  it('seller ₹40,000, team price ₹43,000 → POOL margin ₹3,000', () => {
    expect(
      checkPriceDecision(INDIA_POLICY, money('INR', 40_000_00), decision(43_000_00)).minor,
    ).toBe(3_000_00);
  });
  it('different pools can have different margins — no fixed fee', () => {
    expect(checkPriceDecision(INDIA_POLICY, money('INR', 800_00), decision(860_00)).minor).toBe(
      60_00,
    );
    expect(
      checkPriceDecision(INDIA_POLICY, money('INR', 40_000_00), decision(41_200_00)).minor,
    ).toBe(1_200_00);
  });
  it('below the seller price is refused unless the founder switches POOL-funded discounts on', () => {
    expect(() =>
      checkPriceDecision(INDIA_POLICY, money('INR', 40_000_00), decision(39_000_00)),
    ).toThrow(/below the seller price/);
    expect(
      checkPriceDecision(
        { ...INDIA_POLICY, allowBelowSellerPrice: true },
        money('INR', 40_000_00),
        decision(39_000_00),
      ).minor,
    ).toBe(-1_000_00);
  });
  it('offers cannot be published until the team has priced every awarded bid', () => {
    expect(() =>
      makeOffers(
        INDIA_POLICY,
        UOM.piece,
        [
          {
            memberId: 'm',
            bidId: 'b9',
            sellerId: 's',
            sellerPrice: money('INR', 1_00),
            qty: qty(UOM.piece, 1),
          },
        ],
        new Map(),
      ),
    ).toThrow(/has not set a buyer price/);
  });
  it('offers carry totals, margin and an honest comparison (information, never a block)', () => {
    const [o] = makeOffers(
      INDIA_POLICY,
      UOM.kg,
      [
        {
          memberId: 'm1',
          bidId: 'b1',
          sellerId: 's1',
          sellerPrice: money('INR', 800_00),
          qty: qty(UOM.kg, 1000),
          outsideBest: money('INR', 880_00),
        },
      ],
      new Map([['b1', decision(860_00)]]),
    );
    expect(o!.buyerTotal.minor).toBe(860_00);
    expect(o!.sellerTotal.minor).toBe(800_00);
    expect(o!.marginTotal.minor).toBe(60_00);
    expect(o!.comparison).toMatchObject({
      known: true,
      cheaperThanOutside: true,
      meetsRecommendedSaving: false,
    });
  });
  it('comparison works in the US too', () => {
    expect(compareToOutside(US_POLICY, money('USD', 899_00), money('USD', 999_00))).toMatchObject({
      cheaperThanOutside: true,
      meetsRecommendedSaving: true,
    });
    expect(compareToOutside(US_POLICY, money('USD', 899_00), undefined)).toEqual({ known: false });
  });
});
