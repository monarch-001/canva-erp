# PRD-11: QUALITY CHECK & DELIVERY
## Canva Concepts — Factory ERP
## Version 1.0 | July 2026

---

## 1. MODULE OVERVIEW

### Purpose
Every Work Order must pass a structured quality inspection
before it can leave the factory. This module manages the
complete QC process — from checklist creation per furniture
type, through inspection, to dispatch and client confirmation.
It also handles partial deliveries, installation sign-off,
customer complaints, and after-sales issues.

### Users of This Module
- Factory Manager: Approve dispatch, view all QC records,
  handle customer complaints
- Factory Supervisor: Conduct QC inspection, create delivery
  challans, mark delivery
- Site Manager: Confirm receipt, log complaints
- Others: No access

### Key Outcomes
- No WO dispatched without a QC record in PASS status
- FM approval mandatory before goods leave factory
- All QC failures create automatic Rework WOs
- Delivery challan with e-Way Bill for every dispatch
- Installation sign-off when applicable
- Customer complaints formally tracked and resolved

---

## 2. DATABASE SCHEMA

### 2.1 qc_checklists (Template checklists — NEW TABLE)

```sql
CREATE TABLE IF NOT EXISTS public.qc_checklists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  furniture_type TEXT NOT NULL,
  checklist_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.qc_checklist_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  qc_checklist_id UUID REFERENCES public.qc_checklists(id)
    ON DELETE CASCADE NOT NULL,
  check_point TEXT NOT NULL,
  description TEXT,
  is_mandatory BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.qc_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qc_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FM full access on qc_checklists"
ON public.qc_checklists FOR ALL
USING (public.is_incoming_partner());

CREATE POLICY "Supervisor can view checklists"
ON public.qc_checklists FOR SELECT
USING (public.get_current_user_role() = 'supervisor');

CREATE POLICY "FM full access on qc_checklist_items"
ON public.qc_checklist_items FOR ALL
USING (public.is_incoming_partner());

CREATE POLICY "Supervisor can view checklist items"
ON public.qc_checklist_items FOR SELECT
USING (public.get_current_user_role() = 'supervisor');
```

### 2.2 qc_records (NEW TABLE)

```sql
CREATE TABLE IF NOT EXISTS public.qc_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  qc_number TEXT UNIQUE NOT NULL,
  wo_id UUID REFERENCES public.work_orders(id) NOT NULL,
  qc_checklist_id UUID REFERENCES public.qc_checklists(id),
  qc_date DATE NOT NULL DEFAULT CURRENT_DATE,
  qc_type TEXT DEFAULT 'pre_dispatch' CHECK (qc_type IN (
    'pre_dispatch',  -- Standard QC before delivery
    're_qc'          -- After rework
  )),
  result TEXT CHECK (result IN (
    'pass',
    'fail',
    'conditional_pass'  -- Minor issues, noted but approved
  )),
  -- Conditional pass notes
  conditional_notes TEXT,
  -- Photos (mandatory before dispatch)
  photos TEXT[],
  -- Inspection details
  conducted_by UUID REFERENCES public.profiles(id) NOT NULL,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  -- Rework
  rework_wo_id UUID REFERENCES public.work_orders(id),
  rework_jc_id UUID REFERENCES public.job_cards(id),
  -- Totals
  total_checkpoints INTEGER DEFAULT 0,
  passed_checkpoints INTEGER DEFAULT 0,
  failed_checkpoints INTEGER DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX qc_wo_idx ON public.qc_records(wo_id);
CREATE INDEX qc_result_idx ON public.qc_records(result);

ALTER TABLE public.qc_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FM full access on qc_records"
ON public.qc_records FOR ALL
USING (public.is_incoming_partner());

CREATE POLICY "Supervisor can manage qc_records"
ON public.qc_records FOR ALL
USING (public.get_current_user_role() = 'supervisor');

CREATE POLICY "Site Manager can view own WO QC"
ON public.qc_records FOR SELECT
USING (
  public.get_current_user_role() = 'chhabee_spoc'
  AND EXISTS (
    SELECT 1 FROM public.work_orders
    WHERE id = wo_id AND created_by = auth.uid()
  )
);
```

