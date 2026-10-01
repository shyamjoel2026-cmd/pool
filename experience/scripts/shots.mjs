// Visual QA: loads every route in Chromium, records console/page errors, and saves screenshots.
// Usage: node scripts/shots.mjs [filter] [--dark] — expects `vite preview` on :4173 (or BASE env).
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://localhost:4173/';
const OUT = process.env.OUT ?? '.shots';
const filter = process.argv.find((a, i) => i > 1 && !a.startsWith('--'));
const dark = process.argv.includes('--dark');
mkdirSync(OUT, { recursive: true });

const phone = { width: 412, height: 915 };
const desk = { width: 1440, height: 900 };
const ROUTES = [
  ['landing', '/', desk, true],
  ['landing-m', '/', phone, true],
  ['b-home', '/buyer', phone],
  ['b-explore', '/buyer/explore', phone],
  ['b-find', '/buyer/find?link=tv', phone],
  ['b-product', '/buyer/product/p-tv', phone],
  ['b-pool', '/buyer/pool/pool-tv', phone],
  ['b-join', '/buyer/join/pool-tv', phone],
  ['b-start', '/buyer/start/p-fridge', phone],
  ['b-pools', '/buyer/pools', phone],
  ['b-offer', '/buyer/offer/m-me-rice', phone],
  ['b-offer-oil', '/buyer/offer/m-me-oil', phone],
  ['b-accept', '/buyer/accept/m-me-rice', phone],
  ['b-orders', '/buyer/orders', phone],
  ['b-order-mixer', '/buyer/order/ORDER_MIXER', phone],
  ['b-order-washer', '/buyer/order/ORDER_WASHER', phone],
  ['b-invoice', '/buyer/order/ORDER_WASHER/invoice', phone],
  ['b-issue', '/buyer/order/ORDER_MIXER/issue', phone],
  ['b-money', '/buyer/money', phone],
  ['b-account', '/buyer/account', phone],
  ['b-cards', '/buyer/account/cards', phone],
  ['b-privacy', '/buyer/account/privacy', phone],
  ['b-notifs', '/buyer/notifications', phone],
  ['b-help', '/buyer/help', phone],
  ['b-chat', '/buyer/help/chat', phone],
  ['b-connectors', '/buyer/account/connectors', phone],
  ['b-community', '/buyer/community', phone],
  ['b-locker', '/buyer/locker', phone],
  ['b-watching', '/buyer/watching', phone],
  ['b-assistant', '/buyer/assistant', phone],
  ['b-whatsapp', '/buyer/whatsapp', phone],
  ['b-seller', '/buyer/seller/s-lakshmi', phone],
  ['b-share', '/buyer/share', phone],
  ['b-promise', '/buyer/help/promise', phone],
  ['b-desk', '/buyer', desk],
  ['s-today', '/seller', phone],
  ['s-demand', '/seller/demand', phone],
  ['s-demand-tv', '/seller/demand/pool-tv', phone],
  ['s-bid', '/seller/demand/pool-tv/bid', phone],
  ['s-bids', '/seller/bids', phone],
  ['s-orders', '/seller/orders', phone],
  ['s-order', '/seller/order/ORDER_MIXER', phone],
  ['s-verify', '/seller/order/ORDER_MIXER/verify', phone],
  ['s-payouts', '/seller/payouts', phone],
  ['s-account', '/seller/account', phone],
  ['s-staff', '/seller/staff', phone],
  ['s-forward', '/seller/forward', phone],
  ['o-overview', '/ops', desk],
  ['o-pools', '/ops/pools', desk],
  ['o-awards-ac', '/ops/awards/pool-ac', desk],
  ['o-awards-tv', '/ops/awards/pool-tv', desk],
  ['o-pricing', '/ops/pricing', desk],
  ['o-exceptions', '/ops/exceptions', desk],
  ['o-recon', '/ops/reconciliation', desk],
  ['o-sellers', '/ops/sellers', desk],
  ['o-risk', '/ops/risk', desk],
  ['o-audit', '/ops/audit', desk],
  ['o-settings', '/ops/settings', desk],
  ['o-mobile', '/ops', phone],
];

const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } : undefined;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy, args: ['--disable-background-networking', '--disable-component-update', '--no-first-run', '--disable-sync'] });
const errors = [];
const mk = (dpr) => browser.newContext({ viewport: phone, deviceScaleFactor: dpr, colorScheme: dark ? 'dark' : 'light', reducedMotion: 'reduce', ignoreHTTPSErrors: true });
const ctxs = { phone: await mk(2), desk: await mk(1) };
let ids = {};
for (const [name, path0, vp, full] of ROUTES) {
  if (filter && !name.includes(filter)) continue;
  const ctx = vp.width < 600 ? ctxs.phone : ctxs.desk;
  const page = await ctx.newPage();
  await page.setViewportSize(vp);
  page.on('pageerror', (e) => errors.push(`${name}: PAGEERROR ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('ERR_')) errors.push(`${name}: console ${m.text().slice(0, 300)}`); });
  if (!ids.ORDER_MIXER) {
    await page.goto(BASE + '#/buyer', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    ids = await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => k.startsWith('pool-demo-state')) ?? '') ?? '{}');
      const o = (pid) => s.orders?.find((x) => x.isMe && x.poolId === pid)?.id;
      return { ORDER_MIXER: o('pool-mixer'), ORDER_WASHER: o('pool-washer') };
    });
  }
  const path = path0.replace(/ORDER_[A-Z]+/g, (k) => ids[k] ?? k);
  await page.goto(BASE + '#' + path, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts.ready.then(() => true)).catch(() => {});
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/${name}${dark ? '-dark' : ''}.png`, fullPage: !!full, timeout: 20000 });
  await page.close();
}
await browser.close();
console.log(errors.length ? errors.join('\n') : 'No runtime errors');
