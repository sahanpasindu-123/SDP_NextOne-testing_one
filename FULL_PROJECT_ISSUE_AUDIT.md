# Full Project Issue Audit

## 1. Overview

This repo is a Vite + React frontend (`frontend/`) backed by a Node/Express + Prisma(MySQL) API (`backend/`). The UI is role-based (Customer / Employee / Admin) with protected routing and JWT auth. Core functional areas present in code:

- **Authentication**: customer signup + email verification + login; staff (admin/employee) login; password reset; `/api/auth/*`.
- **Customer portal**: browse products, reserve parts, “My Reservations”, profile settings, contact.
- **Employee portal**: dashboard, inventory (request product), reservations (approve/reject + create sale), sales & billing, customers, low-stock, alerts, settings (change password).
- **Admin portal**: dashboard, inventory CRUD, product requests approval, reservations, sales history, reports, low-stock, categories, user management, contacts inbox/reply, settings (backup/export + profile/security/company).
- **Settings/Backup**: backend supports backup/export endpoints; frontend has backup UI plus some “settings” stored only in localStorage.

Overall health: the project has many working “wires” (routes/components/APIs exist), but there are several **high-impact security/logic gaps** (notably around reservations), plus multiple **frontend/backend contract mismatches** and **UX inconsistencies** that will lead to broken or misleading behavior in real use.

## 2. Verified Existing Issues

### 2.1 Customer-side issues you reported (verification)

#### A) Parts Catalog “Stock Status” dropdown inconsistency
- **Status**: Verified (UI implementation differs from other filters)
- **Likely files**: `frontend/src/pages/Customer/Catalog/PartsCatalog.jsx`, `frontend/src/pages/Customer/Catalog/PartsCatalog.module.css`
- **What’s happening**: Category + Sort are plain `<select>` controls, but Stock Status is wrapped in a `<label>` with a separate inline text label (`<span>Stock Status</span>`) and different layout rules (`.stockStatusFilter`).
- **Expected**: Stock Status filter should look/behave consistent with the other filter dropdowns (same visual structure, spacing, and interaction pattern).
- **Recommended direction**: Standardize all filters to the same component/pattern (either all are label+select or all are select-only with consistent placeholder text).

#### B) Product ID appears in customer pages
- **Status**: Verified (shown in customer UI and customer search copy)
- **Likely files**:
  - `frontend/src/pages/Customer/Reservations/MyReservations.jsx` (shows `Product ID: ...`)
  - `frontend/src/pages/Customer/Home/CustomerHome.jsx` (search placeholder: “Search by Product ID...”)
  - `frontend/src/pages/Customer/Catalog/PartsCatalog.jsx` (search matches `productId`)
- **What’s happening**: Customer screens explicitly reference “Product ID” and sometimes display `ProductID` (database numeric PK), not the public-facing code.
- **Expected**: Customers should see a friendly identifier (e.g., Product Code / Part No), not internal numeric IDs.
- **Recommended direction**: Use `ProductCode` (and rename UI label to “Product Code” / “Part No”). Keep numeric `ProductID` internal-only for API calls.

#### C) Reservation expiry (3-day rule) not clearly shown in “My Reservations”
- **Status**: Partially verified; UI does not show expiry; backend expiry logic appears different than “3 days”
- **Likely files**:
  - Backend expiry field is set in `backend/src/services/reservationService.js` (`ExpiresAt` assigned)
  - Customer list UI: `frontend/src/pages/Customer/Reservations/MyReservations.jsx` (does not display `ExpiresAt`)
- **What’s happening**:
  - Backend sets `ExpiresAt`, but the customer UI only shows reserved date (no expiry date/time).
  - In code, `ExpiresAt` is set to **30 minutes** after reservation creation (not 3 days).
- **Expected**: If the business rule is “expires after 3 days”, the backend and UI should match it, and “My Reservations” should show expiry date/time prominently.
- **Recommended direction**: Align the expiry duration in backend with the real requirement, enforce expiry, and surface expiry (date + time, timezone-aware) in customer UI.

#### D) Signup/Login “Remember me” should work correctly + alignment
- **Status**: Verified functional gap (checkbox not wired); alignment appears implemented but checkbox is non-functional
- **Likely files**:
  - `frontend/src/pages/Customer/Auth/SignIn.jsx` (checkbox exists but not connected to logic)
  - `frontend/src/context/AuthContext.jsx` (always persists token in `localStorage`)