### 2.3 qc_record_items (NEW TABLE)

```sql
CREATE TABLE IF NOT EXISTS public.qc_record_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  qc_record_id UUID REFERENCES public.qc_records(id)
    ON DELETE CASCADE NOT NULL,
  check_point TEXT NOT NULL,
  is_mandatory BOOLEAN DEFAULT true,
  result TEXT CHECK (result IN (
    'pass', 'fail', 'na'
  )),
  notes TEXT,
  photo_url TEXT,
  sort_order INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.qc_record_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FM full access on qc_record_items"
ON public.qc_record_items FOR ALL
USING (public.is_incoming_partner());

CREATE POLICY "Supervisor full access on qc_record_items"
ON public.qc_record_items FOR ALL
USING (public.get_current_user_role() = 'supervisor');
```

### 2.4 delivery_challans (NEW TABLE)

```sql
CREATE TABLE IF NOT EXISTS public.delivery_challans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dc_number TEXT UNIQUE NOT NULL,
  wo_id UUID REFERENCES public.work_orders(id) NOT NULL,
  qc_record_id UUID REFERENCES public.qc_records(id),
  challan_type TEXT DEFAULT 'full' CHECK (challan_type IN (
    'full',    -- Complete WO in one delivery
    'partial'  -- Partial delivery (multiple trips)
  )),
  trip_number INTEGER DEFAULT 1,
  -- Items in this delivery
  items_description TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  -- Delivery details
  delivery_address TEXT NOT NULL,
  consignee_name TEXT,
  consignee_phone TEXT,
  vehicle_number TEXT,
  transporter_name TEXT,
  driver_name TEXT,
  driver_phone TEXT,
  -- E-Way Bill
  ewaybill_required BOOLEAN DEFAULT false,
  ewaybill_number TEXT,
  ewaybill_generated_at TIMESTAMPTZ,
  ewaybill_valid_until TIMESTAMPTZ,
  invoice_value NUMERIC,
  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft',
    'approved',        -- FM approved dispatch
    'dispatched',      -- Goods left factory
    'delivered',       -- Delivered at site
    'confirmed'        -- Client confirmed receipt
  )),
  dispatched_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES public.profiles(id),
  -- Installation
  installation_required BOOLEAN DEFAULT false,
  installation_done BOOLEAN DEFAULT false,
  installation_signoff_by TEXT,
  installation_signoff_at TIMESTAMPTZ,
  installation_photo_url TEXT,
  -- Punch list (conditional pass items)
  punch_list_items TEXT,
  punch_list_resolved BOOLEAN DEFAULT false,
  -- Notes
  dispatch_notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  version INTEGER NOT NULL DEFAULT 1,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX dc_wo_idx ON public.delivery_challans(wo_id);
CREATE INDEX dc_status_idx ON public.delivery_challans(status);

ALTER TABLE public.delivery_challans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FM full access on delivery_challans"
ON public.delivery_challans FOR ALL
USING (public.is_incoming_partner());

CREATE POLICY "Supervisor can manage challans"
ON public.delivery_challans FOR ALL
USING (public.get_current_user_role() = 'supervisor');

CREATE POLICY "Site Manager can view own WO challans"
ON public.delivery_challans FOR SELECT
USING (
  public.get_current_user_role() = 'chhabee_spoc'
  AND EXISTS (
    SELECT 1 FROM public.work_orders
    WHERE id = wo_id AND created_by = auth.uid()
  )
);

CREATE POLICY "Site Manager can confirm delivery"
ON public.delivery_challans FOR UPDATE
USING (
  public.get_current_user_role() = 'chhabee_spoc'
  AND status = 'delivered'
);
```

### 2.5 customer_complaints (NEW TABLE)

