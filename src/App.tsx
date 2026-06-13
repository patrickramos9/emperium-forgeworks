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
import { PrivacyPolicyPage } from "@/pages/PrivacyPolicyPage";
import { ForgeTermsPage } from "@/pages/ForgeTermsPage";
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
import { AdminPromoTemplatesPage } from "@/pages/admin/AdminPromoTemplatesPage";
import { AdminPromoTemplateEditPage } from "@/pages/admin/AdminPromoTemplateEditPage";
import { AccountLoginPage } from "@/pages/account/AccountLoginPage";
import { AccountForgotPasswordPage } from "@/pages/account/AccountForgotPasswordPage";
import { AccountRegisterPage } from "@/pages/account/AccountRegisterPage";
import { AccountPage } from "@/pages/account/AccountPage";
import { AccountOrdersPage } from "@/pages/account/AccountOrdersPage";
import { AccountOrderDetailPage } from "@/pages/account/AccountOrderDetailPage";
import { AccountNotificationsPage } from "@/pages/account/AccountNotificationsPage";
import { AccountFavoritesPage } from "@/pages/account/AccountFavoritesPage";
import { VaultPage } from "@/pages/VaultPage";
import { VaultProductDetailPage } from "@/pages/VaultProductDetailPage";
import { AdminVaultPage } from "@/pages/admin/AdminVaultPage";
import { AdminAnnouncementsPage } from "@/pages/admin/AdminAnnouncementsPage";
import { AdminAnnouncementEditPage } from "@/pages/admin/AdminAnnouncementEditPage";
import { AdminNotificationsPage } from "@/pages/admin/AdminNotificationsPage";
import { AdminNotificationEditPage } from "@/pages/admin/AdminNotificationEditPage";
import { AdminReviewsPage } from "@/pages/admin/AdminReviewsPage";
import { ReviewsPage } from "@/pages/ReviewsPage";
import { AccountReviewPage } from "@/pages/account/AccountReviewPage";
import { SculptorDetailPage } from "@/pages/SculptorDetailPage";
import { AdminShippingProfilesPage } from "@/pages/admin/AdminShippingProfilesPage";
import { AdminShippingProfileEditPage } from "@/pages/admin/AdminShippingProfileEditPage";
import { AdminSculptorsPage } from "@/pages/admin/AdminSculptorsPage";
import { AdminSculptorEditPage } from "@/pages/admin/AdminSculptorEditPage";
import { SculptorPartnerLayout } from "@/components/partner/SculptorPartnerLayout";
import { PartnerSculptorEditPage } from "@/pages/partner/PartnerSculptorEditPage";
import { TrustedSiteScript } from "@/components/TrustedSiteScript";
import { ScrollToTopOnNavigate } from "@/components/ScrollToTopOnNavigate";

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
          <ScrollToTopOnNavigate />
          <AnalyticsTracker />
          <TrustedSiteScript />
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
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="/forge-terms" element={<ForgeTermsPage />} />
            <Route path="/reviews" element={<ReviewsPage />} />
            <Route path="/sculptors/:slug" element={<SculptorDetailPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/account/orders" element={<AccountOrdersPage />} />
            <Route
              path="/account/orders/:orderId"
              element={<AccountOrderDetailPage />}
            />
            <Route
              path="/account/orders/:orderId/review"
              element={<AccountReviewPage />}
            />
            <Route path="/account/notifications" element={<AccountNotificationsPage />} />
            <Route path="/account/favorites" element={<AccountFavoritesPage />} />
          </Route>
          <Route path="/account/login" element={<AccountLoginPage />} />
          <Route path="/account/forgot-password" element={<AccountForgotPasswordPage />} />
          <Route path="/account/register" element={<AccountRegisterPage />} />
          <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
          <Route path="/checkout/cancel" element={<CheckoutCancelPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/partner" element={<SculptorPartnerLayout />}>
            <Route path="sculptor" element={<PartnerSculptorEditPage />} />
          </Route>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="products" element={<AdminProductsPage />} />
            <Route path="products/:slug" element={<AdminProductEditPage />} />
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route path="orders/:id" element={<AdminOrderDetailPage />} />
            <Route path="shipping" element={<AdminShippingProfilesPage />} />
            <Route
              path="shipping/:id"
              element={<AdminShippingProfileEditPage />}
            />
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
            <Route path="reviews" element={<AdminReviewsPage />} />
            <Route path="sculptors" element={<AdminSculptorsPage />} />
            <Route path="sculptors/:slug" element={<AdminSculptorEditPage />} />
            <Route path="promos" element={<AdminPromoTemplatesPage />} />
            <Route path="promos/:id" element={<AdminPromoTemplateEditPage />} />
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