- **What’s happening**: The “Remember me” checkbox doesn’t change persistence behavior; tokens are persisted to `localStorage` regardless.
- **Expected**: When unchecked, session should end on browser close (use `sessionStorage` or in-memory); when checked, persist in `localStorage`.
- **Recommended direction**: Add state for “remember me” and implement a clear storage strategy (localStorage vs sessionStorage) consistently across all roles.

#### E) Logout should ask for confirmation
- **Status**: Verified (logout clears auth immediately)
- **Likely files**:
  - `frontend/src/components/CustomerTopNav/CustomerTopNav.jsx`
  - `frontend/src/components/AdminSidebar/AdminSidebar.jsx`
  - `frontend/src/components/EmployeeSidebar/EmployeeSidebar.jsx`
- **What’s happening**: Logout immediately clears tokens and (for staff) redirects.
- **Expected**: Show a confirmation modal/snackbar (“Are you sure?”) before logging out.
- **Recommended direction**: Add a reusable confirmation modal and apply it to all logout entry points.

### 2.2 Admin-side issues you reported (verification)

#### F) Admin Dashboard “details correctness”
- **Status**: Verified multiple likely inaccuracies/misleading metrics
- **Likely files**:
  - `frontend/src/pages/Admin/Dashboard/AdminDashboard.jsx`
  - `backend/src/controllers/reports.controller.js` (`/api/reports/dashboard`)
- **What’s happening**:
  - “Total Users” is computed from `counts.customers` only (employees/admins not included), but label says “Total Users”.
  - “Critical Alerts” is derived from `lowStockProducts` (stock < 5). It counts out-of-stock items, but falls back to low-stock count even when nothing is “critical”.
- **Expected**: Labels and numbers should match (e.g., “Total Customers” vs “Total Users”; “Low Stock Items” vs “Critical Alerts”).
- **Recommended direction**: Align metric naming and computation; add distinct counts for customers/employees/admins and for low-stock vs out-of-stock.

#### G) Product ID auto-fill when adding a product
- **Status**: Verified missing (no auto-generation)
- **Likely files**: `frontend/src/components/modals/Inventory/AddNewProductModal.jsx`
- **What’s happening**: “Product ID” (`productCode`) is required and must be manually entered; no auto-fill or next-code suggestion exists.
- **Expected**: A generated/suggested Product Code on open (or backend-generated at create time).
- **Recommended direction**: Generate on backend (preferred, authoritative) or fetch “next code” from backend; in UI, allow “Generate” button.

#### H) Product update button not working
- **Status**: Mixed
  - **Admin Inventory edit/update path** appears wired (edit opens modal, submit calls `PUT /products/:id`).
  - Other “update” experiences are incomplete/no-op in employee inventory code (see issue M2 below).
- **Likely files**:
  - Admin inventory: `frontend/src/pages/Admin/Inventory/AdminInventory.jsx`
  - Update modal: `frontend/src/components/modals/Inventory/UpdateProductModal.jsx`
  - Backend update: `backend/src/controllers/productController.js` (`updateProduct`)
- **Most likely causes if admins see “Update does nothing” at runtime**:
  - Backend validation errors being surfaced poorly (toast only shows generic message in some cases).
  - Category mapping by name failing for unexpected category values.
  - User clears required fields → backend can end up setting `Name` to `null` and erroring at DB level.
- **Recommended direction**: Add strict client validation in `UpdateProductModal` + show backend validation messages consistently; ensure category values are reliably mapped by `CategoryID`.

## 3. High Priority Issues

### H1) Customer can confirm/cancel other customers’ reservations (missing ownership checks)
- **Affected Role**: Customer (security), Admin/Employee (data integrity)
- **Problem**: Reservation confirm/cancel endpoints do not verify the reservation belongs to the authenticated customer.
- **Why it matters**: Any logged-in customer could guess an ID and cancel/confirm someone else’s reservation (tampering + stock side effects).
- **Likely files/routes**:
  - `backend/src/routes/reservations.js` (`PUT /api/reservations/:id/confirm`, `PATCH|PUT /api/reservations/:id/cancel`)
  - `backend/src/controllers/reservationController.js` (`confirmReservation`, `cancelReservation`)
- **Expected**: For customer actions, enforce `reservation.CustomerID === req.user.dbId` before permitting changes.
- **Current**: No ownership check is performed.
- **Recommended fix direction**: Add ownership checks (and return 403/404); keep admin ability separate; consider using a single service function for status transitions with RBAC+ownership rules.