```sql
CREATE TABLE IF NOT EXISTS public.customer_complaints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  complaint_number TEXT UNIQUE NOT NULL,
  wo_id UUID REFERENCES public.work_orders(id) NOT NULL,
  dc_id UUID REFERENCES public.delivery_challans(id),
  raised_by UUID REFERENCES public.profiles(id) NOT NULL,
  complaint_type TEXT NOT NULL CHECK (complaint_type IN (
    'damage_in_transit',
    'manufacturing_defect',
    'wrong_item',
    'finish_issue',
    'hardware_issue',
    'dimension_mismatch',
    'other'
  )),
  description TEXT NOT NULL,
  photos TEXT[],
  status TEXT DEFAULT 'open' CHECK (status IN (
    'open',
    'under_review',
    'our_fault',
    'transit_damage',
    'client_fault',
    'resolved',
    'closed'
  )),
  fault_determination TEXT CHECK (fault_determination IN (
    'factory',
    'transit',
    'client',
    'undetermined'
  )),
  resolution_type TEXT CHECK (resolution_type IN (
    'repair_at_site',
    'replacement_wo',
    'credit_note',
    'no_action_needed'
  )),
  resolution_wo_id UUID REFERENCES public.work_orders(id),
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id),
  version INTEGER NOT NULL DEFAULT 1,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.customer_complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FM full access on complaints"
ON public.customer_complaints FOR ALL
USING (public.is_incoming_partner());

CREATE POLICY "Supervisor can view complaints"
ON public.customer_complaints FOR SELECT
USING (public.get_current_user_role() = 'supervisor');

CREATE POLICY "Site Manager can raise complaints"
ON public.customer_complaints FOR INSERT
WITH CHECK (
  public.get_current_user_role() = 'chhabee_spoc'
);

CREATE POLICY "Site Manager can view own WO complaints"
ON public.customer_complaints FOR SELECT
USING (
  public.get_current_user_role() = 'chhabee_spoc'
  AND raised_by = auth.uid()
);
```

### 2.6 Add document numbers

```sql
-- QC Record: QC-26-001
-- Delivery Challan: DC-26-001 (partial: DC-26-001-P1)
-- Rework WO: RWK-WO-CHH-26-001-01 (generated in work_orders)
-- Complaint: CPL-26-001

INSERT INTO public.numbering_counters
  (doc_type, fy, last_seq) VALUES
  ('QC', '2526', 0),
  ('DC', '2526', 0),
  ('CPL', '2526', 0)
ON CONFLICT (doc_type, fy) DO NOTHING;
```

---

## 3. STANDARD QC CHECKLISTS

Seed these on system setup. FM can add/edit via settings.

### Counter / Cabinet Checklist
```
1. Dimensions match drawing (L × H × D within ±2mm)
2. All joints flush and tight — no gaps visible
3. Edge banding complete — no peeling or gaps
4. Laminate properly bonded — no bubbles or lifting
5. Shade matches specification (verify against sample)
6. All hardware fitted (hinges, handles, channels)
7. Doors/drawers open and close smoothly
8. Soft-close functioning (if specified)
9. Surface defects — scratches, dents, stains
10. Back panel fitted and secure
11. Levelling feet fitted (if applicable)
12. Finishing coat even (if duco/polish)
```

### Workstation Checklist
```
1. Dimensions match drawing
2. Cable management provisions in place
3. Grommet holes cut cleanly
4. All joints flush
5. Edge banding complete
6. Laminate bonded correctly
7. Modesty panel fitted (if applicable)
8. All hardware fitted
9. Surface defects check
10. Leg alignment and stability
```

### Hospital Fitout Checklist
```
1. Dimensions match drawing
2. All joints flush and tight
3. Edge banding — no gaps
4. Laminate bonded — infection control surfaces verified
5. Hardware fitted (medical grade if specified)
6. No sharp edges or protrusions
7. Finish quality — smooth and cleanable
8. Drawers/doors smooth operation
9. Locking mechanism (if specified)
10. Surface defects check
11. Weight-bearing test (for treatment surfaces)
```

### D2C Product Checklist
```
1. Dimensions match product specification
2. Flat-pack components all present (count)
3. Assembly hardware included (count per BOM)
4. Instruction sheet included
5. Surface finish quality
6. Edge quality — no splinters
7. Branding/logo (if applicable)
8. Packaging intact — no damage
9. Label correct (product name, dimensions)
```

