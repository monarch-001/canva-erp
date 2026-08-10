# PRD-00: SYSTEM ARCHITECTURE & TECHNICAL FOUNDATION
## Canva Concepts — Factory ERP
## Version 1.0 | July 2026

---

## 1. DOCUMENT PURPOSE

This document is the first document the developer must read before
building any module. It defines the complete technical architecture,
database conventions, security model, existing build status, and
standards that apply to every module in the system.

All subsequent PRDs (PRD-01 through PRD-17) assume this document
has been read and understood.

---

## 2. SYSTEM OVERVIEW

Canva Concepts ERP is an internal factory management system for a
furniture manufacturing business. It manages the complete workflow
from order intake to delivery, including production tracking,
warehouse management, procurement, quality control, billing,
and reporting.

The system is used by 5 user types with different access levels.
It is a web application (desktop + mobile responsive).
A separate read-only mobile app for carpenters is built in Glide.

---

## 3. TECH STACK

```
FRONTEND:        React (via Lovable)
BACKEND:         Supabase (PostgreSQL + Auth + Storage + Edge Functions)
CARPENTER APP:   Glide (connects to Supabase — read only)
WHATSAPP:        Baileys (Node.js, separate server, separate number)
ACCOUNTING:      Monthly CSV export to Tally (CA's tool)
```

### Supabase Project Details
```
Project Name:    Canva Concepts
Project ID:      dmtscbxundtcqigwdkza (Lovable Cloud — managed)
Region:          ap-south-1 (Mumbai)
Supabase URL:    https://dmtscbxundtcqigwdkza.supabase.co (Lovable Cloud managed)
```

### Environment Variables Required
```
VITE_SUPABASE_URL=https://dmtscbxundtcqigwdkza.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=[anon public key]
```
Note: Service role key is NEVER used in frontend code.

---

## 4. USER ROLES

Five roles are defined in the system. Role is stored in
public.profiles.role and drives all access control.

| Role | Description |
|------|-------------|
| factory_manager | Full access to all modules. Creates users. Approves financial transactions. Final authority on all decisions. |
| factory_supervisor | Operations access only. No finance. Manages production, warehouse, job cards, GRN. |
| carpenter | Read-only access to own job cards via Glide app only. No Lovable web access. |
| site_manager | Raises work orders and change requests. Views own WOs only. Chhabee SPOC equivalent. |
| super_admin | Views all work orders. Approves Tier 3 change requests. No finance details. |

### Role Mapping (Internal Reference — Not for PRD)
```
factory_manager  = incoming_partner in database
factory_supervisor = supervisor in database
site_manager     = chhabee_spoc in database
super_admin      = chhabee_partner in database
```

IMPORTANT: The database stores the internal role names
(incoming_partner, supervisor etc.) but the UI displays
the business role names (Factory Manager, Factory Supervisor etc.)
All display labels must use business names. All database queries
use internal names.

### Role Display Names
```
incoming_partner  → "Factory Manager"
supervisor        → "Factory Supervisor"
carpenter         → "Carpenter"
chhabee_spoc      → "Site Manager"
chhabee_partner   → "Super Admin"
```

---

## 5. DATABASE CONVENTIONS

### 5.1 Naming Conventions
```
Tables:          snake_case, plural (work_orders, job_cards)
Columns:         snake_case (created_at, wo_number)
Primary keys:    id UUID DEFAULT gen_random_uuid()
Foreign keys:    [referenced_table_singular]_id
Timestamps:      created_at, updated_at (TIMESTAMPTZ DEFAULT NOW())
Soft delete:     deleted_at TIMESTAMPTZ DEFAULT NULL
Version:         version INTEGER NOT NULL DEFAULT 1
```

### 5.2 Soft Deletes — Mandatory on All Business Tables
No business record is ever hard deleted.
All tables have: deleted_at TIMESTAMPTZ DEFAULT NULL
All queries must filter: WHERE deleted_at IS NULL
"Deleting" = UPDATE SET deleted_at = NOW()

### 5.3 Optimistic Locking
All heavily-edited tables have: version INTEGER NOT NULL DEFAULT 1
Version increments by 1 on every UPDATE via database trigger.
If client sends stale version, update is rejected.

### 5.4 Audit Log
Every INSERT, UPDATE, DELETE on critical tables is logged to
public.audit_log via PostgreSQL triggers.
audit_log is append-only — never modified or deleted.

### 5.5 Document Numbering
All document numbers are generated via the
generate_document_number(p_doc_type, p_fy) Postgres function.
Never generate document numbers in application code.

Call via Supabase RPC:
supabase.rpc('generate_document_number',
  { p_doc_type: 'WO_CHH', p_fy: '2526' })

Financial year format: '2526' = Aug 2026 to Jul 2027

