import { allocate, money, percentOf, sub, type Money } from './money.ts';
import { validateStateCode } from './india.ts';
export interface IndiaTaxContext {
  hsnCode: string;
  gstRateBps: number;
  sellerStateCode: string;
  deliveryStateCode: string;
  poolStateCode: string;
  supplyKind: 'MOVEMENT_OF_GOODS' | 'EXPLICIT_PLACE_OF_SUPPLY';
  placeOfSupplyStateCode?: string;
  taxTreatmentSource?: string;
  tcsApplicable?: boolean;
  tdsApplicable?: boolean;
}
export interface TaxParts {
  total: Money;
  cgst: Money;
  sgst: Money;
  igst: Money;
}
function splitTax(total: Money, intra: boolean): TaxParts {
  const zero = money('INR', 0);
  const [cgst, sgst] = allocate(total, [1, 1]);
  return {
    total,
    cgst: intra ? cgst! : zero,
    sgst: intra ? sgst! : zero,
    igst: intra ? zero : total,
  };
}
/** Goods movement POS: IGST Act s10(1)(a); other supply types require an explicit tax treatment.
 * https://www.indiacode.nic.in/bitstream/123456789/5747/1/the_integrated_goods_and_services_tax_act%2C_2017.pdf
 * TCS 15/2024 CT + 01/2024 IT, recorded in official Council ratification:
 * https://gstcouncil.gov.in/node/5511 (0.25%+0.25% or 0.5%).
 * Commission services: https://gst.karnataka.gov.in/Documents/General/gstserviceReadyReckner6102020.pdf
 * UNVERIFIED: CA to confirm POOL commission classification/current applicability; prototype uses requested 18%.
 * TDS s393(1), table 8(v): https://www.incometaxindia.gov.in/documents/d/guest/income_tax_act_2025_as_amended_by_fa_act_2026-pdf
 * UNVERIFIED: CA to confirm TDS base/exemptions; gross price used pending confirmation.
 */
export function calculateIndiaTaxes(buyerTotal: Money, margin: Money, ctx: IndiaTaxContext) {
  if (
    buyerTotal.currency !== 'INR' ||
    margin.currency !== 'INR' ||
    buyerTotal.minor < 0 ||
    margin.minor < 0
  )
    throw new Error('non-negative INR totals required');
  for (const code of [ctx.sellerStateCode, ctx.deliveryStateCode, ctx.poolStateCode])
    validateStateCode(code);
  let placeOfSupply = ctx.deliveryStateCode;
  // Other products/services are supported by reviewed tax treatment DATA, never inferred from category names.
  if (ctx.supplyKind === 'EXPLICIT_PLACE_OF_SUPPLY') {
    if (!ctx.placeOfSupplyStateCode || !ctx.taxTreatmentSource?.trim())
      throw new Error('explicit place of supply needs state and reviewed source');
    validateStateCode(ctx.placeOfSupplyStateCode);
    placeOfSupply = ctx.placeOfSupplyStateCode;
  } else if (ctx.supplyKind !== 'MOVEMENT_OF_GOODS')
    throw new Error('unsupported place-of-supply treatment; configure it before use');
  if (
    !/^(?:\d{4}|\d{6}|\d{8})$/.test(ctx.hsnCode) ||
    !Number.isSafeInteger(ctx.gstRateBps) ||
    ctx.gstRateBps < 0 ||
    ctx.gstRateBps > 10000
  )
    throw new Error('HSN/rate must be supplied as valid data');
  const [taxable, goodsTax] = allocate(buyerTotal, [10000, ctx.gstRateBps]);
  const [commissionNet, commissionTax] = allocate(margin, [10000, 1800]);
  // Applicability is reviewed data. A zero rate alone does not distinguish exempt and zero-rated supplies.
  // UNVERIFIED: rate-only fallback is for legacy pure fixtures; persisted zero-rate checkout requires explicit review.
  const tcs = (ctx.tcsApplicable ?? ctx.gstRateBps > 0) ? percentOf(taxable!, 50) : money('INR', 0);
  const tds = ctx.tdsApplicable === false ? money('INR', 0) : percentOf(buyerTotal, 10);
  return {
    taxable: taxable!,
    goods: splitTax(goodsTax!, ctx.sellerStateCode === placeOfSupply),
    commissionNet: commissionNet!,
    commission: splitTax(commissionTax!, ctx.poolStateCode === ctx.sellerStateCode),
    tcs: splitTax(tcs, ctx.sellerStateCode === placeOfSupply),
    tds,
    sellerInvoiceNet: sub(buyerTotal, goodsTax!),
  };
}
