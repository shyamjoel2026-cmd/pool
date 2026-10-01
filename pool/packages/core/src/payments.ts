import type { PoolClient } from 'pg';

/** Receipts are supplied by the trusted PA adapter (M3). One receipt funds one owner globally. */
export async function claimPayment(
  c: PoolClient,
  reference: string,
  owner: string,
  minor: number,
  orderId?: string,
) {
  if (!reference.trim() || !Number.isSafeInteger(minor) || minor <= 0)
    throw new Error('invalid payment receipt');
  const previous = await c.query(
    'SELECT amount_minor,data FROM payments WHERE pa_reference=$1 FOR UPDATE',
    [reference],
  );
  if (previous.rowCount) {
    if (previous.rows[0].data.owner !== owner || previous.rows[0].amount_minor !== String(minor))
      throw new Error('payment receipt already allocated');
    return;
  }
  await c.query(
    'INSERT INTO payments(id,order_id,pa_reference,amount_minor,data) VALUES($1,$2,$3,$4,$5)',
    ['pa:' + reference, orderId ?? null, reference, String(minor), { owner }],
  );
}
