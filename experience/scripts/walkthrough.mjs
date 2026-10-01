// End-to-end check of the 15-step investor walkthrough, driven through the real UI.
// Usage: node scripts/walkthrough.mjs — expects `vite preview` on :4173 (or BASE env).
import { chromium } from 'playwright-core';

const BASE = process.env.BASE ?? 'http://localhost:4173/';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--disable-background-networking'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const state = () => page.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => k.startsWith('pool-demo-state'))) ?? '{}'));
const go = async (path) => { await page.goto(BASE + '#' + path); await page.waitForTimeout(700); };
const click = async (name, opts = {}) => { await page.getByRole('button', { name, exact: opts.exact ?? false }).first().click(); await page.waitForTimeout(opts.wait ?? 400); };
const pay = async () => {
  const d = page.getByRole('dialog', { name: 'Payment' });
  await d.getByRole('button', { name: /^Pay ₹/ }).click();
  await d.getByRole('button', { name: 'Continue' }).waitFor({ timeout: 8000 });
  await d.getByRole('button', { name: 'Continue' }).click();
  await page.waitForTimeout(600);
};
const step = (n, msg) => console.log(`✓ ${String(n).padStart(2)} ${msg}`);
const fail = (msg) => { console.error(`✗ ${msg}`); process.exitCode = 1; };

await go('/');
await page.evaluate(() => localStorage.clear());
await go('/buyer');

// 1–2 Buyer: product → join the TV pool → refundable booking
await go('/buyer/find?link=tv');
await click('Find this product', { wait: 2600 });
await click('Yes, this is it', { wait: 700 });
step(1, 'Pasted link identified the exact TV');
await go('/buyer/pool/pool-tv');
await click('Join pool');
await click('Pay ₹2,000 booking', { wait: 500 });
await pay();
let s = await state();
const me = s.pools.find((p) => p.id === 'pool-tv').members.find((m) => m.isMe);
me?.status === 'committed' ? step(2, `Joined with a refundable booking (${me.bookingRef})`) : fail('booking not committed');

// 3–4 Seller: see demand → sealed bid with Wave Drop slabs
await go('/seller/demand/pool-tv');
(await page.getByText('households paid a booking').count()) ? step(3, 'Seller sees committed demand, no buyer names') : fail('demand page');
await go('/seller/demand/pool-tv/bid');
await page.getByLabel('Price per unit').fill('40000');
await click('Add slab');
await page.getByLabel('Amount per unit').first().fill('250');
await click('Review and seal');
await click('Seal bid', { wait: 600 });
s = await state();
const myBid = s.pools.find((p) => p.id === 'pool-tv').bids.find((b) => b.sellerId === s.sellerMeId);
myBid ? step(4, `Sealed bid ₹${myBid.pricePaise / 100} with ${myBid.slabs.length} Wave Drop slab(s)`) : fail('bid not sealed');

// 5–7 POOL team: close (demo) → hold back the flagged bid → confirm award → set price → publish
await go('/ops/awards/pool-tv');
await click('Close this pool now', { wait: 900 });
s = await state();
s.pools.find((p) => p.id === 'pool-tv').state === 'closed' ? step(5, 'Pool closed; sealed bids opened and ranked') : fail('pool not closed');
const flaggedRow = page.locator('tr', { hasText: 'QuickDeal Traders' });
await flaggedRow.getByRole('button', { name: 'Hold back' }).click();
await page.waitForTimeout(300);
await page.getByRole('dialog').getByRole('button', { name: 'Hold back' }).click();
await page.waitForTimeout(400);
await click('Confirm award', { wait: 800 });
s = await state();
const tv = s.pools.find((p) => p.id === 'pool-tv');
tv.state === 'pricing' && tv.blocked && Object.keys(tv.blocked).length ? step(6, `Flagged bid held back; award confirmed to ${new Set(tv.award.assignments.map((a) => a.sellerId)).size} seller(s)`) : fail('award not confirmed');
for (const input of await page.locator('input[id^="bp-"]').all()) {
  await input.fill('43000');
  await page.waitForTimeout(150);
}
while (await page.getByRole('button', { name: 'Set price' }).count()) { await page.getByRole('button', { name: 'Set price' }).first().click(); await page.waitForTimeout(300); }
await click('Publish offers', { wait: 800 });
s = await state();
s.pools.find((p) => p.id === 'pool-tv').state === 'offers' ? step(7, 'Buyer price set (₹43,000) and offers published') : fail('offers not published');