Document number formats:
```
WO_CHH   → WO-CHH-26-001   (Chhabee work order)
WO_B2B   → WO-B2B-26-001   (External B2B work order)
WO_D2C   → WO-D2C-26-001   (D2C work order)
PO       → PO-26-001        (Purchase order)
PR       → PR-26-001        (Purchase requisition)
GRN      → GRN-26-001       (Goods receipt note)
QT       → QT-26-001        (Quotation)
INV_CHH  → INV-CHH-26-001   (Invoice — Chhabee)
INV_B2B  → INV-B2B-26-001   (Invoice — B2B)
INV_D2C  → INV-D2C-26-001   (Invoice — D2C)
PI       → PI-26-001         (Proforma invoice)
CN       → CN-26-001         (Credit note)
DN       → DN-26-001         (Debit note)
OTR      → OTR-26-001        (Overtime request)
EXP      → EXP-26-001        (Expense)
ADV_RCP  → ADV-RCP-26-001    (Advance receipt)
PMT_RCP  → PMT-RCP-26-001    (Payment receipt)
```

### 5.6 GST Compliance
All GST amounts are computed at database level, not in application code.
is_inter_state boolean determines CGST+SGST vs IGST:
- Factory is in Haryana
- Delivery to Haryana → CGST 9% + SGST 9% (is_inter_state = false)
- Delivery to other states → IGST 18% (is_inter_state = true)

### 5.7 Validation Constraints
Applied at database level on compliance fields:
```sql
GSTIN: CHECK (gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$')
PAN:   CHECK (pan ~ '^[A-Z]{5}[0-9]{4}[A-Z]$')
IFSC:  CHECK (ifsc ~ '^[A-Z]{4}0[A-Z0-9]{6}$')
```

---

## 6. SECURITY MODEL

### 6.1 Row Level Security (RLS)
RLS is MANDATORY on every table.
No table should ever be accessible without RLS policies.
Use these helper functions in all RLS policies:

```sql
-- Returns true if logged-in user is factory_manager
is_incoming_partner() RETURNS BOOLEAN

-- Returns the role of the logged-in user
get_current_user_role() RETURNS TEXT
```

### 6.2 Standard RLS Pattern
```sql
-- Factory manager sees everything
CREATE POLICY "FM full access"
ON public.[table] FOR ALL
USING (is_incoming_partner());

-- Role-based read access
CREATE POLICY "[role] can read"
ON public.[table] FOR SELECT
USING (get_current_user_role() = '[role]'
  AND deleted_at IS NULL);
```

### 6.3 Authentication
- Email + password only (no social login)
- No self-registration (factory_manager creates all users)
- All users created via the /users screen in the app
- Temporary password: CanvaERP@2026
- Users change password on first login via Forgot Password

### 6.4 User Creation Process
IMPORTANT: Never create users via Supabase dashboard.
Always create via the app's user management screen which:
1. Calls supabase.auth.admin.createUser() with auto-confirm
2. Inserts into public.profiles with the new user's UUID
3. If profile insert fails, deletes auth user (no orphans)

---

## 7. EXISTING BUILD — WHAT IS ALREADY IN SUPABASE

The following tables already exist. Do NOT recreate them.

### Tables Built
```
public.profiles           — User profiles and roles
public.role_scope         — Role access scope configuration
public.numbering_counters — Sequential document numbering
public.audit_log          — Universal audit trail
public.work_orders        — Core work order table
public.wo_status_history  — WO status change log
public.wo_drawings        — WO drawing uploads
```

### Functions Built
```
is_incoming_partner()          — RLS helper
get_current_user_role()        — RLS helper + frontend use
generate_document_number()     — Document number generation
```

### Storage Buckets Built
```
wo-drawings   — Work order drawing files (private)
```

### Screens Built
```
/auth                  — Login screen
/work-orders           — Work order list
/work-orders/new       — Create work order
/work-orders/:id       — Work order detail (3 tabs:
                         Details, Status History, Drawings)
/users                 — User management (factory_manager only)
```

### Verified Working
- Login with email/password
- Work order creation with auto-generated WO number
- Role-based data filtering (site_manager sees own WOs only)
- Status update with history logging
- Drawing upload with version control
- User creation form

---

## 8. APPLICATION STRUCTURE

### 8.1 Routes
```
/auth                    Login (public)
/work-orders             WO list (protected)
/work-orders/new         Create WO (protected)
/work-orders/:id         WO detail (protected)
/users                   User management (factory_manager only)
```
All routes redirect to /auth if not authenticated.

### 8.2 Navigation
Desktop: Sidebar navigation
Mobile: Bottom tab navigation

Navigation items by role:
```
factory_manager:
  Dashboard, Work Orders, Quotations, Purchase Orders,
  Inventory, Finance, Reports, Settings (Users + Masters)

factory_supervisor:
  Dashboard, Work Orders, Job Cards,
  Purchase Orders, Inventory, Attendance

site_manager:
  My Work Orders, New Work Order, Change Requests

super_admin:
  Dashboard, All Work Orders (Chhabee only)

carpenter:
  My Tasks (Glide app only — not in Lovable)
```

