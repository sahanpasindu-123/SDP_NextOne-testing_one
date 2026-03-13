# Project Improvement Analysis

## 1. Project Overview

### What this system appears to be
This repository contains a role-based spare-parts management system (JCB parts context appears in UI copy) with:
- **Customer portal**: browse parts catalog, reserve parts, manage profile, contact support.
- **Employee portal**: dashboard, manage reservation queue (approve/reject), create sales (including from reservations), view alerts/reports.
- **Admin portal**: inventory CRUD, product request approvals, categories management, user management, reservations oversight, contacts inbox/reply, backup/export, settings.

### Tech stack and high-level structure (based on repo contents)
- **Frontend**: Vite + React + React Router (`frontend/package.json`, `frontend/src/routes/AppRoutes.jsx`)
  - Major folders: `frontend/src/pages`, `frontend/src/components`, `frontend/src/api`, `frontend/src/context`, `frontend/src/layouts`
- **Backend**: Node.js + Express + Prisma (MySQL) (`backend/package.json`, `backend/src/index.js`, `backend/prisma/schema.prisma`)
  - Major folders: `backend/src/routes`, `backend/src/controllers`, `backend/src/middleware`, `backend/src/services`, `backend/src/utils`

### Major modules found (where they live)
- **Authentication**
  - Frontend: `frontend/src/context/AuthContext.jsx`, `frontend/src/components/ProtectedRoute.jsx`,
    customer auth pages in `frontend/src/pages/Customer/Auth/*`, staff login pages in `frontend/src/pages/Auth/*`
  - Backend: `backend/src/routes/auth.js`, `backend/src/controllers/authController.js`, `backend/src/middleware/auth.js`
- **Product catalog / Inventory**
  - Frontend: customer catalog `frontend/src/pages/Customer/Catalog/PartsCatalog.jsx`,
    employee inventory list `frontend/src/pages/Inventory/InventoryAll.jsx`,
    admin inventory CRUD `frontend/src/pages/Admin/Inventory/AdminInventory.jsx`
  - Backend: `backend/src/routes/products.js`, `backend/src/controllers/productController.js`
- **Reservations**
  - Frontend: customer reservations `frontend/src/pages/Customer/Reservations/MyReservations.jsx`,
    employee reservations queue `frontend/src/pages/Reservations/Reservations.jsx`,
    admin reservations pages under `frontend/src/pages/Admin/Reservations/*`
  - Backend: `backend/src/routes/reservations.js`, `backend/src/controllers/reservationController.js`,
    business rules in `backend/src/services/reservationService.js`
- **Sales & billing**
  - Frontend: `frontend/src/pages/SalesBilling/SalesBilling.jsx`
  - Backend: `backend/src/routes/sales.js` (+ invoice creation route inside)
- **Alerts**
  - Frontend: `frontend/src/pages/Alerts/AlertsAll.jsx`
  - Backend: `backend/src/routes/alerts.js` and alert generation helper `backend/src/utils/lowStockAlert.js`
- **Reports**
  - Frontend: reports pages in `frontend/src/pages/Reports/*` and `frontend/src/pages/Admin/Reports/*`
  - Backend: `backend/src/routes/reports.js`, `backend/src/controllers/reports.controller.js`
- **Contacts**
  - Frontend: `frontend/src/pages/Customer/Contact/ContactUs.jsx`, admin inbox pages under `frontend/src/pages/Admin/Contacts/*`
  - Backend: customer contacts `backend/src/routes/contacts.js` + `backend/src/controllers/contactsController.js`,
    admin contacts inbox/reply `backend/src/routes/adminContacts.js` + `backend/src/controllers/adminContactsController.js`
- **Settings / Backup / Export**
  - Frontend: `frontend/src/pages/Settings/BackupData.jsx`, `frontend/src/pages/Settings/CompanyInfo.jsx`,
    `frontend/src/pages/Settings/NotificationSettings.jsx`, `frontend/src/pages/Settings/SystemPreferences.jsx`
  - Backend: `backend/src/routes/settings.js`, `backend/src/controllers/settingsController.js`

## 2. Completion Estimate

