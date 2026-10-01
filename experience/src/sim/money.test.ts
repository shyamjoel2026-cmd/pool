import { describe, expect, it } from 'vitest';
import { allocate, divRoundHalfUp } from '../lib/money';
import { gstSplit } from '../lib/gst';
import { checkGstin, makeGstin } from '../lib/gstin';
import { closeWave, potFor, splitOrder } from './engine';
import { PROFILES } from './catalog';
import { seed } from './seed';
import { ledger } from './selectors';
import { sellerSplit } from './store';

describe('money primitives', () => {
  it('rounds half up and allocates exactly', () => {
    expect(divRoundHalfUp(5, 2)).toBe(3);
    expect(divRoundHalfUp(4, 3)).toBe(1);
    const parts = allocate(1000, [1, 1, 1]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(1000);
    expect(Math.max(...parts) - Math.min(...parts)).toBeLessThanOrEqual(1);
  });

  it('splits GST inside a price without losing a paisa', () => {
    for (const [total, bps] of [[43_000_00, 1800], [1_520_00, 500], [1_690_00, 0], [3_299_00, 1800]] as const) {
      const intra = gstSplit(total, bps, false);
      const inter = gstSplit(total, bps, true);
      expect(intra.taxable + intra.cgst + intra.sgst).toBe(total);
      expect(inter.taxable + inter.igst).toBe(total);
      expect(Math.abs(intra.cgst - intra.sgst)).toBeLessThanOrEqual(1);
    }
  });

  it('validates GSTIN checksums', () => {
    const g = makeGstin('36', 'AAKFL4721M');
    expect(checkGstin(g).ok).toBe(true);
    expect(checkGstin(g.slice(0, 14) + (g[14] === 'X' ? 'Y' : 'X')).ok).toBe(false);
  });
});

describe('order split and Wave Drop', () => {
  it('conserves the seller total across release, taxes and holds', () => {
    const prof = PROFILES.find((p) => p.id === 'delivery_with_installation')!;
    const sp = splitOrder({ buyerTotal: 43_000_00, sellerTotal: 40_000_00, gstBps: 1800, profile: prof, waveHold: 600_00 });
    expect(sp.releaseOnHandover + sp.tcs + sp.tds + sp.waveHold + sp.holds.reduce((a, h) => a + h.amount, 0)).toBe(sp.sellerTotal);
    expect(sp.margin).toBe(3_000_00);
  });

  it('closes a wave: refunds equal the pot and the hold is fully accounted for', () => {
    const slabs = [{ fromUnit: 11, perUnitPaise: 300_00 }, { fromUnit: 26, perUnitPaise: 600_00 }];
    const orders = Array.from({ length: 40 }, (_, i) => ({ orderId: `o${i}`, count: 1, outcome: (i === 3 ? 'seller_cancelled' : i === 7 ? 'returned' : 'settled') as 'settled' | 'seller_cancelled' | 'returned' }));
    const w = closeWave(slabs, orders);
    expect(Object.values(w.refunds).reduce((a, b) => a + b, 0)).toBe(w.pot);
    expect(w.releaseToSeller + w.pot).toBe(w.heldFromSettled + w.sellerPenalty);
    expect(w.pot).toBe(potFor(slabs, 38) + (potFor(slabs, 39) - potFor(slabs, 38)));
  });
});

describe('POOL ledger', () => {
  it('ties out to ₹0.00 on the seeded demo', () => {
    const s = seed(Date.UTC(2026, 9, 1, 6, 30));
    const L = ledger(s, s.seededAt);
    expect(L.difference).toBe(0);
    expect(L.inflow).toBeGreaterThan(0);
  });

  it('every seeded order conserves its split', () => {
    const s = seed(Date.UTC(2026, 9, 1, 6, 30));
    for (const o of s.orders) {
      const sp = sellerSplit(s, o);
      expect(sp.releaseOnHandover + sp.tcs + sp.tds + sp.waveHold + sp.holds.reduce((a, h) => a + h.amount, 0)).toBe(o.sellerTotal);
    }
  });
});
