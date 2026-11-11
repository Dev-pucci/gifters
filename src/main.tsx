import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Outlet, Route, Routes, useLocation } from "react-router-dom";
import Footer from "./components/Footer";
import Header from "./components/Header";
import MiniCart from "./components/MiniCart";
import "./index.css";
import Account from "./pages/Account";
import { ForgotPasswordPage, ResetPasswordPage, SignInPage } from "./pages/AuthPages";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import { AboutPage, PrivacyPage, ShippingReturnsPage, TermsPage } from "./pages/CompanyPages";
import { ContactPage, FaqPage, HowToPersonalizePage, TrackOrderPage } from "./pages/HelpPages";
import OrderPage from "./pages/OrderPage";
import Home from "./pages/Home";
import { CategoryPage, FavoritesPage, SearchPage } from "./pages/Listing";
import NotFound from "./pages/NotFound";
import ProductPage from "./pages/ProductPage";
import { applySiteConfig } from "./lib/site";
import AdminPage from "./pages/admin/AdminPage";
import { AuthProvider, RequireAdmin, RequireAuth } from "./state/auth";
import { loadSiteConfig, SiteProvider } from "./state/site";
import { SectionProvider } from "./state/sections";

function Layout() {
  const { pathname } = useLocation();
  // Braces matter: newer browsers return a Promise from scrollTo, which React would treat as a cleanup.
  // Only scroll on page changes, not on query changes (option picks and filters keep their position).
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-white focus:px-4 focus:py-2">
        Skip to content
      </a>
      <Header />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <MiniCart />
    </div>
  );
}

loadSiteConfig().then((site) => {
  if (site) applySiteConfig(site);
  createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <SiteProvider initial={site}>
      <AuthProvider>
      <SectionProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="c/:slug" element={<CategoryPage />} />
            <Route path="p/:slug" element={<ProductPage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="favorites" element={<FavoritesPage />} />
            <Route path="cart" element={<CartPage />} />
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="order/:id" element={<OrderPage />} />
            <Route
              path="account"
              element={
                <RequireAuth>
                  <Account />
                </RequireAuth>
              }
            />
            <Route
              path="admin"
              element={
                <RequireAdmin>
                  <AdminPage />
                </RequireAdmin>
              }
            />
            <Route path="sign-in" element={<SignInPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
            <Route path="reset-password" element={<ResetPasswordPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="faq" element={<FaqPage />} />
            <Route path="how-to-personalize" element={<HowToPersonalizePage />} />
            <Route path="track-order" element={<TrackOrderPage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="shipping-returns" element={<ShippingReturnsPage />} />
            <Route path="privacy" element={<PrivacyPage />} />
            <Route path="terms" element={<TermsPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </SectionProvider>
      </AuthProvider>
      </SiteProvider>
    </BrowserRouter>
  </StrictMode>,
  );
});
