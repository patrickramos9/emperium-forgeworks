import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { CartProvider } from "@/context/CartContext";
import { HomePage } from "@/pages/HomePage";
import { ShopPage } from "@/pages/ShopPage";
import { ProductDetailPage } from "@/pages/ProductDetailPage";
import { ProcessPage } from "@/pages/ProcessPage";
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
import { AccountRegisterPage } from "@/pages/account/AccountRegisterPage";
import { AccountPage } from "@/pages/account/AccountPage";
import { AccountOrdersPage } from "@/pages/account/AccountOrdersPage";

export default function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout showPowerLine />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/shop/:slug" element={<ProductDetailPage />} />
            <Route path="/process" element={<ProcessPage />} />
            <Route path="/shipping-returns" element={<ShippingReturnsPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/account/orders" element={<AccountOrdersPage />} />
          </Route>
          <Route path="/account/login" element={<AccountLoginPage />} />
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
            <Route
              path="vault"
              element={
                <AdminComingSoonPage
                  title="Vault"
                  milestone="M7"
                  description="Manage exclusive vault products and access keys."
                />
              }
            />
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
    </CartProvider>
  );
}
