# UI/UX Review Report

Project: `SDP_NextOne-testing_one` (Frontend: `frontend/` – React + Vite, CSS Modules)  
Review scope: UI/UX only, based on code inspection (no runtime screenshots beyond what’s implied by implementation).

---

## 1. Project UI/UX Overview

This project has the foundations of a modern UI system (CSS variables, global “card” styling, reusable components like `Button`, `Table`, `Badge`, layout shells per role). However, the overall experience will likely feel **inconsistent and partially unfinished** because multiple visual “systems” are mixed together (Indigo/Cyan token theme vs. JCB-yellow theme vs. hard-coded whites/greys), there are **several parallel implementations** of the same UI patterns (multiple modal systems, multiple toggles, multiple sidebars), and key workflows rely on browser-native dialogs (`alert`, `confirm`, `prompt`), which reduces perceived polish.

The biggest practical usability risks are **mobile/responsive navigation for admin/employee portals**, **inconsistent feedback states**, and **modal/accessibility behavior**.

---

## 2. Strong Areas

- **Good UI primitives exist**: `frontend/src/components/Button/Button.jsx`, `frontend/src/components/Badge/Badge.jsx`, `frontend/src/components/Table/Table.jsx`, `frontend/src/components/Tabs/Tabs.jsx`.
- **Design token starting point**: `frontend/src/styles/variables.css` defines typography, neutrals, radii, shadows, sidebar colors, and a dark theme override.
- **Global layout helpers**: `frontend/src/styles/globals.css` provides `.container`, `.card`, consistent page titles (`.pageTitle`, `.pageSub`), focus-visible ring behavior, and motion reduction handling.
- **Clear role-based structure**: layouts for portals (`AdminLayout`, `EmployeeLayout`, `CustomerLayout`, `AuthLayout`) and routing are easy to follow in `frontend/src/routes/AppRoutes.jsx`.
- **Some pages show thoughtful UX patterns** (loading/empty/message states implemented as UI instead of just console logs), e.g. `frontend/src/pages/Customer/Reservations/MyReservations.jsx`.

---

## 3. High Priority Issues

### Issue: Admin/Employee mobile navigation breaks (sidebar disappears without an alternative)

- **Problem**
  - `AdminSidebar` and `EmployeeSidebar` hide completely on smaller widths (`@media (max-width: 980px)`), leaving no visible navigation path for admin/employee users.
- **Why it matters**
  - This is a “hard stop” usability issue: on tablets/smaller laptops/mobile, staff cannot reliably move between pages.
- **Likely affected files/pages/components**
  - `frontend/src/components/AdminSidebar/AdminSidebar.module.css`
  - `frontend/src/components/EmployeeSidebar/EmployeeSidebar.module.css`
  - `frontend/src/layouts/AdminLayout/AdminLayout.jsx`
  - `frontend/src/layouts/EmployeeLayout/EmployeeLayout.jsx`
- **Recommended improvement**
  - Add a responsive navigation pattern:
    - A hamburger button in `Topbar` that opens a drawer menu on small screens, or
    - A bottom navigation for core modules on mobile.
  - Ensure keyboard accessibility (focus trap inside drawer, ESC to close, clear visible focus).

### Issue: Visual design system is inconsistent (accent color + component styling conflicts)

- **Problem**
  - Tokens define an indigo/cyan accent (`--accent: #6366f1`) in `frontend/src/styles/variables.css`, but many UI areas use **JCB-yellow/gold** (`#e0ab00`, `#f4b400`) as “primary” (login pages, reserve actions, charts, toggles).
  - Some “primary” buttons use black text on `var(--accent)` (likely low contrast), e.g. `frontend/src/pages/Customer/Info/InfoPage.module.css` (`.primaryBtn`).
- **Why it matters**
  - Users perceive the product as less professional when the same action (primary CTA) looks different across pages/roles.
  - It also increases maintenance cost (every change becomes a hunt across CSS modules).