---

## 4. SCREENS & FLOWS

### 4.1 QC Tab on Work Order Detail

Add to WO detail screen (after BOM tab):

```
TAB: QC & Dispatch

If WO status = production_complete:
  Show: "Production complete. Ready for QC."
  [Start QC Inspection] button (Supervisor/FM)

If QC in progress or complete:
  Show QC record summary:
    QC Number | Date | Conducted by
    Result badge: PASS / FAIL / CONDITIONAL
    [View QC Record] button
  
  If PASS or CONDITIONAL PASS:
    [Create Delivery Challan] button (FM)
  
  If FAIL:
    Show: "Rework required"
    Rework WO: [RWK-WO-CHH-26-001-01] (linked)
    [View Rework WO] button

Delivery Challans section:
  List of all challans for this WO
  Each: DC number | Trip | Status | Date
```

---

### 4.2 Conduct QC Inspection

Route: /quality/inspect/:wo_id
Access: Supervisor, FM

```
PAGE HEADER:
  "QC Inspection"
  WO Number + Title
  QC Number (auto-generated: QC-26-001)
  Date: [today]

STEP 1: SELECT CHECKLIST
  System suggests checklist based on WO furniture_type
  Supervisor confirms or selects different checklist
  
  Dropdown: [Counter/Cabinet ▼]
  [Confirm Checklist] button

STEP 2: INSPECTION

  For each checkpoint in checklist:
  ┌─────────────────────────────────────────────────┐
  │ 1. Dimensions match drawing (L × H × D ±2mm)   │
  │    MANDATORY                                    │
  │                                                 │
  │    ○ PASS    ○ FAIL    ○ N/A                   │
  │                                                 │
  │    Notes: [TEXT INPUT]                          │
  │    Photo: [Upload] (mandatory if FAIL)          │
  └─────────────────────────────────────────────────┘

  Progress bar: [5/12 checkpoints completed]

  MANDATORY RULE: All mandatory checkpoints must be
  answered (Pass/Fail/N/A). Cannot submit with blanks.

STEP 3: OVERALL RESULT DETERMINATION

  System auto-calculates:
    If ALL mandatory checkpoints = PASS:
      Suggested result: PASS ✓
    If ANY mandatory checkpoint = FAIL:
      Suggested result: FAIL ✗
      "Cannot pass QC with failed mandatory checkpoints"
    If minor non-mandatory checkpoints = FAIL:
      Suggested result: CONDITIONAL PASS
      Conditional notes field appears (mandatory)

  PHOTOS (mandatory before any result):
    "Upload at least 3 photos of the finished product"
    Photo slots: minimum 3, maximum 10
    Camera upload or file upload
    Mandatory before submitting result

STEP 4: SUBMIT QC RECORD

  Summary shown:
    Total checkpoints: [X]
    Passed: [X] | Failed: [X] | N/A: [X]
    Result: [PASS / FAIL / CONDITIONAL]

  [Submit QC Record] button

  ON SUBMIT:
    1. INSERT into qc_records
       INSERT all checkpoint results into qc_record_items
    
    2. If PASS or CONDITIONAL PASS:
       UPDATE work_orders SET status = 'qc_passed'
       Insert into wo_status_history
       Notify FM: "QC passed for WO [number].
         Ready for dispatch approval."
    
    3. If FAIL:
       CREATE Rework WO:
         wo_number = generate with 'RWK' prefix
         title = "REWORK: [original wo title]"
         Copies all WO details
         rework_reason = failed checkpoint descriptions
         status = in_production
       CREATE Rework Job Card (auto):
         production_stage = 'rework'
         is_rework = true
         description = checkpoint failures
       UPDATE original work_orders SET
         status = 'qc_pending' (back to pending)
       Notify Supervisor: "QC failed for WO [number].
         Rework required: [failed checkpoints]"
       Notify FM: same notification
```

---

### 4.3 Dispatch Approval (FM)

Triggered by: QC passed notification
Access: FM only

