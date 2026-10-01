/**
 * How an order gets from seller to buyer is DATA (a fulfilment profile), not code.
 * The team defines profiles per product type — e.g. "home delivery", "store pickup with code",
 * "delivery + installation", "service visit" — and the engine enforces whatever the profile says.
 * Matches "whatever other platforms do, we do" (founder decision, 29 Sep 2026).
 */

export interface FulfilmentStep {
  /** Unique key, e.g. "seller_confirmed", "packed", "dispatched", "ready_for_pickup", "installed". */
  readonly key: string;
  /** Proof the seller/buyer/partner must attach to complete this step, e.g. "photo", "job_number", "awb". */
  readonly proof: string;
  /** Steps before handover run in order; steps after handover (e.g. installation) can release holds. */
  readonly afterHandover: boolean;
  /** Once this step is done, a buyer cancellation costs at most the disclosed return cost (e.g. after dispatch). */
  readonly returnCostAppliesAfter?: boolean;
  /** Completing this (after-handover) step releases the named hold. */
  readonly releasesHold?: string;
}

export interface HoldRule {
  /** e.g. "installation", "quality_check". */
  readonly key: string;
  /** Share of the seller's amount held back, in basis points. */
  readonly bps: number;
  /** Released this many days after handover if no issue is open and the step was not completed. */
  readonly releaseAfterDays: number;
  /** If the buyer defers (e.g. flat not ready), the hold can wait up to this many days. */
  readonly deferredMaxDays?: number;
}

export interface FulfilmentProfile {
  readonly id: string;
  readonly label: string;
  /** Delivery modes offered, e.g. ["home_delivery"], ["store_pickup"], ["courier","home_delivery"]. */
  readonly modes: readonly string[];
  readonly steps: readonly FulfilmentStep[];
  /** Items the buyer ticks before giving the handover code, e.g. ["right_item","no_damage"]. Empty = none. */
  readonly handoverChecklist: readonly string[];
  /** Handover code length: 4 for low-value pickups, 6 for high-value deliveries (team choice). */
  readonly codeDigits: 4 | 6;
  readonly holds: readonly HoldRule[];
  /** Replacement/return window after handover before the order counts as settled. */
  readonly returnWindowDays: number;
  /** Credit paid by the seller to the buyer if handover is after the promised time. 0 = none. */
  readonly lateCreditMinor: number;
}

export class FulfilmentError extends Error {
  override name = 'FulfilmentError';
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function validateProfile(p: FulfilmentProfile): void {
  const keys = new Set<string>();
  for (const s of p.steps) {
    if (!s.key.trim() || !s.proof.trim())
      throw new FulfilmentError('STEP', 'every step needs a key and a proof');
    if (keys.has(s.key)) throw new FulfilmentError('STEP', `duplicate step ${s.key}`);
    keys.add(s.key);
    if (s.releasesHold && !s.afterHandover)
      throw new FulfilmentError('STEP', 'only after-handover steps can release holds');
    if (s.releasesHold && !p.holds.some((h) => h.key === s.releasesHold))
      throw new FulfilmentError('STEP', `unknown hold ${s.releasesHold}`);
  }
  const holdKeys = new Set<string>();
  let holdBps = 0;
  for (const h of p.holds) {
    if (
      !Number.isSafeInteger(h.releaseAfterDays) ||
      h.releaseAfterDays < 0 ||
      (h.deferredMaxDays !== undefined &&
        (!Number.isSafeInteger(h.deferredMaxDays) || h.deferredMaxDays < h.releaseAfterDays))
    )
      throw new FulfilmentError('HOLD', 'invalid hold duration');
    if (holdKeys.has(h.key)) throw new FulfilmentError('HOLD', `duplicate hold ${h.key}`);
    holdKeys.add(h.key);
    if (!Number.isSafeInteger(h.bps) || h.bps < 0)
      throw new FulfilmentError('HOLD', 'hold bps must be a non-negative integer');
    holdBps += h.bps;
  }
  if (holdBps > 10_000) throw new FulfilmentError('HOLD', 'holds exceed 100%');
  if (p.modes.length === 0)
    throw new FulfilmentError('MODES', 'at least one delivery mode is required');
  if (!Number.isSafeInteger(p.returnWindowDays) || p.returnWindowDays < 0)
    throw new FulfilmentError('WINDOW', 'returnWindowDays must be ≥ 0');
  if (!Number.isSafeInteger(p.lateCreditMinor) || p.lateCreditMinor < 0)
    throw new FulfilmentError('LATE', 'lateCreditMinor must be ≥ 0');
}

export const stepsBeforeHandover = (p: FulfilmentProfile) =>
  p.steps.filter((s) => !s.afterHandover);
export const stepsAfterHandover = (p: FulfilmentProfile) => p.steps.filter((s) => s.afterHandover);
