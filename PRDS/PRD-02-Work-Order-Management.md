# PRD-02: WORK ORDER MANAGEMENT
## Canva Concepts — Factory ERP
## Version 1.0 | July 2026

---

## 1. MODULE OVERVIEW

### Purpose
The Work Order (WO) is the central entity of the entire ERP.
Every job the factory produces starts as a Work Order.
This module manages the complete lifecycle of a Work Order —
from creation by a Site Manager or Factory Supervisor, through
production, to delivery confirmation and financial closure.

### Users of This Module
- Factory Manager: Full access — approve, cancel, update any WO
- Factory Supervisor: Create, review, update production status
- Site Manager: Create WOs, view own WOs, raise Change Requests
- Super Admin: View all Chhabee WOs (read only)
- Carpenter: No access to this module (uses Glide app)

### Key Outcomes
- Every job has a unique, traceable Work Order number
- Complete status history from creation to closure
- Role-based visibility — Site Managers see only their WOs
- Real-time status visible to all authorised users
- Drawing version control per Work Order
- Committed delivery date tracked vs actual delivery

---

## 2. EXISTING BUILD STATUS

The following is already built. Review and enhance only.

### Tables (already exist)
```
public.work_orders
public.wo_status_history
public.wo_drawings
```

### Screens (already built)
```
/work-orders        WO list with filters
/work-orders/new    Create WO form
/work-orders/:id    WO detail (Details, Status History,
                    Drawings tabs)
```

### What Still Needs to Be Built
```
[ ] Committed delivery date edit on detail screen
[ ] Days remaining / overdue display on list
[ ] Capacity check indicator when setting committed date
[ ] WO cancellation flow with reason
[ ] B2B-specific fields enforcement
[ ] Priority enforcement (only FM can set High/Critical)
[ ] WO search and advanced filters
[ ] Print/export WO as PDF
[ ] WO duplication (copy existing WO)
[ ] Bulk status update
```

---

## 3. DATABASE SCHEMA

### 3.1 work_orders (ALREADY EXISTS)

```sql
CREATE TABLE public.work_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wo_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  client_type TEXT NOT NULL CHECK (client_type IN (
    'chhabee', 'b2b', 'd2c'
  )),
  client_name TEXT NOT NULL,
  project_name TEXT,
  chhabee_project_ref TEXT,
  stream TEXT NOT NULL CHECK (stream IN (
    'chhabee', 'external_b2b', 'd2c'
  )),
  furniture_type TEXT NOT NULL,
  dimensions_l NUMERIC,
  dimensions_h NUMERIC,
  dimensions_d NUMERIC,
  finish_type TEXT,
  finish_detail TEXT,
  delivery_terms TEXT NOT NULL CHECK (delivery_terms IN (
    'included', 'actuals', 'client_arranges'
  )),
  delivery_address TEXT,
  committed_delivery_date DATE,
  requested_delivery_date DATE,
  priority TEXT DEFAULT 'normal' CHECK (priority IN (
    'normal', 'high', 'critical'
  )),
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending_review', 'supervisor_approved',
    'approved_pending_bom', 'bom_approved_pending_material',
    'partial_material', 'material_ready', 'in_production',
    'production_complete', 'qc_pending', 'qc_passed',
    'ready_for_dispatch', 'in_transit',
    'delivered_pending_confirmation', 'delivered_confirmed',
    'invoice_raised', 'financially_closed', 'cancelled'
  )),
  created_by UUID REFERENCES public.profiles(id),
  assigned_supervisor UUID REFERENCES public.profiles(id),
  approved_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  cancellation_reason TEXT,
  client_po_reference TEXT,
  client_po_value NUMERIC,
  production_quantity INTEGER DEFAULT 1,
  version INTEGER NOT NULL DEFAULT 1,
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.2 wo_status_history (ALREADY EXISTS)

```sql
CREATE TABLE public.wo_status_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wo_id UUID REFERENCES public.work_orders(id) NOT NULL,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES public.profiles(id) NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.3 wo_drawings (ALREADY EXISTS)

