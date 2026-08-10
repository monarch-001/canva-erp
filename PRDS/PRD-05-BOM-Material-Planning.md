# PRD-05: BOM & MATERIAL PLANNING
## Canva Concepts — Factory ERP
## Version 1.0 | July 2026

---

## 1. MODULE OVERVIEW

### Purpose
The Bill of Materials (BOM) module calculates the exact
materials needed to produce a Work Order. It uses reusable
Template BOMs from past jobs so the supervisor never
calculates from scratch. Once a BOM is approved, the system
automatically checks stock availability and triggers purchase
requisitions for shortfalls.

### Users of This Module
- Factory Manager: Approve BOMs, save as templates
- Factory Supervisor: Create and submit BOMs
- Site Manager: View BOM status on their WOs (read only)
- Others: No access

### Key Outcomes
- Every WO has a documented, approved BOM before production
- Template BOMs reduce manual calculation time
- Three cost columns always visible: Estimated / Committed / Actual
- Auto stock check triggers PR for shortfalls
- Material variance tracked (BOM estimate vs actual consumed)

---

## 2. LOCKED BUSINESS ASSUMPTIONS

These values come from the financial model and must be
used in all BOM calculations:

```
Material Factor:       4 (billing sqft to raw material)
Plywood wastage:       15% (embedded in production —
                       61 usable boards from 72 cut)
Laminate wastage:      20% (separate — offcut losses)
Plywood rate:          ₹50 per raw sqft
Laminate rate:         ₹80 per raw sqft
Hardware rate:         ₹150 per billing sqft (no wastage)
Delivery:              ₹50 per billing sqft (B2B + D2C only)
Installation:          ₹50 per billing sqft (B2B + D2C only)
Sqft per board (8×4):  32 sqft
```

---

## 3. DATABASE SCHEMA

### 3.1 template_boms (NEW TABLE)

```sql
CREATE TABLE IF NOT EXISTS public.template_boms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_name TEXT NOT NULL,
  furniture_type TEXT NOT NULL,
  client_type_hint TEXT,
  base_length_mm NUMERIC,
  base_height_mm NUMERIC,
  base_depth_mm NUMERIC,
  finish_type TEXT,
  description TEXT,
  created_from_wo_id UUID REFERENCES public.work_orders(id),
  created_by UUID REFERENCES public.profiles(id),
  approved_by UUID REFERENCES public.profiles(id),
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.template_boms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FM full access on template_boms"
ON public.template_boms FOR ALL
USING (public.is_incoming_partner());

CREATE POLICY "Supervisor can view and use templates"
ON public.template_boms FOR SELECT
USING (public.get_current_user_role() = 'supervisor'
  AND is_active = true AND deleted_at IS NULL);

CREATE POLICY "Supervisor can insert templates"
ON public.template_boms FOR INSERT
WITH CHECK (
  public.get_current_user_role() IN (
    'supervisor', 'incoming_partner'
  )
);
```

### 3.2 template_bom_items (NEW TABLE)

```sql
CREATE TABLE IF NOT EXISTS public.template_bom_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_bom_id UUID REFERENCES public.template_boms(id)
    ON DELETE CASCADE NOT NULL,
  material_id UUID REFERENCES public.generic_materials(id),
  material_name TEXT NOT NULL,
  material_category TEXT NOT NULL,
  qty_formula TEXT,
  qty_per_unit NUMERIC NOT NULL,
  unit TEXT NOT NULL DEFAULT 'sheets',
  wastage_pct NUMERIC DEFAULT 0,
  notes TEXT,
  sort_order INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.template_bom_items
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FM full access on template_bom_items"
ON public.template_bom_items FOR ALL
USING (public.is_incoming_partner());

CREATE POLICY "Supervisor access on template_bom_items"
ON public.template_bom_items FOR SELECT
USING (public.get_current_user_role() = 'supervisor');

CREATE POLICY "Supervisor can insert template items"
ON public.template_bom_items FOR INSERT
WITH CHECK (
  public.get_current_user_role() IN (
    'supervisor', 'incoming_partner'
  )
);
```

