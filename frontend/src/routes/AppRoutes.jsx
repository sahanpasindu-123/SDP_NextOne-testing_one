import { Navigate, Route, Routes } from "react-router-dom";
import EmployeeLayout from "../layouts/EmployeeLayout/EmployeeLayout.jsx";
import AdminLayout from "../layouts/AdminLayout/AdminLayout.jsx";
import CustomerLayout from "../layouts/CustomerLayout/CustomerLayout.jsx";
import AuthLayout from "../layouts/AuthLayout/AuthLayout.jsx";
import ProtectedRoute from "../components/ProtectedRoute.jsx";
import DeleteProduct from "../pages/Admin/Inventory/DeleteProduct/DeleteProduct.jsx";

/** Employee pages */
import Dashboard from "../pages/Dashboard/Dashboard.jsx";
import InventoryAll from "../pages/Inventory/InventoryAll.jsx";
import SalesBilling from "../pages/SalesBilling/SalesBilling.jsx";
import Reservations from "../pages/Reservations/Reservations.jsx";
import ReportsSales from "../pages/Reports/ReportsSales.jsx";
import Customers from "../pages/Customers/Customers.jsx";
import LowStock from "../pages/LowStock/LowStock.jsx";
import AlertsAll from "../pages/Alerts/AlertsAll.jsx";
import SettingsSystem from "../pages/Settings/SystemPreferences.jsx";
import SettingsLayout from "../pages/Settings/SettingsLayout.jsx";
import UserProfile from "../pages/Settings/UserProfile.jsx";
import NotificationSettings from "../pages/Settings/NotificationSettings.jsx";
import Security from "../pages/Settings/Security.jsx";
import BackupData from "../pages/Settings/BackupData.jsx";
import CompanyInfo from "../pages/Settings/CompanyInfo.jsx";

/** Admin pages */
import AdminDashboard from "../pages/Admin/Dashboard/AdminDashboard.jsx";
import AdminInventory from "../pages/Admin/Inventory/AdminInventory.jsx";
import AdminPending from "../pages/Admin/Pending/AdminPending.jsx";
import AdminSalesHistory from "../pages/Admin/SalesHistory/AdminSalesHistory.jsx";
import AdminReservations from "../pages/Admin/Reservations/AdminReservations.jsx";
import AdminReportsSales from "../pages/Admin/Reports/AdminReportsSales.jsx";
import ReportsInventory from "../pages/Reports/ReportsInventory.jsx";
import ReportsPerformance from "../pages/Reports/ReportsPerformance.jsx";
import AdminLowStock from "../pages/Admin/LowStock/AdminLowStock.jsx";
import AdminUserManagement from "../pages/Admin/UserManagement/AdminUserManagement.jsx";
import AdminSettingsSystem from "../pages/Admin/Settings/AdminSystemPreferences.jsx";
import AdminCategories from "../pages/Admin/Categories/AdminCategories.jsx";
import AdminContacts from "../pages/Admin/Contacts/AdminContacts.jsx";
import AdminContactReply from "../pages/Admin/Contacts/AdminContactReply.jsx";

/** Customer pages */
import CustomerHome from "../pages/Customer/Home/CustomerHome.jsx";
import PartsCatalog from "../pages/Customer/Catalog/PartsCatalog.jsx";
import MyReservations from "../pages/Customer/Reservations/MyReservations.jsx";
import ProfileSettings from "../pages/Customer/Profile/ProfileSettings.jsx";
import ContactUs from "../pages/Customer/Contact/ContactUs.jsx";

/** Auth pages */
import SignIn from "../pages/Customer/Auth/SignIn.jsx";
import SignUp from "../pages/Customer/Auth/SignUp.jsx";
import ForgotPassword from "../pages/Customer/Auth/ForgotPassword.jsx";
import VerifyCode from "../pages/Customer/Auth/VerifyCode.jsx";
import ResetPassword from "../pages/Customer/Auth/ResetPassword.jsx";
import AdminLogin from "../pages/Auth/AdminLogin.jsx";
import EmployeeLogin from "../pages/Auth/EmployeeLogin.jsx";
import VerifyEmail from "../pages/Customer/Auth/VerifyEmail";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/customer/home" replace />} />

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
        <Route path="inventory/delete/:id" element={<DeleteProduct />} />
        <Route path="sales" element={<SalesBilling />} />
        <Route path="reservations" element={<Reservations />} />
        <Route path="reports/sales" element={<ReportsSales />} />
        <Route path="reports/inventory" element={<ReportsInventory />} />
        <Route path="reports/performance" element={<ReportsPerformance />} />
        <Route path="customers" element={<Customers />} />
        <Route path="low-stock" element={<LowStock />} />
        <Route path="alerts" element={<AlertsAll />} />

        <Route path="settings" element={<SettingsLayout />}>
          <Route index element={<UserProfile />} />
          <Route path="profile" element={<UserProfile />} />
          <Route path="notifications" element={<NotificationSettings />} />
          <Route path="security" element={<Security />} />
          <Route path="backup" element={<BackupData />} />
          <Route path="company" element={<CompanyInfo />} />
          <Route path="system" element={<SettingsSystem />} />
        </Route>

        {/* default */}
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
        <Route path="reports/sales" element={<AdminReportsSales />} />
        <Route path="reports/inventory" element={<ReportsInventory />} />
        <Route path="reports/performance" element={<ReportsPerformance />} />
        <Route path="low-stock" element={<AdminLowStock />} />
        <Route path="user-management" element={<AdminUserManagement />} />
        <Route path="categories" element={<AdminCategories />} />

        {/* ✅ FIX: Contacts routes must be at /admin level */}
        <Route path="contacts" element={<AdminContacts />} />
        <Route path="contacts/:id" element={<AdminContactReply />} />

        {/* ✅ Admin settings only */}
        <Route path="settings" element={<SettingsLayout />}>
          <Route index element={<UserProfile />} />
          <Route path="profile" element={<UserProfile />} />
          <Route path="notifications" element={<NotificationSettings />} />
          <Route path="security" element={<Security />} />
          <Route path="backup" element={<BackupData />} />
          <Route path="company" element={<CompanyInfo />} />
          <Route path="system" element={<AdminSettingsSystem />} />
        </Route>

        {/* default */}
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
  );
}