```sql
CREATE TABLE public.wo_drawings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wo_id UUID REFERENCES public.work_orders(id) NOT NULL,
  version TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES public.profiles(id) NOT NULL,
  is_current BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.4 RLS Policies (ALREADY EXISTS)

```
Factory Manager: full access to all WOs (FOR ALL)
Factory Supervisor: SELECT all + UPDATE
Site Manager: SELECT own WOs only + INSERT
Super Admin: SELECT Chhabee WOs only
```

---

## 4. WORK ORDER STATUS FLOW

Status transitions must follow this exact sequence.
The system must enforce valid transitions only.

```
draft
  → pending_review

pending_review
  → supervisor_approved  (Supervisor marks reviewed)
  → draft                (Supervisor sends back for revision)

supervisor_approved
  → approved_pending_bom (Factory Manager approves)
  → pending_review       (FM sends back)

approved_pending_bom
  → bom_approved_pending_material (BOM created — PRD-05)

bom_approved_pending_material
  → partial_material     (Some materials received)
  → material_ready       (All materials received)

partial_material
  → in_production        (Production started on available)
  → material_ready       (Remaining materials received)

material_ready
  → in_production

in_production
  → production_complete  (Supervisor marks done)

production_complete
  → qc_pending           (QC checklist started)

qc_pending
  → qc_passed            (QC passed)
  → in_production        (QC failed — rework required)

qc_passed
  → ready_for_dispatch   (FM approves dispatch)

ready_for_dispatch
  → in_transit           (Goods dispatched)

in_transit
  → delivered_pending_confirmation

delivered_pending_confirmation
  → delivered_confirmed  (Site Manager confirms receipt)

delivered_confirmed
  → invoice_raised       (Invoice created — PRD-12)

invoice_raised
  → financially_closed   (Invoice fully paid)

cancelled
  Can be set from any status BEFORE production_complete
  Only Factory Manager can cancel
  Reason mandatory
  Cannot be undone
```

### Valid Transition Matrix

| From Status | Who Can Transition | To Status |
|------------|-------------------|-----------|
| draft | Site Manager, Supervisor, FM | pending_review |
| pending_review | Supervisor, FM | supervisor_approved |
| pending_review | Supervisor, FM | draft (send back) |
| supervisor_approved | FM | approved_pending_bom |
| supervisor_approved | FM | pending_review (send back) |
| approved_pending_bom | System (BOM module) | bom_approved_pending_material |
| bom_approved_pending_material | System (Inventory) | partial_material |
| bom_approved_pending_material | System (Inventory) | material_ready |
| partial_material | System (Inventory) | material_ready |
| partial_material | Supervisor, FM | in_production |
| material_ready | Supervisor, FM | in_production |
| in_production | Supervisor, FM | production_complete |
| production_complete | Supervisor, FM | qc_pending |
| qc_pending | Supervisor, FM | qc_passed |
| qc_pending | Supervisor, FM | in_production (rework) |
| qc_passed | FM | ready_for_dispatch |
| ready_for_dispatch | Supervisor, FM | in_transit |
| in_transit | Supervisor, FM | delivered_pending_confirmation |
| delivered_pending_confirmation | Site Manager, FM | delivered_confirmed |
| delivered_confirmed | System (Billing) | invoice_raised |
| invoice_raised | System (Billing) | financially_closed |
| Any (before production_complete) | FM only | cancelled |

---

## 5. SCREENS & FLOWS

### 5.1 Work Order List (/work-orders)

**Access:**
```
Factory Manager   → all WOs
Factory Supervisor → all WOs
Site Manager      → own WOs only (created_by = uid)
Super Admin       → Chhabee WOs only (client_type = chhabee)
```

**Layout:**
```
Page title: "Work Orders"
Top right: "+ New Work Order" button
  (visible to FM, Supervisor, Site Manager)
  (hidden for Super Admin)

FILTERS ROW:
  Status dropdown (All Statuses + each status)
  Client Type (All / Chhabee / External B2B / D2C)
  Priority (All / Normal / High / Critical)
  Date range picker (by created_at)
  Search box (searches wo_number, title, client_name,
              furniture_type)

SORT OPTIONS:
  Newest first (default)
  Delivery date (soonest first)
  Priority (Critical first)
  Status
