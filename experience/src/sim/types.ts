import type { Paise } from '../lib/money';

export type Lang = 'en' | 'te' | 'hi';

export type CategoryId = 'electronics' | 'appliances' | 'groceries' | 'meat' | 'books' | 'services' | 'building' | 'laptops' | 'home' | 'mobility' | 'energy' | 'phones';

export type ArtKey =
  | 'tv' | 'ac' | 'washer' | 'fridge' | 'mixer' | 'rice' | 'oil' | 'mutton' | 'cement' | 'books' | 'cleaning'
  | 'laptop' | 'fan' | 'purifier' | 'geyser' | 'chimney' | 'waterpurifier' | 'scooter' | 'solar' | 'phone';

/** Units are data (engine uom.ts): price per 1 `code`, quantities in integer base units. */
export interface Uom {
  code: string;
  baseScale: number;
  baseLabel: string;
  label: string;
  plural: string;
}

export interface CardOffer {
  bank: string;
  cardType: 'credit' | 'debit';
  bps: number;
  capPaise: number;
  label: string;
}

export interface OutsideQuote {
  id: string;
  source: string;
  kind: 'online' | 'store' | 'local' | 'brand';
  /** All-in price per unit the buyer would pay there (delivery included). */
  pricePaise: Paise;
  delivery: string;
  installation: string;
  warranty: string;
  returns: string;
  checkedAgoMin: number;
  cardOffer?: CardOffer;
}

export type Evidence = 'link' | 'page' | 'expert' | 'unconfirmed';

export interface Product {
  id: string;
  title: string;
  short: string;
  brand?: string;
  model?: string;
  category: CategoryId;
  art: ArtKey;
  uom: string;
  hsn: string;
  gstBps: number;
  specs: Array<{ label: string; value: string; evidence: Evidence }>;
  warranty: string;
  options?: Array<{ key: string; label: string; values: Array<{ id: string; label: string }> }>;
  outside: OutsideQuote[];
  /** 30 days of outside best prices, oldest first (paise). */
  priceHistory: number[];
  link?: { store: string; url: string; idLabel: string; idValue: string };
  lookalike?: string;
  barcode?: string;
}

export interface FulfilmentStep {
  key: string;
  label: string;
  proof: string;
  afterHandover: boolean;
  returnCostAppliesAfter?: boolean;
  releasesHold?: string;
}

export interface HoldRule {
  key: string;
  label: string;
  bps: number;
  releaseAfterDays: number;
  deferredMaxDays?: number;
}

export interface Profile {
  id: string;
  label: string;
  modes: string[];
  steps: FulfilmentStep[];
  checklist: Array<{ key: string; label: string }>;
  codeDigits: 4 | 6;
  holds: HoldRule[];
  returnWindowDays: number;
  lateCreditPaise: Paise;
  returnCostPaise: Paise;
}

export interface Seller {
  id: string;
  name: string;
  owner: string;
  kind: 'dealer' | 'chain' | 'brand_desk' | 'shop' | 'service' | 'distributor';
  area: string;
  city: string;
  stateCode: string;
  state: string;
  pan: string;
  gstin: string;
  categories: CategoryId[];
  verified: boolean;
  rating?: number;
  ratingCount: number;
  settledOrders: number;
  onTimeBps: number;
  cancelBps: number;
  issuesResolvedBps: number;
  since: string;
  returnTerms: string;
  depositPaise: Paise;
  bank: { name: string; ifsc: string; last4: string };
  pincodes: string[];
  phoneMasked: string;
  hours: string;
  team: Array<{ name: string; role: string }>;
}

export type PoolState = 'open' | 'closed' | 'pricing' | 'offers' | 'fulfilment' | 'completed' | 'no_deal' | 'cancelled';

export type MemberStatus =
  | 'pending' // joined, booking not confirmed by the payment company
  | 'committed' // booking paid: the only status sellers count
  | 'left'
  | 'offered'
  | 'unserved'
  | 'accepted'
  | 'walked_away'
  | 'timed_out'
  | 'no_deal';

export interface Member {
  id: string;
  isMe?: boolean;
  name: string;
  pincode: string;
  area: string;
  householdKey: string;
  payerKey: string;
  deviceKey: string;
  qtyBase: number;
  options: Record<string, string>;
  needBy?: number;
  joinedAt: number;
  status: MemberStatus;
  bookingPaise: Paise;
  bookingRef?: string;
  bookingMethod?: string;
  bookingPaidAt?: number;
  decidedAt?: number;
  refundAt?: number;
  orderId?: string;
  channel?: 'app' | 'whatsapp' | 'assistant';
}

export interface Slab {
  fromUnit: number;
  perUnitPaise: Paise;
}

export interface Bid {
  id: string;
  poolId: string;
  sellerId: string;
  revision: number;
  pricePaise: Paise;
  capacityBase: number;
  deliverBy: number;
  modes: string[];
  terms: Record<string, number | boolean | string>;
  optionsCovered: string[];
  slabs: Slab[];
  validUntil: number;
  submittedAt: number;
  history: Array<{ revision: number; pricePaise: Paise; at: number }>;
  accessLog: Array<{ who: string; role: string; at: number; why: string }>;
  channel?: 'app' | 'whatsapp';
}