```
FM sees:
  WO Summary
  QC Record (result + photos)
  Conditional notes (if conditional pass)
  [View all QC photos] gallery

  If CONDITIONAL PASS:
    FM decides: proceed or send for rework
    If proceed: note conditional items for punch list
                Add to Delivery Challan as punch list

ACTIONS:
  [Approve Dispatch]
    UPDATE work_orders SET status = 'ready_for_dispatch'
    Notify Supervisor: "Dispatch approved for
      WO [number]. Create delivery challan."

  [Send for Rework] (even after conditional pass)
    Reason mandatory
    Creates rework WO same as QC fail flow
```

---

### 4.4 Create Delivery Challan

Route: /delivery/challan/new/:wo_id
Access: Supervisor (after FM dispatch approval)

```
STEP 1: DELIVERY DETAILS

  Challan Type:
    ○ Full Delivery (all items in one trip)
    ○ Partial Delivery (multiple trips)
      If partial: Trip Number field + which items

  Items Description * (TEXTAREA)
    What is being delivered? (auto-populated from WO)
  Quantity * (NUMBER)

  Delivery Address * (pre-filled from WO, editable)
  Consignee Name (person receiving at site)
  Consignee Phone

STEP 2: VEHICLE & TRANSPORT

  Vehicle Number *
  Transporter Name
  Driver Name
  Driver Phone

STEP 3: E-WAY BILL CHECK

  System calculates invoice value:
    If value > ₹50,000:
      "E-Way Bill REQUIRED before dispatch"
      E-Way Bill Number: [TEXT INPUT]
      (E-Way Bill generated externally on GST portal)
      E-Way Bill Valid Until: [DATE]
      Cannot proceed without EWB number if value > ₹50K
    
    If value ≤ ₹50,000:
      "E-Way Bill not required ✓"

STEP 4: INSTALLATION

  Installation Required: TOGGLE
    If ON:
      "Installation sign-off required at delivery"
      System will prompt for sign-off on delivery screen

STEP 5: NOTES
  Dispatch Notes (TEXTAREA)

[Create Delivery Challan] button

ON CREATE:
  1. Generate DC number: DC-26-001
     Partial: DC-26-001-P1, P2 etc.
  2. INSERT into delivery_challans
     status = 'approved'
  3. Generate Delivery Challan PDF
  4. UPDATE work_orders SET status = 'in_transit'
  5. Toast: "Delivery Challan [dc_number] created"
```

---

### 4.5 Delivery Challan PDF Format

```
═══════════════════════════════════════════════════
CANVA CONCEPTS
[Factory address] | [Phone] | GSTIN: [number]
═══════════════════════════════════════════════════

DELIVERY CHALLAN
DC No: DC-26-001            Date: DD-MMM-YYYY
WO Ref: WO-CHH-26-001
E-Way Bill No: [number] (if applicable)
═══════════════════════════════════════════════════

FROM:
Canva Concepts, [Factory Address], Gurgaon

TO:
[Consignee Name]
[Delivery Address]
Phone: [Consignee Phone]
═══════════════════════════════════════════════════

ITEMS:
Sr. | Description          | Qty | Unit
 1  | [furniture type]     |  X  | Nos
    | [dimensions]         |     |
    | [finish details]     |     |
═══════════════════════════════════════════════════

Vehicle: [number] | Driver: [name] | Ph: [number]
Transporter: [name]

This challan is valid for transit purposes only.
Not a tax invoice.

[QR Code — WO reference]

Authorised By: [FM name]
Canva Concepts
═══════════════════════════════════════════════════

RECEIVER ACKNOWLEDGEMENT:
Received in good condition

Name: _______________ Sign: _______________
Date: _______________ Stamp: ______________
```

---

### 4.6 Mark Delivery & Site Confirmation

