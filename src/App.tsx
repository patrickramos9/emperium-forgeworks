import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { SiteSystemBanner } from "@/components/SiteSystemBanner";
import { AnnouncementProvider } from "@/context/AnnouncementContext";
import { Layout } from "@/components/Layout";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { CartProvider } from "@/context/CartContext";
import { HomePage } from "@/pages/HomePage";
import { ShopPage } from "@/pages/ShopPage";
import { ProductDetailPage } from "@/pages/ProductDetailPage";
import { AboutPage } from "@/pages/AboutPage";
import { ShippingReturnsPage } from "@/pages/ShippingReturnsPage";
import { CartPage } from "@/pages/CartPage";
import { CheckoutSuccessPage } from "@/pages/CheckoutSuccessPage";
import { CheckoutCancelPage } from "@/pages/CheckoutCancelPage";
import { AdminLoginPage } from "@/pages/admin/AdminLoginPage";
import { AdminDashboardPage } from "@/pages/admin/AdminDashboardPage";
import { AdminProductsPage } from "@/pages/admin/AdminProductsPage";
import { AdminProductEditPage } from "@/pages/admin/AdminProductEditPage";
import { AdminOrdersPage } from "@/pages/admin/AdminOrdersPage";
import { AdminOrderDetailPage } from "@/pages/admin/AdminOrderDetailPage";
import { AdminComingSoonPage } from "@/pages/admin/AdminComingSoonPage";
import { AccountLoginPage } from "@/pages/account/AccountLoginPage";
import { AccountForgotPasswordPage } from "@/pages/account/AccountForgotPasswordPage";
import { AccountRegisterPage } from "@/pages/account/AccountRegisterPage";
import { AccountPage } from "@/pages/account/AccountPage";
import { AccountOrdersPage } from "@/pages/account/AccountOrdersPage";
import { AccountNotificationsPage } from "@/pages/account/AccountNotificationsPage";
import { VaultPage } from "@/pages/VaultPage";
import { VaultProductDetailPage } from "@/pages/VaultProductDetailPage";
import { AdminVaultPage } from "@/pages/admin/AdminVaultPage";
import { AdminAnnouncementsPage } from "@/pages/admin/AdminAnnouncementsPage";
import { AdminAnnouncementEditPage } from "@/pages/admin/AdminAnnouncementEditPage";
import { AdminNotificationsPage } from "@/pages/admin/AdminNotificationsPage";
import { AdminNotificationEditPage } from "@/pages/admin/AdminNotificationEditPage";

function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
    if (!gtag) return;

    gtag("event", "page_view", {
      page_path: `${location.pathname}${location.search}${location.hash}`,
      page_title: document.title,
    });
  }, [location.pathname, location.search, location.hash]);

  return null;
}

export default function App() {
  return (
    <CartProvider>
      <AnnouncementProvider>
        <BrowserRouter>
          <AnalyticsTracker />
          <SiteSystemBanner />
          <Routes>
          <Route element={<Layout showPowerLine />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/shop/:slug" element={<ProductDetailPage />} />
            <Route path="/vault" element={<VaultPage />} />
            <Route path="/vault/:slug" element={<VaultProductDetailPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/process" element={<Navigate to="/about" replace />} />
            <Route path="/process/*" element={<Navigate to="/about" replace />} />
            <Route path="/shipping-returns" element={<ShippingReturnsPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/account/orders" element={<AccountOrdersPage />} />
            <Route path="/account/notifications" element={<AccountNotificationsPage />} />
          </Route>
          <Route path="/account/login" element={<AccountLoginPage />} />
          <Route path="/account/forgot-password" element={<AccountForgotPasswordPage />} />
          <Route path="/account/register" element={<AccountRegisterPage />} />
          <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
          <Route path="/checkout/cancel" element={<CheckoutCancelPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="products" element={<AdminProductsPage />} />
            <Route path="products/:slug" element={<AdminProductEditPage />} />
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route path="orders/:id" element={<AdminOrderDetailPage />} />
            <Route path="announcements" element={<AdminAnnouncementsPage />} />
            <Route
              path="announcements/:id"
              element={<AdminAnnouncementEditPage />}
            />
            <Route path="notifications" element={<AdminNotificationsPage />} />
            <Route
              path="notifications/:id"
              element={<AdminNotificationEditPage />}
            />
            <Route
              path="promos"
              element={
                <AdminComingSoonPage
                  title="Promo codes"
                  milestone="M6"
                  description="Create and manage discount codes for cart and checkout."
                />
              }
            />
            <Route path="vault" element={<AdminVaultPage />} />
            <Route
              path="settings"
              element={
                <AdminComingSoonPage
                  title="Settings"
                  milestone="Soon"
                  description="Store configuration and operational settings."
                />
              }
            />
          </Route>
          </Routes>
        </BrowserRouter>
      </AnnouncementProvider>
    </CartProvider>
  );
}
