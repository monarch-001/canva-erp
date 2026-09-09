# CANVA ERP Master PRD Backlog

This backlog is generated based on the `prd-backlog-mapper` skill rules.
It extracts UI elements, buttons, validations, visual styles, and backend dependencies for all mapped screens.

---

## Module: PRD-01 Authentication & User Management
### Associated Screens
- [ ] 19 — Super Admin Dashboard.png

### 1. User Actions & Buttons
- [ ] NOT STARTED - Login Form (Email, Password fields)
- [ ] NOT STARTED - Login Button & 'Forgot Password' link
- [ ] NOT STARTED - 'Manage Users' Action Button
- [ ] NOT STARTED - Role Assignment Dropdown

### 2. Visual Elements
- [ ] NOT STARTED - Login screen layout and logo placement
- [ ] NOT STARTED - Error toast for incorrect login

### 3. Business Logic & Validations
- [ ] NOT STARTED - Password complexity validation
- [ ] NOT STARTED - Session Timeout rules
- [ ] NOT STARTED - Role-based access control (Super Admin, FM, Site Manager, Supervisor)

### 4. Backend Dependencies
- [ ] NOT STARTED - POST `/api/auth/login`
- [ ] NOT STARTED - GET `/api/users/me`

---

## Module: PRD-02 Work Order Management
### Associated Screens
- [ ] 02 — Create Work Order.png
- [ ] 03 — WO Detail · Details Tab.png
- [ ] 04 — WO Detail · Status History Tab.png
- [ ] 05 — WO Detail · Drawings Tab.png
- [ ] 06 — Cancel Work Order (Modal).png
- [ ] 07 — Edit Work Order Details (Modal).png
- [ ] 08 — WO Duplication Flow.png
- [ ] 09 — Print
- [ ] 15 — WO Production Progress Card.png
- [ ] 27 — WO Detail · Change Requests Tab.png
- [ ] 37 — WO Detail · BOM Tab.png

### 1. User Actions & Buttons
- [ ] NOT STARTED - 'Create Work Order' Button & Form
- [ ] NOT STARTED - Form fields: Client Name, Project Type, Expected Delivery Date
- [ ] NOT STARTED - 'Save as Draft', 'Submit for Approval' Buttons
- [ ] NOT STARTED - 'Cancel Work Order' Modal Trigger and Confirmation
- [ ] NOT STARTED - File upload element in 'Drawings Tab'
- [ ] NOT STARTED - 'Duplicate WO' action flow
- [ ] NOT STARTED - Print WO action

### 2. Visual Elements
- [ ] NOT STARTED - Status badge colors (Draft, Approved, WIP, Completed)
- [ ] NOT STARTED - Progress bar for Production Progress Card
- [ ] NOT STARTED - Tab navigation layout on WO Details page

### 3. Business Logic & Validations
- [ ] NOT STARTED - Validation: Expected date cannot be in the past
- [ ] NOT STARTED - WO Status transition logic (Draft -> Approved -> WIP -> Completed)
- [ ] NOT STARTED - Restrict 'Cancel WO' if production has started

### 4. Backend Dependencies
- [ ] NOT STARTED - POST `/api/work-orders`
- [ ] NOT STARTED - PUT `/api/work-orders/:id/status`
- [ ] NOT STARTED - File storage API for drawings

---

## Module: PRD-03 Change Request Management
### Associated Screens
- [ ] 28 — Raise Change Request (Modal).png
- [ ] 29 — CR Detail (Tier 3 Dual Approval).png
- [ ] 30 — Change Requests (Standalone List).png

### 1. User Actions & Buttons
- [ ] NOT STARTED - 'Raise Change Request' trigger from WO Detail
- [ ] NOT STARTED - Fields: Reason for Change, Cost Impact, Time Impact
- [ ] NOT STARTED - Tier 3 Dual Approval Flow buttons (Approve / Reject)

### 2. Visual Elements
- [ ] NOT STARTED - Modal popup styling for Raise CR
- [ ] NOT STARTED - Highlighting cost impact in red if > threshold

### 3. Business Logic & Validations
- [ ] NOT STARTED - Validation: Must provide reason for rejection
- [ ] NOT STARTED - Dual approval logic routing based on cost impact tier

### 4. Backend Dependencies
- [ ] NOT STARTED - POST `/api/change-requests`
- [ ] NOT STARTED - PUT `/api/change-requests/:id/approve`