- **Likely affected files/pages/components**
  - Tokens: `frontend/src/styles/variables.css`, `frontend/src/styles/globals.css`
  - Customer commerce CTAs: `frontend/src/components/ProductCard/ProductCard.module.css`, `frontend/src/components/ReserveModal/ReserveModal.module.css`, `frontend/src/components/ProductDetailModal/ProductDetailModal.css`
  - Auth: `frontend/src/pages/Auth/AdminLogin.module.css`, `frontend/src/pages/Auth/EmployeeLogin.module.css`, `frontend/src/pages/Customer/Auth/Auth.module.css`
  - Settings toggles: `frontend/src/components/ui/ToggleSwitch.module.css`, `frontend/src/pages/Settings/SystemPreferences.module.css`
- **Recommended improvement**
  - Decide on a single brand palette strategy:
    - Option A: Make yellow/gold the actual `--accent`, update tokens once, and remove hard-coded gold usage.
    - Option B: Keep indigo as the product theme but define an explicit `--brand-yellow` for *specific* areas (badges, charts) and keep CTA styling consistent.
  - Standardize: one primary button style, one secondary, one danger, one “icon button”.

### Issue: Dark mode is “enabled” but not consistently implemented

- **Problem**
  - Dark theme is set via `document.documentElement.dataset.theme` (see `frontend/src/main.jsx` and `frontend/src/pages/Settings/SystemPreferences.jsx`), but many CSS modules hard-code light surfaces (`background: #fff; color: #111827;`), so dark mode will look incomplete (mixed light cards on dark background, inconsistent contrast).
- **Why it matters**
  - Partial dark mode can be worse than no dark mode: it creates readability issues and reduces trust.
- **Likely affected files/pages/components**
  - Many components/pages hard-code `#fff`: `frontend/src/components/Topbar/Topbar.module.css`, `frontend/src/components/StatCard/StatCard.module.css`, `frontend/src/components/ProductCard/ProductCard.module.css`, `frontend/src/pages/Reports/*.module.css`, customer pages modules, etc.
- **Recommended improvement**
  - Use tokens (`--panel-bg`, `--text`, `--muted`, `--field-bg`, `--field-border`) everywhere for surfaces and text.
  - Treat the global `.card` pattern as the default surface, and avoid defining separate “card” styles per page unless necessary.

### Issue: Feedback and dialogs are inconsistent (mix of `alert`, `confirm`, `prompt`, toast, inline banners)

- **Problem**
  - Many actions use blocking browser dialogs (`window.alert`, `window.confirm`, `window.prompt`) while other pages use `react-hot-toast` or custom banners.
  - This is especially visible in CRUD-heavy screens like customers and categories.
- **Why it matters**
  - Browser dialogs look unbranded and abrupt, and they disrupt task flow. Mixed patterns confuse users (“Where do success messages appear on this page?”).
- **Likely affected files/pages/components**
  - Heavy usage examples:
    - `frontend/src/pages/Customers/Customers.jsx` (add/edit/delete via prompt/confirm/alert)
    - `frontend/src/pages/Admin/Pending/AdminPending.jsx`
    - `frontend/src/pages/Admin/Categories/AdminCategories.jsx`
    - `frontend/src/pages/Inventory/InventoryAll.jsx`
    - `frontend/src/pages/SalesBilling/SalesBilling.jsx`
    - `frontend/src/pages/Settings/Security.jsx`
  - Toast usage examples:
    - `frontend/src/pages/Reports/ReportsSales.jsx`, `frontend/src/pages/Reports/ReportsInventory.jsx`
    - `frontend/src/pages/Admin/Inventory/AdminInventory.jsx`
- **Recommended improvement**
  - Choose one global feedback system:
    - Inline banners for form validation + page-level errors,
    - Toasts for transient confirmations (“Saved”, “Exported”), and
    - In-app confirm dialogs (modal) for destructive actions.
  - Replace `prompt()` forms with real modals/forms that support validation, cancel, and help text.