export interface Requirement {
  key: string;
  label: string;
  op: 'eq' | 'gte';
  value: number | boolean | string;
}

export interface Assignment {
  memberId: string;
  bidId: string;
  sellerId: string;
  qtyBase: number;
  backupBidId?: string;
}

export type UnservedReason = 'NO_CAPACITY' | 'OPTIONS_NOT_COVERED' | 'NEED_BY';

export interface AwardResult {
  ranked: string[];
  ineligible: Array<{ bidId: string; reasons: string[] }>;
  flagged: string[];
  assignments: Assignment[];
  unserved: Array<{ memberId: string; reason: UnservedReason }>;
  computedAt: number;
  confirmedAt?: number;
  confirmedBy?: string;
}

export interface PriceDecision {
  bidId: string;
  buyerPricePaise: Paise;
  decidedBy: string;
  decidedAt: number;
  note?: string;
}

export interface Pool {
  id: string;
  no: string;
  productId: string;
  areaLabel: string;
  areaKey: string;
  pincodes: string[];
  track: 'open' | 'community';
  communityId?: string;
  startedBy: { name: string; at: number; team?: boolean; isMe?: boolean };
  createdAt: number;
  closesAt: number;
  state: PoolState;
  profileId: string;
  qtyRule: { minBase: number; stepBase: number; maxPerBuyerBase?: number; maxPerHouseholdBase?: number };
  bookingPaise: Paise;
  checkoutPlans: Array<'prepay' | 'door' | 'emi'>;
  requirements: { deliverWithinDays: number; modes: string[]; terms: Requirement[] };
  waveCountMode: 'per_order' | 'per_uom';
  members: Member[];
  bids: Bid[];
  invitedSellers: string[];
  award?: AwardResult;
  blocked: Record<string, string>;
  prices: Record<string, PriceDecision>;
  closedAt?: number;
  pricingDeadline?: number;
  offersAt?: number;
  acceptBy?: number;
  noDealReason?: string;
  wave?: { closedAt: number; potPaise: Paise; settledUnits: number; perOrder: Record<string, Paise>; releaseToSeller: Record<string, Paise> };
  recurring?: string;
  pickup?: { place: string; address: string; slots: PickupSlot[] };
  serviceWindow?: string;
  extensionOptIns?: string[];
}

export interface PickupSlot {
  id: string;
  label: string;
  startsAt: number;
  endsAt: number;
  capacity: number;
  booked: number;
}

export type OrderStatus = 'awaiting_payment' | 'confirmed' | 'handed_over' | 'settled' | 'cancelled_by_buyer' | 'cancelled_by_seller' | 'returned';

export interface Order {
  id: string;
  no: string;
  poolId: string;
  memberId: string;
  isMe?: boolean;
  buyerName: string;
  buyerPhoneMasked: string;
  address: string;
  pincode: string;
  sellerId: string;
  productId: string;
  qtyBase: number;
  options: Record<string, string>;
  bidId: string;
  buyerPricePaise: Paise;
  sellerPricePaise: Paise;
  buyerTotal: Paise;
  sellerTotal: Paise;
  bookingCredit: Paise;
  plan: 'prepay' | 'door' | 'emi';
  emiMonths?: number;
  paidPaise: Paise;
  paidAt?: number;
  balanceDue: Paise;
  payMethod?: string;
  payRef?: string;
  status: OrderStatus;
  steps: Array<{ key: string; at: number; by: string; proof?: string }>;
  promisedBy: number;
  slot?: { id: string; label: string };
  code: { value: string; digits: 4 | 6; expiresAt: number; attempts: number; maxAttempts: number; usedAt?: number };
  checklist: Record<string, boolean>;
  handedOverAt?: number;
  holdsReleased: Array<{ key: string; at: number; reason: string }>;
  holdDeferredUntil?: number;
  tickets: string[];
  invoiceNo?: string;
  serial?: string;
  installJob?: string;
  rating?: { stars: number; text: string; at: number; photos: number };
  lateCreditPaise?: Paise;
  waveRefundPaise?: Paise;
  settledAt?: number;
  cancelledAt?: number;
  refundPaise?: Paise;
  returnedAt?: number;
  backupFromSellerId?: string;
  createdAt: number;
  tracking?: { partner: string; awb: string; rider?: string; etaText: string; events: Array<{ at: number; text: string }> };
}

export interface Ticket {
  id: string;
  no: string;
  orderId: string;
  isMe?: boolean;
  buyerName: string;
  sellerId: string;
  type: 'damaged' | 'wrong_item' | 'not_as_described' | 'late' | 'installation' | 'missing_parts' | 'other';
  description: string;
  photos: number;
  wants: 'replacement' | 'repair' | 'refund';
  status: 'open' | 'seller_replied' | 'pool_reviewing' | 'resolved';
  createdAt: number;
  sellerDueBy: number;
  ackBy: number;
  messages: Array<{ from: 'buyer' | 'seller' | 'pool'; text: string; at: number }>;
  resolution?: { kind: 'replacement' | 'repair' | 'refund' | 'partial_refund' | 'rejected'; amountPaise?: Paise; at: number; by: string };
}