### 3.3 wo_boms (NEW TABLE)

```sql
CREATE TABLE IF NOT EXISTS public.wo_boms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wo_id UUID REFERENCES public.work_orders(id)
    NOT NULL UNIQUE,
  template_bom_id UUID REFERENCES public.template_boms(id),
  bom_number TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft',
    'submitted',
    'approved',
    'revision_needed'
  )),
  billing_sqft NUMERIC,
  total_estimated_cost NUMERIC DEFAULT 0,
  total_committed_cost NUMERIC DEFAULT 0,
  total_actual_cost NUMERIC DEFAULT 0,
  submitted_by UUID REFERENCES public.profiles(id),
  submitted_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  approval_notes TEXT,
  save_as_template BOOLEAN DEFAULT false,
  template_name TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.wo_boms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FM full access on wo_boms"
ON public.wo_boms FOR ALL
USING (public.is_incoming_partner());

CREATE POLICY "Supervisor can manage wo_boms"
ON public.wo_boms FOR ALL
USING (public.get_current_user_role() = 'supervisor');

CREATE POLICY "Site Manager can view own WO BOMs"
ON public.wo_boms FOR SELECT
USING (
  public.get_current_user_role() = 'chhabee_spoc'
  AND EXISTS (
    SELECT 1 FROM public.work_orders
    WHERE id = wo_id
    AND created_by = auth.uid()
  )
);
```

### 3.4 wo_bom_items (NEW TABLE)

```sql
CREATE TABLE IF NOT EXISTS public.wo_bom_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wo_bom_id UUID REFERENCES public.wo_boms(id)
    ON DELETE CASCADE NOT NULL,
  wo_id UUID REFERENCES public.work_orders(id) NOT NULL,
  material_id UUID REFERENCES public.generic_materials(id),
  material_name TEXT NOT NULL,
  material_category TEXT NOT NULL
    CHECK (material_category IN (
      'plywood', 'laminate', 'hardware',
      'adhesive', 'finishing', 'packaging', 'other'
    )),
  unit TEXT NOT NULL,
  -- Quantities
  qty_required NUMERIC NOT NULL,
  qty_reserved NUMERIC DEFAULT 0,
  qty_issued NUMERIC DEFAULT 0,
  qty_returned NUMERIC DEFAULT 0,
  qty_consumed NUMERIC GENERATED ALWAYS AS
    (qty_issued - qty_returned) STORED,
  -- Costs (3 columns always maintained)
  estimated_rate NUMERIC DEFAULT 0,
  estimated_cost NUMERIC DEFAULT 0,
  committed_rate NUMERIC DEFAULT 0,
  committed_cost NUMERIC DEFAULT 0,
  actual_rate NUMERIC DEFAULT 0,
  actual_cost NUMERIC DEFAULT 0,
  -- Variance from template
  template_qty NUMERIC,
  qty_variance NUMERIC GENERATED ALWAYS AS
    (qty_required - COALESCE(template_qty, qty_required))
    STORED,
  -- Stock status
  stock_available NUMERIC DEFAULT 0,
  stock_status TEXT DEFAULT 'unchecked'
    CHECK (stock_status IN (
      'unchecked', 'available',
      'partial', 'unavailable'
    )),
  pr_raised BOOLEAN DEFAULT false,
  notes TEXT,
  sort_order INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.wo_bom_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FM full access on wo_bom_items"
ON public.wo_bom_items FOR ALL
USING (public.is_incoming_partner());

CREATE POLICY "Supervisor full access on wo_bom_items"
ON public.wo_bom_items FOR ALL
USING (public.get_current_user_role() = 'supervisor');
```

### 3.5 Add BOM number to numbering_counters

```sql
INSERT INTO public.numbering_counters
  (doc_type, fy, last_seq)
VALUES ('BOM', '2526', 0)
ON CONFLICT (doc_type, fy) DO NOTHING;
```

BOM number format: BOM-WO-CHH-26-001
(i.e. BOM- prefix + the WO number it belongs to)

---