### H2) Reservation expiry is not enforced; stock can remain reduced indefinitely
- **Affected Role**: Customer, Employee, Admin
- **Problem**: Reservations are created with an `ExpiresAt`, but no code enforces expiry (no auto-cancel/restock job; approval/sale flows don’t check expiry).
- **Why it matters**: Inventory can “leak” (stock decremented) if users never cancel and expiry isn’t processed.
- **Likely files**:
  - `backend/src/services/reservationService.js` (sets `ExpiresAt`)
  - `backend/src/routes/reservations.js`, `backend/src/routes/employeeReservations.js` (approve/reject flows don’t validate expiry)
- **Expected**: Expired reservations are automatically marked expired/cancelled and stock is restored; approval should be blocked after expiry.
- **Current**: `ExpiresAt` exists but is not applied in business logic.
- **Recommended fix direction**: Implement an expiry processor (cron/queue/periodic endpoint) + enforce checks on confirm/approve/sale creation.

### H3) Reservation expiry duration mismatch (code sets 30 minutes, not “3 days”)
- **Affected Role**: Customer, Employee, Admin
- **Problem**: `ExpiresAt` is set to `now + 30 minutes`.
- **Why it matters**: If the intended policy is 3 days, this is a core behavior defect; if 30 minutes is correct, the UI/requirements must be updated.
- **Likely files**: `backend/src/services/reservationService.js`
- **Expected**: `ExpiresAt = ReservedAt + 3 days` (if that is the true requirement).
- **Current**: `ExpiresAt = ReservedAt + 30 minutes`.
- **Recommended fix direction**: Move expiry window to config/env and document it; align UI labels and tooltips.

### H4) Employee “Customer Management” page exposes Admin-only actions (will 403/fail)
- **Affected Role**: Employee
- **Problem**: Employee UI allows add/edit/delete customers, but backend `/api/customers` write operations are Admin-only.
- **Why it matters**: Employees see controls that fail; this looks like broken functionality and wastes time.
- **Likely files**:
  - `frontend/src/pages/Customers/Customers.jsx` (shows Add/Edit/Delete + calls `customersAPI.createCustomer/updateCustomer/deleteCustomer`)
  - `backend/src/routes/customers.js` (POST/PUT/DELETE authorize `ADMIN` only)
- **Expected**: Employee view should be read-only, or backend should explicitly support employee-scoped actions.
- **Current**: UI permits actions that are not allowed.
- **Recommended fix direction**: Hide/disable those actions for employees, or add proper employee permissions and validations if intended.

### H5) Admin/UserManagement “Create customer” path is incompatible with auth + DB constraints
- **Affected Role**: Admin, Customer
- **Problem**: Admin-created customer record via `/api/customers` is likely unusable for login:
  - DB schema requires `Customer.Phone` (non-null + unique), but backend create route uses `Phone: phone || null`.
  - Auth requires `emailVerified === true` for login, but `/api/customers` creation does not set verification state or verification code/email.
- **Why it matters**: Admin “Add Customer” appears to succeed/fail inconsistently and may create accounts that can never sign in.
- **Likely files**:
  - `backend/prisma/schema.prisma` (`Customer.Phone` is required)
  - `backend/src/routes/customers.js` (customer create)
  - `backend/src/controllers/authController.js` (customer login requires verified email)
  - Frontend callers: `frontend/src/pages/Customers/Customers.jsx`, `frontend/src/pages/Admin/UserManagement/AdminUserManagement.jsx`, `frontend/src/api/customers.js`
- **Expected**: Admin-created customers should either be marked verified (and meet required fields) or go through the same verification flow as signup.
- **Current**: Creation is inconsistent and may be unusable.
- **Recommended fix direction**: Enforce phone required (or make it optional in schema), and define an admin-created account policy (auto-verified vs invite/verification).

### H6) Customer-facing UI uses internal numeric `ProductID` as “Product ID”
- **Affected Role**: Customer
- **Problem**: Customer pages display/search internal PKs (and label them as “Product ID”).
- **Why it matters**: Leaks internal identifiers, confuses customers, and makes UI inconsistent with admin “Product Code” usage.
- **Likely files**:
  - `frontend/src/pages/Customer/Reservations/MyReservations.jsx`
  - `frontend/src/pages/Customer/Home/CustomerHome.jsx`
  - `frontend/src/pages/Customer/Catalog/PartsCatalog.jsx` (`mapApiProductToCard` prioritizes `ProductID` for `id/productId`)
