import { Gauge, Package, Radar, User, Wallet } from 'lucide-react';
import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { cn } from '../lib/cn';
import { useSim } from '../sim/store';
import { OfflineBanner } from '../buyer/parts';
import { Today, DemandList, DemandDetail, Forward } from './Demand';
import { BidForm, Bids } from './Bid';
import { SellerOrders, SellerOrder, Verify, StaffMode } from './Orders';
import { Payouts, SellerAccount, SellerNotifications } from './Account';

const NO_TABS = [/\/seller\/demand\/[^/]+\/bid/, /\/seller\/order\/[^/]+\/verify/, /\/seller\/staff/];

export function SellerApp() {
  const { pathname } = useLocation();
  const showTabs = !NO_TABS.some((r) => r.test(pathname));
  return (
    <div className="flex h-full flex-col bg-bg">
      <OfflineBanner />
      <div data-scroll-root className="scroll-y relative min-h-0 flex-1" style={{ paddingBottom: showTabs ? 76 : 0 }}>
        <Routes>
          <Route index element={<Today />} />
          <Route path="demand" element={<DemandList />} />
          <Route path="demand/:poolId" element={<DemandDetail />} />
          <Route path="demand/:poolId/bid" element={<BidForm />} />
          <Route path="forward" element={<Forward />} />
          <Route path="bids" element={<Bids />} />
          <Route path="orders" element={<SellerOrders />} />
          <Route path="order/:id" element={<SellerOrder />} />
          <Route path="order/:id/verify" element={<Verify />} />
          <Route path="staff" element={<StaffMode />} />
          <Route path="payouts" element={<Payouts />} />
          <Route path="notifications" element={<SellerNotifications />} />
          <Route path="account" element={<SellerAccount />} />
        </Routes>
      </div>
      {showTabs && <SellerTabBar />}
    </div>
  );
}

function SellerTabBar() {
  const s = useSim();
  const me = s.sellerMeId;
  const toConfirm = s.orders.filter((o) => o.sellerId === me && o.status === 'confirmed' && !o.steps.some((x) => x.key === 'seller_confirmed')).length;
  const demand = s.pools.filter((p) => p.state === 'open' && p.invitedSellers.includes(me) && !p.bids.some((b) => b.sellerId === me)).length;
  const tabs = [
    { to: '/seller', end: true, icon: Gauge, label: 'Today' },
    { to: '/seller/demand', icon: Radar, label: 'Demand', badge: demand },
    { to: '/seller/orders', icon: Package, label: 'Orders', badge: toConfirm },
    { to: '/seller/payouts', icon: Wallet, label: 'Payouts' },
    { to: '/seller/account', icon: User, label: 'Business' },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur-xl" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }} aria-label="Seller">
      <div className="mx-auto grid max-w-[560px] grid-cols-5">
        {tabs.map((tb) => (
          <NavLink key={tb.to} to={tb.to} end={tb.end} className={({ isActive }) => cn('relative flex h-[60px] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition', isActive ? 'text-wave' : 'text-ink-3 hover:text-ink-2')}>
            {({ isActive }) => (
              <>
                <tb.icon className="h-[22px] w-[22px]" strokeWidth={isActive ? 2.4 : 2} />
                <span>{tb.label}</span>
                {tb.badge ? <span className="num absolute right-[22%] top-2 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-warn px-1 text-[10px] font-bold text-white">{tb.badge}</span> : null}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