### 8.3 Design System
```
Background:    #F7F6F2
Text:          #1A1A1A
Sidebar:       #1A1A1A
Accent/Gold:   #C8A84B
Success:       #2D7D46
Warning:       #F59E0B
Error:         #C0392B
Info:          #1A5276
Cards:         #FFFFFF with border #E8E8E8
```

Status badge colours:
```
draft                         → grey    #888888
pending_review                → amber   #F59E0B
supervisor_approved           → blue    #1A5276
approved_pending_bom          → blue    #1A5276
bom_approved_pending_material → blue    #1A5276
partial_material              → orange  #F97316
material_ready                → teal    #0891B2
in_production                 → orange  #F97316
production_complete           → teal    #0891B2
qc_pending                    → amber   #F59E0B
qc_passed                     → green   #2D7D46
ready_for_dispatch            → green   #2D7D46
in_transit                    → blue    #1A5276
delivered_pending_confirmation → blue   #1A5276
delivered_confirmed           → green   #2D7D46
invoice_raised                → purple  #7C3AED
financially_closed            → dk-green #14532D
cancelled                     → red     #C0392B
```

Priority badges:
```
normal   → no badge
high     → amber "HIGH"
critical → red "CRITICAL"
```

### 8.4 Component Standards
- All forms: labels above inputs (never placeholder only)
- All lists: skeleton loading state while fetching
- All forms: toast notification on success and error
- All queries: filter deleted_at IS NULL
- All errors: inline field validation + toast
- Empty states: helpful message + action button
- Tables: horizontally scrollable on mobile
- Minimum font size: 14px

---

## 9. SUPABASE STORAGE

### Buckets
```
wo-drawings      Private. Folder: [wo_id]/[filename]
qc-photos        Private. Folder: [wo_id]/[filename]
vendor-bills     Private. Folder: [grn_id]/[filename]
employee-docs    Private. Folder: [employee_id]/[filename]
```

### File Upload Standards
```
Accepted formats: PDF, JPG, JPEG, PNG, DWG, DXF
Maximum size:     50MB per file
Access:           Authenticated users only
URL generation:   Signed URLs (never public URLs)
```

---

## 10. WHATSAPP AUTOMATION (BAILEYS)

A separate Node.js server handles WhatsApp messaging.
It connects to the same Supabase database via service role key.
It is NOT part of the Lovable frontend build.

Two automated messages:
1. Daily summary — sent to factory_manager at 6:30 PM
2. Weekly P&L snapshot — sent every Monday at 8:00 AM

Implementation is Phase 2. Frontend PRDs do not need to
handle WhatsApp — just ensure data is correctly in Supabase
and the WhatsApp server will read it.

---

## 11. TALLY EXPORT

Monthly data export for the CA's use.
Format: Excel/CSV in Tally-compatible format.
Exported by factory_manager from the Finance module.
Implementation is Phase 2.

---

## 12. GLIDE CARPENTER APP

A separate Glide app connects to the same Supabase database.
Read-only access for carpenters.
Shows: today's job card, own attendance.
Implementation is Phase 2 of Glide build.
Lovable frontend does not need to handle carpenter screens.

---

## 13. BUILD PHASES

### Phase 1 — Core Operations (Build First)
PRD-01: Authentication & User Management
PRD-02: Work Order Management ← partially built
PRD-03: Change Request Management
PRD-05: BOM & Material Planning
PRD-06: Purchase Requisition & PO
PRD-07: Vendor & Material Master
PRD-08: Warehouse & Inventory
PRD-09: Job Card & Production Tracking
PRD-10: Overtime Management
PRD-11: Quality Check & Delivery
PRD-16: Dashboard & Notifications

### Phase 2 — Finance & Intelligence
PRD-04: Quotation Module
PRD-12: Billing & Invoicing
PRD-13: Finance & Accounts
PRD-14: Payroll & Attendance
PRD-15: MIS & Reporting
PRD-17: WhatsApp Automation

---

## 14. DEVELOPER CHECKLIST — BEFORE STARTING ANY MODULE

Before building any new module, the developer must:

[ ] Read PRD-00 (this document) completely
[ ] Read the specific module PRD completely
[ ] Check if any required tables already exist in Supabase
[ ] Check if any required functions already exist
[ ] Confirm you are working on project: dmtscbxundtcqigwdkza
[ ] Never recreate existing tables or functions
[ ] Always enable RLS on new tables before writing policies
[ ] Test with real Supabase data — not mock data
[ ] After every form submission verify in Supabase Table Editor
[ ] After building, run through the testing checklist in the PRD

---