### Issue: Modal experience is fragmented and likely not accessible (multiple modal implementations)

- **Problem**
  - There are multiple modal implementations with different markup, styling, and behaviors:
    - Generic modal: `frontend/src/components/Modal/Modal.jsx`
    - Customer reserve modal: `frontend/src/components/ReserveModal/ReserveModal.jsx`
    - Product detail modal: `frontend/src/components/ProductDetailModal/ProductDetailModal.jsx` (non-module CSS, fixed width)
    - User modals: `frontend/src/components/modals/User/*` (custom overlay)
    - Customer reserve part modal (duplicate flow): `frontend/src/components/modals/Customer/ReservePartModal.jsx`
  - Common accessibility needs are missing or inconsistent: ESC close, focus trap, aria roles/labels, scroll locking, close-button consistency.
- **Why it matters**
  - Modals are core to “reserve”, “add/edit user”, “add product”, etc. Poor modal behavior increases drop-off and errors.
- **Likely affected files/pages/components**
  - `frontend/src/components/Modal/Modal.jsx`
  - `frontend/src/components/ReserveModal/ReserveModal.jsx`
  - `frontend/src/components/ProductDetailModal/ProductDetailModal.jsx`
  - `frontend/src/components/modals/**`
- **Recommended improvement**
  - Consolidate to one modal system (single component) and standardize:
    - Header + title, close icon, consistent paddings, max width, and responsive rules.
    - Keyboard support (ESC, focus trap).
    - Backdrop click behavior (should not close if user clicks-and-drags/selects text).

### Issue: Admin Contacts routing/page appears broken or duplicated

- **Problem**
  - `frontend/src/pages/Admin/Contacts/AdminContacts.jsx` appears to contain the **reply/detail** UI (same as `AdminContactReply.jsx`), and a dedicated `AdminContacts.module.css` does not exist (yet the project structure suggests it should).
  - The route expects:
    - `/admin/contacts` → list view (`AdminContacts`)
    - `/admin/contacts/:id` → detail/reply view (`AdminContactReply`)
  - Current code suggests the list view may be missing or replaced, which breaks the “inbox → reply” workflow.
- **Why it matters**
  - This is a functional workflow problem for admin support. It also makes the UI feel incomplete.
- **Likely affected files/pages/components**
  - `frontend/src/routes/AppRoutes.jsx`
  - `frontend/src/pages/Admin/Contacts/AdminContacts.jsx`
  - `frontend/src/pages/Admin/Contacts/AdminContactReply.jsx`
- **Recommended improvement**
  - Ensure `/admin/contacts` is a true list/inbox view (table + filters + status) with clear navigation to the reply screen.
  - Use consistent page styling (same header style, `.pageTitle` / `.pageSub`, same cards).

---

## 4. Medium Priority Issues

### Issue: Tables imply sorting but don’t implement it (misleading affordance)

- **Problem**
  - `frontend/src/components/Table/Table.module.css` sets `thead th { cursor: pointer; }` and hover styles, suggesting sorting. But `Table.jsx` doesn’t implement sort behavior.
- **Why it matters**
  - Users will click headers expecting sorting; nothing happens → frustration and reduced trust.
- **Likely affected files/pages/components**
  - `frontend/src/components/Table/Table.jsx`
  - `frontend/src/components/Table/Table.module.css`
- **Recommended improvement**
  - Either remove “sortable” affordance by default, or add optional sorting props (`sortable`, `onSort`, `sortKey`, `sortDirection`) and show an icon.

### Issue: Placeholder/hard-coded user identity and notification counts reduce credibility

- **Problem**
  - Topbar and sidebars show hard-coded names and counts (`John Smith`, dot “3”, badges “5/7”).
- **Why it matters**
  - Staff/admin portals feel like a demo rather than a real product; users will question whether data is real.