```

**WO Card/Row (each Work Order):**
```
WO Number (bold, gold colour)
Title
Client Name
Furniture Type | Qty
Priority badge (if not normal)
Status badge (colour coded)
Requested Date vs Committed Date:
  If committed_delivery_date is set:
    Show committed date
    Days indicator:
      > 3 days: green "X days left"
      1-3 days: amber "X days left"
      Today: amber "Due today"
      Overdue: red "X days overdue"
  If not set: grey "No date set"
Created by (name from profiles)
Created at date
```

**On card click:** Navigate to /work-orders/:id

**Empty state:**
"No work orders found.
[+ Create Work Order] button"

**Pagination:** Load 20 per page with "Load more" button

---

### 5.2 Create Work Order (/work-orders/new)

**Access:** FM, Supervisor, Site Manager

**SECTION 1: Client Details**

```
Client Type * (radio buttons — shown as cards)
  [ Chhabee ] [ External B2B ] [ D2C ]

Client Name *
  TEXT input
  If Chhabee selected: pre-fill "Chhabee" (editable)

Project / Site Name
  TEXT input
  Label: "Project or Site Name (optional)"

Chhabee Project Reference
  TEXT input
  SHOW ONLY when Client Type = Chhabee
  Label: "Chhabee Project Reference"
  Helper: "Enter the project code from Chhabee's system"

Client PO Number
  TEXT input
  SHOW ONLY when Client Type = b2b
  REQUIRED when Client Type = b2b
  Label: "Client Purchase Order Number"

Client PO Value (₹)
  NUMERIC input
  SHOW ONLY when Client Type = b2b
  Label: "Client PO Value (₹)"
```

**SECTION 2: Furniture Details**

```
Work Order Title *
  TEXT input
  Placeholder: "e.g. Reception Counter Front"

Furniture Type *
  TEXT input with suggestions dropdown:
    Counter / Workstation / Cabinet / Storage Unit /
    Hospital Fitout / Display Unit / Other
  User can type custom value

Quantity
  NUMBER input, min 1, default 1
  Label: "Number of units"
```

**SECTION 3: Dimensions (Optional)**

```
Helper text: "Leave blank if dimensions are
specified in the drawing."

Three inputs in one row:
  Length (mm) | Height (mm) | Depth (mm)
  All NUMERIC, no min/max validation
```

**SECTION 4: Finish**

```
Finish Type
  DROPDOWN:
    Laminate / Veneer / Duco / Polish /
    PU Polish / Fabric / Other

Finish Detail
  TEXT input
  Placeholder: "e.g. Merino Charcoal Grey 1mm ABS"
  Helper: "Shade, brand, or specification"
```

**SECTION 5: Delivery**

```
Delivery Terms *
  RADIO BUTTONS (shown as cards):
    [ Included in Price ]
      "Delivery cost absorbed in WO price"
    [ Billed at Actuals ]
      "We arrange, client pays actual cost"
    [ Client Arranges ]
      "Client pays transporter directly"

Delivery Address
  TEXTAREA
  Placeholder: "Site address for delivery"

Requested Delivery Date
  DATE PICKER
  Label: "Requested by Client"
  Min date: today
```

**SECTION 6: Priority & Notes**

```
Priority
  RADIO BUTTONS:
    (●) Normal  ( ) High  ( ) Critical

  ENFORCEMENT:
    Site Manager: only Normal selectable
      High and Critical show as disabled
      Helper text: "High/Critical priority can
      only be set by Factory Manager"
    Supervisor: can select High, not Critical
    Factory Manager: all options available

Notes
  TEXTAREA (optional)
  Placeholder: "Any special requirements or
  instructions for this work order"
```

**SUBMIT BUTTON: "Create Work Order"**

**On Submit:**
```
Step 1: Client-side validation (all required fields)
Step 2: Determine doc_type:
  chhabee → WO_CHH
  b2b     → WO_B2B
  d2c     → WO_D2C
Step 3: Call generate_document_number(doc_type, '2526')
Step 4: Determine stream from client_type:
  chhabee → chhabee
  b2b     → external_b2b
  d2c     → d2c
Step 5: INSERT into work_orders:
  wo_number = from Step 3
  status = 'draft'
  created_by = auth.uid()
  all form fields
