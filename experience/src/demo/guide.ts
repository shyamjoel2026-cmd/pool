/**
 * Investor walkthrough: one live story across buyer, seller and POOL team, on the same data.
 * Steps only navigate, except the clearly-labelled demo shortcuts that move one thing in time.
 */
import { demoClosePoolNow, demoCompleteOthers, demoSkipReturnWindow } from '../sim/store';
import type { State } from '../sim/types';

export type Role = 'buyer' | 'seller' | 'ops';

export interface GuideStep {
  id: string;
  chapter: string;
  role: Role;
  title: string;
  /** What the viewer does on this screen. */
  doThis: string;
  /** The business logic behind it, for investors. */
  why: string;
  path: (s: State) => string;
  done?: (s: State) => boolean;
  shortcut?: { label: string; explain: string; run: (s: State) => void; available: (s: State) => boolean };
}

const myTv = (s: State) => s.pools.find((p) => p.id === 'pool-tv')?.members.find((m) => m.isMe && m.status !== 'left');
const myTvOrder = (s: State) => s.orders.find((o) => o.isMe && o.poolId === 'pool-tv');
const tvPool = (s: State) => s.pools.find((p) => p.id === 'pool-tv')!;

export const GUIDE: GuideStep[] = [
  {
    id: 'find',
    chapter: 'Buyer · find and commit',
    role: 'buyer',
    title: 'Paste any product link',
    doThis: 'Tap “Paste a link” and use the sample Amazon link for the 55″ TV. Confirm it is the exact model.',
    why: 'POOL never opens Amazon or Flipkart pages (their terms forbid it). It reads the link itself and the buyer confirms the model. Then it shows an honest comparison, including the buyer’s own card offers, and says so when Amazon is cheaper.',
    path: () => '/buyer/find?link=tv',
  },
  {
    id: 'join',
    chapter: 'Buyer · find and commit',
    role: 'buyer',
    title: 'Join the pool and pay a refundable booking',
    doThis: 'Join the Hyderabad West pool: choose quantity, address and a need-by date, then pay the ₹2,000 booking (simulated UPI).',
    why: 'A neighbour started this pool and chose its closing time. Only paid bookings count as demand, counted once per household and payer, so sellers see real buyers, not clicks. The booking is refundable until dispatch.',
    path: () => '/buyer/pool/pool-tv',
    done: (s) => myTv(s)?.status === 'committed' || !!myTvOrder(s),
  },
  {
    id: 'demand',
    chapter: 'Seller · compete for real demand',
    role: 'seller',
    title: 'See eligible, committed demand',
    doThis: 'Open the TV demand: households, units, pincodes, need-by dates and the pool’s requirements.',
    why: 'Sellers get buyers who already paid a booking. They see no names or phone numbers until a buyer accepts their offer, so POOL is not selling leads.',
    path: () => '/seller/demand/pool-tv',
  },
  {
    id: 'bid',
    chapter: 'Seller · compete for real demand',
    role: 'seller',
    title: 'Place a private bid: price, capacity, terms, Wave Drop',
    doThis: 'Bid ₹40,000 per TV for up to 60 units, delivery and installation within 4 days, and add Wave Drop slabs.',
    why: 'Bids are sealed. Nobody sees another seller’s price, and every view is logged. A seller can lower its bid before close but never raise it. The Wave Drop preview shows the seller still earns more on every extra sale.',
    path: () => '/seller/demand/pool-tv/bid',
    done: (s) => tvPool(s).bids.some((b) => b.sellerId === s.sellerMeId),
  },
  {
    id: 'close',
    chapter: 'POOL team · award and price',
    role: 'ops',
    title: 'The pool closes at the chosen time',
    doThis: 'Use the demo shortcut to close the TV pool now instead of waiting for its real closing time.',
    why: 'At close the sealed bids open to the POOL team only. The published rule ranks eligible bids by lowest price, then earliest delivery, then rating from completed orders. POOL’s margin is never a ranking factor.',
    path: () => '/ops/awards/pool-tv',
    done: (s) => tvPool(s).state !== 'open',
    shortcut: { label: 'Close the TV pool now (demo)', explain: 'In real use the pool closes only at the time its starter chose.', run: () => demoClosePoolNow('pool-tv'), available: (s) => tvPool(s).state === 'open' },
  },
  {
    id: 'award',
    chapter: 'POOL team · award and price',
    role: 'ops',
    title: 'Review the award',
    doThis: 'Hold back the bid flagged 18% below the median (new seller, no dealer letter), then confirm the award.',
    why: 'Households are assigned in join order to the best eligible seller with capacity (earliest joiners first), each with a backup seller. Flags never punish automatically; a person decides and the reason is logged.',
    path: () => '/ops/awards/pool-tv',
    done: (s) => ['pricing', 'offers', 'fulfilment', 'completed'].includes(tvPool(s).state),
  },
  {
    id: 'price',
    chapter: 'POOL team · award and price',
    role: 'ops',
    title: 'Set the buyer price and publish offers',
    doThis: 'Set ₹43,000 for the winning bid. Check the margin, the GST inside it and the buyer’s saving, then publish.',
    why: 'The seller bids its own price; the POOL team decides what buyers pay, pool by pool, and POOL keeps the difference as commission. The screen shows the recommended minimum saving and blocks any price below the seller’s.',
    path: () => '/ops/pricing/pool-tv',
    done: (s) => ['offers', 'fulfilment', 'completed'].includes(tvPool(s).state),
  },
  {
    id: 'offer',
    chapter: 'Buyer · decide and pay',
    role: 'buyer',
    title: 'Personal offer: accept or walk away',
    doThis: 'Open your offer, look at the price breakdown and Wave Drop, then accept. You can pay now, pay at the door, or use EMI.',
    why: 'The price is guaranteed and never goes up. “Accept” and “Walk away” carry equal weight. No reply by the deadline counts as walking away, with a full refund, never a silent charge.',
    path: (s) => (myTv(s) ? `/buyer/offer/${myTv(s)!.id}` : '/buyer/pools'),
    done: (s) => !!myTvOrder(s),
  },
  {
    id: 'dispatch',
    chapter: 'Seller · fulfil with proof',
    role: 'seller',
    title: 'Confirm and dispatch with photo proof',
    doThis: 'Open the new order (the buyer’s details appear only now), confirm it, then dispatch with a photo.',
    why: 'Status moves only on proof: seller confirms, dispatch photo, delivery code, serial number and invoice, then the installation job number.',
    path: (s) => (myTvOrder(s) ? `/seller/order/${myTvOrder(s)!.id}` : '/seller/orders'),
    done: (s) => !!myTvOrder(s)?.steps.some((x) => x.key === 'dispatched'),
  },
  {
    id: 'handover',
    chapter: 'Buyer · handover',
    role: 'buyer',
    title: 'Open-box check, then the code',
    doThis: 'In your order, tick the three checks (right model, no damage, serial matches) to reveal your 6-digit code.',
    why: 'The code lives only in the buyer’s app, works once and expires. POOL never asks for it. Until the buyer gives it, the payment company holds the money.',
    path: (s) => (myTvOrder(s) ? `/buyer/order/${myTvOrder(s)!.id}` : '/buyer/orders'),
    done: (s) => { const o = myTvOrder(s); return !!o && Object.values(o.checklist).filter(Boolean).length >= 3; },
  },
  {
    id: 'verify',
    chapter: 'Seller · fulfil with proof',
    role: 'seller',
    title: 'Verify the code: money is released',
    doThis: 'Enter the buyer’s code and the serial number. See exactly what is released now and what stays held.',
    why: 'On the code, the payment company releases the seller’s share minus TCS, TDS, the 10% installation hold and the Wave Drop hold. POOL’s commission, with its GST, stays with POOL.',
    path: (s) => (myTvOrder(s) ? `/seller/order/${myTvOrder(s)!.id}/verify` : '/seller/orders'),
    done: (s) => !!myTvOrder(s)?.handedOverAt,
  },
  {
    id: 'install',
    chapter: 'Seller · fulfil with proof',
    role: 'seller',
    title: 'Installation releases the hold',
    doThis: 'Add the brand installation job number.',
    why: 'Installation is the last proof step. The 10% installation hold is released when the job number is recorded, or after 5 days if nothing is wrong. A buyer whose flat isn’t ready can postpone it for up to 45 days.',
    path: (s) => (myTvOrder(s) ? `/seller/order/${myTvOrder(s)!.id}` : '/seller/orders'),
    done: (s) => !!myTvOrder(s)?.installJob,
  },
  {
    id: 'wave',
    chapter: 'Wave Drop and the money',
    role: 'buyer',
    title: 'Wave closes: Wave Drop paid',
    doThis: 'Use the shortcut to complete the other buyers’ deliveries and end the return window. Then see your Wave Drop.',
    why: 'Only completed purchases count: paid, delivered, installed, return window over, no dispute. The pot was pre-funded from each payout, so no seller ever has to be chased for money.',
    path: (s) => (myTvOrder(s) ? `/buyer/order/${myTvOrder(s)!.id}` : '/buyer/orders'),
    done: (s) => tvPool(s).state === 'completed',
    shortcut: {
      label: 'Complete everyone’s deliveries (demo)',
      explain: 'Moves the other buyers’ orders to delivered and skips the 7-day return window.',
      run: (s) => {
        demoCompleteOthers('pool-tv');
        const o = s.orders.find((x) => x.isMe && x.poolId === 'pool-tv');
        if (o) demoSkipReturnWindow(o.id);
      },
      available: (s) => !!myTvOrder(s)?.handedOverAt && tvPool(s).state !== 'completed',
    },
  },
  {
    id: 'payout',
    chapter: 'Wave Drop and the money',
    role: 'seller',
    title: 'Seller payout and hold breakdown',
    doThis: 'See every release, every hold and when each one is paid.',
    why: 'The seller knows exactly what it earns and when: no surprise fees, and TCS and TDS show as tax credits it can claim.',
    path: () => '/seller/payouts',
  },
  {
    id: 'recon',
    chapter: 'Wave Drop and the money',
    role: 'ops',
    title: 'Reconciliation ties out to the paisa',
    doThis: 'See where every rupee is: still held, refunded, paid to sellers, POOL margin, GST, TCS and TDS. The difference is ₹0.00.',
    why: 'Every money event is double-entry and idempotent, so a retry can never pay or refund twice.',
    path: () => '/ops/reconciliation',
  },
];