### Overall percentages (estimate based on what exists in code)
- **Overall project completion**: **~78%**
- **Frontend completion**: **~82%**
- **Backend/API completion**: **~84%**
- **Core business-flow completion** (end-to-end flows): **~76%**
- **UI/UX polish completion**: **~62%**

### Why these percentages (code-based rationale)
1) **Most core modules exist and are wired end-to-end**
   - Auth flows exist for all roles (customer signup/login + verify email + forgot/reset, staff login) and are integrated with route protection (see `frontend/src/routes/AppRoutes.jsx`, `backend/src/routes/auth.js`).
   - Product → reservation → employee approval → sale-from-reservation is implemented on both sides (see `frontend/src/pages/Customer/Catalog/PartsCatalog.jsx`, `frontend/src/pages/Reservations/Reservations.jsx`, `backend/src/services/reservationService.js`, `backend/src/routes/sales.js`).
2) **Some modules are implemented but not “productized”**
   - Sales UI still contains **static chart data** (`frontend/src/pages/SalesBilling/SalesBilling.jsx`) and invoice generation is a **JSON download** (not a formatted invoice/print flow).
   - Reports exist but some report payloads are minimal (e.g., inventory report returns `movements: []` in `backend/src/controllers/reports.controller.js`).
3) **Settings are partially local-only**
   - Company info and notification/system preferences are stored in browser `localStorage` (e.g., `frontend/src/pages/Settings/CompanyInfo.jsx`, `frontend/src/pages/Settings/NotificationSettings.jsx`), while the backend has a `Setting` model (`backend/prisma/schema.prisma`) but no API/UI that uses it for these settings.
4) **Maintainability debt is visible**
   - There are **unused/legacy backend files** that don’t match the current Prisma schema (e.g., `backend/src/services/authService.js`, `backend/src/utils/validators.js`) and at least one **unused route** file (`backend/src/routes/adminEmployees.routes.js`) not mounted in `backend/src/index.js`.
   - The frontend has multiple overlapping API wrappers (e.g., `frontend/src/api/products.js` vs `frontend/src/api/inventory.js`), and many pages normalize several response shapes, implying inconsistent response contracts.

### Module-by-module quick status (for the completion estimate)
| Module | Evidence (examples) | Appears |
|---|---|---|
| Authentication | `frontend/src/context/AuthContext.jsx`, `backend/src/routes/auth.js` | Mostly complete |
| RBAC / role portals | `frontend/src/components/ProtectedRoute.jsx`, portal layouts | Mostly complete |
| Product catalog | `PartsCatalog.jsx`, `products.js` route/controller | Mostly complete |
| Product requests (employee → admin) | `productRequests` API + admin pending UI + backend controller | Complete-ish |
| Reservations | Customer + employee + admin endpoints + expiry service | Mostly complete |
| Inventory CRUD (admin) | `AdminInventory.jsx`, `backend/src/controllers/productController.js` | Mostly complete |
| Inventory workflow/audit | `InventoryUpdate` model exists; limited API exposure | Partially implemented |
| Sales & billing | `backend/src/routes/sales.js`, `SalesBilling.jsx` | Implemented, needs polish |
| Alerts | `backend/src/routes/alerts.js`, UI list + mark all read | Implemented |
| Reports | dashboard/sales/inventory/performance endpoints + UI | Implemented, incomplete depth |
| Contacts | customer contact + admin reply + email send | Implemented |
| Backup/export | backend backup/list/download/restore/export + UI | Implemented, needs hardening |
| Settings (non-backup) | several pages store locally; no server sync | Partially implemented |

## 3. Strong Areas of the Project

### Security & access control foundations (strong)
- **Portal-aware route protection** is explicit and avoids cross-portal inference: `frontend/src/components/ProtectedRoute.jsx`.
- **Backend JWT auth verifies user existence in DB** (not just token signature) and normalizes roles: `backend/src/middleware/auth.js`.
- **Rate limiting and Helmet are configured** and auth routes are separately limited: `backend/src/index.js`.
- **Backup download endpoint attempts path traversal protection**: `backend/src/controllers/settingsController.js` (`downloadBackup`).