## 4. MATERIAL CALCULATION FORMULAS

These formulas must be used consistently in all BOM
calculations. They are locked from the financial model.

```
BILLING SQFT:
  = WO dimensions: L(mm) × H(mm) ÷ 1,000,000
    × production_quantity
  (if dimensions not entered: supervisor enters manually)

PLYWOOD (raw sqft needed):
  = billing_sqft × material_factor(4)
  (15% wastage already embedded — 61 usable from 72 cut)
  Convert to sheets: raw_sqft ÷ 32

LAMINATE (raw sqft needed):
  = billing_sqft × material_factor(4) ÷ (1 - 0.20)
  = billing_sqft × 5
  (20% wastage — offcut losses from varied dimensions)

HARDWARE:
  = billing_sqft × 150 ÷ [hardware unit rate]
  (no wastage factor — job specific)

DELIVERY (B2B + D2C only, not Chhabee):
  = billing_sqft × 50

INSTALLATION (B2B + D2C only, not Chhabee):
  = billing_sqft × 50
```

---

## 5. SCREENS & FLOWS

### 5.1 BOM Tab on Work Order Detail

Add a 5th tab "BOM" on /work-orders/:id
(shown after Details, Status History, Drawings, CRs)

```
Visible to: FM, Supervisor, Site Manager (read-only)

If no BOM exists:
  Show: "No BOM created yet"
  [Create BOM] button (FM and Supervisor only)
  Available when WO status = approved_pending_bom

If BOM exists:
  Show BOM summary card:
    BOM Number
    Status badge
    Billing Sqft
    Total Estimated Cost: ₹X
    Total Committed Cost: ₹X
    Total Actual Cost:    ₹X
    [View BOM] button → opens BOM detail
    [Edit BOM] button (if status = draft or revision_needed)
```

---

### 5.2 Create / Edit BOM Screen

Route: /work-orders/:id/bom
Access: FM, Supervisor

```
PAGE HEADER:
  "Bill of Materials"
  WO Number + Title
  BOM Number (auto-generated on first save)

SECTION 1: Dimensions & Billing Sqft

  If WO has dimensions:
    Show: L=[X]mm × H=[X]mm × D=[X]mm (from WO)
    Billing Sqft: [auto-calculated] sqft
    Production Qty: [X] units
    Total Billing Sqft: [auto × qty]
  
  If WO has no dimensions:
    Show: "Dimensions not set on WO"
    Manual entry: Billing Sqft [NUMBER INPUT] sqft
    Helper: "Enter total billing sqft for this job"

SECTION 2: Load Template BOM

  Search Template BOMs:
    Search by furniture type or template name
    Shows: template name, furniture type,
           base dimensions, use count, last used

  Template search results (cards):
    [Template Name]
    Furniture: Counter | Base: 1800×900×600mm
    Used 4 times | Last used: 12-Aug-26
    [Load This Template] button

  On Load:
    System auto-calculates quantities for this WO's
    billing sqft vs template base billing sqft
    Shows DELTA from template:
      "Plywood: +2 sheets vs template"
      "Laminate: +8 sqft vs template"
    Supervisor reviews and adjusts

SECTION 3: BOM Line Items

  Table with columns:
  Material | Category | Qty Required | Unit |
  Template Qty | Variance | Est. Rate | Est. Cost |
  Stock Available | Status | Notes

  Pre-filled if template loaded.
  Supervisor can add/edit/remove lines.

  DEFAULT LINES (always present, auto-calculated):

  PLYWOOD (18mm BWR):
    Qty = billing_sqft × 4 ÷ 32 [sheets]
    Rate = ₹1,850/sheet (from Material Master)
    Cost = qty × rate [auto]

  LAMINATE:
    Qty = billing_sqft × 5 [sqft]
    Rate = ₹80/sqft × 32 / 32 = per sheet equiv
    Show in sqft for clarity
    Cost = qty × ₹80 [auto]

  HARDWARE + POLISH:
    Qty = billing_sqft [billing sqft]
    Rate = ₹150/sqft
    Cost = billing_sqft × 150 [auto]

  Additional lines supervisor can add:
    Edge tape, Fevicol, Screws, Handles, Hinges,
    Channels, PU Polish, Packaging, Other

  [+ Add Material] button → opens material search
    from Material Master (PRD-07)

  Each row:
    Material name (from Material Master or free text)
    Category (dropdown)
    Qty Required (NUMBER, editable)
    Unit (sheets/sqft/pcs/kg/metres/tins)
    Template Qty (read-only, shows template value)
    Variance (auto: Qty - Template Qty, colour coded)
    Est. Rate (₹, from Material Master, editable)
    Est. Cost (auto: Qty × Rate)
    [Remove] button (×)

SECTION 4: Cost Summary

  ┌─────────────────────────────────────────────────────┐
  │                  ESTIMATED  COMMITTED    ACTUAL      │
  │ Material Cost:   ₹X         ₹X           ₹X         │
  │ (Committed populated from PO, Actual from GRN)      │
  │                                                      │
  │ Total BOM Cost:  ₹X         ₹X           ₹X         │
  │ Revenue (est.):  ₹X         (billing sqft × ₹1,200) │
  │ Gross Margin:    X%          X%           X%         │
  └─────────────────────────────────────────────────────┘
  
  Margin colour:
    > 25%: green
    15-25%: amber
    < 15%: red

SECTION 5: Save Options

  [Save as Draft] — saves, not submitted
  [Submit for Approval] — status = submitted
    Available to Supervisor
    Triggers FM approval notification

  On Submit:
    INSERT/UPDATE wo_boms
    Set status = submitted
    Notify FM: "BOM for WO [number] submitted
      for approval"
    Update WO status remains approved_pending_bom

SAVE AS TEMPLATE (checkbox, FM only):
  □ Save this BOM as a template for future use
    Template Name: [TEXT INPUT]
    If checked on approval: saves to template_boms
```