- **Likely affected files/pages/components**
  - `frontend/src/components/Topbar/Topbar.jsx`
  - `frontend/src/components/AdminSidebar/AdminSidebar.jsx`
  - `frontend/src/components/EmployeeSidebar/EmployeeSidebar.jsx`
  - `frontend/src/components/Sidebar/Sidebar.jsx` (appears unused/duplicate)
- **Recommended improvement**
  - Bind these to authenticated user context and real counts (or remove counts until implemented).
  - Provide a safe “empty” fallback: initials from name, “No alerts”.

### Issue: Search/filter controls are inconsistent and sometimes “cycle” instead of being explicit

- **Problem**
  - Multiple pages use buttons that cycle through states (`All → Verified → Unverified`, etc.) instead of a select/dropdown. This is used in:
    - `frontend/src/pages/Customers/Customers.jsx`
    - `frontend/src/pages/Reservations/Reservations.jsx` (status cycle button)
    - `frontend/src/pages/Alerts/AlertsAll.jsx` (priority/date cycle buttons)
  - Cycle controls are harder to understand and slower for switching to a specific value.
- **Why it matters**
  - Filters are frequent actions in operational tools; unclear controls increase time-to-task.
- **Likely affected files/pages/components**
  - Customers: `frontend/src/pages/Customers/Customers.jsx`
  - Reservations: `frontend/src/pages/Reservations/Reservations.jsx`
  - Alerts: `frontend/src/pages/Alerts/AlertsAll.jsx`
- **Recommended improvement**
  - Use explicit selects or segmented controls with visible state.
  - Add “Clear filters” and show applied filters as chips.

### Issue: Some admin pages don’t use the common page width/layout conventions

- **Problem**
  - Many pages use `max-width: var(--content-max)` and consistent toolbars, but others diverge:
    - `frontend/src/pages/Admin/Reservations/AdminReservations.module.css` uses very minimal styling and generic padding.
    - `frontend/src/pages/Admin/Categories/AdminCategories.module.css` doesn’t match the styling patterns used elsewhere.
    - Reports pages use their own light-grey background and separate card styling (`frontend/src/pages/Reports/*.module.css`).
- **Why it matters**
  - Even small inconsistencies (padding, header size, background surface) make the product feel stitched together.
- **Likely affected files/pages/components**
  - `frontend/src/pages/Admin/Reservations/AdminReservations.module.css`
  - `frontend/src/pages/Admin/Categories/AdminCategories.module.css`
  - `frontend/src/pages/Reports/ReportsSales.module.css`
  - `frontend/src/pages/Reports/ReportsInventory.module.css`
- **Recommended improvement**
  - Adopt a single layout recipe for all internal portals: consistent page container, header block, toolbar card, content card(s).

### Issue: Customer “reserve” journey is spread across multiple components and feels inconsistent

- **Problem**
  - There are multiple “reserve” entry points and modal implementations:
    - `ProductCard` reserve button → `ReserveModal`
    - Details modal has its own reserve CTA → closes and opens another modal
    - `components/modals/Customer/ReservePartModal.jsx` exists in parallel
  - Validation feedback uses `alert()` in `ReserveModal.jsx`.
- **Why it matters**
  - Reserving is core to the customer value proposition; inconsistent patterns increase friction and drop-off.
- **Likely affected files/pages/components**
  - `frontend/src/components/ProductCard/ProductCard.jsx`
  - `frontend/src/components/ReserveModal/ReserveModal.jsx`
  - `frontend/src/components/ProductDetailModal/ProductDetailModal.jsx`
  - `frontend/src/components/modals/Customer/ReservePartModal.jsx`
  - Customer pages: `frontend/src/pages/Customer/Home/CustomerHome.jsx`, `frontend/src/pages/Customer/Catalog/PartsCatalog.jsx`
- **Recommended improvement**
  - One consistent “Reserve” flow with a single modal pattern:
    - quantity selector, stock info, total, confirmation, and success message.
  - Provide a post-success CTA (“View My Reservations”).

---