```
SUPERVISOR MARKS DELIVERED:
  On delivery day, Supervisor marks goods dispatched:
  [Mark as Dispatched] button on challan detail
  On dispatch: status = 'dispatched'
               dispatched_at = NOW()
               WO status = in_transit

  After reaching site, Supervisor or driver marks:
  [Mark as Delivered at Site] button
  status = 'delivered'
  delivered_at = NOW()
  WO status = delivered_pending_confirmation

SITE MANAGER CONFIRMS RECEIPT:
  Site Manager sees notification:
    "WO [number] delivered. Please confirm receipt."
  
  Site Manager goes to /work-orders/:id → QC tab
  Sees: [Confirm Receipt] button
  
  On confirm:
    status = 'confirmed'
    confirmed_at = NOW()
    confirmed_by = auth.uid()
    WO status = delivered_confirmed
    Notify FM: "Delivery confirmed by [SPOC name]
      for WO [number]"

INSTALLATION SIGN-OFF (if required):
  If installation_required = true:
    After delivery confirmation, show:
    "Installation sign-off pending"
    
    SIGN-OFF FORM (FM or Supervisor on-site):
      Items installed checklist (from WO)
      Client representative name
      Client signature (drawn on screen OR name entry)
      Punch list items (if any conditional items)
      Photo upload (mandatory — installed product)
      [Submit Installation Sign-off] button
    
    On submit:
      installation_done = true
      installation_signoff_by = [name]
      installation_signoff_at = NOW()
      installation_photo_url = [uploaded photo]
    
    WO does NOT move to delivered_confirmed
    until installation sign-off is complete
    (if installation was required)
```

---

### 4.7 Multiple Delivery Trips

For large WOs delivered in multiple trips:

```
When creating challan:
  Select: Partial Delivery
  Trip number: 1 (auto, increments)
  Items in this trip: [description of what's going]

DC numbers:
  Trip 1: DC-26-001-P1
  Trip 2: DC-26-001-P2
  Trip 3: DC-26-001-P3

Billing trigger options (set at WO creation):
  Option A: Bill after ALL items delivered
    (Invoice only when last challan confirmed)
  Option B: Bill after EACH trip
    (Invoice per challan)

WO progress shows:
  Delivery 1: DC-26-001-P1 — Confirmed ✓
  Delivery 2: DC-26-001-P2 — In transit
  Delivery 3: DC-26-001-P3 — Not dispatched

Final WO status change only when all trips = confirmed
```

---

### 4.8 Customer Complaint Management

Access: Site Manager (raise), FM (resolve), Supervisor (view)

```
RAISE COMPLAINT (Site Manager):
  From WO detail → [Raise Complaint] button
  Available for WOs with status:
    delivered_confirmed, invoice_raised, financially_closed

  COMPLAINT FORM:
    Complaint Type * (dropdown):
      Damage in Transit
      Manufacturing Defect
      Wrong Item Delivered
      Finish Issue (colour, texture)
      Hardware Issue (loose, missing, wrong)
      Dimension Mismatch
      Other

    Description * (TEXTAREA)
      Minimum 30 characters

    Photos * (upload)
      Minimum 2 photos mandatory
      Show defect clearly

    [Submit Complaint] button

  ON SUBMIT:
    Generate CPL number: CPL-26-001
    status = 'open'
    Notify FM immediately:
      "Complaint raised by [SPOC name] on
       WO [number]: [type]. Review needed."

FM COMPLAINT RESOLUTION (within 24 hours):
  FM reviews complaint + photos
  
  Determines fault:
    ○ Our fault (factory defect / wrong item)
    ○ Transit damage (transporter's fault)
    ○ Client fault (misuse / installation error)
    ○ Undetermined

  Resolution type:
    If factory fault:
      ○ Repair at site (send carpenter)
      ○ Replacement WO (create new WO)
        System auto-creates WO with rework type
      ○ Credit Note (reduce payment)
    
    If transit damage:
      ○ Transporter claim raised
      ○ Repair/replacement at our cost
      ○ (Insurance claim if applicable)
    
    If client fault:
      ○ Document and communicate to client
      ○ Offer paid repair service

  [Record Resolution] button
  Resolution notes: TEXTAREA

  ON RESOLVE:
    UPDATE customer_complaints SET
      fault_determination = [fault]
      resolution_type = [resolution]
      resolution_notes = [notes]
      status = 'resolved'
      resolved_at = NOW()
      resolved_by = auth.uid()
    
    If replacement WO: link resolution_wo_id
    If credit note: trigger billing flow (PRD-12)
    
    Notify Site Manager of resolution

COMPLAINT HISTORY:
  All complaints logged permanently against WO
  Monthly report: count, type, resolution time,
  cost of resolution — visible to FM in MIS
```

