import { useEffect } from 'react';
import { HashRouter, MemoryRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { BuyerApp } from './buyer/BuyerApp';
import { DemoBar, PhoneStage } from './demo/Shell';
import { Landing } from './demo/Landing';
import { OpsApp } from './ops/OpsApp';
import { SellerApp } from './seller/SellerApp';
import { tick, useSim } from './sim/store';

function ThemeSync() {
  const theme = useSim().prefs.theme;
  const lang = useSim().prefs.lang;
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
    root.lang = lang === 'te' ? 'te' : lang === 'hi' ? 'hi' : 'en';
  }, [theme, lang]);
  return null;
}

function Clock() {
  useEffect(() => {
    tick();
    const i = setInterval(tick, 5000);
    return () => clearInterval(i);
  }, []);
  return null;
}

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.querySelectorAll('[data-scroll-root]').forEach((el) => el.scrollTo({ top: 0 }));
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return null;
}

// The shareable single-file build runs inside a viewer that doesn't allow URL-hash routing, so it navigates in memory.
const Router = import.meta.env.MODE === 'single' ? MemoryRouter : HashRouter;

export function App() {
  return (
    <Router>
      <ThemeSync />
      <Clock />
      <ScrollTop />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/buyer/*"
          element={
            <>
              <DemoBar role="buyer" />
              <PhoneStage role="buyer">
                <BuyerApp />
              </PhoneStage>
            </>
          }
        />
        <Route
          path="/seller/*"
          element={
            <>
              <DemoBar role="seller" />
              <PhoneStage role="seller">
                <SellerApp />
              </PhoneStage>
            </>
          }
        />
        <Route
          path="/ops/*"
          element={
            <>
              <DemoBar role="ops" />
              <OpsApp />
            </>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