## 5. Low Priority Improvements

### Issue: Global link styling removes underlines (readability/accessibility)

- **Problem**
  - `frontend/src/styles/globals.css` sets `a{ text-decoration:none; }`, which can reduce clarity for inline links.
- **Why it matters**
  - Underlines improve scannability and accessibility, especially for users with color vision deficiencies.
- **Likely affected files/pages/components**
  - `frontend/src/styles/globals.css`
- **Recommended improvement**
  - Keep underlines for inline text links, remove only for nav/CTA links that are clearly styled as buttons.

### Issue: Small polish inconsistencies (icons, labels, wording)

- **Problem**
  - Some UI uses placeholder text icons (“Img”, “i”, “!”) and inconsistent terminology (“Product ID” vs “SKU” vs “Part No”).
- **Why it matters**
  - Minor, but adds up to a less refined experience.
- **Likely affected files/pages/components**
  - `frontend/src/pages/Inventory/InventoryAll.jsx` (“Img” action)
  - `frontend/src/pages/LowStock/LowStock.jsx` (“i/!” icons, “Format …” placeholder)
  - Catalog mappings: `frontend/src/pages/Customer/Catalog/PartsCatalog.jsx`
- **Recommended improvement**
  - Replace placeholders with real icons (`react-icons`) + consistent naming rules across portals.

---

## 6. Page-by-Page UI/UX Notes

### Customer Portal

- **Home** (`frontend/src/pages/Customer/Home/CustomerHome.jsx`, `CustomerHome.module.css`)
  - Uses inline-styled search/refresh controls that visually read like “dark mode inputs” inside a white section (inconsistent with the rest of the customer theme).
  - “New Arrivals” and “All Products” sections are clear, but consider stronger hierarchy (section headers + supporting text + count).
  - Loading/empty/error states exist (good), but error presentation is plain text; use a consistent banner style (as done in `MyReservations`).

- **Catalog** (`frontend/src/pages/Customer/Catalog/PartsCatalog.jsx`, `PartsCatalog.module.css`)
  - Solid filter layout and responsive grid approach.
  - Filter inputs duplicate styling logic instead of reusing `Input`/`Select` primitives (increases inconsistency).
  - Consider adding “results count”, clearer empty state (“No results match your filters”), and a quick “clear filters”.

- **Product Card + Detail** (`frontend/src/components/ProductCard/ProductCard.jsx`, `ProductCard.module.css`; `frontend/src/components/ProductDetailModal/ProductDetailModal.jsx`, `ProductDetailModal.css`)
  - `ProductCard` is readable and contains essential info.
  - Detail modal uses fixed width (`900px`) and non-module CSS; likely breaks on smaller screens and deviates from the app’s modal styling.
  - Reserve CTA styling uses gold while global accent is indigo → inconsistent.

- **Reserve Modal** (`frontend/src/components/ReserveModal/ReserveModal.jsx`, `ReserveModal.module.css`)
  - Quantity selector is clear.
  - Uses blocking `alert()` for stock validation and server failures (should be inline or toast).
  - Consider showing “stock remaining after reserve” and a clearer confirmation outcome (“Reserved ✓, check My Reservations”).

- **My Reservations** (`frontend/src/pages/Customer/Reservations/MyReservations.jsx`, `MyReservations.module.css`)
  - Good: banner messaging, cancel state (`Cancelling…`), responsive collapse to one column.
  - Improve: when collapsed to 1-column, consider using a card/list layout instead of a “table-like grid” to reduce vertical noise.

- **Profile Settings** (`frontend/src/pages/Customer/Profile/ProfileSettings.jsx`, `ProfileSettings.module.css`)
  - Good: simple two-card layout, mobile stack.
  - Improve: use consistent form controls (labels, helper text) and replace alerts with inline feedback.

