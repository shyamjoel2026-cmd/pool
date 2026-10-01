import { Route, Routes, useLocation } from 'react-router-dom';
import { OfflineBanner, TabBar } from './parts';
import { Home, Explore, Category } from './Home';
import { Find, ProductPage } from './Find';
import { PoolPage, JoinFlow, StartFlow } from './Pool';
import { OfferPage, AcceptFlow } from './Offer';
import { MyPools, Orders, OrderPage, IssueFlow, InvoicePage } from './Orders';
import { MoneyPage, TxnPage } from './Money';
import { Account, Profile, Addresses, AddressEdit, Cards, NotifSettings, LanguagePage, Privacy, Notifications, Help, Promise, HowItWorks, RankingRule, Legal, SupportChat, Connectors } from './Account';
import { Community, Locker, Watching, Assistant, WhatsAppDemo, SellerProfile, ShareDemo } from './Extras';

const NO_TABS = ['/buyer/join', '/buyer/start', '/buyer/accept', '/buyer/find', '/buyer/assistant', '/buyer/whatsapp', '/buyer/help/chat', '/buyer/share', '/buyer/product/', '/buyer/pool/', '/buyer/offer/'];

export function BuyerApp() {
  const { pathname } = useLocation();
  const showTabs = !NO_TABS.some((p) => pathname.startsWith(p)) && !/\/order\/[^/]+\/(issue|invoice)/.test(pathname);
  return (
    <div className="flex h-full flex-col bg-bg">
      <OfflineBanner />
      <div data-scroll-root className="scroll-y relative min-h-0 flex-1" style={{ paddingBottom: showTabs ? 92 : 0 }}>
        <Routes>
          <Route index element={<Home />} />
          <Route path="explore" element={<Explore />} />
          <Route path="category/:id" element={<Category />} />
          <Route path="find" element={<Find />} />
          <Route path="product/:id" element={<ProductPage />} />
          <Route path="pool/:id" element={<PoolPage />} />
          <Route path="join/:poolId" element={<JoinFlow />} />
          <Route path="start/:productId" element={<StartFlow />} />
          <Route path="pools" element={<MyPools />} />
          <Route path="offer/:memberId" element={<OfferPage />} />
          <Route path="accept/:memberId" element={<AcceptFlow />} />
          <Route path="orders" element={<Orders />} />
          <Route path="order/:id" element={<OrderPage />} />
          <Route path="order/:id/issue" element={<IssueFlow />} />
          <Route path="order/:id/invoice" element={<InvoicePage />} />
          <Route path="money" element={<MoneyPage />} />
          <Route path="money/:id" element={<TxnPage />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="account" element={<Account />} />
          <Route path="account/profile" element={<Profile />} />
          <Route path="account/addresses" element={<Addresses />} />
          <Route path="account/addresses/:id" element={<AddressEdit />} />
          <Route path="account/cards" element={<Cards />} />
          <Route path="account/notifications" element={<NotifSettings />} />
          <Route path="account/language" element={<LanguagePage />} />
          <Route path="account/privacy" element={<Privacy />} />
          <Route path="account/connectors" element={<Connectors />} />
          <Route path="help" element={<Help />} />
          <Route path="help/promise" element={<Promise />} />
          <Route path="help/how" element={<HowItWorks />} />
          <Route path="help/ranking" element={<RankingRule />} />
          <Route path="help/legal/:doc" element={<Legal />} />
          <Route path="help/chat" element={<SupportChat />} />
          <Route path="community" element={<Community />} />
          <Route path="locker" element={<Locker />} />
          <Route path="watching" element={<Watching />} />
          <Route path="assistant" element={<Assistant />} />
          <Route path="whatsapp" element={<WhatsAppDemo />} />
          <Route path="share" element={<ShareDemo />} />
          <Route path="seller/:id" element={<SellerProfile />} />
        </Routes>
      </div>
      {showTabs && <TabBar />}
    </div>
  );
}
