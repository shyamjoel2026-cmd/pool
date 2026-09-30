/**
 * Product-agnostic commitments. A bid states its terms as key/value data; a pool states what it requires.
 * Examples (all data, none hard-coded): { warranty_months: 12 } for electronics, { same_day_cut: true } for meat,
 * { installation_included: true } for appliances, { isi_mark: true } for helmets, { expiry_days_min: 180 } for packaged food.
 */
export type TermValue = number | string | boolean;
export type Terms = Readonly<Record<string, TermValue>>;

export interface TermRequirement {
  readonly key: string;
  readonly op: 'eq' | 'gte' | 'lte' | 'in';
  readonly value: TermValue | readonly TermValue[];
}

export function meetsTerms(terms: Terms, reqs: readonly TermRequirement[]): { ok: boolean; failed: TermRequirement[] } {
  const failed = reqs.filter((r) => {
    const v = terms[r.key];
    if (v === undefined) return true;
    switch (r.op) {
      case 'eq':
        return v !== r.value;
      case 'gte':
        return !(typeof v === 'number' && typeof r.value === 'number' && v >= r.value);
      case 'lte':
        return !(typeof v === 'number' && typeof r.value === 'number' && v <= r.value);
      case 'in':
        return !(Array.isArray(r.value) && r.value.includes(v));
    }
  });
  return { ok: failed.length === 0, failed };
}
