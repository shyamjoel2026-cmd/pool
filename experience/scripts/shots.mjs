// Visual QA: loads every route in Chromium, records console/page errors, and saves screenshots.
// Usage: node scripts/shots.mjs [filter] [--dark] — expects `vite preview` on :4173 (or BASE env).
import { launchBrowser } from './browser.mjs';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const BASE = process.env.BASE ?? 'http://localhost:4173/';
const OUT = process.env.OUT ?? '.shots';
const filter = process.argv.find((a, i) => i > 1 && !a.startsWith('--'));
const dark = process.argv.includes('--dark');
const errorsOnly = process.argv.includes('--errors');
const lang = (process.argv.find((a) => a.startsWith('--lang=')) ?? '').slice(7);
mkdirSync(OUT, { recursive: true });

const phone = { width: 412, height: 915 };
const desk = { width: 1440, height: 900 };
const ROUTES = [
  ['landing', '/', desk, true],
  ['landing-m', '/', phone, true],
  ['b-home', '/buyer', phone],
  ['b-explore', '/buyer/explore', phone],
  ['b-find', '/buyer/find?link=tv', phone],
  ['b-pool-phone', '/buyer/pool/pool-phone', phone],
  ['b-pool-solar', '/buyer/pool/pool-solar', phone],
  ['b-product-scooter', '/buyer/product/p-scooter', phone],
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
const browser = await launchBrowser({ proxy, args: ['--disable-background-networking', '--disable-component-update', '--no-first-run', '--disable-sync'] });
const errors = [];
// Serve Google Fonts from a local cache so screenshots never wait on the network.
const FC = `.shots/.fontcache2`;
// A full Chrome user agent so Google Fonts serves the same variable WOFF2 files a real phone gets.
const UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36';
mkdirSync(FC, { recursive: true });
const cached = (url) => {
  const f = `${FC}/${createHash('sha1').update(url).digest('hex')}`;
  if (!existsSync(f)) {
    try { writeFileSync(f, execFileSync('curl', ['-sSL', '-m', '30', '-A', UA, url])); } catch { return undefined; }
  }
  return readFileSync(f);
};
const routeFonts = async (ctx) => ctx.route(/fonts\.(googleapis|gstatic)\.com/, async (route) => {
  const url = route.request().url();
  const body = cached(url);
  if (!body) return route.abort();
  await route.fulfill({ status: 200, body, headers: { 'content-type': url.includes('googleapis') ? 'text/css' : 'font/woff2', 'access-control-allow-origin': '*' } });
});
const mk = (dpr) => browser.newContext({ viewport: phone, deviceScaleFactor: dpr, colorScheme: dark ? 'dark' : 'light', reducedMotion: 'reduce', ignoreHTTPSErrors: true });
const ctxs = { phone: await mk(2), desk: await mk(1) };
await routeFonts(ctxs.phone);
await routeFonts(ctxs.desk);
let ids = {};
for (const [name, path0, vp, full] of ROUTES) {
  if (filter && !name.includes(filter)) continue;
  const ctx = vp.width < 600 ? ctxs.phone : ctxs.desk;
  const page = await ctx.newPage();
  await page.setViewportSize(vp);
  page.on('pageerror', (e) => { errors.push(`${name}: PAGEERROR ${e.message}`); console.log(`${name}: PAGEERROR ${e.message}`); });
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
  if (lang) {
    if (!page.url().startsWith(BASE)) await page.goto(BASE + '#/buyer', { waitUntil: 'domcontentloaded' });
    await page.evaluate((l) => { const k = Object.keys(localStorage).find((x) => x.startsWith('pool-demo-state')); if (!k) return; const st = JSON.parse(localStorage.getItem(k)); st.prefs.lang = l; localStorage.setItem(k, JSON.stringify(st)); }, lang);
    await page.goto(BASE + '#' + path, { waitUntil: 'domcontentloaded' });
    await page.reload({ waitUntil: 'domcontentloaded' });
  }
  if (process.env.TRACE) console.log('->', name);
  await page.goto(BASE + '#' + path, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => errors.push(`${name}: navigation timeout`));
  if (errorsOnly) {
    await page.waitForTimeout(700);
    await page.close();
    continue;
  }
  await page.waitForFunction(() => document.fonts.check('600 16px "Google Sans Flex"'), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/${name}${dark ? '-dark' : ''}${lang ? '-' + lang : ''}.png`, fullPage: !!full, timeout: 20000 });
  await page.close();
}
await browser.close();
console.log(errors.length ? errors.join('\n') : 'No runtime errors');