- **Expected**: Show `ProductCode`/PartNo publicly; keep `ProductID` hidden.
- **Current**: Public UI treats internal PK as the user-facing identifier.
- **Recommended fix direction**: Carry both values (`productId` for API, `productCode` for display) and rename labels (“Product Code”).

## 4. Medium Priority Issues

### M1) Admin Inventory status mislabels out-of-stock items as “Low Stock” when `StockLimit` is null
- **Affected Role**: Admin
- **Problem**: Status calculation is `p.Stock <= (p.StockLimit ?? 0) ? "Low Stock" : "In Stock"`.
- **Why it matters**: Stock=0 shows as “Low Stock” (not “Out of Stock”), inconsistent with customer/employee stock labels.
- **Likely files**: `frontend/src/pages/Admin/Inventory/AdminInventory.jsx`
- **Expected**: `Stock === 0` → Out of Stock; else `Stock <= StockLimit` → Low Stock.
- **Current**: Stock=0 becomes Low Stock (when StockLimit null/0).
- **Recommended fix direction**: Normalize status logic across all inventory UIs with a shared helper.

### M2) Employee inventory “Update”/“Add Image” handlers are no-op (console only) and code is dead/incomplete
- **Affected Role**: Employee (and maintainability)
- **Problem**: `handleUpdateSubmit` and `handleImageSubmit` in employee inventory only `console.log` and close modal; actions are also shown as “N/A” in table, leaving unused modals mounted.
- **Why it matters**: Confusing codebase; if UI is later enabled, it won’t work; extra surface area for bugs.
- **Likely files**: `frontend/src/pages/Inventory/InventoryAll.jsx`
- **Expected**: Either fully implement employee edit/image flows (if intended) or remove unused UI/code.
- **Current**: No-op handlers + unused modals.
- **Recommended fix direction**: Decide intended employee capabilities and align UI+API accordingly.

### M3) Product request flow collects a Product Code but backend ignores it; approved products can end up with `ProductCode = null`
- **Affected Role**: Employee, Admin, Customer
- **Problem**:
  - UI forces a Product Code (`AddNewProductModal` requires `COO-001` format) for an employee request.
  - Backend request creation ignores `productCode`.
  - Admin approval creates Product without setting `ProductCode`.
- **Why it matters**: Product codes become inconsistent/missing; search/display logic relying on Product Code degrades.
- **Likely files**:
  - `frontend/src/components/modals/Inventory/AddNewProductModal.jsx`
  - `frontend/src/pages/Inventory/InventoryAll.jsx`
  - `backend/src/controllers/productRequestController.js`
  - `backend/prisma/schema.prisma` (`Product.ProductCode` optional)
- **Expected**: Either the request does not ask for Product Code (admin assigns later), or backend persists and enforces it on approval.
- **Current**: UI collects it but backend discards it; approved products may have null code.
- **Recommended fix direction**: Define “who assigns ProductCode” and enforce it consistently (prefer backend-generated or admin-assigned on approval).

### M4) “Remember me” present but not implemented (always localStorage)
- **Affected Role**: Customer (and all roles if extended)
- **Problem**: Checkbox doesn’t affect auth persistence.
- **Likely files**: `frontend/src/pages/Customer/Auth/SignIn.jsx`, `frontend/src/context/AuthContext.jsx`
- **Expected**: Checkbox changes persistence behavior.
- **Current**: No effect.
- **Recommended fix direction**: Implement session vs persistent token storage; unify across staff/customer.

### M5) Sales & Billing invoice generation likely breaks due to env var mismatch and bypassing axios client
- **Affected Role**: Employee
- **Problem**: Uses `import.meta.env.VITE_API_BASE` while the rest of the app uses `VITE_API_URL`; also uses raw `fetch` with manual token handling.
- **Why it matters**: “Generate Invoice” can fail in environments where only `VITE_API_URL` is configured; token selection may not match portal token rules.
- **Likely files**: `frontend/src/pages/SalesBilling/SalesBilling.jsx`, `frontend/src/api/axiosClient.js`
- **Expected**: Use one API base env var and route all calls through `axiosClient` (interceptors handle auth).
- **Current**: Mixed base vars and mixed HTTP clients.
- **Recommended fix direction**: Replace invoice fetch with `axiosClient.post("/sales/:id/invoice")` and standardize env var names.