---

### 5.3 BOM Approval (FM)

Triggered by: Notification or BOM tab on WO detail
Access: FM only

```
FM sees the full BOM with all line items and cost summary.

Action buttons:
  [Approve BOM]
    Notes (optional): TEXTAREA
    Save as Template: TOGGLE (default off)
      If on: Template Name field appears
    [Approve] button

  [Send Back for Revision]
    Reason (required): TEXTAREA
    [Send Back] button

ON APPROVE:
  1. UPDATE wo_boms SET
       status = 'approved',
       approved_by = auth.uid(),
       approved_at = NOW(),
       approval_notes = [notes]
  2. If save_as_template = true:
       INSERT into template_boms
       INSERT all items into template_bom_items
       Toast: "BOM approved and saved as template
         [template_name]"
  3. Run stock check (see Section 5.4)
  4. UPDATE work_orders SET
       status = 'bom_approved_pending_material'
  5. Insert into wo_status_history
  6. Notify Supervisor: "BOM approved. Stock check
     complete. [X] items need procurement."

ON SEND BACK:
  1. UPDATE wo_boms SET status = 'revision_needed'
  2. Notify Supervisor with reason
  3. WO status remains approved_pending_bom
```

---

### 5.4 Automatic Stock Check

Triggered immediately after BOM approval.
Runs silently — no user action needed.

```
For each item in wo_bom_items:
  1. Query inventory for available stock:
     SELECT available_qty FROM public.inventory
     WHERE material_id = [item.material_id]
     AND deleted_at IS NULL

  2. Compare: qty_required vs available_qty

  3. UPDATE wo_bom_items SET:
       stock_available = [available from inventory]
       stock_status =
         'available'    if available >= qty_required
         'partial'      if 0 < available < qty_required
         'unavailable'  if available = 0

  4. For available items:
     Reserve stock in inventory:
     UPDATE inventory SET
       reserved_qty = reserved_qty + qty_required
     WHERE material_id = [item.material_id]

STOCK CHECK OUTCOMES:

OUTCOME A — All available:
  All items status = 'available'
  UPDATE work_orders SET status = 'material_ready'
  Notify Supervisor: "All materials available.
    Production can start."

OUTCOME B — Some short:
  Mix of available and partial/unavailable
  UPDATE work_orders SET status =
    'bom_approved_pending_material'
  Auto-draft Purchase Requisitions for short items
  (see Section 5.5)
  Notify FM and Supervisor of shortfalls

OUTCOME C — Most short:
  Majority partial/unavailable
  UPDATE work_orders SET status =
    'bom_approved_pending_material'
  Auto-draft PRs for all short items
  Notify FM: "Major material shortage on WO [number]"
```

