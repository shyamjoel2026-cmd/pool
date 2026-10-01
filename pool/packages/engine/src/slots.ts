/**
 * Pickup / service time slots for any product: each slot has a capacity so
 * the shop is not overwhelmed and buyers don't queue.
 */
export interface PickupSlot {
  readonly id: string;
  readonly areaKey: string;
  readonly startsAt: number;
  readonly endsAt: number;
  readonly capacity: number;
  readonly booked: number;
}

export class SlotError extends Error {
  override name = 'SlotError';
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function createSlot(s: Omit<PickupSlot, 'booked'>): PickupSlot {
  if (s.endsAt <= s.startsAt) throw new SlotError('BAD_TIME', 'slot must end after it starts');
  if (!Number.isSafeInteger(s.capacity) || s.capacity <= 0)
    throw new SlotError('BAD_CAPACITY', 'capacity must be a positive integer');
  return { ...s, booked: 0 };
}

export function reserveSlot(slot: PickupSlot, now: number): PickupSlot {
  if (now >= slot.startsAt) throw new SlotError('STARTED', 'slot has already started');
  if (slot.booked >= slot.capacity) throw new SlotError('FULL', 'slot is full');
  return { ...slot, booked: slot.booked + 1 };
}

export function releaseSlot(slot: PickupSlot): PickupSlot {
  if (slot.booked <= 0) throw new SlotError('EMPTY', 'nothing to release');
  return { ...slot, booked: slot.booked - 1 };
}

/** Slots in an area that still have room, earliest first. */
export function availableSlots(
  slots: readonly PickupSlot[],
  areaKey: string,
  now: number,
): PickupSlot[] {
  return slots
    .filter((s) => s.areaKey === areaKey && s.startsAt > now && s.booked < s.capacity)
    .sort((a, b) => a.startsAt - b.startsAt || a.id.localeCompare(b.id));
}