Step 6: INSERT into wo_status_history:
  wo_id = new WO id
  old_status = null
  new_status = 'draft'
  changed_by = auth.uid()
Step 7: Success toast: "Work Order [wo_number] created"
Step 8: Redirect to /work-orders/[new_id]
```

**Cancel button:** Navigate back to /work-orders

---

### 5.3 Work Order Detail (/work-orders/:id)

**Access:**
```
FM: full access
Supervisor: view all, update production-related fields
Site Manager: view own WOs only (403 if not own)
Super Admin: view Chhabee WOs only
```

**Header Section:**
```
WO Number (large, bold, gold)
Title (large)
Status badge (large)
Priority badge (if not normal)
Client: [client_name] — [project_name]
Furniture: [furniture_type] x [production_quantity]
Created by [name] on [date]
```

**Action Buttons (top right, role-based):**

```
Factory Manager sees:
  If status = pending_review:
    [Approve] [Send Back]
  If status = supervisor_approved:
    [Final Approve] [Send Back]
  If status = qc_passed:
    [Approve Dispatch]
  If status before production_complete:
    [Cancel WO] (red button)
  Always:
    [Edit Details] (until in_production)

Factory Supervisor sees:
  If status = draft or pending_review:
    [Mark Reviewed]
  If status = material_ready or partial_material:
    [Start Production]
  If status = in_production:
    [Mark Production Complete]
  If status = production_complete:
    [Start QC]
  If status = in_transit:
    [Mark Delivered]

Site Manager sees:
  If status = delivered_pending_confirmation:
    [Confirm Receipt]
  Always: read only (no edit)

Super Admin sees:
  Read only (no actions)
```

**THREE TABS:**

**TAB 1: Details**

```
SECTION: Client Information
  Client Type | Stream
  Client Name
  Project / Site Name
  Chhabee Project Reference (if Chhabee)
  Client PO Number (if B2B)
  Client PO Value (if B2B)

SECTION: Furniture Specification
  Work Order Title
  Furniture Type
  Quantity
  Dimensions: [L]mm × [H]mm × [D]mm
    (show "Not specified" if all blank)
  Finish Type
  Finish Detail

SECTION: Delivery
  Delivery Terms (show human-readable label)
  Delivery Address
  Requested Delivery Date
  Committed Delivery Date:
    If set: show date + days indicator
    If not set: "Not set"
    Edit button (FM and Supervisor only):
      Shows inline date picker
      On save: UPDATE committed_delivery_date
               version = version + 1
               Insert into wo_status_history
                 with reason "Committed date set"
  Actual Delivery Date (populated on delivery)

SECTION: Priority & Notes
  Priority badge
  Notes (full text)

SECTION: Assignment
  Created by: [name] on [date]
  Assigned Supervisor: [name or "Not assigned"]
    FM can assign supervisor from dropdown
  Approved by: [name or "Pending"]
```

**TAB 2: Status History**

```
Timeline view (newest first):
Each entry shows:
  Status change: [old_status] → [new_status]
    (show display label, not internal code)
  Changed by: [full_name from profiles]
  Date and time (formatted: DD-MMM-YYYY HH:MM)
  Reason (if provided)

Use icons to distinguish:
  ✓ Green: positive progress (approvals, completions)
  → Blue: informational (review, transit)
  ✗ Red: negative (send back, cancelled, QC fail)

Empty state: "No status history yet"
```

**TAB 3: Drawings**

```
HEADER: "Drawings & References"
UPLOAD BUTTON: "Upload Drawing"
  (visible to FM, Supervisor, Site Manager)

UPLOAD FORM (shown inline when button clicked):
  File upload:
    Accept: .pdf, .jpg, .jpeg, .png, .dwg, .dxf
    Max size: 50MB
    Show progress bar during upload
  Version:
    TEXT input
    Auto-suggest: v1.0 (if no drawings) or next version
    User can override
  Notes: TEXT (optional)
  [Upload] [Cancel] buttons

ON UPLOAD:
  1. Upload file to Supabase storage:
     bucket: wo-drawings
     path: [wo_id]/[timestamp]-[filename]
  2. UPDATE wo_drawings SET is_current = false
     WHERE wo_id = [wo_id]
  3. INSERT into wo_drawings:
     wo_id, version, file_name, file_url,
     uploaded_by = auth.uid(), is_current = true
  4. Success toast: "Drawing [version] uploaded"
  5. Refresh drawings list