### Business logic robustness (strong)
- **Reservation stock decrement is transaction-based and concurrency-aware**, and reservation expiry is enforced (with stock restore) and periodically processed:
  - `backend/src/services/reservationService.js`
  - Polling/expiry runner in `backend/src/index.js`
- **Low-stock alert generation is de-duplicated** (best-effort) via helper: `backend/src/utils/lowStockAlert.js`.
- **Audit logging is present and designed to be fail-safe** (doesn’t break main business action): `backend/src/utils/auditLog.js`.

### Frontend component reuse (strong)
- Reusable UI primitives exist (Table/Badge/Button/Modal/Tabs/StatCard): `frontend/src/components/*`.
- Many screens include loading/empty/error handling patterns (e.g., `frontend/src/pages/Inventory/InventoryAll.jsx`, `frontend/src/pages/Customer/Reservations/MyReservations.jsx`).

## 4. Improvement Opportunities

This section summarizes opportunities that *specifically* match patterns found in this repo. Detailed, prioritized items follow in sections 5–8.

### Architecture & module boundaries
- Mixed approach (controllers vs route-inline business logic) on backend, plus duplicate/unmounted routes.
- Multiple frontend API layers/wrappers for the same backend surfaces.

### Code quality & response-contract consistency
- Many frontend pages defensively normalize multiple possible response shapes, suggesting inconsistent API responses across endpoints.
- Debug/console logging is widespread in API wrappers and pages.

### UI/UX completeness & polish
- Some settings pages are local-only and/or placeholders.
- Some dashboards/charts use static sample data.

### Performance
- Several pages poll APIs every 5–10 seconds; this will scale poorly with more users and larger datasets.
- Backend auth middleware performs DB lookup on each request (secure, but can be optimized carefully).

### Security hardening
- Token storage in `localStorage`/`sessionStorage` is used; portal token selection is path-based in the axios client.
- Backup restore endpoint accepts a file name without the same sanitization applied to download.

## 5. Critical Improvements

### Harden backup restore against path traversal / unintended file access
- **Priority**: Critical
- **Affected module**: Settings → Backup/Restore
- **Evidence**: `backend/src/controllers/settingsController.js` (`restoreBackup`) builds `filePath = path.join(BACKUP_DIR, fileName)` without the stricter filename validation used in `downloadBackup`.
- **Why improve**: Even though the route is ADMIN-only, restore operations are highly destructive (delete + recreate many tables) and the current fileName handling is more permissive than the download path.
- **Possible direction**: Reuse the same validation pattern as `downloadBackup` (only allow `.json`, disallow separators/`..`, ensure resolved path stays inside `BACKUP_DIR`), and return a clear error for invalid input.

### Reduce risk from client-side token storage and portal-based token selection
- **Priority**: Critical
- **Affected module**: Authentication / RBAC
- **Evidence**:
  - Tokens are stored in `localStorage`/`sessionStorage` keys in `frontend/src/context/AuthContext.jsx`.
  - Portal token selection is based on `window.location.pathname` in `frontend/src/api/axiosClient.js`.
- **Why improve**: If an XSS occurs, stored tokens are easier to exfiltrate; path-based selection can also create subtle “wrong-token” issues and forces multiple storage keys (already visible in `clearAuthStorage()` and legacy fallbacks).
- **Possible direction**: Consolidate to one token source per session (or move to httpOnly cookies + CSRF strategy). At minimum, remove legacy keys, avoid path-based token inference, and centralize login/logout storage logic (don’t duplicate clearAuth in pages).

### Remove or quarantine unused legacy backend code that doesn’t match the current schema
- **Priority**: Critical
- **Affected module**: Backend maintainability / reliability
- **Evidence** (files appear inconsistent with current Prisma schema and/or imports):
  - `backend/src/services/authService.js` (references `const { prisma } = require('../utils/prisma')` but `utils/prisma.js` exports the client directly; expects fields like `email` on multiple models that don’t exist in `schema.prisma`)
  - `backend/src/utils/validators.js` (contains report-controller-like code and uses fields like `TotalAmount` that don’t match `Sale.TotalPrice`)
  - `backend/src/controllers/emailVerificationController.js` exists but auth routes use `authController.verifyEmail` instead (`backend/src/routes/auth.js`)
  - `backend/src/routes/adminEmployees.routes.js` uses `adminStub` and a `/api/v1/...` path style, but it is not mounted in `backend/src/index.js`