---

### 5.5 Auto-Draft Purchase Requisition

Triggered by stock check when items are short.

```
For each short item:
  Calculate qty_to_order:
    = qty_required - stock_available

  Required by date:
    = committed_delivery_date
      - estimated_production_days (default 5)
      - 2 days buffer

  INSERT into purchase_requisitions:
    pr_number = generate_document_number('PR', '2526')
    wo_id = [wo_id]
    wo_bom_item_id = [item_id]
    material_id = [material_id]
    material_name = [name]
    qty_required = [qty_to_order]
    required_by_date = [calculated above]
    preferred_vendor_id = [from Material Master]
    status = 'draft'
    urgency = 'normal'
      (set to 'urgent' if required_by < 2 days)
    raised_by = 'system'

  Multiple short items for same vendor:
    Group into one PR per vendor

  Notify FM and Supervisor:
    "PR auto-drafted for [X] short items on
     WO [number]."
```

---

### 5.6 BOM Revision (After CR)

When a Change Request is approved and implemented,
the BOM may need revision.

```
On CR implementation (from PRD-03):
  If CR changed dimensions or added items:
    Flag BOM for revision:
    UPDATE wo_boms SET status = 'revision_needed'
    Notify Supervisor: "BOM revision needed due to
      CR [cr_number] on WO [wo_number]"

  Supervisor opens BOM in edit mode
  Makes changes, resubmits for FM approval
  All previous BOM versions archived (version field)
  Delta from previous version shown:
    "Plywood increased from 14 to 16 sheets
     (due to CR-WO-CHH-26-001-01)"
```

---

### 5.7 Template BOM Management (/templates/boms)

Access: FM only

```
Page: "BOM Templates"
Shows all saved template BOMs

LIST COLUMNS:
  Template Name
  Furniture Type
  Base Dimensions
  Items Count
  Use Count
  Last Used
  Created By
  Status: Active / Archived
  Actions: View | Edit | Archive | Duplicate

ARCHIVE (not delete):
  UPDATE template_boms SET is_active = false
  Archived templates don't appear in supervisor search

EDIT TEMPLATE:
  Update template items
  Version increments
  Note: Editing template does NOT affect existing WO BOMs
  that loaded from this template — only future uses
```

---

## 6. BUSINESS RULES

```
BR-01: BOM must be created before WO can move past
       approved_pending_bom status.

BR-02: Billing sqft is the foundation of all material
       calculations. If dimensions are in WO, calculate
       automatically. If not, supervisor enters manually.

BR-03: Three cost columns (Estimated/Committed/Actual)
       are always visible on BOM:
         Estimated = from BOM line items at creation
         Committed = from approved PO rates
         Actual    = from GRN actual receipt

BR-04: Only FM can approve a BOM.
       Supervisor creates and submits.

BR-05: BOM approval triggers automatic stock check.
       Stock check happens within seconds of approval.

BR-06: Available stock is immediately reserved against
       the WO when stock check passes.
       Reserved stock cannot be used by other WOs.

BR-07: Production CAN start on tasks where material
       is available even if other items are short.
       Supervisor decides which tasks to start.

BR-08: Required By date = committed delivery date
       minus production days (default 5) minus 2 days.

BR-09: If committed delivery date is not set when BOM
       is approved, Required By = today + 7 days
       (default buffer).

BR-10: Template BOMs are starting points only.
       Supervisor must review every quantity before
       submitting. System shows delta from template.

BR-11: Only FM can save a BOM as a template.
       Supervisor can request it (checkbox) but
       FM controls the template library.

BR-12: Plywood formula: billing_sqft × 4 ÷ 32 sheets
       (15% wastage embedded — no separate calculation)

BR-13: Laminate formula: billing_sqft × 5 sqft
       (20% wastage: billing × 4 ÷ 0.80 = billing × 5)

BR-14: Hardware: billing_sqft × ₹150 (no wastage)

BR-15: Delivery and Installation added to BOM only
       for B2B and D2C streams.
       For Chhabee: delivery billed at actuals
       (pass-through, not in factory BOM)

BR-16: Variance alert: if actual cost > estimated
       cost by > 10%, FM is notified automatically.
```