### M6) Admin Sales History shows “Payment” but backend sales report doesn’t provide it; date range UI is hard-coded
- **Affected Role**: Admin
- **Problem**: Payment column is likely always “N/A”; UI shows “Last 30 days” but report fetch doesn’t pass from/to filters.
- **Likely files**:
  - `frontend/src/pages/Admin/SalesHistory/AdminSalesHistory.jsx`
  - `backend/src/controllers/reports.controller.js` (sales report shape)
  - `frontend/src/api/reports.js` (report client)
- **Expected**: Payment method shown from data; date range selection actually filters results.
- **Current**: Payment missing; no filtering.
- **Recommended fix direction**: Either fetch from `/api/sales` (which includes `Type`) or extend sales report to include payment method; wire from/to params from UI.

### M7) Employee dashboard chart calculations can become NaN due to currency string handling
- **Affected Role**: Employee
- **Problem**: `recentSalesRows` formats totals as strings like `Rs ...`, then chart uses `Number(s.total)` which becomes `NaN`.
- **Likely files**: `frontend/src/pages/Dashboard/Dashboard.jsx`
- **Expected**: Chart uses numeric totals.
- **Current**: Potential NaN/zero charts.
- **Recommended fix direction**: Keep numeric totals for charting and format only for display.

### M8) Alerts filter: status filtering can omit alerts with null status even though response normalizes them to “Unread”
- **Affected Role**: Admin, Employee
- **Problem**: Query `status=Unread` filters `where.Status = "Unread"`, but DB rows with `Status = null` are not returned, despite being normalized to “Unread” in response.
- **Likely files**: `backend/src/routes/alerts.js`
- **Expected**: “Unread” filter includes historical `null` statuses.
- **Current**: “Unread” filter may miss `null` alerts.
- **Recommended fix direction**: When filtering unread, include `Status IS NULL OR Status='Unread'` in query.

### M9) Employee reservations list fetches all reservations then filters by place in memory
- **Affected Role**: Employee (performance), System (scalability)
- **Problem**: The route queries all reservations and filters afterward.
- **Likely files**: `backend/src/routes/employeeReservations.js`
- **Expected**: Filter at DB level using relation filters (product.PlaceID in assigned placeIds).
- **Current**: Potentially heavy query and wasted work.
- **Recommended fix direction**: Move place filtering into Prisma `where` clause.

## 5. Low Priority Issues

### L1) Reserve actions are clickable even when out of stock (UX)
- **Affected Role**: Customer
- **Problem**: Reserve buttons remain enabled; error is shown only after attempting to confirm.
- **Likely files**: `frontend/src/components/ProductCard/ProductCard.jsx`, `frontend/src/components/ReserveModal/ReserveModal.jsx`
- **Expected**: Disable reserve button for out-of-stock items and show a clear tooltip/label.
- **Current**: User can click and then gets an error toast.
- **Recommended fix direction**: Disable reserve CTA when `available <= 0`, or change CTA to “Notify me” / “Unavailable”.

### L2) Token key strategy is inconsistent across pages (risk of odd auth state)
- **Affected Role**: Multiple
- **Problem**: Some pages clear only `token/authToken/role` but leave role-specific tokens (e.g., `adminToken`) behind.
- **Likely files**: `frontend/src/pages/Auth/AdminLogin.jsx`, `frontend/src/context/AuthContext.jsx`, `frontend/src/api/axiosClient.js`
- **Expected**: One consistent source of truth for auth state + token storage.
- **Current**: Multiple keys + inconsistent clearing.
- **Recommended fix direction**: Centralize storage clearing and portal token selection (use AuthContext helper everywhere).

### L3) Frontend API modules contain noisy console logging and overlapping/unused methods
- **Affected Role**: Dev/QA, Performance (minor)
- **Likely files**: `frontend/src/api/products.js`, `frontend/src/api/categories.js`, `frontend/src/api/customers.js`
- **Expected**: Minimal logging in production; one canonical method per action.
- **Current**: Many console logs and duplicated API methods.
- **Recommended fix direction**: Gate logs behind `import.meta.env.DEV` and remove/merge unused methods.

## 6. Customer-Side Findings

