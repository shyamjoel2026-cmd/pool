import { defineUom } from './uom.ts';
import type { FulfilmentProfile } from './fulfilment.ts';

/**
 * EXAMPLE DATA ONLY — starting points the team can copy, edit or replace (they will live in the database).
 * The engine never branches on these ids; it only follows the data. Numbers are GUESSES until confirmed.
 */
export const UOM = {
  piece: defineUom('piece', 1, 'piece'),
  kg: defineUom('kg', 1000, 'g'),
  litre: defineUom('litre', 1000, 'ml'),
  metre: defineUom('metre', 100, 'cm'),
  pack: defineUom('pack', 1, 'pack'),
  hour: defineUom('hour', 60, 'min'),
} as const;

export const PROFILES: Record<string, FulfilmentProfile> = {
  home_delivery: {
    id: 'home_delivery',
    label: 'Home delivery',
    modes: ['home_delivery', 'courier'],
    steps: [
      { key: 'seller_confirmed', proof: 'confirmation', afterHandover: false },
      {
        key: 'dispatched',
        proof: 'photo_or_awb',
        afterHandover: false,
        returnCostAppliesAfter: true,
      },
    ],
    handoverChecklist: ['right_item', 'no_damage'],
    codeDigits: 6,
    holds: [],
    returnWindowDays: 7,
    lateCreditMinor: 0,
  },
  store_pickup: {
    id: 'store_pickup',
    label: 'Pick up at the store with a code',
    modes: ['store_pickup'],
    steps: [
      { key: 'seller_confirmed', proof: 'confirmation', afterHandover: false },
      { key: 'ready_for_pickup', proof: 'photo', afterHandover: false },
    ],
    handoverChecklist: ['right_item', 'right_quantity'],
    codeDigits: 4,
    holds: [],
    returnWindowDays: 1,
    lateCreditMinor: 0,
  },
  delivery_with_installation: {
    id: 'delivery_with_installation',
    label: 'Delivery + installation',
    modes: ['home_delivery'],
    steps: [
      { key: 'seller_confirmed', proof: 'confirmation', afterHandover: false },
      {
        key: 'dispatched',
        proof: 'photo',
        afterHandover: false,
        returnCostAppliesAfter: true,
      },
      {
        key: 'installed',
        proof: 'job_number',
        afterHandover: true,
        releasesHold: 'installation',
      },
    ],
    handoverChecklist: ['right_item', 'no_damage', 'serial_matches'],
    codeDigits: 6,
    holds: [
      {
        key: 'installation',
        bps: 1000,
        releaseAfterDays: 5,
        deferredMaxDays: 45,
      },
    ],
    returnWindowDays: 7,
    lateCreditMinor: 0,
  },
  service_visit: {
    id: 'service_visit',
    label: 'Service at your place',
    modes: ['service_visit'],
    steps: [{ key: 'seller_confirmed', proof: 'confirmation', afterHandover: false }],
    handoverChecklist: ['work_done'],
    codeDigits: 4,
    holds: [],
    returnWindowDays: 3,
    lateCreditMinor: 0,
  },
};