---

### 4.9 QC Management Screen (/quality)

Access: FM, Supervisor

```
Page title: "Quality Control"

TABS:
  Tab 1: Pending QC
    WOs with status = production_complete or qc_pending
    Each: WO number | Title | Furniture Type |
          Delivery Date | Days remaining
    [Inspect] button

  Tab 2: QC Records
    All completed QC records
    Filter: Result / Date / Furniture Type
    Table: QC No | WO | Result | Date | By
    [View] button per record

  Tab 3: Rework Tracker
    All active rework WOs
    Each: RWK number | Original WO | Reason |
          Created Date | Status
    [View] button

  Tab 4: Complaints
    All customer complaints
    Filter: Status / Type / Date
    Table: CPL No | WO | Type | Status | Age
    [View/Resolve] button

QUALITY METRICS (FM only):
  This month:
    WOs inspected: [X]
    First-time pass rate: [X]%
    Rework rate: [X]%
    Average rework cost: ₹[X]
    Complaints received: [X]
    Avg resolution time: [X] days
```

---

## 5. BUSINESS RULES

```
BR-01: No WO can be dispatched without a QC record
       with status = PASS or CONDITIONAL PASS.
       System hard blocks dispatch without QC.

BR-02: FM must approve dispatch after QC pass.
       Supervisor cannot dispatch without FM approval.

BR-03: QC photos mandatory before any result can
       be submitted. Minimum 3 photos required.
       Photo of finished product from multiple angles.

BR-04: Failed mandatory checkpoint = QC FAIL.
       Cannot override mandatory checkpoint failure.
       Only FM can mark conditional pass on
       non-mandatory checkpoint failures.

BR-05: QC FAIL automatically creates a Rework WO.
       Rework WO number format: RWK-WO-CHH-26-001-01
       Rework WO linked to original WO.
       Re-QC mandatory after rework.

BR-06: E-Way Bill mandatory for dispatch when
       invoice value > ₹50,000.
       System blocks dispatch without EWB number
       when invoice value exceeds threshold.
       EWB number entered manually (GST portal).

BR-07: Installation sign-off is mandatory when
       installation_required = true on WO.
       WO cannot move to delivered_confirmed
       without installation sign-off.

BR-08: Site Manager (Chhabee SPOC) confirms delivery.
       For B2B and D2C: FM or Supervisor confirms.
       System blocks invoice generation until
       delivered_confirmed status is reached.

BR-09: Partial deliveries each require:
       Separate delivery challan (DC-26-001-P1)
       Separate e-Way Bill if value > ₹50,000
       Separate delivery confirmation

BR-10: Customer complaints must be reviewed by FM
       within 24 hours of submission.
       System escalates if not reviewed in 24 hours.

BR-11: Complaint resolution must be documented.
       Cannot close complaint without resolution type
       and notes.

BR-12: All QC records are permanent.
       Cannot be deleted — soft delete only.
       Re-QC after rework creates a NEW qc_record
       linked to the rework WO.

BR-13: Rework cost tracked separately:
       Rework labour hours not added to original WO
       Rework material consumption tracked separately
       Both shown in WO P&L as additional cost

BR-14: Monthly QC report for FM:
       First-time pass rate target: > 90%
       Rework rate target: < 10%
       Below target: MIS flags automatically
```

---

## 6. NOTIFICATIONS & ALERTS