export interface RiskSignal {
  id: string;
  kind: 'shared_payer' | 'shared_device' | 'similar_bids' | 'winner_rotation' | 'join_burst' | 'low_bid';
  severity: 'high' | 'medium' | 'low';
  title: string;
  detail: string;
  poolId?: string;
  entities: string[];
  evidence: string[];
  at: number;
  status: 'new' | 'watching' | 'dismissed' | 'escalated' | 'hold_payouts';
  note?: string;
}

export interface SellerApplication {
  id: string;
  business: string;
  owner: string;
  kind: Seller['kind'];
  city: string;
  stateCode: string;
  gstin: string;
  legalNameOnGst: string;
  pan: string;
  bankName: string;
  bankHolder: string;
  ifsc: string;
  categories: CategoryId[];
  pincodes: string[];
  documents: Array<{ name: string; ok: boolean }>;
  submittedAt: number;
  status: 'pending' | 'approved' | 'changes_requested' | 'rejected';
  note?: string;
  decidedAt?: number;
}

export interface Community {
  id: string;
  name: string;
  builder: string;
  area: string;
  pincode: string;
  handoverAt: number;
  homes: number;
  registered: number;
  poolIds: string[];
  needs: Array<{ category: string; households: number }>;
}

export interface Notification {
  id: string;
  to: 'buyer' | 'seller' | 'ops';
  kind: 'offer' | 'pool' | 'payment' | 'refund' | 'delivery' | 'code' | 'wave' | 'issue' | 'bid' | 'award' | 'payout' | 'risk' | 'review' | 'system';
  title: string;
  body: string;
  at: number;
  read: boolean;
  href?: string;
  channels: Array<'app' | 'whatsapp' | 'sms' | 'email'>;
}

export interface AuditEvent {
  id: string;
  at: number;
  actor: string;
  action: string;
  detail: string;
  poolId?: string;
  orderId?: string;
}

export interface Address {
  id: string;
  label: string;
  name: string;
  line1: string;
  line2: string;
  landmark?: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  phone: string;
  isDefault?: boolean;
}

export interface SavedCard {
  id: string;
  bank: string;
  type: 'credit' | 'debit';
  network: string;
  last4?: string;
}

export interface Buyer {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  memberSince: number;
  addresses: Address[];
  upi: string[];
  cards: SavedCard[];
  household: { size: number; key: string };
  communityId?: string;
}

export interface Prefs {
  lang: Lang;
  notify: Record<string, Array<'app' | 'whatsapp' | 'sms' | 'email'>>;
  dataSaver: boolean;
  /** Optional settings (absent = default). */
  connectors?: Record<string, boolean>;
  quietHours?: boolean;
  passkey?: boolean;
  marketing?: boolean;
  analytics?: boolean;
  voiceLang?: Lang;
}

export interface WatchItem {
  productId: string;
  addedAt: number;
  alert: 'pool' | 'price';
  targetPaise?: Paise;
}

export interface ChatMsg {
  id: string;
  from: 'me' | 'pool';
  text: string;
  at: number;
  voice?: { seconds: number; transcript: string; lang: Lang };
  card?: { kind: 'pool' | 'offer' | 'order' | 'product'; id: string };
  /** Steps the assistant took, shown so the buyer can see what it looked at. */
  tools?: string[];
  /** An action the assistant prepared; it runs only when the buyer confirms. */
  action?: { kind: 'join'; poolId: string; qtyBase: number; options: Record<string, string> };
  /** Original-language text with an English gloss (WhatsApp demo). */
  gloss?: string;
  buttons?: string[];
}

/** Something the buyer owns, kept in the Warranty Locker (POOL orders appear automatically). */
export interface LockerItem {
  id: string;
  title: string;
  boughtFrom: string;
  boughtAt: number;
  warrantyMonths: number;
  serial?: string;
  addedAt: number;
}

export interface DemoFlags {
  failNextPayment: boolean;
  slowNetwork: boolean;
  offline: boolean;
  failNextLoad: boolean;
}

export interface State {
  v: number;
  seededAt: number;
  offset: number;
  me: Buyer;
  sellerMeId: string;
  opsUser: { name: string; role: string };
  products: Product[];
  sellers: Seller[];
  profiles: Profile[];
  pools: Pool[];
  orders: Order[];
  tickets: Ticket[];
  signals: RiskSignal[];
  applications: SellerApplication[];
  communities: Community[];
  notifications: Notification[];
  audit: AuditEvent[];
  watch: WatchItem[];
  recent: string[];
  chats: { assistant: ChatMsg[]; whatsapp: ChatMsg[] };
  prefs: Prefs;
  demo: DemoFlags;
  tour: { active: boolean; step: number };
  sellerDrafts: Record<string, unknown>;
  onboarded: boolean;
  locker?: LockerItem[];
}