- **Why improve**: These files are a future foot-gun. If someone “reuses” them later, they can reintroduce broken logic quickly. They also confuse onboarding and make audits harder.
- **Possible direction**: Archive to a clearly marked legacy folder (or delete after verification) and ensure only one canonical implementation exists per module.

## 6. High Priority Improvements

### Standardize backend response shapes to reduce defensive UI mapping
- **Priority**: High
- **Affected module**: API contract (all modules)
- **Evidence**:
  - Frontend frequently checks multiple shapes like `{ success, data }` vs arrays vs nested objects (examples: `frontend/src/pages/Dashboard/Dashboard.jsx`, `frontend/src/pages/Inventory/InventoryAll.jsx`, `frontend/src/pages/Admin/UserManagement/AdminUserManagement.jsx`, `frontend/src/pages/Customer/Catalog/PartsCatalog.jsx`).
  - Axios client also normalizes errors (`frontend/src/api/axiosClient.js`) implying the project benefits from consistent response conventions.
- **Why improve**: This is a major contributor to duplicated mapping logic, fragile UI code, and slow feature work.
- **Possible direction**: Define a single API response contract (e.g., `{ success, data, message, errors? }`) and align endpoints progressively; then simplify UI mappers accordingly.

### Reduce or replace aggressive client polling (5–10s) across multiple screens
- **Priority**: High
- **Affected module**: Inventory, reservations, product requests, categories
- **Evidence**:
  - Polling in `frontend/src/pages/Inventory/InventoryAll.jsx` (10s)
  - Polling in `frontend/src/pages/Reservations/Reservations.jsx` (8s)
  - Polling with visibility guards in `frontend/src/pages/Admin/Pending/AdminPending.jsx` (5s)
  - Polling in `frontend/src/pages/Admin/Categories/AdminCategories.jsx` (10s)
  - Polling in `frontend/src/pages/Admin/Inventory/AdminInventory.jsx` (10s)
- **Why improve**: Polling increases backend load, wastes client resources, and can produce confusing UI updates mid-action.
- **Possible direction**: Prefer explicit refresh actions, longer polling intervals with backoff, or server push (WebSockets/SSE) for a small set of “live” views.

### Complete the “inventory updates” workflow or remove the unused surface
- **Priority**: High
- **Affected module**: Inventory management / audit trail
- **Evidence**:
  - Prisma model `InventoryUpdate` exists (`backend/prisma/schema.prisma`).
  - Sales creation logs inventory updates (`backend/src/routes/sales.js` creates `inventoryUpdate`).
  - Backup/restore includes inventoryUpdates (`backend/src/controllers/settingsController.js`).
  - No dedicated API/UI is present to view/approve inventory updates as a first-class module.
- **Why improve**: The schema suggests a workflow (SubmittedBy/ApprovedBy/Status), but the app currently treats it as a side log.
- **Possible direction**: Either (a) create an admin UI/API to review inventory updates, or (b) simplify/remove the model from the user-facing “inventory management” narrative and rely on `AuditLog` + product stock directly.

### Replace static/sample metrics with real data (especially Sales & Billing)
- **Priority**: High
- **Affected module**: Employee portal → Sales & Billing, dashboards
- **Evidence**:
  - Static bar chart sample data is hardcoded in `frontend/src/pages/SalesBilling/SalesBilling.jsx` (`barData` constant).
  - Some stat cards are placeholders (e.g., “Pending Payments”, “New Customers” set to constants).
- **Why improve**: It makes the system look less complete and can mislead users.
- **Possible direction**: Derive chart/stat data from `GET /api/sales` and/or `GET /api/reports/*` (already exists in `backend/src/controllers/reports.controller.js`).

