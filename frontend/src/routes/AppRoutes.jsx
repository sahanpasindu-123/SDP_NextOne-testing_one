import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute.jsx";

const EmployeeLayout = lazy(() => import("../layouts/EmployeeLayout/EmployeeLayout.jsx"));
const AdminLayout = lazy(() => import("../layouts/AdminLayout/AdminLayout.jsx"));
const CustomerLayout = lazy(() => import("../layouts/CustomerLayout/CustomerLayout.jsx"));
const AuthLayout = lazy(() => import("../layouts/AuthLayout/AuthLayout.jsx"));

/** Employee pages */
const Dashboard = lazy(() => import("../pages/Dashboard/Dashboard.jsx"));
const InventoryAll = lazy(() => import("../pages/Inventory/InventoryAll.jsx"));
const SalesBilling = lazy(() => import("../pages/SalesBilling/SalesBilling.jsx"));
const Reservations = lazy(() => import("../pages/Reservations/Reservations.jsx"));
const ReportsSales = lazy(() => import("../pages/Reports/ReportsSales.jsx"));
const ReportsInventory = lazy(() => import("../pages/Reports/ReportsInventory.jsx"));
const ReportsPerformance = lazy(() => import("../pages/Reports/ReportsPerformance.jsx"));
const Customers = lazy(() => import("../pages/Customers/Customers.jsx"));
const LowStock = lazy(() => import("../pages/LowStock/LowStock.jsx"));
const AlertsAll = lazy(() => import("../pages/Alerts/AlertsAll.jsx"));
const SettingsLayout = lazy(() => import("../pages/Settings/SettingsLayout.jsx"));
const UserProfile = lazy(() => import("../pages/Settings/UserProfile.jsx"));
const Security = lazy(() => import("../pages/Settings/Security.jsx"));
const BackupData = lazy(() => import("../pages/Settings/BackupData.jsx"));
const CompanyInfo = lazy(() => import("../pages/Settings/CompanyInfo.jsx"));

/** Admin pages */
const DeleteProduct = lazy(() => import("../pages/Admin/Inventory/DeleteProduct/DeleteProduct.jsx"));
const AdminDashboard = lazy(() => import("../pages/Admin/Dashboard/AdminDashboard.jsx"));
const AdminInventory = lazy(() => import("../pages/Admin/Inventory/AdminInventory.jsx"));
const AdminPending = lazy(() => import("../pages/Admin/Pending/AdminPending.jsx"));
const AdminSalesHistory = lazy(() => import("../pages/Admin/SalesHistory/AdminSalesHistory.jsx"));
const AdminReservations = lazy(() => import("../pages/Admin/Reservations/AdminReservations.jsx"));
const AdminReportsSales = lazy(() => import("../pages/Admin/Reports/AdminReportsSales.jsx"));
const AdminLowStock = lazy(() => import("../pages/Admin/LowStock/AdminLowStock.jsx"));
const AdminUserManagement = lazy(() => import("../pages/Admin/UserManagement/AdminUserManagement.jsx"));
const AdminCategories = lazy(() => import("../pages/Admin/Categories/AdminCategories.jsx"));
const AdminContacts = lazy(() => import("../pages/Admin/Contacts/AdminContacts.jsx"));
const AdminContactReply = lazy(() => import("../pages/Admin/Contacts/AdminContactReply.jsx"));

/** Customer pages */
const CustomerHome = lazy(() => import("../pages/Customer/Home/CustomerHome.jsx"));
const PartsCatalog = lazy(() => import("../pages/Customer/Catalog/PartsCatalog.jsx"));
const MyReservations = lazy(() => import("../pages/Customer/Reservations/MyReservations.jsx"));
const ProfileSettings = lazy(() => import("../pages/Customer/Profile/ProfileSettings.jsx"));
const ContactUs = lazy(() => import("../pages/Customer/Contact/ContactUs.jsx"));
const AboutUs = lazy(() => import("../pages/Customer/Info/AboutUs.jsx"));
const PrivacyPolicy = lazy(() => import("../pages/Customer/Info/PrivacyPolicy.jsx"));
const TermsOfService = lazy(() => import("../pages/Customer/Info/TermsOfService.jsx"));

/** Auth pages */
const SignIn = lazy(() => import("../pages/Customer/Auth/SignIn.jsx"));
const SignUp = lazy(() => import("../pages/Customer/Auth/SignUp.jsx"));
const ForgotPassword = lazy(() => import("../pages/Customer/Auth/ForgotPassword.jsx"));
const VerifyCode = lazy(() => import("../pages/Customer/Auth/VerifyCode.jsx"));
const ResetPassword = lazy(() => import("../pages/Customer/Auth/ResetPassword.jsx"));
const AdminLogin = lazy(() => import("../pages/Auth/AdminLogin.jsx"));
const EmployeeLogin = lazy(() => import("../pages/Auth/EmployeeLogin.jsx"));
const VerifyEmail = lazy(() => import("../pages/Customer/Auth/VerifyEmail"));

