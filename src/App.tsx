import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "@/components/Layout";
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
import { AdminProductsPage } from "@/pages/admin/AdminProductsPage";
import { AdminProductEditPage } from "@/pages/admin/AdminProductEditPage";
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
          <Route path="/admin" element={<Navigate to="/admin/products" replace />} />
          <Route path="/admin/products" element={<AdminProductsPage />} />
          <Route path="/admin/products/:slug" element={<AdminProductEditPage />} />
        </Routes>
      </BrowserRouter>
    </CartProvider>
  );
}