### Align settings pages with backend Setting model (move beyond localStorage-only)
- **Priority**: High
- **Affected module**: Settings
- **Evidence**:
  - Company info saved locally: `frontend/src/pages/Settings/CompanyInfo.jsx`
  - Notification settings saved locally: `frontend/src/pages/Settings/NotificationSettings.jsx`
  - `Setting` model exists: `backend/prisma/schema.prisma`
  - Settings API currently only covers backup/export: `backend/src/routes/settings.js`
- **Why improve**: Admin settings should be consistent across devices/users, not per-browser.
- **Possible direction**: Add server APIs for selected settings keys (company info, notification prefs), store in `Setting`, and have UI read/write through API with role guards.

## 7. Medium Priority Improvements

### Remove placeholder / unreachable settings pages or reintegrate them
- **Priority**: Medium
- **Affected module**: Settings / navigation completeness
- **Evidence**:
  - Placeholder pages return `null`: `frontend/src/pages/Settings/EmployeeProfile.jsx`, `frontend/src/pages/Settings/EmployeePreferences.jsx`
  - Employee/admin routes redirect many settings paths back to security/profile: `frontend/src/routes/AppRoutes.jsx`
- **Why improve**: Dead routes/pages increase confusion and maintenance cost.
- **Possible direction**: Either finish these settings screens and re-enable routing, or delete/retire them and remove navigation references.

### Add consistent validation for non-auth endpoints (backend)
- **Priority**: Medium
- **Affected module**: Backend API quality
- **Evidence**:
  - Auth endpoints use Zod validation (`backend/src/validators/auth.validators.js`, `backend/src/middleware/validate.js`).
  - Most other modules validate ad-hoc in controllers/routes (e.g., `backend/src/controllers/productController.js`, `backend/src/routes/sales.js`, `backend/src/routes/places.js`).
- **Why improve**: Inconsistent validation contributes to inconsistent responses and duplicated frontend mapping.
- **Possible direction**: Introduce Zod schemas per module (products, reservations, sales, contacts) and reuse the existing `validate()` middleware.

### Add pagination limits for potentially large lists (customers, reservations, alerts)
- **Priority**: Medium
- **Affected module**: Reports/Lists performance
- **Evidence**:
  - Sales listing already supports pagination (`backend/src/routes/sales.js`).
  - Several list endpoints return full lists without paging (e.g., `backend/src/routes/customers.js`, `backend/src/routes/alerts.js`, `backend/src/routes/reservations.js` in multiple places).
- **Why improve**: With real data volume, UI tables and backend queries will degrade.
- **Possible direction**: Add `page/limit` to list endpoints and update table screens to support paging (reusing the existing pattern in sales).

### Improve consistency of identifiers and role fields
- **Priority**: Medium
- **Affected module**: Auth and user management
- **Evidence**:
  - Tokens are signed with numeric PK `id` but auth middleware first tries domain IDs (`AdminID`, `employeeId`) causing extra DB lookups (`backend/src/controllers/authController.js`, `backend/src/middleware/auth.js`).
  - Admin/employee/customer models use different naming conventions (`AdminID`, `employeeId`, `CustomerID`) and frontend code frequently normalizes many possible fields.
- **Why improve**: Extra DB queries per request and additional mapping complexity.
- **Possible direction**: Standardize JWT payload fields (`role`, `sub`, `externalId`), and standardize response DTOs returned to frontend.

### Improve invoice output format and workflow
- **Priority**: Medium
- **Affected module**: Sales & billing
- **Evidence**:
  - Invoice generation exists server-side (`POST /api/sales/:id/invoice` in `backend/src/routes/sales.js`).
  - Frontend downloads raw JSON for “latest sale” (`generateInvoiceForLatestSale` in `frontend/src/pages/SalesBilling/SalesBilling.jsx`).
- **Why improve**: Users likely expect printable invoices, selecting a sale to invoice, and avoiding “latest sale” ambiguity.
- **Possible direction**: Support invoice generation per selected sale row, add printable view/PDF generation later, and show invoice status in UI consistently.

## 8. Low Priority Improvements

