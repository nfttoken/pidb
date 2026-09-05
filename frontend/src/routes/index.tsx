import { Navigate, Outlet, Route, Routes } from "react-router-dom";

import { AdminLayout } from "../layouts/AdminLayout";
import { Dashboard } from "../pages/admin/Dashboard";
import { Products } from "../pages/admin/Products";
import { ShopifySync } from "../pages/admin/ShopifySync";
import { Login } from "../pages/auth/Login";
import { ConsumerLayout } from "../layouts/ConsumerLayout";
import { BeautyQuiz } from "../pages/consumer/BeautyQuiz";
import { PublicProduct } from "../pages/consumer/PublicProduct";
import { QrProduct } from "../pages/consumer/QrProduct";
import { Imports } from "../pages/admin/Imports";
import { QrManagement } from "../pages/admin/QrManagement";
import { CatalogManagement } from "../pages/admin/CatalogManagement";
import { ReviewQueue } from "../pages/admin/ReviewQueue";
import { useAuthStore } from "../stores/auth";
import { Users } from "../pages/admin/Users";
import { Settings } from "../pages/admin/Settings";

function ProtectedRoute() {
  const user = useAuthStore().user;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

function AdminOnlyRoute() {
  const user = useAuthStore().user;
  return user?.role === "admin" ? <Outlet /> : <Navigate to="/admin" replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ConsumerLayout />}>
        <Route path="/quiz" element={<BeautyQuiz />} />
        <Route path="/p/:shortCode" element={<QrProduct />} />
        <Route path="/product/:productId" element={<PublicProduct />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<Dashboard />} />
          <Route path="/admin/products" element={<Products />} />
          <Route path="/admin/imports" element={<Imports />} />
          <Route path="/admin/shopify" element={<ShopifySync />} />
          <Route path="/admin/qr" element={<QrManagement />} />
          <Route path="/admin/catalog" element={<CatalogManagement />} />
          <Route path="/admin/review/products" element={<ReviewQueue mode="products" />} />
          <Route path="/admin/review/compliance" element={<ReviewQueue mode="compliance" />} />
          <Route path="/admin/settings" element={<Settings />} />
          <Route element={<AdminOnlyRoute />}><Route path="/admin/users" element={<Users />} /></Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/quiz" replace />} />
    </Routes>
  );
}