```
Production Complete:
  → Supervisor: "WO [number] production complete.
    Ready for QC inspection."

QC Passed:
  → FM: "QC passed for WO [number].
    Please approve dispatch."
  → Site Manager: "Your WO [number] has passed
    QC and will be dispatched soon."

QC Failed:
  → FM + Supervisor: "QC failed for WO [number].
    Failed: [checkpoint names].
    Rework WO [RWK number] created."

Dispatch Approved:
  → Supervisor: "Dispatch approved for WO [number].
    Create delivery challan."

Goods Dispatched:
  → FM: "WO [number] dispatched via [vehicle].
    DC: [dc_number]"
  → Site Manager: "Your order WO [number] has
    been dispatched. Expected: [date]"

Delivery Confirmation Pending (> 24 hours):
  → FM: "WO [number] delivered but not yet
    confirmed by client. Follow up needed."

Delivery Confirmed:
  → FM: "Delivery confirmed by [SPOC name] for
    WO [number]. Proceed to billing."

Installation Sign-off Pending:
  → FM + Supervisor: "Installation sign-off
    pending for WO [number]."

Complaint Raised:
  → FM (immediately): "Complaint CPL-26-001 raised
    by [SPOC] on WO [number]: [type].
    Review within 24 hours."

Complaint Not Reviewed (24 hours):
  → FM: "ESCALATION: Complaint CPL-26-001 has not
    been reviewed in 24 hours. Action required."

Rework Complete:
  → FM + Supervisor: "Rework complete for
    WO [number]. Ready for re-QC."
```

---

## 7. TESTING CHECKLIST

**QC Inspection:**
[ ] QC number generated: QC-26-001
[ ] Correct checklist suggested for furniture type
[ ] All mandatory checkpoints must be answered
[ ] Photo upload mandatory (min 3 photos)
[ ] FAIL result blocks dispatch
[ ] CONDITIONAL PASS requires notes
[ ] QC record saved to Supabase

**QC Outcomes:**
[ ] PASS: WO status → qc_passed, FM notified
[ ] FAIL: Rework WO auto-created (RWK-WO-CHH-26-001-01)
[ ] Rework WO shows RED banner in job cards
[ ] Re-QC after rework creates new QC record
[ ] FM dispatch approval required even after pass

**Delivery Challan:**
[ ] DC number: DC-26-001
[ ] Partial delivery: DC-26-001-P1, P2
[ ] E-Way Bill field mandatory when value > ₹50,000
[ ] Cannot dispatch without EWB if required
[ ] Challan PDF generated correctly
[ ] WO status → in_transit on dispatch

**Delivery Confirmation:**
[ ] Site Manager can confirm receipt
[ ] B2B/D2C: Supervisor confirms
[ ] Installation sign-off flow works
[ ] Photo mandatory for installation sign-off
[ ] WO status → delivered_confirmed correctly

**Complaints:**
[ ] Site Manager can raise complaint on delivered WO
[ ] Photos mandatory (min 2)
[ ] FM notified immediately
[ ] 24-hour review escalation works
[ ] Resolution types all work
[ ] Credit note trigger works
[ ] Replacement WO creation works

---

## 8. INTEGRATION POINTS

```
PRD-02: QC pass/fail updates work_orders.status
         Delivery confirmation updates WO status
         All status changes logged in wo_status_history

PRD-03: QC failure may trigger Change Request if
         design change needed to fix defect

PRD-08: QC rejection photos in qc-photos bucket
         Delivery challan references GRN materials

PRD-09: QC failure creates rework job card
         Rework tracked in job_cards with is_rework=true
         Rework labour cost tracked separately

PRD-12: Delivery confirmed triggers invoice generation
         Complaint resolution may trigger credit note
         Partial delivery billing options managed here

PRD-13: Transporter claim for transit damage
         Credit note for quality claims

PRD-15: First-time QC pass rate KPI
         Rework rate and rework cost per WO
         Complaint frequency and resolution time
         Furniture type defect analysis

PRD-16: Dashboard alerts:
         "X WOs pending QC"
         "X complaints unresolved"
         "Dispatch approval needed for WO [number]"
```

---

*Document version: 1.0*
*Prerequisites: PRD-00, PRD-01, PRD-02, PRD-09*
*Document numbers: QC-26-001, DC-26-001, CPL-26-001,
                   RWK-WO-CHH-26-001-01*
*Next document: PRD-12 Billing & Invoicing*