### Reduce noisy debug logs and gate them behind environment checks
- **Priority**: Low
- **Affected module**: Frontend API + pages, backend logging
- **Evidence**:
  - Many API wrappers log request/response (`frontend/src/api/products.js`, `frontend/src/api/customers.js`).
  - Pages log errors and internal state (`frontend/src/pages/Settings/Security.jsx`, `frontend/src/pages/Reports/ReportsPerformance.jsx`).
  - Backend logs debug email content (`backend/src/utils/mailer.js`) and various console logs.
- **Why improve**: Improves performance, reduces noise, avoids leaking operational data in production.
- **Possible direction**: Use a small logger utility and enable debug logs only in `DEV`.

### Clean up minor API wrapper duplication
- **Priority**: Low
- **Affected module**: Frontend maintainability
- **Evidence**:
  - Overlapping surfaces: `frontend/src/api/products.js` vs `frontend/src/api/inventory.js`
  - Legacy wrappers: `frontend/src/api/backupData.api.js`
- **Why improve**: Less confusion about “which client to use” and fewer inconsistent patterns.
- **Possible direction**: Keep one canonical wrapper per backend surface, and keep legacy exports as thin re-exports only where needed.

### Remove unused props/usages that imply features that don’t exist
- **Priority**: Low
- **Affected module**: UI clarity
- **Evidence**:
  - `Table` component doesn’t accept `loading`, but a screen passes it (`frontend/src/pages/Alerts/AlertsAll.jsx`).
  - `frontend/src/services/backupService.js` is empty.
- **Why improve**: Avoids confusion and false expectations for future maintainers.
- **Possible direction**: Remove the unused props/usages or implement a consistent pattern across components.

## 9. Customer Portal Improvement Notes

### What looks complete
- Signup/login + remember-me UI exists (`frontend/src/pages/Customer/Auth/SignIn.jsx`, `SignUp.jsx`).
- Email verification + forgot/reset flows exist (`frontend/src/pages/Customer/Auth/VerifyEmail.jsx`, `ForgotPassword.jsx`, etc.) and backend supports them (`backend/src/controllers/authController.js`).
- Catalog has filters and details/reserve modals (`frontend/src/pages/Customer/Catalog/PartsCatalog.jsx`, `frontend/src/components/ProductDetailModal/*`, `frontend/src/components/ReserveModal/*`).
- Reservations list supports cancel with confirmation modal (`frontend/src/pages/Customer/Reservations/MyReservations.jsx`) and backend supports cancel/expiry (`backend/src/routes/reservations.js`, `backend/src/services/reservationService.js`).
- Contact form posts customer-scoped messages (`frontend/src/pages/Customer/Contact/ContactUs.jsx`, `backend/src/routes/contacts.js`).

### Improvements that apply (customer-facing)
- **Reservation error UX**: `handleReserveConfirm` in `PartsCatalog.jsx` does not appear to show user-friendly errors/toasts for failed reservations; improving this would reduce confusion when stock is insufficient or token expired.
- **Product imagery strategy**: Catalog currently falls back to bundled images (`frontend/src/pages/Customer/Catalog/PartsCatalog.jsx`). Consider a clearer “no image” state and prioritize backend image URLs consistently.
- **Profile completeness**: Ensure customer profile settings page fully uses `/api/customer/me` and `/api/customer/change-password` (backend exists in `backend/src/routes/customer.js` and `frontend/src/api/customers.js` exposes these).

## 10. Employee Portal Improvement Notes

### What looks complete
- Reservation queue is place-scoped and supports approve/reject + sale creation from confirmed reservations (`frontend/src/pages/Reservations/Reservations.jsx`, `backend/src/routes/employeeReservations.js`, `backend/src/routes/sales.js`).
- Employee can change password (`frontend/src/pages/Settings/Security.jsx`, `backend/src/routes/employees.js`).
- Alerts and reports screens exist and are gated to staff roles (`frontend/src/pages/Alerts/AlertsAll.jsx`, `frontend/src/pages/Reports/*`).

### Improvements that apply (employee-facing)
- **Place assignment visibility**: Backend provides “my places” endpoint (`backend/src/routes/employeeMe.js`), but the UI doesn’t clearly expose assigned places beyond an error message in reservations when none exist.
- **Remember-me consistency**: Customer login has remember-me; employee login does not (see `frontend/src/pages/Auth/EmployeeLogin.jsx`).
- **Polling load**: Reservations poll every 8s; a manual refresh + optimistic updates would feel smoother and reduce load.