- **Contact / Info pages** (`frontend/src/pages/Customer/Contact/ContactUs.jsx`, `ContactUs.module.css`; `frontend/src/pages/Customer/Info/AboutUs.jsx`, `InfoPage.module.css`)
  - Generally well-structured, but error/success uses inline styles rather than shared component styling.
  - `InfoPage.module.css` primary button uses black text on `var(--accent)`—verify contrast; likely should be white if accent stays indigo.

### Employee Portal

- **Dashboard** (`frontend/src/pages/Dashboard/Dashboard.jsx`, `Dashboard.module.css`)
  - Good: stats + charts + tables structure is familiar for operational tools.
  - Charts use gold fill (`#e2ad00`) even though tokens define indigo; decide and standardize.
  - Polling updates happen in background; consider showing “Last updated” and a manual refresh.

- **Inventory** (`frontend/src/pages/Inventory/InventoryAll.jsx`, `InventoryAll.module.css`)
  - Nice toolbar structure and tabbing by category.
  - “Actions” column shows “N/A” for employees; better UX is to hide the column entirely for employee role.
  - “Add Image” action uses “Img” label (inconsistent with icon usage).

- **Reservations** (`frontend/src/pages/Reservations/Reservations.jsx`, `Reservations.module.css`)
  - Cycle filter button (“ALL → PENDING → …”) is not discoverable; use a dropdown.
  - Approve/reject uses alerts; use toast/inline confirmations.
  - “Sale” as a CTA is terse; consider “Create Sale” and explain what happens.

- **Alerts** (`frontend/src/pages/Alerts/AlertsAll.jsx`, `AlertsAll.module.css`)
  - Good: tab segmentation + derived priority + unread highlight.
  - Filter input uses dark styling (rgba black background) that doesn’t match the rest of the employee portal.
  - Uses `alert("Failed to load alerts")`; should use toast/inline error.

- **Customers** (`frontend/src/pages/Customers/Customers.jsx`, `Customers.module.css`)
  - Heavy reliance on `prompt/confirm/alert` for CRUD actions is a major UX downgrade.
  - There is also a likely UI bug: `setRows((prev) => pre?.filter(...))` uses `pre` (typo), so the list may not update after deletion without reload.

- **Sales & Billing** (`frontend/src/pages/SalesBilling/SalesBilling.jsx`, `SalesBilling.module.css`)
  - Overall layout is promising (products list + cart + checkout).
  - Many feedback states use `alert()`; consider inline/cart-level messaging (e.g., “Out of stock” under the item).
  - Payment method buttons + invoice button use additional colors; standardize CTA priority and color usage.

- **Settings (Employee)** (`frontend/src/pages/Settings/SettingsLayout.jsx`, `SettingsLayout.module.css`; `frontend/src/pages/Settings/Security.jsx`, `Security.module.css`)
  - Settings layout is clean and uses token-based surfaces.
  - Security still uses alerts; consider inline validation errors and success toasts.

### Admin Portal

- **Admin Dashboard** (`frontend/src/pages/Admin/Dashboard/AdminDashboard.jsx`, `AdminDashboard.module.css`)
  - Well-structured, similar to employee dashboard.
  - Uses gold chart fill; decide on chart palette tokens.

- **Admin Inventory** (`frontend/src/pages/Admin/Inventory/AdminInventory.jsx`, `AdminInventory.module.css`)
  - Uses toast for feedback (good).
  - Search behavior is debounced; nice.
  - Still uses custom search bar styling; consider reusing a shared SearchInput component.

- **Pending Requests** (`frontend/src/pages/Admin/Pending/AdminPending.jsx`, `AdminPending.module.css`)
  - Clear and functional.
  - Approve/reject uses alerts; standardize with toast and inline “busy” state per row.

- **Admin Reservations** (`frontend/src/pages/Admin/Reservations/AdminReservations.jsx`, `AdminReservations.module.css`)
  - Styling is notably less consistent than other admin pages (padding-only approach).
  - Actions are text buttons (Approve/Reject) here, but icon buttons elsewhere; choose one consistent pattern.