---

## 7. NOTIFICATIONS & ALERTS

```
BOM Submitted (by Supervisor):
  → FM: "BOM submitted for WO [number].
    Awaiting your approval."

BOM Approved:
  → Supervisor: "BOM approved for WO [number].
    [X] items available. [Y] items need procurement."

BOM Sent Back:
  → Supervisor: "BOM revision needed for WO [number].
    Reason: [reason]"

All Materials Available (after stock check):
  → Supervisor: "All materials ready for WO [number].
    Production can start."

Material Shortage:
  → FM + Supervisor: "Material shortage on WO [number]:
    [list of short items]"
  → "Purchase Requisitions auto-drafted."

BOM Cost Variance > 10%:
  → FM: "Actual cost exceeds BOM estimate by X% on
    WO [number]. Please review."

Template Saved:
  → FM: "BOM template [name] saved successfully."
```

---

## 8. TESTING CHECKLIST

**BOM Creation:**
[ ] Billing sqft auto-calculated from WO dimensions
[ ] Manual entry works when no dimensions
[ ] Template search returns relevant templates
[ ] Loading template auto-fills line items
[ ] Delta from template shown correctly
[ ] Plywood qty = billing_sqft × 4 ÷ 32 (verify formula)
[ ] Laminate qty = billing_sqft × 5 (verify formula)
[ ] Hardware qty = billing_sqft (verify formula)
[ ] Add/remove BOM lines works
[ ] Estimated cost auto-calculates per line
[ ] Margin indicator shows correct colour

**BOM Approval:**
[ ] Only FM sees Approve button
[ ] Supervisor can submit but not approve
[ ] BOM approval triggers stock check
[ ] WO status updates correctly after approval
[ ] Save as template works (FM only)
[ ] Template appears in search after saving

**Stock Check:**
[ ] Available items show green 'available' status
[ ] Short items show 'partial' or 'unavailable'
[ ] Available stock reserved against WO
[ ] PR auto-drafted for short items
[ ] WO status = material_ready if all available
[ ] WO status = bom_approved_pending_material if short

**Three Cost Columns:**
[ ] Estimated cost populated from BOM
[ ] Committed cost shows ₹0 until PO approved
[ ] Actual cost shows ₹0 until GRN received
[ ] All three visible on BOM summary

---

## 9. INTEGRATION POINTS

```
PRD-02: BOM is created per work_orders.id
         BOM approval updates WO status

PRD-03: CR approval may trigger BOM revision
         CR implementation updates BOM version

PRD-06: BOM approval auto-drafts Purchase Requisitions
         PR items reference wo_bom_items.id

PRD-07: Material Master provides rates and vendor info
         BOM items link to generic_materials.id

PRD-08: Stock check reads from inventory table
         Available stock reserved in inventory
         Material issue updates wo_bom_items.qty_issued
         Material return updates wo_bom_items.qty_returned

PRD-09: Job card material issue updates BOM actual cost
         Labour cost allocated per WO from job cards

PRD-15: BOM accuracy is a KPI in MIS reporting
         Estimated vs Actual variance per WO
         Most common over-run materials
```

---

*Document version: 1.0*
*Prerequisites: PRD-00, PRD-01, PRD-02, PRD-07*
*Note: PRD-07 (Vendor & Material Master) should be built
before PRD-05 since BOM items reference generic_materials*
*Next document: PRD-06 Purchase Requisition & PO*