---

## Module: PRD-04 Quotation Module
### Associated Screens
- [ ] 31 — Quotation List.png
- [ ] 32 — Create Quotation.png
- [ ] 33 — Quotation Detail (Internal + Client View).png
- [ ] 34 — Send Quotation to Client (Modal).png
- [ ] 35 — Record Client Response (Modal).png
- [ ] 36 — Convert to Work Order (Modal).png

### 1. User Actions & Buttons
- [ ] NOT STARTED - 'Create Quotation' Form and line items grid
- [ ] NOT STARTED - 'Send to Client' Modal with Email preview
- [ ] NOT STARTED - 'Record Response' Actions: Accept, Reject, Revise
- [ ] NOT STARTED - 'Convert to WO' action, transferring line items to WO

### 2. Visual Elements
- [ ] NOT STARTED - Client View vs Internal View layout differences
- [ ] NOT STARTED - Status chips for Quotation (Sent, Accepted, Rejected)

### 3. Business Logic & Validations
- [ ] NOT STARTED - Validation: Cannot convert rejected quotation to WO
- [ ] NOT STARTED - Calculation of total quotation value and taxes

### 4. Backend Dependencies
- [ ] NOT STARTED - POST `/api/quotations`
- [ ] NOT STARTED - POST `/api/quotations/:id/convert-to-wo`

---

## Module: PRD-05 BOM & Material Planning
### Associated Screens
- [ ] 38 — Create-Edit BOM.png
- [ ] 39 — BOM Approval (FM).png
- [ ] 41 — Template BOM Management.png

### 1. User Actions & Buttons
- [ ] NOT STARTED - 'Create/Edit BOM' table interface
- [ ] NOT STARTED - 'Submit for FM Approval' button
- [ ] NOT STARTED - FM Approval / Rejection buttons
- [ ] NOT STARTED - Save BOM as Template action

### 2. Visual Elements
- [ ] NOT STARTED - Expandable rows for sub-assemblies in BOM table
- [ ] NOT STARTED - Warning icon for missing items

### 3. Business Logic & Validations
- [ ] NOT STARTED - Auto-calculation of total material requirement
- [ ] NOT STARTED - Prevent submission if quantities are zero

### 4. Backend Dependencies
- [ ] NOT STARTED - PUT `/api/boms/:id`
- [ ] NOT STARTED - GET `/api/boms/templates`

---

## Module: PRD-06 Purchase Requisition & PO
### Associated Screens
- [ ] 42 — Purchase Requisition List.png
- [ ] 43 — Create Purchase Requisition.png
- [ ] 44 — PR Approval (FM).png
- [ ] 45 — Purchase Order List.png
- [ ] 46 — Create Purchase Order.png
- [ ] 47 — PO Approval (Above 50K Dual).png
- [ ] 48 — Send PO to Vendor (Hindi).png

### 1. User Actions & Buttons
- [ ] NOT STARTED - 'Create PR' from WO/BOM shortage
- [ ] NOT STARTED - 'Create PO' from approved PR
- [ ] NOT STARTED - Dual approval logic for PO > 50K
- [ ] NOT STARTED - Vendor language selection (Hindi output)

### 2. Visual Elements
- [ ] NOT STARTED - Multi-language support formatting (Hindi print layout)
- [ ] NOT STARTED - Dual approval signature section layout

### 3. Business Logic & Validations
- [ ] NOT STARTED - Validation: Cannot create PO without approved PR
- [ ] NOT STARTED - Threshold check for dual approval logic

### 4. Backend Dependencies
- [ ] NOT STARTED - POST `/api/purchase-requisitions`
- [ ] NOT STARTED - POST `/api/purchase-orders`
- [ ] NOT STARTED - GET `/api/vendors/:id/language-pref`

---

## Module: PRD-08 Warehouse & Inventory
### Associated Screens
- [ ] 40 — Automatic Stock Check Result.png

### 1. User Actions & Buttons
- [ ] NOT STARTED - 'Reserve Stock' action

### 2. Visual Elements
- [ ] NOT STARTED - Stock shortage alert display
- [ ] NOT STARTED - Material Check status indicators (Red/Green text)

### 3. Business Logic & Validations
- [ ] NOT STARTED - Logic to automatically compute allocated vs available stock
- [ ] NOT STARTED - Prevent reservation if stock < required