export default function AppRoutes() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Navigate to="/customer/home" replace />} />

        {/* =============================== */}
        {/* Public customer info pages      */}
        {/* =============================== */}
        <Route element={<CustomerLayout />}>
          <Route path="/about" element={<AboutUs />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
        </Route>

        {/* =============================== */}
        {/* Portal sign-in routes (public)  */}
        {/* =============================== */}
        <Route path="/customer/signin" element={<SignIn />} />
        <Route path="/employee/signin" element={<EmployeeLogin />} />
        <Route path="/admin/signin" element={<AdminLogin />} />

        {/* ✅ Employee protected */}
        <Route
          path="/employee"
          element={
            <ProtectedRoute portal="employee" allowedRoles={["EMPLOYEE"]}>
              <EmployeeLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="inventory" element={<InventoryAll />} />
          <Route
            path="inventory/delete/:id"
            element={<Navigate to="/employee/inventory" replace />}
          />
          <Route path="sales" element={<SalesBilling />} />
          <Route path="reservations" element={<Reservations />} />
          <Route path="reports" element={<Navigate to="/employee/reports/sales" replace />} />
          <Route path="reports/sales" element={<ReportsSales />} />
          <Route path="reports/inventory" element={<ReportsInventory />} />
          <Route path="reports/performance" element={<ReportsPerformance />} />
          <Route path="customers" element={<Customers />} />
          <Route path="low-stock" element={<LowStock />} />
          <Route path="alerts" element={<AlertsAll />} />

          <Route path="settings" element={<SettingsLayout />}>
            <Route index element={<Navigate to="security" replace />} />
            <Route path="security" element={<Security />} />
            <Route path="profile" element={<Navigate to="/employee/settings/security" replace />} />
            <Route path="preferences" element={<Navigate to="/employee/settings/security" replace />} />
            <Route path="system" element={<Navigate to="/employee/settings/security" replace />} />
            <Route path="notifications" element={<Navigate to="/employee/settings/security" replace />} />
            <Route path="backup" element={<Navigate to="/employee/settings/security" replace />} />
            <Route path="company" element={<Navigate to="/employee/settings/security" replace />} />
            <Route path="*" element={<Navigate to="/employee/settings/security" replace />} />
          </Route>

          <Route index element={<Navigate to="/employee/dashboard" replace />} />
        </Route>

        {/* ✅ Admin protected */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute portal="admin" allowedRoles={["ADMIN"]}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="inventory" element={<AdminInventory />} />
          <Route path="inventory/delete/:id" element={<DeleteProduct />} />
          <Route path="pending" element={<AdminPending />} />
          <Route path="sales-history" element={<AdminSalesHistory />} />
          <Route path="reservations" element={<AdminReservations />} />
          <Route path="reports" element={<Navigate to="/admin/reports/sales" replace />} />
          <Route path="reports/sales" element={<AdminReportsSales />} />
          <Route path="reports/inventory" element={<ReportsInventory />} />
          <Route path="reports/performance" element={<ReportsPerformance />} />
          <Route path="low-stock" element={<AdminLowStock />} />
          <Route path="alerts" element={<AlertsAll />} />
          <Route path="user-management" element={<AdminUserManagement />} />
          <Route path="categories" element={<AdminCategories />} />

          <Route path="contacts" element={<AdminContacts />} />
          <Route path="contacts/:id" element={<AdminContactReply />} />

          <Route path="settings" element={<SettingsLayout />}>
            <Route index element={<UserProfile />} />
            <Route path="profile" element={<UserProfile />} />
            <Route path="security" element={<Security />} />
            <Route path="backup" element={<BackupData />} />
            <Route path="company" element={<CompanyInfo />} />
            <Route path="system" element={<Navigate to="/admin/settings/security" replace />} />
            <Route path="notifications" element={<Navigate to="/admin/settings/security" replace />} />
            <Route path="*" element={<Navigate to="/admin/settings/profile" replace />} />
          </Route>

          <Route index element={<Navigate to="/admin/dashboard" replace />} />
        </Route>

        {/* ✅ Customer protected */}
        <Route
          path="/customer"
          element={
            <ProtectedRoute portal="customer" allowedRoles={["CUSTOMER"]}>
              <CustomerLayout />
            </ProtectedRoute>
          }
        >
          <Route path="home" element={<CustomerHome />} />
          <Route path="catalog" element={<PartsCatalog />} />
          <Route path="reservations" element={<MyReservations />} />
          <Route path="profile" element={<ProfileSettings />} />
          <Route path="contact" element={<ContactUs />} />
          <Route path="about" element={<Navigate to="/about" replace />} />
          <Route path="privacy" element={<Navigate to="/privacy" replace />} />
          <Route path="terms" element={<Navigate to="/terms" replace />} />
          <Route index element={<Navigate to="/customer/home" replace />} />
        </Route>

        {/* Auth public */}
        <Route path="/auth" element={<AuthLayout />}>
          <Route path="signin" element={<Navigate to="/customer/signin" replace />} />
          <Route path="signup" element={<SignUp />} />
          <Route path="forgot" element={<ForgotPassword />} />
          <Route path="verify" element={<VerifyCode />} />
          <Route path="reset" element={<ResetPassword />} />
          <Route path="admin-login" element={<Navigate to="/admin/signin" replace />} />
          <Route path="employee-login" element={<Navigate to="/employee/signin" replace />} />
          <Route path="verify-email" element={<VerifyEmail />} />
          <Route index element={<Navigate to="/customer/signin" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/customer/signin" replace />} />
      </Routes>
    </Suspense>
  );
}