## 11. Admin Portal Improvement Notes

### What looks complete
- Inventory CRUD includes create/update/image update and delete flow (`frontend/src/pages/Admin/Inventory/AdminInventory.jsx`, `backend/src/controllers/productController.js`).
- Product requests approvals are implemented with UI confirmation and backend workflow (`frontend/src/pages/Admin/Pending/AdminPending.jsx`, `backend/src/controllers/productRequestController.js`).
- Categories CRUD exists and updates shared category context (`frontend/src/pages/Admin/Categories/AdminCategories.jsx`, `backend/src/routes/categories.js`).
- Contacts inbox and reply-to-customer email flow exists (`frontend/src/pages/Admin/Contacts/*`, `backend/src/controllers/adminContactsController.js`).
- Backup/list/download/restore/export screens exist (`frontend/src/pages/Settings/BackupData.jsx`, `backend/src/controllers/settingsController.js`).

### Improvements that apply (admin-facing)
- **User management completeness**: Admin user management mixes multiple endpoints and data shapes (`frontend/src/pages/Admin/UserManagement/AdminUserManagement.jsx`, `backend/src/controllers/adminUsersController.js`). Listing via `/api/admin/users` appears minimal (ids only), while UI loads employees/customers via different endpoints. Align this for clarity.
- **Settings persistence**: Admin “Company Info” and “Notifications” are local-only and not role-scoped server-side (see settings pages and `Setting` model).
- **Backup safety UX**: Restore is destructive; UI correctly warns, but adding clearer metadata (backup createdAt/version) could reduce operator mistakes (backend includes `meta` in backup JSON).

## 12. Architecture & Code Quality Improvements

### Backend structure consistency
- Several modules use controllers (e.g., products), but others keep substantial logic inside route files (e.g., categories in `backend/src/routes/categories.js`, sales in `backend/src/routes/sales.js`).
- There are unused/legacy files that don’t match the current schema (see Critical improvements).

### Frontend API layer consistency
- There are multiple wrappers that overlap (`productsAPI` vs `inventoryAPI`; legacy wrappers like `backupData.api.js`).
- Axios has a strong normalization layer (`frontend/src/api/axiosClient.js`), but many API wrappers still log and throw raw errors, and pages still do custom error extraction.

### Encoding / “mojibake” risk
- There are many emoji/non-ASCII characters in comments and console logs across frontend and backend (e.g., `frontend/src/api/products.js`, `backend/src/index.js`, `backend/src/utils/prisma.js`, `backend/src/controllers/adminController.js`).
- In some environments, this can display as mojibake and makes diffs/noise worse.

### Testing and tooling gap
- No obvious automated test suite is present (no `*.test.*`/`*.spec.*` files found).
- Adding even a small set of API smoke tests (the repo already has scripts in `backend/scripts/*`) would help prevent regressions during future changes.

## 13. Final Summary

### What’s already strong
- Core portals and RBAC plumbing are in place (frontend ProtectedRoute + backend role authorization).
- Reservations + inventory stock rules are implemented with transactional safety and expiry enforcement.
- Backup/export, contacts, and product request flows exist end-to-end.

### What’s most worth improving next (highest leverage)
1) Harden backup restore filename handling and operational safety.
2) Standardize API response contracts to remove widespread UI “shape-guessing”.
3) Reduce client polling and make “live” views more efficient.
4) Align settings pages with server-side persistence (`Setting` model) instead of local-only storage.
5) Remove/quarantine unused legacy backend code and unmounted routes to reduce future risk.

### Compliance checklist (this analysis task)
- This task did **not** apply patches to any existing backend/frontend/database source files.
- No files were renamed, no configuration was changed, and no packages were installed.
- Output artifact created by this task: `PROJECT_IMPROVEMENT_ANALYSIS.md`.
- Note: the working tree in this checkout already shows other modified/untracked files in `git status`; they were **not** changed as part of this analysis-only task.