### 4. Backend Dependencies
- [ ] NOT STARTED - GET `/api/inventory/stock-check`

---

## Module: PRD-09 Job Card & Production Tracking
### Associated Screens
- [ ] 10 — Production Dashboard.png
- [ ] 11 — Create Job Card.png
- [ ] 12 — Job Card Detail.png
- [ ] 13 — Job Card Detail (Rework).png
- [ ] 14 — EOD Update Flow (Modal).png

### 1. User Actions & Buttons
- [ ] NOT STARTED - Production Board Kanban View interactions (Drag and Drop)
- [ ] NOT STARTED - 'Create Job Card' form mapping to Machine/Operator
- [ ] NOT STARTED - 'Log EOD Update' modal (Qty produced, scrap)
- [ ] NOT STARTED - Flag Rework logic button

### 2. Visual Elements
- [ ] NOT STARTED - Kanban board columns and card styling
- [ ] NOT STARTED - Rework visually distinct (e.g. orange outline)

### 3. Business Logic & Validations
- [ ] NOT STARTED - Validation: Produced qty cannot exceed target qty
- [ ] NOT STARTED - Auto-update WO progress when Job Card completes

### 4. Backend Dependencies
- [ ] NOT STARTED - POST `/api/job-cards`
- [ ] NOT STARTED - POST `/api/job-cards/:id/eod-update`

---

## Module: PRD-10 Overtime Management
### Associated Screens
- [ ] 22 — OT Dashboard.png
- [ ] 23 — Submit OT Request.png
- [ ] 24 — FM Approval (Override Flow).png
- [ ] 25 — OT Completion Confirmation.png

### 1. User Actions & Buttons
- [ ] NOT STARTED - 'Submit OT Request' form (Hours, Reason, WO relation)
- [ ] NOT STARTED - FM Approval override action
- [ ] NOT STARTED - 'Confirm OT Completion' trigger by Supervisor

### 2. Visual Elements
- [ ] NOT STARTED - Overtime dashboard charts/summaries
- [ ] NOT STARTED - Override warning banner

### 3. Business Logic & Validations
- [ ] NOT STARTED - OT hours cannot exceed daily limits
- [ ] NOT STARTED - Must associate OT with a valid Work Order

### 4. Backend Dependencies
- [ ] NOT STARTED - POST `/api/overtime/requests`

---

## Module: PRD-14 Payroll & Attendance
### Associated Screens
- [ ] 16 — Attendance Management.png
- [ ] 26 — Holiday-Weekend Work Flow.png

### 1. User Actions & Buttons
- [ ] NOT STARTED - Daily attendance grid layout Checkboxes
- [ ] NOT STARTED - Mark Present/Absent/Half-day actions
- [ ] NOT STARTED - Submit Weekend Work request

### 2. Visual Elements
- [ ] NOT STARTED - Data grid for bulk attendance marking

### 3. Business Logic & Validations
- [ ] NOT STARTED - Cannot mark attendance for future dates
- [ ] NOT STARTED - Weekend work requires prior approval

### 4. Backend Dependencies
- [ ] NOT STARTED - POST `/api/attendance/bulk-update`

---

## Module: PRD-16 Dashboard & Notifications
### Associated Screens
- [ ] 17 — Supervisor Dashboard.png
- [ ] 18 — Site Manager Dashboard.png
- [ ] 20 — Notification Bell Dropdown.png
- [ ] 21 — FM Dashboard (Alerts).png
- [ ] 21 — Notification Settings.png

### 1. User Actions & Buttons
- [ ] NOT STARTED - Role-specific Dashboard Widgets refresh
- [ ] NOT STARTED - Notification Bell toggle & 'Mark all as read'
- [ ] NOT STARTED - Notification settings toggles (Email, App, WhatsApp)
- [ ] NOT STARTED - Click alert to navigate to source entity

### 2. Visual Elements
- [ ] NOT STARTED - High-priority Alert banners (FM Dashboard) red formatting
- [ ] NOT STARTED - Unread count badge on Notification bell

### 3. Business Logic & Validations
- [ ] NOT STARTED - Display only relevant alerts per role
- [ ] NOT STARTED - WebSocket/Polling logic for real-time notifications

### 4. Backend Dependencies
- [ ] NOT STARTED - GET `/api/notifications`
- [ ] NOT STARTED - PUT `/api/notifications/settings`

---