// 8 Buyer: offer → accept → pay now
const memberId = s.pools.find((p) => p.id === 'pool-tv').members.find((m) => m.isMe).id;
await go(`/buyer/offer/${memberId}`);
await click('Accept', { exact: true });
await page.getByText(/^Pay now/).first().click();
await page.waitForTimeout(200);
await click('Accept & pay');
await pay();
s = await state();
let order = s.orders.find((o) => o.isMe && o.poolId === 'pool-tv');
order && order.balanceDue === 0 ? step(8, `Accepted and paid · order ${order.no} · ₹${order.buyerTotal / 100}`) : fail('order not paid');

// 9 Seller: confirm → dispatch with photo
await go(`/seller/order/${order.id}`);
await click('Confirm order', { wait: 500 });
await click('Add dispatch photo');
await page.getByText('Tap to take photo').click();
await click('Use photo', { wait: 500 });
s = await state();
order = s.orders.find((o) => o.id === order.id);
order.steps.some((x) => x.key === 'dispatched') ? step(9, 'Seller confirmed and dispatched with photo proof') : fail('not dispatched');

// 10 Buyer: open-box checklist → code appears
await go(`/buyer/order/${order.id}`);
for (const cb of await page.locator('input[type="checkbox"]').all()) { await cb.check(); await page.waitForTimeout(150); }
(await page.getByText('Handover pass').count()) ? step(10, 'Checklist ticked; one-time code revealed') : fail('code not shown');

// 11 Seller: verify code + serial → money released
await go(`/seller/order/${order.id}/verify`);
await page.getByLabel("Demo: see buyer's code").click();
await click('Type it in');
await click('Scan');
await click('Verify and hand over', { wait: 700 });
s = await state();
order = s.orders.find((o) => o.id === order.id);
order.status === 'handed_over' ? step(11, `Code verified; invoice ${order.invoiceNo}`) : fail('handover failed');

// 12 Seller: installation job number releases the hold
await go(`/seller/order/${order.id}`);
await page.getByLabel('Brand installation job number').fill('VIS-INS-482913');
await click('Save job number', { wait: 500 });
s = await state();
order = s.orders.find((o) => o.id === order.id);
order.installJob ? step(12, 'Installation recorded; 10% hold released') : fail('installation not recorded');

// 13 Wave close via the guide's demo shortcut
await page.evaluate(() => {
  const k = Object.keys(localStorage).find((x) => x.startsWith('pool-demo-state'));
  const st = JSON.parse(localStorage.getItem(k));
  st.tour = { active: true, step: 12 };
  localStorage.setItem(k, JSON.stringify(st));
});
await go(`/buyer/order/${order.id}`);
await page.reload();
await page.waitForTimeout(800);
await click('Complete everyone’s deliveries (demo)', { wait: 1500 });
await page.waitForTimeout(5500); // the clock tick settles orders and closes the wave
s = await state();
order = s.orders.find((o) => o.id === order.id);
const tvDone = s.pools.find((p) => p.id === 'pool-tv');
tvDone.state === 'completed' && order.waveRefundPaise > 0 ? step(13, `Wave closed; Wave Drop ₹${(order.waveRefundPaise / 100).toFixed(2)} back to the buyer`) : fail(`wave not closed (state ${tvDone.state}, refund ${order.waveRefundPaise})`);

// 14–15 Payouts and reconciliation
await go('/seller/payouts');
(await page.getByText('Every payout line').count()) ? step(14, 'Seller payouts and holds shown') : fail('payouts');
await go('/ops/reconciliation');
const diff = await page.locator('text=Money in − money accounted for').locator('..').textContent();
diff?.includes('₹0.00') ? step(15, 'Reconciliation ties out: difference ₹0.00') : fail(`ledger: ${diff}`);

if (errors.length) fail('Runtime errors: ' + errors.join(' | '));
await browser.close();