DRAWINGS LIST:
  Current version (highlighted):
    Version badge (gold)
    "CURRENT" label
    File name
    Uploaded by [name]
    Upload date
    Notes
    [Download] button (opens signed URL in new tab)

  Previous versions (below, collapsed by default):
    "Previous Versions (X)" — click to expand
    Each: Version badge, file name, date, [Download]

  Empty state:
    "No drawings uploaded yet.
     Upload the first drawing for this work order."
```

---

### 5.4 Cancel Work Order Flow

Triggered by: "Cancel WO" button (FM only)
Available: any status before production_complete

```
CONFIRMATION DIALOG:
  Title: "Cancel Work Order [wo_number]?"
  Body: "This action cannot be undone.
         All material reservations will be released.
         Please provide a reason for cancellation."
  
  REASON FIELD (required):
    DROPDOWN + free text:
      Client cancelled order
      Design change — restart required
      Duplicate work order
      Other (specify below)
    Free text: TEXT AREA (required if "Other" selected)

  Buttons: [Keep WO] [Cancel Work Order] (red)

ON CONFIRM:
  1. UPDATE work_orders SET
       status = 'cancelled',
       cancellation_reason = [reason],
       updated_at = NOW(),
       version = version + 1
     WHERE id = [wo_id]
  2. INSERT into wo_status_history:
       old_status = current status
       new_status = 'cancelled'
       changed_by = auth.uid()
       reason = cancellation reason
  3. Release material reservations (if any)
     — handled by Inventory module (PRD-08)
  4. Success toast: "Work Order [wo_number] cancelled"
  5. Redirect to /work-orders
```

---

### 5.5 Edit Work Order Details

Available: FM always. Supervisor until in_production.
Not available after in_production status.

```
EDIT MODAL (opens from [Edit Details] button):
  Same fields as Create form
  Pre-populated with current values

  Fields NOT editable:
    WO Number (never)
    Client Type (never — affects billing)
    Stream (never)
    Status (separate flow)
    Created By (never)

ON SAVE:
  1. UPDATE work_orders SET [changed fields]
     updated_at = NOW(), version = version + 1
  2. If delivery_terms changed after invoice raised:
     Show warning: "Delivery terms changed after
     invoice was raised. Please review the invoice."
  3. Success toast: "Work Order updated"
  4. Insert into audit_log
```

---

### 5.6 WO Duplication

Triggered by: "Duplicate WO" button on detail screen
Available to: FM, Supervisor

```
Creates a new WO with same fields as current WO except:
  wo_number = new number (generated fresh)
  status = draft
  created_by = auth.uid() (person duplicating)
  committed_delivery_date = null
  requested_delivery_date = null
  cancellation_reason = null
  approved_by = null
  version = 1
  created_at = NOW()

Drawings are NOT duplicated (new WO has empty drawings)

After duplication:
  Show toast: "Duplicated as [new_wo_number]"
  Navigate to new WO detail screen
```

---

### 5.7 Print / Export WO as PDF

Triggered by: Print icon on detail screen
Available to: FM, Supervisor, Site Manager

```
Generates PDF with:
  Canva Concepts logo and header
  WO Number, Title, Date
  Client information
  Furniture specification
  Dimensions (if set)
  Finish details
  Delivery terms and address
  Requested and committed dates
  Current status
  Notes
  Drawing list (file names only, not images)
  Does NOT include: internal status history,
    cost information, margin data

Uses: browser print dialog or jsPDF library
```

---

## 6. BUSINESS RULES

```
BR-01: WO number is auto-generated and never editable.
       Format: WO-CHH-26-001 / WO-B2B-26-001 / WO-D2C-26-001
       Sequential per client type per financial year.

BR-02: Client Type cannot be changed after WO creation.
       It affects WO number format and billing method.

BR-03: Only Factory Manager can set priority to
       High or Critical. Site Managers and Supervisors
       can only set Normal.

BR-04: Client PO Reference is mandatory for B2B WOs.
       System blocks creation without it.