- **User Management** (`frontend/src/pages/Admin/UserManagement/AdminUserManagement.jsx`, `AdminUserManagement.module.css`)
  - Good: modal-based workflow exists.
  - Modals use gold buttons and custom overlays; should align with global tokens and modal system.

- **Categories** (`frontend/src/pages/Admin/Categories/AdminCategories.jsx`, `AdminCategories.module.css`)
  - Relies on `prompt/confirm/alert` for edit/delete (unpolished).
  - Styling doesn’t follow the standard “pageTitle/pageSub + toolbar + card table” pattern closely (CSS module is minimal).

- **Contacts** (`frontend/src/pages/Admin/Contacts/AdminContacts.jsx`, `frontend/src/pages/Admin/Contacts/AdminContactReply.jsx`)
  - Current code suggests the list view may be missing/duplicated; also heavy inline styles.

---

## 7. Design Consistency Problems

Repeated patterns that will likely make the UI feel inconsistent:

- **Two competing brand themes**: indigo/cyan token theme (`variables.css`) vs gold/yellow CTAs (auth, reserve, charts, toggles).
- **Hard-coded surfaces** (`#fff`) across many modules instead of token-based surfaces → dark mode mismatch.
- **Multiple “card” definitions**: global `.card` exists but many pages define their own card styling.
- **Multiple modal systems** with different close icons, paddings, and widths.
- **Form controls**: some pages use `Input`/`Select` components, many use raw `<input>` with page-specific CSS, and focus colors differ (gold vs `--ring`).
- **Feedback system fragmentation**: toast vs alert vs inline banners.
- **Navigation duplication**: `frontend/src/components/Sidebar/Sidebar.jsx` overlaps with `EmployeeSidebar` patterns; unclear which is canonical.

---

## 8. Accessibility & Usability Notes

Based on structure and component patterns, likely concerns:

- **Modals**: missing focus trap + inconsistent ESC handling across implementations (`Modal.jsx` lacks ESC close; custom overlays likely lack focus management).
- **Keyboard navigation**: icon buttons sometimes have `aria-label`, sometimes not; ensure all icon-only actions have labels and adequate hit area.
- **Color contrast**: verify primary CTA text contrast (e.g., black text on `var(--accent)` in `InfoPage.module.css`).
- **Links**: global no-underline links reduce discoverability in body text.
- **Tables on mobile**: grid-based “table” layouts collapse to single column but can become long and hard to scan; consider mobile card/list patterns for dense datasets.
- **Polling**: auto-refresh can shift content while a user is reading; add “pause updates” or only refresh on focus/manual action.

---

## 9. Best Improvement Order

1. **Fix staff navigation on small screens** (add drawer/hamburger, ensure all portals remain navigable).
2. **Choose and enforce a single design system** (colors, tokens, button styles, field focus ring, card surfaces).
3. **Unify feedback patterns** (replace `alert/confirm/prompt` with in-app banners/toasts and confirm modals).
4. **Consolidate modal implementation** (one accessible modal component; migrate reserve/detail/user/product modals).
5. **Normalize page layout conventions** (consistent max-width, header blocks, toolbars, background surfaces).
6. **Improve table usability** (sorting clarity, empty/loading states, mobile rendering strategy).
7. **Complete dark mode** (tokenize all surfaces/text or remove the toggle until complete).
8. **Polish content and microcopy** (terminology consistency, CTA labels, remove placeholders like “Img”, “Format …”).
9. **Reduce background polling friction** (show last updated, avoid disruptive refreshes).

---

## 10. Final Summary

The project already contains many of the building blocks of a polished business application, but it currently feels like multiple iterations were merged without a single UI system being enforced. The most impactful improvements are: **fix staff responsive navigation**, **standardize the design system (especially color + surfaces)**, **replace browser dialogs with consistent in-app feedback**, and **consolidate modal behavior and accessibility**. After those, focus on table/filter ergonomics and dark mode completeness to lift the overall professional quality.

