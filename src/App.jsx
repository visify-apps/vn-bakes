import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AccessProvider } from './context/AccessContext'
import { AuthProvider } from './context/AuthContext'
import { BusinessProvider } from './context/BusinessContext'
import { PublicLayout } from './layouts/PublicLayout'
import { AdminLayout } from './layouts/AdminLayout'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { HomePage } from './pages/public/HomePage'
import { MenuPage } from './pages/public/MenuPage'
import { BrowniesPage } from './pages/public/BrowniesPage'
import { GiftsPage } from './pages/public/GiftsPage'
import { CakesPage } from './pages/public/CakesPage'
import { CustomCakePage } from './pages/public/CustomCakePage'
import { ProductDetailPage } from './pages/public/ProductDetailPage'
import { AdminLoginPage } from './pages/admin/AdminLoginPage'
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage'
import { AdminEnquiriesPage } from './pages/admin/AdminEnquiriesPage'
import { AdminEnquiryDetailPage } from './pages/admin/AdminEnquiryDetailPage'
import { AdminProductsPage } from './pages/admin/AdminProductsPage'
import { AdminProductEditPage } from './pages/admin/AdminProductEditPage'
import { AdminCustomersPage } from './pages/admin/AdminCustomersPage'
import { AdminCustomerDetailPage } from './pages/admin/AdminCustomerDetailPage'
import { AdminMoneyPage } from './pages/admin/AdminMoneyPage'
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage'
import { AdminMorePage } from './pages/admin/AdminMorePage'
import { AdminReportsPage } from './pages/admin/AdminReportsPage'

/** Shop SPA only — Visify desk is a separate deploy (visify-desk). */
export default function App() {
  return (
    <AuthProvider>
      <BusinessProvider>
        <AccessProvider>
          <HashRouter>
            <Routes>
              <Route element={<PublicLayout />}>
                <Route index element={<HomePage />} />
                <Route path="menu" element={<MenuPage />} />
                <Route path="brownies" element={<BrowniesPage />} />
                <Route path="gifts" element={<GiftsPage />} />
                <Route path="classes" element={<Navigate to="/gifts" replace />} />
                <Route path="cakes" element={<CakesPage />} />
                <Route path="custom-cake" element={<CustomCakePage />} />
                <Route path="products/:productId" element={<ProductDetailPage />} />
                <Route path="enquiry/success" element={<Navigate to="/" replace />} />
              </Route>

              <Route path="admin/login" element={<AdminLoginPage />} />

              <Route
                path="admin"
                element={
                  <ProtectedRoute>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminDashboardPage />} />
                <Route path="enquiries" element={<AdminEnquiriesPage />} />
                <Route path="enquiries/:id" element={<AdminEnquiryDetailPage />} />
                <Route path="products" element={<AdminProductsPage />} />
                <Route path="products/new" element={<AdminProductEditPage />} />
                <Route path="products/:productId" element={<AdminProductEditPage />} />
                <Route path="customers" element={<AdminCustomersPage />} />
                <Route path="customers/:customerId" element={<AdminCustomerDetailPage />} />
                <Route path="money" element={<AdminMoneyPage />} />
                <Route path="reports" element={<AdminReportsPage />} />
                <Route path="reports/:section" element={<AdminReportsPage />} />
                <Route path="orders" element={<Navigate to="/admin/money" replace />} />
                <Route path="settings" element={<AdminSettingsPage />} />
                <Route path="more" element={<AdminMorePage />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </HashRouter>
        </AccessProvider>
      </BusinessProvider>
    </AuthProvider>
  )
}