BR-05: Committed Delivery Date is set by Supervisor
       or Factory Manager — not by Site Manager.
       Site Manager can only set Requested Date.

BR-06: Cancellation is permanent. Cancelled WOs
       cannot be reopened. A new WO must be created.

BR-07: Cancellation is only allowed before
       production_complete status.

BR-08: Status transitions must follow the defined flow.
       Invalid transitions are blocked by the system.

BR-09: Every status change must be logged in
       wo_status_history with changed_by and timestamp.

BR-10: Version must increment on every UPDATE to
       work_orders (enforced via database trigger).

BR-11: Soft delete only — no hard deletes.
       Cancelled WOs remain in the database.

BR-12: Site Manager can only see WOs they created
       (created_by = their uid).

BR-13: Super Admin can only see Chhabee WOs
       (client_type = 'chhabee').

BR-14: For D2C WOs, 100% advance payment required
       before production starts. System shows warning
       if status moves to in_production without
       advance receipt confirmed in Finance module.

BR-15: Delivery Terms can be amended after WO closure
       only by Factory Manager with mandatory reason.
       Requires Credit Note if invoice already raised.
```

---

## 7. NOTIFICATIONS & ALERTS

```
WO Created:
  → Supervisor notified: "New WO [number] needs review"
  → FM notified: "New WO [number] created by [name]"

WO Approved by FM:
  → Site Manager notified: "WO [number] approved.
    Expected delivery: [committed_date]"

WO Sent Back:
  → Creator notified: "WO [number] sent back for revision"

Committed Date Set:
  → Site Manager notified: "Delivery committed for
    WO [number]: [date]"

WO Cancelled:
  → Creator notified: "WO [number] has been cancelled"
  → Supervisor notified

Delivery Due in 2 Days:
  → FM and Supervisor: "WO [number] due in 2 days"

WO Overdue:
  → FM: "WO [number] is overdue by [X] days"

Delivery Confirmed:
  → FM: "WO [number] delivered and confirmed by [SPOC name]"
```

---

## 8. TESTING CHECKLIST

**WO Creation:**
[ ] WO-CHH-26-001 format for Chhabee
[ ] WO-B2B-26-001 format for B2B
[ ] WO-D2C-26-001 format for D2C
[ ] Sequence increments correctly (001, 002, 003)
[ ] B2B without PO Reference blocked
[ ] Site Manager cannot set Critical priority
[ ] Chhabee Project Ref visible only for Chhabee
[ ] Client PO fields visible only for B2B
[ ] WO saved to Supabase (verify in Table Editor)
[ ] wo_status_history row created on WO creation
[ ] Redirect to detail screen after creation

**WO List:**
[ ] FM sees all WOs
[ ] Site Manager sees only own WOs
[ ] Super Admin sees only Chhabee WOs
[ ] Status filter works
[ ] Client type filter works
[ ] Search works (by title, number, client)
[ ] Days remaining shows correctly (green/amber/red)
[ ] Overdue WOs show in red

**WO Detail:**
[ ] All three tabs visible
[ ] Status update works
[ ] Status history shows correct trail
[ ] Committed date can be set and edited
[ ] Drawing upload works
[ ] Drawing version auto-suggests correctly
[ ] Download drawing works
[ ] Cancel WO flow (reason required)
[ ] Version increments on every update

**Role Enforcement:**
[ ] Site Manager cannot access other users' WOs
[ ] Super Admin cannot create WOs
[ ] Carpenter cannot access /work-orders at all

---

## 9. INTEGRATION POINTS

```
PRD-03: Change Requests reference work_orders.id
PRD-05: BOM is created per work_orders.id
         BOM approval updates WO status
PRD-08: Material reservations reference wo_id
         Material receipt updates WO status
PRD-09: Job Cards reference wo_id
PRD-11: QC Records reference wo_id
         Delivery Challan references wo_id
PRD-12: Invoices reference wo_id
         Invoice creation updates WO status
PRD-14: Attendance/Labour cost allocated per wo_id
PRD-15: MIS reports aggregate per wo_id
PRD-16: Dashboard shows WO counts and at-risk WOs
```

---

*Document version: 1.0*
*Prerequisites: PRD-00, PRD-01*
*Next document: PRD-03 Change Request Management*