## 15. KEY BUSINESS RULES (APPLY EVERYWHERE)

1. Factory is in Gurgaon, Haryana
2. GST number on all invoices — factory GSTIN required
3. All monetary values stored in Indian Rupees (INR)
4. All amounts stored as NUMERIC (not float — avoids rounding)
5. Dates stored as DATE or TIMESTAMPTZ (never as text)
6. Financial year: August to July (not April to March)
7. Working days: 26 per month (rotational off)
8. Three revenue streams: Chhabee / External B2B / D2C
9. Chhabee billing: Cost + 5% of direct cost
10. B2B and D2C billing: ₹1,200 per billing sqft (market rate)
11. Material factor: 4 (billing sqft to raw material consumption)
12. Plywood wastage: 15% (embedded in production)
13. Laminate wastage: 20% (separate — higher due to offcuts)
14. OT rate: ₹100/hour flat
15. Max OT: 3 hours/day per carpenter, 26 hours/month per carpenter

---

*Document version: 1.0*
*Created: July 2026*
*Next document: PRD-01 Authentication & User Management*

---

## 16. SUPABASE PROJECT — IMPORTANT NOTES FOR DEVELOPER

### Correct Project (USE THIS ONE)
```
Project Name:    Canva Concepts
Project ID:      dmtscbxundtcqigwdkza
Supabase URL:    https://dmtscbxundtcqigwdkza.supabase.co
Managed by:      Lovable Cloud (auto-managed)
Region:          ap-south-1 (Mumbai)
```

### Critical: This is a Lovable Cloud Project
This Supabase project is managed by Lovable Cloud.
The .env file and src/integrations/supabase/client.ts
are auto-generated by Lovable — do NOT manually edit them.

To make schema changes (new tables, RLS policies etc.):
  Option A: Use Lovable chat to generate and run migrations
  Option B: Use Supabase SQL Editor directly on this project
  Both approaches work. SQL Editor is more reliable for
  schema changes (as established during initial build).

### Anon Key (Public — Safe to Use in Frontend)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjeXN2cGFwbGN5dG5lbm1uaGlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3ODgxMTcsImV4cCI6MjEwMDM2NDExN30.D3Ylp_x7bjKlmq7JQQcPGyKyPKKbnjkYyABEzdFu6FI
```
Note: Service role key is managed by Lovable Cloud internally.
Developer does not need the service role key directly.

### Redundant Project (DELETED — ignore)
```
Project ucysvpaplcytnenmnhif has been deleted.
It was created during initial setup in error.
All SQL scripts from that project have been
re-run on the correct project above.
```

---

## 17. DEVELOPER HANDOVER CHECKLIST

Before starting any build, developer must complete:

[ ] Read PRD-00 completely (this document)
[ ] Accept Lovable project invitation (from Factory Manager)
[ ] Accept Supabase project invitation (from Factory Manager)
[ ] Open Lovable project "Canva Concepts" and verify
    the app loads correctly
[ ] Open Supabase project dmtscbxundtcqigwdkza and verify:
    - 7 tables exist (profiles, role_scope,
      numbering_counters, audit_log, work_orders,
      wo_status_history, wo_drawings)
    - profiles has 2 rows (Gurdev + Gaurav)
    - work_orders has 4 rows
    - numbering_counters has 17 rows
[ ] Log into the app with gurdev@chaabee.com
    Password: CanvaERP@2026
    (FM will share actual password separately)
[ ] Create a test work order and verify it appears
    in Supabase → Table Editor → work_orders
[ ] Read remaining PRDs relevant to your first task
[ ] Attend 30-minute briefing call with Factory Manager

### Access to Request from Factory Manager
1. Lovable collaborator invite (Editor role)
2. Supabase team invite (Developer role) for
   project dmtscbxundtcqigwdkza
3. Google Drive folder link with all PRDs
4. Login credentials for test account

### What Is Already Built (Do Not Rebuild)
```
Tables:    profiles, role_scope, numbering_counters,
           audit_log, work_orders, wo_status_history,
           wo_drawings
Functions: is_incoming_partner(), get_current_user_role(),
           generate_document_number()
Storage:   wo-drawings bucket
Screens:   /auth, /work-orders, /work-orders/new,
           /work-orders/:id, /users
```

### What Needs To Be Built (Start Here)
```
PRD-01: Complete user management screens
        (edit user, deactivate, password reset,
         first-login prompt — partially built)
PRD-02: Complete work order screens
        (days remaining display, WO duplication,
         PDF export, bulk actions)
PRD-03: Change Request module (not built yet)
PRD-04: Quotation module (not built yet)
PRD-05 onwards: All remaining modules
```

### Communication
Daily check-in: 15 minutes with Factory Manager
Blockers: WhatsApp group "Canva ERP Build"
PRD questions: Add comments to Google Doc PRDs