- **Internal identifier exposure**: Customer UI displays “Product ID” that is likely `ProductID` (numeric PK) instead of `ProductCode` (`frontend/src/pages/Customer/Reservations/MyReservations.jsx`, `frontend/src/pages/Customer/Home/CustomerHome.jsx`).
- **Reservation expiry UX gap**: No expiry date/time shown to customer; backend expiry window appears to be 30 minutes and is not enforced (`backend/src/services/reservationService.js`, `frontend/src/pages/Customer/Reservations/MyReservations.jsx`).
- **Auth UX gaps**: “Remember me” is present but non-functional; logout has no confirmation (`frontend/src/pages/Customer/Auth/SignIn.jsx`, `frontend/src/components/CustomerTopNav/CustomerTopNav.jsx`).
- **Catalog filter inconsistency**: Stock status filter uses a different UI pattern than other dropdowns (`frontend/src/pages/Customer/Catalog/PartsCatalog.jsx`).

## 7. Employee-Side Findings

- **Customer Management page permissions mismatch**: Employee can see Add/Edit/Delete customer actions that are Admin-only on backend (`frontend/src/pages/Customers/Customers.jsx`, `backend/src/routes/customers.js`).
- **Reservation processing lacks expiry enforcement**: Employee approve/sale creation doesn’t check `ExpiresAt` (expiry currently not enforced anywhere).
- **Sales & Billing**: Invoice generation uses `VITE_API_BASE` + raw fetch, inconsistent with the rest of the app (`frontend/src/pages/SalesBilling/SalesBilling.jsx`).
- **Dashboard chart risk**: Currency formatting mixed with numeric charting can produce NaN values (`frontend/src/pages/Dashboard/Dashboard.jsx`).

## 8. Admin-Side Findings

- **Dashboard metrics labeling**: “Total Users” is actually customers count only; “Critical Alerts” mixes out-of-stock with low-stock (`frontend/src/pages/Admin/Dashboard/AdminDashboard.jsx`, `backend/src/controllers/reports.controller.js`).
- **Inventory status inconsistency**: Out-of-stock items can appear as “Low Stock” when `StockLimit` is null (`frontend/src/pages/Admin/Inventory/AdminInventory.jsx`).
- **Sales History screen data mismatch**: Payment column doesn’t exist in backend report output; date range appears not applied (`frontend/src/pages/Admin/SalesHistory/AdminSalesHistory.jsx`).
- **User Management customer creation**: Admin-created customers likely fail/are unusable due to phone required + email verification requirement (`backend/src/routes/customers.js`, `backend/prisma/schema.prisma`, `backend/src/controllers/authController.js`).

## 9. Shared / Cross-System Issues

- **Reservations security + integrity**:
  - Missing ownership checks for customer confirm/cancel (`backend/src/controllers/reservationController.js`).
  - Expiry not enforced + stock not restored (`backend/src/services/reservationService.js`).
- **Identifier semantics**:
  - Internal `ProductID` vs public `ProductCode` usage is inconsistent across roles (customer pages vs admin inventory).
- **Auth storage fragmentation**:
  - Multiple token keys (`token`, `authToken`, `adminToken`, `employeeToken`, `customerToken`) are not consistently managed across all entry points.
- **API response shape mismatches**:
  - Several pages assume fields not returned by backend (e.g., sales “payment” on report rows, reservation product category code without joining category).

## 10. Best Fix Order

1. **Fix reservation authorization + expiry enforcement** (H1, H2, H3) to prevent tampering and inventory leakage.
2. **Fix admin/customer creation policy** (H5) so admin-created customers can actually exist and log in (align DB constraints + verification).
3. **Remove customer-facing internal ID exposure** (H6) and standardize display identifiers.
4. **Align employee pages with backend permissions** (H4) and decide employee capabilities explicitly.
5. **Stabilize core admin screens**: inventory status logic (M1), dashboard metrics labels (F), sales history correctness (M6).
6. **Standardize auth/token storage and env vars** (M5, L2) to reduce “works on one page only” behavior.
7. **Polish UX**: logout confirmation, disable reserve on out-of-stock, standardize dropdown UI patterns (A, E, L1).

## 11. Final Summary

The codebase contains most major screens and backend endpoints for a full customer/employee/admin workflow, but several high-impact issues will block safe real-world usage: **reservation ownership is not enforced**, **expiry is not enforced (and expiry duration likely mismatches the intended rule)**, and several key admin/employee screens expose actions that the backend disallows or that don’t produce usable accounts/data. Addressing the reservation and user-management correctness first will yield the biggest stability and trust improvements across all roles.

